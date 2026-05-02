import { createToken, moveToken, consumeToken, terminateToken, trace, incident, nextScopeId, nextJobId, nextSubscriptionId } from './executionState.js';
import { evaluateCondition, eventTypeOf, isActivity } from './executionIndex.js';

function outgoing(index, nodeId) { return index.outgoing.get(nodeId) || []; }
function incoming(index, nodeId) { return index.incoming.get(nodeId) || []; }

function takeFlow(state, token, flow) {
  moveToken(state, token, flow.targetRef, 'FLOW_TAKEN');
  trace(state, 'SEQUENCE_FLOW_TAKEN', { tokenId: token.id, flowId: flow.id, sourceRef: flow.sourceRef, targetRef: flow.targetRef });
}

export function completeActivity(state, token, node, index) {
  state.completedActivities.push({ id: node.id, tokenId: token.id, scopeId: token.scopeId, completedAtStep: state.step });
  trace(state, 'ACTIVITY_COMPLETED', { tokenId: token.id, elementId: node.id, bpmnType: node.bpmnType });
  const flows = outgoing(index, node.id);
  if (!flows.length) {
    token.state = 'waiting';
    incident(state, 'NO_OUTGOING_FLOW', 'warning', { tokenId: token.id, elementId: node.id });
    return;
  }
  takeFlow(state, token, flows[0]);
}

export function handleExclusiveGateway(state, token, node, index, context) {
  const flows = outgoing(index, node.id);
  const selected = flows.find(f => f.id === node.default) || flows.find(f => evaluateCondition(f, context)) || flows[0];
  if (!selected) {
    token.state = 'waiting';
    incident(state, 'NO_EXCLUSIVE_FLOW_SELECTED', 'warning', { tokenId: token.id, elementId: node.id });
    return;
  }
  trace(state, 'EXCLUSIVE_GATEWAY_SELECTED', { tokenId: token.id, gatewayId: node.id, flowId: selected.id });
  takeFlow(state, token, selected);
}

export function handleInclusiveGateway(state, token, node, index, context) {
  const inFlows = incoming(index, node.id);
  const outFlows = outgoing(index, node.id);

  if (inFlows.length > 1 && outFlows.length === 1) {
    const tokensAtJoin = state.tokens.filter(t => ['active','waiting'].includes(t.state) && t.location === node.id);
    if (tokensAtJoin.length < 1) {
      token.state = 'waiting';
      trace(state, 'INCLUSIVE_JOIN_WAIT', { tokenId: token.id, gatewayId: node.id });
      return;
    }
    for (const t of tokensAtJoin) if (t.id !== token.id) consumeToken(state, t, node.id, 'INCLUSIVE_JOIN_CONSUMED');
    trace(state, 'INCLUSIVE_JOIN_COMPLETE', { tokenId: token.id, gatewayId: node.id });
    takeFlow(state, token, outFlows[0]);
    return;
  }

  const selected = outFlows.filter(f => evaluateCondition(f, context));
  const flows = selected.length ? selected : outFlows.filter(f => f.id === node.default).slice(0,1);
  if (!flows.length) {
    token.state = 'waiting';
    incident(state, 'NO_INCLUSIVE_FLOW_SELECTED', 'warning', { tokenId: token.id, elementId: node.id });
    return;
  }

  consumeToken(state, token, node.id, 'INCLUSIVE_SPLIT_PARENT_CONSUMED');
  for (const flow of flows) createToken(state, flow.targetRef, token.scopeId, token.id);
  trace(state, 'INCLUSIVE_GATEWAY_SPLIT', { tokenId: token.id, gatewayId: node.id, flowIds: flows.map(f => f.id) });
}

export function handleParallelGateway(state, token, node, index) {
  const inFlows = incoming(index, node.id);
  const outFlows = outgoing(index, node.id);

  if (inFlows.length > 1 && outFlows.length === 1) {
    const tokensAtJoin = state.tokens.filter(t => ['active','waiting'].includes(t.state) && t.location === node.id);
    if (tokensAtJoin.length < inFlows.length) {
      token.state = 'waiting';
      trace(state, 'PARALLEL_JOIN_WAIT', { tokenId: token.id, gatewayId: node.id, required: inFlows.length, present: tokensAtJoin.length });
      return;
    }
    for (const t of tokensAtJoin) if (t.id !== token.id) consumeToken(state, t, node.id, 'PARALLEL_JOIN_CONSUMED');
    trace(state, 'PARALLEL_JOIN_COMPLETE', { tokenId: token.id, gatewayId: node.id });
    takeFlow(state, token, outFlows[0]);
    return;
  }

  if (outFlows.length > 1) {
    consumeToken(state, token, node.id, 'PARALLEL_SPLIT_PARENT_CONSUMED');
    for (const flow of outFlows) createToken(state, flow.targetRef, token.scopeId, token.id);
    trace(state, 'PARALLEL_GATEWAY_SPLIT', { tokenId: token.id, gatewayId: node.id, flowIds: outFlows.map(f => f.id) });
    return;
  }

  if (outFlows[0]) takeFlow(state, token, outFlows[0]);
  else incident(state, 'PARALLEL_GATEWAY_NO_OUTGOING', 'warning', { tokenId: token.id, elementId: node.id });
}

export function handleEventBasedGateway(state, token, node, index) {
  const flows = outgoing(index, node.id);
  if (!flows.length) {
    token.state = 'waiting';
    incident(state, 'EVENT_BASED_GATEWAY_NO_EVENTS', 'warning', { tokenId: token.id, elementId: node.id });
    return;
  }

  const winner = flows[0];
  for (const flow of flows) {
    state.subscriptions.push({
      id: nextSubscriptionId(),
      type: 'eventBasedGatewayCandidate',
      gatewayId: node.id,
      flowId: flow.id,
      targetRef: flow.targetRef,
      tokenId: token.id,
      active: flow.id === winner.id ? false : false,
      cancelled: flow.id !== winner.id
    });
  }
  trace(state, 'EVENT_BASED_GATEWAY_RACE_RESOLVED', { tokenId: token.id, gatewayId: node.id, winningFlowId: winner.id, cancelledFlowIds: flows.filter(f => f.id !== winner.id).map(f => f.id) });
  takeFlow(state, token, winner);
}

export function handleBoundaryEvent(state, node, attachedToken) {
  const interrupting = node.cancelActivity !== false;
  const flows = [];
  if (interrupting && attachedToken) terminateToken(state, attachedToken, node.id, 'boundary_event_interrupt');
  trace(state, 'BOUNDARY_EVENT_TRIGGERED', { boundaryEventId: node.id, attachedToRef: node.attachedToRef, interrupting });
}

export function registerEventSubprocess(state, subprocess, processScopeId) {
  const starts = (subprocess.flowElements || []).filter(e => e.bpmnType === 'StartEvent');
  for (const start of starts) {
    state.subscriptions.push({
      id: nextSubscriptionId(),
      type: 'eventSubProcess',
      subprocessId: subprocess.id,
      startEventId: start.id,
      eventType: eventTypeOf(start),
      scopeId: processScopeId,
      interrupting: start.isInterrupting !== false,
      active: true
    });
    trace(state, 'EVENT_SUBPROCESS_REGISTERED', { subprocessId: subprocess.id, startEventId: start.id, eventType: eventTypeOf(start) });
  }
}

export function handleTransaction(state, token, node, index) {
  const scopeId = nextScopeId('tx');
  state.scopes.push({
    id: scopeId,
    type: 'transaction',
    state: 'active',
    parentScopeId: token.scopeId,
    elementId: node.id,
    tokens: []
  });
  trace(state, 'TRANSACTION_SCOPE_STARTED', { tokenId: token.id, transactionId: node.id, scopeId });
  completeActivity(state, token, node, index);
}

export function triggerCancelTransaction(state, transactionScopeId, sourceElementId) {
  const scope = state.scopes.find(s => s.id === transactionScopeId);
  if (scope) scope.state = 'cancelled';
  for (const token of state.tokens.filter(t => t.scopeId === transactionScopeId && ['active','waiting'].includes(t.state))) terminateToken(state, token, sourceElementId, 'transaction_cancel');
  trace(state, 'TRANSACTION_CANCELLED', { transactionScopeId, sourceElementId });
}

export function triggerCompensation(state, activityId, sourceElementId) {
  const completed = state.completedActivities.filter(a => !activityId || a.id === activityId);
  trace(state, 'COMPENSATION_TRIGGERED', { sourceElementId, activityId: activityId || null, completedActivityIds: completed.map(a => a.id) });
  for (const item of completed.reverse()) {
    trace(state, 'COMPENSATION_HANDLER_EXECUTED', { activityId: item.id, originalTokenId: item.tokenId });
  }
}

export function handleMultiInstance(state, token, node, index, context) {
  const loop = node.loopCharacteristics || {};
  const count = Number(loop.loopCardinality || context.multiInstanceCount || 1) || 1;
  const sequential = Boolean(loop.isSequential);
  trace(state, 'MULTI_INSTANCE_STARTED', { tokenId: token.id, activityId: node.id, count, sequential });
  if (sequential) {
    for (let i = 1; i <= count; i++) trace(state, 'MULTI_INSTANCE_SEQUENTIAL_INSTANCE_COMPLETED', { activityId: node.id, instance: i });
    completeActivity(state, token, node, index);
    return;
  }
  consumeToken(state, token, node.id, 'MULTI_INSTANCE_PARENT_CONSUMED');
  const flows = outgoing(index, node.id);
  for (let i = 1; i <= count; i++) {
    trace(state, 'MULTI_INSTANCE_PARALLEL_INSTANCE_COMPLETED', { activityId: node.id, instance: i });
  }
  if (flows[0]) createToken(state, flows[0].targetRef, token.scopeId, token.id);
  trace(state, 'MULTI_INSTANCE_COMPLETED', { activityId: node.id, count });
}

export function handleCallActivity(state, token, node, index) {
  const scopeId = nextScopeId('call');
  state.scopes.push({
    id: scopeId,
    type: 'callActivity',
    state: 'completed',
    parentScopeId: token.scopeId,
    elementId: node.id,
    calledElement: node.calledElement || node.extensionElements?.execution?.calledElement || null,
    tokens: []
  });
  trace(state, 'CALL_ACTIVITY_INVOKED', { tokenId: token.id, callActivityId: node.id, scopeId, calledElement: node.calledElement || null });
  trace(state, 'CALL_ACTIVITY_COMPLETED', { tokenId: token.id, callActivityId: node.id, scopeId });
  completeActivity(state, token, node, index);
}

export function handleErrorPropagation(state, sourceElementId, errorRef = null) {
  const handler = state.subscriptions.find(s => s.type === 'error' && s.active);
  if (handler) {
    trace(state, 'ERROR_CAUGHT', { sourceElementId, handlerId: handler.id, targetElementId: handler.elementId, errorRef });
  } else {
    incident(state, 'ERROR_UNCAUGHT', 'error', { sourceElementId, errorRef });
  }
}

export function handleEscalationPropagation(state, sourceElementId, escalationRef = null) {
  const handler = state.subscriptions.find(s => s.type === 'escalation' && s.active);
  if (handler) {
    trace(state, 'ESCALATION_CAUGHT', { sourceElementId, handlerId: handler.id, targetElementId: handler.elementId, escalationRef, interrupting: handler.interrupting });
  } else {
    trace(state, 'ESCALATION_UNHANDLED_NON_FATAL', { sourceElementId, escalationRef });
  }
}

export function scheduleTimer(state, elementId, due = 'immediate') {
  const job = { id: nextJobId(), type: 'timer', elementId, due, state: 'scheduled' };
  state.jobs.push(job);
  trace(state, 'TIMER_SCHEDULED', { jobId: job.id, elementId, due });
  return job;
}

export function fireTimer(state, job) {
  job.state = 'fired';
  trace(state, 'TIMER_FIRED', { jobId: job.id, elementId: job.elementId });
}

import { adaptIrToReferenceModelV26 } from '../model/referenceModelV26Adapter.js';
import { createExecutionState, createToken, activeTokens, trace, incident, consumeToken } from './executionState.js';
import { createExecutionIndex, eventTypeOf, isActivity } from './executionIndex.js';
import {
  completeActivity,
  handleExclusiveGateway,
  handleInclusiveGateway,
  handleParallelGateway,
  handleEventBasedGateway,
  handleTransaction,
  handleMultiInstance,
  handleCallActivity,
  triggerCompensation,
  handleErrorPropagation,
  handleEscalationPropagation,
  scheduleTimer,
  fireTimer
} from './semanticsHandlers.js';

function findStart(index) {
  return index.nodes.find(n => n.bpmnType === 'StartEvent');
}

function registerBoundaryHandlers(state, index) {
  for (const n of index.nodes.filter(x => x.bpmnType === 'BoundaryEvent')) {
    const eventType = eventTypeOf(n);
    state.subscriptions.push({
      id: `boundary_${n.id}`,
      type: eventType || 'boundary',
      elementId: n.id,
      attachedToRef: n.attachedToRef,
      interrupting: n.cancelActivity !== false,
      active: true
    });
    trace(state, 'BOUNDARY_HANDLER_REGISTERED', { boundaryEventId: n.id, eventType, attachedToRef: n.attachedToRef });
  }
}

function handleEvent(state, token, node, index) {
  const eventType = eventTypeOf(node);
  if (node.bpmnType === 'EndEvent') {
    if (eventType === 'terminate') {
      for (const t of state.tokens.filter(x => ['active','waiting'].includes(x.state))) {
        t.state = 'terminated';
      }
      trace(state, 'TERMINATE_END_EVENT', { tokenId: token.id, elementId: node.id });
      return;
    }
    if (eventType === 'compensation') triggerCompensation(state, null, node.id);
    if (eventType === 'error') handleErrorPropagation(state, node.id);
    if (eventType === 'escalation') handleEscalationPropagation(state, node.id);
    consumeToken(state, token, node.id, 'END_EVENT_CONSUMED');
    return;
  }

  if (eventType === 'timer') {
    const job = scheduleTimer(state, node.id);
    fireTimer(state, job);
  }

  completeActivity(state, token, node, index);
}

function handleNode(state, token, node, index, context) {
  if (!node) {
    token.state = 'error';
    incident(state, 'TOKEN_AT_UNKNOWN_NODE', 'error', { tokenId: token.id, location: token.location });
    return;
  }

  if (node.bpmnType?.endsWith('Event')) return handleEvent(state, token, node, index);
  if (node.bpmnType === 'ExclusiveGateway') return handleExclusiveGateway(state, token, node, index, context);
  if (node.bpmnType === 'InclusiveGateway') return handleInclusiveGateway(state, token, node, index, context);
  if (node.bpmnType === 'ParallelGateway') return handleParallelGateway(state, token, node, index);
  if (node.bpmnType === 'EventBasedGateway') return handleEventBasedGateway(state, token, node, index);
  if (node.bpmnType === 'Transaction') return handleTransaction(state, token, node, index);
  if (node.bpmnType === 'CallActivity') return handleCallActivity(state, token, node, index);
  if (node.loopCharacteristics?.type === 'multiInstance' || node.loopCharacteristics?.type === 'multi_instance') return handleMultiInstance(state, token, node, index, context);
  if (isActivity(node)) return completeActivity(state, token, node, index);

  completeActivity(state, token, node, index);
}

export function simulateStrongExecution(referenceModel, options = {}) {
  const context = options.context || {};
  const maxSteps = options.maxSteps || 200;
  const index = createExecutionIndex(referenceModel);
  const state = createExecutionState(referenceModel);
  const start = findStart(index);

  registerBoundaryHandlers(state, index);

  if (!start) {
    incident(state, 'NO_START_EVENT', 'error', {});
    return state;
  }

  createToken(state, start.id, referenceModel.process.id);

  for (let i = 0; i < maxSteps; i++) {
    const active = activeTokens(state);
    if (!active.length) break;

    state.step += 1;
    for (const token of [...active]) {
      const node = index.byId.get(token.location);
      handleNode(state, token, node, index, context);
    }
  }

  if (state.step >= maxSteps) incident(state, 'MAX_STEPS_REACHED', 'warning', { maxSteps });

  const remaining = state.tokens.filter(t => ['active','waiting'].includes(t.state));
  if (!remaining.length) {
    const scope = state.scopes.find(s => s.id === referenceModel.process.id);
    if (scope && scope.state === 'active') scope.state = 'completed';
    trace(state, 'PROCESS_COMPLETED', { processId: referenceModel.process.id });
  } else {
    trace(state, 'PROCESS_NOT_COMPLETED', { remainingTokens: remaining.map(t => ({ id: t.id, state: t.state, location: t.location })) });
  }

  return state;
}

export function simulateStrongExecutionFromIr(ir, options = {}) {
  const model = adaptIrToReferenceModelV26(ir);
  return simulateStrongExecution(model, options);
}

import { createInitialTokenState, nextTokenId, resetTokenCounter } from './tokenState.js';

function byId(list = []) {
  return new Map(list.map(x => [x.id, x]));
}

function outgoingFlows(model, nodeId) {
  return (model.process.sequenceFlows || model.process.flowElements.filter(e => e.bpmnType === 'SequenceFlow')).filter(f => f.sourceRef === nodeId);
}

function incomingFlows(model, nodeId) {
  return (model.process.sequenceFlows || model.process.flowElements.filter(e => e.bpmnType === 'SequenceFlow')).filter(f => f.targetRef === nodeId);
}

function flowElements(model) {
  return model.process.flowElements || [];
}

function sequenceFlows(model) {
  return flowElements(model).filter(e => e.bpmnType === 'SequenceFlow');
}

function nodes(model) {
  return flowElements(model).filter(e => e.bpmnType !== 'SequenceFlow');
}

function moveToken(state, token, targetId, type = 'TOKEN_MOVED', message = '') {
  token.location = targetId;
  token.history.push(targetId);
  state.events.push({
    step: state.step,
    type,
    tokenId: token.id,
    elementId: targetId,
    message: message || `Token ${token.id} moved to ${targetId}.`
  });
}

function consumeToken(state, token, elementId, message = '') {
  token.state = 'consumed';
  state.events.push({
    step: state.step,
    type: 'TOKEN_CONSUMED',
    tokenId: token.id,
    elementId,
    message: message || `Token ${token.id} consumed at ${elementId}.`
  });
}

function createChildToken(state, parentToken, targetId) {
  const child = {
    id: nextTokenId(),
    state: 'active',
    location: targetId,
    scopeId: parentToken.scopeId,
    parentTokenId: parentToken.id,
    createdAtStep: state.step,
    history: [targetId]
  };
  state.tokens.push(child);
  const scope = state.scopes.find(s => s.id === child.scopeId);
  scope?.tokens.push(child.id);
  state.events.push({
    step: state.step,
    type: 'TOKEN_CREATED',
    tokenId: child.id,
    elementId: targetId,
    message: `Parallel child token ${child.id} created at ${targetId}.`
  });
  return child;
}

function chooseExclusiveFlow(flows, node) {
  if (!flows.length) return null;
  if (node.default) {
    const defaultFlow = flows.find(f => f.id === node.default);
    if (defaultFlow) return defaultFlow;
  }
  return flows[0];
}

function parallelJoinReady(state, model, node) {
  const incoming = incomingFlows(model, node.id);
  const activeAtNode = state.tokens.filter(t => t.state === 'active' && t.location === node.id);
  return incoming.length <= 1 || activeAtNode.length >= incoming.length;
}

function handleNode(state, model, token, node, options = {}) {
  const outgoing = outgoingFlows(model, node.id);

  if (node.bpmnType === 'EndEvent') {
    consumeToken(state, token, node.id, `EndEvent ${node.id} consumed token ${token.id}.`);
    return;
  }

  if (!outgoing.length) {
    token.state = 'waiting';
    state.incidents.push({
      step: state.step,
      type: 'NO_OUTGOING_FLOW',
      severity: 'warning',
      tokenId: token.id,
      elementId: node.id,
      message: `No outgoing flow from ${node.id}. Token set to waiting.`
    });
    return;
  }

  if (node.bpmnType === 'ExclusiveGateway') {
    const chosen = chooseExclusiveFlow(outgoing, node);
    moveToken(state, token, chosen.targetRef, 'TOKEN_MOVED', `ExclusiveGateway ${node.id} selected ${chosen.id}.`);
    return;
  }

  if (node.bpmnType === 'ParallelGateway') {
    const incoming = incomingFlows(model, node.id);
    if (incoming.length > 1 && outgoing.length === 1) {
      if (!parallelJoinReady(state, model, node)) {
        token.state = 'waiting';
        state.events.push({
          step: state.step,
          type: 'TOKEN_JOIN_WAIT',
          tokenId: token.id,
          elementId: node.id,
          message: `ParallelGateway ${node.id} waiting for more tokens.`
        });
        return;
      }
      const waiting = state.tokens.filter(t => t.location === node.id && ['active', 'waiting'].includes(t.state));
      for (const t of waiting) {
        if (t.id !== token.id) consumeToken(state, t, node.id, `Parallel join consumed token ${t.id}.`);
      }
      token.state = 'active';
      moveToken(state, token, outgoing[0].targetRef, 'TOKEN_JOIN_COMPLETE', `ParallelGateway ${node.id} joined tokens.`);
      return;
    }

    if (outgoing.length > 1) {
      consumeToken(state, token, node.id, `ParallelGateway ${node.id} split consumed parent ${token.id}.`);
      for (const flow of outgoing) createChildToken(state, token, flow.targetRef);
      state.events.push({
        step: state.step,
        type: 'TOKEN_SPLIT',
        tokenId: token.id,
        elementId: node.id,
        message: `ParallelGateway ${node.id} split into ${outgoing.length} tokens.`
      });
      return;
    }
  }

  if (['InclusiveGateway', 'ComplexGateway', 'EventBasedGateway'].includes(node.bpmnType)) {
    state.incidents.push({
      step: state.step,
      type: 'UNSUPPORTED_GATEWAY_SEMANTICS',
      severity: 'warning',
      tokenId: token.id,
      elementId: node.id,
      message: `${node.bpmnType} uses fallback first-outgoing behavior in v27.`
    });
  }

  moveToken(state, token, outgoing[0].targetRef);
}

export function simulateTokenFlow(referenceModel, options = {}) {
  resetTokenCounter();
  const maxSteps = options.maxSteps || 100;
  const model = {
    ...referenceModel,
    process: {
      ...referenceModel.process,
      sequenceFlows: sequenceFlows(referenceModel)
    }
  };
  const nodeMap = byId(nodes(model));
  const state = createInitialTokenState(model);

  for (let i = 0; i < maxSteps; i++) {
    const active = state.tokens.filter(t => t.state === 'active');
    if (!active.length) break;

    state.step += 1;
    for (const token of [...active]) {
      const node = nodeMap.get(token.location);
      if (!node) {
        token.state = 'error';
        state.incidents.push({
          step: state.step,
          type: 'TOKEN_AT_UNKNOWN_NODE',
          severity: 'error',
          tokenId: token.id,
          elementId: token.location,
          message: `Token ${token.id} references unknown node ${token.location}.`
        });
        continue;
      }
      handleNode(state, model, token, node, options);
    }
  }

  const active = state.tokens.filter(t => t.state === 'active');
  const waiting = state.tokens.filter(t => t.state === 'waiting');
  const consumed = state.tokens.filter(t => t.state === 'consumed');

  if (!active.length && !waiting.length && consumed.length) {
    const scope = state.scopes.find(s => s.id === referenceModel.process.id);
    if (scope) scope.state = 'completed';
    state.events.push({
      step: state.step,
      type: 'PROCESS_COMPLETED',
      elementId: referenceModel.process.id,
      message: 'No active or waiting tokens remain.'
    });
  }

  if (state.step >= maxSteps) {
    state.incidents.push({
      step: state.step,
      type: 'MAX_STEPS_REACHED',
      severity: 'warning',
      message: `Simulation stopped after ${maxSteps} steps.`
    });
  }

  return state;
}

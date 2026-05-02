let tokenCounter = 1;

export function createInitialTokenState(referenceModel) {
  const process = referenceModel.process;
  const scopeId = process.id;

  const start = (process.flowElements || []).find(e => e.bpmnType === 'StartEvent');

  const state = {
    processId: process.id,
    step: 0,
    tokens: [],
    scopes: [{
      id: scopeId,
      type: 'process',
      state: 'active',
      parentScopeId: null,
      tokens: []
    }],
    events: [],
    incidents: []
  };

  if (!start) {
    state.incidents.push({
      step: 0,
      type: 'NO_START_EVENT',
      severity: 'error',
      message: 'No StartEvent found.'
    });
    return state;
  }

  const token = {
    id: `t${tokenCounter++}`,
    state: 'active',
    location: start.id,
    scopeId,
    parentTokenId: null,
    createdAtStep: 0,
    history: [start.id]
  };

  state.tokens.push(token);
  state.scopes[0].tokens.push(token.id);
  state.events.push({
    step: 0,
    type: 'TOKEN_CREATED',
    tokenId: token.id,
    elementId: start.id,
    message: `Initial token created at ${start.id}.`
  });

  return state;
}

export function resetTokenCounter() {
  tokenCounter = 1;
}

export function nextTokenId() {
  return `t${tokenCounter++}`;
}

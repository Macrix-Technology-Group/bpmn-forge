let tokenCounter = 1;
let scopeCounter = 1;
let jobCounter = 1;
let subscriptionCounter = 1;

export function resetExecutionCounters() {
  tokenCounter = 1;
  scopeCounter = 1;
  jobCounter = 1;
  subscriptionCounter = 1;
}

export function nextTokenId() { return `t${tokenCounter++}`; }
export function nextScopeId(prefix = 's') { return `${prefix}${scopeCounter++}`; }
export function nextJobId() { return `j${jobCounter++}`; }
export function nextSubscriptionId() { return `sub${subscriptionCounter++}`; }

export function createExecutionState(referenceModel) {
  resetExecutionCounters();
  const processId = referenceModel.process.id;
  return {
    processId,
    step: 0,
    tokens: [],
    scopes: [{
      id: processId,
      type: 'process',
      state: 'active',
      parentScopeId: null,
      elementId: processId,
      tokens: []
    }],
    jobs: [],
    subscriptions: [],
    completedActivities: [],
    trace: [],
    incidents: []
  };
}

export function trace(state, type, data = {}) {
  state.trace.push({ step: state.step, type, ...data });
}

export function incident(state, type, severity, data = {}) {
  state.incidents.push({ step: state.step, type, severity, ...data });
}

export function createToken(state, location, scopeId, parentTokenId = null) {
  const token = {
    id: nextTokenId(),
    state: 'active',
    location,
    scopeId,
    parentTokenId,
    history: [location],
    createdAtStep: state.step
  };
  state.tokens.push(token);
  const scope = state.scopes.find(s => s.id === scopeId);
  scope?.tokens.push(token.id);
  trace(state, 'TOKEN_CREATED', { tokenId: token.id, location, scopeId, parentTokenId });
  return token;
}

export function moveToken(state, token, location, type = 'TOKEN_MOVED') {
  token.location = location;
  token.history.push(location);
  token.state = 'active';
  trace(state, type, { tokenId: token.id, location });
}

export function consumeToken(state, token, elementId, type = 'TOKEN_CONSUMED') {
  token.state = 'consumed';
  trace(state, type, { tokenId: token.id, elementId });
}

export function terminateToken(state, token, elementId, reason = 'terminated') {
  token.state = 'terminated';
  trace(state, 'TOKEN_TERMINATED', { tokenId: token.id, elementId, reason });
}

export function activeTokens(state) {
  return state.tokens.filter(t => t.state === 'active');
}

export function waitingTokens(state) {
  return state.tokens.filter(t => t.state === 'waiting');
}

import { discoverEventSemantics } from './eventSemantics.js';

function log(state, event) {
  state.eventLog.push(event);
}

export function applyEventThrow(eventState, tokenState, eventType, sourceElementId, payload = {}) {
  const matching = eventState.eventSubscriptions.filter(s => s.active && s.eventType === eventType);

  log(eventState, {
    type: `${eventType.toUpperCase()}_THROWN`,
    sourceElementId,
    payload,
    matchedSubscriptions: matching.map(s => s.id)
  });

  if (eventType === 'terminate') {
    for (const token of tokenState.tokens || []) {
      if (token.state === 'active' || token.state === 'waiting') {
        token.state = 'terminated';
      }
    }
    log(eventState, {
      type: 'TERMINATE_SCOPE',
      sourceElementId,
      message: 'All active/waiting tokens terminated in current scope.'
    });
  }

  if (eventType === 'signal') {
    for (const sub of matching) {
      log(eventState, {
        type: 'SIGNAL_CAUGHT',
        subscriptionId: sub.id,
        targetElementId: sub.elementId,
        sourceElementId
      });
    }
  }

  if (eventType === 'message') {
    const sub = matching[0];
    if (sub) log(eventState, {
      type: 'MESSAGE_RECEIVED',
      subscriptionId: sub.id,
      targetElementId: sub.elementId,
      sourceElementId
    });
  }

  if (eventType === 'error') {
    const handler = eventState.scopeHandlers.find(h => h.eventType === 'error');
    log(eventState, handler ? {
      type: 'ERROR_CAUGHT',
      handlerId: handler.id,
      targetElementId: handler.elementId,
      sourceElementId
    } : {
      type: 'ERROR_UNCAUGHT',
      sourceElementId,
      severity: 'error'
    });
  }

  if (eventType === 'escalation') {
    const handler = eventState.scopeHandlers.find(h => h.eventType === 'escalation');
    log(eventState, handler ? {
      type: 'ESCALATION_CAUGHT',
      handlerId: handler.id,
      targetElementId: handler.elementId,
      sourceElementId,
      interrupting: handler.interrupting
    } : {
      type: 'ESCALATION_THROWN',
      sourceElementId,
      message: 'No matching escalation handler found.'
    });
  }

  if (eventType === 'compensation') {
    log(eventState, {
      type: 'COMPENSATION_THROWN',
      sourceElementId,
      message: 'Compensation requested. Compensation execution is recorded but not fully executed in v28.'
    });
  }

  if (eventType === 'cancel') {
    log(eventState, {
      type: 'CANCEL_TRANSACTION',
      sourceElementId,
      message: 'Transaction cancel recorded. Transaction scope cancellation is not fully executed in v28.'
    });
  }

  if (eventType === 'link') {
    const linkTarget = matching.find(s => s.eventType === 'link');
    log(eventState, linkTarget ? {
      type: 'LINK_CAUGHT',
      sourceElementId,
      targetElementId: linkTarget.elementId
    } : {
      type: 'LINK_THROWN',
      sourceElementId,
      message: 'No matching link catch event found.'
    });
  }

  return { eventState, tokenState };
}

export function createRuntimeEventState(referenceModel) {
  return discoverEventSemantics(referenceModel);
}

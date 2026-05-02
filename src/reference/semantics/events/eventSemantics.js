export const EVENT_TYPES = [
  'message', 'timer', 'signal', 'error', 'escalation', 'conditional', 'link', 'compensation', 'terminate', 'cancel'
];

export function normalizeEventDefinition(definition) {
  if (!definition) return null;
  const d = String(definition).toLowerCase();
  if (d === 'compensate') return 'compensation';
  if (d.endsWith('eventdefinition')) return d.replace('eventdefinition', '');
  return d;
}

export function getNodeEventType(node) {
  return normalizeEventDefinition(node.eventDefinition || node.event_definition || node.eventType);
}

export function isCatchEvent(node) {
  return ['StartEvent', 'IntermediateCatchEvent', 'BoundaryEvent'].includes(node.bpmnType) ||
         (node.type === 'event' && ['start', 'intermediate_catch', 'boundary'].includes(node.subtype));
}

export function isThrowEvent(node) {
  return ['EndEvent', 'IntermediateThrowEvent'].includes(node.bpmnType) ||
         (node.type === 'event' && ['end', 'intermediate_throw'].includes(node.subtype));
}

export function createEventSemanticsState() {
  return {
    eventSubscriptions: [],
    eventLog: [],
    correlations: [],
    scopeHandlers: []
  };
}

export function discoverEventSemantics(referenceModel) {
  const state = createEventSemanticsState();
  const process = referenceModel.process;
  const elements = process.flowElements || [];

  for (const element of elements) {
    const eventType = getNodeEventType(element);
    if (!eventType) continue;

    const record = {
      elementId: element.id,
      eventType,
      bpmnType: element.bpmnType,
      catch: isCatchEvent(element),
      throw: isThrowEvent(element),
      attachedToRef: element.attachedToRef || null,
      interrupting: element.cancelActivity !== false
    };

    if (record.catch) {
      state.eventSubscriptions.push({
        id: `sub_${element.id}`,
        elementId: element.id,
        eventType,
        scopeId: process.id,
        attachedToRef: record.attachedToRef,
        interrupting: record.interrupting,
        active: true
      });
    }

    if (record.attachedToRef || ['error', 'escalation', 'compensation', 'cancel'].includes(eventType)) {
      state.scopeHandlers.push({
        id: `handler_${element.id}`,
        elementId: element.id,
        eventType,
        scopeId: process.id,
        attachedToRef: record.attachedToRef,
        interrupting: record.interrupting
      });
    }

    state.eventLog.push({
      type: 'EVENT_DEFINITION_DISCOVERED',
      elementId: element.id,
      eventType,
      message: `${eventType} event definition discovered at ${element.id}.`
    });
  }

  return state;
}

export function validateEventSemantics(referenceModel) {
  const errors = [];
  const warnings = [];
  const process = referenceModel.process;
  const elements = process.flowElements || [];
  const elementIds = new Set(elements.map(e => e.id));

  for (const element of elements) {
    const eventType = getNodeEventType(element);
    if (!eventType) continue;

    if (!EVENT_TYPES.includes(eventType)) {
      warnings.push(`Unknown event type ${eventType} on ${element.id}`);
      continue;
    }

    if (element.bpmnType === 'BoundaryEvent' && !element.attachedToRef) {
      errors.push(`BoundaryEvent ${element.id} has event type ${eventType} but no attachedToRef.`);
    }

    if (element.attachedToRef && !elementIds.has(element.attachedToRef)) {
      errors.push(`Event ${element.id} attachedToRef missing: ${element.attachedToRef}`);
    }

    if (eventType === 'terminate' && element.bpmnType !== 'EndEvent') {
      warnings.push(`TerminateEventDefinition normally belongs to EndEvent: ${element.id}`);
    }

    if (eventType === 'cancel' && element.bpmnType !== 'BoundaryEvent' && element.bpmnType !== 'EndEvent') {
      warnings.push(`CancelEventDefinition is normally used in transaction boundary/end events: ${element.id}`);
    }

    if (eventType === 'link' && !['IntermediateCatchEvent', 'IntermediateThrowEvent'].includes(element.bpmnType)) {
      warnings.push(`LinkEventDefinition should be intermediate catch/throw: ${element.id}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    discovered: discoverEventSemantics(referenceModel)
  };
}

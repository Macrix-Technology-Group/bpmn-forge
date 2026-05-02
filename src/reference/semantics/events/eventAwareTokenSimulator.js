import { simulateTokenFlow } from '../tokenSimulator.js';
import { createRuntimeEventState, applyEventThrow } from './eventRuntime.js';

function eventElements(referenceModel) {
  return (referenceModel.process.flowElements || []).filter(e => e.eventDefinitions?.length);
}

function normalizeType(t) {
  return String(t || '').replace('EventDefinition', '').toLowerCase().replace('compensate', 'compensation');
}

export function simulateEventAwareTokenFlow(referenceModel, options = {}) {
  const eventState = createRuntimeEventState(referenceModel);
  const tokenState = simulateTokenFlow(referenceModel, options);

  for (const element of eventElements(referenceModel)) {
    const eventType = normalizeType(element.eventDefinitions?.[0]?.type);
    if (!eventType) continue;

    if (['EndEvent', 'IntermediateThrowEvent'].includes(element.bpmnType)) {
      applyEventThrow(eventState, tokenState, eventType, element.id, { simulated: true });
    }

    if (eventType === 'timer') {
      eventState.eventLog.push({
        type: 'TIMER_SCHEDULED',
        elementId: element.id,
        message: `Timer scheduled for ${element.id}.`
      });
      eventState.eventLog.push({
        type: 'TIMER_FIRED',
        elementId: element.id,
        message: `Timer fired immediately in deterministic v28 simulation.`
      });
    }

    if (eventType === 'conditional') {
      eventState.eventLog.push({
        type: 'CONDITION_WAITING',
        elementId: element.id,
        message: `Conditional event waiting at ${element.id}.`
      });
      eventState.eventLog.push({
        type: 'CONDITION_TRUE',
        elementId: element.id,
        message: `Condition evaluated as true in deterministic v28 simulation.`
      });
    }
  }

  return {
    tokenState,
    eventState,
    supportLevel: 'v28_event_semantics_foundation'
  };
}

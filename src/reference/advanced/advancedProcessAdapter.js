import { parseAdvancedBpmn } from './advancedBpmnParser.js';

export function adaptAdvancedBpmn(xml, referenceModel = null) {
  const advanced = parseAdvancedBpmn(xml);
  return {
    modelType: 'BPMN_ADVANCED_PROCESS_MODEL',
    version: 29,
    referenceModelVersion: referenceModel?.version || null,
    ...advanced
  };
}

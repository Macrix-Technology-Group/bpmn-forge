export function validateReferenceModel(model) {
  const errors = [];
  const warnings = [];

  if (model.modelType !== 'BPMN_REFERENCE_MODEL') errors.push('Invalid modelType');
  if (!model.process?.id) errors.push('Missing process.id');

  const elementIds = new Set();
  for (const e of model.process?.flowElements || []) {
    if (!e.id) errors.push('FlowElement missing id');
    if (elementIds.has(e.id)) errors.push(`Duplicate FlowElement id: ${e.id}`);
    elementIds.add(e.id);
  }

  for (const flow of model.process?.sequenceFlows || []) {
    if (!elementIds.has(flow.sourceRef)) errors.push(`SequenceFlow ${flow.id} sourceRef missing: ${flow.sourceRef}`);
    if (!elementIds.has(flow.targetRef)) errors.push(`SequenceFlow ${flow.id} targetRef missing: ${flow.targetRef}`);
  }

  const starts = [...elementIds].filter(id => (model.process.flowElements || []).find(e => e.id === id && e.kind === 'event' && e.subtype === 'start'));
  const ends = [...elementIds].filter(id => (model.process.flowElements || []).find(e => e.id === id && e.kind === 'event' && e.subtype === 'end'));
  if (!starts.length) warnings.push('No start event');
  if (!ends.length) warnings.push('No end event');

  return { ok: errors.length === 0, errors, warnings };
}

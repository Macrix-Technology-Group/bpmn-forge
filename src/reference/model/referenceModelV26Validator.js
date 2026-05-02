export function validateReferenceModelV26(model) {
  const errors = [];
  const warnings = [];
  const process = model?.process;

  if (model?.modelType !== 'BPMN_REFERENCE_MODEL') errors.push('Invalid modelType');
  if (model?.version !== 26) warnings.push('Model version is not 26');
  if (!model?.definitions?.id) errors.push('Missing definitions.id');
  if (!process?.id) errors.push('Missing process.id');

  const flowElements = process?.flowElements || [];
  const nodes = flowElements.filter(e => e.bpmnType !== 'SequenceFlow');
  const sequenceFlows = flowElements.filter(e => e.bpmnType === 'SequenceFlow');
  const nodeIds = new Set(nodes.map(e => e.id));
  const flowIds = new Set(sequenceFlows.map(e => e.id));

  for (const element of flowElements) {
    if (!element.id) errors.push('Element missing id');
    if (!element.bpmnType) errors.push(`Element ${element.id || '?'} missing bpmnType`);
  }

  for (const flow of sequenceFlows) {
    if (!nodeIds.has(flow.sourceRef)) errors.push(`SequenceFlow ${flow.id} sourceRef missing: ${flow.sourceRef}`);
    if (!nodeIds.has(flow.targetRef)) errors.push(`SequenceFlow ${flow.id} targetRef missing: ${flow.targetRef}`);
  }

  for (const node of nodes) {
    if (node.bpmnType === 'BoundaryEvent') {
      if (!node.attachedToRef) errors.push(`BoundaryEvent ${node.id} missing attachedToRef`);
      else {
        const target = nodes.find(x => x.id === node.attachedToRef);
        if (!target) errors.push(`BoundaryEvent ${node.id} attachedToRef missing: ${node.attachedToRef}`);
        else if (!['Task','ServiceTask','UserTask','ManualTask','ScriptTask','BusinessRuleTask','SubProcess','Transaction','CallActivity'].includes(target.bpmnType)) {
          errors.push(`BoundaryEvent ${node.id} attachedToRef does not point to an Activity: ${node.attachedToRef}`);
        }
      }
    }

    if (node.default && !flowIds.has(node.default)) {
      errors.push(`${node.bpmnType} ${node.id} default flow missing: ${node.default}`);
    }
  }

  const starts = nodes.filter(e => e.bpmnType === 'StartEvent');
  const ends = nodes.filter(e => e.bpmnType === 'EndEvent');
  if (!starts.length) warnings.push('No StartEvent');
  if (!ends.length) warnings.push('No EndEvent');

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: {
      flowElements: flowElements.length,
      nodes: nodes.length,
      sequenceFlows: sequenceFlows.length,
      diagrams: model.definitions?.diagrams?.length || 0,
      rootElements: model.definitions?.rootElements?.length || 0
    }
  };
}

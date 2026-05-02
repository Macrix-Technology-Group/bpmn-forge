export function validateExecutionSemanticsReadiness(referenceModel) {
  const errors = [];
  const warnings = [];
  const elements = referenceModel.process?.flowElements || [];
  const nodes = elements.filter(e => e.bpmnType !== 'SequenceFlow');
  const flows = elements.filter(e => e.bpmnType === 'SequenceFlow');
  const ids = new Set(nodes.map(n => n.id));

  for (const flow of flows) {
    if (!ids.has(flow.sourceRef)) errors.push(`Flow ${flow.id} sourceRef missing: ${flow.sourceRef}`);
    if (!ids.has(flow.targetRef)) errors.push(`Flow ${flow.id} targetRef missing: ${flow.targetRef}`);
  }

  for (const node of nodes) {
    if (node.bpmnType === 'InclusiveGateway') warnings.push(`InclusiveGateway ${node.id}: v31 uses active-branch approximation for OR-join.`);
    if (node.bpmnType === 'EventBasedGateway') warnings.push(`EventBasedGateway ${node.id}: v31 deterministic race chooses first outgoing event.`);
    if (node.bpmnType === 'CallActivity' && !node.calledElement) warnings.push(`CallActivity ${node.id}: calledElement missing; simulated as empty completed scope.`);
    if (node.loopCharacteristics && !node.loopCharacteristics.loopCardinality && !node.loopCharacteristics.completionCondition) warnings.push(`Multi-instance ${node.id}: no loopCardinality/completionCondition; count defaults to 1.`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: {
      nodes: nodes.length,
      sequenceFlows: flows.length,
      inclusiveGateways: nodes.filter(n => n.bpmnType === 'InclusiveGateway').length,
      eventBasedGateways: nodes.filter(n => n.bpmnType === 'EventBasedGateway').length,
      transactions: nodes.filter(n => n.bpmnType === 'Transaction').length,
      callActivities: nodes.filter(n => n.bpmnType === 'CallActivity').length,
      multiInstanceActivities: nodes.filter(n => n.loopCharacteristics).length
    }
  };
}

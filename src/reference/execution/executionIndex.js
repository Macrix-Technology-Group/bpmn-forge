export function createExecutionIndex(referenceModel) {
  const elements = referenceModel.process.flowElements || [];
  const nodes = elements.filter(e => e.bpmnType !== 'SequenceFlow');
  const flows = elements.filter(e => e.bpmnType === 'SequenceFlow');
  const byId = new Map(elements.map(e => [e.id, e]));

  const outgoing = new Map(nodes.map(n => [n.id, []]));
  const incoming = new Map(nodes.map(n => [n.id, []]));
  for (const f of flows) {
    if (!outgoing.has(f.sourceRef)) outgoing.set(f.sourceRef, []);
    if (!incoming.has(f.targetRef)) incoming.set(f.targetRef, []);
    outgoing.get(f.sourceRef).push(f);
    incoming.get(f.targetRef).push(f);
  }

  return { elements, nodes, flows, byId, outgoing, incoming };
}

export function eventTypeOf(element) {
  const t = element?.eventDefinitions?.[0]?.type || '';
  return String(t).replace('EventDefinition', '').toLowerCase().replace('compensate', 'compensation');
}

export function isActivity(element) {
  return [
    'Task','ServiceTask','UserTask','ManualTask','ScriptTask','BusinessRuleTask','SendTask','ReceiveTask',
    'SubProcess','Transaction','CallActivity','AdHocSubProcess'
  ].includes(element?.bpmnType);
}

export function evaluateCondition(flow, context = {}) {
  if (!flow.conditionExpression) return true;
  const expr = String(flow.conditionExpression).trim();
  if (!expr) return true;
  if (expr === 'true' || expr === 'yes' || expr === 'OK') return true;
  if (expr === 'false' || expr === 'no') return false;
  if (context.conditions && Object.prototype.hasOwnProperty.call(context.conditions, expr)) {
    return Boolean(context.conditions[expr]);
  }
  return true;
}

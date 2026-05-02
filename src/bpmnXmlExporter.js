export function esc(v) { return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"); }
function tag(n) {
  if (n.type === "event") {
    if (n.subtype === "start") return "bpmn:startEvent";
    if (n.subtype === "end") return "bpmn:endEvent";
    if (n.subtype === "boundary") return "bpmn:boundaryEvent";
    if (n.subtype === "intermediate_throw") return "bpmn:intermediateThrowEvent";
    return "bpmn:intermediateCatchEvent";
  }
  if (n.type === "gateway") {
    if (n.subtype === "parallel") return "bpmn:parallelGateway";
    if (n.subtype === "inclusive") return "bpmn:inclusiveGateway";
    if (n.subtype === "event_based") return "bpmn:eventBasedGateway";
    if (n.subtype === "complex") return "bpmn:complexGateway";
    return "bpmn:exclusiveGateway";
  }
  if (n.type === "subprocess") {
    if (n.subtype === "call_activity") return "bpmn:callActivity";
    if (n.subtype === "transaction") return "bpmn:transaction";
    if (n.subtype === "ad_hoc") return "bpmn:adHocSubProcess";
    return "bpmn:subProcess";
  }
  if (n.subtype === "service") return "bpmn:serviceTask";
  if (n.subtype === "user") return "bpmn:userTask";
  if (n.subtype === "manual") return "bpmn:manualTask";
  if (n.subtype === "script") return "bpmn:scriptTask";
  if (n.subtype === "business_rule") return "bpmn:businessRuleTask";
  if (n.subtype === "send") return "bpmn:sendTask";
  if (n.subtype === "receive") return "bpmn:receiveTask";
  return "bpmn:task";
}
function eventDef(n) {
  const map = {
    message: "messageEventDefinition",
    timer: "timerEventDefinition",
    error: "errorEventDefinition",
    signal: "signalEventDefinition",
    terminate: "terminateEventDefinition",
    escalation: "escalationEventDefinition",
    compensation: "compensateEventDefinition",
    conditional: "conditionalEventDefinition",
    link: "linkEventDefinition",
    cancel: "cancelEventDefinition"
  };
  return map[n.event_definition] ? `    <bpmn:${map[n.event_definition]} />` : "";
}
function camundaAttrs(n) {
  const a = [];
  if (n.execution?.handler) a.push(`camunda:delegateExpression="${esc('${' + n.execution.handler + '}')}"`);
  if (n.execution?.implementation) a.push(`camunda:class="${esc(n.execution.implementation)}"`);
  if (n.execution?.formKey) a.push(`camunda:formKey="${esc(n.execution.formKey)}"`);
  return a;
}
export function exportBpmnXml(ir, options = {}) {
  const p = ir.process;
  const nodes = [...(p.nodes || [])].sort((a,b)=>a.id.localeCompare(b.id));
  const edges = [...(p.edges || [])].sort((a,b)=>a.id.localeCompare(b.id));
  const incoming = new Map(nodes.map(n => [n.id, []])); const outgoing = new Map(nodes.map(n => [n.id, []]));
  for (const e of edges) { incoming.get(e.target)?.push(e.id); outgoing.get(e.source)?.push(e.id); }
  const nodeXml = nodes.map(n => {
    const attrs = [`id="${esc(n.id)}"`, `name="${esc(n.name || n.id)}"`, ...camundaAttrs(n)];
    if (n.subtype === "boundary" && n.attachedTo) attrs.push(`attachedToRef="${esc(n.attachedTo)}"`);
    if (n.gateway?.default_flow) attrs.push(`default="${esc(n.gateway.default_flow)}"`);
    const body = [...(incoming.get(n.id)||[]).sort().map(id => `    <bpmn:incoming>${esc(id)}</bpmn:incoming>`), ...(outgoing.get(n.id)||[]).sort().map(id => `    <bpmn:outgoing>${esc(id)}</bpmn:outgoing>`), eventDef(n)].filter(Boolean).join("\n");
    const t = tag(n); return body ? `  <${t} ${attrs.join(" ")}>\n${body}\n  </${t}>` : `  <${t} ${attrs.join(" ")} />`;
  }).join("\n");
  const edgeXml = edges.map(e => { const attrs = [`id="${esc(e.id)}"`, `sourceRef="${esc(e.source)}"`, `targetRef="${esc(e.target)}"`]; if (e.condition) attrs.push(`name="${esc(e.condition)}"`); return `  <bpmn:sequenceFlow ${attrs.join(" ")} />`; }).join("\n");
  const camundaNs = options.camunda ? `\n  xmlns:camunda="http://camunda.org/schema/1.0/bpmn"` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>\n<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"${camundaNs} id="Definitions_${esc(p.id)}">\n  <bpmn:process id="${esc(p.id)}" name="${esc(p.name || p.id)}" isExecutable="${p.isExecutable ? "true" : "false"}">\n${nodeXml}\n\n${edgeXml}\n  </bpmn:process>\n</bpmn:definitions>`;
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`));
  return m ? m[1] : undefined;
}
function tags(xml, names) {
  const re = new RegExp(`<([A-Za-z0-9_\\-]+:)?(${names.join('|')})\\b[^>]*(?:/>|>[\\s\\S]*?</\\1?\\2>)`, 'gi');
  return [...xml.matchAll(re)].map(m => ({ full: m[0], local: m[2], open: m[0].match(/^<[^>]+>/)?.[0] || m[0] }));
}
function processTag(xml) {
  const m = xml.match(/<([A-Za-z0-9_\-]+:)?process\b[^>]*>[\s\S]*?<\/\1?process>/i);
  if (!m) throw new Error("No BPMN process found");
  const full = m[0];
  return { full, open: full.match(/^<[^>]+>/)?.[0] || "" };
}
function mapNode(local) {
  if (local === "startEvent") return ["event", "start"];
  if (local === "endEvent") return ["event", "end"];
  if (local === "boundaryEvent") return ["event", "boundary"];
  if (local === "intermediateCatchEvent") return ["event", "intermediate_catch"];
  if (local === "intermediateThrowEvent") return ["event", "intermediate_throw"];
  if (local === "parallelGateway") return ["gateway", "parallel"];
  if (local === "exclusiveGateway") return ["gateway", "exclusive"];
  if (local === "inclusiveGateway") return ["gateway", "inclusive"];
  if (local === "eventBasedGateway") return ["gateway", "event_based"];
  if (local === "complexGateway") return ["gateway", "complex"];
  if (local === "userTask") return ["task", "user"];
  if (local === "serviceTask") return ["task", "service"];
  if (local === "manualTask") return ["task", "manual"];
  if (local === "scriptTask") return ["task", "script"];
  if (local === "businessRuleTask") return ["task", "business_rule"];
  if (local === "sendTask") return ["task", "send"];
  if (local === "receiveTask") return ["task", "receive"];
  if (local === "subProcess") return ["subprocess", "embedded"];
  if (local === "transaction") return ["subprocess", "transaction"];
  if (local === "adHocSubProcess") return ["subprocess", "ad_hoc"];
  if (local === "callActivity") return ["subprocess", "call_activity"];
  return ["task", "task"];
}
function stripChildScopes(xml) {
  const re = /<([A-Za-z0-9_\-]+:)?(subProcess|transaction|adHocSubProcess)\b[^>]*>[\s\S]*?<\/\1?\2>/gi;
  let prev, result = xml;
  do { prev = result; result = result.replace(re, ''); } while (result !== prev);
  return result;
}
function eventDefinition(full) {
  const defs = [["messageEventDefinition","message"],["timerEventDefinition","timer"],["errorEventDefinition","error"],["signalEventDefinition","signal"],["terminateEventDefinition","terminate"],["escalationEventDefinition","escalation"],["compensateEventDefinition","compensation"],["conditionalEventDefinition","conditional"],["linkEventDefinition","link"],["cancelEventDefinition","cancel"]];
  for (const [tag, value] of defs) if (new RegExp(`<[^>]*:?${tag}\\b`, "i").test(full)) return value;
  return undefined;
}
function inferBranch(condition) {
  const t = String(condition || "").toLowerCase();
  if (!t) return "main";
  if (/(error|fehler|timeout|invalid|not ok)/.test(t)) return "exception";
  if (/(reject|cancel|abort|abbrechen|ablehnen|terminate)/.test(t)) return "termination";
  if (/(retry|loop|erneut|wiederholen)/.test(t)) return "loop";
  if (/(not|nicht|else|otherwise|manual|manuell)/.test(t)) return "alternative";
  return "main";
}
export function importBpmnXml(xml) {
  const ptag = processTag(xml);
  const p = { id: attr(ptag.open, "id") || "imported_process", name: attr(ptag.open, "name") || attr(ptag.open, "id") || "Imported Process", isExecutable: attr(ptag.open, "isExecutable") === "true", nodes: [], edges: [] };
  for (const t of tags(ptag.full, ["startEvent","endEvent","intermediateCatchEvent","intermediateThrowEvent","boundaryEvent","exclusiveGateway","parallelGateway","inclusiveGateway","eventBasedGateway","complexGateway","task","serviceTask","userTask","manualTask","scriptTask","businessRuleTask","sendTask","receiveTask","subProcess","transaction","adHocSubProcess","callActivity"])) {
    const id = attr(t.open, "id");
    if (!id || p.nodes.some(n => n.id === id)) continue;
    const [type, subtype] = mapNode(t.local);
    const n = { id, type, subtype, name: attr(t.open, "name") || id };
    const ev = eventDefinition(t.full); if (ev) n.event_definition = ev;
    const attached = attr(t.open, "attachedToRef");
    if (attached) { n.attachedTo = attached; n.interrupting = attr(t.open, "cancelActivity") !== "false"; }
    const def = attr(t.open, "default"); if (type === "gateway" || def) { n.gateway = {}; if (def) n.gateway.default_flow = def; }
    const handler = attr(t.open, "camunda:delegateExpression") || attr(t.open, "delegateExpression");
    const impl = attr(t.open, "camunda:class") || attr(t.open, "class");
    const formKey = attr(t.open, "camunda:formKey") || attr(t.open, "formKey");
    if (handler || impl || formKey) { n.execution = {}; if (handler) n.execution.handler = handler.replace(/^\$\{|\}$/g, ""); if (impl) n.execution.implementation = impl; if (formKey) n.execution.formKey = formKey; }
    p.nodes.push(n);
  }
  const processLevelXml = stripChildScopes(ptag.full);
  for (const t of tags(processLevelXml, ["sequenceFlow"])) {
    const id = attr(t.open, "id"), source = attr(t.open, "sourceRef"), target = attr(t.open, "targetRef");
    if (!id || !source || !target) continue;
    const condition = attr(t.open, "name") || "";
    const e = { id, source, target, condition, branch_type: inferBranch(condition) };
    const src = p.nodes.find(n => n.id === source);
    if (src?.gateway?.default_flow === id) e.isDefault = true;
    p.edges.push(e);
  }
  return { process: p };
}

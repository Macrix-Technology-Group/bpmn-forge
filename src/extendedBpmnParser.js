function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`));
  return m ? m[1] : undefined;
}
function decode(v) {
  return String(v ?? '')
    .replaceAll('&quot;', '"')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&amp;', '&');
}
function tags(xml, names) {
  const re = new RegExp(`<([A-Za-z0-9_\\-]+:)?(${names.join('|')})\\b[^>]*(?:/>|>[\\s\\S]*?</\\1?\\2>)`, 'gi');
  return [...xml.matchAll(re)].map(m => ({ full: m[0], local: m[2], open: m[0].match(/^<[^>]+>/)?.[0] || m[0] }));
}
function textContent(full, localName) {
  const m = full.match(new RegExp(`<[^>]*:?${localName}\\b[^>]*>([\\s\\S]*?)<\\/[^>]*:?${localName}>`, 'i'));
  return m ? decode(m[1].trim()) : '';
}
export function parseParticipantsAndLanes(xml, processId) {
  const participants = [];
  for (const t of tags(xml, ['participant'])) {
    const id = attr(t.open, 'id');
    if (id) participants.push({ id, name: attr(t.open, 'name') || id, processRef: attr(t.open, 'processRef') || processId, lanes: [] });
  }

  const lanes = [];
  for (const t of tags(xml, ['lane'])) {
    const id = attr(t.open, 'id');
    if (!id) continue;
    const nodeRefs = [...t.full.matchAll(/<[^>]*:?flowNodeRef\b[^>]*>([\s\S]*?)<\/[^>]*:?flowNodeRef>/gi)].map(m => decode(m[1].trim()));
    lanes.push({ id, name: attr(t.open, 'name') || id, nodeRefs });
  }

  if (lanes.length) {
    let p = participants.find(x => x.processRef === processId);
    if (!p) {
      p = { id: `participant_${processId}`, name: processId, processRef: processId, lanes: [] };
      participants.push(p);
    }
    p.lanes = lanes;
  }

  return participants;
}
export function parseMessageFlows(xml) {
  return tags(xml, ['messageFlow']).map(t => ({
    id: attr(t.open, 'id'),
    name: attr(t.open, 'name') || attr(t.open, 'id'),
    source: attr(t.open, 'sourceRef'),
    target: attr(t.open, 'targetRef')
  })).filter(x => x.id && x.source && x.target);
}
export function parseDataAndAssociations(xml) {
  const objects = [];
  for (const t of tags(xml, ['dataObject','dataObjectReference','dataStoreReference'])) {
    const id = attr(t.open, 'id');
    if (id) objects.push({ id, name: attr(t.open, 'name') || id, type: t.local, ref: attr(t.open, 'dataObjectRef') || attr(t.open, 'dataStoreRef') || null });
  }

  const associations = [];
  for (const t of tags(xml, ['dataInputAssociation','dataOutputAssociation','association'])) {
    const id = attr(t.open, 'id') || `association_${associations.length + 1}`;
    let source = attr(t.open, 'sourceRef');
    let target = attr(t.open, 'targetRef');
    if (!source) source = textContent(t.full, 'sourceRef');
    if (!target) target = textContent(t.full, 'targetRef');
    if (source || target) associations.push({ id, type: t.local, source, target });
  }

  const annotations = [];
  for (const t of tags(xml, ['textAnnotation'])) {
    const id = attr(t.open, 'id');
    if (id) annotations.push({ id, name: attr(t.open, 'name') || id, text: textContent(t.full, 'text') });
  }

  return { objects, associations, annotations };
}
export function parseBpmndi(xml) {
  const shapes = {};
  for (const t of tags(xml, ['BPMNShape'])) {
    const id = attr(t.open, 'id');
    const bpmnElement = attr(t.open, 'bpmnElement');
    const bounds = t.full.match(/<[^>]*:?Bounds\b[^>]*>/i)?.[0] || '';
    if (id && bpmnElement && bounds) {
      shapes[bpmnElement] = {
        id,
        x: Number(attr(bounds, 'x') || 0),
        y: Number(attr(bounds, 'y') || 0),
        width: Number(attr(bounds, 'width') || 0),
        height: Number(attr(bounds, 'height') || 0)
      };
    }
  }

  const edges = {};
  for (const t of tags(xml, ['BPMNEdge'])) {
    const id = attr(t.open, 'id');
    const bpmnElement = attr(t.open, 'bpmnElement');
    const waypoints = [...t.full.matchAll(/<[^>]*:?waypoint\b[^>]*>/gi)].map(m => ({
      x: Number(attr(m[0], 'x') || 0),
      y: Number(attr(m[0], 'y') || 0)
    }));
    if (id && bpmnElement) edges[bpmnElement] = { id, waypoints };
  }

  return { shapes, edges };
}
export function parseNestedSubprocesses(xml) {
  const subprocesses = [];
  for (const t of tags(xml, ['subProcess','transaction'])) {
    const id = attr(t.open, 'id');
    if (!id) continue;
    const innerNodes = tags(t.full, ['startEvent','endEvent','task','serviceTask','userTask','exclusiveGateway','parallelGateway']).map(n => ({
      id: attr(n.open, 'id'),
      name: attr(n.open, 'name') || attr(n.open, 'id'),
      rawType: n.local
    })).filter(n => n.id);
    const innerEdges = tags(t.full, ['sequenceFlow']).map(e => ({
      id: attr(e.open, 'id'),
      source: attr(e.open, 'sourceRef'),
      target: attr(e.open, 'targetRef'),
      name: attr(e.open, 'name') || ''
    })).filter(e => e.id && e.source && e.target);
    subprocesses.push({ id, type: t.local, nodes: innerNodes, edges: innerEdges });
  }
  return subprocesses;
}
export function enrichIrWithExtendedBpmn(ir, xml) {
  const p = ir.process;
  const participants = parseParticipantsAndLanes(xml, p.id);
  const messageFlows = parseMessageFlows(xml);
  const data = parseDataAndAssociations(xml);
  const di = parseBpmndi(xml);
  const subprocesses = parseNestedSubprocesses(xml);

  if (participants.length) p.participants = participants;
  if (messageFlows.length) p.message_flows = messageFlows;
  if (data.objects.length || data.associations.length || data.annotations.length) p.data = data;
  if (Object.keys(di.shapes).length || Object.keys(di.edges).length) p.di = di;
  if (subprocesses.length) p.subprocesses = subprocesses;

  return ir;
}

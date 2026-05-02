import { exportBpmnXml, esc } from './bpmnXmlExporter.js';

function nodeSize(node) {
  if (node.type === 'event') return { width: 56, height: 56 };
  if (node.type === 'gateway') return { width: 88, height: 88 };
  return { width: 210, height: 90 };
}

function computeLayout(ir) {
  const nodes = [...(ir.process.nodes || [])];
  const edges = [...(ir.process.edges || [])];
  const outgoing = new Map(nodes.map(n => [n.id, []]));
  for (const e of edges) outgoing.get(e.source)?.push(e);
  const start = nodes.find(n => n.type === 'event' && n.subtype === 'start') || nodes[0];
  const depth = new Map();
  if (start) depth.set(start.id, 0);
  const q = start ? [start.id] : [];
  while (q.length) {
    const id = q.shift();
    const d = depth.get(id);
    for (const e of outgoing.get(id) || []) {
      if (!depth.has(e.target)) {
        depth.set(e.target, d + 1);
        q.push(e.target);
      }
    }
  }
  let i = 0;
  const positioned = new Map();
  for (const n of nodes) {
    if (!depth.has(n.id)) depth.set(n.id, ++i);
    const s = nodeSize(n);
    const laneRow = n.type === 'task' && n.subtype === 'user' ? 1 : 0;
    positioned.set(n.id, {
      id: n.id,
      x: 100 + depth.get(n.id) * 270,
      y: 120 + laneRow * 200,
      width: s.width,
      height: s.height
    });
  }
  return positioned;
}

function center(shape) {
  return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
}

export function exportBpmnXmlWithDi(ir) {
  const xml = exportBpmnXml(ir);
  const shapes = computeLayout(ir);
  const edges = ir.process.edges || [];

  const shapeXml = [...shapes.values()].map(s => `      <bpmndi:BPMNShape id="${esc(s.id)}_di" bpmnElement="${esc(s.id)}">
        <dc:Bounds x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" />
      </bpmndi:BPMNShape>`).join('\n');

  const edgeXml = edges.map(e => {
    const s = shapes.get(e.source);
    const t = shapes.get(e.target);
    if (!s || !t) return '';
    const a = center(s);
    const b = center(t);
    return `      <bpmndi:BPMNEdge id="${esc(e.id)}_di" bpmnElement="${esc(e.id)}">
        <di:waypoint x="${a.x}" y="${a.y}" />
        <di:waypoint x="${b.x}" y="${b.y}" />
      </bpmndi:BPMNEdge>`;
  }).join('\n');

  const diXml = `
  <bpmndi:BPMNDiagram id="BPMNDiagram_${esc(ir.process.id)}">
    <bpmndi:BPMNPlane id="BPMNPlane_${esc(ir.process.id)}" bpmnElement="${esc(ir.process.id)}">
${shapeXml}
${edgeXml}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>`;

  return xml
    .replace('<bpmn:definitions ', '<bpmn:definitions xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" ')
    .replace('</bpmn:definitions>', `${diXml}\n</bpmn:definitions>`);
}

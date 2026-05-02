import { nodeSize, center, labelBoundsForShape, labelBoundsForEdge, routeBetween } from './diGeometry.js';

function laneAssignments(ir) {
  const map = new Map();
  const lanes = (ir.process.participants || []).flatMap(p => p.lanes || []);
  lanes.forEach((lane, index) => {
    for (const ref of lane.nodeRefs || []) map.set(ref, { lane, index });
  });
  return { lanes, map };
}

function computeNodeBounds(ir) {
  if (ir.process.di?.shapes && Object.keys(ir.process.di.shapes).length) {
    const out = {};
    for (const node of ir.process.nodes || []) {
      if (ir.process.di.shapes[node.id]) out[node.id] = ir.process.di.shapes[node.id];
    }
    return out;
  }

  const nodes = ir.process.nodes || [];
  const edges = ir.process.edges || [];
  const outgoing = new Map(nodes.map(n => [n.id, []]));
  for (const e of edges) outgoing.get(e.source)?.push(e);
  const start = nodes.find(n => n.type === 'event' && n.subtype === 'start') || nodes[0];
  const depth = new Map(start ? [[start.id, 0]] : []);
  const q = start ? [start.id] : [];
  while (q.length) {
    const id = q.shift();
    const d = depth.get(id);
    for (const e of outgoing.get(id) || []) {
      if (!depth.has(e.target)) { depth.set(e.target, d + 1); q.push(e.target); }
    }
  }

  const { map } = laneAssignments(ir);
  let loose = 0;
  const bounds = {};
  for (const node of nodes) {
    if (!depth.has(node.id)) depth.set(node.id, ++loose);
    const laneIndex = map.get(node.id)?.index ?? 0;
    const s = nodeSize(node);
    bounds[node.id] = {
      x: 150 + depth.get(node.id) * 280,
      y: 130 + laneIndex * 220 + 50,
      width: s.width,
      height: s.height
    };
  }
  return bounds;
}

function buildLaneAndParticipantShapes(ir, nodeBounds) {
  const participants = ir.process.participants || [];
  const shapes = {};
  let globalTop = Infinity, globalBottom = -Infinity, globalLeft = Infinity, globalRight = -Infinity;

  for (const b of Object.values(nodeBounds)) {
    globalTop = Math.min(globalTop, b.y);
    globalBottom = Math.max(globalBottom, b.y + b.height);
    globalLeft = Math.min(globalLeft, b.x);
    globalRight = Math.max(globalRight, b.x + b.width);
  }
  if (!isFinite(globalTop)) {
    globalTop = 100; globalBottom = 300; globalLeft = 100; globalRight = 900;
  }

  for (const participant of participants) {
    const lanes = participant.lanes || [];
    if (!lanes.length) {
      shapes[participant.id] = {
        id: `${participant.id}_di`,
        bpmnElement: participant.id,
        kind: 'participant',
        bounds: { x: 40, y: globalTop - 70, width: globalRight - globalLeft + 220, height: globalBottom - globalTop + 160 },
        labelBounds: { x: 45, y: globalTop - 40, width: 90, height: 18 }
      };
      continue;
    }

    const participantTop = globalTop - 70;
    const laneHeight = 220;
    const participantHeight = lanes.length * laneHeight;
    shapes[participant.id] = {
      id: `${participant.id}_di`,
      bpmnElement: participant.id,
      kind: 'participant',
      bounds: { x: 40, y: participantTop, width: globalRight - globalLeft + 260, height: participantHeight },
      labelBounds: { x: 50, y: participantTop + 20, width: 80, height: 18 }
    };

    lanes.forEach((lane, index) => {
      shapes[lane.id] = {
        id: `${lane.id}_di`,
        bpmnElement: lane.id,
        kind: 'lane',
        bounds: { x: 120, y: participantTop + index * laneHeight, width: globalRight - globalLeft + 180, height: laneHeight },
        labelBounds: { x: 125, y: participantTop + index * laneHeight + 100, width: 80, height: 18 }
      };
    });
  }

  return shapes;
}

export function buildCompleteDi(ir) {
  const nodeBounds = computeNodeBounds(ir);
  const shapes = {};
  const labels = {};

  for (const node of ir.process.nodes || []) {
    const bounds = nodeBounds[node.id];
    if (!bounds) continue;
    shapes[node.id] = { id: `${node.id}_di`, bpmnElement: node.id, kind: 'node', bounds };
    labels[node.id] = { id: `${node.id}_label`, bpmnElement: node.id, bounds: labelBoundsForShape(bounds, node.name || node.id) };
  }

  Object.assign(shapes, buildLaneAndParticipantShapes(ir, nodeBounds));
  for (const [id, shape] of Object.entries(shapes)) {
    if (!labels[id]) labels[id] = { id: `${id}_label`, bpmnElement: id, bounds: shape.labelBounds || labelBoundsForShape(shape.bounds, id) };
  }

  const edges = {};
  for (const edge of ir.process.edges || []) {
    const s = nodeBounds[edge.source];
    const t = nodeBounds[edge.target];
    if (!s || !t) continue;
    const waypoints = ir.process.di?.edges?.[edge.id]?.waypoints || routeBetween(s, t);
    edges[edge.id] = { id: `${edge.id}_di`, bpmnElement: edge.id, kind: 'sequenceFlow', waypoints };
    labels[edge.id] = { id: `${edge.id}_label`, bpmnElement: edge.id, bounds: labelBoundsForEdge(waypoints, edge.condition || '') };
  }

  for (const flow of ir.process.message_flows || []) {
    const s = nodeBounds[flow.source] || shapes[flow.source]?.bounds;
    const t = nodeBounds[flow.target] || shapes[flow.target]?.bounds;
    if (!s || !t) continue;
    const waypoints = routeBetween(s, t);
    edges[flow.id] = { id: `${flow.id}_di`, bpmnElement: flow.id, kind: 'messageFlow', waypoints };
    labels[flow.id] = { id: `${flow.id}_label`, bpmnElement: flow.id, bounds: labelBoundsForEdge(waypoints, flow.name || '') };
  }

  const diagram = {
    id: `BPMNDiagram_${ir.process.id}`,
    plane: {
      id: `BPMNPlane_${ir.process.id}`,
      bpmnElement: ir.process.id,
      shapes,
      edges,
      labels
    }
  };

  return { diagrams: [diagram], shapes, edges, labels };
}

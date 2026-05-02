import { nodeSize } from './irToElkGraph.js';

export function irToElkSwimlaneGraph(ir, options = {}) {
  const process = ir.process || {};
  const participants = process.participants || [];
  const lanes = participants.flatMap(p => (p.lanes || []).map(l => ({ ...l, participantName: p.name })));

  const nodeToLane = new Map();
  for (const lane of lanes) {
    for (const ref of lane.nodeRefs || []) nodeToLane.set(ref, lane.id);
  }

  const nodesByLane = new Map(lanes.map(l => [l.id, []]));
  const orphans = [];
  for (const node of process.nodes || []) {
    const laneId = nodeToLane.get(node.id);
    if (laneId && nodesByLane.has(laneId)) nodesByLane.get(laneId).push(node);
    else orphans.push(node);
  }

  function buildBpmnChild(node) {
    const size = nodeSize(node);
    return {
      id: node.id,
      width: size.width,
      height: size.height,
      labels: [{ text: node.name || node.id }],
      data: node
    };
  }

  const laneChildren = lanes.map(lane => ({
    id: lane.id,
    labels: [{ text: lane.name }],
    data: { kind: 'lane', name: lane.name, participantName: lane.participantName },
    layoutOptions: {
      'elk.padding': '[top=24,left=80,bottom=24,right=24]',
      'elk.hierarchyHandling': 'INHERIT'
    },
    children: (nodesByLane.get(lane.id) || []).map(buildBpmnChild)
  }));

  if (orphans.length) {
    laneChildren.push({
      id: '__orphans__',
      labels: [{ text: 'Process' }],
      data: { kind: 'lane', name: 'Process' },
      layoutOptions: {
        'elk.padding': '[top=24,left=80,bottom=24,right=24]',
        'elk.hierarchyHandling': 'INHERIT'
      },
      children: orphans.map(buildBpmnChild)
    });
  }

  const edges = (process.edges || []).map(edge => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
    labels: edge.condition ? [{ text: edge.condition }] : [],
    data: edge
  }));

  return {
    id: process.id || 'process',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.layered.layering.strategy': 'LONGEST_PATH',
      'elk.layered.spacing.nodeNodeBetweenLayers': String(options.layerSpacing || 110),
      'elk.spacing.nodeNode': String(options.nodeSpacing || 60),
      'elk.spacing.edgeNode': '40',
      'elk.spacing.edgeEdge': '25',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.padding': '[top=40,left=40,bottom=40,right=40]'
    },
    children: laneChildren,
    edges
  };
}

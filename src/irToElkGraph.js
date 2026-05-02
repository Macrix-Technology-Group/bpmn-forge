export function nodeSize(node) {
  if (node.type === 'event') return { width: 56, height: 56 };
  if (node.type === 'gateway') return { width: 88, height: 88 };
  return { width: 210, height: 90 };
}

// A "boundary handler chain" is a set of nodes that exists *only* to handle
// the boundary event — every node in the set has its single inflow from the
// boundary or from another chain node, AND every outflow stays inside the
// chain (so the chain is terminal, with no edges back into the main flow).
// Excluding such a chain from the ELK input keeps the main process flow on
// a clean horizontal line; the renderer then places each chain post-layout,
// anchored to its boundary event. Chains that leak back into the main flow
// (e.g. a handler that funnels into a shared "send rejection" task) are
// rejected here — those nodes stay in the main ELK layout and just get a
// re-sourced inflow from the host activity.
function collectBoundaryChains(nodes, edges, boundaryById) {
  const incomingCount = new Map();
  for (const n of nodes) incomingCount.set(n.id, 0);
  for (const e of edges) {
    if (boundaryById.has(e.source)) continue;
    incomingCount.set(e.target, (incomingCount.get(e.target) || 0) + 1);
  }
  const outBySource = new Map();
  for (const e of edges) {
    if (!outBySource.has(e.source)) outBySource.set(e.source, []);
    outBySource.get(e.source).push(e);
  }

  // Phase 1 — gather candidates: nodes reachable from a boundary whose only
  // non-boundary inflow is from another candidate (or none at all).
  const candidates = new Set();
  for (const b of boundaryById.values()) {
    const queue = [];
    for (const e of outBySource.get(b.id) || []) {
      if ((incomingCount.get(e.target) || 0) === 0 && !boundaryById.has(e.target)) {
        queue.push(e.target);
      }
    }
    while (queue.length) {
      const id = queue.shift();
      if (candidates.has(id)) continue;
      candidates.add(id);
      for (const e of outBySource.get(id) || []) {
        if ((incomingCount.get(e.target) || 0) === 1 && !boundaryById.has(e.target)) {
          queue.push(e.target);
        }
      }
    }
  }

  // Phase 2 — prune any candidate whose outflows escape the candidate set.
  // Repeat until stable; pruning one node may invalidate its predecessors.
  let pruned = true;
  while (pruned) {
    pruned = false;
    for (const id of [...candidates]) {
      for (const e of outBySource.get(id) || []) {
        if (!candidates.has(e.target) && !boundaryById.has(e.target)) {
          candidates.delete(id);
          pruned = true;
          break;
        }
      }
    }
  }

  const chainNodeIds = candidates;
  const chainEdgeIds = new Set();
  const chainHeads = new Map();
  for (const e of edges) {
    if (boundaryById.has(e.source) && chainNodeIds.has(e.target)) {
      chainEdgeIds.add(e.id);
      if (!chainHeads.has(e.source)) chainHeads.set(e.source, []);
      chainHeads.get(e.source).push(e.id);
    } else if (chainNodeIds.has(e.source) && chainNodeIds.has(e.target)) {
      chainEdgeIds.add(e.id);
    }
  }
  return { chainNodeIds, chainEdgeIds, chainHeads };
}

// Boundary events overlay their host activity and are positioned by the
// renderer after layout — not by ELK. We strip them from the ELK input here,
// along with any handler chain attached to a boundary event. Sequence-flow
// edges that connect a boundary event to a non-chain target (e.g. a shared
// handler reached from multiple sources) are rewritten so the source becomes
// the host activity, letting ELK route them with a stable column rank; the
// renderer then patches their start point to actually exit from the boundary
// event's placed position.
//
// The swimlane renderer has its own boundary-overlay logic and expects to see
// boundary nodes in the ELK output, so it opts out of the stripping by
// passing { stripBoundaries: false }.
export function irToElkGraph(ir, options = {}) {
  const process = ir.process;
  const allNodes = process.nodes || [];
  const allEdges = process.edges || [];
  const stripBoundaries = options.stripBoundaries !== false;
  const boundaryById = new Map();
  if (stripBoundaries) {
    for (const n of allNodes) {
      if (n.subtype === 'boundary' && n.attachedTo) boundaryById.set(n.id, n);
    }
  }

  const { chainNodeIds, chainEdgeIds } = stripBoundaries
    ? collectBoundaryChains(allNodes, allEdges, boundaryById)
    : { chainNodeIds: new Set(), chainEdgeIds: new Set() };

  const layoutNodes = allNodes.filter(n => !boundaryById.has(n.id) && !chainNodeIds.has(n.id));
  // No explicit ports: ELK then routes edges to/from each side's midpoint,
  // which keeps a linear flow on a single horizontal centerline regardless of
  // node-height differences (e.g. 56-tall events vs 90-tall tasks).
  const children = layoutNodes.map(node => {
    const size = nodeSize(node);
    return {
      id: node.id,
      width: size.width,
      height: size.height,
      labels: [{ text: node.name || node.id }],
      data: node
    };
  });

  const edges = [];
  for (const edge of allEdges) {
    if (chainEdgeIds.has(edge.id)) continue;
    let source = edge.source;
    let target = edge.target;
    let boundarySource = null;
    if (boundaryById.has(source)) {
      boundarySource = boundaryById.get(source);
      source = boundarySource.attachedTo;
    }
    if (boundaryById.has(target)) continue;
    edges.push({
      id: edge.id,
      sources: [source],
      targets: [target],
      labels: edge.condition ? [{ text: edge.condition }] : [],
      data: boundarySource ? { ...edge, _boundarySourceId: boundarySource.id } : edge
    });
  }

  return {
    id: process.id || 'process',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.spacing.nodeNodeBetweenLayers': String(options.layerSpacing || 120),
      'elk.spacing.nodeNode': String(options.nodeSpacing || 70),
      'elk.spacing.edgeNode': '45',
      'elk.spacing.edgeEdge': '25',
      'elk.layered.nodePlacement.strategy': 'SIMPLE',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.padding': '[top=70,left=70,bottom=80,right=90]'
    },
    children,
    edges
  };
}

export { collectBoundaryChains };

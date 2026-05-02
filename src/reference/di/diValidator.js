export function validateCompleteDi(ir, di) {
  const errors = [];
  const warnings = [];
  const nodeIds = new Set((ir.process.nodes || []).map(n => n.id));
  const edgeIds = new Set((ir.process.edges || []).map(e => e.id));
  const participantIds = new Set((ir.process.participants || []).map(p => p.id));
  const laneIds = new Set((ir.process.participants || []).flatMap(p => (p.lanes || []).map(l => l.id)));

  for (const id of nodeIds) {
    if (!di.shapes?.[id]) warnings.push(`Missing BPMNShape for node ${id}`);
  }

  for (const id of edgeIds) {
    if (!di.edges?.[id]) warnings.push(`Missing BPMNEdge for sequenceFlow ${id}`);
    else if (!di.edges[id].waypoints || di.edges[id].waypoints.length < 2) errors.push(`BPMNEdge ${id} has fewer than two waypoints`);
  }

  for (const id of participantIds) {
    if (!di.shapes?.[id]) warnings.push(`Missing BPMNShape for participant ${id}`);
  }

  for (const id of laneIds) {
    if (!di.shapes?.[id]) warnings.push(`Missing BPMNShape for lane ${id}`);
  }

  for (const [id, shape] of Object.entries(di.shapes || {})) {
    const b = shape.bounds;
    if (!b) errors.push(`Shape ${id} missing bounds`);
    else if (b.width <= 0 || b.height <= 0) errors.push(`Shape ${id} has invalid bounds`);
  }

  for (const [id, edge] of Object.entries(di.edges || {})) {
    for (const p of edge.waypoints || []) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) errors.push(`Edge ${id} has invalid waypoint`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: {
      diagrams: di.diagrams?.length || 0,
      shapes: Object.keys(di.shapes || {}).length,
      edges: Object.keys(di.edges || {}).length,
      labels: Object.keys(di.labels || {}).length
    }
  };
}

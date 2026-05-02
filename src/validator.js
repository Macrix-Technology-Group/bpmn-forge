export function validateIr(ir) {
  const errors = [], warnings = [];
  const p = ir?.process;
  if (!p) return { ok:false, errors:['Missing process'], warnings };
  const nodeIds = new Set();
  for (const n of p.nodes || []) {
    if (!n.id) errors.push('Node missing id');
    if (!n.type) errors.push(`Node ${n.id || '?'} missing type`);
    if (nodeIds.has(n.id)) errors.push(`Duplicate node id: ${n.id}`);
    nodeIds.add(n.id);
    if (n.type === 'event' && n.subtype === 'boundary' && !n.attachedTo) errors.push(`Boundary event ${n.id} missing attachedTo`);
  }
  for (const e of p.edges || []) {
    if (!nodeIds.has(e.source)) errors.push(`Edge ${e.id} source missing: ${e.source}`);
    if (!nodeIds.has(e.target)) errors.push(`Edge ${e.id} target missing: ${e.target}`);
  }
  if (!(p.nodes || []).some(n => n.type === 'event' && n.subtype === 'start')) warnings.push('No start event');
  if (!(p.nodes || []).some(n => n.type === 'event' && n.subtype === 'end')) warnings.push('No end event');
  return { ok: errors.length === 0, errors, warnings };
}

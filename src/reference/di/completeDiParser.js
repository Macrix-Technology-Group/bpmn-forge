function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`));
  return m ? m[1] : undefined;
}
function tags(xml, names) {
  const re = new RegExp(`<([A-Za-z0-9_\\-]+:)?(${names.join('|')})\\b[^>]*(?:/>|>[\\s\\S]*?</\\1?\\2>)`, 'gi');
  return [...xml.matchAll(re)].map(m => ({ full: m[0], local: m[2], open: m[0].match(/^<[^>]+>/)?.[0] || m[0] }));
}
function boundsFrom(full) {
  const b = full.match(/<[^>]*:?Bounds\b[^>]*>/i)?.[0];
  if (!b) return null;
  return {
    x: Number(attr(b, 'x') || 0),
    y: Number(attr(b, 'y') || 0),
    width: Number(attr(b, 'width') || 0),
    height: Number(attr(b, 'height') || 0)
  };
}
function labelBoundsFrom(full) {
  const label = full.match(/<[^>]*:?BPMNLabel\b[^>]*>[\s\S]*?<\/[^>]*:?BPMNLabel>/i)?.[0];
  return label ? boundsFrom(label) : null;
}
export function parseCompleteBpmndi(xml) {
  const diagrams = [];
  const shapes = {};
  const edges = {};
  const labels = {};

  for (const d of tags(xml, ['BPMNDiagram'])) {
    const id = attr(d.open, 'id');
    const planeTag = tags(d.full, ['BPMNPlane'])[0];
    diagrams.push({
      id,
      plane: planeTag ? {
        id: attr(planeTag.open, 'id'),
        bpmnElement: attr(planeTag.open, 'bpmnElement')
      } : null
    });
  }

  for (const s of tags(xml, ['BPMNShape'])) {
    const id = attr(s.open, 'id');
    const bpmnElement = attr(s.open, 'bpmnElement');
    const bounds = boundsFrom(s.full);
    const labelBounds = labelBoundsFrom(s.full);
    if (id && bpmnElement && bounds) {
      shapes[bpmnElement] = { id, bpmnElement, bounds };
      if (labelBounds) labels[bpmnElement] = { id: `${id}_label`, bpmnElement, bounds: labelBounds };
    }
  }

  for (const e of tags(xml, ['BPMNEdge'])) {
    const id = attr(e.open, 'id');
    const bpmnElement = attr(e.open, 'bpmnElement');
    const waypoints = [...e.full.matchAll(/<[^>]*:?waypoint\b[^>]*>/gi)].map(m => ({
      x: Number(attr(m[0], 'x') || 0),
      y: Number(attr(m[0], 'y') || 0)
    }));
    const labelBounds = labelBoundsFrom(e.full);
    if (id && bpmnElement) {
      edges[bpmnElement] = { id, bpmnElement, waypoints };
      if (labelBounds) labels[bpmnElement] = { id: `${id}_label`, bpmnElement, bounds: labelBounds };
    }
  }

  return { diagrams, shapes, edges, labels };
}

export function nodeSize(node) {
  if (node.type === 'event') return { width: 56, height: 56 };
  if (node.type === 'gateway') return { width: 88, height: 88 };
  if (node.type === 'subprocess') return { width: 260, height: 140 };
  return { width: 210, height: 90 };
}

export function center(bounds) {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

export function labelBoundsForShape(bounds, text = '') {
  return {
    x: bounds.x,
    y: bounds.y + bounds.height + 6,
    width: Math.max(bounds.width, String(text).length * 7),
    height: 18
  };
}

export function labelBoundsForEdge(waypoints, text = '') {
  if (!waypoints || waypoints.length < 2) return { x: 0, y: 0, width: 0, height: 0 };
  let best = null;
  let bestLen = -1;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i], b = waypoints[i+1];
    const len = Math.abs(a.x-b.x) + Math.abs(a.y-b.y);
    if (len > bestLen) { best = { a, b }; bestLen = len; }
  }
  const x = (best.a.x + best.b.x) / 2;
  const y = (best.a.y + best.b.y) / 2 - 20;
  return { x: x - Math.max(44, String(text).length * 7) / 2, y, width: Math.max(44, String(text).length * 7), height: 18 };
}

export function routeBetween(sourceBounds, targetBounds) {
  const s = center(sourceBounds);
  const t = center(targetBounds);
  const start = { x: sourceBounds.x + sourceBounds.width, y: s.y };
  const end = { x: targetBounds.x, y: t.y };
  if (Math.abs(start.y - end.y) < 16) return [start, end];
  const mid = (start.x + end.x) / 2;
  return [start, { x: mid, y: start.y }, { x: mid, y: end.y }, end];
}

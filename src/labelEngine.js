export function longestSegment(points) {
  if (!points || points.length < 2) return null;
  let best = null;
  let bestLen = -1;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    if (len > bestLen) {
      best = { a, b, len };
      bestLen = len;
    }
  }
  return best;
}

export function placeEdgeLabel(edge, points) {
  if (!edge.condition) return null;

  const backgroundWidth = Math.max(44, String(edge.condition).length * 7 + 16);
  const backgroundHeight = 20;

  // Loop edges (back-edges routed as a U): the longest segment is always the
  // trunk, whose midpoint floats far from both source and target. Anchor the
  // label just past the source-side bend so the condition reads next to the
  // gateway it belongs to.
  if (edge._isLoop && points && points.length >= 3) {
    const sourceBend = points[1];
    const trunkBend = points[2];
    const trunkDir = trunkBend.x >= sourceBend.x ? 1 : -1;
    return {
      text: edge.condition,
      x: sourceBend.x + trunkDir * (backgroundWidth / 2 + 6),
      y: sourceBend.y + 4,
      anchor: 'middle',
      backgroundWidth,
      backgroundHeight
    };
  }

  const seg = longestSegment(points);
  if (!seg) return null;

  const horizontal = Math.abs(seg.a.x - seg.b.x) >= Math.abs(seg.a.y - seg.b.y);
  const x = (seg.a.x + seg.b.x) / 2;
  const y = (seg.a.y + seg.b.y) / 2;

  return {
    text: edge.condition,
    x,
    y: horizontal ? y - 12 : y,
    anchor: 'middle',
    backgroundWidth,
    backgroundHeight
  };
}

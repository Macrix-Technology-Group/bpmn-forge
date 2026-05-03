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

// Edge labels float 12px above a horizontal segment, with a background rect
// extending ±14px around the label center on the y axis (see drawEdge in
// svgPrimitives.js). Centred horizontally on the label's x. So given a label
// (lx, ly) with background (w, h), the rendered rect occupies the bbox below.
function labelBBox(lx, ly, w, h) {
  return { x: lx - w / 2, y: ly - 14, w, h };
}

function bboxOverlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Picks an (x, y) along `seg` such that the resulting label bounding box
// doesn't overlap any obstacle. Tries the segment's midpoint first, then
// shifts toward each end. Returns null if every sampled position collides.
function findClearPositionOnSegment(seg, w, h, horizontal, obstacles) {
  const ratios = [0.5, 0.35, 0.65, 0.25, 0.75, 0.15, 0.85];
  for (const r of ratios) {
    const cx = seg.a.x + (seg.b.x - seg.a.x) * r;
    const cy = seg.a.y + (seg.b.y - seg.a.y) * r;
    const lx = cx;
    const ly = horizontal ? cy - 12 : cy;
    const bb = labelBBox(lx, ly, w, h);
    if (!obstacles.some(o => bboxOverlaps(bb, o))) return { x: lx, y: ly };
  }
  return null;
}

// Vertical-offset escape: when no in-line position on any segment is clear
// (typical for a long label on a short L-route between gateway and task —
// the segment is narrower than the label, so source / target overlap is
// unavoidable on the segment line), step the label vertically away from
// the segment's midpoint until the rect clears every obstacle. Tries above
// first (BPMN convention has labels above flows), then below.
function findClearPositionWithVerticalEscape(seg, w, h, horizontal, obstacles) {
  const midX = (seg.a.x + seg.b.x) / 2;
  const midY = (seg.a.y + seg.b.y) / 2;
  const offsets = [];
  for (let dy = 24; dy <= 160; dy += 12) offsets.push(-dy);
  for (let dy = 24; dy <= 160; dy += 12) offsets.push(dy);
  for (const dy of offsets) {
    const lx = horizontal ? midX : midX + dy;
    const ly = horizontal ? (midY - 12 + dy) : midY;
    const bb = labelBBox(lx, ly, w, h);
    if (!obstacles.some(o => bboxOverlaps(bb, o))) return { x: lx, y: ly };
  }
  return null;
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

  // Build the segment list ordered by length (longest first). When `_obstacles`
  // is provided, prefer the longest segment that has a clear position for the
  // label — i.e. the position's bbox doesn't overlap any obstacle. If every
  // segment's tries collide, fall back to the longest-segment midpoint
  // (ugly, but at least the label appears somewhere).
  const segs = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    segs.push({ a, b, len: Math.abs(a.x - b.x) + Math.abs(a.y - b.y) });
  }
  segs.sort((p, q) => q.len - p.len);

  const obstacles = edge._obstacles || [];
  if (obstacles.length > 0) {
    for (const seg of segs) {
      const horizontal = Math.abs(seg.a.x - seg.b.x) >= Math.abs(seg.a.y - seg.b.y);
      const placement = findClearPositionOnSegment(
        seg, backgroundWidth, backgroundHeight, horizontal, obstacles
      );
      if (placement) {
        return {
          text: edge.condition,
          x: placement.x,
          y: placement.y,
          anchor: 'middle',
          backgroundWidth,
          backgroundHeight
        };
      }
    }
    // No in-line spot was clear on any segment. Push the label off the
    // longest segment vertically until it clears every obstacle.
    const seg0 = segs[0];
    const horizontal0 = Math.abs(seg0.a.x - seg0.b.x) >= Math.abs(seg0.a.y - seg0.b.y);
    const escape = findClearPositionWithVerticalEscape(
      seg0, backgroundWidth, backgroundHeight, horizontal0, obstacles
    );
    if (escape) {
      return {
        text: edge.condition,
        x: escape.x,
        y: escape.y,
        anchor: 'middle',
        backgroundWidth,
        backgroundHeight
      };
    }
  }

  // Default: longest-segment midpoint.
  const seg = segs[0];
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

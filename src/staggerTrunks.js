// Iron rule: when two routed edges share a horizontal segment at the same Y
// (or a vertical segment at the same X) with overlapping range, they render
// exactly on top of each other and visually merge into a single line. Readers
// can't tell two flows are passing through.
//
// This pass scans routed edges, groups co-linear MIDDLE segments (segments
// whose endpoints are both internal bend points — the path's anchor
// endpoints stay fixed because they sit on node perimeters), detects which
// overlap in their range axis, and shifts the colliding ones perpendicular
// to the segment so each renders on its own track.
//
// Only middle segments are shifted: a first/last segment has one anchor
// endpoint (startPoint or endPoint) on a node face, and that endpoint must
// stay where the routing layer placed it. Adjusting only the bend at the
// other end would tilt the segment off-orthogonal — so we leave first/last
// segments alone.
//
// The pass is opt-out: edges with `_isLoop: true` are excluded so the loop
// trunk's index-based staggering in routeLoopEdges / routeElkLoopEdges isn't
// double-shifted.

const STAGGER = 10;

function collectMiddleSegments(routedEdges) {
  const out = [];
  for (const edge of routedEdges) {
    const sec = edge?.sections?.[0];
    if (!sec) continue;
    const bends = sec.bendPoints || [];
    if (bends.length < 2) continue; // need at least one middle segment
    const pts = [sec.startPoint, ...bends, sec.endPoint];
    // Middle segments are pts[i] → pts[i+1] where 1 ≤ i ≤ pts.length-3.
    for (let i = 1; i <= pts.length - 3; i++) {
      const a = pts[i], b = pts[i + 1];
      const isHoriz = Math.abs(a.y - b.y) < 0.5 && Math.abs(a.x - b.x) > 0.5;
      const isVert  = Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) > 0.5;
      if (!isHoriz && !isVert) continue;
      out.push({
        edge,
        kind: isHoriz ? 'H' : 'V',
        a, b,
        coord: isHoriz ? a.y : a.x,
        rMin: isHoriz ? Math.min(a.x, b.x) : Math.min(a.y, b.y),
        rMax: isHoriz ? Math.max(a.x, b.x) : Math.max(a.y, b.y)
      });
    }
  }
  return out;
}

function rangesOverlap(aMin, aMax, bMin, bMax) {
  return aMin < bMax && bMin < aMax;
}

// Apply a perpendicular-axis shift to a segment. For a horizontal segment,
// shift y; for vertical, shift x. Both endpoints (which are bend points
// shared with adjacent segments) move together — the adjacent segments
// just change length to follow.
function shiftSegment(seg, delta) {
  if (seg.kind === 'H') {
    seg.a.y += delta;
    seg.b.y += delta;
    seg.coord += delta;
  } else {
    seg.a.x += delta;
    seg.b.x += delta;
    seg.coord += delta;
  }
}

export function staggerOverlappingTrunks(routedEdges) {
  const segments = collectMiddleSegments(
    (routedEdges || []).filter(e => !e?.data?._isLoop)
  );
  if (segments.length < 2) return;

  // Group by (kind, coord). Within each group, iterate left-to-right
  // (by rMin) and assign each segment a "depth" — the smallest non-negative
  // integer not used by any earlier segment that still overlaps this one.
  // Depth 0 stays at the original coord; depth 1 → +STAGGER; depth 2 →
  // -STAGGER; depth 3 → +2*STAGGER; etc. Symmetric around the original.
  const buckets = new Map();
  for (const seg of segments) {
    const key = `${seg.kind}:${Math.round(seg.coord)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(seg);
  }
  for (const group of buckets.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => a.rMin - b.rMin);
    const placed = []; // {seg, depth, rMin, rMax}
    for (const seg of group) {
      // Active = placed segments that still overlap this seg's range.
      const active = placed.filter(p => rangesOverlap(p.rMin, p.rMax, seg.rMin, seg.rMax));
      const usedDepths = new Set(active.map(p => p.depth));
      let depth = 0;
      while (usedDepths.has(depth)) depth++;
      placed.push({ seg, depth, rMin: seg.rMin, rMax: seg.rMax });
      if (depth === 0) continue;
      const k = Math.ceil(depth / 2);
      const sign = depth % 2 === 1 ? 1 : -1;
      shiftSegment(seg, sign * k * STAGGER);
    }
  }
}

// Iron rule: when two routed edges share a horizontal segment at the same Y
// (or a vertical segment at the same X) with overlapping range, they render
// exactly on top of each other and visually merge into a single line. Readers
// can't tell two flows are passing through.
//
// This pass scans routed edges, groups co-linear segments by (orientation,
// coordinate), and shifts colliding ones perpendicular to the segment so
// each renders on its own track.
//
// Middle segments (both endpoints are internal bend points) are always
// shiftable — moving them perpendicular to the segment preserves
// orthogonality because adjacent vertical/horizontal segments share the
// bend points and just change length to follow.
//
// First and last segments have one anchor endpoint on a node perimeter.
// They are ALSO shiftable when the anchor sits on a TASK or GATEWAY face —
// shifting perpendicular to the segment moves the anchor along the face's
// tangent, so it stays on the face. EVENT anchors are NOT shifted: events
// are circles and face-tangent motion takes the anchor off the visible
// perimeter, leaving a gap. When a conflict involves an event-anchored
// segment, the OTHER segment is preferred for shifting. If both are
// event-anchored, the conflict is left as-is (rare; symptom of an LLM
// modeling choice that puts an event right next to another flow's column).
//
// The pass is opt-out: edges with `_isLoop: true` are excluded so the loop
// trunk's index-based staggering in routeLoopEdges / routeElkLoopEdges isn't
// double-shifted.

import { nodeBox } from './nodeGeometry.js';

const STAGGER = 10;
const ANCHOR_TOL = 2;

function isAnchoredOnEvent(pt, nodeList) {
  for (const n of nodeList) {
    if (n?.data?.type !== 'event') continue;
    const b = nodeBox(n);
    if (pt.x >= b.x - ANCHOR_TOL && pt.x <= b.x + b.width + ANCHOR_TOL &&
        pt.y >= b.y - ANCHOR_TOL && pt.y <= b.y + b.height + ANCHOR_TOL) {
      return true;
    }
  }
  return false;
}

function collectAllSegments(routedEdges, nodeList) {
  const out = [];
  for (const edge of routedEdges) {
    const sec = edge?.sections?.[0];
    if (!sec) continue;
    const bends = sec.bendPoints || [];
    if (bends.length === 0) continue; // single-segment path: can't shift perp
    const pts = [sec.startPoint, ...bends, sec.endPoint];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const isHoriz = Math.abs(a.y - b.y) < 0.5 && Math.abs(a.x - b.x) > 0.5;
      const isVert  = Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) > 0.5;
      if (!isHoriz && !isVert) continue;
      const aIsAnchor = i === 0;
      const bIsAnchor = i === pts.length - 2;
      // Segment can't be shifted if any anchor sits on an event circle —
      // face-tangent motion would take the anchor off the perimeter.
      const eventAnchored =
        (aIsAnchor && isAnchoredOnEvent(a, nodeList)) ||
        (bIsAnchor && isAnchoredOnEvent(b, nodeList));
      out.push({
        edge,
        kind: isHoriz ? 'H' : 'V',
        a, b,
        coord: isHoriz ? a.y : a.x,
        rMin: isHoriz ? Math.min(a.x, b.x) : Math.min(a.y, b.y),
        rMax: isHoriz ? Math.max(a.x, b.x) : Math.max(a.y, b.y),
        eventAnchored
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

export function staggerOverlappingTrunks(routedEdges, positioned) {
  const nodeList = positioned instanceof Map
    ? [...positioned.values()]
    : (Array.isArray(positioned) ? positioned : (positioned ? Object.values(positioned) : []));

  const segments = collectAllSegments(
    (routedEdges || []).filter(e => !e?.data?._isLoop),
    nodeList
  );
  if (segments.length < 2) return;

  // Group by (kind, coord). Within each group, iterate left-to-right
  // (by rMin) and assign each segment a depth via greedy sweep — the
  // smallest non-negative integer not used by an earlier overlapping
  // segment. Depth 0 stays at the original coord; subsequent depths
  // alternate +STAGGER, -STAGGER, +2*STAGGER, -2*STAGGER, ...
  //
  // Sort each group with EVENT-ANCHORED segments first so they get
  // depth 0 (no shift) — they can't be moved without breaking the
  // visible-perimeter contract.
  const buckets = new Map();
  for (const seg of segments) {
    const key = `${seg.kind}:${Math.round(seg.coord)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(seg);
  }
  for (const group of buckets.values()) {
    if (group.length < 2) continue;
    // Primary sort: event-anchored first (they keep depth 0).
    // Secondary sort: by rMin (left-to-right) so the sweep is monotonic.
    group.sort((a, b) => {
      if (a.eventAnchored !== b.eventAnchored) return a.eventAnchored ? -1 : 1;
      return a.rMin - b.rMin;
    });
    const placed = []; // {seg, depth, rMin, rMax}
    for (const seg of group) {
      const active = placed.filter(p => rangesOverlap(p.rMin, p.rMax, seg.rMin, seg.rMax));
      const usedDepths = new Set(active.map(p => p.depth));
      let depth = 0;
      while (usedDepths.has(depth)) depth++;
      placed.push({ seg, depth, rMin: seg.rMin, rMax: seg.rMax });
      // Don't shift event-anchored segments even if they're in conflict;
      // they always take depth 0. The other (shiftable) segments in the
      // group will pick higher depths and move out of their way.
      if (depth === 0 || seg.eventAnchored) continue;
      const k = Math.ceil(depth / 2);
      const sign = depth % 2 === 1 ? 1 : -1;
      shiftSegment(seg, sign * k * STAGGER);
    }
  }
}

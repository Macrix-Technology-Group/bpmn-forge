// Iron rule: no two connectors may share a start or end point on a node.
// Each endpoint must attach at a distinct coordinate on the node's perimeter.
//
// This module post-processes already-routed edges (sequence flows, loop edges,
// message flows, data associations). It groups every endpoint by the (node,
// face) it lands on, and when 2+ endpoints share a face they are distributed
// evenly along it. The bend point adjacent to each moved endpoint is slid in
// parallel so the path stays orthogonal; if the original path had no bend
// points, two bends are inserted to dogleg around the offset.
//
// `findOverlappingEndpoints` is a hard audit used as a runtime invariant:
// any rendered diagram with two endpoints at identical coordinates is a bug.

import { nodeBox } from './nodeGeometry.js';

const FACE_TOL = 1.5;
const FACE_MARGIN = 10;

function detectFace(node, pt) {
  const b = nodeBox(node);
  const xInRange = pt.x >= b.x - FACE_TOL && pt.x <= b.x + b.width + FACE_TOL;
  const yInRange = pt.y >= b.y - FACE_TOL && pt.y <= b.y + b.height + FACE_TOL;
  if (Math.abs(pt.x - b.x) < FACE_TOL && yInRange) return 'left';
  if (Math.abs(pt.x - (b.x + b.width)) < FACE_TOL && yInRange) return 'right';
  if (Math.abs(pt.y - b.y) < FACE_TOL && xInRange) return 'top';
  if (Math.abs(pt.y - (b.y + b.height)) < FACE_TOL && xInRange) return 'bottom';
  return null;
}

function nodeAtPoint(nodeList, pt) {
  for (const n of nodeList) {
    if (detectFace(n, pt)) return n;
  }
  return null;
}

// Returns the perpendicular coord (y for vertical faces, x for horizontal) of
// the i-th of N attach points on a node's face. Margin keeps endpoints away
// from the corners so arrowheads don't overlap the node border.
function attachCoord(node, face, i, N) {
  const b = nodeBox(node);
  const isVerticalFace = face === 'left' || face === 'right';
  const usable = (isVerticalFace ? b.height : b.width) - 2 * FACE_MARGIN;
  const start = (isVerticalFace ? b.y : b.x) + FACE_MARGIN;
  if (N === 1) return start + usable / 2;
  // Distribute as i/(N-1) so first/last sit at the band's extremes — keeps
  // the spread visually balanced without crowding.
  return start + (usable * i) / (N - 1);
}

// Sort the bucket so the redistribution is monotonic w.r.t. the OTHER
// endpoint's perpendicular position. Edges originating higher on the canvas
// attach higher on a vertical face, etc. — minimizes path crossings.
function sortBucket(bucket, face) {
  bucket.sort((a, b) => {
    const aSec = a.routed.sections[0];
    const bSec = b.routed.sections[0];
    const aOther = a.role === 'source' ? aSec.endPoint : aSec.startPoint;
    const bOther = b.role === 'source' ? bSec.endPoint : bSec.startPoint;
    if (face === 'left' || face === 'right') return aOther.y - bOther.y;
    return aOther.x - bOther.x;
  });
}

// Move endpoint to a new perpendicular coordinate on its face. Adjusts the
// adjacent bend point so the first/last segment stays orthogonal. When the
// path has zero bends (straight-line case), inserts two bends to dogleg.
function applyOffset(routed, role, face, newPerp) {
  const sec = routed.sections[0];
  const pt = role === 'source' ? sec.startPoint : sec.endPoint;
  const isVerticalFace = face === 'left' || face === 'right';
  const oldPerp = isVerticalFace ? pt.y : pt.x;
  if (Math.abs(oldPerp - newPerp) < 0.5) return;
  if (isVerticalFace) pt.y = newPerp;
  else pt.x = newPerp;

  const bends = sec.bendPoints || (sec.bendPoints = []);
  if (bends.length === 0) {
    // Original was a single straight segment between source and target. After
    // moving one endpoint perpendicular to its face, insert a dogleg so the
    // path stays orthogonal: P' → (jog, P'.perp) → (jog, other.perp) → other.
    const other = role === 'source' ? sec.endPoint : sec.startPoint;
    if (isVerticalFace) {
      // Both faces vertical → segment runs horizontally. Pick a jog X
      // between source and target, biased toward the moved endpoint.
      const bias = role === 'source' ? 0.4 : 0.6;
      const jogX = pt.x + (other.x - pt.x) * bias;
      if (role === 'source') {
        bends.push({ x: jogX, y: newPerp });
        bends.push({ x: jogX, y: other.y });
      } else {
        bends.push({ x: jogX, y: other.y });
        bends.push({ x: jogX, y: newPerp });
      }
    } else {
      const bias = role === 'source' ? 0.4 : 0.6;
      const jogY = pt.y + (other.y - pt.y) * bias;
      if (role === 'source') {
        bends.push({ x: newPerp, y: jogY });
        bends.push({ x: other.x, y: jogY });
      } else {
        bends.push({ x: other.x, y: jogY });
        bends.push({ x: newPerp, y: jogY });
      }
    }
    return;
  }

  // At least one bend exists. The first/last segment between endpoint and
  // adjacent bend must be perpendicular to the face. Slide the bend on the
  // perp axis so the segment stays straight and perpendicular.
  const adj = role === 'source' ? bends[0] : bends[bends.length - 1];
  if (isVerticalFace) {
    if (Math.abs(adj.y - oldPerp) < 1) adj.y = newPerp;
  } else {
    if (Math.abs(adj.x - oldPerp) < 1) adj.x = newPerp;
  }
}

// Distributes endpoints so no two connectors share an attach coordinate.
// Mutates the passed-in routedEdges in place (their bendPoints / startPoint /
// endPoint are updated). Pass every kind of routed edge (sequence flows, loop
// edges, message flows, data associations) so the buckets see the full set
// of incident connectors per node face.
export function enforceDistinctEndpoints(routedEdges, positioned) {
  const nodeList = positioned instanceof Map
    ? [...positioned.values()]
    : (Array.isArray(positioned) ? positioned : Object.values(positioned));

  const buckets = new Map();
  for (const r of routedEdges) {
    const sec = r?.sections?.[0];
    if (!sec) continue;
    const sNode = nodeAtPoint(nodeList, sec.startPoint);
    if (sNode) {
      const face = detectFace(sNode, sec.startPoint);
      const key = `${sNode.id}:${face}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push({ routed: r, role: 'source', node: sNode, face });
    }
    const tNode = nodeAtPoint(nodeList, sec.endPoint);
    if (tNode) {
      const face = detectFace(tNode, sec.endPoint);
      const key = `${tNode.id}:${face}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push({ routed: r, role: 'target', node: tNode, face });
    }
  }
  // Minimum visual gap between two endpoints on the same face, in pixels.
  // If existing endpoints are already at least this far apart, redistribution
  // is skipped — the iron rule (no two endpoints at the same coordinate) is
  // already satisfied, and forcing them onto the face's evenly-spaced grid
  // would visually break alignments the routing layer carefully set up
  // (e.g. a message flow into a black-box pool aligned to its source's x).
  const MIN_ENDPOINT_GAP = 16;

  for (const [, bucket] of buckets) {
    if (bucket.length < 2) continue;
    const { face, node } = bucket[0];
    const isVertical = face === 'left' || face === 'right';
    const perp = entry => {
      const sec = entry.routed.sections[0];
      const pt = entry.role === 'source' ? sec.startPoint : sec.endPoint;
      return isVertical ? pt.y : pt.x;
    };
    const sorted = [...bucket].sort((a, b) => perp(a) - perp(b));
    let minGap = Infinity;
    for (let i = 1; i < sorted.length; i++) {
      minGap = Math.min(minGap, perp(sorted[i]) - perp(sorted[i - 1]));
    }
    if (minGap >= MIN_ENDPOINT_GAP) continue;

    // Some pair is below the gap threshold — redistribute the whole bucket
    // evenly along the face. Sort by the OTHER endpoint's perpendicular
    // position so the spread is monotonic and crossings are minimized.
    sortBucket(bucket, face);
    bucket.forEach((entry, i) => {
      const newPerp = attachCoord(node, face, i, bucket.length);
      applyOffset(entry.routed, entry.role, entry.face, newPerp);
    });
  }
}

// Audit invariant: returns the list of (nodeId, x, y, members[]) groups where
// 2+ edges resolve to identical endpoint coordinates. MUST be empty for any
// rendered diagram. Callers should treat a non-empty result as a hard failure.
export function findOverlappingEndpoints(routedEdges, positioned) {
  const nodeList = positioned instanceof Map
    ? [...positioned.values()]
    : (Array.isArray(positioned) ? positioned : Object.values(positioned));
  const seen = new Map();
  for (const r of routedEdges) {
    const sec = r?.sections?.[0];
    if (!sec) continue;
    for (const role of ['source', 'target']) {
      const pt = role === 'source' ? sec.startPoint : sec.endPoint;
      const node = nodeAtPoint(nodeList, pt);
      if (!node) continue;
      const key = `${node.id}|${Math.round(pt.x)}|${Math.round(pt.y)}`;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key).push({ edgeId: r.id, role });
    }
  }
  const violations = [];
  for (const [key, members] of seen) {
    if (members.length > 1) {
      const [nodeId, x, y] = key.split('|');
      violations.push({ nodeId, x: Number(x), y: Number(y), members });
    }
  }
  return violations;
}

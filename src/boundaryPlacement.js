// Where does a boundary event glyph sit on its host activity?
//
// BPMN convention used here:
//   - Interrupting boundaries (default) sit on the host's BOTTOM edge, with
//     the glyph's center on the edge line.
//   - Non-interrupting boundaries sit on the TOP edge.
//   - Multiple boundaries on the same edge stagger left/right from the host
//     center: index 0 sits at center, index 1 to the right, index 2 to the
//     left, index 3 further right, and so on.
//
// Splitting interrupting / non-interrupting onto different edges lets a
// reader tell the two semantics apart at a glance — the dashed-vs-solid
// glyph alone is too easy to miss in dense diagrams. It also keeps each
// edge's column free for outflow trunks to a handler chain.
//
// `host` and the returned point are in renderer-native coordinates. Pass
// either ELK shapes (x/y) or post-shift swimlane shapes (absX/absY) — use
// nodeBox from ./nodeGeometry.js to normalize before calling.

const STAGGER = 36;

export function boundaryAttachPoint(hostBox, boundary, idxOnEdge) {
  const edge = boundary.interrupting === false ? 'top' : 'bottom';
  const slot = idxOnEdge === 0
    ? 0
    : (idxOnEdge % 2 === 1 ? Math.ceil(idxOnEdge / 2) : -Math.ceil(idxOnEdge / 2));
  const cx = hostBox.x + hostBox.width / 2 + slot * STAGGER;
  const cy = edge === 'top' ? hostBox.y : hostBox.y + hostBox.height;
  return { cx, cy, edge };
}

// Helper: groups boundary nodes by (hostId, edge) and assigns each its
// edge-relative index. Returns Map<boundaryId, { hostId, edge, idxOnEdge }>.
// Both renderers use the same grouping policy; only the coordinate shape
// of `host` differs.
export function indexBoundariesByEdge(boundaryNodes) {
  const buckets = new Map();
  const byId = new Map();
  for (const b of boundaryNodes) {
    if (!b.attachedTo) continue;
    const edge = b.interrupting === false ? 'top' : 'bottom';
    const key = `${b.attachedTo}|${edge}`;
    if (!buckets.has(key)) buckets.set(key, []);
    const idx = buckets.get(key).length;
    buckets.get(key).push(b);
    byId.set(b.id, { hostId: b.attachedTo, edge, idxOnEdge: idx });
  }
  return byId;
}

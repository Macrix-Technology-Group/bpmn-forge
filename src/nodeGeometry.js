// Shared geometry primitives used by every renderer and exporter.
//
// `nodeSize` is the single source of truth for BPMN shape dimensions —
// changing one number here changes every diagram, every BPMNDI export, and
// every layout pass.
//
// `nodeBox` is the small adapter that lets shared helpers consume both ELK
// shapes (which carry `x`/`y` from `elk.layout()`) and post-layout swimlane
// shapes (which carry `absX`/`absY` after the lane-positioning pass). The two
// shapes are *semantically* different — ELK coords are pre-shift, swimlane
// coords are draw-ready — so this module deliberately does not try to unify
// them; it just normalizes them when something needs to read width/height
// without caring which pipeline produced the node.

export function nodeSize(node) {
  if (node.type === 'event') return { width: 56, height: 56 };
  if (node.type === 'gateway') return { width: 88, height: 88 };
  return { width: 210, height: 90 };
}

export function nodeBox(node) {
  const x = node.absX !== undefined ? node.absX : node.x;
  const y = node.absY !== undefined ? node.absY : node.y;
  return { x, y, width: node.width, height: node.height };
}

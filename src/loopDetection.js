// Identifies which edges in an IR are loops (back-edges in the topological
// graph). Loops must be routed differently from forward flow — typically as
// a U-shape that goes around the main process line — and pulling them out
// before layout lets the layout engine see a clean DAG.
//
// Two sources contribute to the loop set:
//
//   1. Declared loops: any edge with `branch_type === 'loop'`. Authored intent.
//
//   2. Auto-detected back-edges: any edge whose target is currently on the
//      DFS stack — i.e. it points back into an ancestor in the traversal.
//      This catches LLM-generated IRs that label a feedback edge as
//      `exception` or `alternative` instead of `loop`. DFS starts from
//      every start event, then any unvisited node, so disconnected
//      sub-graphs and lane-only fragments are still classified.
//
// Both renderers should agree on which edges are loops; otherwise the same
// IR can render with a back-edge as a clean U in one renderer and as a long
// detour through the diagram in the other.

export function detectLoopEdges(ir) {
  const allNodes = ir?.process?.nodes || [];
  const allEdges = ir?.process?.edges || [];
  const declaredLoops = new Set(
    allEdges.filter(e => e.branch_type === 'loop').map(e => e.id)
  );
  const succ = new Map();
  for (const n of allNodes) succ.set(n.id, []);
  for (const e of allEdges) {
    if (declaredLoops.has(e.id)) continue;
    succ.get(e.source)?.push(e);
  }
  const visited = new Set();
  const onStack = new Set();
  const detectedBackEdges = new Set();
  function dfs(id) {
    if (visited.has(id)) return;
    onStack.add(id);
    for (const e of succ.get(id) || []) {
      if (onStack.has(e.target)) {
        detectedBackEdges.add(e.id);
      } else if (!visited.has(e.target)) {
        dfs(e.target);
      }
    }
    onStack.delete(id);
    visited.add(id);
  }
  for (const n of allNodes) {
    if (n.subtype === 'start') dfs(n.id);
  }
  for (const n of allNodes) if (!visited.has(n.id)) dfs(n.id);
  return new Set([...declaredLoops, ...detectedBackEdges]);
}

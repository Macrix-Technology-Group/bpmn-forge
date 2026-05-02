export function coverage(a,b,diffs=[]) {
  const count = x => x?.length || 0;
  const ratio = (after,before) => before === 0 ? 1 : Math.min(1, after / before);
  const nodes = ratio(count(b.process.nodes), count(a.process.nodes));
  const edges = ratio(count(b.process.edges), count(a.process.edges));
  const semanticPenalty = Math.max(0, 1 - diffs.length * 0.05);
  const total = Number(((nodes + edges + semanticPenalty) / 3).toFixed(4));
  return { nodes, edges, semanticPenalty, total };
}
export function confidence(cov,warnings=[]) {
  return Number(Math.max(0, cov.total - Math.min(0.25, warnings.length * 0.05)).toFixed(4));
}

export function normalizeIr(ir) {
  const clone = JSON.parse(JSON.stringify(ir));
  const p = clone.process || {};
  clone.process = p;
  p.id = p.id || 'process';
  p.name = p.name || p.id;
  p.nodes = [...(p.nodes || [])].map(n => {
    n.id = n.id || 'node';
    n.name = n.name || n.id;
    n.type = n.type || 'task';
    n.subtype = n.subtype || (n.type === 'event' ? 'intermediate_catch' : n.type === 'gateway' ? 'exclusive' : 'task');
    if (n.type === 'gateway') {
      n.gateway = n.gateway || {};
      n.gateway.direction = n.gateway.direction || 'unspecified';
    }
    return n;
  }).sort((a,b)=>a.id.localeCompare(b.id));
  p.edges = [...(p.edges || [])].map((e,i) => {
    e.id = e.id || `e${i+1}`;
    e.condition = e.condition || '';
    e.branch_type = e.branch_type || (e.condition ? 'alternative' : 'main');
    return e;
  }).sort((a,b)=>a.id.localeCompare(b.id));
  return clone;
}

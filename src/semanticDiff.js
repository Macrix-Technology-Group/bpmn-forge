function byId(list = []) { return new Map(list.map(x => [x.id, x])); }
export function semanticDiff(a,b) {
  const diffs=[]; const n1=byId(a.process.nodes), n2=byId(b.process.nodes), e1=byId(a.process.edges), e2=byId(b.process.edges);
  for (const [id,x] of n1) {
    const y=n2.get(id);
    if (!y) { diffs.push({object:'node',id,issue:'lost'}); continue; }
    for (const f of ['type','subtype','name','event_definition','attachedTo']) {
      if ((x[f]??null)!==(y[f]??null)) diffs.push({object:'node',id,field:f,before:x[f]??null,after:y[f]??null});
    }
  }
  for (const [id,x] of e1) {
    const y=e2.get(id);
    if (!y) { diffs.push({object:'edge',id,issue:'lost'}); continue; }
    for (const f of ['source','target','condition','branch_type','isDefault']) {
      if ((x[f]??null)!==(y[f]??null)) diffs.push({object:'edge',id,field:f,before:x[f]??null,after:y[f]??null});
    }
  }
  return diffs;
}

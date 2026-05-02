function id(s) { return String(s || 'node').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,48) || 'node'; }
function subtype(label) { return /manual|manuell|operator|dialog|user/i.test(label) ? 'user' : 'service'; }
export function textToIr(text, options = {}) {
  const parts = String(text).split(/(?<=[.!?])\s+|\n+/).map(s=>s.trim()).filter(Boolean);
  const nodes = [{id:'start',type:'event',subtype:'start',name:'Start'}], edges = [];
  let current = nodes[0];
  const add = (label,type='task',st=null) => { let base=id(label), nid=base, i=2; while(nodes.some(n=>n.id===nid)) nid=`${base}_${i++}`; const n={id:nid,type,subtype:st||(type==='task'?subtype(label):undefined),name:label}; if(!n.subtype) delete n.subtype; nodes.push(n); return n; };
  for (const raw of parts) { const t=add(raw.replace(/[.!?]+$/,'')); edges.push({id:`e${edges.length+1}`,source:current.id,target:t.id}); current=t; }
  const end=add('End','event','end'); edges.push({id:`e${edges.length+1}`,source:current.id,target:end.id});
  return {process:{id:options.processId||'text_process',name:options.processName||'Text Process',nodes,edges}};
}

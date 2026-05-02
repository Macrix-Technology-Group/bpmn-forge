function esc(v) { return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"); }
function size(n) { if (n.type === "event") return [56,56]; if (n.type === "gateway") return [88,88]; return [210,90]; }
function center(n){ const [w,h]=size(n); return [n.x+w/2,n.y+h/2]; }
function port(n,side){ const [w,h]=size(n); const [cx,cy]=center(n); const x=n.x,y=n.y; return {left:[x,cy],right:[x+w,cy],top:[cx,y],bottom:[cx,y+h]}[side]; }
function path(pts){ return "M"+pts.map(p => `${Math.round(p[0])},${Math.round(p[1])}`).join(" L"); }
function draw(n){ const [w,h]=size(n); const [cx,cy]=center(n); if(n.type==="event") return `<circle cx="${cx}" cy="${cy}" r="${w/2-5}" fill="white" stroke="#111" stroke-width="${n.subtype==="end"?4:2.5}"/><text x="${cx}" y="${n.y+h+20}" class="label">${esc(n.name)}</text>`; if(n.type==="gateway") return `<polygon points="${cx},${n.y} ${n.x+w},${cy} ${cx},${n.y+h} ${n.x},${cy}" fill="white" stroke="#111" stroke-width="2.5"/><text x="${cx}" y="${cy+8}" class="gateway">X</text><text x="${cx}" y="${n.y+h+20}" class="label">${esc(n.name)}</text>`; return `<rect x="${n.x}" y="${n.y}" width="${w}" height="${h}" rx="14" fill="white" stroke="#111" stroke-width="2.5"/><text x="${cx}" y="${cy+5}" class="label">${esc(n.name)}</text>`; }
export function renderSvg(ir, report={}) {
  const nodes = new Map(ir.process.nodes.map(n => [n.id, {...n}]));
  const outgoing = new Map(ir.process.nodes.map(n => [n.id, []]));
  for(const e of ir.process.edges) outgoing.get(e.source)?.push(e);
  const start = ir.process.nodes.find(n=>n.type==="event"&&n.subtype==="start") || ir.process.nodes[0];
  const depth = new Map([[start.id,0]]), q=[start.id];
  while(q.length){ const id=q.shift(), d=depth.get(id); for(const e of outgoing.get(id)||[]) if(!depth.has(e.target)){ depth.set(e.target,d+1); q.push(e.target); } }
  let i=0; for(const n of nodes.values()) if(!depth.has(n.id)) depth.set(n.id,++i);
  for(const n of nodes.values()) { const d=depth.get(n.id)||0; n.x=90+d*260; n.y= n.type==="task"&&n.subtype==="user" ? 300 : 110; }
  const maxX = Math.max(...[...nodes.values()].map(n=>n.x+size(n)[0]))+120, maxY=520;
  const edgeSvg = ir.process.edges.map(e=>{ const s=nodes.get(e.source),t=nodes.get(e.target); if(!s||!t)return ""; const p1=port(s,"right"),p2=port(t,"left"),mid=(p1[0]+p2[0])/2; const pts=Math.abs(p1[1]-p2[1])<16 ? [p1,p2] : [p1,[mid,p1[1]],[mid,p2[1]],p2]; return `<path class="flow" d="${path(pts)}"/>`; }).join("\\n");
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${maxX}" height="${maxY}" viewBox="0 0 ${maxX} ${maxY}"><defs><marker id="arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 Z" fill="#111"/></marker></defs><style>.flow{fill:none;stroke:#111;stroke-width:2.2;marker-end:url(#arrow)}.label{font-family:Arial;font-size:13px;text-anchor:middle}.gateway{font-family:Arial;font-size:26px;font-weight:bold;text-anchor:middle}</style>${edgeSvg}${[...nodes.values()].map(draw).join("\\n")}</svg>`;
}

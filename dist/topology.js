/* Round a polygon coverage as shared arcs, never each polygon independently. */
(function(root){'use strict';
function chaikin(points,closed,iterations){
 let p=points.map(v=>v.slice());
 for(let n=0;n<iterations;n++){
  const q=[];if(!closed)q.push(p[0]);
  for(let k=0;k<p.length-1;k++){const a=p[k],b=p[k+1];q.push([.75*a[0]+.25*b[0],.75*a[1]+.25*b[1]],[.25*a[0]+.75*b[0],.25*a[1]+.75*b[1]]);}
  if(closed)q.push(q[0].slice());else q.push(p[p.length-1]);p=q;
 }return p;
}
function smoothCoverage(features,{toGrid,fromGrid,iterations=2}){
 const pointKey=p=>p.join(','),edgeKey=(a,b)=>a<b?`${a}|${b}`:`${b}|${a}`;
 const nodes=new Map(),edges=new Map();
 const node=p=>{const key=pointKey(p);if(!nodes.has(key))nodes.set(key,{p,edges:[]});return key;};
 function expand(ring){const out=[];for(let i=0;i<ring.length-1;i++){
  const a=toGrid(ring[i]).map(Math.round),b=toGrid(ring[i+1]).map(Math.round),dx=b[0]-a[0],dy=b[1]-a[1],steps=Math.max(Math.abs(dx),Math.abs(dy));
  if(dx!==0&&dy!==0)throw Error('A cobertura original deve estar numa grelha ortogonal.');
  for(let s=0;s<steps;s++)out.push([a[0]+dx*s/steps,a[1]+dy*s/steps]);
 }if(out.length<4)throw Error('Anel de grelha inválido.');out.push(out[0]);return out;}
 const rings=features.map(f=>(f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).map(poly=>poly.map(expand)));
 for(const polys of rings)for(const poly of polys)for(const ring of poly)for(let i=0;i<ring.length-1;i++){
  const a=node(ring[i]),b=node(ring[i+1]),key=edgeKey(a,b);
  if(!edges.has(key)){edges.set(key,{a,b,arc:null});nodes.get(a).edges.push(key);nodes.get(b).edges.push(key);}
 }
 const arcs=[];
 function walk(first,start){let at=start,key=first,keys=[at],path=[];
  while(true){const edge=edges.get(key);if(edge.arc!==null)break;edge.arc=arcs.length;path.push(key);const next=edge.a===at?edge.b:edge.a;keys.push(next);at=next;if(at===start||nodes.get(at).edges.length!==2)break;key=nodes.get(at).edges.find(k=>k!==key);}
  const closed=keys[0]===keys[keys.length-1],p=keys.map(k=>nodes.get(k).p);
  arcs.push({keys,points:chaikin(p,closed,iterations),closed,path});
 }
 // Junctions are fixed; every boundary is rounded exactly once, shared by its owners.
 for(const [key,n] of nodes)if(n.edges.length!==2)for(const e of n.edges)if(edges.get(e).arc===null)walk(e,key);
 for(const [key,e] of edges)if(e.arc===null)walk(key,e.a);
 function rebuild(ring){
  const keys=ring.slice(0,-1).map(pointKey),ids=keys.map((a,i)=>edges.get(edgeKey(a,keys[(i+1)%keys.length])).arc);
  if(ids.every(id=>id===ids[0])){const arc=arcs[ids[0]];let out=arc.points.slice();const at=arc.keys.indexOf(keys[0]),next=arc.keys[(at+1)%(arc.keys.length-1)];if(next!==keys[1])out=out.reverse();return out.map(fromGrid);}
  let start=ids.findIndex((id,i)=>id!==ids[(i+ids.length-1)%ids.length]);const out=[];let consumed=0;
  while(consumed<keys.length){const k=(start+consumed)%keys.length,id=ids[k],arc=arcs[id];let count=1;while(consumed+count<keys.length&&ids[(k+count)%keys.length]===id)count++;
   let p=arc.points;if(arc.keys[0]!==keys[k])p=p.slice().reverse();
   out.push(...p.slice(0,-1).map(fromGrid));consumed+=count;
  }out.push(out[0].slice());return out;
 }
 const output=features.map((f,i)=>{const coords=rings[i].map(p=>p.map(rebuild));return {...f,properties:{...f.properties,boundary_style:'shared_arc_chaikin_2',analytical_grid_preserved:true},geometry:{type:f.geometry.type,coordinates:f.geometry.type==='Polygon'?coords[0]:coords}};});
 return {features:output,arcCount:arcs.length};
}
const api={smoothCoverage,chaikin};root.CPSTopology=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);

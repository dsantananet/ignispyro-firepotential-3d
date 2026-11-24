/* Wind-guided cartographic corridor. Distances are not arrival times. */
(function(root){
'use strict';
function trace(origin, samples, bounds, grid=200){
 if(!samples.length||!origin.every(Number.isFinite)||grid<=0)throw Error('Invalid corridor inputs');
 const lat=origin[1]*Math.PI/180,scale=[111320*Math.cos(lat),111320];
 const xy=p=>[(p[0]-origin[0])*scale[0],(p[1]-origin[1])*scale[1]];
 const ll=p=>[origin[0]+p[0]/scale[0],origin[1]+p[1]/scale[1]];
 const vectors=samples.map(s=>({p:xy(s.coordinates),u:s.u,v:s.v})).filter(s=>[...s.p,s.u,s.v].every(Number.isFinite));
 const limit=Math.min(24000,Math.hypot((bounds[2]-bounds[0])*scale[0],(bounds[3]-bounds[1])*scale[1]));
 const step=Math.max(25,Math.min(grid/2,150));
 function direction(p){let nearest=null,d=Infinity;for(const v of vectors){const dd=Math.hypot(v.p[0]-p[0],v.p[1]-p[1]);if(dd<d){nearest=v;d=dd;}}if(!nearest||d>grid*2.5||Math.hypot(nearest.u,nearest.v)<.5)return null;const n=Math.hypot(nearest.u,nearest.v);return [nearest.u/n,nearest.v/n];}
 function follow(sign,length){let p=[0,0],travelled=0;const out=[],visited=new Set();
  for(let i=0;i<1000&&travelled<length;i++){
   const a=direction(p);if(!a)break;const mid=[p[0]+sign*a[0]*step/2,p[1]+sign*a[1]*step/2],b=direction(mid);if(!b)break;
   const next=[p[0]+sign*b[0]*step,p[1]+sign*b[1]*step],q=ll(next);if(q[0]<bounds[0]||q[0]>bounds[2]||q[1]<bounds[1]||q[1]>bounds[3])break;
   const key=next.map(v=>Math.round(v/(step*.75))).join(',');if(visited.has(key))break;visited.add(key);
   travelled+=step;p=next;out.push({coordinates:q,width_m:grid+travelled*.12,distance_m:sign*travelled});
  }return out;
 }
 const back=follow(-1,limit*.15).reverse(),front=follow(1,limit);
 const points=[...back,{coordinates:origin.slice(),width_m:grid,distance_m:0},...front];
 return {points,metadata:{basis:'local_wind_streamline_not_fire_perimeter',lateral_growth:.12,rear_length_fraction:.15,grid_m:grid,arrival_time_computed:false,operational:false}};
}
function fromPaths(features,grid=200){
 const edges=features.filter(f=>f.geometry?.type==='LineString'&&f.properties?.product==='major_path'&&f.geometry.coordinates.length>=2);
 if(!edges.length)return null;
 const key=p=>p.join(','),incoming=new Map(edges.map(f=>[key(f.geometry.coordinates.at(-1)),f]));
 const last=edges.reduce((a,b)=>(b.properties.minutes||0)>(a.properties.minutes||0)?b:a);
 let edge=last;const backwards=[],seen=new Set();
 while(edge&&backwards.length<2000){const k=key(edge.geometry.coordinates.at(-1));if(seen.has(k))break;seen.add(k);backwards.push(...edge.geometry.coordinates.slice(1).reverse());const start=edge.geometry.coordinates[0];edge=incoming.get(key(start));if(!edge)backwards.push(start);}
 const line=backwards.reverse();if(line.length<2)return null;
 let distance=0;const points=line.map((p,i)=>{if(i){const a=line[i-1],dy=(p[1]-a[1])*111320,dx=(p[0]-a[0])*111320*Math.cos(p[1]*Math.PI/180);distance+=Math.hypot(dx,dy);}return {coordinates:p,width_m:grid+distance*.12,distance_m:distance};});
 return {points,metadata:{basis:'modelled_major_predecessor_path_not_observed_perimeter',lateral_growth:.12,grid_m:grid,operational:false}};
}
const api={trace,fromPaths};root.CPSCorridor=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);

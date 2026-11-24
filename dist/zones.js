/* General zones: shared alignment components and existing edge adjacency only. */
(function(root){'use strict';
function key(p){return [p.minute??0,!!p.wind_ok,!!p.slope_ok,!!p.sun_ok,p.direction_reference||''].join('/');}
function aggregate(features,edges,turf){
 const ids=new Map(features.map((f,i)=>[f.properties.id,i])),parent=features.map((_,i)=>i);
 const find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));
 for(const e of edges){const a=ids.get(e.properties.from),b=ids.get(e.properties.to);if(a===undefined||b===undefined||key(features[a].properties)!==key(features[b].properties))continue;parent[find(b)]=find(a);}
 const groups=new Map();features.forEach((f,i)=>{const r=find(i);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(f);});
 const remap=new Map(),polygons=[];
 for(const members of groups.values()){
  const first=members[0].properties,id='Z'+(polygons.length+1);
  const merged=members.length===1?{...members[0]}:turf.union(turf.featureCollection(members));
  if(!merged)throw Error('Não foi possível agregar as zonas de alinhamento.');
  const p={id,cps:Number(first.wind_ok)+Number(first.slope_ok)+Number(first.sun_ok),wind_ok:!!first.wind_ok,slope_ok:!!first.slope_ok,sun_ok:!!first.sun_ok,minute:first.minute,area_ha:turf.area(merged)/10000,source_unit_ids:members.flatMap(f=>f.properties.source_unit_ids||[f.properties.id]),cloud_result:!!first.cloud_result,merge_rule:'same_alignment_components_edge_connected;speed_intensity_not_boundaries'};
  p.alignment_mask=Number(p.wind_ok)*4+Number(p.slope_ok)*2+Number(p.sun_ok);p.direction_reference=first.direction_reference;
  // Terrain/solar backgrounds retain area-weighted summary values. Physical
  // speed and intensity are deliberately excluded from polygon attributes.
  for(const name of ['slope','elevation','incidence']){const values=members.filter(f=>Number.isFinite(f.properties[name]));if(values.length){const weights=values.map(f=>turf.area(f));p[name]=values.reduce((a,f,i)=>a+f.properties[name]*weights[i],0)/weights.reduce((a,b)=>a+b,0);}}
  const aspects=members.filter(f=>Number.isFinite(f.properties.aspect));if(aspects.length){let x=0,y=0;for(const f of aspects){const w=turf.area(f),r=f.properties.aspect*Math.PI/180;x+=w*Math.sin(r);y+=w*Math.cos(r);}p.aspect=(Math.atan2(x,y)*180/Math.PI+360)%360;}
  merged.properties=p;polygons.push(merged);members.forEach(f=>remap.set(f.properties.id,id));
 }
 const contacts=new Map();for(const e of edges){const a=remap.get(e.properties.from),b=remap.get(e.properties.to);if(!a||!b||a===b)continue;const k=[a,b].sort().join('/');if(!contacts.has(k))contacts.set(k,{a,b,length:0});contacts.get(k).length+=e.properties.shared_boundary_m||0;}
 const nodes=polygons.map(f=>{const n=turf.pointOnFeature(f);n.properties={...f.properties,adjacent:[]};return n;}),byId=new Map(nodes.map(n=>[n.properties.id,n]));
 const links=[...contacts.values()].map(c=>{byId.get(c.a).properties.adjacent.push(c.b);byId.get(c.b).properties.adjacent.push(c.a);return turf.lineString([byId.get(c.a).geometry.coordinates,byId.get(c.b).geometry.coordinates],{from:c.a,to:c.b,shared_boundary_m:c.length,kind:'adjacency',directed:false});});
 for(const f of polygons)f.properties.adjacent=byId.get(f.properties.id).properties.adjacent;
 return {polygons,nodes,edges:links,original_count:features.length};
}
const api={aggregate,key};root.CPSZones=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);

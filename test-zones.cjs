const assert=require('node:assert/strict'),Z=require('./dist/zones.js');
// Geometry helpers are injected: these tests exercise grouping and remapped IDs.
const turf={featureCollection:features=>({features}),union:fc=>({geometry:{type:'MultiPolygon',coordinates:fc.features.map(f=>f.geometry.coordinates)}}),area:()=>10000,pointOnFeature:()=>({geometry:{type:'Point',coordinates:[0,0]}}),lineString:(coordinates,properties)=>({geometry:{type:'LineString',coordinates},properties})};
const polygon=(id,w,s,a)=>({geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,1],[0,0]]]},properties:{id,wind_ok:w,slope_ok:s,sun_ok:a,head_ros_bin:id,head_fireline_intensity_min_kw_m:100}});
const edge=(from,to)=>({properties:{from,to,shared_boundary_m:100}});
const input=[polygon('A',true,true,true),polygon('B',true,true,true),polygon('C',true,false,true),polygon('D',false,true,true),polygon('E',true,true,true)];
const before=JSON.stringify(input),out=Z.aggregate(input,[edge('A','B'),edge('B','C'),edge('C','D')],turf);
assert.equal(out.polygons.length,4);assert.equal(out.edges.length,2);
assert.equal(out.polygons[0].properties.source_unit_ids.length,2);
assert(!('head_ros_bin' in out.polygons[0].properties));assert(!('head_fireline_intensity_min_kw_m' in out.polygons[0].properties));
const ids=new Set(out.polygons.map(f=>f.properties.id));assert.equal(ids.size,4);assert(out.edges.every(f=>ids.has(f.properties.from)&&ids.has(f.properties.to)&&f.properties.from!==f.properties.to));
assert.equal(JSON.stringify(input),before);
assert.equal(Z.aggregate(input,[edge('A','B')],turf).polygons.length,4,'Disconnected equal components must not be bridged');
assert.notEqual(Z.key(input[2].properties),Z.key(input[3].properties),'Different 2/3 pairs remain distinct');
console.log('General zones: same factors merge across physical values; 2/3 pairs, disconnected regions, source IDs and links preserved.');

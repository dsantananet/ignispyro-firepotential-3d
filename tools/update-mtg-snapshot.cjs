// Official public WMS has no browser CORS header. Publish a dated image, never fake a live feed.
const fs=require('node:fs/promises'),path=require('node:path');
const endpoint='https://adaguc.lsasvcs.ipma.pt/adaguc-server',bounds=[-15,30,45,65];
const merc=(lon,lat)=>[lon*20037508.342789244/180,Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))*6378137];
(async()=>{
 const dir=path.join(__dirname,'../dist/data');await fs.mkdir(dir,{recursive:true});
 const r=await fetch(endpoint+'?DATASET=MTG-FRP&SERVICE=WMS&REQUEST=GetCapabilities',{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Capabilities HTTP '+r.status);
 const xml=await r.text(),match=xml.match(/<Dimension[^>]*name="time"[^>]*>([^<]+)<\/Dimension>/i),parts=match?.[1].trim().split('/');if(!parts||parts[2]!=='PT10M'||!Number.isFinite(Date.parse(parts[1])))throw Error('Unknown WMS time contract');
 const frame=new Date(parts[1]).toISOString(),a=merc(bounds[0],bounds[1]),b=merc(bounds[2],bounds[3]);
 const url=new URL(endpoint);for(const [k,v]of Object.entries({DATASET:'MTG-FRP',SERVICE:'WMS',VERSION:'1.1.1',REQUEST:'GetMap',LAYERS:'FRP',STYLES:'pointdata/point',FORMAT:'image/png',TRANSPARENT:'true',SRS:'EPSG:3857',WIDTH:1024,HEIGHT:1024,TIME:frame,BBOX:[...a,...b].join(',')}))url.searchParams.set(k,v);
 const image=await fetch(url,{signal:AbortSignal.timeout(40000)});if(!image.ok)throw Error('Map HTTP '+image.status);const bytes=Buffer.from(await image.arrayBuffer());if(bytes.length>8e6||bytes.length<8||bytes[0]!==137||bytes.toString('ascii',1,4)!=='PNG')throw Error('Response is not PNG');
 await fs.writeFile(path.join(dir,'mtg-frame.png'),bytes);
 const metadata={source:'EUMETSAT LSA SAF MTFRPPIXEL V1 Demonstration',license:'CC BY 4.0',frame,latest_available:frame,retrieved_at:new Date().toISOString(),coordinates:[[bounds[0],bounds[3]],[bounds[2],bounds[3]],[bounds[2],bounds[1]],[bounds[0],bounds[1]]],coverage:'fixed image over Europe; outside the satellite/product coverage has no data',snapshot:true,nominal_frequency_minutes:10,published_provider_timeliness_minutes:45,publication_schedule:'GitHub Actions every 10 minutes; not guaranteed',upstream:url.href};
 await fs.writeFile(path.join(dir,'mtg-frame.json'),JSON.stringify(metadata));console.log(JSON.stringify({frame,bytes:bytes.length}));
})().catch(e=>{console.log('MTG snapshot unavailable; preserving prior dated image: '+e.message);});

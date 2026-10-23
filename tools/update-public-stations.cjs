// Public data only. Never read station API credentials, account stores or environment secrets.
const fs=require('node:fs/promises'),path=require('node:path'),S=require('../dist/stations.js');
async function json(url){const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json();}
(async()=>{
 const dir=path.join(__dirname,'../dist/data');await fs.mkdir(dir,{recursive:true});let stations=[],failures=[];
 try{const [c,o]=await Promise.all([json('https://api.ipma.pt/open-data/observation/meteorology/stations/stations.json'),json('https://api.ipma.pt/open-data/observation/meteorology/stations/observations.json')]);stations.push(...S.ipma(c,o));}catch(e){failures.push('IPMA: '+e.message);}
 try{
  let a=[];
  try{const raw=await json('https://meteonacional.ignispyro.pt/api/nacional/stations');a=S.aldeia(raw);if(!a.some(s=>s.rows.length))throw Error('No valid Aldeia wind');}
  catch{const current=await json('https://meteo.ignispyro.pt/api/current');a=S.aldeia({stations:[{station_key:'aldeia:IALDEI10',name:'Aldeia do Bispo · IALDEI10',latitude:40.122506,longitude:-7.167114,observed_at:current.obs_time_utc,wind_speed_kmh:current.wind_speed_kmh,wind_direction_deg:current.winddir}]});}
  if(!a.some(s=>s.rows.length))throw Error('Estação Aldeia sem vento ou hora válidos');stations.push(...a);
 }catch(e){failures.push('Aldeia: '+e.message);}
 let old;try{old=JSON.parse(await fs.readFile(path.join(dir,'stations.json'),'utf8'));}catch{}
 // Retain unavailable sources with their original observation times; never relabel old data as fresh.
 for(const s of old?.stations||[])if(!stations.some(n=>n.id===s.id))stations.push(s);
 const result={schema_version:'firepotential-stations/1.0',retrieved_at:new Date().toISOString(),stations,failures,policy:'Public observations only; original timestamps retained. No private station credentials.'};
 await fs.writeFile(path.join(dir,'stations.json'),JSON.stringify(result));console.log(JSON.stringify({station_count:stations.length,aldeia_count:stations.filter(s=>s.id.startsWith('aldeia:')).length,failures}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});

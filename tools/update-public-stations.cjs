// Public data only. Never read station API credentials, account stores or environment secrets.
const fs=require('node:fs/promises'),path=require('node:path'),S=require('../dist/stations.js');
async function json(url){const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json();}
(async()=>{
 const dir=path.join(__dirname,'../dist/data');await fs.mkdir(dir,{recursive:true});let stations=[],failures=[];
 try{const [c,o]=await Promise.all([json('https://api.ipma.pt/open-data/observation/meteorology/stations/stations.json'),json('https://api.ipma.pt/open-data/observation/meteorology/stations/observations.json')]);stations.push(...S.ipma(c,o));}catch(e){failures.push('IPMA: '+e.message);}
 try{const raw=await json('https://meteonacional.ignispyro.pt/api/nacional/stations');const a=S.aldeia(raw);if(!a.length)throw Error('Estação Aldeia não fornecida');stations.push(...a);}catch(e){failures.push('Aldeia: '+e.message);}
 let old;try{old=JSON.parse(await fs.readFile(path.join(dir,'stations.json'),'utf8'));}catch{}
 // Retain unavailable sources with their original observation times; never relabel old data as fresh.
 for(const s of old?.stations||[])if(!stations.some(n=>n.id===s.id))stations.push(s);
 const result={schema_version:'firepotential-stations/1.0',retrieved_at:new Date().toISOString(),stations,failures,policy:'Public observations only; original timestamps retained. No private station credentials.'};
 await fs.writeFile(path.join(dir,'stations.json'),JSON.stringify(result));console.log(JSON.stringify({station_count:stations.length,aldeia_count:stations.filter(s=>s.id.startsWith('aldeia:')).length,failures}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});

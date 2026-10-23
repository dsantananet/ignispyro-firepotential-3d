/* Loopback-only bridge; authentication stays in gh's OS credential store. */
'use strict';
const {execFile}=require('node:child_process'),{promisify}=require('node:util');
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const exec=promisify(execFile),repo='dsantananet/ignispyro-firepotential-3d';
const wait=ms=>new Promise(r=>setTimeout(r,ms)),jobs=new Map();let active=null;
function validate(q){
 if(!Array.isArray(q.bbox)||q.bbox.length!==4||!q.bbox.every(Number.isFinite))throw Error('Bounding box necessária.');
 const [w,s,e,n]=q.bbox;
 if(!(w>-180&&e<180&&w<e&&s>-84.8&&n<84.8&&s<n)||(e-w)*111320*Math.cos((s+n)/2*Math.PI/180)>24000||(n-s)*111320>24000)throw Error('Zona inválida ou superior a 24 km.');
 if(typeof q.time!=='string'||!/(Z|[+-]\d\d:\d\d)$/.test(q.time)||!Number.isFinite(Date.parse(q.time)))throw Error('Hora UTC necessária.');
 if(!['grass','brush','trees'].includes(q.vegetation)||!Number.isInteger(q.hours)||q.hours<1||q.hours>6)throw Error('Rugosidade e 1–6 horas necessárias.');
 return {bbox:q.bbox,time:new Date(q.time).toISOString(),hours:q.hours,vegetation:q.vegetation};
}
async function gh(args){return (await exec('gh',args,{timeout:60000,maxBuffer:2e6,windowsHide:true})).stdout;}
async function compute(job,q){
 try{
  const id='fp-'+crypto.randomUUID();job.message='A enviar cálculo WindNinja ao GitHub…';
  await gh(['workflow','run','windninja.yml','--repo',repo,'-f','job_id='+id,'-f','request='+JSON.stringify(q)]);
  let run;
  for(let i=0;i<100;i++){
   const list=JSON.parse(await gh(['run','list','--repo',repo,'--workflow','windninja.yml','--limit','30','--json','databaseId,displayTitle,status,conclusion,url']));
   run=list.find(r=>r.displayTitle==='WindNinja '+id);
   if(run){job.run_url=run.url;job.message=run.status==='queued'?'Na fila de cálculo WindNinja…':'WindNinja: relevo real e vento horário em cálculo…';if(run.status==='completed')break;}
   await wait(15000);
  }
  if(!run||run.status!=='completed'||run.conclusion!=='success')throw Error('Cálculo não concluído. Consulte a execução GitHub.');
  const dir=path.join(__dirname,'../artifacts/wind-jobs',id);await fs.mkdir(dir,{recursive:true});
  await gh(['run','download',String(run.databaseId),'--repo',repo,'--name','local-wind','--dir',dir]);
  const manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
  if(manifest.fields.length!==q.hours||Date.parse(manifest.request.time)!==Date.parse(q.time))throw Error('Resultado não corresponde ao pedido.');
  job.field=JSON.parse(await fs.readFile(path.join(dir,'field-0.geojson'),'utf8'));job.manifest=manifest;job.status='completed';job.message='Vento local calculado.';
 }catch(e){job.status='failed';job.message=e.message;}finally{active=null;}
}
async function handle(req,res,url){
 if(!url.pathname.startsWith('/api/windninja'))return false;
 const json=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 if(!['127.0.0.1:4187','localhost:4187'].includes(req.headers.host)){json(403,{error:'invalid_host'});return true;}
 if(req.method==='GET'&&url.pathname==='/api/windninja/status'){json(200,{available:true,mode:'github_authenticated_local_bridge',active:!!active});return true;}
 if(req.method==='POST'&&url.pathname==='/api/windninja'){
  if(req.headers.origin!=='http://'+req.headers.host){json(403,{error:'invalid_origin'});return true;}
  try{
   let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)throw Error('Pedido demasiado grande.');}
   const q=validate(JSON.parse(body)),key=crypto.createHash('sha256').update(JSON.stringify(q)).digest('hex');
   let job=jobs.get(key);if(job?.status==='failed'){jobs.delete(key);job=null;}
   if(!job){if(active){json(409,{error:'Aguarde o cálculo em curso.'});return true;}
    if(jobs.size>=16)jobs.delete(jobs.keys().next().value);
    job={id:key,status:'running',message:'A preparar…'};jobs.set(key,job);active=key;void compute(job,q);
   }json(202,{id:key,status:job.status});
  }catch(e){json(400,{error:e.message});}return true;
 }
 const match=url.pathname.match(/^\/api\/windninja\/([a-f0-9]{64})(\/field)?$/);
 if(req.method==='GET'&&match){const j=jobs.get(match[1]);if(!j){json(404,{error:'not_found'});return true;}
  if(match[2])json(j.status==='completed'?200:409,j.status==='completed'?j.field:{error:j.message});
  else json(200,{id:j.id,status:j.status,message:j.message,run_url:j.run_url,manifest:j.manifest});return true;}
 json(404,{error:'not_found'});return true;
}
module.exports={handle,validate};

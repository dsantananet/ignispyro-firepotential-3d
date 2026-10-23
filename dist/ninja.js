(function(root){
'use strict';
const cache=new Map(),onNAS=location.pathname.startsWith('/firepotential/');
let currentResult=null;
async function json(url,options){const r=await fetch(url,options);let d;try{d=await r.json();}catch{throw Error('Motor web indisponível.');}if(!r.ok)throw Error(d.error==='invalid_request_or_github_connection_missing'?'A ligação GitHub do NAS ainda não está configurada.':d.error||'Motor indisponível.');return d;}
function requestFor({origin,radius,time,hours=1,travel_mode='wind',travel_bearing}){const b=turf.bbox(origin),lat=(b[1]+b[3])/2,dy=radius/111.32,dx=dy/Math.cos(lat*Math.PI/180);return {bbox:[b[0]-dx,b[1]-dy,b[2]+dx,b[3]+dy],time,hours,vegetation:'grass',origin:origin.geometry,travel_mode,...(travel_mode==='fixed'?{travel_bearing}: {})};}
async function session(){const s=await json('/api/me');if(!s.authenticated)throw Error('Entre no portal para calcular.');return s;}
async function calculate(scenario,status){
 const q=requestFor(scenario),key=JSON.stringify(q);if(cache.has(key)){currentResult=cache.get(key);return {...currentResult.field,cloud_job_id:currentResult.job_id};}
 if(!onNAS)throw Error('Abra esta zona no motor web do NAS. Os cálculos serão feitos no GitHub.');
 const s=await session(),created=await json('/api/firepotential/jobs',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':s.csrf},body:JSON.stringify(q),signal:AbortSignal.timeout(15000)});
 for(let i=0;i<180;i++){
  const job=await json('/api/firepotential/jobs/'+created.id,{signal:AbortSignal.timeout(15000)});status(job.message);
  if(job.status==='failed')throw Error(job.message);
  if(job.status==='completed'){
   const result=await json('/api/firepotential/jobs/'+created.id+'/result',{signal:AbortSignal.timeout(30000)});
   if(Date.parse(result.field.valid_time)!==Date.parse(q.time)||!result.field.features?.length)throw Error('Resultado fora da hora pedida.');
   currentResult=result;cache.set(key,result);if(cache.size>8)cache.delete(cache.keys().next().value);return {...result.field,cloud_job_id:result.job_id};
  }await new Promise(r=>setTimeout(r,10000));
 }throw Error('O trabalho continua no GitHub. Consulte os resultados guardados no portal.');
}
async function refreshJobs(){if(!onNAS)return;const data=await json('/api/firepotential/jobs');const select=document.getElementById('savedJob');select.replaceChildren();for(const job of data.jobs){const option=document.createElement('option');option.value=job.id;option.textContent=`${String(job.created_at).slice(0,16)} · ${job.status}`;option.disabled=job.status!=='completed';select.append(option);}document.getElementById('savedCloud').hidden=false;document.getElementById('openSaved').disabled=!data.jobs.some(j=>j.status==='completed');}
async function getSaved(id){if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Resultado inválido.');currentResult=await json('/api/firepotential/jobs/'+id+'/result');return currentResult;}
async function initialize(){
 const form=document.getElementById('cloudConnection'),info=document.getElementById('ninjaInfo');
 if(!onNAS)return;
 document.getElementById('openLocal').hidden=true;
 try{const health=await json('/api/firepotential/status');info.textContent=health.github_configured?'Motor web: cálculo no GitHub; resultados e ligações na base de dados do NAS.':'Ligação GitHub do NAS por configurar. O servidor está preparado; os cálculos não foram ativados.';
  await refreshJobs();const admin=await fetch('/api/admin/services');if(admin.ok)form.hidden=false;
 }catch{info.textContent='Entre no portal e verifique a disponibilidade do motor web.';}
 form.addEventListener('submit',async e=>{e.preventDefault();const input=document.getElementById('githubConnectionToken'),message=document.getElementById('connectionStatus');try{const s=await session();await json('/api/firepotential/connection',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':s.csrf},body:JSON.stringify({token:input.value}),signal:AbortSignal.timeout(30000)});message.textContent='Ligação verificada e guardada no NAS. Já pode gerar a análise.';info.textContent='GitHub ligado · cálculo remoto · resultados na base de dados.';}catch(error){message.textContent=error.message;}finally{input.value='';}});
}
root.CPSNinja={calculate,requestFor,initialize,refreshJobs,getSaved,getResult:()=>currentResult,onNAS};
})(globalThis);

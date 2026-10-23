(function(root){
'use strict';
const cache=new Map();
async function json(url,options){const r=await fetch(url,options);let d;try{d=await r.json();}catch{throw Error('Abra esta zona no motor local para calcular WindNinja. O GitHub Pages apresenta o mapa, mas não executa o motor.');}if(!r.ok)throw Error(d.error||'Motor indisponível.');return d;}
function requestFor({origin,radius,time,vegetation}){
 const bbox=turf.bbox(origin),lat=(bbox[1]+bbox[3])/2;
 const dy=radius/111.32,dx=dy/Math.cos(lat*Math.PI/180);
 return {bbox:[bbox[0]-dx,bbox[1]-dy,bbox[2]+dx,bbox[3]+dy],time,hours:1,vegetation};
}
async function calculate(scenario,status){
 const q=requestFor(scenario),key=JSON.stringify(q);if(cache.has(key))return cache.get(key);
 if(!['127.0.0.1','localhost'].includes(location.hostname))throw Error('WindNinja necessita do motor local autenticado. Use «Abrir esta zona no motor local».');
 const created=await json('api/windninja',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(q),signal:AbortSignal.timeout(10000)});
 for(let i=0;i<160;i++){
  const job=await json('api/windninja/'+created.id,{signal:AbortSignal.timeout(10000)});status(job.message+' Pode demorar alguns minutos.');
  if(job.status==='failed')throw Error(job.message+(job.run_url?' '+job.run_url:''));
  if(job.status==='completed'){
   const field=await json('api/windninja/'+created.id+'/field',{signal:AbortSignal.timeout(30000)});
   if(Date.parse(field.valid_time)!==Date.parse(q.time)||!field.features?.length)throw Error('Campo fora da validade pedida.');
   cache.set(key,field);if(cache.size>12)cache.delete(cache.keys().next().value);return field;
  }await new Promise(r=>setTimeout(r,10000));
 }throw Error('O cálculo excedeu o tempo de espera. Consulte a execução no GitHub.');
}
root.CPSNinja={calculate,requestFor};
})(globalThis);

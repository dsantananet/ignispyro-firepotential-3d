(function(root){'use strict';
const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
function ipma(catalog,observations){
 if(!Array.isArray(catalog)||catalog.length>1000||!observations||typeof observations!=='object')throw Error('Catálogo IPMA inválido.');
 const times=Object.keys(observations).filter(t=>/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?$/.test(t)).sort();
 return catalog.filter(f=>f.geometry?.type==='Point'&&finite(f.geometry.coordinates[0],-180,180)&&finite(f.geometry.coordinates[1],-90,90)).map(f=>{
  const id=f.properties.idEstacao,rows=[];for(const time of times){const r=observations[time]?.[id];if(!r||!finite(r.intensidadeVentoKM,0,500))continue;const code=r.idDireccVento;if(!Number.isInteger(code)||code<0||code>9||(code===0&&r.intensidadeVentoKM>0))continue;rows.push({time:new Date(time+'Z').toISOString(),speed:r.intensidadeVentoKM,from:code===0||code===9?0:(code-1)*45});}
  return {id:`ipma:${id}`,name:String(f.properties.localEstacao),coordinates:f.geometry.coordinates.slice(0,2),source:'IPMA',height_m:10,rows};
 });
}
function aldeia(raw){return (raw?.stations||[]).filter(s=>typeof s.station_key==='string'&&s.station_key.startsWith('aldeia:')&&finite(s.longitude,-180,180)&&finite(s.latitude,-90,90)).map(s=>{
 const time=typeof s.observed_at==='string'&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(s.observed_at)&&Number.isFinite(Date.parse(s.observed_at))?new Date(s.observed_at).toISOString():null;
 const rows=time&&finite(s.wind_speed_kmh,0,500)&&finite(s.wind_direction_deg,0,360)?[{time,speed:s.wind_speed_kmh,from:s.wind_direction_deg%360}]:[];
 return {id:s.station_key,name:s.name||'Aldeia do Bispo · IALDEI10',coordinates:[s.longitude,s.latitude],source:'IGNISPYRO Aldeia / IALDEI10',height_m:null,rows};
 });}
function atTime(station,date,now=Date.now()){
 if(!station)throw Error('Escolha uma estação de Portugal.');
 const t=date.getTime();let row=null,best=Infinity;
 for(const r of station.rows){const delta=t-Date.parse(r.time);if(delta>=0&&delta<=1800000&&delta<best){row=r;best=delta;}}
 if(!row)throw Error('Esta estação não tem observação para a hora escolhida (tolerância até 30 min, sem extrapolação). Use a hora da observação ou a previsão ECMWF.');
 if(Date.parse(row.time)>now+300000)throw Error('A observação apresenta uma hora futura.');
 return {...row,station:station.id,name:station.name,source:station.source,coordinates:station.coordinates,height_m:station.height_m,age_seconds:(now-Date.parse(row.time))/1000,stale:now-Date.parse(row.time)>7200000};
}
const api={ipma,aldeia,atTime};root.CPSStations=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);

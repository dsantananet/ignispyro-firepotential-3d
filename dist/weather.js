(function(root){'use strict';
function normalize(raw,{requested,source='Open-Meteo ECMWF IFS 0.25°',retrievedAt=new Date().toISOString()}={}){
 const h=raw?.hourly,u=raw?.hourly_units;
 if(raw.utc_offset_seconds!==0||u?.wind_speed_10m!=='km/h'||u?.wind_direction_10m!=='°'||!Array.isArray(h?.time)||h.time.length<2||h.time.length>400||h.wind_speed_10m?.length!==h.time.length||h.wind_direction_10m?.length!==h.time.length)throw Error('Contrato da previsão inválido (horas UTC, km/h e graus necessários).');
 const rows=h.time.map((time,i)=>{const t=Date.parse(time+'Z'),speed=h.wind_speed_10m[i],from=h.wind_direction_10m[i];if(!Number.isFinite(t)||!Number.isFinite(speed)||speed<0||speed>500||!Number.isFinite(from)||from<0||from>360)throw Error('Previsão com vento em falta ou inválido.');return {time:new Date(t).toISOString(),ms:t,speed,from};});
 for(let i=1;i<rows.length;i++)if(rows[i].ms-rows[i-1].ms!==3600000)throw Error('A previsão deve ter horas consecutivas sem duplicados.');
 return {source,model:'ecmwf_ifs025',height_m:10,height_reference:'above_ground_model',retrieved_at:retrievedAt,issued_at:null,model_run_at:null,requested,grid_point:[raw.longitude,raw.latitude],rows};
}
function atHour(forecast,date){const t=date.getTime(),rows=forecast.rows;if(!Number.isFinite(t)||t<rows[0].ms||t>rows[rows.length-1].ms)throw Error('Hora fora da previsão disponível. Escolha uma data/hora no intervalo indicado ou o modo manual.');
 let i=Math.floor((t-rows[0].ms)/3600000),a=rows[i],b=rows[Math.min(i+1,rows.length-1)],f=b.ms===a.ms?0:(t-a.ms)/(b.ms-a.ms);
 const vector=r=>{const angle=(r.from+180)*Math.PI/180;return {u:Math.sin(angle)*r.speed/3.6,v:Math.cos(angle)*r.speed/3.6};},av=vector(a),bv=vector(b),u=av.u+(bv.u-av.u)*f,v=av.v+(bv.v-av.v)*f;
 return {u,v,speed_kmh:Math.hypot(u,v)*3.6,from_deg:(Math.atan2(u,v)*180/Math.PI+540)%360,valid_time:date.toISOString(),bracket:[a.time,b.time],interpolation:f===0?'exact_hour':'linear_uv',fraction:f};
}
const api={normalize,atHour};root.CPSWeather=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);

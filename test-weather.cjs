const assert=require('node:assert/strict'),W=require('./dist/weather.js');
const raw={utc_offset_seconds:0,latitude:40,longitude:-7,hourly_units:{wind_speed_10m:'km/h',wind_direction_10m:'°'},hourly:{time:['2026-10-23T12:00','2026-10-23T13:00','2026-10-23T14:00'],wind_speed_10m:[20,20,30],wind_direction_10m:[350,10,90]}};
const f=W.normalize(raw,{requested:[-7,40]});assert.equal(f.height_m,10);assert.equal(f.model_run_at,null);
assert.equal(W.atHour(f,new Date('2026-10-23T12:00Z')).interpolation,'exact_hour');
const half=W.atHour(f,new Date('2026-10-23T12:30Z'));assert(Math.min(half.from_deg,360-half.from_deg)<1e-8,'Circular direction interpolation must cross north, not south');assert(half.speed_kmh>19&&half.speed_kmh<20);
assert.throws(()=>W.atHour(f,new Date('2026-10-23T11:59Z')));assert.throws(()=>W.atHour(f,new Date('2026-10-23T14:01Z')));
assert.throws(()=>W.normalize({...raw,utc_offset_seconds:3600}));assert.throws(()=>W.normalize({...raw,hourly:{...raw.hourly,wind_speed_10m:[null,20,30]}}));
assert.throws(()=>W.normalize({...raw,hourly:{...raw.hourly,time:['2026-10-23T12:00','2026-10-23T12:00','2026-10-23T14:00']}}));
console.log('Vento horário: circularidade, unidades, lacunas e limites temporais verificados.');

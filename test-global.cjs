const assert=require('node:assert/strict'),C=require('./dist/core.js'),{validate}=require('./engine/gateway.cjs');
for(const bbox of [[-8.15,41.72,-8.11,41.76],[-8.62,37.29,-8.58,37.33],[-44.63,-22.48,-44.59,-22.44],[15.60,78.20,15.66,78.24],[10,84.1,10.05,84.13]])assert.equal(validate({bbox,time:'2026-10-24T14:00:00Z',hours:1,vegetation:'grass'}).hours,1);
for(const bbox of [[179.9,0,-179.9,.05],[0,85,1,85.1]])assert.throws(()=>validate({bbox,time:'2026-10-24T14:00:00Z',hours:1,vegetation:'grass'}));
const south=C.solar(new Date('2026-12-21T12:00:00Z'),-35,0),north=C.solar(new Date('2026-06-21T12:00:00Z'),35,0);assert(C.delta(south.az,0)<5);assert(C.delta(north.az,180)<5);assert(south.alt>70&&north.alt>70);
assert.equal(C.classify({slope:30,uphill:180,aspect:0},south,180,C.uniform(0,20)).cps,3);
console.log('Global: Portugal, hemisferio sul, Artico, limites e exposicao solar por hemisferio verificados.');

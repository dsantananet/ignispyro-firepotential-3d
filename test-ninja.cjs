const assert=require('node:assert/strict'),{validate}=require('./engine/gateway.cjs'),C=require('./dist/core.js');
const valid={bbox:[-7.65,40.29,-7.58,40.35],time:'2026-10-24T14:00:00Z',hours:2,vegetation:'grass'};
assert.equal(validate(valid).hours,2);
for(const change of [{bbox:[0,0,180,80]},{hours:7},{vegetation:'invented'},{time:'2026-10-24T14:00:00'},{bbox:[NaN,40,-7,41]}])assert.throws(()=>validate({...valid,...change}));
assert(C.delta(C.circularMean([359,1]),0)<1e-9,'Directions straddling north must stay north');
assert.equal(C.circularMean([90,270]),null,'Opposed headings have no representative mean');
const terrain={slope:45,aspect:90,uphill:270},wind=C.uniform(90,36);
const morning=C.classify(terrain,{alt:20,az:90},270,wind),evening=C.classify(terrain,{alt:20,az:270},270,wind);
assert.equal(morning.wind_ok,evening.wind_ok);assert.equal(morning.slope_ok,evening.slope_ok);
assert.equal(morning.cps,3);assert.equal(evening.cps,2,'Loss of sunlight alone must move aligned wind+slope from3/3 to2/3');
assert.notEqual(morning.mask,evening.mask,'Different combinations require a boundary');
console.log('WindNinja bounds, circular bearings and loss of solar alignment verified.');

const day={alt:30,az:270},hill={slope:30,uphill:90,aspect:270};
const withUp=C.classify(hill,day,90,C.uniform(270,36));
const upAgainst=C.classify(hill,day,90,C.uniform(90,36));
const downWith=C.classify(hill,day,270,C.uniform(90,36));
assert.equal(withUp.cps,3);assert.equal(upAgainst.cps,2);assert.equal(downWith.cps,2);
assert.equal(upAgainst.slope_regime,'upslope');assert.equal(upAgainst.wind_regime,'against_wind');
assert.equal(downWith.slope_regime,'downslope');assert.equal(downWith.wind_regime,'with_wind');
assert.notEqual(upAgainst.mask,downWith.mask);

// The independent FirePotential must never forward simulator fuel inputs.
const vm=require('node:vm'),fs=require('node:fs');
const scope={location:{hostname:'example.test',pathname:'/'},turf:{bbox:()=>[-7.61,40.32,-7.61,40.32]}};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'dist/ninja.js'),'utf8'),scope);
const request=scope.CPSNinja.requestFor({origin:{geometry:{type:'Point',coordinates:[-7.61,40.32]}},radius:3,time:valid.time,hours:3,vegetation:'trees',fuel_model:5,moisture:{live:.9}});
assert.equal(request.vegetation,'grass');assert.equal(request.hours,3);assert(!('fuel_model' in request));assert(!('moisture' in request));

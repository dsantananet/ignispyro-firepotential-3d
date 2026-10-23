/* Pure, auditable exploratory rules. No operational prediction or spread solver. */
(function(root){
'use strict';
const rad=Math.PI/180,deg=180/Math.PI;
const wrap=x=>(x%360+360)%360;
const delta=(a,b)=>Math.abs(((a-b+540)%360)-180);
function circularMean(values){const x=values.reduce((s,v)=>s+Math.sin(v*rad),0),y=values.reduce((s,v)=>s+Math.cos(v*rad),0);return Math.hypot(x,y)<1e-8?null:wrap(Math.atan2(x,y)*deg);}
function solar(date,lat,lon){
 const d=(date.getTime()-Date.UTC(2000,0,1,12))/86400000;
 const L=wrap(280.46+.9856474*d),g=wrap(357.528+.9856003*d)*rad;
 const lambda=(L+1.915*Math.sin(g)+.020*Math.sin(2*g))*rad,e=(23.439-.0000004*d)*rad;
 const ra=Math.atan2(Math.cos(e)*Math.sin(lambda),Math.cos(lambda))*deg;
 const dec=Math.asin(Math.sin(e)*Math.sin(lambda));
 const h=wrap(280.46061837+360.98564736629*d+lon-ra)*rad;
 const phi=lat*rad,alt=Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(h));
 const az=wrap(Math.atan2(Math.sin(h),Math.cos(h)*Math.sin(phi)-Math.tan(dec)*Math.cos(phi))*deg+180);
 return {alt:alt*deg,az};
}
function terrain(east,west,north,south,spacing){
 const gx=(east-west)/(2*spacing),gy=(north-south)/(2*spacing);
 const slope=Math.atan(Math.hypot(gx,gy))*deg;
 return {slope,uphill:wrap(Math.atan2(gx,gy)*deg),aspect:wrap(Math.atan2(-gx,-gy)*deg)};
}
function classify(t,sun,travel,wind){
 const windSpeed=Math.hypot(wind.u,wind.v),toward=wrap(Math.atan2(wind.u,wind.v)*deg);
 const w=windSpeed>=.5&&delta(travel,toward)<=60;
 const s=t.slope>=5&&delta(travel,t.uphill)<=60;
 const incidence=sun.alt<=0?0:Math.max(0,Math.sin(sun.alt*rad)*Math.cos(t.slope*rad)+Math.cos(sun.alt*rad)*Math.sin(t.slope*rad)*Math.cos((sun.az-t.aspect)*rad));
 const a=incidence>=.35&&sun.alt>0;
 const wa=delta(travel,toward),sa=delta(travel,t.uphill);
 const wind_regime=windSpeed<.5?'calm':wa<=60?'with_wind':wa>=120?'against_wind':'crosswind';
 const slope_regime=t.slope<5?'flat':sa<=60?'upslope':sa>=120?'downslope':'cross_slope';
 const solar_regime=sun.alt<=0?'night':a?'favorable_incidence':'low_or_no_incidence';
 return {wind_regime,slope_regime,solar_regime,wind_angle_deg:wa,slope_angle_deg:sa,cps:Number(w)+Number(s)+Number(a),mask:Number(w)*4+Number(s)*2+Number(a),wind_ok:w,slope_ok:s,sun_ok:a,incidence,wind_speed:windSpeed*3.6,wind_from:wrap(toward+180)};
}
function uniform(from,speed){const a=wrap(from+180)*rad;return {u:Math.sin(a)*speed/3.6,v:Math.cos(a)*speed/3.6};}
function referenceBearing(mode,wind,radial,fixed){if(mode==='wind')return wrap(Math.atan2(wind.u,wind.v)/rad);if(mode==='fixed')return wrap(fixed);return wrap(radial);}
const api={referenceBearing,solar,terrain,classify,uniform,wrap,delta,circularMean};
root.CPS=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);

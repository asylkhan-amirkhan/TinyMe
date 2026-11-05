import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daylightAt, resolveDaylight, validLightingMode, lightingName } from '../domain/lighting';
test('automatic lighting has night, sunrise, day and sunset with continuous boundaries',()=>{
 for(const hour of [0,5,6,20,23,24])assert.equal(daylightAt(hour),0);
 for(const hour of [8,12,17,18])assert.equal(daylightAt(hour),1);
 assert.equal(daylightAt(7),.5);assert.equal(daylightAt(19),.5);
 assert.ok(daylightAt(6.01)<.001);assert.ok(daylightAt(7.99)>.999);
 assert.ok(daylightAt(18.01)>.999);assert.ok(daylightAt(19.99)<.001);
 for(let hour=0;hour<24;hour+=.1)assert.ok(daylightAt(hour)>=0&&daylightAt(hour)<=1);
});
test('manual day and night override local time; auto reads local clock',()=>{
 const night=new Date(2026,9,24,2,0,0),day=new Date(2026,9,24,12,0,0);
 assert.equal(resolveDaylight('day',night),1);assert.equal(resolveDaylight('night',day),0);
 assert.equal(resolveDaylight('auto',night),0);assert.equal(resolveDaylight('auto',day),1);
 assert.equal(resolveDaylight('auto',new Date(2026,9,24,7,0,0)),.5);
});
test('saved lighting mode and labels are bounded',()=>{
 for(const mode of ['auto','day','evening','night'])assert.equal(validLightingMode(mode),true);
 for(const mode of ['sunrise','',null,{},1])assert.equal(validLightingMode(mode),false);
 assert.equal(lightingName(0),'Ночь');assert.equal(lightingName(.5),'Сумерки');assert.equal(lightingName(1),'День');
});

test('evening stays warm at a fixed level regardless of device time',()=>{assert.equal(resolveDaylight('evening',new Date(2026,0,1,0)),.28);assert.equal(resolveDaylight('evening',new Date(2026,0,1,12)),.28);});

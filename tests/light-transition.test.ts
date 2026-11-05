import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultAccentLights} from '../domain/accent-lights';
import {createLightTransition,advanceLightTransition,easeValue} from '../domain/light-transition';
test('light fades are frame-rate independent and never overshoot',()=>{
  const target={...defaultAccentLights,garland:false,deskBrightness:30,deskColor:'#9de4c1',garlandInstalled:false};
  const run=(fps:number)=>{let state=createLightTransition(defaultAccentLights);for(let n=0;n<fps;n++)state=advanceLightTransition(state,target,1000/fps);return state;};
  const a=run(30),b=run(60);
  assert.ok(Math.abs(a.frame.deskBrightness-b.frame.deskBrightness)<.001);
  assert.equal(a.frame.deskColor,b.frame.deskColor);
  assert.ok(a.frame.garlandBrightness<1);
  assert.ok(a.frame.deskBrightness>=30 && a.frame.deskBrightness<31);
  assert.ok(a.frame.garlandOpacity<.01);
});
test('reversing a fade starts at the visible value; paused snapshots are exact',()=>{
  const target={...defaultAccentLights,garland:false,deskBrightness:0};
  const start=createLightTransition(defaultAccentLights);
  const middle=advanceLightTransition(start,target,100);
  const reversed=advanceLightTransition(middle,defaultAccentLights,16);
  assert.ok(reversed.frame.garlandBrightness>middle.frame.garlandBrightness && reversed.frame.garlandBrightness<100);
  assert.equal(start.frame.garlandBrightness,100);
  assert.equal(createLightTransition(target).frame.deskBrightness,0);
  assert.equal(easeValue(2,5,-10),2);
  assert.equal(easeValue(2,5,NaN),2);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {defaultAccentLights,garlandModes,parseAccentLights} from '../domain/accent-lights';
import {garlandTarget} from '../domain/garland-mode';
test('all modes persist and legacy or invalid settings remain steady',()=>{
 for(const garlandMode of garlandModes)assert.equal(parseAccentLights(JSON.stringify({garlandMode})).garlandMode,garlandMode);
 assert.equal(parseAccentLights('{}').garlandMode,'steady');
 assert.equal(parseAccentLights('{"garlandMode":"flash"}').garlandMode,'steady');
});
test('steady light is constant; modes isolate color and brightness from desk and saved settings',()=>{
 const original={...defaultAccentLights,garlandColor:'#123456',garlandBrightness:70};
 assert.equal(garlandTarget(original,20),original);
 const flow=garlandTarget({...original,garlandMode:'flow'},8);
 assert.notEqual(flow.garlandColor,original.garlandColor); assert.equal(flow.garlandBrightness,70);
 const shimmer=garlandTarget({...original,garlandMode:'twinkle'},8);
 assert.equal(shimmer.garlandColor,original.garlandColor); assert.ok(shimmer.garlandBrightness<70);
 assert.equal(flow.deskColor,original.deskColor);assert.equal(shimmer.deskBrightness,original.deskBrightness);
 assert.equal(original.garlandBrightness,70);
});
test('effects stay bounded, continuous across the clock wrap, and preserve off and zero',()=>{
 const s={...defaultAccentLights,garlandMode:'flow-twinkle' as const,garlandBrightness:60};
 for(let t=0;t<380;t+=.1){const frame=garlandTarget(s,t);assert.ok(frame.garlandBrightness>=39-1e-9 && frame.garlandBrightness<=60);assert.match(frame.garlandColor,/^#[0-9a-f]{6}$/);}
 const a=garlandTarget(s,0),b=garlandTarget(s,Math.PI*120);
 assert.equal(a.garlandColor,b.garlandColor);assert.ok(Math.abs(a.garlandBrightness-b.garlandBrightness)<1e-9);
 assert.equal(garlandTarget({...s,garlandBrightness:0},10).garlandBrightness,0);
 for(const patch of [{garland:false},{garlandInstalled:false}]){const off={...s,...patch};assert.equal(garlandTarget(off,10),off);}
});

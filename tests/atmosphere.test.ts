import {test} from 'node:test';
import assert from 'node:assert/strict';
import {atmospherePresets,matchingAtmosphere,type AtmosphereState} from '../domain/atmosphere';
import {applyAtmosphere,type AtmosphereControls} from '../lib/apply-atmosphere';
import {parseAccentLights} from '../domain/accent-lights';
import {validLightingMode} from '../domain/lighting';
import {precipitation} from '../domain/snow';
function fixture(){
 const state=structuredClone(atmospherePresets[0].settings),starts:string[]=[];
 let complete:(ok:boolean)=>void=()=>{};
 const pending=new Promise<boolean>(resolve=>{complete=resolve;});
 const sound=(key:'rain'|'wind'|'storm')=>(on:boolean)=>{starts.push(key);state[key].sound=on;return pending;};
 const controls:AtmosphereControls={lighting:{choose:v=>{state.lighting=v;}},season:{choose:v=>{state.season=v;}},accentLights:{update:v=>{state.lights={...v};}},rain:{configure:v=>{state.rain={...v,sound:state.rain.sound};},setSoundEnabled:sound('rain')},storm:{configure:v=>{state.storm={...v,sound:state.storm.sound};},setSoundEnabled:sound('storm')},wind:{changeVolume:v=>{state.wind.volume=v;},setSoundEnabled:sound('wind')}};
 return {state,starts,controls,complete};
}
test('all presets have persistable bounded settings and correct precipitation',()=>{
 for(const preset of atmospherePresets){
  const s=JSON.parse(JSON.stringify(preset.settings)) as AtmosphereState;
  assert.equal(validLightingMode(s.lighting),true);assert.deepEqual(parseAccentLights(JSON.stringify(s.lights)),s.lights);assert.equal(matchingAtmosphere(s),preset.id);
  for(const k of ['rain','wind','storm'] as const)assert.ok(s[k].volume>=0&&s[k].volume<=.35);
 }
 assert.equal(precipitation('autumn',atmospherePresets[1].settings.rain.enabled),'rain');
 assert.equal(precipitation('winter',atmospherePresets[2].settings.rain.enabled),'snow');
});
test('preset applies all settings before awaiting sounds, repeated selection never toggles channels',async()=>{
 const f=fixture();const applying=applyAtmosphere(atmospherePresets[1],f.controls);
 assert.deepEqual(f.starts,['rain','storm','wind']);assert.deepEqual(f.state,atmospherePresets[1].settings);
 f.complete(true);assert.equal(await applying,true);
 await applyAtmosphere(atmospherePresets[1],f.controls);assert.deepEqual(f.state,atmospherePresets[1].settings);
 await applyAtmosphere(atmospherePresets[2],f.controls);assert.equal(f.state.rain.sound,false);assert.equal(f.state.wind.sound,true);assert.equal(f.state.storm.sound,false);
 await applyAtmosphere(atmospherePresets[0],f.controls);assert.equal(f.state.wind.sound,false);assert.equal(f.state.rain.enabled,false);
});
test('partial audio failure is reported instead of claiming complete success',async()=>{
 const f=fixture();f.controls.rain.setSoundEnabled=async()=>false;
 const applying=applyAtmosphere(atmospherePresets[1],f.controls);f.complete(true);
 assert.equal(await applying,false);assert.equal(f.state.season,'autumn');assert.equal(f.state.rain.enabled,true);assert.equal(matchingAtmosphere(f.state),null);
});
test('manual settings release active preset; muted saved volumes do not',()=>{
 const s=structuredClone(atmospherePresets[2].settings);s.rain.volume=.8;assert.equal(matchingAtmosphere(s),'winter-cozy');
 s.rain.snowIntensity=25;assert.equal(matchingAtmosphere(s),null);
 const t=structuredClone(atmospherePresets[1].settings);t.rain.sound=false;assert.equal(matchingAtmosphere(t),null);
 const u=structuredClone(atmospherePresets[0].settings);u.lights.deskColor='#ffffff';assert.equal(matchingAtmosphere(u),null);
});

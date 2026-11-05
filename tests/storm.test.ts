import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lightningIntensity,lightningPath,nextStormDelay,stormStrike } from '../domain/storm';
import { ThunderSound } from '../lib/thunder-sound';

test('lightning is a single bounded pulse, with varied delayed thunder and long gaps',()=>{
 const close=stormStrike(1000,()=>0),far=stormStrike(1000,()=>1);
 assert.equal(close.delay,1.2);assert.equal(far.delay,4.5);assert.ok(close.strength>far.strength);
 assert.equal(lightningIntensity(close,999),0);assert.equal(lightningIntensity(close,1900),0);
 const samples=Array.from({length:19},(_,i)=>lightningIntensity(close,1000+i*50));
 assert.ok(samples.every(v=>v>=0&&v<=1));
 assert.ok(samples.slice(2).every((v,i,a)=>i===0||v<=a[i-1]));
 assert.equal(nextStormDelay(()=>0),24000);assert.equal(nextStormDelay(()=>1),42000);
 assert.deepEqual(lightningPath(5),lightningPath(5));assert.notDeepEqual(lightningPath(5),lightningPath(6));
});

test('thunder schedules after the flash, cancels pending sound and closes resources',async t=>{
 const starts:number[]=[],stops:number[]=[];let closes=0,decoded=0;
 const sources:{onended:((e:Event)=>void)|null}[]=[];
 const node=()=>({connect(){},disconnect(){}});
 class FakeContext {
  currentTime=10;state='running';destination={};
  async resume(){}
  async close(){closes++;}
  async decodeAudioData(){decoded++;return {};}
  createGain(){return {...node(),gain:{value:0,cancelScheduledValues(){},setTargetAtTime(){}}};}
  createBiquadFilter(){return {...node(),type:'',frequency:{value:0},Q:{value:0}};}
  createStereoPanner(){return {...node(),pan:{value:0}};}
  createBufferSource(){const source={...node(),buffer:null,playbackRate:{value:0},onended:null as ((e:Event)=>void)|null,start(time:number){starts.push(time);},stop(time=10){stops.push(time);}};sources.push(source);return source;}
 }
 const previous=Object.getOwnPropertyDescriptor(globalThis,'AudioContext');
 Object.defineProperty(globalThis,'AudioContext',{configurable:true,value:FakeContext});
 t.mock.method(globalThis,'fetch',async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}) as Response);
 const sound=new ThunderSound();
 t.after(()=>{sound.dispose();if(previous)Object.defineProperty(globalThis,'AudioContext',previous);else Reflect.deleteProperty(globalThis,'AudioContext');});
 await sound.start(.3);sound.play(stormStrike(1000,()=>0));assert.equal(starts[0],11.2);
 sound.stop();assert.equal(stops[0],10.12);sound.play(stormStrike(2000));assert.equal(starts.length,1);
 sources[0].onended?.(new Event('ended'));
 await sound.start(.4);assert.equal(decoded,1);
 sound.play(stormStrike(3000));sound.play(stormStrike(4000));sound.play(stormStrike(5000));assert.equal(starts.length,3);
 sound.dispose();assert.equal(closes,1);await assert.rejects(()=>sound.start(.2));
});

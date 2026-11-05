import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WinterWind} from '../lib/winter-wind';
test('wind fades, reuses sources on quick toggle, and releases audio resources',async t=>{
 let starts=0,stops=0,closes=0,suspends=0;const targets:number[]=[];
 const parameter=()=>({value:0,cancelScheduledValues(){},setTargetAtTime(v:number){targets.push(v);}});
 const node=()=>({connect(){},disconnect(){}});
 class Context {
  sampleRate=1000;currentTime=0;destination={};
  async resume(){} async suspend(){suspends++;} async close(){closes++;}
  createBuffer(_channels:number,length:number){return {getChannelData:()=>new Float32Array(length)};}
  createBufferSource(){return {...node(),buffer:null,loop:false,loopStart:0,start(){starts++;},stop(){stops++;}};}
  createOscillator(){return {...this.createBufferSource(),frequency:parameter()};}
  createGain(){return {...node(),gain:parameter()};}
  createBiquadFilter(){return {...node(),type:'',frequency:parameter(),Q:parameter()};}
 }
 const previous=Object.getOwnPropertyDescriptor(globalThis,'AudioContext');Object.defineProperty(globalThis,'AudioContext',{configurable:true,value:Context});
 const sound=new WinterWind();t.after(()=>{sound.dispose();if(previous)Object.defineProperty(globalThis,'AudioContext',previous);else Reflect.deleteProperty(globalThis,'AudioContext');});
 await sound.start(.35);assert.equal(starts,2);sound.setVolume(5);assert.equal(targets.at(-1),.32);
 sound.stop();assert.equal(targets.at(-1),0);await sound.start(.2);assert.equal(starts,2);
 await new Promise(r=>setTimeout(r,930));assert.equal(stops,0);assert.equal(suspends,0);
 sound.stop();await new Promise(r=>setTimeout(r,930));assert.equal(stops,2);assert.equal(suspends,1);
 await sound.start(.2);assert.equal(starts,4);sound.dispose();assert.equal(stops,4);assert.equal(closes,1);
 await sound.start(.2);assert.equal(starts,4);
});

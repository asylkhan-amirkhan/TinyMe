import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RainSound } from '../lib/rain-sound';

test('rain audio reuses one context, cancels delayed stop, and cleans up', async (t) => {
 let contexts=0, starts=0, stops=0, closes=0, suspends=0;
 const targets:{value:number;timeConstant:number}[]=[],requests:unknown[]=[];
 const parameter={value:0,cancelScheduledValues(){},setTargetAtTime(value:number,_time:number,timeConstant:number){targets.push({value,timeConstant});}};
 class FakeContext {
  sampleRate=8000;currentTime=0;destination={};
  constructor(){contexts++;}
  async resume(){}
  async suspend(){suspends++;}
  async close(){closes++;}
  async decodeAudioData(){return {};}
  createBuffer(){return {copyToChannel(){}};}
  createBufferSource(){return {buffer:null,loop:false,connect(){},disconnect(){},start(){starts++;},stop(){stops++;}};}
  createGain(){return {gain:parameter,connect(){},disconnect(){}};}
  createBiquadFilter(){return {type:'',frequency:{value:0},Q:{value:0},connect(){},disconnect(){}};}
 }
 const previous=Object.getOwnPropertyDescriptor(globalThis,'AudioContext');
 Object.defineProperty(globalThis,'AudioContext',{configurable:true,value:FakeContext});
 t.mock.method(globalThis,'fetch',async(url:unknown)=>{requests.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)} as Response;});
 const sound=new RainSound();
 t.after(()=>{sound.dispose();if(previous)Object.defineProperty(globalThis,'AudioContext',previous);else Reflect.deleteProperty(globalThis,'AudioContext');});
 await sound.start(.35);
 assert.deepEqual(targets.at(-1),{value:.35*.7,timeConstant:.25});
 sound.stop();assert.deepEqual(targets.at(-1),{value:0,timeConstant:.16});
 await sound.start(.2);
 await new Promise(resolve=>setTimeout(resolve,1050));
 assert.equal(contexts,1);assert.equal(starts,1);assert.equal(stops,0);assert.equal(suspends,0);
 sound.stop();await new Promise(resolve=>setTimeout(resolve,190));
 assert.equal(stops,0,'the recording must fade rather than cut off immediately');
 await new Promise(resolve=>setTimeout(resolve,900));
 assert.equal(stops,1);assert.equal(suspends,1);
 await sound.start(.3);assert.equal(contexts,1);assert.equal(starts,2);
 assert.deepEqual(requests,['/audio/rain-terrace.ogg'],'reuse the decoded recording on subsequent starts');
 sound.setVolume(5);assert.equal(targets.at(-1)?.value,.7);
 sound.setVolume(0);assert.equal(targets.at(-1)?.value,0);
 sound.dispose();assert.equal(stops,2);assert.equal(closes,1);
 await assert.rejects(()=>sound.start(.3));
});

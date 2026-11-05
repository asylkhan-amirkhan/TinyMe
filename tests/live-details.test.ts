import {test} from 'node:test';
import assert from 'node:assert/strict';
import {frequencyBands,roomClock,smoothBands,spectrumPeaks,SPECTRUM_BANDS,steamWisp} from '../domain/live-details';
import {MusicSpectrum} from '../lib/music-spectrum';

test('room clock follows local device time, including midnight and seconds',()=>{
  const reading=roomClock(new Date(2026,9,26,23,59,30).getTime());
  assert.equal(reading.label,'23:59');assert.equal(reading.second,Math.PI);
  assert.ok(reading.minute>Math.PI*1.98);assert.ok(reading.hour>Math.PI*1.99);
  assert.equal(roomClock(new Date(2026,9,27,0,0,0).getTime()).label,'00:00');
});

test('equalizer distinguishes low and high frequencies, and silence stays silent',()=>{
  const bins=new Uint8Array(512),bands=new Float32Array(SPECTRUM_BANDS);
  bins[2]=255;frequencyBands(bins,48000,bands);
  assert.ok(bands.slice(0,8).some(value=>value>0));assert.equal(bands.at(-1),0);
  bins.fill(0);bins[150]=255;frequencyBands(bins,48000,bands);
  assert.equal(bands[0],0);assert.ok(bands.some(value=>value>0));
  bins.fill(0);frequencyBands(bins,48000,bands);assert.ok(bands.every(value=>value===0));
});

test('spectrum peaks hold transients, release smoothly and settle to silence',()=>{
 const peaks=new Float32Array(1),holds=new Float32Array(1);
 spectrumPeaks(peaks,holds,new Float32Array([1]),16);
 for(let i=0;i<4;i++)spectrumPeaks(peaks,holds,new Float32Array(1),100);
 assert.equal(peaks[0],1);
 spectrumPeaks(peaks,holds,new Float32Array(1),100);
 assert.ok(peaks[0]<1 && peaks[0]>.9);
 for(let i=0;i<20;i++)spectrumPeaks(peaks,holds,new Float32Array(1),100);
 assert.equal(peaks[0],0);
});

test('spectrum attack and decay are frame independent and bounded across resume gaps',()=>{
  const target=new Float32Array([1]);
  const whole=smoothBands(new Float32Array(1),target,100);
  const split=new Float32Array(1);smoothBands(split,target,50);smoothBands(split,target,50);
  assert.ok(Math.abs(whole[0]-split[0])<1e-6);
  const loud=split[0];smoothBands(split,new Float32Array(1),50);assert.ok(split[0]<loud && split[0]>0);
  assert.equal(smoothBands(new Float32Array(1),target,-1)[0],0);
  assert.ok(smoothBands(new Float32Array(1),target,60000)[0]<1);
});

test('steam has no opacity jump when the room animation clock wraps',()=>{
  for(let i=0;i<4;i++) {
    const start=steamWisp(0,i),end=steamWisp(Math.PI*120-1e-7,i);
    assert.ok(Math.abs(start.alpha-end.alpha)<1e-6);
    if(start.alpha>.01)assert.ok(Math.abs(start.drift-end.drift)<1e-6);
    assert.ok(start.alpha>=0&&start.alpha<=.32);
  }
});

test('music analysis uses a silent copy, reuses its context and never reroutes playback',t=>{
  let contexts=0,captures=0,stopped=0,closed=0;
  const gains:number[]=[],audioRoutes:string[]=[];
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'AudioContext');
  class FakeContext {
    state='suspended';sampleRate=48000;destination={};
    constructor(){contexts++;}
    resume(){this.state='running';return Promise.resolve();}
    suspend(){this.state='suspended';return Promise.resolve();}
    close(){closed++;this.state='closed';return Promise.resolve();}
    createMediaStreamSource(){audioRoutes.push('capture');return {connect(){},disconnect(){}};}
    createMediaElementSource(){throw Error('Do not reroute music');}
    createAnalyser(){return {fftSize:0,smoothingTimeConstant:0,minDecibels:0,maxDecibels:0,getByteFrequencyData(bytes:Uint8Array){bytes.fill(180);},connect(){},disconnect(){}};}
    createGain(){return {gain:{set value(value:number){gains.push(value);}},connect(){},disconnect(){}};}
  }
  Object.defineProperty(globalThis,'AudioContext',{configurable:true,value:FakeContext});
  const meter=new MusicSpectrum();
  t.after(()=>{meter.dispose();if(descriptor)Object.defineProperty(globalThis,'AudioContext',descriptor);else Reflect.deleteProperty(globalThis,'AudioContext');});
  const media={paused:false,ended:false,muted:false,volume:.4,readyState:4,captureStream(){captures++;return {getAudioTracks:()=>[{}],getTracks:()=>[{stop(){stopped++;}}]};}};
  meter.attach(media as unknown as HTMLAudioElement);
  meter.attach(media as unknown as HTMLAudioElement);
  assert.equal(contexts,1);assert.equal(captures,1);assert.deepEqual(audioRoutes,['capture']);assert.deepEqual(gains,[0]);
  const buffer=meter.sample(100);assert.ok(buffer.every(value=>value>0));
  const loud=buffer[0];media.muted=true;meter.sample(100);assert.ok(buffer[0]<loud);
  media.muted=false;media.paused=true;meter.pause();const before=buffer[0];assert.equal(meter.sample(100),buffer);assert.ok(buffer[0]<before);
  media.paused=false;meter.attach(media as unknown as HTMLAudioElement);assert.equal(contexts,1);assert.equal(captures,1);
  meter.detach();assert.equal(stopped,1);meter.dispose();assert.equal(closed,1);
});

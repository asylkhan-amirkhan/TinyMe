import { rainVolume } from '@/domain/rain';
/** A real stereo field recording; its seamless loop runs on the audio thread. */
export class RainSound {
 private context: AudioContext | null=null;
 private buffer: AudioBuffer | null=null;
 private source: AudioBufferSourceNode | null=null;
 private gain: GainNode | null=null;
 private lowpass: BiquadFilterNode | null=null;
 private highpass: BiquadFilterNode | null=null;
 private fadeInUntil=0;
 private timer: ReturnType<typeof setTimeout> | null=null;
 private generation=0;
 private disposed=false;
 private abort=new AbortController();
 async start(volume:number){
  if(this.disposed)throw Error('Звук дождя недоступен');
  const generation=++this.generation;
  if(this.timer){clearTimeout(this.timer);this.timer=null;}
  if(!this.context){this.context=new AudioContext();}
  const context=this.context;
  // Resume while still inside the explicit user interaction.
  await context.resume();
  if(this.disposed||generation!==this.generation)return;
  if(!this.buffer){
   const response=await fetch('/audio/rain-terrace.ogg',{signal:this.abort.signal});
   if(!response.ok)throw Error('Rain unavailable');
   this.buffer=await context.decodeAudioData(await response.arrayBuffer());
  }
  if(this.disposed||generation!==this.generation)return;
  if(!this.source){
   const source=context.createBufferSource(),gain=context.createGain(),filter=context.createBiquadFilter(),rumble=context.createBiquadFilter();
   source.buffer=this.buffer;source.loop=true;
   // Retain the detail of real droplets and both recorded channels, while
   // removing low microphone rumble and the most piercing high frequencies.
   rumble.type='highpass';rumble.frequency.value=65;rumble.Q.value=.5;
   filter.type='lowpass';filter.frequency.value=9500;filter.Q.value=.5;gain.gain.value=0;
   source.connect(rumble);rumble.connect(filter);filter.connect(gain);gain.connect(context.destination);
   this.source=source;this.gain=gain;this.lowpass=filter;this.highpass=rumble;
   this.fadeInUntil=context.currentTime+1.2;source.start();
  }
  this.setVolume(volume);
 }
 setVolume(volume:number){
  if(!this.context||!this.gain)return;
  const time=this.context.currentTime,parameter=this.gain.gain;
  parameter.cancelScheduledValues(time);
  parameter.setTargetAtTime(rainVolume(volume)*.7,time,time<this.fadeInUntil ? .25 : .1);
 }
 stop(){
  ++this.generation;
  if(this.timer)clearTimeout(this.timer);
  if(!this.context)return;
  this.gain?.gain.cancelScheduledValues(this.context.currentTime);
  this.gain?.gain.setTargetAtTime(0,this.context.currentTime,.16);
  this.timer=setTimeout(()=>{this.disconnect();void this.context?.suspend().catch(()=>{});this.timer=null;},1000);
 }
 private disconnect(){this.source?.stop();this.source?.disconnect();this.lowpass?.disconnect();this.highpass?.disconnect();this.gain?.disconnect();this.source=null;this.lowpass=null;this.highpass=null;this.gain=null;}
 dispose(){this.disposed=true;this.abort.abort();++this.generation;if(this.timer)clearTimeout(this.timer);this.disconnect();void this.context?.close().catch(()=>{});this.context=null;this.buffer=null;}
}

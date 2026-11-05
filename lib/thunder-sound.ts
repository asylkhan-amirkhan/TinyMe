import { rainVolume } from '@/domain/rain';
import type { Lightning } from '@/domain/storm';

/** Recorded thunder. Web Audio schedules the sound after the visible strike. */
export class ThunderSound {
 private context: AudioContext | null=null;
 private buffer: AudioBuffer | null=null;
 private master: GainNode | null=null;
 private sources=new Set<AudioBufferSourceNode>();
 private abort=new AbortController();
 private disposed=false;
 private enabled=false;
 async start(volume:number) {
  if(this.disposed)throw Error('Thunder disposed');
  this.context??=new AudioContext();
  const context=this.context;
  await context.resume();
  if(!this.buffer){
   const response=await fetch('/audio/thunder.ogg',{signal:this.abort.signal});
   if(!response.ok)throw Error('Thunder unavailable');
   this.buffer=await context.decodeAudioData(await response.arrayBuffer());
  }
  if(this.disposed)return;
  if(!this.master){this.master=context.createGain();this.master.gain.value=0;this.master.connect(context.destination);}
  this.enabled=true;this.setVolume(volume);
 }
 setVolume(volume:number){if(this.context&&this.master)this.master.gain.setTargetAtTime(rainVolume(volume)*.8,this.context.currentTime,.08);}
 play(strike:Lightning){
  const context=this.context;
  if(!this.enabled||!context||context.state!=='running'||!this.buffer||!this.master)return;
  // Bounded polyphony even if a manual preview is requested during a long roll.
  if(this.sources.size>=2)return;
  const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain(),pan=context.createStereoPanner();
  source.buffer=this.buffer;source.playbackRate.value=.94+(strike.seed%11)/100;
  filter.type='lowpass';filter.frequency.value=1600+strike.strength*2600;filter.Q.value=.5;
  gain.gain.value=.65+strike.strength*.35;pan.pan.value=((strike.seed%100)/100-.5)*.6;
  source.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(this.master);
  this.sources.add(source);
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();pan.disconnect();this.sources.delete(source);};
  source.start(context.currentTime+strike.delay);
 }
 stop(){
  this.enabled=false;
  if(this.context&&this.master){this.master.gain.cancelScheduledValues(this.context.currentTime);this.master.gain.setTargetAtTime(0,this.context.currentTime,.025);}
  for(const source of this.sources)source.stop((this.context?.currentTime??0)+.12);
 }
 dispose(){
  this.disposed=true;this.enabled=false;this.abort.abort();
  for(const source of this.sources){source.stop();source.onended?.(new Event('ended'));}
  this.sources.clear();this.master?.disconnect();this.master=null;
  void this.context?.close().catch(()=>{});this.context=null;this.buffer=null;
 }
}

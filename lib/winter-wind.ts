import { rainVolume } from '@/domain/rain';
/** Soft filtered wind, generated locally. No network or animation-frame audio work. */
export class WinterWind {
 private context:AudioContext|null=null;
 private gain:GainNode|null=null;
 private nodes:AudioNode[]=[];
 private sources:(AudioBufferSourceNode|OscillatorNode)[]=[];
 private timer:ReturnType<typeof setTimeout>|null=null;
 private disposed=false;
 async start(volume:number){
  if(this.disposed)return;
  if(this.timer){clearTimeout(this.timer);this.timer=null;}
  const c=this.context??=new AudioContext();
  await c.resume();
  if(this.disposed)return;
  if(!this.gain){
   const buffer=c.createBuffer(1,c.sampleRate*12,c.sampleRate),data=buffer.getChannelData(0);
   let brown=0;
   for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.025)/1.025;data[i]=brown*4;}
   // Blend the loop seam, so recurring gusts have no click.
   const fade=Math.floor(c.sampleRate*.2);
   for(let i=0;i<fade;i++){const t=i/fade;data[data.length-fade+i]=data[data.length-fade+i]*(1-t)+data[i]*t;}
   const source=c.createBufferSource(),high=c.createBiquadFilter(),low=c.createBiquadFilter(),gust=c.createGain(),gain=c.createGain(),lfo=c.createOscillator(),depth=c.createGain();
   source.buffer=buffer;source.loop=true;source.loopStart=.2;
   high.type='highpass';high.frequency.value=90;low.type='lowpass';low.frequency.value=950;low.Q.value=.4;
   gust.gain.value=.72;lfo.frequency.value=.075;depth.gain.value=.22;gain.gain.value=0;
   source.connect(high);high.connect(low);low.connect(gust);gust.connect(gain);gain.connect(c.destination);
   lfo.connect(depth);depth.connect(gust.gain);source.start();lfo.start();
   this.gain=gain;this.nodes=[source,high,low,gust,gain,lfo,depth];this.sources=[source,lfo];
  }
  this.setVolume(volume);
 }
 setVolume(volume:number){if(this.context&&this.gain){this.gain.gain.cancelScheduledValues(this.context.currentTime);this.gain.gain.setTargetAtTime(rainVolume(volume)*.32,this.context.currentTime,.3);}}
 stop(){if(!this.context)return;if(this.timer)clearTimeout(this.timer);this.gain?.gain.cancelScheduledValues(this.context.currentTime);this.gain?.gain.setTargetAtTime(0,this.context.currentTime,.14);this.timer=setTimeout(()=>{this.disconnect();void this.context?.suspend().catch(()=>{});this.timer=null;},900);}
 private disconnect(){for(const source of this.sources)source.stop();for(const node of this.nodes)node.disconnect();this.sources=[];this.nodes=[];this.gain=null;}
 dispose(){this.disposed=true;if(this.timer)clearTimeout(this.timer);this.disconnect();void this.context?.close().catch(()=>{});this.context=null;}
}

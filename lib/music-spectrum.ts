import {frequencyBands, smoothBands, SPECTRUM_BANDS} from '@/domain/live-details';

type CapturableAudio = HTMLAudioElement & {captureStream?:()=>MediaStream};

/** Analyse a silent copy. The music itself keeps its native audio route, including in the background. */
export class MusicSpectrum {
  private context: AudioContext | null=null;
  private analyser: AnalyserNode | null=null;
  private source: MediaStreamAudioSourceNode | null=null;
  private mute: GainNode | null=null;
  private stream: MediaStream | null=null;
  private audio: HTMLAudioElement | null=null;
  private bytes=new Uint8Array(2048);
  private targets=new Float32Array(SPECTRUM_BANDS);
  private levels=new Float32Array(SPECTRUM_BANDS);
  private disposed=false;

  unlock() {
    if(this.disposed || typeof AudioContext==='undefined')return;
    try {
      this.context ??= new AudioContext();
      if(this.context.state==='suspended')void this.context.resume().catch(()=>{});
    } catch { /* Analysis is optional; playback never depends on it. */ }
  }
  attach(audio: HTMLAudioElement) {
    if(this.disposed)return;
    if(this.audio===audio && this.source){this.unlock();return;}
    this.detach();
    const capture=(audio as CapturableAudio).captureStream;
    if(!capture)return;
    try {
      this.unlock();
      if(!this.context)return;
      this.stream=capture.call(audio);
      if(!this.stream.getAudioTracks().length){this.detach();return;}
      this.source=this.context.createMediaStreamSource(this.stream);
      this.analyser=this.context.createAnalyser();
      this.analyser.fftSize=4096;
      this.analyser.smoothingTimeConstant=.15;
      this.analyser.minDecibels=-85;
      this.analyser.maxDecibels=-18;
      this.mute=this.context.createGain();
      this.mute.gain.value=0;
      this.source.connect(this.analyser);
      this.analyser.connect(this.mute);
      this.mute.connect(this.context.destination);
      this.audio=audio;
    } catch { this.detach(); }
  }
  sample(deltaMs: number) {
    const audio=this.audio;
    if(this.analyser && this.context?.state==='running' && audio && !audio.paused && !audio.ended && !audio.muted && audio.volume>0 && audio.readyState>=3) {
      this.analyser.getByteFrequencyData(this.bytes);
      frequencyBands(this.bytes,this.context.sampleRate,this.targets);
      for(let i=0;i<this.targets.length;i++)this.targets[i]*=Math.sqrt(audio.volume);
    } else this.targets.fill(0);
    return smoothBands(this.levels,this.targets,deltaMs);
  }
  pause() {
    this.targets.fill(0);
    if(this.context?.state==='running')void this.context.suspend().catch(()=>{});
  }
  detach() {
    this.source?.disconnect();this.analyser?.disconnect();this.mute?.disconnect();
    this.stream?.getTracks().forEach(track=>track.stop());
    this.source=null;this.analyser=null;this.mute=null;this.stream=null;this.audio=null;
    this.targets.fill(0);
  }
  dispose() {this.disposed=true;this.detach();void this.context?.close().catch(()=>{});this.context=null;}
}

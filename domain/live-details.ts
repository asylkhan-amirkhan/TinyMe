export const SPECTRUM_BANDS = 24;

/** Hold transients briefly, then release in seconds rather than frames. */
export function spectrumPeaks(peaks:Float32Array, holds:Float32Array, levels:Float32Array, deltaMs:number) {
  const dt=Math.max(0,Math.min(deltaMs,100));
  for(let i=0;i<peaks.length;i++) {
    const level=levels[i]??0;
    if(level>=peaks[i]) {peaks[i]=level;holds[i]=450;}
    else {
      const release=Math.max(0,dt-holds[i]);
      holds[i]=Math.max(0,holds[i]-dt);
      peaks[i]=Math.max(level,peaks[i]-release/1200);
    }
  }
  return peaks;
}

/** Logarithmic bands preserve bass detail instead of grouping all low notes together. */
export function frequencyBands(bytes: Uint8Array, sampleRate: number, output: Float32Array) {
  const binHz = sampleRate / (bytes.length * 2);
  for(let band=0;band<output.length;band++) {
    const low=55*Math.pow(12000/55,band/output.length);
    const high=55*Math.pow(12000/55,(band+1)/output.length);
    const start=Math.max(1,Math.min(bytes.length-1,Math.floor(low/binHz)));
    const end=Math.min(bytes.length,Math.max(start+1,Math.ceil(high/binHz)));
    let power=0;
    // Analyser bytes encode dB (-85…-18), so average power, not byte magnitudes.
    for(let i=start;i<end;i++)if(bytes[i]>0)power+=10**((-85+bytes[i]/255*67)/10);
    const db=power>0?10*Math.log10(power/Math.max(1,end-start)):-85;
    output[band]=Math.max(0,Math.min(1,(db+85)/67));
  }
  return output;
}

export function smoothBands(current: Float32Array, target: Float32Array, deltaMs: number) {
  const dt=Math.max(0,Math.min(deltaMs,100));
  for(let i=0;i<current.length;i++) {
    const value=target[i] ?? 0;
    const blend=1-Math.exp(-dt/(value>current[i]?75:260));
    current[i]+=(value-current[i])*blend;
  }
  return current;
}

export function roomClock(timestamp: number) {
  const date=new Date(timestamp);
  const seconds=date.getSeconds(), minutes=date.getMinutes(), hours=date.getHours();
  return {label:`${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`,
    second:seconds/60*Math.PI*2, minute:(minutes+seconds/60)/60*Math.PI*2,
    hour:(hours%12+minutes/60)/12*Math.PI*2};
}

export function steamWisp(time: number, index: number) {
  const phase=((time/(Math.PI*2)+index/4)%1+1)%1;
  return {rise:phase*32, drift:Math.sin(time*.65+index*1.7)*(2+phase*3), alpha:Math.sin(phase*Math.PI)**2*.32};
}

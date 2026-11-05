export type RoomMotion = { time: number; recordAngle: number; spectrum?:Float32Array; spectrumPeaks?:Float32Array; wallTime?:number };
export function advanceMotion(current: RoomMotion, deltaMs: number, musicPlaying: boolean): RoomMotion {
 const seconds = Math.max(0, Math.min(deltaMs, 100)) / 1000;
 return { time: (current.time + seconds) % (Math.PI * 120), recordAngle: musicPlaying ? (current.recordAngle + seconds * 1.4) % (Math.PI * 2) : current.recordAngle };
}
export function canAnimate(enabled: boolean, hidden: boolean, inView: boolean, editing: boolean) { return enabled && !hidden && inView && !editing; }

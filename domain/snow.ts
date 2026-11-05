export function snowIntensity(value:unknown):number {return typeof value==='number'&&Number.isFinite(value)?Math.round(Math.max(0,Math.min(100,value))):50;}
export function snowCount(intensity:number):number {return Math.round(snowIntensity(intensity)*.8);}
export function precipitation(season:string,enabled:boolean):'none'|'snow'|'rain' {return !enabled?'none':season==='winter'?'snow':'rain';}

/** A settled base remains when snowfall stops; no offscreen catch-up jumps. */
export function accumulateSnow(depth:number,deltaMs:number,intensity:number,falling:boolean):number {
 const base=Number.isFinite(depth)?Math.max(.2,Math.min(1,depth)):.2;
 return falling?Math.min(1,base+Math.max(0,Math.min(100,Number.isFinite(deltaMs)?deltaMs:0))/180000*snowIntensity(intensity)/100):base;
}

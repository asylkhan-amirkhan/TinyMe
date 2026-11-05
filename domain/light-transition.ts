import type { AccentLights } from './accent-lights';
export type LightFrame = AccentLights & { garlandOpacity: number };
type RGB = [number, number, number];
export type LightTransition = { frame: LightFrame; garlandRgb: RGB; deskRgb: RGB };
const rgb = (hex:string):RGB => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)) as RGB;
const hex = (color:RGB) => '#'+color.map(n=>Math.round(n).toString(16).padStart(2,'0')).join('');
export function easeValue(from:number,to:number,delta:number,tau=180) {
  const next=from+(to-from)*(1-Math.exp(-Math.max(0,Number.isFinite(delta)?delta:0)/tau));
  return Math.abs(next-to)<.001?to:next;
}
export function createLightTransition(target:AccentLights):LightTransition {
  return { frame:{...target,garland:true,desk:true,garlandOpacity:target.garlandInstalled?1:0,
    garlandBrightness:target.garland?target.garlandBrightness:0,deskBrightness:target.desk?target.deskBrightness:0},
    garlandRgb:rgb(target.garlandColor),deskRgb:rgb(target.deskColor) };
}
export function advanceLightTransition(current:LightTransition,target:AccentLights,delta:number):LightTransition {
  const blend=(from:RGB,to:string):RGB=>rgb(to).map((n,i)=>easeValue(from[i],n,delta)) as RGB;
  const garlandRgb=blend(current.garlandRgb,target.garlandColor),deskRgb=blend(current.deskRgb,target.deskColor);
  const garlandOpacity=easeValue(current.frame.garlandOpacity,target.garlandInstalled?1:0,delta,140);
  return {garlandRgb,deskRgb,frame:{...target,garland:true,desk:true,garlandOpacity,garlandInstalled:garlandOpacity>0,
    garlandColor:hex(garlandRgb),deskColor:hex(deskRgb),
    garlandBrightness:easeValue(current.frame.garlandBrightness,target.garland?target.garlandBrightness:0,delta),
    deskBrightness:easeValue(current.frame.deskBrightness,target.desk?target.deskBrightness:0,delta)}};
}

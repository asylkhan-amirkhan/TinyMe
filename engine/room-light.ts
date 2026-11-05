import { dimensions, productOf, decorHeight, type Item, type Kind, type WorldItem } from '../domain/model';
export type Vec3 = [number, number, number];
export const LIGHT_UNIT = 24;
export const SUN_TRAVEL: [number, number] = [-.035, .055];
export const furnitureHeight: Record<Kind, number> = { desk:65, chair:73, bed:53, sofa:66, plant:80, lamp:103, rug:2, shelf:110, art:175, record:39, armchair:70, 'coffee-table':31, dresser:63, ottoman:28, vase:72, books:12, collectible:29 };
export type LightSource = { id:string; position:Vec3; color:Vec3; power:number; kind:'lamp'|'screen' };
export type Blocker = { id:string; min:Vec3; max:Vec3 };
export type RoomLight = { daylight:number; overcast:boolean; sources:LightSource[]; blockers:Blocker[] };
export function roomLight(items:Item[], daylight:number, overcast:boolean):RoomLight {
  const sources:LightSource[]=[],blockers:Blocker[]=[];
  for(const item of items) {
    if(item.x===null||item.y===null)continue;
    const p=productOf(item),d=dimensions(p,item.rotation);
    const x=(item.x+d.w/2)*LIGHT_UNIT,y=(item.y+d.h/2)*LIGHT_UNIT;
    const elevation=(item as WorldItem).elevation??0, height=Number.isFinite(decorHeight(p))?decorHeight(p):furnitureHeight[p.kind];
    if(p.kind==='lamp'&&item.on) sources.push({id:item.id,position:[x,y,elevation+(p.id==='lamp-table'?32:86)],color:[1,.7,.38],power:p.id==='lamp-table'?6500:15000,kind:'lamp'});
    if(p.kind==='desk') sources.push({id:item.id,position:[x,y,90],color:[.26,.78,1],power:1500,kind:'screen'});
    if(p.surface==='floor') blockers.push({id:item.id,min:[item.x*LIGHT_UNIT,item.y*LIGHT_UNIT,elevation],max:[(item.x+d.w)*LIGHT_UNIT,(item.y+d.h)*LIGHT_UNIT,elevation+height]});
  }
  return {daylight:Math.max(0,Math.min(1,daylight)),overcast,sources,blockers};
}

// Segment / box occlusion in scene units. Coarse furniture volumes keep the 2.5D renderer fast.
export function occluded(from:Vec3,to:Vec3,blockers:Blocker[],exclude:string,sourceId='') {
  return blockers.some(box=>{
    if(box.id===exclude||box.id===sourceId)return false;
    let near=.005,far=.995;
    for(let axis=0;axis<3;axis++) {
      const delta=to[axis]-from[axis];
      if(Math.abs(delta)<1e-7) {if(from[axis]<box.min[axis]||from[axis]>box.max[axis])return false;continue;}
      let a=(box.min[axis]-from[axis])/delta,b=(box.max[axis]-from[axis])/delta;
      if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);
      if(near>far)return false;
    }
    return true;
  });
}
export function windowExposure(position:Vec3) {
  const y=position[1]/LIGHT_UNIT;
  const x=position[0]/LIGHT_UNIT-y*SUN_TRAVEL[0]/SUN_TRAVEL[1];
  const z=position[2]+y/SUN_TRAVEL[1];
  // Soft edges to the window aperture; frame bars remain in the projected floor patch.
  return Math.max(0,Math.min(1,(x-13.5)*2,(22.5-x)*2,(z-40)/14,(218-z)/14));
}
export function lightAt(position:Vec3,normal:Vec3,light:RoomLight,id:string):Vec3 {
  const hemisphere=.78+.22*Math.max(0,normal[2])+.06*normal[0]-.08*normal[1];
  const sunsetBounce=.1*Math.max(0,1-Math.abs(light.daylight-.28)/.28);
  const ambient=(.19+sunsetBounce+light.daylight*(light.overcast?.43:.35))*hemisphere;
  const brightness:Vec3=[ambient*.92,ambient*.97,ambient*1.13];
  const sun:Vec3=[-SUN_TRAVEL[0]*LIGHT_UNIT,-SUN_TRAVEL[1]*LIGHT_UNIT,1];
  const length=Math.hypot(...sun);
  const lambert=Math.max(0,normal.reduce((sum,n,i)=>sum+n*sun[i]/length,0));
  const distance=position[1]/(-sun[1]||1);
  const target:Vec3=[position[0]+sun[0]*distance,0,position[2]+distance];
  const sunAmount=light.daylight*(light.overcast?.08:.9)*lambert*windowExposure(position)*(light.daylight>0 && lambert>0 && occluded(position,target,light.blockers,id)?.12:1);
  brightness[0]+=sunAmount;brightness[1]+=sunAmount*.86;brightness[2]+=sunAmount*.65;
  for(const source of light.sources) {
    const delta=source.position.map((v,i)=>v-position[i]) as Vec3;
    const distance=Math.max(1,Math.hypot(...delta));
    const cosine=Math.max(0,normal.reduce((sum,n,i)=>sum+n*delta[i]/distance,0));
    const attenuation=Math.min(1.25,source.power/(distance*distance+3000));
    const blocked=occluded(position,source.position,light.blockers,id,source.id);
    const strength=attenuation*(.08+cosine*.92)*(blocked?.13:1);
    for(let i=0;i<3;i++)brightness[i]+=source.color[i]*strength;
  }
  return brightness;
}
const linearColors=new Map<string,Vec3>();
export function litRgb(color:string,position:Vec3,normal:Vec3,light:RoomLight,id:string):Vec3 {
  let base=linearColors.get(color);
  if(!base){
    const values=color.startsWith('#')?color.slice(1).match(/../g)!.slice(0,3).map(v=>parseInt(v,16)):color.match(/[\d.]+/g)!.slice(0,3).map(Number);
    base=values.map(v=>{const s=v/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;}) as Vec3;
    // User-selected material colors must not grow the cache indefinitely during preview.
    if(linearColors.size>512)linearColors.clear();linearColors.set(color,base);
  }
  const lightValue=lightAt(position,normal,light,id);
  return base.map((v,i)=>{const l=Math.min(1,v*lightValue[i]);return Math.round(255*(l<=.0031308?l*12.92:1.055*l**(1/2.4)-.055));}) as Vec3;
}

export function litColor(color:string,position:Vec3,normal:Vec3,light:RoomLight,id:string) { return 'rgb('+litRgb(color,position,normal,light,id).join(',')+')'; }

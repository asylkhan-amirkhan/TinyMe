import type { Resident } from '../domain/resident';
import { residentPose } from '../domain/resident-motion';
import { defaultResidentLook, type ResidentLook } from '../domain/resident-look';
import { litRgb, LIGHT_UNIT, type RoomLight, type Vec3 } from './room-light';
import { paintResidentMesh, type RasterFace } from './resident-raster';

type Point = [number, number];
type Vertex = [number, number, number];
const mix = (hex: string, delta: number) => '#' + hex.slice(1).match(/../g)!.map(c =>
  Math.max(0, Math.min(255, parseInt(c, 16) + delta)).toString(16).padStart(2, '0')).join('');

/** Shared, deterministic artwork: both the room and wardrobe use the same character. */
export function residentArtwork(resident: Resident, light: RoomLight,
  project: (x: number, y: number, z?: number) => Point, look: ResidentLook = defaultResidentLook, compact = false) {
  if (!resident.visible) return [];
  const r = resident, pose = residentPose(r), walking = pose.walking;
  const stride = Math.sin(pose.stride) * walking, breath = Math.sin(r.time * 1.8) * .36;
  const angle = pose.facing + pose.listen * Math.sin(r.time * 3) * .07;
  const forward = [Math.cos(angle), Math.sin(angle)], side = [-forward[1], forward[0]];
  const hip = 52 + (pose.seatHeight + 7 - 52) * pose.seated;
  const bob = (1-Math.cos(pose.stride*2))*.45*walking + breath*(1-walking);
  const frontVisible = forward[0] + forward[1] > .05;
  let propWeight = 1;
  const transform = ([x,y,z]: Vertex): Vertex => {
    // Props rise with the hands as the activity blends in, and retract when interrupted.
    x*=propWeight; y*=propWeight; z=hip+5+(z-hip-5)*propWeight;
    const upper=Math.max(0,Math.min(1,(z-hip)/32));
    const sway=(stride*.025+Math.sin(r.time*.85)*.012*(1-walking))*upper;
    const lean=(pose.work*.1+walking*.035)*upper;
    const headWeight=Math.max(0,Math.min(1,(z-hip-36)/12));
    x+=Math.sin(r.time*.65)*.025*pose.work*headWeight;
    y+=Math.sin(r.time*.48)*.018*pose.work*headWeight;
    return [r.x+side[0]*(x+sway)+forward[0]*(y+lean),r.y+side[1]*(x+sway)+forward[1]*(y+lean),z];
  };
  const shapes: RasterFace[] = [];
  let detail = 0;
  const rgb=(color:string,position:Vec3,normal:Vec3)=>litRgb(color,position,normal,light,r.target?.seatId??'resident');
  const face = (vertices: Vertex[], color: string, origin: Vertex, normals?:Vec3[], shades?:Map<Vertex,number[]>, worldCache?:Map<Vertex,Vertex>) => {
    const world = vertices.map(v=>worldCache?.get(v)??transform(v)), o = transform(origin);
    const center = world.reduce((sum,p) => sum.map((v,i) => v + p[i]/world.length) as Vertex, [0,0,0]);
    const a = world[1].map((v,i) => (v-world[0][i])*(i<2?LIGHT_UNIT:1));
    const b = world[2].map((v,i) => (v-world[0][i])*(i<2?LIGHT_UNIT:1));
    let normal: Vec3 = [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    const outward = center.map((v,i) => (v-o[i])*(i<2?LIGHT_UNIT:1));
    // The local (side, forward, up) basis reflects world handedness (det = -1).
    if (normals||normal.reduce((s,v,i) => s+v*outward[i],0)<0) normal=normal.map(v=>-v) as Vec3;
    const length=Math.hypot(...normal)||1; normal=normal.map(v=>v/length) as Vec3;
    // The isometric camera looks along (1,1,1) in physical scene units.
    if (normal[0]+normal[1]+normal[2] <= .001) return;
    const shaded=normals?undefined:rgb(color,[center[0]*LIGHT_UNIT,center[1]*LIGHT_UNIT,center[2]],normal);
    const vertexColors=normals?world.map((p,i)=>{
      const vertex=vertices[i],cached=shades?.get(vertex);if(cached)return cached;
      const value=rgb(color,[p[0]*LIGHT_UNIT,p[1]*LIGHT_UNIT,p[2]],normals[i]);shades?.set(vertex,value);return value;
    }):undefined;
    shapes.push({ points:world.map(p=>{const [x,y]=project(...p);return [x,y,p[0]+p[1]+p[2]/LIGHT_UNIT+detail*.0001];}),
      rgb:shaded??vertexColors![0],vertexColors });
  };
  const mesh = (rings: Vertex[][], color: string, smooth=false) => {
    const all=rings.flat(), origin=all.reduce((sum,p)=>sum.map((v,i)=>v+p[i]/all.length) as Vertex,[0,0,0]);
    const polygons:Vertex[][]=[];
    for(let z=0;z<rings.length-1;z++) for(let n=0;n<rings[z].length;n++) {
      const next=(n+1)%rings[z].length;
      polygons.push([rings[z][n],rings[z][next],rings[z+1][next],rings[z+1][n]]);
    }
    polygons.push(rings[rings.length-1]);
    // Averaging neighbouring surface normals also works for curved locks and
    // bent sleeves; radial normals would incorrectly light their concave sides.
    const normals=new Map<Vertex,Vec3>();
    const worldCache=new Map<Vertex,Vertex>(all.map(v=>[v,transform(v)]));
    if(smooth) {
      for(const polygon of polygons) {
        const p=polygon.slice(0,3).map(v=>worldCache.get(v)!),a=p[1].map((v,i)=>(v-p[0][i])*(i<2?LIGHT_UNIT:1)),b=p[2].map((v,i)=>(v-p[0][i])*(i<2?LIGHT_UNIT:1));
        const normal:Vec3=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],length=Math.hypot(...normal)||1;
        for(const vertex of polygon){const sum=normals.get(vertex)??[0,0,0];for(let i=0;i<3;i++)sum[i]-=normal[i]/length;normals.set(vertex,sum as Vec3);}
      }
      for(const [vertex,normal] of normals){const length=Math.hypot(...normal)||1;normals.set(vertex,normal.map(v=>v/length) as Vec3);}
    }
    const shades=new Map<Vertex,number[]>();
    for(const polygon of polygons)face(polygon,color,origin,smooth?polygon.map(p=>normals.get(p)!):undefined,shades,worldCache);
  };
  const ring = (x:number,y:number,z:number,w:number,d:number,bevel=.2):Vertex[] => {
    const b=Math.min(w,d)*bevel;
    return [[x+b,y,z],[x+w-b,y,z],[x+w,y+b,z],[x+w,y+d-b,z],[x+w-b,y+d,z],[x+b,y+d,z],[x,y+d-b,z],[x,y+b,z]];
  };
  const roundRing=(x:number,y:number,z:number,w:number,d:number):Vertex[]=>Array.from({length:compact?8:16},(_,n)=>{
    const a=n*Math.PI*2/(compact?8:16),c=Math.cos(a),s=Math.sin(a);
    return [x+w/2+Math.sign(c)*Math.abs(c)**.65*w/2,y+d/2+Math.sign(s)*Math.abs(s)**.65*d/2,z];
  });
  const oval=(x:number,y:number,z:number,rx:number,ry:number,rz:number,color:string)=>{
    mesh(Array.from({length:compact?5:7},(_,j)=>{
      const a=-Math.PI/2+j*Math.PI/(compact?4:6),scale=Math.max(.025,Math.cos(a));
      return Array.from({length:compact?8:12},(_,i)=>{const t=i*Math.PI*2/(compact?8:12);return [x+Math.cos(t)*rx*scale,y+Math.sin(t)*ry*scale,z+Math.sin(a)*rz] as Vertex;});
    }),color,true);
  };
  const box=(x:number,y:number,z:number,w:number,d:number,h:number,color:string,bevel=.15)=>
    mesh([ring(x,y,z,w,d,bevel),ring(x,y,z+h,w,d,bevel)],color);
  const gem=(x:number,y:number,z:number,w:number,d:number,h:number,color:string)=>
    mesh([ring(x+w*.15,y+d*.15,z,w*.7,d*.7,.28),ring(x,y,z+h*.35,w,d,.28),
      ring(x+w*.04,y+d*.04,z+h*.75,w*.92,d*.92,.28),ring(x+w*.22,y+d*.22,z+h,w*.56,d*.56,.28)],color);
  const limb=(a:Vertex,b:Vertex,radius:number,color:string,endScale=.82)=>{
    const delta=[(b[0]-a[0])*24,(b[1]-a[1])*24,b[2]-a[2]],len=Math.hypot(...delta)||1;
    const n=delta.map(v=>v/len), seed=Math.abs(n[2])<.9?[0,0,1]:[0,1,0];
    let u=[n[1]*seed[2]-n[2]*seed[1],n[2]*seed[0]-n[0]*seed[2],n[0]*seed[1]-n[1]*seed[0]];
    const l=Math.hypot(...u)||1;u=u.map(v=>v/l);
    const v=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]];
    mesh([a,b].map((p,k)=>Array.from({length:compact?8:12},(_,i)=>{
      const theta=i*Math.PI*2/(compact?8:12), rad=radius*(k?endScale:1);
      return p.map((value,j)=>value+(u[j]*Math.cos(theta)+v[j]*Math.sin(theta))*rad*(j<2?1:24)) as Vertex;
    })),color,true);
  };
  const cloth=look.topColor, trousers=look.pantsColor, skin=look.skin, hair=look.hairColor;
  // Tapered legs, cuffs, layered sneaker soles and laces.
  for(const sign of [-1,1]) {
    const x=sign*.26,step=stride*sign,lift=Math.max(0,step)*5*(1-pose.seated);
    const knee:Vertex=[x,step*.18*(1-pose.seated)+.6*pose.seated, (27+bob)*(1-pose.seated)+(hip-9)*pose.seated];
    const ankle:Vertex=[x,step*.42*(1-pose.seated)+.67*pose.seated,8+lift];
    limb([x,0,hip+3+bob],knee,.19,trousers);
    limb(knee,ankle,.16,mix(trousers,-8));
    box(x-.17,ankle[1]-.17,7+lift,.34,.34,4,mix(trousers,9));
    mesh([roundRing(x-.2,ankle[1]-.23,lift,.4,.68),roundRing(x-.2,ankle[1]-.23,2+lift,.4,.68)],'#c9c6bd');
    mesh([roundRing(x-.195,ankle[1]-.22,2+lift,.39,.66),roundRing(x-.18,ankle[1]-.2,6+lift,.36,.59),
      roundRing(x-.15,ankle[1]-.19,8.6+lift,.3,.39)],look.shoeColor);
    box(x-.115,ankle[1]-.13,8.5+lift,.23,.24,1,mix(look.shoeColor,-14));
    for(let n=0;n<3;n++)box(x-.105,ankle[1]-.07+n*.065,9.5+lift,.21,.02,.35,'#f4eadb');
    box(x-.08,ankle[1]-.24,5+lift,.16,.025,3,mix(look.shoeColor,-19));
    // A quiet outer seam makes the trouser leg readable without striping it.
    limb([x+sign*.14,ankle[1]-.03,14+lift],[x+sign*.17,knee[1],knee[2]-2],.009,mix(trousers,8));
  }
  const torso=hip+bob;
  mesh([roundRing(-.42,-.29,torso,.84,.63),roundRing(-.48,-.32,torso+6,.96,.68),
    roundRing(-.52,-.34,torso+23,1.04,.72),roundRing(-.48,-.29,torso+29,.96,.6),
    roundRing(-.26,-.22,torso+33,.52,.45)],cloth,true);
  mesh([roundRing(-.43,-.3,torso,.86,.65),roundRing(-.44,-.3,torso+3,.88,.65)],mix(cloth,-10));
  box(-.16,-.15,torso+31,.32,.3,8,skin);
  if(look.outfit==='hoodie') {
    oval(0,-.32,torso+29,.39,.3,7,mix(cloth,-10));
    if(frontVisible) {
      detail=.65;box(-.32,.34,torso+7,.64,.08,9,mix(cloth,-9));
      for(const sign of [-1,1]) {limb([sign*.13,.35,torso+30],[sign*.17,.4,torso+20],.025,'#eee5d6');
        box(sign*.17-.025,.4,torso+19,.05,.05,2,'#baa895');}
      box(-.23,.425,torso+8,.46,.015,.8,mix(cloth,14));detail=0;
    }
  } else if(look.outfit==='knit') {
    box(-.24,-.22,torso+29,.48,.44,6,mix(cloth,-14));
    if(frontVisible) {detail=.65;
      for(let x=-.3;x<=.3;x+=.1)box(x,.385,torso+6,.016,.014,19,mix(cloth,6));
      for(let x=-.3;x<=.3;x+=.075)box(x,.355,torso+1,.016,.014,3,mix(cloth,9));
      detail=0;
    }
  } else if(look.outfit==='jacket' && frontVisible) {
    detail=.65;box(-.13,.36,torso+4,.26,.04,27,'#e5d7c2');
    for(const sign of [-1,1]) {
      box(sign*.3-.13,.39,torso+18,.26,.06,8,mix(cloth,-14));
      box(sign*.3-.14,.46,torso+24,.28,.025,1.3,mix(cloth,18));
      box(sign*.18-.07,.36,torso+28,.14,.1,6,mix(cloth,13));
    }
    for(let z=8;z<29;z+=6) box(.12,.44,torso+z,.045,.04,1.3,'#c8b79e');detail=0;
  } else if(look.outfit==='tee') {
    box(-.23,-.2,torso+30,.46,.4,3,mix(cloth,-20));
    if(frontVisible) {detail=.65;box(.23,.39,torso+18,.19,.04,6,mix(cloth,-10));detail=0;}
  }
  // Jointed arms follow the hands, so skin and sleeves remain connected in every pose.
  for(const sign of [-1,1]) {
    const active=pose.work+pose.read+pose.water;
    const reach=pose.work*(r.target?.workReach??1.2)+(pose.read+pose.water)*.82-stride*sign*.32*(1-active);
    const restingHandZ=hip+5+(17+Math.sin(r.time*2+sign))*active+bob*(1-active);
    const handZ=restingHandZ*(1-pose.work)+(70+Math.sin(r.time*7+sign)*.35)*pose.work;
    const shoulder:Vertex=[sign*.53,0,torso+27-pose.work*2],elbow:Vertex=[sign*(.65-.13*pose.work),reach*.42,(handZ-2*pose.work+4*(1-pose.work))*active+(torso+15)*(1-active)];
    const hand:Vertex=[sign*(.62-.27*pose.work),reach,handZ];
    oval(sign*.49,0,torso+25,.19,.2,5.5,cloth);
    limb(shoulder,elbow,.18,mix(cloth,-6));
    limb(elbow,hand,.135,look.outfit==='tee'?skin:cloth);
    if(look.outfit!=='tee')limb([hand[0],hand[1],handZ+2],hand,.13,mix(cloth,-12),.96);
    oval(hand[0],hand[1]+.02,handZ-2.5,.115,.14,3.5,skin);
    oval(hand[0]-sign*.105,hand[1]+.12,handZ-2,.055,.07,1.7,mix(skin,-3));
  }
  const head=torso+38;
  mesh([roundRing(-.24,-.22,head,.48,.48),roundRing(-.38,-.32,head+4,.76,.69),
    roundRing(-.45,-.37,head+10,.9,.8),roundRing(-.45,-.38,head+19,.9,.81),
    roundRing(-.36,-.31,head+26,.72,.68),roundRing(-.16,-.17,head+28,.32,.34)],skin,true);
  for(const sign of [-1,1]) {
    oval(sign*.455,-.02,head+11,.085,.13,4.2,mix(skin,-3));
    oval(sign*.51,.045,head+11,.025,.07,2.1,mix(skin,-20));
  }
  // Keep the nose in the silhouette even when the eyes face away from the viewer.
  oval(0,.435,head+9.1,.059,.09,2.7,mix(skin,4));
  oval(0,.49,head+7.6,.063,.044,1,mix(skin,2));
  if(frontVisible) {
    detail=1.3;
    const blink=r.time>0&&r.time%5.7<.14;
    for(const sign of [-1,1]) {
      const x=sign*.195;
      limb([x-.09,.415,head+16.3],[x+.085,.425,head+16.8],.023,mix(hair,-6),.65);
      if(blink)limb([x-.075,.445,head+12],[x+.075,.445,head+12],.018,'#57423b');
      else {
        oval(x,.426,head+12,.082,.025,1.55,'#e5d9cc');
        oval(x,.452,head+12,.041,.018,1.47,'#50483d');
        oval(x,.47,head+12.2,.022,.009,1.13,'#262a2c');
        oval(x-.014,.483,head+12.85,.013,.008,.38,'#fff2df');
        limb([x-.076,.447,head+13.2],[x+.067,.449,head+13.5],.014,mix(hair,-4));
      }
      oval(sign*.28,.386,head+8,.075,.018,1.35,mix(skin,-6));
    }
    limb([-.072,.389,head+4.4],[0,.405,head+4],.012,mix(skin,-35));
    limb([0,.405,head+4],[.072,.389,head+4.4],.012,mix(skin,-35));
    oval(0,.398,head+3.5,.05,.014,.37,mix(skin,6));detail=0;
  }
  // A continuous crown, with tapered curved locks rather than separate blocks.
  const lock=(a:Vertex,b:Vertex,c:Vertex,width:number,color:string)=>{
    const rings=Array.from({length:compact?4:7},(_,i)=>{
      const t=i/(compact?3:6),s=1-t,center=a.map((v,j)=>s*s*v+2*s*t*b[j]+t*t*c[j]);
      const tangent=a.map((v,j)=>(2*s*(b[j]-v)+2*t*(c[j]-b[j]))*(j<2?24:1));
      const len=Math.hypot(...tangent)||1,n=tangent.map(v=>v/len),seed=Math.abs(n[2])<.9?[0,0,1]:[0,1,0];
      let u=[n[1]*seed[2]-n[2]*seed[1],n[2]*seed[0]-n[0]*seed[2],n[0]*seed[1]-n[1]*seed[0]];
      const ul=Math.hypot(...u)||1;u=u.map(v=>v/ul);
      const v=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]],rad=width*(1-t*.94);
      return Array.from({length:compact?6:10},(_,j)=>center.map((value,k)=>value+(u[k]*Math.cos(j*Math.PI*2/(compact?6:10))+v[k]*Math.sin(j*Math.PI*2/(compact?6:10)))*rad*(k<2?1:24)) as Vertex);
    });mesh(rings,color,true);
  };
  const crown=(width:number,depth:number,height:number)=>{
    // Match the head's rounded-rectangle section: an elliptical cap cuts through
    // its fuller temples, revealing skin between the locks when seen in profile.
    const section=(rx:number,ry:number,z:number)=>roundRing(-rx,.03-ry,z,rx*2,ry*2);
    const lower=section(width*.98,depth*.98,head+12);
    lower.forEach((v,i)=>v[2]+=Math.max(0,Math.sin(i*Math.PI/8))*10);
    mesh([lower,section(width,depth,head+22),section(width*.7,depth*.7,head+height-2),section(.03,.03,head+height)],hair,true);
  };
  crown(look.hair==='crop'?.47:.5,look.hair==='crop'?.44:.47,look.hair==='crop'?30:32);
  if(look.hair==='crop') {
    for(let i=0;i<4;i++)lock([-.3+i*.18,.12,head+27],[-.24+i*.18,.34,head+29],[-.18+i*.16,.42,head+22],.09,mix(hair,i%2?5:1));
  } else if(look.hair==='swept') {
    for(let i=0;i<4;i++)lock([.23-i*.11,-.15,head+30],[-.17-i*.08,.37,head+34-i],[-.45+i*.18,.43,head+18+i*1.2],.145-i*.008,mix(hair,i%2?7:1));
    lock([.45,-.16,head+23],[.51,.05,head+18],[.42,.25,head+12],.08,mix(hair,-4));
  } else if(look.hair==='waves') {
    for(let i=0;i<4;i++)lock([-.3+i*.2,-.31,head+25],[-.47+i*.21,.04,head+39],[-.34+i*.22,.4,head+24-i%2*3],.16,mix(hair,i%2?6:1));
    lock([-.35,.18,head+29],[-.57,.42,head+25],[-.33,.46,head+18],.14,mix(hair,3));
    lock([.1,.16,head+31],[.35,.46,head+29],[.2,.47,head+20],.13,mix(hair,7));
  } else if(look.hair==='bob') {
    oval(0,-.36,head+12,.48,.22,16,mix(hair,-5));
    for(const sign of [-1,1]) {
      oval(sign*.43,-.04,head+11,.145,.32,14,hair);
      for(let n=0;n<2;n++)lock([sign*.4,-.13+n*.18,head+26],[sign*.57,-.14+n*.18,head+12],[sign*.37,.03+n*.18,head-1],.055,mix(hair,6));
    }
    for(let i=0;i<4;i++)lock([-.3+i*.2,.14,head+28],[-.33+i*.21,.4,head+25],[-.31+i*.2,.43,head+19.7],.105,mix(hair,i%2?4:0));
  } else if(look.hair==='bun') {
    oval(0,-.6,head+27,.28,.29,8,mix(hair,5));
    limb([-.22,-.52,head+24],[.22,-.52,head+24],.035,'#b49abf',1);
    for(const sign of [-1,1])lock([sign*.41,.14,head+25],[sign*.51,.3,head+15],[sign*.4,.32,head+6],.047,mix(hair,5));
  }
  if(look.glasses && frontVisible) {
    detail=1.6;
    for(const sign of [-1,1]) {
      const x=sign*.195;
      for(let n=0;n<12;n++){
        const a=n*Math.PI/6,b=(n+1)*Math.PI/6;
        limb([x+Math.cos(a)*.131,.51,head+12+Math.sin(a)*2.7],[x+Math.cos(b)*.131,.51,head+12+Math.sin(b)*2.7],.016,'#5b4a46',1);
      }
      limb([sign*.325,.5,head+13],[sign*.46,.02,head+13],.015,'#5b4a46');
    }
    limb([-.065,.51,head+12.5],[.065,.51,head+12.5],.014,'#5b4a46',1);detail=0;
  }
  if(look.headphones) {
    for(const sign of [-1,1]) {
      oval(sign*.515,0,head+12,.105,.22,6,'#514959');
      oval(sign*.59,0,head+12,.065,.18,5,'#b2a0c1');
      oval(sign*.637,0,head+12,.022,.12,3.3,'#8a7a99');
    }
    for(let n=0;n<12;n++){
      const a=n*Math.PI/12,b=(n+1)*Math.PI/12;
      limb([Math.cos(a)*.58,-.09,head+17+Math.sin(a)*16],[Math.cos(b)*.58,-.09,head+17+Math.sin(b)*16],.045,'#b2a0c1',1);
    }
  }
  if(pose.read>.005) {
    propWeight=pose.read;
    box(-.56,.83,hip+18,1.12,.65,3,'#8f789e');
    box(-.51,.86,hip+21,.48,.59,2,'#f0e2c7');box(.03,.86,hip+21,.48,.59,2,'#e3d4b8');
    for(let n=0;n<4;n++)box(-.44,.96+n*.1,hip+23,.33,.015,.2,'#b6a58e');
  }
  if(pose.water>.005) {
    propWeight=pose.water;
    gem(.35,.78,hip+8,.62,.54,14,'#88a8ad');box(.5,1.23,hip+15,.16,.65,4,'#a4c1c2');
  }
  return shapes;
}

export function drawResident(g:CanvasRenderingContext2D,resident:Resident,light:RoomLight,
  project:(x:number,y:number,z?:number)=>Point,look:ResidentLook=defaultResidentLook) {
  if(!resident.visible)return;
  const r=resident,feet=project(r.x,r.y,1),unit=Math.abs(project(r.x+1,r.y,1)[0]-feet[0]);
  g.save();
  for(const [size,alpha] of [[1,.12],[.7,.12],[.42,.1]]) {
    g.fillStyle=`rgba(8,9,20,${alpha})`;g.beginPath();g.ellipse(feet[0],feet[1],unit*size,unit*.37*size,0,0,Math.PI*2);g.fill();
  }
  paintResidentMesh(g,residentArtwork(r,light,project,look,true));
  const pose=residentPose(r);
  if(pose.water>.9) {
    g.fillStyle='#b5e2e8';g.globalAlpha=(pose.water-.9)*6.7;
    const hip=52+(pose.seatHeight+7-52)*pose.seated;
    for(let n=0;n<6;n++){
      const fall=(r.time*1.5+n/6)%1,x=.58,y=1.85+fall*.3;
      const p=project(r.x-Math.sin(pose.facing)*x+Math.cos(pose.facing)*y,r.y+Math.cos(pose.facing)*x+Math.sin(pose.facing)*y,hip+13-fall*28);
      g.beginPath();g.ellipse(p[0],p[1],1,2,0,0,Math.PI*2);g.fill();
    }
  }
  g.restore();
}

import {snowCount} from '@/domain/snow';
import {seasonPalette,seasonParticle,type Season} from '@/domain/season';
type Project=(x:number,y:number,z:number)=>[number,number];
function clipWindow(g:CanvasRenderingContext2D,p:Project,panes=false){
 g.beginPath();
 for(const [x1,x2] of panes?[[13.65,17.78],[18.03,22.35]]:[[13.6,22.4]])for(const [z1,z2] of panes?[[43,110],[120,213]]:[[42,215]]){
  const points=[p(x1,.3,z1),p(x2,.3,z1),p(x2,.3,z2),p(x1,.3,z2)];points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();
 }g.clip();
}
export function seasonalTrees(g:CanvasRenderingContext2D,p:Project,season:Season,daylight:number){
 g.save();clipWindow(g,p);g.globalAlpha=daylight? .85:.48;
 for(let i=0;i<3;i++){
  const x=14.8+i*3.1,base=p(x,.3,40),top=p(x,.3,113+i%2*12);
  g.strokeStyle=daylight?'#736373':'#3d415d';g.lineWidth=2;g.beginPath();g.moveTo(...base);g.lineTo(...top);g.stroke();
  for(let j=0;j<5;j++){
   const z=70+j*8,side=j%2?1:-1,a=p(x,.3,z-10),b=p(x+side*.7,.3,z+8);
   g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke();
   if(season==='winter'){g.strokeStyle='#dbe9f0';g.lineWidth=2.5;g.beginPath();g.moveTo(a[0],a[1]-2);g.lineTo(b[0],b[1]-2);g.stroke();g.strokeStyle=daylight?'#736373':'#3d415d';}
   else {g.fillStyle=seasonPalette[season].foliage;g.beginPath();g.ellipse(b[0],b[1]-4,12+j%2*3,9,0,0,Math.PI*2);g.fill();}
  }
 }
 if(season==='winter')for(let i=0;i<17;i++){
  const x=13.65+i*.51,z=48+(i*37)%62,a=p(x,.3,z),b=p(x+.43,.3,z);
  g.strokeStyle='#dce9f1';g.lineWidth=2.5;g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke();
 }
 g.restore();
}
export function seasonalParticles(g:CanvasRenderingContext2D,p:Project,season:Season,time:number,daylight:number,snowIntensity=50){
 if(season==='summer' && daylight>.5)return;
 g.save();clipWindow(g,p,true);
 const count=season==='winter'?snowCount(snowIntensity):season==='summer'?10:16;
 for(let i=0;i<count;i++){
  const particle=seasonParticle(i,time,season),[x,y]=p(particle.x,.35,particle.z);
  g.globalAlpha=particle.alpha*(season==='summer'?1:.85);g.fillStyle=seasonPalette[season].particle;
  g.beginPath();g.ellipse(x,y,season==='autumn'?2.5:season==='spring'?2:1.2+i%2*.4,season==='autumn'?1.2:season==='spring'?1:1.2,Math.sin(time*.4+i),0,Math.PI*2);g.fill();
 }
 g.restore();
}

/** Small vector drifts, no blur or background-cache invalidation as snow builds. */
export function snowDrifts(g:CanvasRenderingContext2D,p:Project,daylight:number,depth:number){
 const amount=Math.max(.2,Math.min(1,depth));
 const blend=(a:number,b:number)=>Math.round(a+(b-a)*daylight);
 const snow=`rgb(${blend(121,227)},${blend(143,237)},${blend(170,243)})`;
 g.save();clipWindow(g,p,true);
 // Overlapping smooth banks behind the glass, below the skyline.
 for(let layer=0;layer<3;layer++){
  g.fillStyle=layer===0?(daylight>.5?'#acbecd':'#485b79'):layer===1?(daylight>.5?'#ccdae3':'#637c9a'):snow;
  g.beginPath();g.moveTo(...p(13.5,.3,42));
  for(let i=0;i<=40;i++){const x=13.5+i*.23,z=48+(2-layer)*7+amount*12+Math.sin(i*.18+layer*1.7)*5+Math.sin(i*.33)*2;g.lineTo(...p(x,.3,z));}
  g.lineTo(...p(22.7,.3,42));g.closePath();g.fill();
 }
 g.restore();
 // A rounded cap follows the sill plane, with a cool shaded lip.
 g.save();g.fillStyle=daylight>.5?'#aabfce':'#526780';
 const a=p(13.05,.2,38),b=p(22.95,.2,38),c=p(22.95,1,37),d=p(13.05,1,37);
 g.beginPath();g.moveTo(...a);g.lineTo(...b);g.lineTo(c[0],c[1]+3);g.lineTo(d[0],d[1]+3);g.closePath();g.fill();
 g.fillStyle=snow;g.beginPath();g.moveTo(...p(13.05,1,38));
 for(let i=0;i<=40;i++){const x=13.05+i*9.9/40,z=40+amount*6+Math.sin(i*.24)*1.3+Math.sin(i*.55)*.6;g.lineTo(...p(x,.2,z));}
 g.lineTo(...p(22.95,1,38));g.closePath();g.fill();g.restore();
}

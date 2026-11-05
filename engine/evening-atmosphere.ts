import { defaultAccentLights, lightRgb, type AccentLights } from '@/domain/accent-lights';
import {roomClock, steamWisp} from '@/domain/live-details';
type Point = [number, number];
type Project = (x: number, y: number, z: number) => Point;

/** Draw outside the architecture cache so the hands always follow device time. */
export function livingClock(g:CanvasRenderingContext2D,p:Project,timestamp:number,daylight:number) {
  const origin=p(.22,10,194), clock=roomClock(timestamp);
  g.save();
  g.translate(...origin);g.transform(.88,-.46,0,1,0,0);
  g.fillStyle='#00000024';g.beginPath();g.arc(2,3,23,0,Math.PI*2);g.fill();
  g.fillStyle='#6e5b53';g.beginPath();g.arc(0,0,23,0,Math.PI*2);g.fill();
  g.strokeStyle='#b8a38b';g.lineWidth=1;g.stroke();
  g.fillStyle=daylight>.5?'#ddd2bf':'#b6ab9b';g.beginPath();g.arc(0,0,20.5,0,Math.PI*2);g.fill();
  for(let i=0;i<60;i++) {
    const angle=i/60*Math.PI*2, outer=18, inner=i%5===0?14.5:17;
    g.strokeStyle=i%5===0?'#514b49':'#82766a';g.lineWidth=i%5===0?1.2:.45;
    g.beginPath();g.moveTo(Math.sin(angle)*inner,-Math.cos(angle)*inner);g.lineTo(Math.sin(angle)*outer,-Math.cos(angle)*outer);g.stroke();
  }
  const hand=(angle:number,length:number,width:number,color:string)=>{
    g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.beginPath();g.moveTo(-Math.sin(angle)*2,Math.cos(angle)*2);g.lineTo(Math.sin(angle)*length,-Math.cos(angle)*length);g.stroke();
  };
  hand(clock.hour,10,2.2,'#423c3b');hand(clock.minute,14,1.4,'#423c3b');hand(clock.second,16,.65,'#a76259');
  g.fillStyle='#72534d';g.beginPath();g.arc(0,0,1.6,0,Math.PI*2);g.fill();
  g.fillStyle='#312b32';g.fillRect(-15,25,30,12);
  g.fillStyle='#ddcbb6';g.font='500 8px ui-monospace, monospace';g.textAlign='center';g.textBaseline='middle';g.fillText(clock.label,0,31);
  g.restore();
}

/** Architectural decorations sit behind furniture and share the room's paused clock. */
export function eveningBackdrop(g: CanvasRenderingContext2D, p: Project, time: number, daylight: number, lights: AccentLights & { garlandOpacity?: number } = defaultAccentLights) {
  const warmth = 1 - daylight;
  g.save();
  // A dark cord with small steady amber bulbs, rather than flashing fairy lights.
  const brightness = lights.garland ? lights.garlandBrightness / 100 : 0;
  const color = lightRgb(lights.garlandColor);
  g.save();
  g.globalAlpha *= lights.garlandOpacity ?? 1;
  for (const wall of lights.garlandInstalled ? [0, 1] : []) {
    const length = wall ? 12 : 15;
    const point = (t: number, drop = 0) => wall ? p(t, .16, 238-14*Math.sin(t/length*Math.PI)-drop)
      : p(.16, t, 238-14*Math.sin(t/length*Math.PI)-drop);
    g.strokeStyle='#66534b'; g.lineWidth=1.3; g.beginPath();
    for(let n=0;n<=60;n++){const pos=point(n*length/60); if(n)g.lineTo(...pos);else g.moveTo(...pos);}g.stroke();
    for(let n=0;n<10;n++) {
      const t=.6+n*(length-1.2)/9, a=point(t), b=point(t,5);
      g.strokeStyle='#6e5b4d';g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke();
      if (brightness > 0) {
      const halo=g.createRadialGradient(...b,0,...b,22);
      halo.addColorStop(0,`rgba(${color},${(.07+warmth*.17)*brightness})`);halo.addColorStop(1,`rgba(${color},0)`);
      g.fillStyle=halo;g.fillRect(b[0]-22,b[1]-22,44,44);
      }
      g.beginPath();g.ellipse(...b,2,3,0,0,Math.PI*2);
      g.fillStyle='#77685e';g.fill();
      if(brightness>0){g.fillStyle=`rgba(${color},${brightness*(1-daylight*.16)})`;g.fill();}
    }
  }
  g.restore();
  // Open linen panels frame the rain without covering the central window panes.
  g.strokeStyle='#8b7772';g.lineWidth=3;g.beginPath();g.moveTo(...p(12.95,.7,228));g.lineTo(...p(23.1,.7,228));g.stroke();
  for(const [start,direction] of [[13.05,1],[23,-1]]) {
    // All folds meet the same narrow waist; the lower hem alone sways.
    const sway=Math.sin(time*.6)*.055;
    const point=(u:number,z:number,width:number,offset:number,y=.84)=>p(start+direction*(offset+u*width),y,z);
    const top=(u:number)=>point(u,224,1,0,.72);
    const waist=(u:number)=>point(u,105,.42,.16);
    const hem=(u:number)=>point(u,43+Math.sin(u*Math.PI*2)*1.2,.94,.1+sway);
    for(let fold=0;fold<8;fold++) {
      const left=fold/8,right=(fold+1)/8;
      g.beginPath();g.moveTo(...top(left));g.lineTo(...top(right));
      g.bezierCurveTo(...point(right,175,.98,.02),...point(right,125,.42,.16),...waist(right));
      g.bezierCurveTo(...point(right,87,.42,.16),...point(right,59,.9,.1+sway),...hem(right));
      g.lineTo(...hem(left));
      g.bezierCurveTo(...point(left,59,.9,.1+sway),...point(left,87,.42,.16),...waist(left));
      g.bezierCurveTo(...point(left,125,.42,.16),...point(left,175,.98,.02),...top(left));g.closePath();
      const shade=fold%2?1:.82;
      g.fillStyle=`rgba(${Math.round((125+daylight*65)*shade)},${Math.round((108+daylight*68)*shade)},${Math.round((114+daylight*45)*shade)},.96)`;g.fill();
    }
    // A curved fabric band wraps the gathered cloth, with a short hanging knot.
    const band=(u:number,z:number)=>point(u,z,.42,.16,.9);
    g.beginPath();g.moveTo(...band(0,108));
    g.quadraticCurveTo(...band(.5,105),...band(1,108));g.lineTo(...band(1,103));
    g.quadraticCurveTo(...band(.5,100),...band(0,103));g.closePath();
    g.fillStyle=daylight>.5?'#b39a7d':'#8e7865';g.fill();
    g.strokeStyle='#645348';g.lineWidth=.7;g.stroke();
    g.beginPath();g.moveTo(...band(.65,104));
    g.quadraticCurveTo(...band(.84,98),...band(.66,93));
    g.strokeStyle=daylight>.5?'#b39a7d':'#8e7865';g.lineWidth=1.2;g.lineCap='round';g.stroke();

  }
  g.restore();
}

/** Local desk coordinates keep the light strip and steam attached while moving/rotating. */
export function eveningDesk(g:CanvasRenderingContext2D,p:Project,time:number,daylight:number,w:number,h:number,lights:AccentLights=defaultAccentLights) {
  g.save();
  const night=1-daylight;
  const brightness=lights.deskBrightness/100, color=lightRgb(lights.deskColor);
  if(lights.desk && brightness>0) {
  g.globalCompositeOperation='screen';
  const a=p(.18,h-.06,57),b=p(w-.18,h-.06,57);
  g.strokeStyle=`rgba(${color},${(.12+night*.48)*brightness})`;g.lineWidth=2;
  g.shadowColor=`rgba(${color},${night*.4*brightness})`;g.shadowBlur=9;
  g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke();g.shadowBlur=0;
  g.globalCompositeOperation='source-over';
  }
  // Fade in and out at the cup, with staggered wisps and no visible loop reset.
  for(let n=0;n<4;n++) {
    const {rise,drift,alpha}=steamWisp(time,n);
    const origin=p(.38,1.65,76+rise);
    g.strokeStyle=`rgba(238,224,211,${alpha})`;g.lineWidth=1.2;g.lineCap='round';
    g.beginPath();g.moveTo(...origin);
    g.bezierCurveTo(origin[0]+drift+3,origin[1]-5,origin[0]+drift-3,origin[1]-10,origin[0]+drift,origin[1]-16);g.stroke();
  }
  g.restore();
}

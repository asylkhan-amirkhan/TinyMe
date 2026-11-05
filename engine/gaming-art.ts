import {characterMiniature} from './character-miniatures';
import {loadPosterArt} from './poster-assets';
type Vertex=[number,number,number];
export type MiniaturePainter={
  box:(x:number,y:number,z:number,w:number,d:number,h:number,color:string)=>void;
  turned:(x:number,y:number,rings:[number,number,number][],color:string)=>void;
  face:(points:Vertex[],color:string)=>void;
};

export function gamingMiniature(id:string,color:string,{box,turned,face}:MiniaturePainter){
  const base='#353641',gold='#d6b57a',steel='#bac7d0';
  turned(.5,.5,[[0,.4,.36],[2,.4,.36],[3,.34,.31]],base);
  const ring=(cx:number,z:number,rx:number,rz:number,c:string)=>{
    for(let n=0;n<32;n++){
      const a=n*Math.PI/16,b=(n+1)*Math.PI/16;
      face([[cx+Math.cos(a)*rx,.54,z+Math.sin(a)*rz],[cx+Math.cos(b)*rx,.54,z+Math.sin(b)*rz],[cx+Math.cos(b)*(rx-.045),.54,z+Math.sin(b)*(rz-1.2)],[cx+Math.cos(a)*(rx-.045),.54,z+Math.sin(a)*(rz-1.2)]],c);
    }
  };
  if(characterMiniature(id,color,{box,turned,face}))return;
  if(id==='relic-rune'){
    box(.46,.46,3,.08,.08,4,gold);
    ring(.5,15,.3,9,color);ring(.35,16,.21,6,color);ring(.65,16,.21,6,color);
    face([[.48,.55,5],[.52,.55,5],[.52,.55,25],[.48,.55,25]],gold);
  }else if(id==='relic-katana'){
    for(const x of [.23,.72])box(x,.4,3,.055,.18,10,color);
    face([[.13,.5,12],[.88,.5,18],[.94,.5,19],[.88,.5,16],[.13,.5,10]],steel);
    box(.05,.44,9,.22,.12,3,'#594f52');box(.24,.4,10,.04,.25,5,gold);
  }else if(id==='relic-trophy'){
    turned(.5,.5,[[3,.2,.19],[6,.12,.11],[13,.08,.08],[14,.23,.22],[25,.32,.29],[27,.3,.28]],color);
    turned(.5,.5,[[27,.25,.23],[27,.24,.22]],'#7c5e3f');
    for(const x of [.18,.82])ring(x,20,.13,5,gold);
  }else if(id==='relic-headset'){
    box(.47,.44,3,.06,.12,18,'#8b8e9b');
    ring(.5,17,.32,8,color);
    for(const x of [.13,.72]){box(x,.42,10,.15,.2,8,'#252d41');box(x,.63,11,.15,.04,6,color);}
    face([[.78,.66,11],[.73,.66,7],[.49,.66,7],[.49,.66,8],[.69,.66,8],[.74,.66,12]],'#9bafba');
  }
}

const posters=new Map<string,HTMLCanvasElement>();
/** Local illustrated posters with instant procedural artwork as a loading/error fallback. */
export function gamingPoster(id:string):HTMLCanvasElement{
  const cached=posters.get(id);if(cached)return cached;
  const canvas=document.createElement('canvas');canvas.width=960;canvas.height=1280;
  const g=canvas.getContext('2d')!;
  g.scale(2,2);
  const poly=(pts:number[][],color:string)=>{g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=color;g.fill();};
  const circle=(x:number,y:number,r:number,color:string)=>{g.fillStyle=color;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();};
  const line=(pts:number[][],color:string,width:number)=>{g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();};
  const title=(name:string,sub:string,color:string)=>{g.fillStyle=color;g.textAlign='center';g.font='700 38px sans-serif';g.fillText(name,240,562,420);g.font='16px sans-serif';g.fillText(sub,240,598,420);};
  const fighter=(x:number,y:number,scale:number,color:string)=>{
    g.save();g.translate(x,y);g.scale(scale,scale);circle(0,-63,15,color);
    poly([[-18,-46],[17,-46],[24,8],[-24,8]],color);
    line([[-9,0],[-16,53]],color,15);line([[9,0],[27,48]],color,15);
    line([[-15,-35],[-34,-5]],color,12);line([[16,-35],[40,-16]],color,12);g.restore();
  };
  g.fillStyle=id==='poster-cs2'?'#d89b4d':id==='poster-dust'?'#d1b58d':'#172b2d';g.fillRect(0,0,480,640);
  if(id==='poster-erdtree'){
    circle(240,244,174,'#30433b');
    for(let i=0;i<90;i++){const a=i*2.399,r=35+(i*47)%145;circle(240+Math.cos(a)*r,220+Math.sin(a)*r,2+i%4,'#b89d52');}
    line([[205,480],[238,368],[231,269],[251,115]],'#e5c77a',17);
    for(let i=0;i<10;i++){const y=165+i*24,side=i%2?1:-1;line([[240,y+70],[240+side*45,y+13],[240+side*(100-i*4),y-28]],'#d8bd78',5+i%3);}
    poly([[0,492],[104,452],[180,482],[301,453],[480,489],[480,640],[0,640]],'#142226');title('ELDEN RING','THE GOLDEN ORDER','#d8c588');
  }else if(id==='poster-malenia'){
    g.fillStyle='#2e2630';g.fillRect(0,0,480,640);circle(240,255,174,'#653a40');
    for(let i=0;i<26;i++){const a=i*2.4,x=240+Math.cos(a)*150,y=267+Math.sin(a)*150;poly([[240,330],[x,y],[x+22,y-45],[x-28,y-18]],i%2?'#bc6966':'#8f5057');}
    fighter(240,355,1.3,'#342b34');poly([[222,266],[255,263],[285,400],[235,374]],'#b35e4b');
    line([[275,360],[359,455]],'#d6b995',5);title('ELDEN RING','BLADE OF MIQUELLA','#e3bea2');
  }else if(id==='poster-ashina'){
    g.fillStyle='#c8bda8';g.fillRect(0,0,480,640);circle(325,158,88,'#b75642');
    poly([[0,400],[80,270],[165,335],[294,216],[480,368],[480,510],[0,510]],'#929693');
    for(let i=0;i<4;i++){const y=450-i*76,w=270-i*45;g.fillStyle='#333f43';g.fillRect(240-w/2,y-52,w,61);poly([[240-w/2-32,y-49],[240,y-88],[240+w/2+32,y-49],[240+w/2,y-39],[240-w/2,y-39]],'#26353c');for(let x=240-w/2+18;x<240+w/2;x+=28){g.fillStyle='#c2a47e';g.fillRect(x,y-24,9,17);}}
    title('SEKIRO','SHADOWS DIE TWICE','#293b3c');
  }else if(id==='poster-moon'){
    g.fillStyle='#233344';g.fillRect(0,0,480,640);circle(266,205,137,'#c5d1ce');
    for(let i=0;i<4;i++)poly([[0,390+i*30],[110,320+i*36],[246,390+i*19],[389,313+i*30],[480,373+i*24],[480,520],[0,520]],i%2?'#3c5260':'#536871');
    fighter(220,379,1.3,'#1e2935');poly([[210,331],[238,325],[287,353],[259,359]],'#ad6d4f');line([[256,366],[353,265]],'#e2d8be',5);title('SEKIRO','ONE-ARMED WOLF','#d6d8ca');
  }else if(id==='poster-cs2'){
    poly([[0,0],[188,0],[480,450],[480,540],[288,540],[0,95]],'#e8b46c');
    fighter(177,309,1.5,'#273544');fighter(316,331,1.25,'#3d4751');
    line([[218,282],[290,246]],'#273544',16);line([[350,310],[411,291]],'#3d4751',12);
    g.fillStyle='#273544';g.fillRect(32,494,416,4);title('COUNTER-STRIKE','2','#273544');
  }else{
    g.fillStyle='#3a4852';g.fillRect(0,0,480,640);
    for(let x=24;x<480;x+=32)line([[x,20],[x,480]],'#52606a',1);
    for(let y=20;y<490;y+=32)line([[20,y],[460,y]],'#52606a',1);
    g.strokeStyle='#d8c09a';g.lineWidth=13;g.lineJoin='miter';
    g.strokeRect(66,82,135,103);g.strokeRect(289,92,111,126);g.strokeRect(162,265,120,120);
    line([[132,187],[132,235],[220,235],[220,267]],'#d8c09a',18);line([[345,220],[345,426],[220,426],[220,384]],'#d8c09a',18);
    circle(131,135,27,'#bf8459');circle(345,152,27,'#bf8459');g.fillStyle='#f0dfbd';g.textAlign='center';g.font='700 32px sans-serif';g.fillText('A',131,146);g.fillText('B',345,163);title('DUST II','COUNTER-STRIKE 2','#dfc69c');
  }
  g.strokeStyle='#ffffff22';g.lineWidth=2;g.strokeRect(16,16,448,608);posters.set(id,canvas);loadPosterArt(id,canvas);return canvas;
}

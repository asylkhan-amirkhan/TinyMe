import type {MiniaturePainter} from './gaming-art';
type V=[number,number,number];
export const characterDetails:Record<string,string>={
  'figure-alexander':'Воин-кувшин: округлый корпус, красная печать с рельефом, трещины в керамике и каменные кулаки.',
  'figure-ranni':'Снежная ведьма: широкая шляпа, голубое лицо, длинные волосы, меховая накидка и четыре руки.',
  'figure-wolf':'Однорукий Волк: потрёпанный плащ, шарф, седая прядь, протез левой руки и катана.',
  'figure-agent':'Контртеррорист в стиле SAS: противогаз, защитные линзы, гарнитура, бронежилет и снаряжение.',
  'figure-idol':'Идол резчика: сидящая каменная фигура, сложенные руки, резные складки и языки голубого пламени.',
};

type Part={kind:'box';args:Parameters<MiniaturePainter['box']>}|{kind:'turned';args:Parameters<MiniaturePainter['turned']>}|{kind:'face';args:Parameters<MiniaturePainter['face']>};
const sculptCache=new Map<string,Part[]>();
/** Cache sculpt geometry, but apply world rotation and live room lighting on every draw. */
export function characterMiniature(id:string,color:string,painter:MiniaturePainter):boolean{
  if(!characterDetails[id])return false;
  const key=id+':'+color;
  let parts=sculptCache.get(key);
  if(!parts){
    parts=[];const built=parts;
    buildCharacterMiniature(id,color,{box:(...args)=>built.push({kind:'box',args}),turned:(...args)=>built.push({kind:'turned',args}),face:(...args)=>built.push({kind:'face',args})});
    if(sculptCache.size>=40)sculptCache.delete(sculptCache.keys().next().value!);
    sculptCache.set(key,parts);
  }
  for(const part of parts){if(part.kind==='box')painter.box(...part.args);else if(part.kind==='turned')painter.turned(...part.args);else painter.face(...part.args);}
  return true;
}
/** Small sculpted meshes in room units. All five retain their existing shelf footprint. */
function buildCharacterMiniature(id:string,color:string,painter:MiniaturePainter):boolean{
  if(!characterDetails[id])return false;
  // Reserve more of Ranni's unchanged 29-unit height for the snow-witch hat.
  const hatProfile=(z:number)=>z<=23?3+(z-3)*.85:20+(z-23)*1.5;
  const {box,turned,face}:MiniaturePainter=id==='figure-ranni'?{
    box:(x,y,z,w,d,h,c)=>painter.box(x,y,hatProfile(z),w,d,hatProfile(z+h)-hatProfile(z),c),
    turned:(x,y,rings,c)=>painter.turned(x,y,rings.map(([z,rx,ry])=>[hatProfile(z),rx,ry]),c),
    face:(points,c)=>painter.face(points.map(([x,y,z])=>[x,y,hatProfile(z)]),c),
  }:painter;
  const ellipsoid=(x:number,y:number,z:number,rx:number,ry:number,rz:number,c:string)=>{
    turned(x,y,Array.from({length:7},(_,i):[number,number,number]=>{
      const a=-Math.PI/2+i*Math.PI/6;return[z+Math.sin(a)*rz,Math.cos(a)*rx,Math.cos(a)*ry];
    }),c);
  };
  const tube=(a:V,b:V,r:number,c:string,endRadius=r)=>{
    const A=[a[0]*24,a[1]*24,a[2]],B=[b[0]*24,b[1]*24,b[2]],v=B.map((x,i)=>x-A[i]);
    const len=Math.hypot(...v)||1,n=v.map(x=>x/len),axis=Math.abs(n[2])>.9?[1,0,0]:[0,0,1];
    const raw=[n[1]*axis[2]-n[2]*axis[1],n[2]*axis[0]-n[0]*axis[2],n[0]*axis[1]-n[1]*axis[0]],l=Math.hypot(...raw);
    const u=raw.map(x=>x/l),w=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]];
    const ring=(p:number[],radius:number)=>Array.from({length:8},(_,i):V=>{const t=i*Math.PI/4,q=p.map((x,k)=>x+radius*(Math.cos(t)*u[k]+Math.sin(t)*w[k]));return[q[0]/24,q[1]/24,q[2]];});
    const low=ring(A,r),high=ring(B,endRadius);
    for(let i=0;i<8;i++)face([low[i],low[(i+1)%8],high[(i+1)%8],high[i]],c);
    face(low.slice().reverse(),c);face(high,c);
  };
  const seam=(points:V[],c:string,r=.1)=>{for(let i=1;i<points.length;i++)tube(points[i-1],points[i],r,c);};
  const faceMark=(x:number,y:number,z:number,w:number,h:number,c:string)=>face([[x,y,z],[x+w,y,z],[x+w,y,z+h],[x,y,z+h]],c);
  const head=(skin:string)=>ellipsoid(.5,.5,23.2,.105,.09,2.6,skin);
  if(id==='figure-alexander'){
    // Feet, bent stone arms, broad pot, raised rim and an embossed sealing medallion.
    for(const x of [.3,.7]){tube([x,.46,3],[x,.45,7],1.35,'#66625c');ellipsoid(x,.55,3.6,.12,.13,.9,'#777169');}
    turned(.5,.47,[[6,.2,.19],[8,.29,.27],[12,.33,.31],[18,.33,.31],[22,.29,.27],[24,.23,.22]],color);
    for(const z of [8.4,10.3,20.8,22])turned(.5,.47,[[z,.31-(z>20?.025:0),.29-(z>20?.025:0)],[z+.45,.31-(z>20?.025:0),.29-(z>20?.025:0)]],'#cc9872');
    turned(.5,.47,[[23,.25,.24],[24,.29,.28],[25.2,.29,.28],[25.6,.25,.24]],'#c38b61');
    turned(.5,.47,[[25.6,.24,.23],[26.1,.24,.23]],'#91494a');
    // Raised wax pattern on the horizontal lid.
    for(let i=0;i<16;i++){const a=i*Math.PI/8;seam([[.5,.47,26.3],[.5+Math.cos(a)*.2,.47+Math.sin(a)*.19,26.3]],'#b8766b',.18);}
    turned(.5,.47,[[26.2,.075,.07],[27.4,.075,.07]],'#bc7969');
    for(const side of [-1,1]){
      tube([.5+side*.3,.47,18],[.5+side*.41,.5,15],1.25,'#696660');
      tube([.5+side*.41,.5,15],[.5+side*.4,.67,19],1.1,'#80796e');
      ellipsoid(.5+side*.4,.67,20,.075,.09,1.6,'#8e8578');
      for(let i=0;i<3;i++)faceMark(.5+side*.4-.045+i*.03,.759,19.4,.01,1,'#544e49');
    }
    const jarSurface=(x:number,z:number):V=>{
      const rx=z<12?.29+(z-8)*.01:z<=18?.33:.33-(z-18)*.01;
      return[x,.47+(rx-.02)*Math.sqrt(Math.max(0,1-((x-.5)/rx)**2))+.008,z];
    };
    for(const [x,z] of [[.29,15],[.6,12],[.5,19]])seam([jarSurface(x,z+2),jarSurface(x+.035,z),jarSurface(x-.015,z-1),jarSurface(x+.025,z-3)],'#744f3d',.1);
    for(let i=0;i<13;i++){const x=.27+i*.035,z=17+Math.sin(i)*.7;face([jarSurface(x,z),jarSurface(x+.015,z),jarSurface(x+.015,z+.55),jarSurface(x,z+.55)],'#d2a57d');}
  }else if(id==='figure-ranni'){
    // Layered pale dress and vertical pleats, separate from the darker pointed hat.
    turned(.5,.46,[[3,.29,.24],[4,.31,.25],[8,.25,.21],[13,.18,.16],[17,.14,.13]],color);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;seam([[.5+Math.cos(a)*.285,.46+Math.sin(a)*.24,4],[.5+Math.cos(a)*.22,.46+Math.sin(a)*.185,10],[.5+Math.cos(a)*.145,.46+Math.sin(a)*.13,16]],i%2?'#d4dbe4':'#899bad',.11);}
    // All four doll arms have elbows, cuffs and separated hands.
    for(const side of [-1,1])for(const lower of [false,true]){
      const z=lower?14.6:17,x=.5+side*.15;
      tube([x,.48,z],[.5+side*(lower?.27:.31),.55,z-2],.7,color);
      tube([.5+side*(lower?.27:.31),.55,z-2],[.5+side*(lower?.18:.34),.7,z-3.8],.48,'#86b6ce');
      ellipsoid(.5+side*(lower?.18:.34),.7,z-4.1,.04,.06,.6,'#a4d0df');
    }
    for(let i=0;i<14;i++){const a=i*Math.PI/7;ellipsoid(.5+Math.cos(a)*.19,.47+Math.sin(a)*.15,17.4,.07,.055,1.2,i%2?'#cdd8df':'#e5e6e0');}
    ellipsoid(.5,.47,20.9,.115,.1,2.4,'#91c0d6');
    // Porcelain face, one luminous open eye, the dark closed eye, and ghost profile.
    faceMark(.45,.563,21,.035,.3,'#d7f7ff');faceMark(.53,.567,21,.035,.17,'#4f6c8f');
    seam([[.547,.568,21.8],[.54,.576,20.5],[.57,.568,19.8]],'#527a9b',.055);
    faceMark(.485,.574,19.8,.035,.12,'#6e8fa6');
    for(let i=0;i<9;i++){const x=.365+i*.032;const side=x<.5?-1:1;seam([[x,.44,22],[x+side*.025,.54,19],[x+side*.04,.53,15.5-(i%3)]],i%2?'#d5e5ea':'#acbdcc',.24);}
    // Broad irregular brim and a bent, ridged cone. High point remains below 29.
    for(let i=0;i<32;i++){
      const a=i*Math.PI/16,b=(i+1)*Math.PI/16;
      face([[.5,.32,23],[.5+Math.cos(a)*.4,.32+Math.sin(a)*.3,23+Math.cos(a)+Math.sin(a)],[.5+Math.cos(b)*.4,.32+Math.sin(b)*.3,23+Math.cos(b)+Math.sin(b)]],i%3?'#8e9eaf':'#a8b7c3');
    }
    turned(.5,.32,[[23,.24,.21],[25,.17,.15],[27,.1,.09],[28,.045,.04]],'#a6b4bf');
    tube([.5,.32,27.5],[.6,.34,28.7],.7,'#a6b4bf',.12);
    for(const z of [23.8,25.2,26.5])turned(.5,.32,[[z,.2-(z-23.8)*.042,.175-(z-23.8)*.036],[z+.14,.2-(z-23.8)*.042,.175-(z-23.8)*.036]],'#7f90a1');
  }else if(id==='figure-wolf'){
    // Split stance, wrapped shins and sandals.
    tube([.43,.48,12],[.36,.5,7],1.35,'#655e56');tube([.36,.5,7],[.32,.58,3.8],.85,'#b5ac96');
    tube([.56,.46,12],[.64,.38,7.2],1.3,'#63594f');tube([.64,.38,7.2],[.69,.38,3.7],.8,'#aaa58f');
    for(const [x,y]of [[.32,.58],[.69,.38]]){box(x-.065,y-.04,3,.13,.2,.9,'#403f3e');for(let z=4.5;z<7;z+=.55)turned(x,y,[[z,.044,.047],[z+.15,.044,.047]],'#d3c6a9');}
    turned(.5,.46,[[11,.14,.12],[15,.15,.13],[19,.18,.12],[20,.13,.11]],'#534e48');
    // Asymmetric rust coat tails, lapels, frayed cloth and rope belt.
    face([[.32,.57,19],[.46,.58,19],[.43,.66,10],[.27,.65,8],[.3,.6,14]],color);
    face([[.54,.58,19],[.68,.55,19],[.73,.52,8],[.61,.6,9],[.56,.62,14]],color);
    face([[.32,.35,19],[.67,.35,19],[.73,.33,9],[.62,.29,7],[.52,.31,9],[.35,.29,8]],color);
    for(let i=0;i<6;i++)seam([[.33+i*.055,.333,18],[.35+i*.055,.315,10+i%2]],'#8f5e43',.09);
    turned(.5,.46,[[13.2,.168,.145],[14,.168,.145]],'#b6a487');
    tube([.48,.62,13.6],[.55,.69,10.5],.25,'#d1c0a2');
    // Left prosthetic: wooden upper arm, metal pivots, cords and articulated fingers.
    tube([.32,.46,18.6],[.22,.57,15.6],.9,'#85796b');ellipsoid(.22,.57,15.6,.052,.055,.65,'#a9a69a');
    tube([.22,.57,15.6],[.25,.72,12.2],.65,'#867b69');
    seam([[.3,.5,18],[.19,.59,15.6],[.23,.75,12.6]],'#d3c2a3',.16);
    for(let i=0;i<4;i++)tube([.22+i*.022,.73,12.5],[.22+i*.022,.79,11.8],.13,'#b9b8a9');
    tube([.67,.47,18.5],[.74,.59,15],1,color);tube([.74,.59,15],[.7,.71,12.7],.65,'#c0b59e');
    // Scabbard behind the belt; Kusabimaru held at a rising diagonal.
    tube([.4,.3,13],[.2,.23,5],.3,'#3e3c3e');
    tube([.7,.72,11.8],[.75,.72,15],.38,'#47403c');
    tube([.68,.72,14.8],[.82,.72,14.8],.23,'#c8a56e');
    face([[.75,.72,15],[.88,.72,26],[.91,.72,27],[.9,.72,24],[.78,.72,15]],'#d4dce0');
    seam([[.78,.723,15],[.9,.723,26]],'#f1ece0',.07);
    head('#b9a18a');
    // Hairline, topknot and signature pale scar/streak.
    turned(.5,.48,[[24,.11,.095],[26,.09,.085],[26.4,.06,.06]],'#353536');
    tube([.5,.45,26],[.48,.34,28.3],.7,'#373738',.42);
    seam([[.43,.53,26],[.432,.578,24.3],[.45,.59,22.6]],'#d2d0c0',.2);
    faceMark(.457,.591,23.6,.025,.22,'#3c3834');faceMark(.53,.589,23.6,.025,.22,'#3c3834');
    seam([[.48,.599,23.2],[.47,.598,21.8]],'#dfc3a3',.08);
    // Wrapped scarf with a long wind-swept end.
    turned(.5,.46,[[19.3,.17,.14],[20.7,.17,.14]],'#c7bba4');
    face([[.61,.36,20],[.73,.35,19.5],[.91,.29,17],[.81,.32,16.7],[.66,.36,18]],'#d3c8b2');
    seam([[.35,.58,20],[.49,.61,19.7],[.65,.58,20]],'#938e80',.13);
  }else if(id==='figure-agent'){
    // SAS silhouette: hood and dual-lens respirator, rather than an anonymous blue block.
    for(const[x,y]of [[.38,.55],[.62,.43]]){
      tube([x,.48,12],[x,y,7.3],1.25,color);tube([x,y,7.3],[x,y,3.8],1,color);
      box(x-.065,y-.04,3,.15,.21,1.3,'#252a31');box(x-.056,y+.047,6.8,.112,.055,1.65,'#333d48');
      box(x-.065,y-.02,9.3,.13,.06,1.5,'#556779');
    }
    turned(.5,.46,[[11,.15,.12],[16,.19,.14],[20,.17,.12]],color);
    // Back plate, radio and antenna.
    box(.365,.25,13,.27,.09,6,'#35424f');box(.64,.33,17,.075,.07,2.4,'#252b33');
    tube([.675,.36,19],[.675,.36,23],.1,'#1f2730');
    // Tactical vest, shoulder webbing and individual magazine pouches.
    box(.345,.565,13,.31,.075,6,'#3f505e');
    for(const x of [.36,.47,.58]){box(x,.645,13.3,.085,.06,2.6,'#63717b');faceMark(x+.01,.708,15.1,.065,.18,'#2e3942');}
    for(const x of [.36,.6])box(x,.59,16,.035,.045,4,'#a0a69e');
    faceMark(.43,.648,17.7,.14,.7,'#a5ada9');
    for(let z=16;z<17.6;z+=.45)faceMark(.4,.649,z,.2,.1,'#7b8b92');
    tube([.32,.46,19],[.25,.58,15.8],1,color);tube([.25,.58,15.8],[.42,.77,15.1],.85,color);
    tube([.68,.46,19],[.77,.6,15.3],1,color);tube([.77,.6,15.3],[.64,.77,14],.85,color);
    ellipsoid(.42,.77,15.1,.055,.06,.65,'#2b3239');ellipsoid(.64,.77,14,.055,.06,.65,'#2b3239');
    // Compact display rifle across the chest (decorative model).
    tube([.3,.81,13],[.8,.81,19.5],.5,'#272e35');tube([.79,.81,19.5],[.91,.81,21],.2,'#202930');
    box(.48,.79,14.7,.09,.06,2,'#343f45');tube([.53,.81,15.7],[.47,.82,13.5],.35,'#39444c');
    // Hood, reinforced helmet and ear protection.
    ellipsoid(.5,.48,23,.135,.115,3.2,'#303a45');
    turned(.5,.47,[[24,.15,.14],[26,.145,.13],[27.6,.1,.1],[28.2,.03,.03]],color);
    turned(.5,.47,[[24,.158,.145],[24.5,.158,.145]],'#27343f');
    for(const x of [.35,.65])ellipsoid(x,.49,23.6,.035,.085,1.3,'#566571');
    ellipsoid(.5,.594,22,.1,.035,1.5,'#262f37');
    for(const x of [.447,.553]){ellipsoid(x,.604,23.4,.047,.025,.7,'#121e28');ellipsoid(x,.627,23.5,.03,.012,.42,'#8ba7b3');}
    ellipsoid(.5,.64,21.7,.052,.05,.65,'#58636a');
    for(let x=.47;x<.54;x+=.02)faceMark(x,.691,21.35,.008,.7,'#222f36');
    tube([.65,.55,23],[.64,.66,21.9],.14,'#8b999d');
  }else{
    // Weathered carved idol in a seated pose with crossed legs and prayer hands.
    ellipsoid(.5,.5,5,.3,.23,2,'#6b7774');
    tube([.27,.62,6],[.65,.5,8],1.6,'#7f928b');tube([.73,.62,6],[.36,.5,8],1.6,'#8d9f94');
    turned(.5,.45,[[7,.19,.17],[12,.16,.13],[17,.13,.12]],'#879a8e');
    for(let i=0;i<6;i++)seam([[.34+i*.045,.595,15],[.3+i*.065,.62,8]],'#586f65',.1);
    tube([.35,.47,15],[.31,.62,12],.8,'#95a897');tube([.31,.62,12],[.48,.67,14],.6,'#95a897');
    tube([.65,.47,15],[.69,.62,12],.8,'#95a897');tube([.69,.62,12],[.52,.67,14],.6,'#95a897');
    ellipsoid(.5,.45,19.3,.12,.1,2.5,'#9bab99');ellipsoid(.5,.45,22,.055,.05,.8,'#7e9486');
    for(const x of [.45,.52])faceMark(x,.548,19.5,.035,.13,'#4c665a');
    seam([[.42,.54,20.6],[.46,.55,19],[.44,.56,17.8]],'#536d5e',.08);
    for(let i=0;i<7;i++){const a=Math.PI+i*Math.PI/6,x=.5+Math.cos(a)*.32,y=.45+Math.sin(a)*.21;
      face([[x-.035,y,6],[x-.065,y,14],[x+.01,y,26-i%3*2],[x+.065,y,15],[x+.03,y,8]],color);
      face([[x-.012,y+.005,8],[x+.01,y+.005,20-i%3],[x+.025,y+.005,12]],'#d1f4e5');
    }
  }
  return true;
}

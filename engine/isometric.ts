import {precipitation} from '@/domain/snow';
import { seasonPalette, type Season } from '@/domain/season';
import { seasonalTrees, seasonalParticles, snowDrifts } from './season-art';
import { rainDrop } from '../domain/rain';
import { lightningPath } from '../domain/storm';
import type { RoomMotion } from '../domain/motion';
import {SPECTRUM_BANDS} from '../domain/live-details';
import type { Resident } from '../domain/resident';
import {residentBehindFurniture} from '../domain/resident';
import type { ResidentLook } from '../domain/resident-look';
import { drawResident } from './resident-art';
import { eveningBackdrop, eveningDesk, livingClock } from './evening-atmosphere';
import { defaultAccentLights, type AccentLights } from '../domain/accent-lights';
import { materialColor } from '../domain/furniture-color';
import { appearanceOf, defaultAppearance, type Appearance } from '../domain/appearance';
import { studioLayout } from '@/domain/studio-layout';
import {gamingMiniature,gamingPoster} from './gaming-art';
import { roomLight, litColor, windowExposure, furnitureHeight, SUN_TRAVEL, LIGHT_UNIT, type RoomLight, type Vec3 } from './room-light';
import {
  dimensions,
  productOf,
  resolveItems,
  decorHeight,
  type WorldItem,
  type Item,
  type Product,
} from "../domain/model";

export const SCENE = {
  width: 1040,
  height: 850,
  ox: 430,
  oy: 300,
  ux: 23,
  uy: 12,
};
export type Point = [number, number];
export function project(x: number, y: number, z = 0): Point {
  return [SCENE.ox + (x - y) * SCENE.ux, SCENE.oy + (x + y) * SCENE.uy - z];
}
export function unproject(x: number, y: number): Point {
  const a = (x - SCENE.ox) / SCENE.ux,
    b = (y - SCENE.oy) / SCENE.uy;
  return [(a + b) / 2, (b - a) / 2];
}
export type Hit = { id: string; path: Path2D };
type Paint = string | CanvasGradient;
type V = [number, number, number];
const shade = (hex: string, n: number) => {
  const rgb = hex
    .replace("#", "")
    .match(/../g)!
    .map((v) => Math.max(0, Math.min(255, parseInt(v, 16) + n)));
  return `rgb(${rgb.join(",")})`;
};
export function polygon(
  g: CanvasRenderingContext2D,
  points: Point[],
  color: Paint,
  stroke?: string,
) {
  const p = new Path2D();
  points.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  g.fillStyle = color;
  g.fill(p);
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = 0.7;
    g.stroke(p);
  }
  return p;
}
function glow(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) {
  const light = g.createRadialGradient(x, y, 0, x, y, r);
  light.addColorStop(0, color);
  light.addColorStop(1, "transparent");
  g.fillStyle = light;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}
function line(
  g: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  color: string,
  width = 1,
) {
  g.beginPath();
  g.moveTo(...a);
  g.lineTo(...b);
  g.strokeStyle = color;
  g.lineWidth = width;
  g.stroke();
}
function room(g: CanvasRenderingContext2D, appearance?: Appearance, daylight = 0, raining = false, season:Season='summer', demoSky?: 'morning'|'evening'|'night') {
  const colors = appearanceOf(appearance);
  const custom = !!appearance && Object.keys(defaultAppearance).some(key => colors[key as keyof Appearance] !== defaultAppearance[key as keyof Appearance]);
  const p = project;
  // Ambient bounce and the thick floating floor slab.
  g.save();
  g.filter = "blur(25px)";
  polygon(
    g,
    [p(-1, 0, -27), p(24, 0, -27), p(24, 16, -27), p(0, 17, -27)],
    "#02020bb3",
  );
  g.restore();
  polygon(g, [p(0, 16), p(24, 16), p(24, 16, -21), p(0, 16, -21)], (custom ? shade(colors.floor, -22) : "#14203e"));
  polygon(g, [p(24, 0), p(24, 16), p(24, 16, -21), p(24, 0, -21)], (custom ? shade(colors.floor, -12) : "#262246"));
  const floor = g.createLinearGradient(350, 300, 670, 780);
  floor.addColorStop(0, (custom ? shade(colors.floor, 5) : "#273550"));
  floor.addColorStop(0.6, (custom ? colors.floor : "#293249"));
  floor.addColorStop(1, (custom ? shade(colors.floor, -15) : "#17263b"));
  polygon(g, [p(0, 0), p(24, 0), p(24, 16), p(0, 16)], floor);
  // Wood planks: subtle grain follows the room, not the screen.
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 24; x += 4) {
      polygon(
        g,
        [p(x, y), p(x + 4, y), p(x + 4, y + 1), p(x, y + 1)],
        (x + y) % 3 === 0 ? "#77839b0a" : "#050d1f0b",
        "#080e232e",
      );
      line(g, p(x + 0.3, y + 0.4), p(x + 3.4, y + 0.4), "#d9c4e007", 0.7);
    }
  }
  const left = g.createLinearGradient(60, 220, 500, 350);
  left.addColorStop(0, (custom ? shade(colors.wallLeft, -28) : "#27396e"));
  left.addColorStop(1, (custom ? colors.wallLeft : "#345995"));
  const right = g.createLinearGradient(440, 70, 940, 520);
  right.addColorStop(0, (custom ? shade(colors.wallRight, -20) : "#995784"));
  right.addColorStop(0.55, (custom ? colors.wallRight : "#bb6a93"));
  right.addColorStop(1, (custom ? shade(colors.wallRight, -55) : "#53446f"));
  polygon(g, [p(0, 16), p(0, 0), p(0, 0, 245), p(0, 16, 245)], left);
  polygon(g, [p(0, 0), p(24, 0), p(24, 0, 245), p(0, 0, 245)], right);
  polygon(
    g,
    [p(-0.5, 16, 245), p(-0.5, -0.5, 245), p(0, 0, 245), p(0, 16, 245)],
    (custom ? shade(colors.wallLeft, 26) : "#bf709e"),
  );
  polygon(
    g,
    [p(-0.5, -0.5, 245), p(24, -0.5, 245), p(24, 0, 245), p(0, 0, 245)],
    (custom ? shade(colors.wallRight, 35) : "#e09ab8"),
  );
  polygon(
    g,
    [p(0, 16), p(-0.5, 16), p(-0.5, 16, 245), p(0, 16, 245)],
    (custom ? shade(colors.wallLeft, -10) : "#8c568a"),
  );
  polygon(
    g,
    [p(24, 0), p(24, -0.5), p(24, -0.5, 245), p(24, 0, 245)],
    (custom ? shade(colors.wallRight, -10) : "#ab7196"),
  );
  line(g, p(0, 16, 9), p(0, 0, 9), (custom ? shade(colors.wallLeft, -40) : "#1d2351"), 9);
  line(g, p(0, 0, 9), p(24, 0, 9), (custom ? shade(colors.wallRight, -38) : "#75476f"), 9);
  line(g, p(0, 16, 229), p(0, 0, 229), (custom ? colors.wallLeft + "80" : "#f4a2dc80"), 3);
  line(g, p(0, 0, 229), p(24, 0, 229), (custom ? colors.wallRight + "b0" : "#ffc3dfb0"), 3);
  // Recessed panoramic window and a distant city, each pane on the wall plane.
  polygon(
    g,
    [
      p(13.3, 0.15, 36),
      p(22.7, 0.15, 36),
      p(22.7, 0.15, 220),
      p(13.3, 0.15, 220),
    ],
    "#614665",
  );
  const sky = g.createLinearGradient(750, 230, 750, 490);
  const skyDay = demoSky ? demoSky!=='night' : !!daylight;
  const dusk = demoSky==='evening';
  sky.addColorStop(0, dusk ? (raining ? "#68647d" : "#80647e") : raining ? (skyDay ? "#637b91" : "#101a2b") : skyDay ? seasonPalette[season].sky : "#11162f");
  sky.addColorStop(0.52, dusk ? (raining ? "#b094a1" : "#e6a28d") : raining ? (skyDay ? "#a1b6c4" : "#26344a") : skyDay ? "#c8e7ef" : "#293354");
  sky.addColorStop(1, dusk ? "#f1c7a4" : raining ? (skyDay ? "#cad4d8" : "#536478") : skyDay ? seasonPalette[season].horizon : ({spring:"#645575",summer:"#64688c",autumn:"#736073",winter:"#63798f"}[season]));
  polygon(
    g,
    [
      p(13.6, 0.25, 42),
      p(22.4, 0.25, 42),
      p(22.4, 0.25, 215),
      p(13.6, 0.25, 215),
    ],
    sky,
  );
  // Celestial detail remains behind the window frame and city silhouette.
  if (!raining) {
  const [sunX,sunY]=p(20.4,0.28,dusk?100:176);
  g.save();g.fillStyle=skyDay?'#fff4cd':'#dce8ff';g.beginPath();g.arc(sunX,sunY,skyDay?15:11,0,Math.PI*2);g.fill();
  if(!skyDay){
    g.fillStyle='#293354';g.beginPath();g.arc(sunX+5,sunY-4,9,0,Math.PI*2);g.fill();
    for(let i=0;i<14;i++){const [sx,sy]=p(14.1+(i*1.37)%7.5,0.28,130+(i*19)%75);g.fillStyle='#dae6ffbb';g.fillRect(sx,sy,i%3===0?2:1,1.5);}
  }
  g.restore();
  }
  for (let i = 0; i < 17; i++) {
    const x = 13.65 + i * 0.51,
      z = 48 + ((i * 37) % 62);
    polygon(
      g,
      [p(x, 0.3, 43), p(x + 0.43, 0.3, 43), p(x + 0.43, 0.3, z), p(x, 0.3, z)],
      daylight ? (i % 2 ? "#829fb3" : "#718d9e") : (i % 2 ? "#252e4b" : "#333d5a"),
    );
    for (let j = 50; j < z - 6; j += 12)
      line(g, p(x + 0.12, 0.32, j), p(x + 0.25, 0.32, j), daylight ? "#b6cad5" : "#ffce8b", 2);
  }
  seasonalTrees(g,p,season,daylight);
  for (const x of [13.5, 17.9, 22.5])
    line(g, p(x, 0.4, 40), p(x, 0.4, 218), "#e3b4cc", 5);
  line(g, p(13.5, 0.4, 115), p(22.5, 0.4, 115), "#d7a8c7", 4);
  polygon(
    g,
    [p(13, 0.2, 37), p(23, 0.2, 37), p(23, 1, 37), p(13, 1, 37)],
    "#bfa5cc",
  );
  polygon(
    g,
    [p(13, 0.2, 37), p(23, 0.2, 37), p(23, 0.2, 29), p(13, 0.2, 29)],
    "#795c88",
  );
  // Transparent reflections and two shafts of light through the glass.
  polygon(
    g,
    [p(14, 0.5, 200), p(15.3, 0.5, 215), p(18.5, 0.5, 55), p(17.2, 0.5, 42)],
    "#f6e6f11c",
  );
  // Architectural wall shelving: no floor footprint or inventory collision.
  for (const z of [133, 190]) {
    polygon(
      g,
      [p(0.1, 2.2, z), p(0.1, 8.5, z), p(0.9, 8.5, z), p(0.9, 2.2, z)],
      "#463d59",
    );
    polygon(
      g,
      [p(0.9, 2.2, z), p(0.9, 8.5, z), p(0.9, 8.5, z - 6), p(0.9, 2.2, z - 6)],
      "#252c48",
    );
    for (let i = 0; i < 13; i++) {
      const y = 2.5 + i * 0.42,
        h = 24 + ((i * 7) % 17),
        c = ["#dd9e71", "#7f90b9", "#b76c8b", "#d6c6b2", "#6475a0"][i % 5];
      polygon(
        g,
        [
          p(0.15, y, z),
          p(0.15, y + 0.3, z),
          p(0.15, y + 0.3, z + h),
          p(0.15, y, z + h),
        ],
        shade(c, 20),
      );
      polygon(
        g,
        [
          p(0.15, y + 0.3, z),
          p(0.75, y + 0.3, z),
          p(0.75, y + 0.3, z + h),
          p(0.15, y + 0.3, z + h),
        ],
        c,
      );
      polygon(
        g,
        [
          p(0.15, y, z + h),
          p(0.75, y, z + h),
          p(0.75, y + 0.3, z + h),
          p(0.15, y + 0.3, z + h),
        ],
        shade(c, 40),
      );
      line(
        g,
        p(0.76, y + 0.31, z + 6),
        p(0.76, y + 0.31, z + h - 5),
        "#f7dfbc70",
        1,
      );
    }
  }
  polygon(
    g,
    [p(0.1, 11, 92), p(0.1, 14.3, 92), p(0.1, 14.3, 170), p(0.1, 11, 170)],
    "#171e37",
  );
  polygon(
    g,
    [
      p(0.16, 11.2, 97),
      p(0.16, 14.1, 97),
      p(0.16, 14.1, 165),
      p(0.16, 11.2, 165),
    ],
    "#8e82ad",
  );
  polygon(
    g,
    [
      p(0.2, 11.2, 100),
      p(0.2, 14.1, 100),
      p(0.2, 14.1, 132),
      p(0.2, 13.2, 145),
      p(0.2, 12.5, 124),
    ],
    "#454d86",
  );
  glow(g, ...p(21, 1, 120), 120, daylight ? "#ffe2ad45" : "#8fb5f522");
}

function furniture(g: CanvasRenderingContext2D, item: Item, motion?: RoomMotion, lighting?: RoomLight, shelfLayer?:number, accentLights:AccentLights=defaultAccentLights): Path2D {
  const elevation=(item as WorldItem).elevation??0;
  const product = productOf(item),
    { w, h } = product,
    d = dimensions(product, item.rotation),
    ix = item.x!,
    iy = item.y!;
  const world = (x: number, y: number, z: number): Vec3 => {
    const r = ((item.rotation % 360) + 360) % 360;
    const [a, b] =
      r === 90
        ? [h - y, x]
        : r === 180
          ? [w - x, h - y]
          : r === 270
            ? [y, w - x]
            : [x, y];
    return [(ix+a)*LIGHT_UNIT,(iy+b)*LIGHT_UNIT,z+elevation];
  };
  const transform = (x:number,y:number,z:number):Point => { const v=world(x,y,z);return project(v[0]/LIGHT_UNIT,v[1]/LIGHT_UNIT,v[2]); };
  const shapes: { points: V[]; color: Paint; depth: number }[] = [];
  const face = (points: V[], color: Paint, emissive = false) => {
    const center = points.reduce(
      (a, p) => [
        a[0] + p[0] / points.length,
        a[1] + p[1] / points.length,
        a[2] + p[2] / points.length,
      ],
      [0, 0, 0],
    );
    const screen = transform(center[0], center[1], 0);
    if(lighting && !emissive && typeof color==='string') {
      const vertices=points.slice(0,3).map(v=>world(...v));
      const a=vertices[1].map((v,i)=>v-vertices[0][i]),b=vertices[2].map((v,i)=>v-vertices[0][i]);
      const cross:Vec3=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
      const length=Math.hypot(...cross)||1;
      color=litColor(color,world(center[0],center[1],center[2]),cross.map(v=>v/length) as Vec3,lighting,item.id);
    }
    shapes.push({ points, color, depth: screen[1] + center[2] * (product.kind==='collectible'?.5:.005) });
  };
  const box = (
    x: number,
    y: number,
    z: number,
    a: number,
    b: number,
    height: number,
    color: string,
    emissive = false,
  ) => {
    const corners: V[] = [
      [x, y, z],
      [x + a, y, z],
      [x + a, y + b, z],
      [x, y + b, z],
    ];
    for (let i = 0; i < 4; i++) {
      const u = corners[i],
        v = corners[(i + 1) % 4];
      const pu = transform(...u),
        pv = transform(...v);
      // Visible side faces in screen space, including all four object rotations.
      if (pv[0] < pu[0])
        face(
          [u, v, [v[0], v[1], z + height], [u[0], u[1], z + height]],
          lighting ? color : shade(color, pv[1] > pu[1] ? -35 : -18), emissive,
        );
    }
    face(
      corners.map(([a, b]) => [a, b, z + height]),
      lighting ? color : shade(color, 18), emissive,
    );
  };
  // Lathed silhouettes keep rounded objects in the same world and lighting model.
  const turned = (cx:number,cy:number,rings:[number,number,number][],color:string,emissive=false) => {
    const segments=24;
    for(let j=1;j<rings.length;j++) {
      const [z0,rx0,ry0]=rings[j-1], [z1,rx1,ry1]=rings[j];
      for(let i=0;i<segments;i++) {
        const a=i*Math.PI*2/segments,b=(i+1)*Math.PI*2/segments;
        const u:V=[cx+Math.cos(a)*rx0,cy+Math.sin(a)*ry0,z0];
        const v:V=[cx+Math.cos(b)*rx0,cy+Math.sin(b)*ry0,z0];
        if(transform(...v)[0]>=transform(...u)[0])continue;
        face([u,v,[cx+Math.cos(b)*rx1,cy+Math.sin(b)*ry1,z1],[cx+Math.cos(a)*rx1,cy+Math.sin(a)*ry1,z1]],
          lighting ? color : shade(color,Math.round(Math.cos(a+.7)*16)-10),emissive);
      }
    }
    const [z,rx,ry]=rings[rings.length-1];
    face(Array.from({length:segments},(_,i):V=>[cx+Math.cos(i*Math.PI*2/segments)*rx,cy+Math.sin(i*Math.PI*2/segments)*ry,z]),lighting?color:shade(color,15),emissive);
  };
  const tint = (original: string, offset = 0) => materialColor(item.color, original, offset);
  const wood = tint("#66506b"),
    metal = "#30354e",
    fabric = tint(product.color);
  const shadow = [
    project(ix + 0.2, iy + 0.2),
    project(ix + d.w + 0.65, iy + 0.35),
    project(ix + d.w + 0.9, iy + d.h + 0.65),
    project(ix + 0.6, iy + d.h + 0.65),
  ];
  if(!lighting && product.kind!=='collectible') { g.save();
  g.filter = "blur(6px)";
  polygon(g, shadow, "#06091875");
  g.restore(); }
  switch (product.kind) {
    case "books":
      box(.05,.12,0,.88,.72,3,fabric);
      box(.09,.14,3,.82,.67,1.7,"#e6d9bd");
      box(.1,.07,4.7,.78,.84,2.8,"#bb8b77");
      box(.13,.08,7.5,.72,.8,1.5,"#efe2ca");
      box(.08,.13,9,.84,.7,3,tint(product.color,15));
      break;
    case "armchair": {
      const frame="#88644e";
      for(const x of [.32,2.44])for(const y of [.4,2.4])box(x,y,0,.22,.22,17,frame);
      box(.18,.25,14,2.64,2.5,12,tint(product.color,-20));
      box(.18,.18,25,2.64,.5,45,fabric);
      box(.35,.7,27,2.3,1.92,10,tint(product.color,8));
      for(const x of [.08,2.45])box(x,.55,25,.47,2.18,23,fabric);
      box(.65,.73,37,1.55,.4,24,"#879789");
      // Piping and a folded throw on the right arm.
      box(.4,2.58,32,2.2,.035,1,tint(product.color,-24));
      box(2.43,1.3,49,.51,.85,2,"#a49bb8");
      box(2.94,1.3,26,.025,.85,25,"#9386a8");
      break;
    }
    case "coffee-table":
      for(const x of [.35,2.4])for(const y of [.35,1.4])box(x,y,0,.2,.2,27,"#715743");
      box(.24,.2,10,2.52,1.6,3,tint(product.color,-10));
      turned(1.5,1,[[27,1.48,.98],[31,1.48,.98]],fabric);
      break;
    case "dresser":
      for(const x of [.3,3.45])for(const y of [.3,1.5])box(x,y,0,.18,.18,10,"#4e403b");
      box(.1,.1,10,3.8,1.8,49,fabric);
      for(const z of [12,27,42]) {
        box(.22,1.91,z,3.56,.06,13,tint(product.color,6));
        for(let x=.45;x<3.8;x+=.23)box(x,1.98,z,.025,.012,13,tint(product.color,-14));
        box(1.55,2,z+6,.9,.065,1.7,"#d3b778");
      }
      box(0,0,59,4,2,4,tint(product.color,10));
      break;
    case "ottoman":
      turned(1,1,[[0,.65,.65],[5,.77,.77]],"#655448");
      turned(1,1,[[5,.78,.78],[9,.96,.96],[22,.96,.96],[27,.8,.8],[28,.68,.68]],fabric);
      for(let i=0;i<9;i++) {
        const y=.4+i*.15,span=Math.sqrt(Math.max(0,.66*.66-(y-1)**2));
        face([[1-span,y,28.2],[1+span,y,28.2],[1+span,y+.025,28.2],[1-span,y+.025,28.2]],tint(product.color,-15));
      }
      break;
    case "vase":
      if(product.id==='vase-mini') {
        turned(.5,.5,[[0,.18,.18],[4,.34,.34],[13,.38,.38],[20,.17,.17],[24,.17,.17]],fabric);
        turned(.5,.5,[[24.1,.11,.11],[24.2,.11,.11]],'#454b56');
        break;
      }
      turned(.5,.5,[[0,.2,.2],[5,.34,.34],[22,.4,.4],[31,.22,.22],[39,.18,.18],[40,.22,.22]],fabric);
      turned(.5,.5,[[40.1,.14,.14],[40.2,.14,.14]],"#4c5149");
      for(let i=0;i<3;i++) {
        const dx=(i-1)*.28,z=62+i*5;
        face([[.48,.5,38],[.52,.5,38],[.52+dx,.5,z],[.48+dx,.5,z]],"#8b7a5d");
        for(let j=0;j<4;j++) {
          const zz=46+j*5,x=.5+dx*(zz-38)/(z-38),side=j%2?1:-1;
          face([[x,.5,zz],[x+side*.18,.42,zz+5],[x+side*.24,.48,zz+7],[x+side*.08,.56,zz+5]],j%2?"#9ca98b":"#788c7e");
        }
      }
      break;
    case "desk":
      for (const x of [0.2, w - 0.35])
        for (const y of [0.2, h - 0.35]) box(x, y, 0, 0.15, 0.15, 58, metal);
      box(0, 0, 58, w, h, 7, wood);
      box(w - 0.95, 0.25, 4, 0.7, h - 0.5, 47, tint("#53445d", -15));
      for (const x of [0.4, 2.1]) {
        box(x + 0.55, 0.45, 65, 0.4, 0.45, 3, metal);
        box(x + 0.7, 0.48, 68, 0.09, 0.12, 11, metal);
        box(x, 0.4, 77, 1.45, 0.12, 29, metal);
        face(
          [
            [x + 0.07, 0.535, 79],
            [x + 1.38, 0.535, 79],
            [x + 1.38, 0.535, 104],
            [x + 0.07, 0.535, 104],
          ],
          "#253944", true,
        );
        face(
          [
            [x + 0.1, 0.54, 82],
            [x + 1.1, 0.54, 82],
            [x + 1.1, 0.54, 84],
            [x + 0.1, 0.54, 84],
          ],
          "#9fb8c566", true,
        );
        // Subtle analyser grid, with logarithmic bass-to-treble columns.
        for(let line=0;line<4;line++) {
          const z=86+line*5;
          face([[x+.12,.546,z],[x+1.32,.546,z],[x+1.32,.546,z+.2],[x+.12,.546,z+.2]],'#9fb8c51c',true);
        }
        for(let band=0;band<SPECTRUM_BANDS;band++) {
          const level=motion?.spectrum?.[band] ?? 0;
          const peak=motion?.spectrumPeaks?.[band] ?? level;
          const left=x+.13+band*(1.18/SPECTRUM_BANDS), width=.035, bottom=86, top=bottom+level*16;
          if(level>.008) {
            face([[left,.548,bottom],[left+width,.548,bottom],[left+width,.548,top],[left,.548,top]],
              band<8?'#8bc5bb':band<16?'#a9bddb':'#c4abd5',true);
            if(level>.72)face([[left,.549,bottom+11.52],[left+width,.549,bottom+11.52],[left+width,.549,top],[left,.549,top]],'#e2c398',true);
          }
          if(peak>.015) {
            const z=bottom+peak*16;
            face([[left,.55,z],[left+width,.55,z],[left+width,.55,z+.45],[left,.55,z+.45]],'#e7dfcb',true);
          }
        }
      }
      box(1.1, 1.1, 65, 1.6, 0.5, 2, "#afa6c5");
      for (let x = 1.2; x < 2.6; x += 0.2)
        for (let y = 1.2; y < 1.6; y += 0.16)
          box(x, y, 67, 0.12, 0.1, 0.5, "#514c73");
      box(3.25, 1.25, 65, 0.3, 0.4, 2, "#b9bbd5");
      // Small ceramic cup in the free front corner, clear of keyboard and mouse.
      turned(.38,1.65,[[65,.24,.24],[66,.24,.24]],'#ad927e');
      turned(.38,1.65,[[66,.15,.15],[67,.19,.19],[74,.19,.19],[75,.18,.18]],'#d8c3ab');
      turned(.38,1.65,[[75.1,.145,.145],[75.2,.145,.145]],'#594032');
      box(.55,1.59,69,.12,.12,4,'#d8c3ab');
      break;
    case "chair":
      if(shelfLayer===5) {
        box(0.2,0.2,35,1.6,0.22,38,fabric);
        break;
      }
      box(0.9, 0.8, 0, 0.17, 0.17, 28, metal);
      box(0.15, 0.8, 3, 1.7, 0.15, 3, metal);
      box(0.85, 0.15, 3, 0.15, 1.7, 3, metal);
      box(0.2, 0.3, 28, 1.6, 1.5, 9, fabric);
      box(0.2, 0.2, 35, 1.6, 0.22, 38, fabric);
      box(0.1, 0.6, 39, 0.12, 1, 4, metal);
      box(1.8, 0.6, 39, 0.12, 1, 4, metal);
      break;
    case "bed":
      for (const x of [0.2, w - 0.45])
        for (const y of [0.2, h - 0.45]) box(x, y, 0, 0.25, 0.25, 14, metal);
      box(0, 0, 10, w, h, 19, "#4d3459");
      box(0, 0, 25, w, 0.25, 42, "#5b3c62");
      box(0.12, 0.2, 29, w - 0.24, h - 0.3, 13, tint("#c0a4d0", 28));
      box(0.12, 1.6, 42, w - 0.24, h - 1.7, 3, tint("#9873b3", 0));
      box(0.12, 1.5, 42, w - 0.24, 0.6, 4, tint("#b18ccb", 18));
      box(0.4, 0.4, 43, 1.45, 0.9, 8, tint("#d9c9e4", 62));
      box(2.1, 0.4, 43, 1.45, 0.9, 8, tint("#c6b9db", 45));
      break;
    case "sofa":
      box(0.2, 0.3, 0, w - 0.4, h - 0.5, 15, metal);
      box(0, 0.15, 14, w, h - 0.2, 18, fabric);
      box(0, 0, 28, w, 0.35, 38, fabric);
      box(0, 0.1, 30, 0.45, h - 0.2, 20, fabric);
      box(w - 0.45, 0.1, 30, 0.45, h - 0.2, 20, fabric);
      for (let x = 0.5; x < w - 0.6; x += 1.35)
        box(x, 0.5, 32, 1.25, h - 0.7, 6, fabric);
      box(0.65, 0.4, 39, 1, 0.5, 17, "#b995bc");
      break;
    case "plant": {
      if(product.id==='plant-succulent') {
        turned(.5,.5,[[0,.22,.22],[11,.32,.32],[13,.34,.34]],fabric);
        turned(.5,.5,[[13.1,.27,.27],[13.3,.27,.27]],'#3b3936');
        for(let i=0;i<9;i++) {
          const a=i*Math.PI*2/9,dx=Math.cos(a)*.34,dy=Math.sin(a)*.34;
          face([[.5,.5,14],[.5+dx*.7-dy*.3,.5+dy*.7+dx*.3,24],[.5+dx,.5+dy,26],[.5+dx*.7+dy*.3,.5+dy*.7-dx*.3,20]],i%2?'#93af88':'#658d79');
        }
        break;
      }
      box(0.5, 0.5, 0, 1, 1, 23, tint("#5d4168", 0));
      box(0.42, 0.42, 23, 1.16, 1.16, 4, tint("#9b6e88", 20));
      box(0.53, 0.53, 27, 0.94, 0.94, 1, "#242c3a");
      box(0.95, 0.95, 27, 0.09, 0.09, 48, "#506459");
      for (let i = 0; i < 8; i++) {
        const z = 32 + i * 5,
          a = i * 2.4 + (motion ? Math.sin(motion.time * 1.2 + i * 0.5 + ix) * 0.09 : 0),
          dx = Math.cos(a) * 0.9,
          dy = Math.sin(a) * 0.9;
        face(
          [
            [1, 1, z],
            [1 + dx * 0.6 - dy * 0.35, 1 + dy * 0.6 + dx * 0.35, z + 19],
            [1 + dx * 1.2, 1 + dy * 1.2, z + 13],
            [1 + dx * 0.6 + dy * 0.3, 1 + dy * 0.6 - dx * 0.3, z + 5],
          ],
          i % 2 ? "#738b74" : "#4f756d",
        );
        face(
          [
            [1, 1, z],
            [1 + dx * 1.2, 1 + dy * 1.2, z + 13],
            [1 + dx * 0.6 + dy * 0.3, 1 + dy * 0.6 - dx * 0.3, z + 5],
          ],
          "#3e615d",
        );
      }
      break;
    }
    case "lamp":
      if(product.id==='lamp-table') {
        turned(.5,.5,[[0,.32,.32],[4,.32,.32]],"#9b7e57");
        box(.46,.46,4,.08,.08,23,"#c3a674");
        turned(.5,.5,[[24,.46,.46],[29,.47,.47],[39,.28,.28],[42,.1,.1]],item.on?tint(product.color,12):tint(product.color,-20),item.on);
        break;
      }
      if(product.id==='lamp-petal') {
        turned(1,1,[[0,.6,.6],[4,.6,.6]],"#8f7757");
        box(.96,.96,4,.08,.08,74,"#bea374");
        turned(1,1,[[74,.9,.9],[81,.92,.92],[94,.64,.64],[102,.12,.12]],item.on?tint(product.color,12):tint(product.color,-25),item.on);
        turned(1,1,[[102,.1,.1],[104,.1,.1]],"#b5986b");
        break;
      }
      box(0.1, 0.1, 0, 0.8, 0.8, 4, metal);
      box(0.46, 0.46, 4, 0.08, 0.08, 78, "#a29bb2");
      box(0.04, 0.04, 78, 0.92, 0.92, 25, item.on ? tint("#f3cca3", 12) : tint("#b0a0b3", -12), item.on);
      break;
    case "rug":
      box(0, 0, 0.3, w, h, 1, tint("#84728f", 12));
      box(0.15, 0.15, 1.3, w - 0.3, h - 0.3, 0.3, tint("#b598b4", 38));
      box(0.3, 0.3, 1.6, w - 0.6, h - 0.6, 0.3, tint("#625a7a", 0));
      for (let y = 0.5; y < h - 0.5; y += 0.4)
        box(0.5, y, 2, w - 1, 0.04, 0.1, tint("#9d809d", 24));
      break;
    case "shelf": {
      const frontBack=[90,180].includes(item.rotation),frontLeft=[180,270].includes(item.rotation);
      const board=(level:number)=>box(0,0,[5,38,72,106][level],w,h,4,wood);
      if(shelfLayer===undefined) {
        box(0,0,0,w,.15,110,wood);box(0,0,0,.18,h,110,wood);box(w-.18,0,0,.18,h,110,wood);
        for(let level=0;level<4;level++)board(level);
      } else if(shelfLayer===-1) {
        if(!frontBack)box(0,0,0,w,.15,110,wood);
        box(frontLeft?w-.18:0,0,0,.18,h,110,wood);
      } else if(shelfLayer===4) {
        if(frontBack)box(0,0,0,w,.15,110,wood);
        box(frontLeft?0:w-.18,0,0,.18,h,110,wood);
      } else board(shelfLayer);
      break;
    }
    case "collectible":
      gamingMiniature(product.id,fabric,{box,turned,face});
      break;
    case "art":
      if(product.game){box(0,0,100,w,.2,80,item.color?fabric:metal);break;}
      box(0, 0, 120, w, 0.2, 55, metal);
      face(
        [
          [0.1, 0.21, 124],
          [w - 0.1, 0.21, 124],
          [w - 0.1, 0.21, 171],
          [0.1, 0.21, 171],
        ],
        fabric,
      );
      break;
    case "record":
      box(0.1, 0.1, 0, w - 0.2, h - 0.2, 30, wood);
      box(0, 0, 30, w, h, 7, tint("#927388", 22));
      for (let i = 0; i < 24; i++) {
        const angle = item.on ? motion?.recordAngle ?? 0 : 0,
          a = (i * Math.PI) / 12 + angle,
          b = ((i + 1) * Math.PI) / 12 + angle;
        face(
          [
            [0.85, 0.85, 38],
            [0.85 + Math.cos(a) * 0.65, 0.85 + Math.sin(a) * 0.65, 38],
            [0.85 + Math.cos(b) * 0.65, 0.85 + Math.sin(b) * 0.65, 38],
          ],
          item.on && motion && i >= 2 && i <= 3 ? "#7d738c" : "#20283f",
        );
      }
      box(0.76, 0.76, 38, 0.18, 0.18, 1, item.on ? "#efb796" : "#b0a1b2");
      box(1.65, 0.5, 38, 0.06, 1, 2, "#c4b4c8");
      break;
  }
  // Parts are assembled from structure to upholstery and small details.
  // Sorting their average depth would paint a large tabletop over its keyboard.
  const hit = new Path2D();
  // Tiny sculpted limbs, clothing and equipment need camera-depth ordering.
  if(product.kind==='collectible')shapes.sort((a,b)=>a.depth-b.depth);
  for (const s of shapes) {
    const path = polygon(
      g,
      s.points.map((v) => transform(...v)),
      s.color,
    );
    hit.addPath(path);
  }
  if(product.kind==='art' && product.game && [0,270].includes(item.rotation)) {
    const a=transform(.12,.21,178),b=transform(w-.12,.21,178),c=transform(.12,.21,102);
    g.save();g.transform((b[0]-a[0])/480,(b[1]-a[1])/480,(c[0]-a[0])/640,(c[1]-a[1])/640,a[0],a[1]);
    g.drawImage(gamingPoster(product.id),0,0,480,640);
    if(lighting){
      g.globalCompositeOperation='multiply';
      g.fillStyle=litColor('#ffffff',world(w/2,.21,140),item.rotation===0?[0,1,0]:[1,0,0],lighting,item.id);
      g.fillRect(0,0,480,640);
    }
    g.restore();
  }
  if (product.kind === "desk") {
    g.save();
    g.globalCompositeOperation = "screen";
    const energy=motion?.spectrum ? motion.spectrum.reduce((sum,value)=>sum+value,0)/motion.spectrum.length : 0;
    g.globalAlpha = .3+energy*.65;
    glow(g, ...transform(2, 1, 85), (lighting ? 38 : 50)+energy*9, "#a4c9d93d");
    g.restore();
    eveningDesk(g,transform,motion?.time??0,lighting?.daylight??0,w,h,accentLights);
  }
  if (product.kind === "lamp" && item.on) {
    g.save();
    g.globalCompositeOperation = "screen";
    g.globalAlpha = motion ? 0.9 + Math.sin(motion.time * 1.1) * 0.1 : 1;
    glow(g, ...transform(w/2, h/2, product.id==='lamp-table'?32:85), lighting ? 38 : 105, "#ffc68b50");
    g.restore();
  }
  return hit;
}

function floorLighting(g:CanvasRenderingContext2D,items:Item[],lighting:RoomLight,season:Season='summer') {
  const p=project, floor=new Path2D();
  [p(0,0),p(24,0),p(24,16),p(0,16)].forEach(([x,y],i)=>i?floor.lineTo(x,y):floor.moveTo(x,y));floor.closePath();
  g.save();g.clip(floor);
  // Ambient occlusion: grounded room corners, no dark halo beyond the floor.
  g.save();g.filter='blur(10px)';
  line(g,p(0,16),p(0,0),'#07102066',16);line(g,p(0,0),p(24,0),'#07102055',16);g.restore();
  const beam=lighting.daylight*(lighting.overcast?.035:.32)+(1-lighting.daylight)*.025;
  const windowRgb=seasonPalette[season].beam;
  g.save();g.globalCompositeOperation='screen';g.filter=lighting.overcast?'blur(12px)':'blur(2px)';
  for(const [x1,x2] of [[13.65,17.78],[18.03,22.35]])for(const [z1,z2] of [[43,110],[120,213]]) {
    const cast=(x:number,z:number)=>p(x+z*SUN_TRAVEL[0],z*SUN_TRAVEL[1],.1);
    const gradient=g.createLinearGradient(...cast(x1,z1),...cast(x1,z2));
    gradient.addColorStop(0,`rgba(${windowRgb},${beam*.55})`);gradient.addColorStop(1,`rgba(${windowRgb},${beam})`);
    polygon(g,[cast(x1,z1),cast(x2,z1),cast(x2,z2),cast(x1,z2)],gradient);
  }
  g.restore();
  for(const source of lighting.sources) {
    const x=source.position[0]/LIGHT_UNIT,y=source.position[1]/LIGHT_UNIT,r=source.kind==='lamp'?7:3.5;
    g.save();g.globalCompositeOperation='screen';
    // A circle in world space projects to an ellipse on the floor.
    g.transform(SCENE.ux,SCENE.uy,-SCENE.ux,SCENE.uy,SCENE.ox,SCENE.oy);
    const pool=g.createRadialGradient(x,y,0,x,y,r),alpha=(source.kind==='lamp'?.46:.13)*(1-lighting.daylight*.55);
    const rgb=source.kind==='lamp'?'255,181,99':'88,209,232';
    pool.addColorStop(0,`rgba(${rgb},${alpha})`);pool.addColorStop(.3,`rgba(${rgb},${alpha*.7})`);pool.addColorStop(1,`rgba(${rgb},0)`);
    g.fillStyle=pool;g.fillRect(x-r,y-r,r*2,r*2);g.restore();
  }
  const hull=(points:Point[])=>{
    const sorted=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    const cross=(a:Point,b:Point,c:Point)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    const half=(list:Point[])=>{const out:Point[]=[];for(const point of list){while(out.length>=2&&cross(out[out.length-2],out[out.length-1],point)<=0)out.pop();out.push(point);}out.pop();return out;};
    return [...half(sorted),...half([...sorted].reverse())];
  };
  for(const item of items) {
    const product=productOf(item);if(product.surface!=='floor'||item.parentId||item.x===null||item.y===null)continue;
    const d=dimensions(product,item.rotation),x=item.x,y=item.y,height=Number.isFinite(decorHeight(product))?decorHeight(product):furnitureHeight[product.kind];
    const inset=['lamp','chair','plant'].includes(product.kind)?Math.min(d.w,d.h)*.24:.08;
    const corners:Point[]=[[x+inset,y+inset],[x+d.w-inset,y+inset],[x+d.w-inset,y+d.h-inset],[x+inset,y+d.h-inset]];
    const shadow=(dx:number,dy:number,alpha:number,blur:number)=>{
      const points=hull([...corners,...corners.map(([a,b])=>[a+dx,b+dy] as Point)]);
      g.save();g.filter=`blur(${blur}px)`;polygon(g,points.map(([a,b])=>p(a,b,.1)),`rgba(5,10,24,${alpha})`);g.restore();
    };
    const exposure=windowExposure([(x+d.w/2)*LIGHT_UNIT,(y+d.h/2)*LIGHT_UNIT,height*.6]);
    if(exposure>0)shadow(height*SUN_TRAVEL[0],height*SUN_TRAVEL[1],exposure*lighting.daylight*(lighting.overcast?.025:.13),lighting.overcast?12:8);
    const lamps=lighting.sources.filter(s=>s.kind==='lamp'&&s.id!==item.id).slice(0,3);
    for(const source of lamps) {
      const dx=x+d.w/2-source.position[0]/LIGHT_UNIT,dy=y+d.h/2-source.position[1]/LIGHT_UNIT,distance=Math.hypot(dx,dy);
      if(distance>9||distance<.5)continue;
      const length=Math.min(3,height/36);
      shadow(dx/distance*length,dy/distance*length,(1-distance/9)*.12/Math.sqrt(lamps.length)*(1-lighting.daylight*.5),10+distance*.6);
    }
    // Tight contact shadow remains attached even when direct light disappears.
    shadow(0,0,.17,3);shadow(.08,.08,.08,7);
  }
  g.restore();
}

const floorLayers = new WeakMap<HTMLCanvasElement,{key:string;canvas:HTMLCanvasElement}>();
const roomBackgrounds = new WeakMap<HTMLCanvasElement, {key:string; night:HTMLCanvasElement; evening:HTMLCanvasElement; day:HTMLCanvasElement}>();
export function renderRoom(
  canvas: HTMLCanvasElement,
  items: Item[],
  selected: string | null,
  editing: boolean,
  invalid: boolean,
  appearance?: Appearance,
  motion?: RoomMotion,
  daylight = 0,
  raining = false,
  storming = false,
  flash = 0,
  lightningSeed = 0,
  resident?: Resident,
  residentLook?: ResidentLook,
  accentLights: AccentLights = defaultAccentLights,
  renderScale = 2,
  season: Season = 'summer',
  snowIntensity = 50,
  snowDepth = .2,
  demoSky?: 'morning'|'evening'|'night',
) {
  daylight=Math.max(0,Math.min(1,daylight));
  if (canvas.width !== Math.round(SCENE.width * renderScale)) canvas.width = Math.round(SCENE.width * renderScale);
  if (canvas.height !== Math.round(SCENE.height * renderScale)) canvas.height = Math.round(SCENE.height * renderScale);
  const g = canvas.getContext("2d")!;
  g.setTransform(1,0,0,1,0,0);
  g.clearRect(0,0,canvas.width,canvas.height);
  g.save();
  g.scale(renderScale, renderScale);
  const weather=precipitation(season,raining);
  const overcast=raining||storming;
  const key=JSON.stringify([appearance ?? null,overcast,renderScale,season,demoSky]);
  let background=roomBackgrounds.get(canvas);
  if (!background || background.key!==key) {
    const layer=(light:number,sky=demoSky)=>{const layer=document.createElement('canvas');layer.width=canvas.width;layer.height=canvas.height;
    const context=layer.getContext('2d')!;context.scale(renderScale,renderScale);room(context,appearance,light,overcast,season,sky);return layer;};
    background={key,night:layer(0),evening:layer(.5,demoSky??'evening'),day:layer(1)};roomBackgrounds.set(canvas,background);
  }
  g.drawImage(background.night,0,0,SCENE.width,SCENE.height);
  if(demoSky) {
    g.globalAlpha=daylight;g.drawImage(background.day,0,0,SCENE.width,SCENE.height);
  } else {
    // Three cached plates keep sunset free of the night sky, with continuous fades.
    g.globalAlpha=Math.min(1,daylight/.28);g.drawImage(background.evening,0,0,SCENE.width,SCENE.height);
    g.globalAlpha=Math.max(0,(daylight-.28)/.72);g.drawImage(background.day,0,0,SCENE.width,SCENE.height);
  }
  g.globalAlpha=1;
  // Grade architecture only; furniture receives directional and local light per surface.
  g.save();g.globalCompositeOperation='source-atop';
  const warmth=demoSky?0:Math.max(0,1-Math.abs(daylight-.28)/.28);
  g.fillStyle=`rgba(${8+28*warmth},${15+7*warmth},${35-3*warmth},${(1-daylight)*(.5-warmth*.14)})`;g.fillRect(0,0,SCENE.width,SCENE.height);g.restore();
  if(season==='winter')snowDrifts(g,project,daylight,snowDepth);
  if (raining || flash>0) {
    g.save();
    const panes=new Path2D();
    for(const [x1,x2] of [[13.65,17.78],[18.03,22.35]])for(const [z1,z2] of [[43,110],[120,213]]){
      const points=[project(x1,.45,z1),project(x2,.45,z1),project(x2,.45,z2),project(x1,.45,z2)];
      panes.moveTo(...points[0]);for(const point of points.slice(1))panes.lineTo(...point);panes.closePath();
    }
    g.clip(panes);g.fillStyle=daylight>.5?'#7b9caf15':'#334d6f25';g.fillRect(0,0,SCENE.width,SCENE.height);
    for(let i=0;weather==='rain'&&i<85;i++){
      const drop=rainDrop(i,motion?.time??0);
      line(g,project(drop.x,.45,drop.z),project(drop.x-.12,.45,drop.z-drop.length),i%4===0?'#e1f2ffbb':'#c9e6ff65',i%4===0?1.5:.85);
    }
    // Slower beads on the glass sit in front of the distant rain.
    for(let i=0;weather==='rain'&&i<13;i++){
      const x=14+(i*1.57)%7.8,z=54+((i*19.3-(motion?.time??0)*7)%145+145)%145;
      line(g,project(x,.46,z),project(x,.46,z-6),'#def3ff8a',2);
    }
    if(flash>0){
      g.globalAlpha=flash*.38;g.fillStyle='#c8ddff';g.fillRect(0,0,SCENE.width,SCENE.height);
      g.globalAlpha=flash;g.shadowColor='#b8d3ff';g.shadowBlur=15;g.strokeStyle='#f1f6ff';g.lineWidth=2.8;g.lineJoin='round';
      const bolt=lightningPath(lightningSeed);
      g.beginPath();bolt.forEach(([x,z],i)=>{const p=project(x,.4,z);if(i)g.lineTo(...p);else g.moveTo(...p);});g.stroke();
      g.lineWidth=1.2;g.beginPath();g.moveTo(...project(bolt[3][0],.4,bolt[3][1]));g.lineTo(...project(bolt[3][0]+1,.4,bolt[3][1]-9));g.lineTo(...project(bolt[3][0]+.6,.4,bolt[3][1]-28));g.stroke();
    }
    g.restore();
  }
  if (motion && !overcast) {
    // A few particles drift inside the window light, behind the furniture.
    for(let i=0;i<12;i++) {
      const x=14+((i*1.73+motion.time*0.045)%8);
      const z=52+((i*17+motion.time*2.5)%145);
      const [px,py]=project(x,0.5,z);
      g.fillStyle=daylight>.5?'#fff1ce':'#c4d9ff';g.globalAlpha=(0.08+daylight*0.12)*(1+0.5*Math.sin(motion.time+i));
      g.beginPath();g.arc(px,py,1+(i%3)*0.35,0,Math.PI*2);g.fill();
    }
    g.globalAlpha=1;
  }
  if(weather==='snow' || (season!=='winter'&&!overcast))seasonalParticles(g,project,season,motion?.time??0,daylight,snowIntensity);
  eveningBackdrop(g,project,motion?.time??0,daylight,accentLights);
  livingClock(g,project,motion?.wallTime??Date.now(),daylight);
  const worldItems=resolveItems(items);
  const roots = worldItems
    .filter(i=>!i.parentId)
    .filter((i) => i.x !== null && i.y !== null)
    .sort((a, b) => {
      const pa = productOf(a),
        pb = productOf(b),
        da = dimensions(pa, a.rotation),
        db = dimensions(pb, b.rotation);
      return (
        (pa.surface === "rug" ? -1000 : 0) +
        a.x! +
        a.y! +
        (da.w + da.h) / 2 -
        ((pb.surface === "rug" ? -1000 : 0) + b.x! + b.y! + (db.w + db.h) / 2)
      );
    });
  // Draw each tabletop's contents after its surface, retaining room depth order.
  const sorted=roots.flatMap(root=>[root,...worldItems.filter(i=>i.parentId===root.id&&i.x!==null&&i.y!==null).sort((a,b)=>a.x!+a.y!-b.x!-b.y!)]);
  const hits: Hit[] = [];
  const lighting=roomLight(sorted,daylight,overcast);
  for(const item of sorted.filter(i=>productOf(i).surface==='rug'))hits.push({id:item.id,path:furniture(g,item,motion,lighting)});
  const floorKey=JSON.stringify([key,daylight,sorted]);
  let floorLayer=floorLayers.get(canvas);
  if(!floorLayer || floorLayer.key!==floorKey) {
    const layer=floorLayer?.canvas ?? document.createElement('canvas');
    if(layer.width!==canvas.width)layer.width=canvas.width;
    if(layer.height!==canvas.height)layer.height=canvas.height;
    const context=layer.getContext('2d')!;
    context.setTransform(1,0,0,1,0,0);context.clearRect(0,0,layer.width,layer.height);
    context.drawImage(canvas,0,0);context.save();context.scale(renderScale,renderScale);
    floorLighting(context,sorted,lighting,season);context.restore();
    floorLayer={key:floorKey,canvas:layer};floorLayers.set(canvas,floorLayer);
  }
  // Clip cached pixels to the floor: rain, curtains and wall lights stay live.
  g.save();g.beginPath();
  [project(0,0),project(24,0),project(24,16),project(0,16)].forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));
  g.closePath();g.clip();g.drawImage(floorLayer.canvas,0,0,SCENE.width,SCENE.height);g.restore();
  // Placement guides are transient: never bake them into the cached floor.
  if (editing) {
    for (let x = 0; x <= 24; x++)
      line(g, project(x, 0), project(x, 16), "#c3b4e92e");
    for (let y = 0; y <= 16; y++)
      line(g, project(0, y), project(24, y), "#c3b4e92e");
  }
  const drawItem=(item:WorldItem,shelfLayer?:number)=> {
    if (item.id === selected && (shelfLayer===undefined||shelfLayer===-1)) {
      const { w, h } = dimensions(productOf(item), item.rotation),
        x = item.x!,
        y = item.y!;
      const product=productOf(item);
      const z=product.game?100:120,top=product.game?180:175;
      const outline=product.surface==='wall' ? [project(x-.08,.26,z-2),project(x+w+.08,.26,z-2),project(x+w+.08,.26,top+2),project(x-.08,.26,top+2)] : [
          project(x, y, item.elevation),
          project(x + w, y, item.elevation),
          project(x + w, y + h, item.elevation),
          project(x, y + h, item.elevation),
        ];
      polygon(
        g,
        outline,
        invalid ? "#f2808e60" : "#bdb1ff50",
        invalid ? "#ff93a4" : "#dcd4ff",
      );
    }
    if(item.parentId) {
      const d=dimensions(productOf(item),item.rotation),x=item.x!,y=item.y!;
      g.save();g.filter='blur(2px)';polygon(g,[project(x+.12,y+.12,item.elevation+.1),project(x+d.w-.12,y+.12,item.elevation+.1),project(x+d.w-.12,y+d.h-.12,item.elevation+.1),project(x+.12,y+d.h-.12,item.elevation+.1)],'#090a1855');g.restore();
    }
    if(productOf(item).surface!=='rug')hits.push({ id: item.id, path: furniture(g, item, motion, lighting,shelfLayer,accentLights) });
  };
  let residentDrawn = !resident?.visible;
  const occupiedSeat = resident?.seated ? resident.target?.seatId : resident?.pose?.seatId;
  const paintResident = () => { if (resident && !residentDrawn) { drawResident(g, resident, lighting, project, residentLook); residentDrawn = true; } };
  for(const root of roots) {
    if (resident && productOf(root).surface !== 'rug' && residentBehindFurniture(resident,root) && root.id !== occupiedSeat) paintResident();
    if(productOf(root).kind==='shelf') {
      const contents=sorted.filter(i=>i.parentId===root.id);
      drawItem(root,-1);
      for(let level=0;level<4;level++) {
        drawItem(root,level);
        for(const child of contents.filter(i=>(i.supportLevel??0)===level))drawItem(child);
      }
      drawItem(root,4);
    } else {
      drawItem(root);
      for(const child of sorted.filter(i=>i.parentId===root.id))drawItem(child);
    }
    if(root.id === occupiedSeat) {
      paintResident();
      // The near-facing chair back must cover the seated torso, not vice versa.
      if(productOf(root).kind==='chair' && [90,180].includes(root.rotation))furniture(g,root,motion,lighting,5);
    }
  }
  paintResident();
  g.save();
  g.globalCompositeOperation = "screen";
  glow(g, ...project(19, 1, 135), 75, daylight>.5 ? "#ffe6b512" : "#8eb9ef0b");
  g.restore();
  if(flash>0){
    g.save();g.globalCompositeOperation='source-atop';g.fillStyle=`rgba(188,213,255,${flash*.12})`;g.fillRect(0,0,SCENE.width,SCENE.height);g.restore();
  }
  g.restore();
  return hits;
}
export function furniturePreview(product: Product, color?: string | null, rotation=0, size=192) {
  // Fit the rendered object, rather than its floor footprint. Preview-only buffer.
  const source = document.createElement("canvas");
  source.width = source.height = 768;
  const ctx = source.getContext("2d", {willReadFrequently:true})!;
  ctx.translate(384-SCENE.ox,384-SCENE.oy);
  furniture(ctx,{id:"preview",color,productId:product.id,x:0,y:0,rotation,on:true});
  const pixels=ctx.getImageData(0,0,768,768).data;
  let left=768,top=768,right=0,bottom=0;
  for(let y=0;y<768;y++)for(let x=0;x<768;x++){
    if(pixels[(y*768+x)*4+3]<200)continue;
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  const c=document.createElement("canvas");c.width=c.height=size;
  const g=c.getContext("2d")!;
  if(right<left||bottom<top)return c;
  const fit=size*.72/Math.max(right-left+1,bottom-top+1);
  g.translate(size/2,size/2);g.scale(fit,fit);
  g.translate(-(left+right)/2,-(top+bottom)/2);
  // Wall art has no floor shadow in a catalogue thumbnail.
  if(product.kind==='art'){
    g.beginPath();g.rect(left-2,top-2,right-left+5,bottom-top+5);g.clip();
  }
  // Redraw vectors at the fitted scale, keeping small objects sharp.
  g.translate(384-SCENE.ox,384-SCENE.oy);
  furniture(g,{id:"preview",color,productId:product.id,x:0,y:0,rotation,on:true});

  return c;
}
export const showcaseItems: Item[] = [
  ...studioLayout.map((item, i) => ({ ...item, rotation:item.productId==='shelf-books'?0:item.rotation, id: `showcase-${i}` })),
  ...([
    ['armchair-boucle',6,7,0], ['table-tea',10,10,0], ['dresser-walnut',6,1,0],
    ['ottoman-knit',13,13,0], ['vase-branches',3,13,0], ['lamp-petal',7,4,0],
  ] as const).map(([productId,x,y,rotation])=>({id:`showcase-${productId}`,productId,x,y,rotation,on:true})),
  {id:'showcase-table-books',productId:'books-stories',x:1,y:0,rotation:0,on:false,parentId:'showcase-table-tea'},
  {id:'showcase-katana',productId:'relic-katana',x:0,y:0,rotation:0,on:false,parentId:'showcase-table-tea'},
  {id:'showcase-dresser-lamp',productId:'lamp-table',x:3,y:0,rotation:0,on:true,parentId:'showcase-dresser-walnut'},
  {id:'showcase-dresser-vase',productId:'vase-branches',x:0,y:0,rotation:0,on:false,parentId:'showcase-dresser-walnut'},
  ...([['figure-alexander',0,0],['figure-wolf',2,0],['figure-ranni',0,1],['figure-agent',1,1],['relic-rune',0,2],['relic-headset',2,2],['lamp-table',2,3]] as const).map(([productId,x,supportLevel],n)=>({id:`showcase-shelf-decor-${n}`,productId,x,y:0,rotation:0,on:true,parentId:'showcase-4',supportLevel})),
  ...(['figure-idol','relic-trophy'] as const).map((productId,n)=>({id:`showcase-${productId}`,productId,x:n+1,y:0,rotation:0,on:false,parentId:'showcase-dresser-walnut'})),
  ...(['poster-erdtree','poster-ashina','poster-cs2'] as const).map((productId,n)=>({id:`showcase-${productId}`,productId,x:1+n*4,y:0,rotation:0,on:false})),
];

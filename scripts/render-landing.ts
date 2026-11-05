import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {createCanvas,Path2D}=require(process.env.CANVAS_MODULE || '@napi-rs/canvas');
Object.assign(globalThis,{Path2D,document:{createElement:()=>createCanvas(1,1)}});
import {renderRoom} from '../engine/isometric';
import {demoItems,demoAppearance,demoLights,demoDaylight} from '../components/landing-demo-config';
mkdirSync('public/landing',{recursive:true});
for(const time of ['morning','evening','night'] as const)for(const weather of ['clear','rain','snow'] as const){const canvas=createCanvas(1040,850);renderRoom(canvas,demoItems,null,false,false,demoAppearance,undefined,demoDaylight[time],weather!=='clear',false,0,0,undefined,undefined,demoLights,1,weather==='snow'?'winter':'summer',45,.2,time);writeFileSync(`public/landing/${time}-${weather}.webp`,canvas.toBuffer('image/webp',88));}

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {residentArtwork} from '../engine/resident-art';
import {rasterResident,type RasterFace} from '../engine/resident-raster';
import {commandResident,createResident,type ResidentAction} from '../domain/resident';
import {defaultResidentLook,haircuts,outfits} from '../domain/resident-look';
import type {RoomLight} from '../engine/room-light';

const light:RoomLight={daylight:1,overcast:false,blockers:[],sources:[]};
const project=(x:number,y:number,z=0):[number,number]=>[120+(x-y)*23,150+(x+y)*12-z];

test('a new walking command preserves the rendered hands and prop on its first frame',()=>{
  const reading={...createResident([]),time:1,action:'read' as const};
  const before=residentArtwork(reading,light,project);
  const walking=commandResident(reading,[],{cell:{x:10.5,y:8.5}})!;
  assert.equal(walking.action,'walk');
  assert.deepEqual(residentArtwork(walking,light,project),before);
});

test('all haircuts and outfits render from eight directions without mutating saved looks or resident state',()=>{
  for(const hair of haircuts)for(const outfit of outfits)for(let i=0;i<8;i++){
    const body={...createResident([]),x:0,y:0,time:1,facing:i*Math.PI/4};
    const look={...defaultResidentLook,hair:hair.id,outfit:outfit.id,glasses:true,headphones:true};
    const before=JSON.stringify({body,look}),art=residentArtwork(body,light,project,look);
    assert.ok(art.length>100);
    for(const face of art){
      assert.ok(face.points.every(p=>p.every(Number.isFinite)));
      assert.ok(face.rgb.every(c=>Number.isFinite(c)&&c>=0&&c<=255));
      if(face.vertexColors){
        assert.equal(face.vertexColors.length,face.points.length);
        assert.ok(face.vertexColors.flat().every(c=>Number.isFinite(c)&&c>=0&&c<=255));
        // Front surfaces must face the viewer after reflecting the local basis.
        // The wrong sign exposes the back of curved hair and opens holes in cuffs.
        const [a,b,c]=face.points;
        assert.ok((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])<1e-7);
      }
    }
    assert.equal(JSON.stringify({body,look}),before);
  }
});

test('animated poses remain grounded and deterministic, including seated work and rest',()=>{
  for(const action of ['idle','walk','work','read','water','listen','rest'] as const){
    for(const time of [0,.2,.7,1.1,5.75]){
      const body={...createResident([]),x:0,y:0,time,facing:Math.PI/4,action:action as ResidentAction|'idle',
        path:action==='walk'?[{x:1,y:1}]:[],seated:action==='work'||action==='rest'};
      const art=residentArtwork(body,light,project);
      assert.deepEqual(art,residentArtwork(body,light,project));
      const points=art.flatMap(f=>f.points);
      assert.ok(points.every(p=>p[0]>30&&p[0]<210&&p[1]>0&&p[1]<170));
    }
  }
  assert.deepEqual(residentArtwork({...createResident([]),visible:false},light,project),[]);
});

test('smooth shading interpolates vertex colour without changing per-pixel depth ordering',()=>{
  const foreground:RasterFace={points:[[0,0,2],[4,0,2],[0,4,2]],rgb:[0,0,0],vertexColors:[[255,0,0],[0,255,0],[0,0,255]]};
  const behind:RasterFace={...foreground,points:foreground.points.map(p=>[p[0],p[1],1]),vertexColors:undefined,rgb:[255,255,255]};
  const render=(faces:RasterFace[])=>{const pixels=new Uint8ClampedArray(64);rasterResident(faces,4,4,pixels,new Float32Array(16));return pixels;};
  const pixels=render([behind,foreground]);
  assert.deepEqual([...pixels.slice(0,4)],[191,32,32,255]);
  assert.deepEqual(pixels,render([foreground,behind]));
});

test('short hair covers the rounded temples without skin breaking through the crown',()=>{
  const look={...defaultResidentLook,hair:'crop' as const,hairColor:'#a00000',skin:'#00ff00',glasses:false,headphones:false};
  for(let angle=0;angle<8;angle++){
    const facing=angle*Math.PI/4,body={...createResident([]),x:0,y:0,facing,time:0};
    const faces=residentArtwork(body,light,project,look),pixels=new Uint8ClampedArray(240*180*4);
    rasterResident(faces,240,180,pixels,new Float32Array(240*180));
    for(const localX of [-.22,0,.22]){
      const [x,y]=project(-Math.sin(facing)*localX,Math.cos(facing)*localX,52+38+25);
      const offset=(Math.floor(y)*240+Math.floor(x))*4;
      assert.equal(pixels[offset+3],255);
      assert.ok(pixels[offset]>pixels[offset+1],`crown exposes skin at angle ${angle}, x ${localX}`);
    }
  }
});

test('compact room geometry preserves every look with fewer faces than wardrobe detail',()=>{
 const body={...createResident([]),x:0,y:0,time:1,facing:Math.PI/4};
 for(const hair of haircuts)for(const outfit of outfits){
  const look={...defaultResidentLook,hair:hair.id,outfit:outfit.id};
  const full=residentArtwork(body,light,project,look),compact=residentArtwork(body,light,project,look,true);
  assert.ok(compact.length<full.length && compact.length>100);
  assert.ok(compact.every(f=>f.points.flat().every(Number.isFinite)&&f.rgb.every(Number.isFinite)));
 }
});

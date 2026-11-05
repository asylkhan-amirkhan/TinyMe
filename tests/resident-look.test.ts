import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultResidentLook, haircuts, outfits, residentLookOf, readResidentLook, writeResidentLook, residentLookKey } from '../domain/resident-look';
import { rasterResident, type RasterFace } from '../engine/resident-raster';

test('appearance accepts every haircut/outfit and falls back safely for corrupt or partial saves', () => {
  for(const hair of haircuts)for(const outfit of outfits) {
    const look=residentLookOf({hair:hair.id,outfit:outfit.id,headphones:false,glasses:true,topColor:'#AABBCC'});
    assert.equal(look.hair,hair.id);assert.equal(look.outfit,outfit.id);
    assert.equal(look.headphones,false);assert.equal(look.glasses,true);assert.equal(look.topColor,'#aabbcc');
  }
  for(const input of [null,4,'invalid',[],{hair:'invalid',outfit:'invalid',topColor:'url(evil)',skin:'#fff',pantsColor:{},headphones:'false',glasses:1}])
    assert.deepEqual(residentLookOf(input),defaultResidentLook);
  const old={outfit:'knit',shoeColor:'#123456'};
  assert.equal(residentLookOf(old).outfit,'knit');assert.equal(residentLookOf(old).hair,defaultResidentLook.hair);
  assert.deepEqual(old,{outfit:'knit',shoeColor:'#123456'});
});
test('saved looks survive reloads, remain separated by account and report storage failures', () => {
  const data=new Map<string,string>();
  const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
  const look=residentLookOf({hair:'bun',outfit:'jacket',glasses:true,headphones:false,pantsColor:'#596e8d'});
  assert.ok(writeResidentLook(storage,'guest',look));assert.deepEqual(readResidentLook(storage,'guest'),look);
  assert.deepEqual(readResidentLook(storage,'another-user'),defaultResidentLook);
  data.set(residentLookKey('broken'),'{broken');assert.deepEqual(readResidentLook(storage,'broken'),defaultResidentLook);
  assert.equal(writeResidentLook({setItem(){throw Error('quota');}},'guest',look),false);
  assert.deepEqual(readResidentLook({getItem(){throw Error('blocked');}},'guest'),defaultResidentLook);
  assert.deepEqual(readResidentLook(storage,'guest'),look);
});
const square=(z:number,rgb:number[]):RasterFace=>({points:[[0,0,z],[5,0,z],[5,5,z],[0,5,z]],rgb});
function raster(faces:RasterFace[]) {
  const pixels=new Uint8ClampedArray(5*5*4), depth=new Float32Array(25);
  rasterResident(faces,5,5,pixels,depth);return pixels;
}
test('hair in front of a face wins independently of drawing order', () => {
  const face=square(2,[220,170,130]),hair=square(3,[80,50,40]);
  const forward=raster([face,hair]),backward=raster([hair,face]);
  assert.deepEqual(forward,backward);assert.deepEqual([...forward.slice(0,4)],[80,50,40,255]);
});
test('intersecting surfaces use interpolated pixel depth rather than polygon centre', () => {
  const face=square(2,[220,170,130]);
  // Keep the intersection between pixel centres; exactly coincident surfaces are ambiguous.
  const tilted:RasterFace={points:[[0,0,1.1],[5,0,3.1],[5,5,3.1],[0,5,1.1]],rgb:[80,50,40]};
  const result=raster([tilted,face]);
  assert.deepEqual([...result.slice(0,4)],[220,170,130,255]);
  assert.deepEqual([...result.slice(16,20)],[80,50,40,255]);
  assert.deepEqual(result,raster([face,tilted]));
});
test('raster clips offscreen shapes, skips degenerate triangles and clears previous frames', () => {
  const pixels=new Uint8ClampedArray(100).fill(255), depth=new Float32Array(25).fill(100);
  rasterResident([{points:[[-2,-2,1],[-1,-1,1],[0,0,1]],rgb:[255,0,0]}],5,5,pixels,depth);
  assert.ok(pixels.every(v=>v===0));
  const clipped=raster([{points:[[-5,-5,2],[10,-5,2],[10,10,2],[-5,10,2]],rgb:[1,2,3]}]);
  assert.deepEqual([...clipped.slice(-4)],[1,2,3,255]);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gamingCollection} from '../domain/gaming-collection';
import {posterArt,loadPosterArt,subscribePosterArt} from '../engine/poster-assets';

test('every gaming poster has a bundled WebP illustration',()=>{
  const ids=gamingCollection.filter(p=>p.kind==='art').map(p=>p.id).sort();
  assert.deepEqual(Object.keys(posterArt).sort(),ids);
  for(const id of ids){
    const bytes=readFileSync(new URL('../public'+posterArt[id].src,import.meta.url));
    assert.equal(bytes.toString('ascii',0,4),'RIFF');
    assert.equal(bytes.toString('ascii',8,12),'WEBP');
    assert.ok(bytes.length<700_000,'keep individual artwork below 700 KB');
  }
});

test('late poster loads repaint subscribers once, preserve fallback on failure and unsubscribe',()=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'Image');
  const images:Array<{onload:()=>void;onerror:()=>void;src:string}>=[];
  class FakeImage {onload=()=>{};onerror=()=>{};src='';constructor(){images.push(this);}}
  Object.defineProperty(globalThis,'Image',{value:FakeImage,configurable:true});
  let paints=0,draws=0,clears=0;
  const context={save(){},restore(){},setTransform(){},clearRect(){clears++;},drawImage(){draws++;}};
  const canvas={width:960,height:1280,getContext:()=>context} as unknown as HTMLCanvasElement;
  const unsubscribe=subscribePosterArt(()=>paints++);
  try{
    loadPosterArt('poster-erdtree',canvas);loadPosterArt('poster-erdtree',canvas);
    assert.equal(images.length,1);assert.equal(draws,0);assert.equal(clears,0);
    images[0].onload();assert.equal(draws,1);assert.equal(paints,1);
    loadPosterArt('poster-moon',canvas);images[1].onerror();
    assert.equal(draws,1);assert.equal(clears,1);assert.equal(paints,1);
    unsubscribe();loadPosterArt('poster-cs2',canvas);images[2].onload();
    assert.equal(draws,2);assert.equal(paints,1);
  }finally{
    unsubscribe();
    if(original)Object.defineProperty(globalThis,'Image',original);else Reflect.deleteProperty(globalThis,'Image');
  }
});

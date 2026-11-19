import { test } from 'node:test';
import assert from 'node:assert/strict';
import { furniturePreview } from '../engine/isometric';
import { workshopProduct } from '../domain/workshop-catalog';
import type { ItemKind } from '../config/demo';

test('actual furniture preview renders both passes for every workshop template without a static catalogue entry',()=>{
  const originalDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
  const originalPath=Object.getOwnPropertyDescriptor(globalThis,'Path2D');
  const pixels=new Uint8ClampedArray(768*768*4);pixels[(384*768+384)*4+3]=255;
  let canvases=0,paints=0;
  const path=new Proxy({}, {get:()=>()=>{}});
  class FakePath { constructor(){return path;} }
  Object.defineProperty(globalThis,'Path2D',{value:FakePath,configurable:true});
  Object.defineProperty(globalThis,'document',{value:{createElement:()=>{
    canvases++;
    const canvas={width:0,height:0,getContext:()=>context};
    const context=new Proxy({canvas},{get(target,key){
      if(key==='canvas')return target.canvas;
      if(key==='getImageData')return ()=>({data:pixels});
      if(key==='createLinearGradient'||key==='createRadialGradient')return ()=>({addColorStop(){}});
      if(key==='measureText')return ()=>({width:10});
      return ()=>{if(key==='fill'||key==='stroke')paints++;};
    },set:()=>true});
    return canvas;
  }},configurable:true});
  try {
    const kinds:ItemKind[]=['plant','lamp','shelf','armchair','sofa','sculpture','bed','desk','chair'];
    for(const illustration of kinds){
      const product=workshopProduct({id:`new-${illustration}`,title:'Новая вещь',category:'Мебель',width:2,depth:2,price:5,purchasable:true,illustration,color:'#aabbcc'});
      const preview=furniturePreview(product);
      assert.equal(preview.width,192);assert.equal(preview.height,192);
    }
    assert.equal(canvases,kinds.length*2,'both source and fitted canvas are created');
    assert.ok(paints>0,'renderer draws furniture geometry');
  } finally {
    if(originalDocument)Object.defineProperty(globalThis,'document',originalDocument);else Reflect.deleteProperty(globalThis,'document');
    if(originalPath)Object.defineProperty(globalThis,'Path2D',originalPath);else Reflect.deleteProperty(globalThis,'Path2D');
  }
});

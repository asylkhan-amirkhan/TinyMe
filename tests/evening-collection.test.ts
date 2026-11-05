import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { eveningCollection, dimensions, placementError, initialRoom, type Item } from '../domain/model';
import { furnitureHeight, roomLight } from '../engine/room-light';
import { furnitureBaseColor, materialColor } from '../domain/furniture-color';

test('new furniture respects rotated footprints, boundaries and collisions',()=>{
  for(const product of eveningCollection)for(const rotation of [0,90,180,270]) {
    const item:Item={id:'new',productId:product.id,x:5,y:5,rotation,on:true};
    const {w,h}=dimensions(product,rotation);
    assert.equal(placementError([item],item,24-w,16-h,rotation),null,product.id);
    assert.ok(placementError([item],item,25-w,16-h,rotation),product.id);
    assert.ok(placementError([{...item,id:'other'}],item,5,5,rotation),product.id);
    assert.equal(placementError([item],item,5+w,5,rotation),null,product.id);
    assert.ok(furnitureHeight[product.kind]>0);
    assert.equal(furnitureBaseColor(product),product.color);
    assert.notEqual(materialColor('#567f99',product.color),product.color);
  }
});
test('new lamp lights from its footprint centre, and only when switched on and placed',()=>{
  const lamp:Item={id:'petal',productId:'lamp-petal',x:7,y:4,rotation:90,on:true};
  assert.deepEqual(roomLight([lamp],0,false).sources[0].position,[8*24,5*24,86]);
  assert.equal(roomLight([{...lamp,on:false}],0,false).sources.length,0);
  assert.equal(roomLight([{...lamp,x:null,y:null}],0,false).sources.length,0);
});
test('cloud catalogue seed matches all new local prices and footprints',()=>{
  const sql=readFileSync(new URL('../supabase/migrations/20261024081200_quiet_evening_collection.sql',import.meta.url),'utf8');
  for(const p of eveningCollection)assert.ok(sql.includes(`('${p.id}','${p.name}',${p.price},${p.w},${p.h},'${p.surface}')`),p.id);
  assert.equal(initialRoom().items.some(i=>eveningCollection.some(p=>p.id===i.productId)),false);
});

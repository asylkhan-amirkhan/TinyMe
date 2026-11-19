import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readWorkshopProducts, workshopStorageKey, buyWorkshopProduct } from '../domain/workshop-catalog';
import { initialRoom, productOf, placementError, type RoomData } from '../domain/model';
import type { WorkshopItem } from '../domain/workshop';
const item:WorkshopItem={id:'custom-chair',title:'Моё кресло',category:'Мебель',width:2,depth:2,price:5,purchasable:true,illustration:'armchair',color:'#aabbcc'};
const storage=(items:WorkshopItem[])=>({getItem:(key:string)=>key===workshopStorageKey?JSON.stringify({version:1,items,collections:[]}):null});
test('admin item becomes a separately namespaced shop product',()=>{
  const [p]=readWorkshopProducts(storage([item]));
  assert.equal(p.id,'workshop:custom-chair');assert.equal(p.name,item.title);assert.equal(p.w,2);assert.equal(p.price,5);
});
test('only purchasable workshop items appear in the user shop',()=>{
  assert.equal(readWorkshopProducts(storage([{...item,purchasable:false}])).length,0);
  assert.deepEqual(readWorkshopProducts({getItem:()=>null}),[]);
});
test('purchased custom furniture survives reload and catalogue removal',()=>{
  const [p]=readWorkshopProducts(storage([item]));const initial={...initialRoom(),balance:20};
  const bought=buyWorkshopProduct(initial,p,'owned-custom');
  assert.equal(bought.balance,15);assert.equal(initial.balance,20);
  const loaded:RoomData=JSON.parse(JSON.stringify(bought));const own=loaded.items.find(i=>i.id==='owned-custom')!;
  assert.equal(productOf(own).name,item.title);assert.equal(productOf(own).price,5);
  assert.deepEqual(readWorkshopProducts(storage([])),[]);
  assert.equal(productOf(own).w,2);
  assert.equal(placementError([own],own,0,0,0),null);
});
test('catalogue edits affect new purchases without mutating owned furniture',()=>{
  const [p]=readWorkshopProducts(storage([item]));const room=buyWorkshopProduct({...initialRoom(),balance:20},p,'owned');
  const [edited]=readWorkshopProducts(storage([{...item,title:'Новое имя',price:10,width:3}]));
  assert.equal(edited.name,'Новое имя');assert.equal(edited.w,3);assert.equal(productOf(room.items.at(-1)!).w,2);
});
test('insufficient funds and damaged workshop catalogue cannot become successful purchases',()=>{
  const [p]=readWorkshopProducts(storage([item]));assert.throws(()=>buyWorkshopProduct({...initialRoom(),balance:0},p,'owned'),/INSUFFICIENT_FUNDS/);
  assert.throws(()=>readWorkshopProducts({getItem:()=>'{broken'}));
  const bad={...initialRoom().items[0],productId:'workshop:bad',workshopProduct:{...p,id:'workshop:bad',w:-10}};
  assert.throws(()=>productOf(bad));
});

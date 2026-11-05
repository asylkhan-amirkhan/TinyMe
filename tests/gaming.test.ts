import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gamingCollection,games} from '../domain/gaming-collection';
import {placementError,canPlaceOnTop,resolveItems,initialRoom,decorHeight,type Item} from '../domain/model';
import {gamingMiniature,type MiniaturePainter} from '../engine/gaming-art';

test('gaming catalog has five distinct collectibles per game and matches the cloud seed',()=>{
  const sql=readFileSync(new URL('../supabase/migrations/20261024085957_gaming_collection.sql',import.meta.url),'utf8');
  assert.equal(gamingCollection.length,15);
  for(const game of games)assert.equal(gamingCollection.filter(p=>p.game===game).length,5);
  for(const p of gamingCollection){
    assert.ok(sql.includes(`('${p.id}','${p.name}',${p.price},${p.w},${p.h},'${p.surface}')`),p.id);
    if(p.kind==='collectible')assert.ok(sql.includes(`when '${p.id}' then ${p.decorHeight}`));
  }
  assert.equal(initialRoom().items.some(i=>gamingCollection.some(p=>p.id===i.productId)),false);
});
test('every miniature fits all shelf tiers, rotates with its support, and rejects overlaps',()=>{
  const shelf:Item={id:'shelf',productId:'shelf-books',x:6,y:5,rotation:0,on:false};
  for(const p of gamingCollection.filter(p=>p.kind==='collectible'))for(const level of [0,1,2,3])for(const rotation of [0,90,180,270]){
    const parent={...shelf,rotation},item:Item={id:'mini',productId:p.id,x:0,y:0,rotation:0,parentId:'shelf',supportLevel:level,on:false};
    assert.ok(canPlaceOnTop(p));assert.ok(decorHeight(p)<=29);
    assert.equal(placementError([parent,item],item,0,0,0,'shelf',level),null,p.id);
    assert.ok(placementError([parent,{...item,id:'other'}],item,0,0,0,'shelf',level));
    assert.equal(resolveItems([parent,item])[1].rotation,rotation);
    assert.equal(placementError([{...parent,productId:'table-tea'}],item,0,0,0,'shelf',0),null);
  }
});
test('posters require wall positions and cannot be placed on furniture',()=>{
  const shelf:Item={id:'shelf',productId:'shelf-books',x:6,y:5,rotation:0,on:false};
  for(const p of gamingCollection.filter(p=>p.kind==='art')){
    const item:Item={id:p.id,productId:p.id,x:2,y:0,rotation:0,on:false};
    assert.equal(canPlaceOnTop(p),false);
    assert.equal(placementError([],item,2,0,0),null);
    assert.ok(placementError([],item,2,1,0));
    assert.ok(placementError([shelf],item,0,0,0,'shelf',0));
    assert.ok(placementError([{...item,id:'other'}],item,2,0,0));
  }
});
test('miniature geometry stays within declared footprint and shelf clearance',()=>{
  for(const p of gamingCollection.filter(p=>p.kind==='collectible')){
    const vertices:number[][]=[];
    const painter:MiniaturePainter={
      box:(x,y,z,w,d,h)=>{vertices.push([x,y,z],[x+w,y+d,z+h]);},
      turned:(x,y,rings)=>{for(const[z,rx,ry]of rings)vertices.push([x-rx,y-ry,z],[x+rx,y+ry,z]);},
      face:points=>{vertices.push(...points);},
    };
    gamingMiniature(p.id,p.color,painter);
    assert.ok(vertices.length>6,p.id); // More than the shared plinth alone.
    for(const[x,y,z]of vertices){assert.ok(x>=0&&x<=1&&y>=0&&y<=1&&z>=0&&z<=decorHeight(p)+.001,`${p.id}: ${x},${y},${z}`);}
  }
});

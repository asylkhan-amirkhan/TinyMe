import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialRoom, placementError, resolveItems, dimensions, productOf, type Item } from '../domain/model';
import { furnishStudio } from '../domain/studio-layout';
import { dragPlacement, initialPlacement } from '../domain/drag';

test('rotation placement retains the supporting furniture and shelf tier',()=>{
 const support:Item={id:'support',productId:'table-tea',x:8,y:6,rotation:90,on:false};
 const decor:Item={id:'decor',productId:'vase-branches',x:0,y:0,rotation:0,on:false,parentId:support.id,supportLevel:0};
 const placement={...initialPlacement(decor),rotation:90};
 assert.equal(placementError([support,decor],decor,placement.x,placement.y,placement.rotation,placement.parentId,placement.supportLevel),null);
 const before=resolveItems([support,decor])[1];
 const after=resolveItems([support,{...decor,...placement}])[1];
 assert.equal(after.elevation,before.elevation);
 assert.ok(after.elevation>0);
 assert.equal(after.parentId,support.id);
 assert.equal(after.rotation,180);
 assert.equal(initialPlacement({...decor,supportLevel:2}).supportLevel,2);
});
test('furnished room fits without collisions and matches preview', () => {
 const room=initialRoom();
 assert.equal(room.items.length,10);
 for(const item of room.items) assert.equal(placementError(room.items,item,item.x!,item.y!,item.rotation),null,item.productId);
});

test('posters stay flush with the wall and ignore vertical pointer drift',()=>{
 const poster:Item={id:'poster',productId:'poster-malenia',x:5,y:0,rotation:270,on:false};
 assert.deepEqual(dragPlacement(poster,[2,3],[3,4],true),{x:5,y:0,rotation:0});
 assert.deepEqual(dragPlacement(poster,[2,3],[3,2],true),{x:7,y:0,rotation:0});
 assert.equal(dragPlacement(poster,[0,0],[100,-100],true).x,21);
 assert.equal(dragPlacement(poster,[0,0],[-100,100],true).x,0);
 assert.ok(placementError([poster],poster,5,0,270));
 assert.equal(placementError([poster],poster,5,0,0),null);
});

test('old rotated posters display against the wall without mutating saved items',()=>{
 const poster:Item={id:'poster',productId:'poster-malenia',x:23,y:7,rotation:270,on:false};
 const [visible]=resolveItems([poster]);
 assert.equal(visible.x,21);assert.equal(visible.y,0);assert.equal(visible.rotation,0);
 assert.deepEqual(dimensions(productOf(poster),270),{w:3,h:1});
 assert.equal(poster.rotation,270);assert.equal(poster.y,7);
 assert.ok(placementError([poster],{...poster,id:'another'},21,0,0));
 assert.deepEqual(initialPlacement(poster),{x:21,y:0,rotation:0,parentId:null,supportLevel:0});
 const inventory={...poster,x:null,y:null};
 assert.equal(resolveItems([inventory])[0].x,null);
 assert.equal(initialPlacement(inventory).y,0);
});
test('upgrade preserves wallet, time, existing IDs and extra items; never resets rearrangements',()=>{
 const room=initialRoom();
 const extra={...room.items[0],id:'extra'};
 const upgraded=furnishStudio({...room,layoutVersion:undefined,balance:23,activeMs:123456,items:[room.items[0],extra]});
 assert.equal(upgraded.balance,23);assert.equal(upgraded.activeMs,123456);
 assert.equal(upgraded.items[0].id,room.items[0].id);
 assert.equal(upgraded.items.find(i=>i.id==='extra')!.x,null);
 assert.equal(upgraded.items.length,11);
 const moved={...upgraded,items:upgraded.items.map(i=>i.id===room.items[0].id?{...i,x:5,y:1}:i)};
 assert.equal(furnishStudio(moved),moved);
});
test('drag retains grab offset, snaps cells, preserves rotation and constrains wall art',()=>{
 const item=initialRoom().items[1];
 assert.deepEqual(dragPlacement(item,[8.2,3.4],[10.4,2.7]),{x:14,y:3,rotation:180});
 assert.deepEqual(dragPlacement(item,[8,3],[8.2,3.1]),{x:12,y:4,rotation:180});
 assert.equal(dragPlacement(item,[8,3],[10,9],true).y,0);
});

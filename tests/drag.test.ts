import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialRoom, placementError, resolveItems, dimensions, productOf, type Item } from '../domain/model';
import { furnishStudio } from '../domain/studio-layout';
import { availablePlacement, centerWallPlacement, dragPlacement, initialPlacement } from '../domain/drag';

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

test('posters move by fractional wall offsets and stay within the wall',()=>{
 const poster:Item={id:'poster',productId:'poster-malenia',x:5,y:0,rotation:270,on:false};
 const product = productOf(poster);
 assert.deepEqual(centerWallPlacement(product,'right',6.75,149.5),{x:5.25,y:0,rotation:0,parentId:null,supportLevel:0,wallHeight:109.5,wallSide:'right'});
 assert.deepEqual(centerWallPlacement(product,'left',100,-200),{x:13,y:0,rotation:0,parentId:null,supportLevel:0,wallHeight:0,wallSide:'left'});
 assert.deepEqual(centerWallPlacement(product,'left',-100,250),{x:0,y:0,rotation:0,parentId:null,supportLevel:0,wallHeight:165,wallSide:'left'});
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
 assert.deepEqual(initialPlacement(poster),{x:21,y:0,rotation:0,parentId:null,supportLevel:0,wallHeight:100,wallSide:'right'});
 assert.equal(visible.elevation,100);
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
test('floor drag retains grab offset, snaps cells and preserves rotation',()=>{
 const item=initialRoom().items[1];
 assert.deepEqual(dragPlacement(item,[8.2,3.4],[10.4,2.7]),{x:14,y:3,rotation:180});
 assert.deepEqual(dragPlacement(item,[8,3],[8.2,3.1]),{x:12,y:4,rotation:180});
});

test('wall overlap uses both position and the visible height of each frame',()=>{
  const art: Item = { id: 'sun', productId: 'art-sun', x: 5.25, y: 0, rotation: 0, on: false, wallHeight: 20 };
  const other = { ...art, id: 'other' };
  assert.ok(placementError([art],other,5.5,0,0,null,0,74.9));
  assert.equal(placementError([art],other,5.5,0,0,null,0,75),null);
  assert.equal(placementError([art],other,7.25,0,0,null,0,20),null);
  assert.ok(placementError([art],other,5.5,0,0,null,0,191));
  const free = availablePlacement([art], other, initialPlacement(other));
  assert.ok(free);
  assert.equal(placementError([art],other,free.x,free.y,free.rotation,null,0,free.wallHeight),null);
  const [visible] = resolveItems([JSON.parse(JSON.stringify({...art,...free})) as Item]);
  assert.equal(visible.x,free.x);
  assert.equal(visible.elevation,free.wallHeight);
});

test('wall collisions respect the chosen wall, built-in decor, and the inside corner', () => {
  const art: Item = { id: 'sun', productId: 'art-sun', x: 5.25, y: 0, rotation: 0, on: false, wallHeight: 20, wallSide: 'left' };
  const other = { ...art, id: 'other' };
  assert.ok(placementError([art], other, 5.25, 0, 0, null, 0, 20, 'left'));
  assert.equal(placementError([art], other, 5.25, 0, 0, null, 0, 20, 'right'), null);
  assert.ok(placementError([], art, 15, 0, 0, null, 0, 20, 'left'));
  assert.ok(placementError([], art, 15, 0, 0, null, 0, 110, 'right')); // Window
  assert.ok(placementError([], art, 4, 0, 0, null, 0, 106, 'left')); // Shelves
  assert.ok(placementError([], art, 8.65, 0, 0, null, 0, 155, 'left')); // Clock
  assert.ok(placementError([], art, 11, 0, 0, null, 0, 100, 'left')); // Picture
  assert.ok(placementError([{ ...art, x: 0 }], other, 0, 0, 0, null, 0, 20, 'right'));
  assert.equal(placementError([{ ...art, x: 0 }], other, 1, 0, 0, null, 0, 20, 'right'), null);
  const saved = JSON.parse(JSON.stringify({ ...art, ...initialPlacement(art) })) as Item;
  assert.equal(resolveItems([saved])[0].wallSide, 'left');
});

test('inventory placement starts in a free cell if the default cell is occupied', () => {
  const box: Item = { id: 'sofa', productId: 'sofa-moss', x: 4, y: 4, rotation: 0, on: false };
  const figure: Item = { id: 'figure', productId: 'figure-alexander', x: null, y: null, rotation: 0, on: false };
  const start = initialPlacement(figure);
  assert.ok(placementError([box], figure, start.x, start.y, start.rotation));
  const free = availablePlacement([box], figure, start);
  assert.ok(free);
  assert.equal(placementError([box], figure, free.x, free.y, free.rotation), null);
  assert.equal(figure.x, null);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {placementError,resolveItems,removeItem,localPoint,dimensions,productOf,type Item} from '../domain/model';
import {project} from '../engine/isometric';
import {tabletopDrop} from '../engine/tabletop-drop';
import {roomLight} from '../engine/room-light';
const table:Item={id:'table',productId:'table-tea',x:8,y:6,rotation:0,on:false};
const vase:Item={id:'vase',productId:'vase-branches',x:0,y:0,rotation:0,on:false,parentId:'table'};

test('tabletop coordinates rotate with the parent and round-trip through pointer placement',()=>{
  for(const rotation of [0,90,180,270]) {
    const items=[{...table,rotation},vase],world=resolveItems(items)[1];
    const d=dimensions(productOf(world),world.rotation),cx=world.x!+d.w/2,cy=world.y!+d.h/2;
    assert.equal(world.elevation,31);assert.equal(world.rotation,rotation);
    assert.deepEqual(localPoint(items[0],cx,cy),[.5,.5]);
    assert.deepEqual(tabletopDrop(items,vase,...project(cx,cy,31),rotation),{x:0,y:0,rotation:0,parentId:'table'});
    assert.equal(placementError(items,vase,0,0,0,'table'),null);
  }
});
test('tabletop collisions are scoped to a support and enforce bounds and allowed objects',()=>{
  const items=[table,vase,{...table,id:'other',x:13}];
  const books:Item={...vase,id:'books',productId:'books-stories',x:1};
  assert.equal(placementError(items,books,1,0,90,'table'),null);
  assert.ok(placementError(items,books,0,0,0,'table'));
  assert.equal(placementError(items,books,0,0,0,'other'),null);
  assert.ok(placementError(items,books,3,0,0,'table'));
  assert.ok(placementError(items,{...books,productId:'sofa-moss'},0,0,0,'table'));
  assert.ok(placementError(items,books,0,0,0,'missing'));
  assert.ok(placementError([{...table,x:null,y:null}],books,0,0,0,'table'));
  assert.ok(placementError(items,books,0,0,0,'books'));
  assert.ok(placementError(items,vase,8,6,0,null)); // cannot drop onto the floor through furniture
});
test('moving furniture carries objects; removing it returns contents to inventory; old saves remain valid',()=>{
  const items=[table,vase],before=JSON.stringify(items);
  const moved=resolveItems([{...table,x:10,y:9},vase]);
  assert.equal(moved[1].x,10);assert.equal(moved[1].y,9);
  assert.equal(JSON.stringify(items),before);
  assert.ok(removeItem(items,'table').every(i=>i.x===null&&i.y===null&&i.parentId===null));
  assert.equal(removeItem(items,'vase')[0],table);
  const restored=JSON.parse(JSON.stringify(items));
  assert.deepEqual(resolveItems(restored),resolveItems(items));
  assert.equal(resolveItems([table])[0].elevation,0);
});
test('drag detaches to floor and supports transitions between rotated furniture',()=>{
  const dresser:Item={...table,id:'dresser',productId:'dresser-walnut',x:15,y:2,rotation:90};
  const items=[table,dresser,vase];
  const placement=tabletopDrop(items,vase,...project(16.5,2.5,63),0);
  assert.deepEqual(placement,{x:0,y:0,rotation:270,parentId:'dresser'});
  assert.deepEqual(tabletopDrop(items,vase,...project(20.5,14.5),0),{x:20,y:14,rotation:0,parentId:null});
});
test('table lamp uses elevated position and turns off without losing its support',()=>{
  const lamp:Item={...vase,productId:'lamp-table',on:true};
  const scene=resolveItems([table,lamp]);
  assert.equal(roomLight(scene,0,false).sources[0].position[2],63);
  assert.equal(roomLight(resolveItems([table,{...lamp,on:false}]),0,false).sources.length,0);
});

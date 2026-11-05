import {test} from 'node:test';
import assert from 'node:assert/strict';
import {placementError,resolveItems,removeItem,dimensions,productOf,supportSurfaces,type Item} from '../domain/model';
import {project} from '../engine/isometric';
import {tabletopDrop} from '../engine/tabletop-drop';

const shelf:Item={id:'shelf',productId:'shelf-books',x:8,y:6,rotation:0,on:false};
const books:Item={id:'books',productId:'books-stories',x:0,y:0,rotation:0,on:false,parentId:'shelf',supportLevel:0};

test('both bookcases resolve all tiers and round-trip pointer drops in every orientation',()=>{
  for(const productId of ['shelf-books','shelf-light'])for(const rotation of [0,90,180,270])for(const supportLevel of [0,1,2,3]) {
    const parent={...shelf,productId,rotation},item={...books,supportLevel},items=[parent,item];
    const world=resolveItems(items)[1],d=dimensions(productOf(world),world.rotation);
    const height=supportSurfaces(productOf(parent))[supportLevel].height;
    assert.equal(world.elevation,height);
    assert.equal(world.rotation,rotation);
    assert.deepEqual(tabletopDrop(items,item,...project(world.x!+d.w/2,world.y!+d.h/2,height),rotation),{x:0,y:0,rotation:0,parentId:'shelf',supportLevel});
    assert.equal(placementError(items,item,0,0,0,'shelf',supportLevel),null);
  }
});
test('shelf collisions are isolated by tier, with interior width and height enforced',()=>{
  const items=[shelf,books],plant={...books,id:'plant',productId:'plant-succulent'};
  assert.ok(placementError(items,plant,0,0,0,'shelf',0));
  assert.equal(placementError(items,plant,0,0,0,'shelf',1),null);
  assert.equal(placementError(items,plant,2,0,0,'shelf',1),null);
  assert.ok(placementError(items,plant,3,0,0,'shelf',1));
  assert.ok(placementError(items,plant,0,1,0,'shelf',1));
  for(const productId of ['vase-branches','lamp-table']) {
    const tall={...plant,productId};
    for(const level of [0,1,2])assert.match(placementError(items,tall,1,0,0,'shelf',level)!,/высокая/);
    assert.equal(placementError(items,tall,1,0,0,'shelf',3),null);
  }
  assert.equal(placementError(items,{...plant,productId:'vase-mini'},1,0,0,'shelf',0),null);
  assert.ok(placementError([{...shelf,productId:'shelf-light'}],plant,2,0,0,'shelf',1));
});
test('invalid tiers and unsupported furniture cannot bypass placement validation',()=>{
  for(const level of [-1,4,.5,NaN])assert.ok(placementError([shelf],books,0,0,0,'shelf',level));
  assert.ok(placementError([shelf],books,0,0,0,null,1));
  assert.ok(placementError([{...shelf,productId:'table-tea'}],books,0,0,0,'shelf',1));
  assert.ok(placementError([shelf],{...books,productId:'plant-monstera'},0,0,0,'shelf',3));
});
test('tiers survive save, parent movement and rotation; removal resets support metadata',()=>{
  const items=[shelf,{...books,supportLevel:2}],saved=JSON.parse(JSON.stringify(items));
  assert.deepEqual(resolveItems(saved),resolveItems(items));
  const before=resolveItems(items)[1],after=resolveItems([{...shelf,x:10,y:8},items[1]])[1];
  assert.equal(after.x,before.x!+2);assert.equal(after.y,before.y!+2);assert.equal(after.elevation,76);
  assert.equal(resolveItems([{...shelf,rotation:90},items[1]])[1].supportLevel,2);
  assert.ok(removeItem(items,'shelf').every(i=>i.x===null&&i.parentId===null&&i.supportLevel===0));
  assert.equal(resolveItems([shelf,{...books,supportLevel:undefined}])[1].elevation,9);
});

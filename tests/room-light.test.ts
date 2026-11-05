import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roomLight, lightAt, litColor, occluded, windowExposure } from '../engine/room-light';
import { initialRoom, type Item } from '../domain/model';
const lamp:Item={id:'lamp',productId:'lamp-honey',x:8,y:8,rotation:0,on:true};
test('local lighting respects lamp switches and inventory, without changing saved materials',()=>{
  const room=initialRoom(),before=JSON.stringify(room);
  roomLight(room.items,.5,false);assert.equal(JSON.stringify(room),before);
  assert.equal(roomLight([lamp],0,false).sources.length,1);
  assert.equal(roomLight([{...lamp,on:false}],0,false).sources.length,0);
  assert.equal(roomLight([{...lamp,x:null,y:null}],0,false).sources.length,0);
});
test('warm lamp illumination decays with distance and faces the light source',()=>{
  const scene=roomLight([lamp],0,false);
  const near=lightAt([204,204,20],[0,0,1],scene,'sample');
  const far=lightAt([500,500,20],[0,0,1],scene,'sample');
  const away=lightAt([204,204,20],[0,0,-1],scene,'sample');
  assert.ok(near[0]>far[0]);assert.ok(near[0]>near[2]);assert.ok(near[0]>away[0]);
});
test('light rays respect furniture blockers and ignore the receiving and emitting objects',()=>{
  const blocks=[{id:'box',min:[10,0,0] as [number,number,number],max:[20,20,30] as [number,number,number]}];
  assert.equal(occluded([0,10,10],[30,10,10],blocks,'sample'),true);
  assert.equal(occluded([0,10,40],[30,10,40],blocks,'sample'),false);
  assert.equal(occluded([0,10,10],[30,10,10],blocks,'box'),false);
  assert.equal(occluded([0,10,10],[30,10,10],blocks,'sample','box'),false);
});
test('direct daylight enters through the window aperture and softens in rain',()=>{
  assert.ok(windowExposure([14*24,5*24,0])>.9);
  assert.equal(windowExposure([2*24,5*24,0]),0);
  const clear=lightAt([14*24,5*24,0],[0,0,1],roomLight([],1,false),'floor');
  const rain=lightAt([14*24,5*24,0],[0,0,1],roomLight([],1,true),'floor');
  assert.ok(clear[0]>rain[0]);
  assert.notEqual(litColor('#999999',[14*24,5*24,0],[0,0,1],roomLight([],1,false),'floor'),litColor('#999999',[14*24,5*24,0],[0,0,1],roomLight([],0,false),'floor'));
});

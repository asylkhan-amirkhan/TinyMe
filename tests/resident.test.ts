import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceResident, commandResident, createResident, reconcileResident, residentBlocked, residentPath, residentTargets, residentBehindFurniture } from '../domain/resident';
import type { Item } from '../domain/model';
import { studioLayout } from '../domain/studio-layout';

// Seat close enough to the keyboard to exercise seated interaction and exit paths.
const studio: Item[] = studioLayout.map((i, n) => ({ ...i, ...(i.productId==='chair-sage'?{y:3}:{}), id: `studio-${n}` }));
const item = (id: string, productId: string, x: number, y: number, rotation = 0): Item => ({ id, productId, x, y, rotation, on: true });
const cellKey = (p: { x: number; y: number }) => Math.floor(p.y) * 24 + Math.floor(p.x);

test('a chair behind the monitors is never selected for seated work',()=>{
 const desk=item('desk','desk-oak',10,5);
 const behind=item('chair','chair-sage',11,3);
 assert.ok(residentTargets([desk,behind],'work').every(t=>!t.seated));
});

test('automatic resident remains finite and inside the room over two simulated hours',()=>{
 let resident=createResident(studio);
 for(let step=0;step<72000;step++) {
   resident=advanceResident(resident,100,studio,true);
   assert.ok(Number.isFinite(resident.x)&&Number.isFinite(resident.y));
   assert.ok(resident.x>=0&&resident.x<24&&resident.y>=0&&resident.y<16);
 }
});
test('desk seating stays centered on the chair and working targets stay in front',()=>{
 const desk=item('desk','desk-oak',10,5),chair=item('chair','chair-sage',11,7);
 const targets=residentTargets([desk,chair],'work');
 const seat=targets.find(t=>t.seated)!;
 assert.equal(seat.x,12);assert.equal(seat.y,8);assert.equal(seat.seatHeight,37);
 assert.ok(seat.workReach!<=1.75);
 assert.ok(residentTargets([desk,{...chair,y:10}],'work').every(t=>!t.seated));
 assert.ok(targets.filter(t=>!t.seated).every(t=>t.y===7.5));
});
test('resident occlusion respects the near edges of wide furniture',()=>{
 const desk=item('desk','desk-oak',10,5);
 assert.equal(residentBehindFurniture({x:10.5,y:7.5},desk),false);
 assert.equal(residentBehindFurniture({x:12,y:4.5},desk),true);
 assert.equal(residentBehindFurniture({x:14.5,y:5.5},desk),false);
});
function arrive(action: 'work' | 'read' | 'water' | 'rest' | 'listen') {
  let r = commandResident(createResident(studio), studio, { action });
  assert.ok(r, `reachable ${action}`);
  for (let n = 0; n < 2000 && (r.path.length || r.action === 'walk'); n++) r = advanceResident(r, 100, studio, false);
  assert.equal(r.action, action); assert.equal(r.path.length, 0);
  return r;
}

test('resident routes around rotated furniture and ignores rugs and tabletop contents', () => {
  const objects = [item('desk', 'desk-oak', 2, 2, 90), item('rug', 'rug-sunset', 8, 8),
    { ...item('book', 'books-stories', 0, 0), parentId: 'desk' }];
  const blocked = residentBlocked(objects);
  assert.equal(blocked.size, 8); assert.ok(blocked.has(5 * 24 + 3));
  assert.ok(!blocked.has(8 * 24 + 8)); assert.ok(!blocked.has(0));
  const path = residentPath({ x: 1.5, y: 3.5 }, { x: 4.5, y: 3.5 }, blocked);
  assert.ok(path); assert.ok(path.length > 3);
  let previous = { x: 1.5, y: 3.5 };
  for (const p of path) {
    assert.ok(!blocked.has(cellKey(p)));
    assert.equal(Math.abs(p.x - previous.x) + Math.abs(p.y - previous.y), 1);
    previous = p;
  }
});
test('paths reject enclosed and outside destinations, and align before a turn', () => {
  const walls = new Set([24, 26, 1, 49]);
  assert.equal(residentPath({ x: 4.5, y: 4.5 }, { x: 1.5, y: 1.5 }, walls), null);
  assert.equal(residentPath({ x: 4.5, y: 4.5 }, { x: 24, y: 5 }, new Set()), null);
  const path = residentPath({ x: 4.7, y: 4.5 }, { x: 4.5, y: 5.5 }, new Set());
  assert.deepEqual(path, [{ x: 4.5, y: 4.5 }, { x: 4.5, y: 5.5 }]);
});
test('resident reaches the desk chair, reads, waters plants, rests and visits the record player', () => {
  const working = arrive('work');
  assert.ok(working.seated); assert.equal(working.target?.seatId, 'studio-1');
  assert.ok(!arrive('read').seated); assert.ok(!arrive('water').seated);
  assert.ok(arrive('rest').seated); assert.equal(arrive('rest').target?.seatId, 'studio-6');
  assert.equal(arrive('listen').target?.itemId, 'studio-7');
});
test('automatic activity chooses a task, while manual activity stays at its destination', () => {
  const start = createResident(studio);
  const automatic = advanceResident({ ...start, elapsed: 5 }, 100, studio, true);
  assert.equal(automatic.target?.action, 'work');
  const reading = arrive('read');
  assert.equal(advanceResident({ ...reading, elapsed: 100 }, 100, studio, false).action, 'read');
  assert.equal(advanceResident({ ...reading, elapsed: 100 }, 100, studio, true).action, 'walk');
});
test('seated resident can leave the chair without passing through other furniture', () => {
  const r = arrive('work'), plan = commandResident(r, studio, { action: 'water' });
  assert.ok(plan); assert.equal(plan.seated, false);
  const blocked = residentBlocked(studio, [r.target!.seatId!]);
  for (const p of plan.path) assert.ok(!blocked.has(cellKey(p)));
});
test('rest approaches the sofa from the front instead of walking through its backrest', () => {
  const plan = commandResident(createResident(studio), studio, { action: 'rest' });
  assert.ok(plan?.target?.seated);
  const front = plan.path.findIndex(p => p.x === 19.5 && p.y === 13.5);
  assert.ok(front >= 0);
  const sofa = residentBlocked([studio[6]]);
  for (const p of plan.path.slice(0, front + 1)) assert.ok(!sofa.has(cellKey(p)));
});
test('layout changes reset routes and relocate a resident out of new obstacles without changing furniture', () => {
  const start = createResident([]), furniture = [item('desk', 'desk-oak', 13, 8)];
  const before = JSON.stringify(furniture);
  const fixed = reconcileResident(start, furniture);
  assert.ok(!residentBlocked(furniture).has(cellKey(fixed)));
  assert.equal(fixed.target, null); assert.equal(fixed.path.length, 0);
  assert.equal(JSON.stringify(furniture), before);
  const working = arrive('work');
  assert.equal(reconcileResident(working, studio.filter(i => i.id !== working.target?.itemId)).seated, false);
});
test('empty rooms allow walking, fully blocked rooms hide the resident and large elapsed gaps are capped', () => {
  const empty = createResident([]);
  assert.ok(commandResident(empty, [], { action: 'walk' }));
  assert.equal(commandResident(empty, [], { action: 'work' }), null);
  const full: Item[] = [];
  for (let y = 0; y < 16; y += 2) for (let x = 0; x < 24; x += 4) full.push(item(`${x}-${y}`, 'desk-oak', x, y));
  const hidden = createResident(full); assert.equal(hidden.visible, false);
  assert.equal(commandResident(hidden, full, { action: 'walk' }), null);
  assert.equal(reconcileResident(hidden, []).visible, true);
  const walking = commandResident(empty, [], { cell: { x: .5, y: .5 } })!;
  const advanced = advanceResident(walking, 60000, [], false);
  assert.ok(Math.hypot(advanced.x - walking.x, advanced.y - walking.y) <= .361);
});
test('desk interaction target rotates with furniture and unplaced objects do not offer activities', () => {
  const desk = item('desk', 'desk-oak', 10, 5, 90);
  assert.deepEqual(residentTargets([desk], 'work')[0], {
    x: 9.5, y: 6.5, action: 'work', itemId: 'desk', facing: Math.atan2(.5, 1.5), seated: false,
  });
  assert.equal(residentTargets([{ ...desk, x: null, y: null }]).length, 0);
});

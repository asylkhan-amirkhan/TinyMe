import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceResident, commandResident, createResident, reconcileResident, residentBlocked, type Resident } from '../domain/resident';
import { angleDelta, residentPose, WALK_SPEED } from '../domain/resident-motion';
import { studioLayout } from '../domain/studio-layout';

const studio = studioLayout.map((i, n) => ({ ...i, ...(i.productId==='chair-sage'?{y:3}:{}), id: `studio-${n}` }));
const cellKey = (r: Resident) => Math.floor(r.y) * 24 + Math.floor(r.x);
const step = (r: Resident, ms: number, frames: number) => {
  for (let n = 0; n < frames; n++) r = advanceResident(r, ms, studio, false);
  return r;
};

test('walking eases in and brakes before arrival without overshooting or turning back', () => {
  const start = { ...createResident([]), x: 3.5, y: 3.5, facing: 0 };
  let r = commandResident(start, [], { cell: { x: 9.5, y: 3.5 } })!;
  const first = advanceResident(r, 50, [], false);
  assert.ok(first.x > start.x && first.x - start.x < .02);
  let cruise = 0, braking = false;
  for (let n = 0; n < 300 && r.path.length; n++) {
    const next = advanceResident(r, 1000 / 60, [], false);
    assert.ok(next.x >= r.x && next.x <= 9.5); assert.equal(next.y, 3.5);
    cruise = Math.max(cruise, next.pose!.speed);
    if (r.pose!.speed > 1 && next.pose!.speed < r.pose!.speed) braking = true;
    r = next;
  }
  assert.ok(cruise > WALK_SPEED - .01 && braking);
  assert.equal(r.path.length, 0); assert.equal(r.x, 9.5); assert.equal(r.pose!.speed, 0);
  assert.equal(r.facing, 0);
  r = step(r, 100, 10);
  assert.ok(r.pose!.walking < .001);
});

test('turns follow the shortest arc across the angle seam with a bounded angular speed', () => {
  const start = { ...createResident([]), facing: Math.PI - .03 };
  const pose = residentPose(start);
  const r = advanceResident({ ...start, facing: -Math.PI + .03, pose }, 50, [], false);
  const delta = angleDelta(pose.facing, r.pose!.facing);
  assert.ok(delta > 0 && delta < .06);
  const reverse = advanceResident({ ...r, facing: r.pose!.facing + Math.PI }, 50, [], false);
  assert.ok(Math.abs(angleDelta(r.pose!.facing, reverse.pose!.facing)) <= .4 + 1e-8);
});

test('eased routes never cut through furniture corners, including at a low frame rate', () => {
  const furniture = [{ id: 'desk', productId: 'desk-oak', x: 10, y: 5, rotation: 90, on: true }];
  const start = { ...createResident(furniture), x: 9.5, y: 6.5 };
  let r = commandResident(start, furniture, { cell: { x: 12.5, y: 6.5 } })!;
  const blocked = residentBlocked(furniture);
  for (let n = 0; n < 600 && r.path.length; n++) {
    const previous = r;
    r = advanceResident(r, 150, furniture, false);
    assert.ok(!blocked.has(cellKey(r)));
    assert.ok(Math.abs(angleDelta(previous.pose!.facing, r.pose!.facing)) <= 1.2 + 1e-7);
  }
  assert.equal(r.path.length, 0); assert.equal(r.x, 12.5); assert.equal(r.y, 6.5);
});

test('footsteps track travelled distance and produce the same motion at 10, 30 and 60 fps', () => {
  const start = commandResident(createResident([]), [], { cell: { x: 4.5, y: 6.5 } })!;
  const slow = step(start, 100, 20), medium = step(start, 1000 / 30, 60), fast = step(start, 1000 / 60, 120);
  for (const r of [slow, medium]) {
    assert.ok(Math.hypot(r.x - fast.x, r.y - fast.y) < 1e-7);
    assert.ok(Math.abs(r.pose!.stride - fast.pose!.stride) < 1e-7);
    assert.ok(Math.abs(angleDelta(r.pose!.facing, fast.pose!.facing)) < 1e-7);
  }
});

test('sitting and standing blend continuously, retaining the old seat height until upright', () => {
  let r = commandResident(createResident(studio), studio, { action: 'rest' })!;
  for (let n = 0; n < 1000 && r.path.length; n++) r = advanceResident(r, 50, studio, false);
  assert.equal(r.seated, true); assert.ok(r.pose!.seated < .5);
  r = step(r, 100, 10); assert.ok(r.pose!.seated > .99);
  const seated = r, plan = commandResident(r, studio, { action: 'water' })!;
  assert.deepEqual(plan.pose, seated.pose);
  r = advanceResident(plan, 100, studio, false);
  assert.equal(r.x, seated.x); assert.equal(r.y, seated.y);
  assert.ok(r.pose!.seated > .5 && r.pose!.seated < 1);
  assert.equal(r.pose!.seatHeight, seated.target!.seatHeight);
  assert.equal(r.pose!.seatId, seated.target!.seatId);
  r = step(r, 100, 10);
  assert.ok(Math.hypot(r.x - seated.x, r.y - seated.y) > .1);
  assert.ok(r.pose!.seated < .01); assert.equal(r.pose!.seatId, undefined);
});

test('interrupted activities preserve the current pose and blend hands instead of snapping', () => {
  const reading: Resident = { ...createResident([]), action: 'read' };
  const walking = commandResident(reading, [], { cell: { x: 10.5, y: 8.5 } })!;
  assert.equal(walking.pose!.read, 1);
  const halfway = advanceResident(walking, 100, [], false);
  assert.ok(halfway.pose!.read > 0 && halfway.pose!.read < 1);
  const redirected = commandResident(halfway, [], { cell: { x: 16.5, y: 8.5 } })!;
  assert.deepEqual(redirected.pose, halfway.pose);
  const next = advanceResident(redirected, 100, [], false);
  assert.ok(next.pose!.read < halfway.pose!.read);
  assert.ok(Math.abs(angleDelta(next.pose!.facing, halfway.pose!.facing)) <= .8 + 1e-7);
});

test('pause gaps, invalid deltas and changed furniture cannot cause animation jumps or mutate inputs', () => {
  const start = commandResident(createResident([]), [], { cell: { x: 3.5, y: 3.5 } })!;
  const before = structuredClone(start);
  for (const dt of [0, -100, NaN, Infinity]) assert.deepEqual(advanceResident(start, dt, [], false), start);
  assert.deepEqual(advanceResident(start, 60000, [], false), advanceResident(start, 150, [], false));
  const updated = advanceResident(start, 100, [], false);
  assert.deepEqual(start, before);
  assert.equal(reconcileResident(updated, []).pose, undefined);
});

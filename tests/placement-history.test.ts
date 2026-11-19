import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moveRecord, placedPosition, samePlacement } from '../domain/placement-history';
import { placementError, type Item } from '../domain/model';

const item: Item = { id: 'lamp', productId: 'lamp-honey', x: 5, y: 5, rotation: 0, on: true };
test('undo records position and rotation without mutating the furniture', () => {
  const after = { x: 8, y: 5, rotation: 90 };
  const record = moveRecord(item, after)!;
  after.x = 10;
  assert.equal(record.after.x, 8);
  assert.equal(record.before.x, 5);
  assert.equal(record.before.rotation, 0);
  assert.equal(item.x, 5);
});
test('no-op and initial inventory placement do not create a rearrangement', () => {
  assert.equal(moveRecord(item, { x: 5, y: 5, rotation: 0 }), null);
  assert.equal(moveRecord({ ...item, x: null, y: null }, { x: 5, y: 5, rotation: 0 }), null);
});
test('undo preserves shelf and support information and detects external moves', () => {
  const before = placedPosition({ ...item, parentId: 'shelf', supportLevel: 2 })!;
  assert.equal(before.parentId, 'shelf');
  assert.equal(before.supportLevel, 2);
  assert.equal(samePlacement(before, { ...before, supportLevel: 1 }), false);
  assert.equal(samePlacement(before, { ...before, x: 9 }), false);
});
test('undo destination is rejected if another item now occupies it', () => {
  const moved = { ...item, x: 8 };
  const obstacle = { ...item, id: 'another-lamp' };
  assert.ok(placementError([moved, obstacle], moved, 5, 5, 0));
  assert.equal(placementError([moved], moved, 5, 5, 0), null);
});
test('a height-only wall move is undoable and restores the old default height', () => {
  const art: Item = { id: 'art', productId: 'art-sun', x: 5, y: 0, rotation: 0, on: false };
  const after = { x: 5, y: 0, rotation: 0, wallHeight: 150.5 };
  const record = moveRecord(art, after)!;
  assert.equal(record.before.wallHeight, 120);
  assert.equal(samePlacement(placedPosition({ ...art, ...after })!, record.after), true);
  assert.equal(samePlacement(record.after, record.before), false);
});
test('undo distinguishes the two walls even at the same coordinates', () => {
  const art: Item = { id: 'art', productId: 'art-sun', x: 5, y: 0, rotation: 0, on: false, wallHeight: 40 };
  const after = { x: 5, y: 0, rotation: 0, wallHeight: 40, wallSide: 'left' as const };
  const record = moveRecord(art, after)!;
  assert.equal(record.before.wallSide, 'right');
  assert.equal(record.after.wallSide, 'left');
  assert.equal(samePlacement(placedPosition({ ...art, ...after })!, record.after), true);
});

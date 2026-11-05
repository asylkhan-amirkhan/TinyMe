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

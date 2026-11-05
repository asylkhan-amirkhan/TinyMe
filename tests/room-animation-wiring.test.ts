import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/RoomCanvas.tsx', import.meta.url), 'utf8');

test('saving an interaction does not pause the room, resident or spectrum', () => {
  const animationGate = source.match(/const shouldAnimate=.*$/m)?.[0] ?? '';
  assert.ok(animationGate.includes('canAnimate'));
  assert.ok(!animationGate.includes('.disabled'));
  assert.ok(!source.includes('current.readOnly || current.disabled) return'));
  assert.ok(!source.includes('!current.editing && !current.disabled ? current.readSpectrum'));
});

test('pressing an object pauses animation only once it becomes a drag', () => {
  const animationGate = source.match(/const shouldAnimate=.*$/m)?.[0] ?? '';
  assert.ok(animationGate.includes('drag?.moved'));
  assert.match(source, /drag.moved = true;\s*syncMotion\(\);/);
});

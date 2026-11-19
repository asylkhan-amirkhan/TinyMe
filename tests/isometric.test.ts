import { test } from "node:test";
import assert from "node:assert/strict";
import { project, projectWall, unproject, unprojectWall, wallSideAt, showcaseItems, renderRoom } from "../engine/isometric";
import { placementError, productOf, wallArtDepth, type Item } from "../domain/model";
import { centerWallPlacement } from "../domain/drag";

test("isometric pointer coordinates map back to every floor cell", () => {
  for (let x = 0; x < 24; x++)
    for (let y = 0; y < 16; y++) {
      const [a, b] = unproject(...project(x + 0.5, y + 0.5));
      assert.equal(Math.floor(a), x);
      assert.equal(Math.floor(b), y);
    }
});
test("wall projection keeps horizontal position and height independent", () => {
  const anchor = project(5.25, 0, 120.5);
  assert.deepEqual(unprojectWall(...anchor), [5.25, 120.5]);
  assert.deepEqual(unprojectWall(anchor[0], anchor[1] - 18), [5.25, 138.5]);
  assert.deepEqual(unprojectWall(...project(8.75, 0, 120.5)), [8.75, 120.5]);
});
test("a drag across the corner follows the left frame plane and preserves the grab point", () => {
  const art = productOf({ id: 'art', productId: 'art-sun', x: 5, y: 0, rotation: 0, on: false });
  const grabOffset = [7, 10];
  const [x, y] = projectWall('left', 6.25, 62.5, wallArtDepth);
  const cursor = [x + grabOffset[0], y + grabOffset[1]];
  const centerX = cursor[0] - grabOffset[0];
  const side = wallSideAt(centerX);
  const position = centerWallPlacement(art, side, ...unprojectWall(centerX, cursor[1] - grabOffset[1], side, wallArtDepth));
  assert.equal(side, 'left');
  assert.equal(position.x, 5.25);
  assert.equal(position.wallHeight, 35);
  assert.equal(position.wallSide, 'left');
});
test("showcase uses valid furniture placements without collisions", () => {
  for (const item of showcaseItems)
    assert.equal(
      placementError(showcaseItems, item, item.x!, item.y!, item.rotation),
      null,
      item.productId,
    );
});

test('an active placement is painted and hit-tested in front of the rest of the room', t => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const originalPath = Object.getOwnPropertyDescriptor(globalThis, 'Path2D');
  const noop = () => {};
  const context = new Proxy({}, { get: (_, key) => {
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop: noop });
    if (key === 'measureText') return () => ({ width: 10 });
    return noop;
  } });
  const makeCanvas = () => ({ width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement);
  class TestPath {
    points: number[][] = [];
    moveTo(x: number, y: number) { this.points.push([x, y]); }
    lineTo(x: number, y: number) { this.points.push([x, y]); }
    closePath() {}
    addPath() {}
  }
  Object.defineProperty(globalThis, 'document', { value: { createElement: makeCanvas }, configurable: true });
  Object.defineProperty(globalThis, 'Path2D', { value: TestPath, configurable: true });
  t.after(() => {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else Reflect.deleteProperty(globalThis, 'document');
    if (originalPath) Object.defineProperty(globalThis, 'Path2D', originalPath);
    else Reflect.deleteProperty(globalThis, 'Path2D');
  });

  const desk: Item = { id: 'desk', productId: 'desk-oak', x: 8, y: 6, rotation: 0, on: false };
  const figure: Item = { id: 'figure', productId: 'figure-alexander', x: 6, y: 4, rotation: 0, on: false };
  const canvas = makeCanvas();
  assert.deepEqual(renderRoom(canvas, [desk, figure], figure.id, false, false).map(hit => hit.id), ['figure', 'desk']);
  assert.deepEqual(renderRoom(canvas, [desk, figure], figure.id, true, false).map(hit => hit.id), ['desk', 'figure']);
  assert.deepEqual(renderRoom(canvas, [desk, { ...figure, parentId: desk.id, x: 0, y: 0 }], null, false, false).map(hit => hit.id), ['desk', 'figure']);

  const art: Item = { id: 'art', productId: 'art-sun', x: 5, y: 0, rotation: 0, on: false, wallSide: 'left', wallHeight: 35 };
  const [onLeft] = renderRoom(canvas, [desk, art], null, false, false);
  const [onRight] = renderRoom(canvas, [desk, { ...art, wallSide: 'right' }], null, false, false);
  assert.equal(onLeft.wall, true);
  assert.equal(onRight.wall, true);
  for (const [side, hit] of [['left', onLeft], ['right', onRight]] as const) {
    assert.equal(hit.id, art.id);
    assert.deepEqual((hit.path as unknown as TestPath).points, [
      projectWall(side, 5, 35, wallArtDepth), projectWall(side, 7, 35, wallArtDepth),
      projectWall(side, 7, 90, wallArtDepth), projectWall(side, 5, 90, wallArtDepth),
    ]);
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accrue,
  initialRoom,
  catalog,
  placementError,
  listenThreshold,
  dimensions,
  mergeRoom,
} from "../domain/model";
test("delayed heartbeat cannot restore already spent coins", () => {
  const current = {
    ...initialRoom(),
    balance: 5,
    balanceRevision: 8,
    activeMs: 60000,
  };
  const stale = { ...current, balance: 35, balanceRevision: 7 };
  assert.equal(mergeRoom(current, stale).balance, 5);
  assert.equal(
    mergeRoom(current, { ...stale, balance: 6, balanceRevision: 9 }).balance,
    6,
  );
});
test("only complete minutes earn coins; spending does not reset time", () => {
  let s = accrue(initialRoom(), 59999);
  assert.equal(s.balance, 0);
  s = accrue(s, 1);
  assert.equal(s.balance, 1);
  s = { ...s, balance: 0 };
  s = accrue(s, 60000);
  assert.equal(s.balance, 1);
  assert.equal(s.activeMs, 120000);
});
test("partial intervals carry between sessions", () => {
  assert.equal(accrue(accrue(initialRoom(), 35000), 25000).balance, 1);
});
test("negative elapsed time cannot subtract currency", () => {
  assert.equal(accrue(initialRoom(), -1000).activeMs, 0);
});
test("collision and rotated boundary checks", () => {
  const s = initialRoom(),
    i = s.items[1];
  assert.ok(placementError(s.items, i, 11, 1, 0));
  assert.equal(placementError(s.items, i, 5, 0, 0), null);
  assert.ok(placementError(s.items, i, 23, 15, 0));
  assert.deepEqual(dimensions(catalog[0], 90), { w: 2, h: 4 });
});
test("rug can go under a desk but duplicate floor objects cannot", () => {
  const s = initialRoom(),
    rug = {
      id: "test",
      productId: "rug-sunset",
      x: null,
      y: null,
      rotation: 0,
      on: false,
    };
  assert.equal(placementError(s.items, rug, 11, 0, 0), null);
});
test("wall decoration must stay on wall", () => {
  const art = {
    id: "art",
    productId: "art-sun",
    x: null,
    y: null,
    rotation: 0,
    on: false,
  };
  assert.ok(placementError([], art, 3, 5, 0));
  assert.equal(placementError([], art, 3, 0, 0), null);
});
test("listening threshold includes short tracks", () => {
  assert.equal(listenThreshold(180), 30);
  assert.equal(listenThreshold(20), 10);
});
test("catalog contains 45 unique products and valid positive prices", () => {
  assert.equal(catalog.length, 45);
  assert.equal(new Set(catalog.map((p) => p.id)).size, 45);
  assert.ok(catalog.every((p) => p.price > 0));
});


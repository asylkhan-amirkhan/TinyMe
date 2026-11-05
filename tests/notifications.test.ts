import { test } from "node:test";
import assert from "node:assert/strict";
import { earnedCoins, coinLabel } from "../lib/notification-events";
const snapshot = (activeMs: number, scope = "guest", loaded = true) => ({activeMs, scope, loaded});
test("rewards ignore hydration, account changes, duplicate responses and time rollback", () => {
  assert.equal(earnedCoins(null, snapshot(120000)), 0);
  assert.equal(earnedCoins(snapshot(0, "guest", false), snapshot(120000)), 0);
  assert.equal(earnedCoins(snapshot(60000), snapshot(180000, "user")), 0);
  assert.equal(earnedCoins(snapshot(60000), snapshot(60000)), 0);
  assert.equal(earnedCoins(snapshot(120000), snapshot(60000)), 0);
  assert.equal(earnedCoins(snapshot(60000), snapshot(120000, "guest", false)), 0);
});
test("reward notifications follow complete confirmed minutes, including batch credits", () => {
  assert.equal(earnedCoins(snapshot(50000), snapshot(59999)), 0);
  assert.equal(earnedCoins(snapshot(59999), snapshot(60000)), 1);
  assert.equal(earnedCoins(snapshot(59999), snapshot(180000)), 3);
  assert.equal(earnedCoins(snapshot(60000), snapshot(NaN)), 0);
  assert.deepEqual([1,2,5,11,21,24,111].map(coinLabel), ["монета","монеты","монет","монет","монета","монеты","монет"]);
});

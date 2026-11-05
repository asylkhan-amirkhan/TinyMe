import { test } from "node:test";
import assert from "node:assert/strict";
import { displayedActiveMs, sessionCountdown } from "../lib/session-clock";
import { accrue, initialRoom, formatTime } from "../domain/model";

test("one-second accounting advances the timer and awards exactly one coin per minute", () => {
  let room = { ...initialRoom(), activeMs: 0, balance: 0 };
  for (let second = 1; second <= 120; second++) {
    room = accrue(room, 1000);
    assert.equal(room.activeMs, second * 1000);
    assert.equal(room.balance, Math.floor(second / 60));
    assert.equal(sessionCountdown(room.activeMs), 60 - second % 60);
  }
  assert.equal(formatTime(room.activeMs), "00:02:00");
});
test("cloud display advances between confirmations, freezes when paused and bounds stale estimates", () => {
  assert.equal(displayedActiveMs(49000, 1000, true), 50000);
  assert.equal(displayedActiveMs(49000, 2000, true), 51000);
  assert.equal(displayedActiveMs(49000, 9000, false), 49000);
  assert.equal(displayedActiveMs(49000, -20, true), 49000);
  assert.equal(displayedActiveMs(49000, 300000, true), 139000);
  assert.equal(sessionCountdown(59999), 1);
  assert.equal(sessionCountdown(60000), 60);
  assert.equal(formatTime(3600000), "01:00:00");
});

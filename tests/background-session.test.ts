import { test } from "node:test";
import assert from "node:assert/strict";
import { BackgroundSession, type ActivitySnapshot } from "../lib/background-session";
import { accrue, initialRoom } from "../domain/model";

test("background batching counts a minute, pauses exactly, and excludes sleep/offline gaps", async () => {
  let now = 0, room = { ...initialRoom(), balance: 0, activeMs: 0 };
  const session = new BackgroundSession({
    cloud: false, now: () => now, id: () => "guest",
    request: async () => { throw Error("Guest must not use RPC"); },
    elapsed: ms => { room = accrue(room, ms); }, snapshot: () => {}, status: () => {},
  });
  now = 10000; await session.tick(); assert.equal(room.activeMs, 0);
  await session.start();
  now += 61000; await session.tick(); // A hidden tab can batch callbacks once per minute.
  assert.equal(room.activeMs, 61000); assert.equal(room.balance, 1);
  now += 999; await session.pause(); assert.equal(room.activeMs, 61999);
  now += 600000; await session.tick(); assert.equal(room.activeMs, 61999);
  await session.start(); now += 58001; await session.tick();
  assert.equal(room.activeMs, 120000); assert.equal(room.balance, 2);
  now += 120000; await session.tick(); assert.equal(room.activeMs, 120000);
  now += 5000; await session.pause(true); assert.equal(room.activeMs, 120000);
  now += 300000; await session.start(); now += 1000; await session.tick();
  assert.equal(room.activeMs, 121000);
  await session.dispose(); now += 10000; await session.tick(); assert.equal(room.activeMs, 121000);
});

test("cloud requests serialize rapid pause/resume and confirm the last interval", async () => {
  const calls: string[] = [], snapshots: ActivitySnapshot[] = [];
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const session = new BackgroundSession({
    cloud: true, now: () => 0, id: () => "session",
    request: async (action, id, seq) => {
      calls.push(action + ":" + seq);
      if (calls.length === 1) await gate;
      return { activeMs: seq * 10000, balance: 0, balanceRevision: seq, seq };
    },
    elapsed: () => assert.fail(), snapshot: data => snapshots.push(data), status: () => {},
  });
  const first = session.start();
  await Promise.resolve();
  const pause = session.pause();
  const resumed = session.start();
  release(); await Promise.all([first, pause, resumed]);
  assert.deepEqual(calls, ["start:0", "pause:1", "start:0"]);
  assert.equal(snapshots.length, 3);
  await session.pause(true); assert.equal(calls.at(-1), "cancel:1");
  await session.dispose();
});

test("dispose during cloud start releases the session without late state updates", async () => {
  const calls: string[] = [];
  let release!: () => void, snapshots = 0;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const session = new BackgroundSession({
    cloud: true, now: () => 0, id: () => "session",
    request: async (action, id, seq) => {
      calls.push(action); if (action === "start") await gate;
      return { activeMs: 0, balance: 0, balanceRevision: seq, seq };
    },
    elapsed: () => assert.fail(), snapshot: () => { snapshots++; }, status: () => {},
  });
  void session.start(); await Promise.resolve();
  const disposed = session.dispose(); release(); await disposed;
  assert.deepEqual(calls, ["start", "pause"]); assert.equal(snapshots, 0);
});

test("failed cloud request does not invent time and can restart a fresh session", async () => {
  let count = 0, snapshots = 0;
  const session = new BackgroundSession({
    cloud: true, now: () => 0, id: () => "session",
    request: async (action, id, seq) => {
      if (++count === 1) throw Error("Network error");
      assert.equal(action, "start");
      return { activeMs: 0, balance: 0, balanceRevision: 0, seq };
    },
    elapsed: () => assert.fail(), snapshot: () => { snapshots++; }, status: () => {},
  });
  await session.start(); assert.equal(snapshots, 0);
  await session.tick(); assert.equal(snapshots, 1);
});

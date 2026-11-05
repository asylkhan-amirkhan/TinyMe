import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeTracks, listeningDashboard, listeningTime, listeningExactTime } from "../lib/music-statistics";
import type { ListenStat, Track } from "../lib/music-storage";

const title = "Bruno Mars - Risk It All";
const song: Track = { id: "remaining-copy", title, duration: 204, size: 100 };
const history: ListenStat[] = [
  { trackId: "deleted-copy", title, day: "2026-10-23", seconds: 48, plays: 1, completed: 0 },
  { trackId: song.id, title, day: "2026-10-24", seconds: 82, plays: 2, completed: 0 },
  { trackId: "deleted-copy", title, day: "2026-10-24", seconds: 10, plays: 0, completed: 0 },
];

test("deleted duplicate appears once with all listening time and plays preserved", () => {
  const before = structuredClone(history);
  assert.deepEqual(summarizeTracks(history, [song]), [
    { id: song.id, title, seconds: 140, plays: 3 },
  ]);
  assert.deepEqual(history, before, "raw daily history must stay intact");
  assert.deepEqual(summarizeTracks(JSON.parse(JSON.stringify(history)), [song]),
    summarizeTracks(history, [song]), "also repairs previously saved history");
});

test("selected period only includes listening within that period", () => {
  assert.deepEqual(summarizeTracks(history.filter(s => s.day === "2026-10-24"), [song]), [
    { id: song.id, title, seconds: 92, plays: 2 },
  ]);
  assert.deepEqual(summarizeTracks([history[0]], [song]), [
    { id: song.id, title, seconds: 48, plays: 1 },
  ]);
});

test("distinct deleted songs keep their history; ambiguous titles are not merged", () => {
  assert.equal(summarizeTracks(history, []).length, 2);
  const another = { ...song, id: "another-version", duration: 300 };
  const stats = [...history, { ...history[0], trackId: another.id }];
  assert.equal(summarizeTracks(stats, [song, another]).length, 3);
  assert.equal(summarizeTracks(history, [{ ...song, title: "Another song" }]).length, 2);
  assert.deepEqual(summarizeTracks([], [song]), []);
});

test("dashboard filters every metric and chart to the same period without losing duplicate history", () => {
  const today = listeningDashboard(history, [song], "1", "2026-10-24");
  assert.equal(today.seconds, 92);
  assert.equal(today.previousSeconds, 48);
  assert.equal(today.plays, 2);
  assert.equal(today.top.length, 1);
  assert.equal(today.buckets.length, 1);
  assert.equal(today.buckets[0].seconds, 92);
  const week = listeningDashboard(history, [song], "7", "2026-10-24");
  assert.equal(week.seconds, 140);
  assert.equal(week.previousSeconds, 0);
  assert.equal(week.activeDays, 2);
  assert.equal(week.average, 20);
  assert.equal(week.buckets.length, 7);
  assert.equal(week.buckets.reduce((n, d) => n + d.seconds, 0), week.seconds);
  assert.equal(week.calendar.length, 28);
  assert.equal(week.calendar.at(-1)?.key, "2026-10-24");
});

test("previous periods never overlap; calendar days include leap days and DST dates", () => {
  const records = [
    { ...history[0], day: "2024-02-28", seconds: 10, completed: 1 },
    { ...history[0], day: "2024-02-29", seconds: 20, completed: 2 },
    { ...history[0], day: "2024-03-01", seconds: 30, completed: 3 },
    { ...history[0], day: "2025-01-01", seconds: 999 },
  ];
  const result = listeningDashboard(records, [song], "1", "2024-03-01");
  assert.equal(result.seconds, 30);
  assert.equal(result.previousSeconds, 20);
  assert.equal(result.completed, 3);
  assert.ok(result.calendar.some(d => d.key === "2024-02-29"));
  const dst = listeningDashboard([], [], "7", "2026-03-30");
  assert.equal(dst.buckets.length, 7);
  assert.equal(new Set(dst.buckets.map(d => d.key)).size, 7);
});

test("all-time chart aggregates long histories by month with exact totals", () => {
  const records = [{ ...history[0], day: "2025-12-31", seconds: 60 },
    { ...history[1], day: "2026-10-24", seconds: 120 }];
  const result = listeningDashboard(records, [song], "all", "2026-10-24");
  assert.equal(result.monthly, true);
  assert.equal(result.buckets.length, 11);
  assert.equal(result.seconds, 180);
  assert.equal(result.previousSeconds, null);
  assert.equal(result.buckets.reduce((n, d) => n + d.seconds, 0), 180);
  assert.equal(result.activeDays, 2);
  assert.equal(result.top.length, 1);
});

test("empty statistics are zero, never NaN, and listening time preserves short listens", () => {
  const result = listeningDashboard([], [], "30", "2026-10-24");
  assert.equal(result.seconds, 0);
  assert.equal(result.average, 0);
  assert.equal(result.activeDays, 0);
  assert.equal(result.buckets.length, 30);
  assert.deepEqual(result.top, []);
  assert.equal(listeningTime(0), "0 сек");
  assert.equal(listeningTime(49.9), "49 сек");
  assert.equal(listeningTime(127 * 60 + 13), "2 ч 7 мин");
  assert.equal(listeningExactTime(127 * 60 + 13.9), "2 ч 7 мин 13 сек");
  assert.equal(listeningExactTime(49), "49 сек");
});

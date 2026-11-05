import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commitGuestGrowth, readGuestGrowth, guestGrowthKey } from '../lib/growth-storage';
import { applyGrowth, emptyGrowth, parseGrowth, levelForXP, xpThreshold, skillXP, crossedMilestones, growthMastery,
  type GrowthState, type Difficulty } from '../domain/growth';

const sid = '10000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';
const gid = '20000000-0000-4000-8000-000000000001';
const tid = '30000000-0000-4000-8000-000000000001';
const at = '2026-11-05T10:00:00.000Z';
const withSkill = () => applyGrowth(emptyGrowth(), { type: 'skill', id: sid, name: 'Японский', color: '#b6a2d4', category: 'study' }, at);
const withTask = (difficulty: Difficulty = 'medium') => applyGrowth(withSkill(), { type: 'task', id: tid, skillId: sid, goalId: null, title: 'Разобрать пять предложений', difficulty }, at);

test('new skills start at level 1 with no fabricated XP', () => {
  const state = withSkill(); assert.equal(skillXP(state, sid), 0); assert.equal(levelForXP(0), 1); assert.equal(state.events.length, 0);
});
test('level boundaries and specified 290 → 315 XP crossing', () => {
  assert.equal(levelForXP(99), 1); assert.equal(levelForXP(100), 2);
  assert.equal(levelForXP(290), 2); assert.equal(levelForXP(315), 3);
  assert.equal(xpThreshold(3), 300); assert.equal(xpThreshold(9), 3600);
  assert.deepEqual(crossedMilestones(290, 315), [3]);
  assert.deepEqual(crossedMilestones(0, 5000), [3, 6, 9]);
  assert.deepEqual(crossedMilestones(315, 340), []);
});
for (const [difficulty, xp] of [['easy', 10], ['medium', 25], ['hard', 50]] as const) {
  test(`${difficulty} completion awards exactly ${xp} XP once`, () => {
    const original = withTask(difficulty), next = applyGrowth(original, { type: 'complete', taskId: tid }, at);
    assert.equal(skillXP(next, sid), xp); assert.equal(original.tasks[0].completedAt, null);
    assert.strictEqual(applyGrowth(next, { type: 'complete', taskId: tid }, '2026-12-01T00:00:00.000Z'), next);
    assert.equal(next.events.length, 1); assert.equal(next.tasks[0].completedAt, at);
  });
}
test('a goal task inherits its goal skill rather than client selection', () => {
  let state = applyGrowth(withSkill(), { type: 'skill', id: other, name: 'Спорт', color: '#aacc88', category: 'movement' }, at);
  state = applyGrowth(state, { type: 'goal', id: gid, skillId: sid, title: 'Прочитать рассказ' }, at);
  state = applyGrowth(state, { type: 'task', id: tid, skillId: other, goalId: gid, title: 'Первый абзац', difficulty: 'medium' }, at);
  state = applyGrowth(state, { type: 'complete', taskId: tid }, at);
  assert.equal(skillXP(state, sid), 25); assert.equal(skillXP(state, other), 0);
});
test('archive is idempotent, preserves history and blocks new completion', () => {
  let state = applyGrowth(withTask(), { type: 'archive', skillId: sid, archived: true }, at);
  assert.strictEqual(applyGrowth(state, { type: 'archive', skillId: sid, archived: true }, at), state);
  assert.throws(() => applyGrowth(state, { type: 'complete', taskId: tid }, at));
  state = applyGrowth(state, { type: 'archive', skillId: sid, archived: false }, at);
  state = applyGrowth(state, { type: 'complete', taskId: tid }, at);
  state = applyGrowth(state, { type: 'archive', skillId: sid, archived: true }, at);
  assert.equal(skillXP(state, sid), 25); assert.equal(state.tasks.length, 1);
});
test('invalid or blank tasks and unknown relations are rejected', () => {
  assert.throws(() => applyGrowth(withSkill(), { type: 'task', id: tid, skillId: sid, goalId: null, title: '  ', difficulty: 'easy' }, at));
  assert.throws(() => applyGrowth(withSkill(), { type: 'task', id: tid, skillId: other, goalId: null, title: 'Задача', difficulty: 'easy' }, at));
  assert.throws(() => applyGrowth(withSkill(), { type: 'task', id: tid, skillId: sid, goalId: gid, title: 'Задача', difficulty: 'easy' }, at));
  assert.throws(() => applyGrowth(withSkill(), { type: 'complete', taskId: tid }, at));
});
test('saved state roundtrips and a future schema is rejected', () => {
  const state = applyGrowth(withTask(), { type: 'complete', taskId: tid }, at);
  assert.deepEqual(parseGrowth(JSON.parse(JSON.stringify(state))), state);
  assert.throws(() => parseGrowth({ ...state, version: 2 }));
  assert.throws(() => parseGrowth({ ...state, skills: [...state.skills, state.skills[0]] }));
});
test('corrupt or fabricated XP and missing completion events are rejected', () => {
  const state = applyGrowth(withTask(), { type: 'complete', taskId: tid }, at);
  assert.throws(() => parseGrowth({ ...state, events: [{ ...state.events[0], xp: 500 }] }));
  assert.throws(() => parseGrowth({ ...state, events: [] }));
  assert.throws(() => parseGrowth({ ...state, events: [...state.events, { ...state.events[0], id: other }] }));
  assert.throws(() => parseGrowth({ ...state, tasks: [{ ...state.tasks[0], skillId: other }] }));
});
test('creation retries do not duplicate skills, goals, or tasks', () => {
  const state = withTask();
  assert.strictEqual(applyGrowth(state, { type: 'task', id: tid, skillId: sid, goalId: null, title: 'Повтор', difficulty: 'hard' }, at), state);
  assert.strictEqual(applyGrowth(state, { type: 'skill', id: sid, name: 'Японский', category: 'study', color: '#b6a2d4' }, at), state);
});
test('mastery describes separate level stages and XP cannot be negative', () => {
  assert.equal(growthMastery(1), 'Первые шаги'); assert.equal(growthMastery(3), 'Уверенная практика'); assert.equal(growthMastery(9), 'Мастерство');
  assert.throws(() => levelForXP(-1)); assert.throws(() => levelForXP(NaN));
});
test('history is unchanged by reading and a long break', () => {
  const state = applyGrowth(withTask(), { type: 'complete', taskId: tid }, at);
  const snapshot: GrowthState = JSON.parse(JSON.stringify(state));
  skillXP(state, sid); parseGrowth(state);
  assert.deepEqual(state, snapshot);
});
test('reload restores tasks and completion from committed storage', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  values.set(guestGrowthKey, JSON.stringify(withTask()));
  const first = commitGuestGrowth(storage, { type: 'complete', taskId: tid }, at);
  assert.equal(skillXP(readGuestGrowth(storage), sid), 25);
  const repeated = commitGuestGrowth(storage, { type: 'complete', taskId: tid }, at);
  assert.equal(repeated.changed, false); assert.deepEqual(first.state, repeated.state);
});
test('storage quota failure does not acknowledge or alter the saved task', () => {
  const original = JSON.stringify(withTask());
  const storage = { getItem: () => original, setItem: () => { throw new DOMException('Full', 'QuotaExceededError'); } };
  assert.throws(() => commitGuestGrowth(storage, { type: 'complete', taskId: tid }, at), { name: 'QuotaExceededError' });
  assert.equal(readGuestGrowth(storage).tasks[0].completedAt, null);
});
test('corrupt saved state is preserved instead of reset or overwritten', () => {
  let writes = 0;
  const storage = { getItem: () => '{broken', setItem: () => { writes++; } };
  assert.throws(() => commitGuestGrowth(storage, { type: 'complete', taskId: tid }, at));
  assert.equal(writes, 0);
});

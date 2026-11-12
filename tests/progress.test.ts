import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialProgress, levelProgress, parseProgress, progressCommand, skillTemplates, skillXp, threshold, type Difficulty, type Progress } from '../domain/progress';
import { progressKey, readProgress, saveProgressCommand } from '../lib/progress-storage';
const at = '2026-11-12T08:00:00.000Z';
const seeded = () => progressCommand(initialProgress(), { kind: 'addSkill', id: 'reading', draft: skillTemplates[3] });
function addTask(state: Progress, id: string, difficulty: Difficulty = 'medium') {
  return progressCommand(state, { kind: 'addTask', id, at, draft: { title: 'Прочитать главу', skillId: 'reading', difficulty, description: '', dueDate: '' } });
}
const complete = (s: Progress, id: string) => progressCommand(s, { kind: 'completeTask', id, at, minutes: 25 });

test('a new profile has no fabricated skills, tasks or XP', () => {
  assert.deepEqual(initialProgress().skills, []);
  assert.equal(skillXp(seeded(), 'reading'), 0);
  assert.equal(levelProgress(0).level, 1);
});
test('difficulty awards exactly 10, 25 or 50 XP to only the selected skill', () => {
  let s = progressCommand(seeded(), { kind: 'addSkill', id: 'other', draft: skillTemplates[0] });
  for (const difficulty of ['easy', 'medium', 'hard'] as const) s = complete(addTask(s, difficulty, difficulty), difficulty);
  assert.equal(skillXp(s, 'reading'), 85);
  assert.equal(skillXp(s, 'other'), 0);
  assert.equal(s.completions[1].minutes, 25);
  assert.equal(s.completions[1].rulesVersion, 1);
});
test('completion retries after reload never duplicate XP or milestones', () => {
  const completed = complete(addTask(seeded(), 'task'), 'task');
  const reloaded = parseProgress(JSON.stringify(completed));
  assert.equal(complete(reloaded, 'task'), reloaded);
  assert.equal(skillXp(reloaded, 'reading'), 25);
  assert.equal(reloaded.completions.length, 1);
});
test('every level boundary uses the specified cumulative formula', () => {
  for (let level = 2; level <= 100; level++) {
    assert.equal(levelProgress(threshold(level) - 1).level, level - 1);
    assert.equal(levelProgress(threshold(level)).level, level);
    assert.equal(levelProgress(threshold(level)).remaining, 100 * level);
  }
  assert.equal(levelProgress(290).level, 2);
  assert.equal(levelProgress(315).level, 3);
});
test('290 to 315 XP creates exactly one level-3 milestone without extra XP', () => {
  let s = seeded();
  for (let i = 0; i < 5; i++) s = complete(addTask(s, `hard-${i}`, 'hard'), `hard-${i}`);
  for (let i = 0; i < 4; i++) s = complete(addTask(s, `easy-${i}`, 'easy'), `easy-${i}`);
  assert.equal(skillXp(s, 'reading'), 290);
  s = complete(addTask(s, 'threshold'), 'threshold');
  assert.equal(skillXp(s, 'reading'), 315);
  assert.deepEqual(s.milestones, [{ skillId: 'reading', level: 3, taskId: 'threshold', at, reward: 'books' }]);
  assert.equal(complete(s, 'threshold').milestones.length, 1);
  assert.deepEqual(parseProgress(JSON.stringify(s)), s);
});
test('archive keeps history and XP; completed work cannot be deleted or change difficulty', () => {
  const s = complete(addTask(seeded(), 'task'), 'task');
  assert.throws(() => progressCommand(s, { kind: 'deleteTask', id: 'task' }));
  assert.throws(() => progressCommand(s, { kind: 'editTask', id: 'task', draft: { ...s.tasks[0], difficulty: 'hard' } }));
  const archived = progressCommand(progressCommand(s, { kind: 'archiveTask', id: 'task' }), { kind: 'archiveSkill', id: 'reading', archived: true });
  assert.equal(skillXp(archived, 'reading'), 25);
  assert.equal(archived.tasks[0].status, 'archived');
  const renamed = progressCommand(archived, { kind: 'editTask', id: 'task', draft: { ...archived.tasks[0], title: 'Уточнённое название' } });
  assert.equal(skillXp(renamed, 'reading'), 25);
  assert.deepEqual(parseProgress(JSON.stringify(renamed)), renamed);
});
test('all crossed reward levels are recorded once with independent task history', () => {
  let s = seeded();
  for (let i = 0; i < 90; i++) s = complete(addTask(s, `task-${i}`, 'hard'), `task-${i}`);
  assert.equal(skillXp(s, 'reading'), 4500);
  assert.deepEqual(s.milestones.map(m => m.level), [3, 6, 9]);
  assert.equal(complete(s, 'task-89').milestones.length, 3);
});
test('reject blank names, missing skills, invalid dates/minutes and archived skill completions', () => {
  assert.throws(() => progressCommand(initialProgress(), { kind: 'addSkill', id: 'bad', draft: { ...skillTemplates[0], name: '  ' } }));
  assert.throws(() => addTask(initialProgress(), 'task'));
  const s = addTask(seeded(), 'task');
  assert.throws(() => progressCommand(s, { kind: 'editTask', id: 'task', draft: { ...s.tasks[0], dueDate: '2026-02-30' } }));
  assert.throws(() => progressCommand(s, { kind: 'completeTask', id: 'task', at, minutes: -1 }));
  assert.throws(() => complete(progressCommand(s, { kind: 'archiveSkill', id: 'reading', archived: true }), 'task'));
});
test('storage commits atomically, reads latest state and deduplicates competing completion commands', () => {
  let raw: string | null = JSON.stringify(addTask(seeded(), 'task'));
  const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } };
  saveProgressCommand(storage, { kind: 'completeTask', id: 'task', at, minutes: null });
  saveProgressCommand(storage, { kind: 'completeTask', id: 'task', at, minutes: null });
  assert.equal(skillXp(readProgress(storage), 'reading'), 25);
  assert.equal(readProgress(storage).completions.length, 1);
  const before = raw;
  assert.throws(() => saveProgressCommand({ getItem: () => raw, setItem: () => { throw Error('QuotaExceeded'); } }, { kind: 'addSkill', id: 'new', draft: skillTemplates[0] }));
  assert.equal(raw, before);
});
test('corrupt, inconsistent and future saves are preserved rather than overwritten', () => {
  for (const raw of ['{bad', JSON.stringify({ ...initialProgress(), version: 2 }), JSON.stringify({ ...seeded(), tasks: [{ id: 'x' }] }), JSON.stringify({ ...complete(addTask(seeded(), 'task'), 'task'), completions: [] })]) {
    let writes = 0;
    assert.throws(() => saveProgressCommand({ getItem: () => raw, setItem: () => { writes++; } }, { kind: 'addSkill', id: 'new', draft: skillTemplates[0] }));
    assert.equal(writes, 0);
  }
  assert.equal(progressKey, 'tinyme:progress:v1');
});

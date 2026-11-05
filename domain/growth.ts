export const growthCategories = {
  study: { label: 'Чтение и учёба', action: 'read' },
  work: { label: 'Работа и творчество', action: 'work' },
  movement: { label: 'Движение', action: 'walk' },
  music: { label: 'Музыка', action: 'listen' },
  care: { label: 'Забота и растения', action: 'water' },
} as const;
export type GrowthCategory = keyof typeof growthCategories;
export type Difficulty = 'easy' | 'medium' | 'hard';
export const taskXP: Record<Difficulty, number> = { easy: 10, medium: 25, hard: 50 };
export type GrowthSkill = { id: string; name: string; color: string; category: GrowthCategory; archived: boolean };
export type GrowthGoal = { id: string; skillId: string; title: string };
export type GrowthTask = { id: string; skillId: string; goalId: string | null; title: string; difficulty: Difficulty; completedAt: string | null };
export type GrowthEvent = { id: string; taskId: string; skillId: string; xp: number; at: string };
export type GrowthState = { version: 1; skills: GrowthSkill[]; goals: GrowthGoal[]; tasks: GrowthTask[]; events: GrowthEvent[] };
export type GrowthCommand =
  | { type: 'skill'; id: string; name: string; color: string; category: GrowthCategory }
  | { type: 'archive'; skillId: string; archived: boolean }
  | { type: 'goal'; id: string; skillId: string; title: string }
  | { type: 'task'; id: string; skillId: string; goalId: string | null; title: string; difficulty: Difficulty }
  | { type: 'complete'; taskId: string };

export function emptyGrowth(): GrowthState { return { version: 1, skills: [], goals: [], tasks: [], events: [] }; }
export function xpThreshold(level: number) { return 50 * level * (level - 1); }
export function skillXP(state: GrowthState, skillId: string) { return state.events.reduce((sum, event) => sum + (event.skillId === skillId ? event.xp : 0), 0); }
export function levelForXP(xp: number) {
  if (!Number.isSafeInteger(xp) || xp < 0) throw Error('Некорректный опыт');
  return Math.floor((1 + Math.sqrt(1 + 4 * xp / 50)) / 2);
}
export function growthMastery(level: number) { return level >= 9 ? 'Мастерство' : level >= 3 ? 'Уверенная практика' : 'Первые шаги'; }
export function crossedMilestones(before: number, after: number) {
  const levels: number[] = [];
  for (let level = Math.max(3, Math.floor(levelForXP(before) / 3) * 3 + 3); level <= levelForXP(after); level += 3) levels.push(level);
  return levels;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validId(value: unknown): value is string { return typeof value === 'string' && uuid.test(value); }
function title(value: unknown, max: number) {
  if (typeof value !== 'string' || !value.trim() || Array.from(value.trim()).length > max) throw Error(`Введи название до ${max} символов`);
  return value.trim();
}
function activeSkill(state: GrowthState, id: string) {
  const skill = state.skills.find(s => s.id === id && !s.archived);
  if (!skill) throw Error('Выбери активный навык');
  return skill;
}
/** One command produces one immutable state. Completion is idempotent by task ID. */
export function applyGrowth(state: GrowthState, command: GrowthCommand, at: string): GrowthState {
  if (!Number.isFinite(Date.parse(at))) throw Error('Некорректная дата');
  if (command.type === 'skill') {
    if (!validId(command.id) || !Object.hasOwn(growthCategories, command.category) || !/^#[0-9a-f]{6}$/i.test(command.color)) throw Error('Проверь параметры навыка');
    if (state.skills.some(s => s.id === command.id)) return state;
    if (state.skills.length >= 100) throw Error('Достигнут предел: 100 навыков');
    return { ...state, skills: [...state.skills, { id: command.id, name: title(command.name, 60), color: command.color, category: command.category, archived: false }] };
  }
  if (command.type === 'archive') {
    if (!state.skills.some(s => s.id === command.skillId)) throw Error('Навык не найден');
    if (typeof command.archived !== 'boolean') throw Error('Некорректный статус навыка');
    if (state.skills.find(s => s.id === command.skillId)?.archived === command.archived) return state;
    return { ...state, skills: state.skills.map(s => s.id === command.skillId ? { ...s, archived: command.archived } : s) };
  }
  if (command.type === 'goal') {
    activeSkill(state, command.skillId);
    if (!validId(command.id)) throw Error('Некорректный ID');
    if (state.goals.some(g => g.id === command.id)) return state;
    if (state.goals.length >= 500) throw Error('Достигнут предел: 500 целей');
    return { ...state, goals: [...state.goals, { id: command.id, skillId: command.skillId, title: title(command.title, 120) }] };
  }
  if (command.type === 'task') {
    if (!validId(command.id) || !Object.hasOwn(taskXP, command.difficulty)) throw Error('Проверь параметры задачи');
    if (state.tasks.some(t => t.id === command.id)) return state;
    const goal = command.goalId ? state.goals.find(g => g.id === command.goalId) : null;
    if (command.goalId && !goal) throw Error('Цель не найдена');
    const skillId = goal?.skillId ?? command.skillId;
    activeSkill(state, skillId);
    if (state.tasks.length >= 5000) throw Error('Достигнут предел: 5000 задач');
    return { ...state, tasks: [...state.tasks, { id: command.id, skillId, goalId: goal?.id ?? null, title: title(command.title, 200), difficulty: command.difficulty, completedAt: null }] };
  }
  if (command.type !== 'complete') throw Error('Неизвестная команда');
  const task = state.tasks.find(t => t.id === command.taskId);
  if (!task) throw Error('Задача не найдена');
  if (task.completedAt) return state;
  activeSkill(state, task.skillId);
  return { ...state, tasks: state.tasks.map(t => t.id === task.id ? { ...t, completedAt: at } : t), events: [...state.events,
    { id: task.id, taskId: task.id, skillId: task.skillId, xp: taskXP[task.difficulty], at }] };
}

/** Reject corrupt or future schemas instead of silently replacing a saved profile. */
export function parseGrowth(value: unknown): GrowthState {
  if (!value || typeof value !== 'object') throw Error('Повреждённое сохранение');
  const s = value as GrowthState;
  if (s.version !== 1 || !Array.isArray(s.skills) || !Array.isArray(s.goals) || !Array.isArray(s.tasks) || !Array.isArray(s.events)
    || s.skills.length > 100 || s.goals.length > 500 || s.tasks.length > 5000 || s.events.length > 5000) throw Error('Неподдерживаемое сохранение');
  const unique = (items: { id: string }[]) => items.every(i => i && validId(i.id)) && new Set(items.map(i => i.id)).size === items.length;
  if (![s.skills, s.goals, s.tasks, s.events].every(unique)) throw Error('Некорректные идентификаторы');
  for (const skill of s.skills) if (title(skill.name, 60) !== skill.name || !Object.hasOwn(growthCategories, skill.category) || !/^#[0-9a-f]{6}$/i.test(skill.color) || typeof skill.archived !== 'boolean') throw Error('Некорректный навык');
  for (const goal of s.goals) if (title(goal.title, 120) !== goal.title || !s.skills.some(k => k.id === goal.skillId)) throw Error('Некорректная цель');
  for (const task of s.tasks) {
    if (title(task.title, 200) !== task.title || !s.skills.some(k => k.id === task.skillId) || !Object.hasOwn(taskXP, task.difficulty)
      || (task.goalId !== null && !s.goals.some(g => g.id === task.goalId && g.skillId === task.skillId))
      || (task.completedAt !== null && (typeof task.completedAt !== 'string' || !Number.isFinite(Date.parse(task.completedAt))))) throw Error('Некорректная задача');
    const events = s.events.filter(e => e.taskId === task.id);
    if (events.length !== (task.completedAt ? 1 : 0)) throw Error('Несогласованная история');
  }
  for (const event of s.events) if (!s.tasks.some(t => t.id === event.taskId && t.skillId === event.skillId && t.completedAt === event.at && event.id === t.id && event.xp === taskXP[t.difficulty])) throw Error('Некорректное начисление XP');
  return s;
}

export const difficulties = { easy: { label: 'Простая', xp: 10 }, medium: { label: 'Средняя', xp: 25 }, hard: { label: 'Сложная', xp: 50 } } as const;
export type Difficulty = keyof typeof difficulties;
export const behaviors = { study: 'Чтение и изучение', desk: 'Работа за столом', exercise: 'Тренировка', drawing: 'Рисование', music: 'Музыка', universal: 'Универсальное занятие' } as const;
export const skillIcons = ['book', 'code', 'dumbbell', 'languages', 'palette', 'music', 'sprout'] as const;
export const skillColors = ['#c3b1d4', '#a6c7b1', '#e8b68c', '#9bbfe2', '#dfaabd', '#d4c78e'] as const;
export const rewardTemplates = { laptop: 'Ноутбук', globe: 'Глобус', books: 'Книги', dumbbells: 'Гантели', plant: 'Растение' } as const;
export type SkillDraft = { name: string; color: string; icon: typeof skillIcons[number]; behavior: keyof typeof behaviors; reward: keyof typeof rewardTemplates };
export type Skill = SkillDraft & { id: string; archived: boolean };
export type Goal = { id: string; title: string; skillId: string; description: string; createdAt: string; completedAt?: string };
export type TaskDraft = { title: string; skillId: string; difficulty: Difficulty; description: string; dueDate: string; goalId?: string };
export type Task = TaskDraft & { id: string; createdAt: string; status: 'planned' | 'completed' | 'archived' };
export type Completion = { taskId: string; skillId: string; xp: number; minutes: number | null; at: string; rulesVersion: 1 };
export type Milestone = { skillId: string; level: number; taskId: string; at: string; reward?: SkillDraft['reward'] };
export type Progress = { version: 1; revision: number; skills: Skill[]; tasks: Task[]; completions: Completion[]; milestones: Milestone[]; displayedRewards?: string[]; goals?: Goal[] };
export const initialProgress = (): Progress => ({ version: 1, revision: 0, skills: [], tasks: [], completions: [], milestones: [] });
export const skillTemplates: SkillDraft[] = [
  { name: 'Программирование', icon: 'code', color: skillColors[0], behavior: 'desk', reward: 'laptop' },
  { name: 'Английский', icon: 'languages', color: skillColors[3], behavior: 'study', reward: 'globe' },
  { name: 'Спорт', icon: 'dumbbell', color: skillColors[1], behavior: 'exercise', reward: 'dumbbells' },
  { name: 'Чтение', icon: 'book', color: skillColors[2], behavior: 'study', reward: 'books' },
];
export const threshold = (level: number) => 50 * level * (level - 1);
export function levelProgress(xp: number) {
  const level = Math.floor((1 + Math.sqrt(1 + 0.08 * xp)) / 2);
  const start = threshold(level), next = threshold(level + 1);
  const rank = level < 3 ? 'Новичок' : level < 6 ? 'Ученик' : level < 9 ? 'Практик' : level < 12 ? 'Знаток' : 'Мастер';
  return { level, rank, current: xp - start, required: next - start, remaining: next - xp };
}
export const skillXp = (state: Progress, skillId: string) => state.completions.reduce((sum, event) => sum + (event.skillId === skillId ? event.xp : 0), 0);
function fail(message: string): never { throw new Error(message); }
function validSkill(draft: SkillDraft) {
  if (!draft.name.trim() || draft.name.trim().length > 60) fail('Название навыка должно содержать от 1 до 60 символов.');
  if (!skillColors.includes(draft.color as typeof skillColors[number]) || !skillIcons.includes(draft.icon) || !Object.hasOwn(behaviors, draft.behavior) || !Object.hasOwn(rewardTemplates, draft.reward)) fail('Проверь оформление навыка.');
  return { ...draft, name: draft.name.trim() };
}
function validTask(state: Progress, draft: TaskDraft) {
  if (!draft.title.trim() || draft.title.trim().length > 160) fail('Название задачи должно содержать от 1 до 160 символов.');
  if (!state.skills.some(skill => skill.id === draft.skillId && !skill.archived)) fail('Выбери активный навык.');
  if (!Object.hasOwn(difficulties, draft.difficulty)) fail('Выбери сложность задачи.');
  if (draft.description.length > 2000) fail('Описание должно быть не длиннее 2000 символов.');
  if (!validDate(draft.dueDate)) fail('Проверь дату задачи.');
  if (draft.goalId) {
    const goal = state.goals?.find(g=>g.id===draft.goalId);
    if(!goal || goal.skillId!==draft.skillId) fail('Задача должна наследовать навык своей цели.');
    if(goal.completedAt) fail('Эта цель уже завершена.');
  }
  return { ...draft, title: draft.title.trim(), description: draft.description.trim() };
}
function validDate(value: string) {
  return value === '' || (/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
}
export type ProgressCommand =
  | { kind: 'addGoal'; id: string; title: string; skillId: string; description: string; at: string }
  | { kind: 'completeGoal'; id: string; at: string }
  | { kind: 'addSkill'; id: string; draft: SkillDraft }
  | { kind: 'editSkill'; id: string; draft: SkillDraft }
  | { kind: 'archiveSkill'; id: string; archived: boolean }
  | { kind: 'displayReward'; id: string; show: boolean }
  | { kind: 'addTask'; id: string; draft: TaskDraft; at: string }
  | { kind: 'editTask'; id: string; draft: TaskDraft }
  | { kind: 'deleteTask' | 'archiveTask'; id: string }
  | { kind: 'completeTask'; id: string; minutes: number | null; at: string };

/** Pure command handler. Completion history is the only source of XP. */
export function progressCommand(state: Progress, command: ProgressCommand): Progress {
  let next = state;
  if (command.kind === 'addGoal') {
    if(state.goals?.some(g=>g.id===command.id))return state;
    if(!command.title.trim() || command.title.trim().length>160 || command.description.length>2000)fail('Укажи название цели до 160 символов и описание до 2000 символов.');
    if(!state.skills.some(s=>s.id===command.skillId&&!s.archived))fail('Выбери активный навык.');
    next={...state,goals:[...(state.goals??[]),{id:command.id,title:command.title.trim(),skillId:command.skillId,description:command.description.trim(),createdAt:command.at}]};
  } else if(command.kind==='completeGoal') {
    const goal=state.goals?.find(g=>g.id===command.id);
    if(!goal)fail('Цель больше не существует.');
    if(goal.completedAt)return state;
    const tasks=state.tasks.filter(t=>t.goalId===goal.id);
    if(!tasks.length || tasks.some(t=>t.status==='planned'))fail('Сначала выполни все задачи цели.');
    next={...state,goals:state.goals!.map(g=>g.id===goal.id?{...g,completedAt:command.at}:g)};
  } else if (command.kind === 'displayReward') {
    const available = command.id === 'trophy' ? state.milestones.some(m => m.level === 9) : state.milestones.some(m => `${m.skillId}:${m.level}` === command.id);
    if (!available) fail('Эта награда ещё не открыта.');
    const source = state.milestones.find(m => `${m.skillId}:${m.level}` === command.id);
    const sameSkill = new Set(state.milestones.filter(m => m.skillId === source?.skillId).map(m => `${m.skillId}:${m.level}`));
    const selected = (state.displayedRewards ?? []).filter(id => id !== command.id && (!command.show || command.id === 'trophy' || !sameSkill.has(id)));
    if (command.show) selected.push(command.id);
    if (selected.length > 6) fail('В комнате есть место для шести наград. Сначала убери одну из выбранных.');
    next = { ...state, displayedRewards: selected };
  } else if (command.kind === 'addSkill') {
    if (state.skills.some(skill => skill.id === command.id)) return state;
    next = { ...state, skills: [...state.skills, { ...validSkill(command.draft), id: command.id, archived: false }] };
  } else if (command.kind === 'editSkill') {
    if (!state.skills.some(skill => skill.id === command.id)) fail('Навык больше не существует.');
    const draft = validSkill(command.draft);
    next = { ...state, skills: state.skills.map(skill => skill.id === command.id ? { ...skill, ...draft } : skill) };
  } else if (command.kind === 'archiveSkill') {
    if (!state.skills.some(skill => skill.id === command.id)) fail('Навык больше не существует.');
    next = { ...state, skills: state.skills.map(skill => skill.id === command.id ? { ...skill, archived: command.archived } : skill) };
  } else if (command.kind === 'addTask') {
    if (state.tasks.some(task => task.id === command.id)) return state;
    next = { ...state, tasks: [...state.tasks, { ...validTask(state, command.draft), id: command.id, createdAt: command.at, status: 'planned' }] };
  } else {
    const task = state.tasks.find(task => task.id === command.id);
    if (!task) fail('Задача больше не существует.');
    if (command.kind === 'completeTask') {
      if (state.completions.some(event => event.taskId === task.id)) return state;
      if (task.status !== 'planned') fail('Эту задачу нельзя завершить.');
      if (!state.skills.some(skill => skill.id === task.skillId && !skill.archived)) fail('Сначала восстанови навык из архива.');
      if (command.minutes !== null && (!Number.isSafeInteger(command.minutes) || command.minutes < 0 || command.minutes > 100000)) fail('Введи целое число минут от 0 до 100000 или оставь поле пустым.');
      const xp = difficulties[task.difficulty].xp, before = levelProgress(skillXp(state, task.skillId)).level, after = levelProgress(skillXp(state, task.skillId) + xp).level;
      const milestones = [...state.milestones];
      for (let level = before + 1; level <= after; level++) {
        if (level % 3 === 0 && !milestones.some(m => m.skillId === task.skillId && m.level === level)) milestones.push({ skillId: task.skillId, level, taskId: task.id, at: command.at, reward: state.skills.find(s => s.id === task.skillId)!.reward });
      }
      next = { ...state, tasks: state.tasks.map(t => t.id === task.id ? { ...t, status: 'completed' } : t), completions: [...state.completions, { taskId: task.id, skillId: task.skillId, xp, minutes: command.minutes, at: command.at, rulesVersion: 1 }], milestones };
    } else if (command.kind === 'editTask') {
      if (task.status !== 'planned' && (task.skillId !== command.draft.skillId || task.difficulty !== command.draft.difficulty || task.dueDate !== command.draft.dueDate || task.goalId !== command.draft.goalId)) fail('У выполненной задачи можно менять только название и описание.');
      const draft = task.status === 'planned' ? validTask(state, command.draft) : validTask({ ...state, skills: state.skills.map(s => s.id === task.skillId ? { ...s, archived: false } : s), goals:state.goals?.map(g=>g.id===task.goalId?{...g,completedAt:undefined}:g) }, command.draft);
      next = { ...state, tasks: state.tasks.map(t => t.id === task.id ? { ...t, ...draft } : t) };
    } else if (command.kind === 'deleteTask') {
      if (task.status !== 'planned') fail('Удалять можно только незавершённые задачи.');
      next = { ...state, tasks: state.tasks.filter(t => t.id !== task.id) };
    } else {
      if (task.status === 'planned') fail('В архив можно убрать только выполненную задачу.');
      next = { ...state, tasks: state.tasks.map(t => t.id === task.id ? { ...t, status: 'archived' } : t) };
    }
  }
  return { ...next, revision: state.revision + 1 };
}

/** Refuse malformed/future saves; never replace them with a blank profile. */
export function parseProgress(raw: string | null): Progress {
  if (raw === null) return initialProgress();
  try {
    const s: Progress = JSON.parse(raw);
    if (!s || s.version !== 1 || !Number.isSafeInteger(s.revision) || s.revision < 0 || !Array.isArray(s.skills) || !Array.isArray(s.tasks) || !Array.isArray(s.completions) || !Array.isArray(s.milestones)) throw Error();
    const ids = (rows: { id: string }[]) => rows.every(r => typeof r.id === 'string' && r.id.length > 0) && new Set(rows.map(r => r.id)).size === rows.length;
    if (!ids(s.skills) || !ids(s.tasks)) throw Error();
    for (const skill of s.skills) { validSkill(skill); if (typeof skill.archived !== 'boolean') throw Error(); }
    const allActive = { ...s, skills: s.skills.map(skill => ({ ...skill, archived: false })) };
    const timestamp = (date: string) => typeof date === 'string' && Number.isFinite(Date.parse(date));
    if(s.goals!==undefined) {
      if(!Array.isArray(s.goals)||!ids(s.goals))throw Error();
      for(const goal of s.goals)if(typeof goal.title!=='string'||!goal.title.trim()||goal.title.length>160||typeof goal.description!=='string'||goal.description.length>2000||!s.skills.some(skill=>skill.id===goal.skillId)||!timestamp(goal.createdAt)||(goal.completedAt!==undefined&&!timestamp(goal.completedAt)))throw Error();
    }
    const validationState={...allActive,goals:s.goals?.map(g=>({...g,completedAt:undefined}))};
    for (const task of s.tasks) { validTask(validationState, task); if (!['planned', 'completed', 'archived'].includes(task.status) || !timestamp(task.createdAt)) throw Error(); }
    if(s.goals?.some(g=>g.completedAt&&(!s.tasks.some(t=>t.goalId===g.id)||s.tasks.some(t=>t.goalId===g.id&&t.status==='planned'))))throw Error();
    if (new Set(s.completions.map(e => e.taskId)).size !== s.completions.length) throw Error();
    for (const e of s.completions) {
      const task = s.tasks.find(t => t.id === e.taskId);
      if (!task || task.status === 'planned' || e.skillId !== task.skillId || e.xp !== difficulties[task.difficulty].xp || e.rulesVersion !== 1 || !timestamp(e.at) || (e.minutes !== null && (!Number.isSafeInteger(e.minutes) || e.minutes < 0 || e.minutes > 100000))) throw Error();
    }
    if (s.tasks.some(t => t.status !== 'planned' && !s.completions.some(e => e.taskId === t.id))) throw Error();
    if (new Set(s.milestones.map(m => `${m.skillId}:${m.level}`)).size !== s.milestones.length) throw Error();
    for (const m of s.milestones) if (!s.completions.some(e => e.taskId === m.taskId && e.skillId === m.skillId && e.at === m.at) || !Number.isSafeInteger(m.level) || m.level < 3 || m.level % 3 !== 0 || levelProgress(skillXp(s, m.skillId)).level < m.level || (m.reward !== undefined && !Object.hasOwn(rewardTemplates, m.reward))) throw Error();
    if (s.displayedRewards !== undefined) {
      if (!Array.isArray(s.displayedRewards) || s.displayedRewards.length > 6 || new Set(s.displayedRewards).size !== s.displayedRewards.length) throw Error();
      const owners = new Set<string>();
      for (const id of s.displayedRewards) {
        const m = s.milestones.find(m => `${m.skillId}:${m.level}` === id);
        const owner = id === 'trophy' && s.milestones.some(m => m.level === 9) ? 'trophy' : m?.skillId;
        if (!owner || owners.has(owner)) throw Error(); owners.add(owner);
      }
    }
    // Snapshot legacy reward templates so changing a skill cannot replace earned art.
    s.milestones = s.milestones.map(m => m.reward ? m : { ...m, reward: s.skills.find(skill => skill.id === m.skillId)!.reward });
    return s;
  } catch { return fail('Не удалось прочитать прогресс. Сохранённые данные не изменены.'); }
}

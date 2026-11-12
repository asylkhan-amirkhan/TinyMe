import { levelProgress, skillXp, type Progress, type SkillDraft } from './progress';
export type Mastery = 'beginner' | 'confident' | 'master';
export const masteryNames: Record<Mastery, string> = { beginner: 'Начальное освоение', confident: 'Уверенное занятие', master: 'Свободное мастерство' };
export const masteryOf = (level: number): Mastery => level < 3 ? 'beginner' : level < 6 ? 'confident' : 'master';
export const activityDescriptions: Record<SkillDraft['behavior'], Record<Mastery, string>> = {
  study: { beginner: 'Разбирает книгу по строкам', confident: 'Уверенно читает и делает заметки', master: 'Работает с книгой и справочником' },
  desk: { beginner: 'Обдумывает каждый шаг за ноутбуком', confident: 'Уверенно работает за ноутбуком', master: 'Свободно работает с ноутбуком и записями' },
  exercise: { beginner: 'Осваивает движения с лёгким весом', confident: 'Делает ровные подъёмы гантелей', master: 'Выполняет полную серию с двумя гантелями' },
  drawing: { beginner: 'Намечает линии в альбоме', confident: 'Уверенно рисует кистью', master: 'Работает с палитрой и цветным эскизом' },
  music: { beginner: 'Разбирает отдельные ноты', confident: 'Играет ровную мелодию', master: 'Свободно играет с нотным листом' },
  universal: { beginner: 'Разбирает упражнение по карточке', confident: 'Уверенно повторяет упражнение', master: 'Сверяется с записями и выполняет серию' },
};
export type SkillActivity = { skillId: string; name: string; behavior: SkillDraft['behavior']; level: number; mastery: Mastery; sourceTaskId: string; sourceTitle: string };
export function skillActivities(state: Progress): SkillActivity[] {
  return state.skills.filter(s => !s.archived && state.completions.some(e => e.skillId === s.id)).map(skill => {
    const level = levelProgress(skillXp(state, skill.id)).level;
    const source = state.completions.filter(e => e.skillId === skill.id).at(-1)!;
    return { skillId: skill.id, name: skill.name, behavior: skill.behavior, level, mastery: masteryOf(level), sourceTaskId: source.taskId, sourceTitle: state.tasks.find(t => t.id === source.taskId)!.title };
  });
}
export type SkillReward = { id: string; skillId: string; skillName: string; color: string; level: number; template: SkillDraft['reward'] | 'trophy'; at: string; sourceTaskId: string; sourceTitle: string };
export function skillRewards(state: Progress): SkillReward[] {
  const rewards: SkillReward[] = state.milestones.map(m => {
    const skill = state.skills.find(s => s.id === m.skillId)!;
    return { id: `${m.skillId}:${m.level}`, skillId: m.skillId, skillName: skill.name, color: skill.color, level: m.level, template: m.reward ?? skill.reward, at: m.at, sourceTaskId: m.taskId, sourceTitle: state.tasks.find(t => t.id === m.taskId)!.title };
  });
  const ninth = rewards.find(r => r.level === 9);
  if (ninth) rewards.push({ ...ninth, id: 'trophy', template: 'trophy' });
  return rewards;
}
export const displayedSkillRewards = (state: Progress) => (state.displayedRewards ?? []).map(id => skillRewards(state).find(r => r.id === id)).filter((r): r is SkillReward => !!r);

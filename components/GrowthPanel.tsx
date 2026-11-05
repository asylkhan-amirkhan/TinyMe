"use client";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { ArrowLeft, Check, Plus, Sprout, Target, Trophy, Archive, RotateCcw, BookOpen } from 'lucide-react';
import { growthCategories, growthMastery, skillXP, levelForXP, xpThreshold, taskXP, crossedMilestones,
  type GrowthCategory, type Difficulty, type GrowthSkill, type GrowthTask } from '@/domain/growth';
import type { useGrowth } from '@/lib/use-growth';
import './growth.css';

type Growth = ReturnType<typeof useGrowth>;
type Props = { growth: Growth; onRoom: () => void; onPractice: (skill: GrowthSkill, level: number) => void };
const templates = [
  { name: 'Программирование', category: 'work', color: '#b6a2d4' },
  { name: 'Английский', category: 'study', color: '#91b6cc' },
  { name: 'Спорт', category: 'movement', color: '#b0c89a' },
  { name: 'Чтение', category: 'study', color: '#d9b58f' },
] as const;
export default function GrowthPanel({ growth: g, onRoom, onPractice }: Props) {
  const [form, setForm] = useState<'skill' | 'goal' | 'task' | null>(null);
  const [skillId, setSkillId] = useState('');
  const [goalId, setGoalId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<GrowthCategory>('study');
  const [color, setColor] = useState('#b6a2d4');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [filter, setFilter] = useState('all');
  const [showDone, setShowDone] = useState(false);
  const [confirming, setConfirming] = useState<GrowthTask | null>(null);
  const [feedback, setFeedback] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const formInput = useRef<HTMLInputElement>(null);
  const state = g.state;
  const active = state?.skills.filter(s => !s.archived) ?? [];
  const selected = active.some(s => s.id === skillId) ? skillId : active[0]?.id ?? '';
  useEffect(() => { if (form) formInput.current?.focus(); }, [form]);
  useEffect(() => { if (confirming && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [confirming]);
  const openForm = (type: typeof form) => { setForm(type); setName(''); setGoalId(''); setFeedback(''); };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form || !name.trim()) return;
    const id = crypto.randomUUID();
    const command = form === 'skill' ? { type: 'skill' as const, id, name, color, category }
      : form === 'goal' ? { type: 'goal' as const, id, skillId: selected, title: name }
      : { type: 'task' as const, id, skillId: selected, goalId: goalId || null, title: name, difficulty };
    if (await g.run(command)) { setForm(null); setName(''); setFeedback(form === 'skill' ? 'Навык создан. Начни с небольшой задачи.' : form === 'goal' ? 'Цель сохранена. Добавь первый шаг.' : 'Задача сохранена. Выполни её в реальной жизни, затем подтверди результат.'); }
  };
  const complete = async () => {
    if (!confirming || !state) return;
    const task = confirming;
    const before = skillXP(state, task.skillId);
    const result = await g.run({ type: 'complete', taskId: task.id });
    if (!result) return;
    dialog.current?.close(); setConfirming(null);
    if (!result.changed) { setFeedback('Эта задача уже выполнена. Повторного XP нет.'); return; }
    const skill = result.state.skills.find(s => s.id === task.skillId)!;
    const after = skillXP(result.state, skill.id);
    const level = levelForXP(after);
    const milestones = crossedMilestones(before, after);
    setFeedback(`+${taskXP[task.difficulty]} XP · ${skill.name}. ${level > levelForXP(before) ? `Новый уровень ${level}! ` : ''}${milestones.length ? `Веха: уровень ${milestones.join(', ')}. ` : ''}${growthMastery(level)}. Результат сохранён.`);
    onPractice(skill, level);
  };
  return <section className="growth-page" aria-labelledby="growth-title">
    <header className="growth-heading"><div><span className="growth-eyebrow"><Sprout size={15}/> Маленькие действия, заметный рост</span><h1 id="growth-title">Мой рост</h1><p>Развивай свои навыки — по одному реальному шагу.</p></div><button className="button secondary" onClick={onRoom}><ArrowLeft size={16}/>В комнату</button></header>
    <div className="growth-storage"><span>{g.cloud ? 'Прогресс аккаунта' : 'Сохраняется на этом устройстве'}</span><span>XP за задачи · монеты за время</span></div>
    {g.error && <div role="alert" className="growth-error">{g.error}<button className="button secondary" disabled={g.busy} onClick={() => void g.reload()}>Повторить загрузку</button></div>}
    {feedback && <p className="growth-feedback" role="status"><Check size={18}/>{feedback}</p>}
    {!state ? <p className="growth-empty">{g.error ? 'Прогресс недоступен. Сохранённые данные не заменены.' : 'Загружаем твой прогресс…'}</p> : <>
      <div className="growth-summary" aria-label="Общий прогресс"><div><strong>{active.length}</strong><span>активных навыков</span></div><div><strong>{state.events.length}</strong><span>выполненных задач</span></div><div><strong>{state.events.reduce((sum, e) => sum + e.xp, 0)}</strong><span>XP за реальные действия</span></div></div>
      <div className="growth-toolbar"><h2>Твои навыки</h2><button className="button secondary" disabled={g.busy} onClick={() => openForm(form === 'skill' ? null : 'skill')}><Plus size={16}/>Добавить навык</button></div>
      {state.skills.length === 0 && <div className="growth-empty"><Sprout size={28}/><h3>С чего начнём?</h3><p>Создай любой навык или выбери пример. Каждый начинает с 0 XP.</p><div className="growth-templates">{templates.map(t => <button className="button secondary" key={t.name} disabled={g.busy} onClick={() => void g.run({ type: 'skill', id: crypto.randomUUID(), ...t })}>{t.name}</button>)}</div></div>}
      {form && <form onSubmit={event => void submit(event)} className="growth-form" aria-label={form === 'skill' ? 'Новый навык' : form === 'goal' ? 'Новая цель' : 'Новая задача'}>
        <h3>{form === 'skill' ? 'Новый навык' : form === 'goal' ? 'Новая цель' : 'Новая задача'}</h3>
        <label>Название<input ref={formInput} required maxLength={form === 'skill' ? 60 : form === 'goal' ? 120 : 200} value={name} onChange={e => setName(e.target.value)} placeholder={form === 'skill' ? 'Например, японский' : form === 'goal' ? 'Прочитать первый рассказ' : 'Разобрать пять предложений'}/></label>
        <div className="growth-form-row">{form === 'skill' ? <><label>Занятие мини-тебя<select value={category} onChange={e => setCategory(e.target.value as GrowthCategory)}>{Object.entries(growthCategories).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label><label>Цвет навыка<input type="color" value={color} onChange={e => setColor(e.target.value)}/></label></> : <label>Навык<select required value={selected} onChange={e => { setSkillId(e.target.value); setGoalId(''); }}>{active.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
        {form === 'task' && <><label>Цель<select value={goalId} onChange={e => setGoalId(e.target.value)}><option value="">Отдельная задача</option>{state.goals.filter(goal => goal.skillId === selected).map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label><label>Сложность<select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)}><option value="easy">Простая · 10 XP</option><option value="medium">Средняя · 25 XP</option><option value="hard">Сложная · 50 XP</option></select></label></>}</div>
        <div className="growth-actions"><button className="button primary" disabled={g.busy || !name.trim() || (form !== 'skill' && !selected)} type="submit">{g.busy ? 'Сохраняем…' : 'Сохранить'}</button><button className="button secondary" type="button" disabled={g.busy} onClick={() => setForm(null)}>Отмена</button></div>
      </form>}
      <div className="growth-skills">{active.map(skill => {
        const xp = skillXP(state, skill.id), level = levelForXP(xp), floor = xpThreshold(level), next = xpThreshold(level + 1);
        return <article key={skill.id} className="growth-skill" style={{ '--skill-color': skill.color } as CSSProperties}><div className="growth-skill-top"><span className="growth-skill-mark"><BookOpen size={21}/></span><span className="growth-level">Уровень {level}</span></div><h3>{skill.name}</h3><p>{growthMastery(level)}</p><progress aria-label={`${skill.name}: опыт до следующего уровня`} max={next - floor} value={xp - floor}/><div className="growth-xp"><strong>{xp} XP</strong><span>ещё {next - xp} до уровня {level + 1}</span></div><div className="growth-skill-bottom"><span>{growthCategories[skill.category].label}</span><button type="button" disabled={g.busy} aria-label={`Архивировать навык ${skill.name}`} title="Архивировать, сохранив историю" onClick={() => void g.run({ type: 'archive', skillId: skill.id, archived: true })}><Archive size={16}/></button></div></article>;
      })}</div>
      {state.skills.some(s => s.archived) && <details className="growth-archive"><summary>Архив навыков · {state.skills.filter(s => s.archived).length}</summary>{state.skills.filter(s => s.archived).map(s => <div key={s.id}><span>{s.name} · {skillXP(state, s.id)} XP</span><button className="button secondary" disabled={g.busy} onClick={() => void g.run({ type: 'archive', skillId: s.id, archived: false })}><RotateCcw size={14}/>Вернуть</button></div>)}</details>}
      <div className="growth-toolbar"><h2>Цели</h2><button className="button secondary" disabled={g.busy || !active.length} onClick={() => openForm('goal')}><Plus size={16}/>Новая цель</button></div>
      {!state.goals.length && <p className="growth-muted">Цель объединяет несколько задач. Можно начать и с отдельного шага.</p>}
      <div className="growth-goals">{state.goals.map(goal => { const tasks = state.tasks.filter(t => t.goalId === goal.id), done = tasks.filter(t => t.completedAt).length; return <article key={goal.id}><Target size={20}/><div><h3>{goal.title}</h3><p>{state.skills.find(s => s.id === goal.skillId)?.name} · {done} из {tasks.length} задач</p></div>{tasks.length > 0 && done === tasks.length && <Check aria-label="Все задачи выполнены" size={18}/>}</article>; })}</div>
      <div className="growth-toolbar"><h2>Следующий шаг</h2><button className="button primary" disabled={g.busy || !active.length} onClick={() => openForm('task')}><Plus size={16}/>Новая задача</button></div>
      <div className="growth-filters"><label>Навык<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Все навыки</option>{state.skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="growth-check"><input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)}/>Показать выполненные</label></div>
      <div className="growth-tasks">{state.tasks.filter(t => (filter === 'all' || t.skillId === filter) && (showDone || !t.completedAt)).map(task => {
        const skill = state.skills.find(s => s.id === task.skillId)!;
        return <article key={task.id} className={task.completedAt ? 'is-done' : ''}><span className="growth-task-dot" style={{ background: skill.color }}/><div><h3>{task.title}</h3><p>{skill.name}{task.goalId ? ` · ${state.goals.find(goal => goal.id === task.goalId)?.title}` : ''}</p></div><span className="growth-task-xp">{taskXP[task.difficulty]} XP</span><button className="button secondary" disabled={g.busy || !!task.completedAt || skill.archived} onClick={() => { setFeedback(''); setConfirming(task); }}>{task.completedAt ? <><Check size={15}/>Готово</> : skill.archived ? 'В архиве' : 'Выполнено'}</button></article>;
      })}</div>
      {!state.tasks.some(t => (filter === 'all' || t.skillId === filter) && (showDone || !t.completedAt)) && <p className="growth-empty">{state.tasks.length ? 'В этом списке пока нет задач.' : 'Добавь небольшую задачу. Первое действие важнее большого плана.'}</p>}
      {state.events.length > 0 && <details className="growth-history"><summary><Trophy size={16}/>Последние результаты</summary>{state.events.slice(-10).reverse().map(e => <div key={e.id}><span>{state.tasks.find(t => t.id === e.taskId)?.title}<small>{new Date(e.at).toLocaleDateString('ru-RU')}</small></span><strong>+{e.xp} XP</strong></div>)}</details>}
      <p className="growth-footnote">Перерывы не отнимают опыт. Завершённая задача начисляет XP один раз. Мастерство пока показано ступенями; новые анимации и наградные предметы появятся отдельно.</p>
    </>}
    {confirming && <dialog ref={dialog} className="growth-dialog" onCancel={e => { if (g.busy) e.preventDefault(); else setConfirming(null); }} aria-labelledby="growth-confirm-title"><form onSubmit={e => { e.preventDefault(); void complete(); }}><span className="growth-eyebrow">Реальное действие → заметный рост</span><h2 id="growth-confirm-title">Задача выполнена?</h2><p>{confirming.title}</p><strong>+{taskXP[confirming.difficulty]} XP в навык</strong><p className="growth-muted">Подтверди результат после выполнения в реальной жизни. Начисление нельзя отменить в этой версии.</p>{g.error && <p role="alert" className="growth-error">{g.error}</p>}<div className="growth-actions"><button autoFocus className="button primary" type="submit" disabled={g.busy}>{g.busy ? 'Сохраняем…' : 'Подтвердить'}</button><button className="button secondary" type="button" disabled={g.busy} onClick={() => { dialog.current?.close(); setConfirming(null); }}>Ещё не выполнена</button></div></form></dialog>}
  </section>;
}

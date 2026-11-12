'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type FormEvent } from 'react';
import { Archive, ArrowLeft, BookOpen, Check, Code2, Dumbbell, HardDrive, Languages, ListTodo, Music2, Palette, Pencil, Plus, Sprout, Trash2, TrendingUp, X } from 'lucide-react';
import { behaviors, difficulties, levelProgress, rewardTemplates, skillColors, skillIcons, skillTemplates, skillXp, type Difficulty, type Goal, type Skill, type SkillDraft, type Task, type TaskDraft } from '@/domain/progress';
import type { useProgress } from '@/lib/use-progress';
import { activityDescriptions, masteryNames, masteryOf, skillActivities, skillRewards } from '@/domain/skill-growth';
import SkillRewards from './SkillRewards';
import ProgressGoals from './ProgressGoals';

const icons = { book: BookOpen, code: Code2, dumbbell: Dumbbell, languages: Languages, palette: Palette, music: Music2, sprout: Sprout };
const iconNames = { book: 'Книга', code: 'Код', dumbbell: 'Спорт', languages: 'Языки', palette: 'Рисование', music: 'Музыка', sprout: 'Росток' };
type Modal = { kind: 'skill'; skill?: Skill; template?: SkillDraft } | { kind: 'task'; task?: Task } | { kind: 'complete' | 'delete'; task: Task } | { kind: 'archiveSkill'; skill: Skill };
const dateLabel = (date: string) => new Date(date.length === 10 ? date + 'T12:00:00' : date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
const styleFor = (color: string) => ({ '--skill-color': color }) as CSSProperties;

function ProgressDialog({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (trigger?.isConnected) trigger.focus();
      else document.getElementById('progress-panel-heading')?.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={ref} className="progress-dialog" aria-labelledby="progress-dialog-title" onCancel={event => { event.preventDefault(); close(); }}>
    <div className="progress-dialog-heading"><h2 id="progress-dialog-title">{title}</h2><button type="button" className="progress-icon-button" aria-label="Закрыть окно" onClick={close}><X size={20} /></button></div>
    {children}
  </dialog>;
}

function SkillForm({ skill, template, busy, save, close }: { skill?: Skill; template?: SkillDraft; busy: boolean; save: (draft: SkillDraft) => Promise<void>; close: () => void }) {
  const [draft, setDraft] = useState<SkillDraft>(skill ?? template ?? { name: '', color: skillColors[0], icon: 'sprout', behavior: 'universal', reward: 'plant' });
  const submit = (e: FormEvent) => { e.preventDefault(); void save(draft); };
  return <form onSubmit={submit} className="progress-form">
    <label>Название навыка<input autoFocus required maxLength={60} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Например, японский или гончарное дело" /></label>
    <fieldset><legend>Значок</legend><div className="progress-options">{skillIcons.map(icon => { const Icon = icons[icon]; return <button type="button" key={icon} aria-label={iconNames[icon]} aria-pressed={draft.icon === icon} onClick={() => setDraft({ ...draft, icon })}><Icon size={20} /></button>; })}</div></fieldset>
    <fieldset><legend>Цвет</legend><div className="progress-options">{skillColors.map((color, i) => <button type="button" key={color} style={styleFor(color)} className="progress-color" aria-label={['Лавандовый', 'Шалфейный', 'Персиковый', 'Голубой', 'Розовый', 'Песочный'][i]} aria-pressed={draft.color === color} onClick={() => setDraft({ ...draft, color })}>{draft.color === color && <Check size={18} />}</button>)}</div></fieldset>
    <label>Категория занятия<select value={draft.behavior} onChange={e => setDraft({ ...draft, behavior: e.target.value as SkillDraft['behavior'] })}>{Object.entries(behaviors).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    <label>Предмет направления<select value={draft.reward} onChange={e => setDraft({ ...draft, reward: e.target.value as SkillDraft['reward'] })}>{Object.entries(rewardTemplates).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    <p className="progress-hint">Категория определяет занятие мини-тебя. Предмет откроется на третьем уровне; уже полученные награды сохраняют свой вид.</p>
    <div className="progress-actions"><button type="button" className="button secondary" onClick={close} disabled={busy}>Отмена</button><button className="button primary" disabled={busy || !draft.name.trim()}>{busy ? 'Сохраняем…' : skill ? 'Сохранить' : 'Создать навык'}</button></div>
  </form>;
}

function TaskForm({ task, skills, goals, initialSkill, busy, save, close }: { task?: Task; skills: Skill[]; goals:Goal[]; initialSkill: string; busy: boolean; save: (draft: TaskDraft) => Promise<void>; close: () => void }) {
  const [draft, setDraft] = useState<TaskDraft>(task ?? { title: '', skillId: initialSkill, difficulty: 'medium', description: '', dueDate: '' });
  const completed = !!task && task.status !== 'planned';
  return <form className="progress-form" onSubmit={e => { e.preventDefault(); void save(draft); }}>
    <label>Название задачи<input autoFocus required maxLength={160} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="Какой маленький шаг сделаешь?" /></label>
    <label>Цель<select disabled={completed} value={draft.goalId??''} onChange={e=>{const goal=goals.find(g=>g.id===e.target.value);setDraft({...draft,goalId:goal?.id,skillId:goal?.skillId??draft.skillId});}}><option value="">Отдельная задача</option>{goals.filter(g=>(!g.completedAt&&skills.some(s=>s.id===g.skillId&&!s.archived))||g.id===task?.goalId).map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select></label>
    <label>Навык<select required disabled={completed||!!draft.goalId} value={draft.skillId} onChange={e => setDraft({ ...draft, skillId: e.target.value })}><option value="" disabled>Выбери навык</option>{skills.filter(s => !s.archived || s.id === task?.skillId).map(s => <option value={s.id} key={s.id}>{s.name}{s.archived ? ' (в архиве)' : ''}</option>)}</select></label>
    <fieldset disabled={completed}><legend>Сложность</legend><div className="progress-difficulties">{(Object.entries(difficulties) as [Difficulty, { label: string; xp: number }][]).map(([id, d]) => <label key={id}><input type="radio" name="difficulty" value={id} checked={draft.difficulty === id} onChange={() => setDraft({ ...draft, difficulty: id })} /><span>{d.label}<strong>{d.xp} XP</strong></span></label>)}</div></fieldset>
    <label>Описание <span className="progress-optional">необязательно</span><textarea rows={3} maxLength={2000} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label>
    <label>Срок <span className="progress-optional">необязательно</span><input type="date" disabled={completed} value={draft.dueDate} onChange={e => setDraft({ ...draft, dueDate: e.target.value })} /></label>
    <p className="progress-hint">{completed ? 'Начисленный опыт, навык и дата выполнения сохранятся.' : `После подтверждения выполнения: +${difficulties[draft.difficulty].xp} XP выбранному навыку. За пропуск срока штрафов нет.`}</p>
    <div className="progress-actions"><button type="button" className="button secondary" disabled={busy} onClick={close}>Отмена</button><button className="button primary" disabled={busy || !draft.title.trim() || !draft.skillId}>{busy ? 'Сохраняем…' : task ? 'Сохранить' : 'Добавить задачу'}</button></div>
  </form>;
}

function CompleteForm({ task, skill, busy, save, close }: { task: Task; skill: Skill; busy: boolean; save: (minutes: number | null) => Promise<void>; close: () => void }) {
  const [minutes, setMinutes] = useState('');
  return <form className="progress-form" onSubmit={e => { e.preventDefault(); void save(minutes === '' ? null : Number(minutes)); }}>
    <p className="progress-confirm-title">{task.title}</p>
    <div className="progress-completion-preview" style={styleFor(skill.color)}><Check size={24} /><div><strong>+{difficulties[task.difficulty].xp} XP</strong><span>{skill.name}</span></div></div>
    <label>Сколько минут заняло? <span className="progress-optional">необязательно</span><input type="number" min={0} max={100000} step={1} inputMode="numeric" value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="Например, 25" /></label>
    <p className="progress-hint">Минуты сохраняются в истории и не увеличивают XP. После подтверждения отменить начисление нельзя.</p>
    <div className="progress-actions"><button autoFocus type="button" className="button secondary" disabled={busy} onClick={close}>Ещё не готово</button><button className="button primary" disabled={busy}>{busy ? 'Сохраняем…' : 'Подтвердить выполнение'}</button></div>
  </form>;
}

export default function ProgressPanel({ progress, onPractice, onCompleted, onGraph, initialTab = 'skills', focusedReward }: { progress: ReturnType<typeof useProgress>; onPractice: (id: string) => void; onCompleted: (text: string, skillId: string) => void; onGraph:(skill?:string,focus?:string)=>void; initialTab?: 'skills' | 'tasks' | 'rewards'; focusedReward?: string }) {
  const { data, loaded, busy, error, command } = progress;
  const [tab, setTab] = useState<'skills' | 'tasks' | 'rewards'>(initialTab);
  const [modal, setModal] = useState<Modal | null>(null);
  const [skillFilter, setSkillFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('planned');
  const [goalFilter,setGoalFilter]=useState('all');
  const [archivedSkills, setArchivedSkills] = useState(false);
  const [feedback, setFeedback] = useState('');
  const activeSkills = data.skills.filter(s => !s.archived);
  const activities = skillActivities(data);
  const tasks = data.tasks.filter(t => (skillFilter === 'all' || t.skillId === skillFilter) && (statusFilter === 'all' || t.status === statusFilter)&&(goalFilter==='all'||(goalFilter==='none'?!t.goalId:t.goalId===goalFilter))).toReversed();
  const close = () => { if (!busy) setModal(null); };
  const skillTasks = (id: string) => { setSkillFilter(id); setStatusFilter('planned'); setTab('tasks'); };
  const completed = data.completions.length;
  const totalXp = data.completions.reduce((sum, e) => sum + e.xp, 0);
  const showSuccess = (text: string) => { setFeedback(text); setModal(null); };
  const modalTitle = modal?.kind === 'skill' ? modal.skill ? 'Изменить навык' : 'Новый навык' : modal?.kind === 'task' ? modal.task ? 'Изменить задачу' : 'Новая задача' : modal?.kind === 'complete' ? 'Шаг сделан?' : modal?.kind === 'delete' ? 'Удалить задачу?' : 'Убрать навык в архив?';
  if (!loaded) return <p role="status">Открываем твой прогресс…</p>;
  return <div className="progress-panel">
    <div className="page-heading"><div><h1 id="progress-panel-heading" tabIndex={-1}>Маленькие шаги.<br />Твой рост.</h1><p>Занимайся тем, что важно тебе. Каждый выполненный шаг добавляет опыт.</p></div></div>
    <div className="progress-summary"><span><Sprout size={16} />Навыков: {activeSkills.length}</span><span><Check size={16} />Завершено: {completed}</span><span><TrendingUp size={16} />Всего {totalXp} XP</span></div>
    <a className="button secondary progress-graph-link" href="/graph" onClick={e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();onGraph();}}><TrendingUp size={17}/>Граф прогресса</a>
    {error && !modal && <p className="progress-error" role="alert">{error}</p>}
    <div className="progress-feedback" role="status" aria-atomic="true">{feedback && <><Check size={18} /><span>{feedback}</span><button className="progress-icon-button" aria-label="Скрыть сообщение" onClick={() => setFeedback('')}><X size={16} /></button></>}</div>
    <div className="progress-section-heading"><div className="tabs" aria-label="Раздел развития"><button aria-pressed={tab === 'skills'} className={tab === 'skills' ? 'selected' : ''} onClick={() => setTab('skills')}>Навыки</button><button aria-pressed={tab === 'tasks'} className={tab === 'tasks' ? 'selected' : ''} onClick={() => setTab('tasks')}>Задачи</button><button aria-pressed={tab === 'rewards'} className={tab === 'rewards' ? 'selected' : ''} onClick={() => setTab('rewards')}>Награды</button></div>{tab!=='rewards' && <button className="button primary" disabled={busy} onClick={() => setModal(tab === 'skills' || activeSkills.length === 0 ? { kind: 'skill' } : { kind: 'task' })}><Plus size={16} />{tab === 'skills' || activeSkills.length === 0 ? 'Навык' : 'Задача'}</button>}</div>
    {tab==='rewards' && <SkillRewards data={data} busy={busy} command={command} feedback={setFeedback} focusedId={focusedReward} onGraph={onGraph}/>}
    {tab === 'skills' && <>
      {data.skills.length === 0 && <section className="progress-empty"><Sprout size={32} /><h2>Что хочешь развивать?</h2><p>Создай свой навык или начни с шаблона. У каждого направления — собственный опыт, с нуля.</p><div className="progress-templates">{skillTemplates.map(template => { const Icon = icons[template.icon]; return <button className="button secondary" key={template.name} onClick={() => setModal({ kind: 'skill', template })}><Icon size={18} />{template.name}</button>; })}</div></section>}
      {data.skills.length > 0 && <label className="progress-archive-toggle"><input type="checkbox" checked={archivedSkills} onChange={e => setArchivedSkills(e.target.checked)} />Показывать архивные навыки</label>}
      <div className="progress-skills">{data.skills.filter(s => archivedSkills || !s.archived).map(skill => {
        const xp = skillXp(data, skill.id), level = levelProgress(xp), Icon = icons[skill.icon];
        const planned = data.tasks.filter(t => t.skillId === skill.id && t.status === 'planned').length;
        return <article className="progress-skill" key={skill.id} style={styleFor(skill.color)}>
          <div className="progress-skill-heading"><span className="progress-skill-icon"><Icon size={23} /></span><div><h2>{skill.name}</h2><p>{skill.archived ? 'В архиве' : `${level.rank} · уровень ${level.level}`}</p></div><button className="progress-icon-button" aria-label={`Изменить навык ${skill.name}`} onClick={() => setModal({ kind: 'skill', skill })}><Pencil size={16} /></button></div>
          <div className="progress-xp"><strong>{xp} <span>XP</span></strong><span>Ещё {level.remaining} до уровня {level.level + 1}</span></div>
          <progress max={level.required} value={level.current} aria-label={`Прогресс навыка ${skill.name} до уровня ${level.level + 1}`} />
          <div className="skill-mastery"><strong>{masteryNames[masteryOf(level.level)]}</strong><p>{activityDescriptions[skill.behavior][masteryOf(level.level)]}</p><p className="progress-hint">{level.level<3?'На уровне 3 занятие станет увереннее и откроется предмет.':level.level<6?'На уровне 6 откроются мастерское занятие и новая ступень предмета.':'Мастерское занятие открыто. Следующая награда — на уровне '+((Math.floor(level.level/3)+1)*3)+'.'}</p>{activities.find(a=>a.skillId===skill.id) ? <><button className="button secondary" onClick={()=>onPractice(skill.id)}>Посмотреть занятие</button><p className="progress-hint">Основание: уровень {level.level}, задача «{activities.find(a=>a.skillId===skill.id)!.sourceTitle}».</p></>:<p className="progress-hint">Занятие появится после первой выполненной задачи.</p>}</div>
          <div className="progress-skill-footer"><button className="button secondary" onClick={() => skillTasks(skill.id)}><ListTodo size={16} />Задачи: {planned}</button>{skill.archived ? <button className="progress-text-button" disabled={busy} onClick={async () => { if (await command({ kind: 'archiveSkill', id: skill.id, archived: false })) showSuccess(`Навык «${skill.name}» восстановлен.`); }}>Восстановить</button> : <button className="progress-icon-button" aria-label={`Архивировать навык ${skill.name}`} onClick={() => setModal({ kind: 'archiveSkill', skill })}><Archive size={17} /></button>}</div>
        </article>;
      })}</div>
      {data.skills.length > 0 && activeSkills.length === 0 && !archivedSkills && <p className="progress-hint">Все навыки в архиве. Покажи архивные, чтобы восстановить их, или создай новый.</p>}
    </>}
    {tab === 'tasks' && <>
      <ProgressGoals progress={progress} onGraph={onGraph}/>
      <label className="progress-goal-filter">Цель<select value={goalFilter} onChange={e=>setGoalFilter(e.target.value)}><option value="all">Все цели и отдельные задачи</option><option value="none">Без цели</option>{data.goals?.map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select></label>
      <div className="progress-filters"><label>Навык<select value={skillFilter} onChange={e => setSkillFilter(e.target.value)}><option value="all">Все навыки</option>{data.skills.map(s => <option key={s.id} value={s.id}>{s.name}{s.archived ? ' (архив)' : ''}</option>)}</select></label><label>Статус<select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="planned">Запланированы</option><option value="completed">Выполнены</option><option value="archived">В архиве</option><option value="all">Все задачи</option></select></label></div>
      {tasks.length === 0 && <section className="progress-empty"><ListTodo size={30} /><h2>{data.tasks.length ? 'Здесь пока нет задач' : 'Начни с одного шага'}</h2><p>{!activeSkills.length ? 'Сначала создай навык — к нему можно будет добавить задачу.' : data.tasks.length ? 'Выбери другой навык или статус, либо добавь новую задачу.' : 'Например, разобрать одну тему или прочитать главу. Выбери сложность — будущий XP виден заранее.'}</p></section>}
      <div className="progress-task-list">{tasks.map(task => {
        const skill = data.skills.find(s => s.id === task.skillId)!;
        const event = data.completions.find(e => e.taskId === task.id);
        return <article key={task.id} className="progress-task" style={styleFor(skill.color)}>
          <div className="progress-task-main"><span className="progress-task-skill">{skill.name}{skill.archived ? ' · навык в архиве' : ''}</span><h2>{task.title}</h2>{task.description && <p className="progress-task-description">{task.description}</p>}<div className="progress-task-meta"><span>{difficulties[task.difficulty].label}</span><span>{event ? `+${event.xp} XP получено` : `+${difficulties[task.difficulty].xp} XP`}</span>{task.dueDate && <span>Срок: {dateLabel(task.dueDate)}</span>}{event && <span>Выполнено {dateLabel(event.at)}{event.minutes !== null ? ` · ${event.minutes} мин` : ''}</span>}{task.status === 'archived' && <span>В архиве</span>}</div></div>
          <div className="progress-task-actions">{task.status === 'planned' && <button className="button primary" disabled={busy || skill.archived} onClick={() => setModal({ kind: 'complete', task })}><Check size={16} />Выполнить</button>}<button className="progress-icon-button" aria-label={`Изменить задачу ${task.title}`} onClick={() => setModal({ kind: 'task', task })}><Pencil size={16} /></button>{task.status === 'planned' ? <button className="progress-icon-button" aria-label={`Удалить задачу ${task.title}`} onClick={() => setModal({ kind: 'delete', task })}><Trash2 size={16} /></button> : task.status === 'completed' && <button className="progress-icon-button" disabled={busy} aria-label={`Архивировать задачу ${task.title}`} onClick={async () => { if (await command({ kind: 'archiveTask', id: task.id })) showSuccess('Задача в архиве. Опыт сохранён.'); }}><Archive size={16} /></button>}</div>
        </article>;
      })}</div>
    </>}
    <p className="progress-local-note"><HardDrive size={16} /><span>Прогресс сохраняется в этом браузере. Опыт навыков и монеты комнаты учитываются отдельно.</span></p>
    {modal && <ProgressDialog title={modalTitle} close={close}>
      {error && <p className="progress-error" role="alert">{error}</p>}
      {modal.kind === 'skill' && <SkillForm skill={modal.skill} template={modal.template} busy={busy} close={close} save={async draft => { if (await command(modal.skill ? { kind: 'editSkill', id: modal.skill.id, draft } : { kind: 'addSkill', id: crypto.randomUUID(), draft })) showSuccess(modal.skill ? 'Навык обновлён.' : `Навык «${draft.name.trim()}» создан. Добавь первый шаг во вкладке «Задачи».`); }} />}
      {modal.kind === 'task' && <TaskForm task={modal.task} skills={data.skills} goals={data.goals??[]} initialSkill={activeSkills.some(s => s.id === skillFilter) ? skillFilter : activeSkills[0]?.id ?? ''} busy={busy} close={close} save={async draft => {
        if (await command(modal.task ? { kind: 'editTask', id: modal.task.id, draft } : { kind: 'addTask', id: crypto.randomUUID(), draft, at: new Date().toISOString() })) {
          if (!modal.task) { setSkillFilter(draft.skillId); setStatusFilter('planned');setGoalFilter('all'); }
          showSuccess(modal.task ? 'Задача обновлена.' : 'Новый шаг запланирован.');
        }
      }} />}
      {modal.kind === 'complete' && <CompleteForm task={modal.task} skill={data.skills.find(s => s.id === modal.task.skillId)!} busy={busy} close={close} save={async minutes => {
        const before = skillXp(data, modal.task.skillId), next = await command({ kind: 'completeTask', id: modal.task.id, minutes, at: new Date().toISOString() });
        if (!next) return;
        const xp = skillXp(next, modal.task.skillId), skill = next.skills.find(s => s.id === modal.task.skillId)!;
        const level = levelProgress(xp), leveled = level.level > levelProgress(before).level;
        const unlocked=skillRewards(next).filter(reward=>!skillRewards(data).some(r=>r.id===reward.id));
        const message=`${skill.name}: +${xp-before} XP.${leveled?` Новый уровень ${level.level} — ${level.rank}!`:''}${unlocked.length?` Открыто наград: ${unlocked.length}. Они ждут во вкладке «Награды».`:''}`;
        showSuccess(`Шаг сохранён. ${message}`);
        onCompleted(message,skill.id);
      }} />}
      {modal.kind === 'delete' && <div className="progress-form"><p className="progress-confirm-title">{modal.task.title}</p><p className="progress-hint">Задача будет удалена. Она ещё не приносила XP.</p><div className="progress-actions"><button autoFocus className="button secondary" disabled={busy} onClick={close}><ArrowLeft size={16} />Оставить</button><button className="button primary" disabled={busy} onClick={async () => { if (await command({ kind: 'deleteTask', id: modal.task.id })) showSuccess('Задача удалена.'); }}>Удалить задачу</button></div></div>}
      {modal.kind === 'archiveSkill' && <div className="progress-form"><p className="progress-confirm-title">{modal.skill.name}</p><p className="progress-hint">История и XP сохранятся. Новые задачи и выполнение для этого навыка будут доступны после восстановления.</p><div className="progress-actions"><button autoFocus className="button secondary" disabled={busy} onClick={close}>Оставить</button><button className="button primary" disabled={busy} onClick={async () => { if (await command({ kind: 'archiveSkill', id: modal.skill.id, archived: true })) showSuccess('Навык в архиве. История и опыт сохранены.'); }}>В архив</button></div></div>}
    </ProgressDialog>}
  </div>;
}

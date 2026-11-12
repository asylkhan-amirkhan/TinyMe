'use client';
import { useState } from 'react';
import { Flag, Plus, Check } from 'lucide-react';
import type { useProgress } from '@/lib/use-progress';
export default function ProgressGoals({progress,onGraph}:{progress:ReturnType<typeof useProgress>;onGraph:(skill?:string,focus?:string)=>void}) {
  const {data,busy,command}=progress;
  const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[skillId,setSkillId]=useState('');
  const [notice,setNotice]=useState('');
  const active=data.skills.filter(s=>!s.archived);
  return <details className="progress-goals"><summary><Flag size={17}/>Цели <span>{data.goals?.length??0}</span></summary>
    <p className="progress-hint">Создай цель, затем выбери её в форме задачи. Задачи наследуют её навык; завершение цели не даёт дополнительного XP.</p>
    {notice&&<p role="status" className="progress-hint">{notice}</p>}
    {data.goals?.map(goal=>{const tasks=data.tasks.filter(t=>t.goalId===goal.id),done=tasks.filter(t=>t.status!=='planned').length;return <article key={goal.id} className="progress-goal-row"><h3>{goal.title}</h3><p>{data.skills.find(s=>s.id===goal.skillId)?.name} · {done} из {tasks.length} задач{goal.completedAt?' · завершена':''}</p>{goal.description&&<p>{goal.description}</p>}<div className="progress-actions"><button className="button secondary" onClick={()=>onGraph(goal.skillId,`goal:${goal.id}`)}>В графе</button>{!goal.completedAt&&<button className="button secondary" disabled={busy||!tasks.length||done!==tasks.length} onClick={async()=>{if(await command({kind:'completeGoal',id:goal.id,at:new Date().toISOString()}))setNotice('Цель завершена. Опыт за задачи сохранён.');}}><Check size={16}/>Завершить цель</button>}</div></article>;})}
    {active.length>0&&<form className="progress-form" onSubmit={async e=>{e.preventDefault();if(await command({kind:'addGoal',id:crypto.randomUUID(),title,description,skillId:skillId||active[0].id,at:new Date().toISOString()})){setTitle('');setDescription('');setNotice('Цель создана. Теперь можно добавить к ней задачи.');}}}>
      <label>Название цели<input required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Например, прочитать первую книгу"/></label>
      <label>Навык цели<select value={skillId||active[0].id} onChange={e=>setSkillId(e.target.value)}>{active.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label>Описание цели <span className="progress-optional">необязательно</span><textarea maxLength={2000} rows={2} value={description} onChange={e=>setDescription(e.target.value)}/></label>
      <button className="button secondary" disabled={busy||!title.trim()}><Plus size={16}/>Создать цель</button>
    </form>}
  </details>;
}

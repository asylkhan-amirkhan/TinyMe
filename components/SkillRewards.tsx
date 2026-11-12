'use client';
import { useEffect, useRef } from 'react';
import { LockKeyhole, Trophy, Home, Check } from 'lucide-react';
import { rewardPixels } from '@/engine/skill-reward-art';
import { skillRewards, type SkillReward } from '@/domain/skill-growth';
import { levelProgress, rewardTemplates, skillXp, type Progress, type ProgressCommand } from '@/domain/progress';

export function RewardArtwork({ template, level }: { template: SkillReward['template']; level: number }) {
  return <svg viewBox="0 0 48 48" width="64" height="64" shapeRendering="crispEdges" aria-hidden="true">{rewardPixels(template,level).map((p,i)=><rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.color} />)}</svg>;
}
export default function SkillRewards({ data, busy, command, feedback, focusedId, onGraph }: { data: Progress; busy: boolean; command: (command:ProgressCommand)=>Promise<Progress|null>; feedback:(text:string)=>void; focusedId?: string; onGraph:(skill?:string,focus?:string)=>void }) {
  const rewards=skillRewards(data), selected=data.displayedRewards??[];
  const focus=useRef<HTMLElement>(null);
  useEffect(()=>{if(focusedId)focus.current?.focus({preventScroll:false});},[focusedId]);
  return <section className="skill-reward-collection" aria-label="Коллекция наград">
    <div className="skill-reward-intro"><Trophy size={24}/><div><h2>Следы твоих достижений</h2><p>Наградные ступени открываются на уровнях 3, 6 и 9. В комнате — до шести выбранных наград, по одному предмету каждого навыка.</p><strong>В комнате: {selected.length} из 6</strong></div></div>
    {data.skills.length===0 && <p className="progress-hint">Создай навык и выполняй его задачи. Первая награда откроется на третьем уровне.</p>}
    <div className="skill-rewards-grid">{rewards.map(reward=><article key={reward.id} ref={reward.id===focusedId?focus:undefined} tabIndex={-1} className={`skill-reward-card ${reward.id===focusedId?'is-highlighted':''}`}>
      <div className="skill-reward-art"><RewardArtwork template={reward.template} level={reward.level}/><span>Уровень {reward.level}</span></div>
      <h3>{reward.template==='trophy'?'Кубок первой большой вехи':rewardTemplates[reward.template]}</h3>
      <p>{reward.skillName}</p><p className="progress-hint">Открыто {new Date(reward.at).toLocaleDateString('ru-RU')} за задачу «{reward.sourceTitle}».</p>
      <button className="button secondary" onClick={()=>onGraph(reward.skillId,`milestone:${reward.skillId}:${reward.level}`)}>Открыть в графе</button>
      <button className={`button ${selected.includes(reward.id)?'secondary':'primary'}`} disabled={busy} onClick={async()=>{const show=!selected.includes(reward.id);if(await command({kind:'displayReward',id:reward.id,show}))feedback(show?'Награда появилась в комнате. Другие ступени этого навыка остались в коллекции.':'Награда убрана из комнаты и осталась в коллекции.');}}>{selected.includes(reward.id)?<Check size={16}/>:<Home size={16}/>} {selected.includes(reward.id)?'Убрать из комнаты':'Поставить в комнату'}</button>
    </article>)}
    {data.skills.map(skill=>{
      const level=levelProgress(skillXp(data,skill.id)).level, next=(Math.floor(level/3)+1)*3;
      return <article className="skill-reward-card is-locked" key={`locked:${skill.id}`}><div className="skill-reward-art"><RewardArtwork template={skill.reward} level={next}/><LockKeyhole size={18}/></div><h3>{rewardTemplates[skill.reward]}</h3><p>{skill.name} · следующая ступень</p><p className="progress-hint">Откроется на уровне {next}. Сейчас — уровень {level}.</p></article>;
    })}
    {!rewards.some(r=>r.template==='trophy') && <article className="skill-reward-card is-locked"><div className="skill-reward-art"><RewardArtwork template="trophy" level={9}/><LockKeyhole size={18}/></div><h3>Общий кубок</h3><p className="progress-hint">Откроется один раз, когда любой навык достигнет девятого уровня.</p></article>}
    </div>
  </section>;
}

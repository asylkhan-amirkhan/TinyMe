"use client";
import { BookOpen, Footprints, Headphones, Monitor, Armchair, Sprout, UserRound, Sparkles, Shirt, ChevronDown } from 'lucide-react';
import type { Item } from '@/domain/model';
import { residentTargets, type ResidentAction, type ResidentMode } from '@/domain/resident';
import './resident.css';
import Select from './Select';
import { masteryNames, type SkillActivity, type SkillReward } from '@/domain/skill-growth';

type Props = {
  skills?: SkillActivity[]; rewards?: SkillReward[];
  onSkill?: (id:string)=>void; onRewards?:()=>void;
  items: Item[]; mode: ResidentMode; status: string; disabled: boolean;
  motion: boolean; reduced: boolean; onEnableMotion: () => void;
  onMode: (mode: ResidentMode) => void; onAction: (action: ResidentAction) => void;
  onStyle: () => void; styleReady: boolean;
};
const activities = [
  { action: 'work', label: 'За компьютер', icon: Monitor },
  { action: 'read', label: 'Читать', icon: BookOpen },
  { action: 'water', label: 'К растениям', icon: Sprout },
  { action: 'rest', label: 'Отдохнуть', icon: Armchair },
  { action: 'listen', label: 'К проигрывателю', icon: Headphones },
  { action: 'walk', label: 'Прогуляться', icon: Footprints },
] as const;
export default function ResidentPanel(p: Props) {
  const status = p.mode === 'hidden' ? 'Житель скрыт' : p.disabled ? 'Ждёт, пока закончишь обустройство' :
    p.mode === 'paused' ? 'На паузе' : !p.motion ? `${p.status} · без анимации` : p.status;
  return <details className="resident-panel resident-growth-panel" aria-label="Житель комнаты">
    <summary className="resident-heading">
      <div className="resident-avatar" aria-hidden="true"><UserRound size={22} strokeWidth={1.75}/></div>
      <div className="resident-name"><strong>Житель комнаты</strong><span role="status" aria-live="polite">{status}</span></div>
      <span className="resident-expand">Занятия и внешность <ChevronDown size={16}/></span>
    </summary>
      <div className="resident-header-controls"><button className="button secondary" disabled={!p.styleReady} onClick={p.onStyle}><Shirt size={16} strokeWidth={1.75}/>Внешность</button>
      <Select aria-label="Поведение жителя" value={p.mode} onValueChange={value => p.onMode(value as ResidentMode)}
        options={[{value:'auto',label:'Сам по себе'},{value:'direct',label:'Направлять'},
          {value:'paused',label:'Пауза'},{value:'hidden',label:'Скрыть'}]}/></div>
    {p.mode !== 'hidden' && <>
      {!!p.skills?.length && <div className="resident-skill-actions" role="group" aria-label="Занятия моих навыков">{p.skills.map(skill=><button className="button secondary" key={skill.skillId} disabled={p.disabled} onClick={()=>p.onSkill?.(skill.skillId)}><Sprout size={16}/><span>{skill.name}<small>Уровень {skill.level} · {masteryNames[skill.mastery]}</small></span></button>)}</div>}
      {p.onRewards && <button className="button secondary" onClick={p.onRewards}><Sparkles size={16}/>Награды в комнате: {p.rewards?.length??0} / 6</button>}
      <div className="resident-actions" role="group" aria-label="Занятия жителя">
        {activities.map(({ action, label, icon: Icon }) => {
          const available = action === 'walk' || residentTargets(p.items, action).length > 0;
          return <button key={action} className="button secondary" disabled={p.disabled || !p.motion || !available}
            title={!available ? 'Сначала поставь подходящую мебель в комнату' : label} onClick={() => p.onAction(action)}>
            <Icon size={16} strokeWidth={1.75}/>{label}</button>;
        })}
      </div>
      <div className="resident-hint">
        {!p.motion ? <><span>{p.reduced ? 'В системе включено уменьшение движения. Занятия навыков доступны как статичные позы.' : 'Занятия навыков доступны как статичные позы. Включи анимацию, чтобы житель двигался.'}</span>
          {!p.reduced && <button className="button secondary" onClick={p.onEnableMotion}><Sparkles size={16} strokeWidth={1.75}/>Включить анимацию</button>}</> :
          <span>{p.mode === 'direct' ? 'Нажми на свободный пол или предмет: житель подойдёт к нему. Для перестановки мебели выбери «Сам по себе».' :
            p.mode === 'paused' ? 'Житель остаётся на месте. Выбери занятие или верни режим «Сам по себе».' : 'Сам выбирает занятие и обходит мебель. Можно дать ему своё поручение.'}</span>}
      </div>
    </>}
  </details>;
}

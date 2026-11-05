"use client";
import { useEffect,useRef,useState } from 'react';
import { Wind,CloudRain,Snowflake,Volume2,X,Zap,Headphones,Sparkles,Moon,Check,LoaderCircle } from 'lucide-react';
import {atmospherePresets} from '@/domain/atmosphere';
import type {useAtmosphere} from '@/lib/use-atmosphere';
import {containTab} from '@/lib/focus-region';
import type { useWinterWind } from '@/lib/use-winter-wind';
import type { useRain } from '@/lib/use-rain';
import type { useStorm } from '@/lib/use-storm';
type Props={atmosphere:ReturnType<typeof useAtmosphere>;wind:ReturnType<typeof useWinterWind>;winter:boolean;rain:ReturnType<typeof useRain>;storm:ReturnType<typeof useStorm>;onClose:()=>void};
export default function RainPanel({rain,storm,wind,onClose,winter,atmosphere}:Props){
 const [page,setPage]=useState<'presets'|'weather'|'sounds'>('presets');
 const panel=useRef<HTMLElement>(null);
 useEffect(()=>{
  const trigger=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';panel.current?.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});
  return()=>{document.body.style.overflow=overflow;if(trigger?.isConnected)trigger.focus({preventScroll:true});};
 },[]);
 const sounds=[{name:'Зимний ветер',volumeName:'Громкость ветра',icon:Wind,control:wind},{name:'Звук дождя',volumeName:'Громкость дождя',icon:CloudRain,control:rain},{name:'Звук грома',volumeName:'Громкость грома',icon:Zap,control:storm}];
 return <>
  <div className="weather-backdrop" aria-hidden="true" onClick={onClose}/>
  <section ref={panel} className="color-panel rain-panel" id="rain-settings" role="dialog" aria-modal="true" aria-labelledby="weather-title" tabIndex={-1} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();onClose();}else containTab(e,e.currentTarget);}}>
   <div className="weather-header"><div><h2 id="weather-title">Атмосфера</h2><p>Твоя погода. Твоё настроение.</p></div><button className="icon-button" aria-label="Закрыть настройки погоды" onClick={onClose}><X size={18}/></button></div>
   <div className="weather-tabs" role="tablist" aria-label="Настройки атмосферы">
    {(['presets','weather','sounds'] as const).map((id,index)=><button key={id} type="button" role="tab" id={'atmosphere-'+id} aria-selected={page===id} aria-controls={'atmosphere-panel-'+id} tabIndex={page===id?0:-1} onClick={()=>setPage(id)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const tabs=['presets','weather','sounds'] as const;const next=e.key==='Home'?'presets':e.key==='End'?'sounds':tabs[(index+(e.key==='ArrowRight'?1:2))%3];setPage(next);document.getElementById('atmosphere-'+next)?.focus();}}}>{id==='presets'?<Sparkles size={16}/>:id==='weather'?<CloudRain size={16}/>:<Headphones size={16}/>} {id==='presets'?'Готовые':id==='weather'?'За окном':'Звуки'}</button>)}
   </div>
   <div className="weather-body" role="tabpanel" id={'atmosphere-panel-'+page} aria-labelledby={'atmosphere-'+page} tabIndex={0}>
   {page==='presets'?<section className="atmosphere-presets" aria-label="Готовые атмосферы" aria-busy={!!atmosphere.pending}>
    <div className="preset-intro"><p>Свет, погода и звуки одним нажатием.</p><span role="status">{atmosphere.pending?'Настраиваем атмосферу…':atmosphere.active?'Можно настроить под себя':'Свои настройки'}</span></div>
    {atmospherePresets.map(preset=>{
     const Icon=preset.id==='evening'?Moon:preset.id==='rainy-night'?CloudRain:Snowflake;
     return <button type="button" key={preset.id} className="atmosphere-preset" data-preset={preset.id} aria-label={preset.name} aria-pressed={atmosphere.active===preset.id} aria-disabled={!atmosphere.ready||atmosphere.busy} onClick={()=>void atmosphere.apply(preset.id)}>
      <span className="preset-art" aria-hidden="true"><Icon size={24}/><i/><i/><i/></span>
      <span className="preset-copy"><strong>{preset.name}</strong><span>{preset.description}</span><small>{preset.detail}</small></span>
      <span className="preset-indicator" aria-hidden="true">{atmosphere.pending===preset.id?<LoaderCircle size={16}/>:atmosphere.active===preset.id?<Check size={16}/>:null}</span>
     </button>;
    })}
    {atmosphere.error&&<p className="error-text" role="alert">{atmosphere.error}</p>}
    <p className="weather-footnote">Музыка продолжит играть. Настройки сохраняются, но после обновления страницы звук нужно включить нажатием на атмосферу.</p>
   </section>:page==='weather'?<fieldset className="weather-fields" disabled={!!atmosphere.pending}>
    <div className="weather-setting">
     <button className="weather-switch" role="switch" aria-checked={rain.enabled} onClick={rain.toggle} aria-label={winter?'Снег за окном':'Дождь за окном'}>{winter?<Snowflake size={18}/>:<CloudRain size={18}/>}<span>{winter?'Снег за окном':'Дождь за окном'}</span><b>{rain.enabled?'Вкл':'Выкл'}</b></button>
     {winter&&<label className="rain-volume tabular-nums">Интенсивность снега <output>{rain.snowIntensity}%</output><input type="range" aria-label="Интенсивность снега" min="0" max="100" step="1" value={rain.snowIntensity} onChange={e=>rain.changeSnowIntensity(Number(e.target.value))}/></label>}
     {winter&&<p className="weather-hint">Чем гуще снегопад, тем быстрее растут сугробы. При 0% снежинки не видны.</p>}
    </div>
    <div className="weather-setting">
     <button className="weather-switch" role="switch" aria-checked={storm.enabled} onClick={storm.toggle} aria-label="Молния за окном"><Zap size={18}/><span>Молния за окном</span><b>{storm.enabled?'Вкл':'Выкл'}</b></button>
     <button className="storm-preview" disabled={storm.cooldown||(!storm.enabled&&!storm.sound)||storm.busy} onClick={()=>{storm.strike();onClose();}}>{storm.cooldown?'Раскат вдали…':'Попробовать грозу'}</button>
     {storm.enabled&&!storm.motionEnabled&&<p>Вспышки на паузе, пока анимация выключена.</p>}
    </div>
    <p className="weather-hint"><Volume2 size={14}/> Звуки включаются отдельно во вкладке «Звуки».</p>
   </fieldset>:<fieldset className="weather-fields" disabled={!!atmosphere.pending}>
    <p className="weather-intro">Смешивай фон с музыкой. Каждый звук можно включить отдельно.</p>
    {sounds.map(({name,volumeName,icon:Icon,control})=><div className="weather-setting" key={name}>
     <button className="weather-switch" role="switch" aria-checked={control.sound} disabled={control.busy} onClick={control.toggleSound} aria-label={name}><Icon size={18}/><span>{control.busy?'Включаем…':name}</span><b>{control.sound?'Вкл':'Выкл'}</b></button>
     <label className="rain-volume tabular-nums">{volumeName}<output>{Math.round(control.volume*100)}%</output><input type="range" aria-label={volumeName} min="0" max="100" step="1" value={Math.round(control.volume*100)} onChange={e=>control.changeVolume(Number(e.target.value)/100)}/></label>
     {control===rain&&<p className="weather-hint">Настоящий дождь в стерео: капли, мягкий шелест и плавное звучание.</p>}
     {control.error&&<p role="alert" className="error-text">{control.error}</p>}
    </div>)}
    <p className="weather-footnote">Громкость сохраняется. После обновления страницы звуки выключены. <a href="/audio/CREDITS.txt" target="_blank" rel="noreferrer">Авторы записей дождя и грома</a></p>
   </fieldset>}
   </div>
  </section>
 </>;
}

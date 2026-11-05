"use client";
import dynamic from 'next/dynamic';
import Image from 'next/image';
import {useEffect,useRef,useState,type CSSProperties,type KeyboardEvent} from 'react';
import {ArrowRight,ArrowDown} from 'lucide-react';
import {demoAmbient,type DemoTime,type DemoWeather} from './landing-demo-config';
const LiveRoom=dynamic(()=>import('./LandingLiveRoom'),{ssr:false});
const times=[['morning','Утро'],['evening','Вечер'],['night','Ночь']] as const;
const weatherOptions=[['clear','Ясно'],['rain','Дождь'],['snow','Снег']] as const;
function RadioGroup<T extends string>({label,options,value,change}:{label:string;options:readonly (readonly [T,string])[];value:T;change:(value:T)=>void}){
 const keys=(e:KeyboardEvent<HTMLDivElement>)=>{if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();const i=options.findIndex(([v])=>v===value);const n=e.key==='Home'?0:e.key==='End'?options.length-1:(i+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)+options.length)%options.length;change(options[n][0]);(e.currentTarget.querySelectorAll('button')[n] as HTMLButtonElement).focus();};
 return <div role="radiogroup" aria-label={label} onKeyDown={keys}>{options.map(([v,text])=><button key={v} role="radio" aria-checked={value===v} tabIndex={value===v?0:-1} onClick={()=>change(v)}>{text}</button>)}</div>;
}
export default function LandingHero({ready,user,enter,heading}:{ready:boolean;user:boolean;enter:()=>void;heading:React.RefObject<HTMLHeadingElement|null>}){
 const [time,setTime]=useState<DemoTime>('evening'),[weather,setWeather]=useState<DemoWeather>('clear'),[live,setLive]=useState(false),[loaded,setLoaded]=useState(false),[pastHero,setPastHero]=useState(false),[posterFrames,setPosterFrames]=useState(['evening-clear']);
 const host=useRef<HTMLElement>(null);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const nav=navigator as Navigator & {deviceMemory?:number;connection?:{saveData?:boolean}};let stopped=false;let timer:ReturnType<typeof setTimeout>|undefined;
 const check=()=>{if(media.matches||matchMedia('(pointer: coarse) and (max-width: 768px)').matches||nav.connection?.saveData||(nav.deviceMemory!==undefined&&nav.deviceMemory<=4)||navigator.hardwareConcurrency<=4){setLive(false);return;}timer=setTimeout(()=>{if(!stopped)setLive(true);},800);};
 const observer=new IntersectionObserver(([entry])=>{setPastHero(!entry.isIntersecting&&entry.boundingClientRect.bottom<0);if(entry.isIntersecting)check();else if(timer)clearTimeout(timer);},{rootMargin:'100px'});if(host.current)observer.observe(host.current);media.addEventListener('change',check);
 return()=>{stopped=true;clearTimeout(timer);observer.disconnect();media.removeEventListener('change',check);};},[]);
 useEffect(()=>{if(!live||!loaded)return;let raf=0,start=0,count=0;const sample=(now:number)=>{if(document.hidden||!host.current||host.current.getBoundingClientRect().bottom<0){start=0;count=0;}else {if(!start)start=now;count++;if(now-start>3500){if(count*1000/(now-start)<25){setLive(false);return;}start=now;count=0;}}raf=requestAnimationFrame(sample);};raf=requestAnimationFrame(sample);return()=>cancelAnimationFrame(raf);},[live,loaded]);
 useEffect(()=>{const key=`${time}-${weather}`;setPosterFrames(frames=>frames.includes(key)?frames:[...frames,key]);},[time,weather]);
 useEffect(()=>{const root=host.current?.closest('.welcome') as HTMLElement|null;root?.style.setProperty('--ambient',weather==='snow'?'#899fb3':weather==='rain'?'#8b8fac':demoAmbient[time]);return()=>{root?.style.removeProperty('--ambient');};},[time,weather]);
 return <section className="landing-hero" ref={host} aria-labelledby="landing-title">
 <div className="landing-copy"><span className="landing-eyebrow">МАЛЕНЬКОЕ МЕСТО ДЛЯ СЕБЯ</span><h1 id="landing-title" ref={heading} tabIndex={-1}>{['Оставь суету','за окном.'].map((line,i)=><span className="landing-title-line" key={line} style={{'--word':i} as CSSProperties}>{line}</span>)}</h1><p>Твоя комната, любимая музыка и дождь за окном. Создай пространство, в котором приятно работать, отдыхать и просто быть.</p><div className="landing-actions"><button className="button primary" disabled={!ready} onClick={enter}>{user?'Открыть мою комнату':'Создать свою комнату'}<ArrowRight size={18}/></button><a href="#possibilities">Сначала осмотреться<ArrowDown size={16}/></a></div><span className="landing-fact">В браузере. Без установки.</span></div>
 <div className="landing-visual"><div className="landing-atmosphere"><RadioGroup label="Время суток в демо" options={times} value={time} change={setTime}/><RadioGroup label="Погода в демо" options={weatherOptions} value={weather} change={setWeather}/></div>
 <div className="landing-scene" role="img" aria-label="Комната MyRoom: рабочий стол, мягкий свет, растения и абстрактные картины"><div className="landing-posters">{times.flatMap(([t])=>weatherOptions.filter(([w])=>posterFrames.includes(`${t}-${w}`)).map(([w])=><Image key={`${t}-${w}`} src={`/landing/${t}-${w}.webp`} alt="" width={1040} height={850} priority={t==='evening'&&w==='clear'} loading={t==='evening'&&w==='clear'?undefined:'lazy'} sizes="(max-width: 768px) 100vw, 760px" className={t===time&&w===weather?'is-active':''}/>))}</div>{live&&<div className="landing-live" data-ready={loaded} aria-hidden="true"><LiveRoom time={time} weather={weather} onReady={()=>setLoaded(true)}/></div>}</div>
 <p className="landing-caption">Твоя музыка. Твой свет. Твоё место.</p></div><button className="button primary landing-mobile-entry" data-visible={pastHero} disabled={!ready} onClick={enter}>{user?'Открыть мою комнату':'Создать свою комнату'}<ArrowRight size={18}/></button></section>;
}

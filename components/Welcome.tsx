"use client";
import dynamic from 'next/dynamic';
import {useEffect,useState,useRef} from 'react';
import type {User} from '@supabase/supabase-js';
import {ArrowRight,ArrowLeft,Headphones,Armchair,CloudRain,Moon,Check,Plus} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import AccountPanel from './AccountPanel';
import LandingHero from './LandingHero';
const MyRoom=dynamic(()=>import('./MyRoom'),{ssr:false,loading:()=> <div className="welcome-loading" role="status">Открываем твою комнату…</div>});
export default function Welcome(){
  const [user,setUser]=useState<User|null>(null);
  const [ready,setReady]=useState(false);
  const [screen,setScreen]=useState<'landing'|'login'|'register'|'room'|'recovery'>('landing');
  const [authError,setAuthError]=useState(false);
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{
    let live=true;
    const url=new URL(window.location.href);
    const account=url.searchParams.get('account');
    const recovering=account==='recovery'||new URLSearchParams(url.hash.slice(1)).get('type')==='recovery';
    if(recovering)setScreen('recovery');
    else if(account)setScreen('login');
    if(new URLSearchParams(url.hash.slice(1)).has('error')){setAuthError(true);setScreen('login');}
    const subscription=supabase?.auth.onAuthStateChange((event,session)=>{
      if(!live)return;
      setUser(session?.user??null);setReady(true);
      if(event==='PASSWORD_RECOVERY')setScreen('recovery');
      else if(event==='SIGNED_OUT')setScreen('landing');
      else if(session && !recovering && (event==='INITIAL_SESSION'||event==='SIGNED_IN'||account==='profile'))setScreen(current=>current==='recovery'?current:event==='INITIAL_SESSION'||current==='login'||current==='register'||account==='profile'?'room':current);
    });
    if(!supabase)setReady(true);
    else void supabase.auth.getSession().then(({data,error})=>{
      if(!live)return;setUser(data.session?.user??null);setReady(true);
      if(error){setAuthError(true);setScreen('login');}
      else if(data.session&&!recovering)setScreen(current=>current==='recovery'?current:'room');
    }).catch(()=>{if(live){setReady(true);setAuthError(true);}});
    return()=>{live=false;subscription?.data.subscription.unsubscribe();};
  },[]);
  useEffect(()=>{if(screen!=='room')heading.current?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});},[screen]);
  useEffect(()=>{if(screen!=='landing')return;const root=document.querySelector('.landing-redesign');const header=root?.querySelector('header');const scroll=()=>header?.toggleAttribute('data-scrolled',window.scrollY>24);scroll();window.addEventListener('scroll',scroll,{passive:true});const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)root?.querySelectorAll('nav a').forEach(a=>a.toggleAttribute('data-active',a.getAttribute('href')===`#${entry.target.id}`));},{rootMargin:'-20% 0px -50% 0px'});root?.querySelectorAll('section[id]').forEach(el=>observer.observe(el));return()=>{window.removeEventListener('scroll',scroll);observer.disconnect();};},[screen]);
  const enter=(mode:'login'|'register')=>{setAuthError(false);setScreen(user?'room':mode);};
  if(!ready)return <div className="welcome-loading" role="status">Открываем твою комнату…</div>;
  if(screen==='room' && user)return <MyRoom/>;
  return <div className={`welcome ${screen==='landing'?'landing-redesign':''}`}>
    {screen==='landing'&&<a className="landing-skip" href="#landing-title">К содержимому</a>}
    <header className="welcome-header"><a className="studio-brand" href="/" onClick={e=>{e.preventDefault();setScreen('landing');}} aria-label="tiny me — главная"><span className="door-mark" aria-hidden="true"><i/><b/></span><span>tiny me<span className="brand-period">.</span></span></a>
      {screen==='landing'?<><nav aria-label="О приложении"><a href="#possibilities">Возможности</a><a href="#how-it-works">Как это работает</a><a href="#questions">Вопросы</a></nav><button className="button secondary" disabled={!ready} onClick={()=>enter('login')}>{user?'В мою комнату':'Войти'}<ArrowRight size={16}/></button></>:<button className="button secondary" onClick={()=>setScreen('landing')}><ArrowLeft size={16}/>На главную</button>}
    </header>
    {screen==='landing'?<main>
      <LandingHero ready={ready} user={!!user} enter={()=>enter('register')} heading={heading}/>
      <section className="welcome-features" id="possibilities"><div className="welcome-section-heading"><span className="welcome-kicker">ПРОСТРАНСТВО ПОД ТЕБЯ</span><h2>Уют складывается из деталей.</h2></div><div className="welcome-feature-grid">
        <article><Armchair size={26}/><h3>Обставь по-своему</h3><p>Переставляй мебель, меняй цвета и собирай любимые вещи. Даже маленькая фигурка найдёт место на полке.</p></article>
        <article><Headphones size={26}/><h3>Принеси свою музыку</h3><p>Загружай треки, собирай плейлисты и слушай в фоне. История прослушиваний останется рядом.</p></article>
        <article><CloudRain size={26}/><h3>Настрой настроение</h3><p>Тёплый вечер, дождливая ночь или снег за окном. Свет и звуки можно настроить отдельно.</p></article>
      </div></section>
      <section className="welcome-how" id="how-it-works"><div><span className="welcome-kicker">ОТ ПЕРВОГО ВХОДА ДО УЮТА</span><h2>Здесь всё просто.</h2><p>Одна комната. Много способов сделать её своей.</p><button className="button primary" disabled={!ready} onClick={()=>enter('register')}>Начать<ArrowRight size={16}/></button></div><ol><li><span>01</span><div><h3>Создай аккаунт</h3><p>Войди, чтобы сохранять комнату, покупки и музыку между устройствами.</p></div></li><li><span>02</span><div><h3>Выбери, что тебе нравится</h3><p>Расставь мебель, включи музыку и подбери атмосферу. Настройки всегда можно изменить.</p></div></li><li><span>03</span><div><h3>Побудь в своём пространстве</h3><p>Каждая полная минута запущенного таймера приносит 1 монету на новые вещи. Без суточного лимита.</p></div></li></ol></section>
      <section className="welcome-faq" id="questions"><span className="welcome-kicker">ПЕРЕД ТЕМ КАК ВОЙТИ</span><h2>Несколько простых ответов.</h2>{[
        ['Это игра?','tiny me — личная интерактивная комната. Здесь нет квестов, уровней и обязательных задач. Ты выбираешь, как проводить время.'],
        ['Можно слушать свою музыку?','Да. Загружай MP3 и WAV, собирай плейлисты и переключайся на другие вкладки. Воспроизведение работает, пока браузер позволяет странице оставаться активной.'],
        ['Где сохраняются мои вещи?','После входа комната, покупки и монеты сохраняются в аккаунте. Статистика музыки и часть настроек остаются в браузере. Старые гостевые данные автоматически не переносятся.'],
        ['Нужно что-то устанавливать?','Нет. MyRoom работает прямо в браузере. Для музыки сначала нажми Play, а для работы таймера оставляй страницу открытой.']
      ].map(([q,a])=><details key={q}><summary>{q}<Plus size={18}/></summary><p>{a}</p></details>)}</section>
      <section className="welcome-end"><Moon size={24}/><h2>Твой тихий вечер начинается здесь.</h2><button className="button primary" disabled={!ready} onClick={()=>enter('register')}>{user?'Вернуться в комнату':'Создать аккаунт'}<ArrowRight size={16}/></button><span><Check size={14}/>Настраивай под себя, меняй когда захочется.</span></section>
    </main>:<main className="welcome-auth"><h1 ref={heading} tabIndex={-1}>{screen==='recovery'?'Восстановление доступа.':screen==='register'?'Твоё место начинается здесь.':'С возвращением.'}</h1>{authError&&<p role="alert">Не удалось завершить вход. Попробуй снова или запроси новое письмо.</p>}{!ready?<p role="status">Проверяем вход…</p>:<AccountPanel key={`${screen}:${user?.id??'guest'}`} user={screen==='recovery'?user:null} recovery={screen==='recovery'} onRecovered={()=>{setScreen(user?'room':'login');window.history.replaceState(null,'','/');}} initialMode={screen==='register'?'register':'login'} balance={0} items={0} activeMs={0}/>}</main>}
    <footer className="welcome-footer"><span>tiny me.</span><p>Меньше шума. Больше своего.</p><span>Личное пространство в браузере</span></footer>
  </div>;
}

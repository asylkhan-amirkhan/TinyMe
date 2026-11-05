"use client";
import { useState, useRef, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { UserRound, Cloud, Mail, LockKeyhole, ArrowRight, LogOut, Check, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { authError, avatarColors, profileName } from '@/domain/profile';

type Mode = 'login' | 'register' | 'reset' | 'magic';
export default function AccountPanel({user, recovery, onRecovered, balance, items, activeMs, initialMode = 'login'}: {
  initialMode?: 'login'|'register'; user: User | null; recovery: boolean; onRecovered: () => void; balance: number; items: number; activeMs: number;
}) {
  const [mode,setMode]=useState<Mode>(initialMode);
  const [name,setName]=useState(profileName(user?.user_metadata));
  const [color,setColor]=useState(avatarColors.includes(user?.user_metadata?.avatar_color) ? user!.user_metadata.avatar_color as string : avatarColors[0]);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [show,setShow]=useState(false);
  const [busy,setBusy]=useState(false);
  const locked=useRef(false);
  const [feedback,setFeedback]=useState<{error:boolean;text:string}|null>(null);
  const [googleReady,setGoogleReady]=useState<boolean|null>(null);
  useEffect(()=>{
    const controller=new AbortController();
    if(supabase)void fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,{headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!},signal:controller.signal})
      .then(response=>{if(!response.ok)throw Error();return response.json();})
      .then(data=>setGoogleReady(data.external?.google===true)).catch(()=>{if(!controller.signal.aborted)setGoogleReady(false);});
    else setGoogleReady(false);
    return()=>controller.abort();
  },[]);
  const googleLogin=()=>run(async()=>{
    const {error}=await supabase!.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin+'/?account=profile'}});
    if(error)throw error;return 'Переходим в Google…';
  });
  const changeMode=(next:Mode)=>{setMode(next);setPassword('');setConfirm('');setFeedback(null);};
  const run=async(action:()=>Promise<string>)=>{
    if(locked.current || !supabase)return;
    locked.current=true;setBusy(true);setFeedback(null);
    try{setFeedback({error:false,text:await action()});}
    catch(error){setFeedback({error:true,text:authError(error)});}
    finally{locked.current=false;setBusy(false);}
  };
  const submit=()=>run(async()=>{
    const auth=supabase!.auth;
    const redirect=window.location.origin+'/?account=profile';
    if(recovery){
      if(password!==confirm)throw Error('PASSWORD_MISMATCH');
      const {error}=await auth.updateUser({password});if(error)throw error;
      setPassword('');setConfirm('');onRecovered();return 'Пароль обновлён.';
    }
    if(user){
      if(!name.trim())throw Error('NAME_REQUIRED');
      const {error}=await auth.updateUser({data:{display_name:name.trim(),avatar_color:color}});if(error)throw error;
      return 'Профиль сохранён.';
    }
    if(mode==='register'){
      if(!name.trim())throw Error('NAME_REQUIRED');
      if(password!==confirm)throw Error('PASSWORD_MISMATCH');
      const {data,error}=await auth.signUp({email:email.trim(),password,options:{emailRedirectTo:redirect,data:{display_name:name.trim(),avatar_color:color}}});
      if(error)throw error;setPassword('');setConfirm('');
      return data.session?'Добро пожаловать в MyRoom!':'Проверь почту для подтверждения регистрации. Если аккаунт уже есть, войди или восстанови пароль.';
    }
    if(mode==='reset'){
      const {error}=await auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+'/?account=recovery'});if(error)throw error;
      return 'Если для этой почты есть аккаунт, придёт письмо для восстановления пароля.';
    }
    if(mode==='magic'){
      const {error}=await auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:redirect,shouldCreateUser:false}});if(error)throw error;
      return 'Если аккаунт существует, ссылка для входа придёт на почту.';
    }
    const {error}=await auth.signInWithPassword({email:email.trim(),password});if(error)throw error;
    setPassword('');return 'Ты вошёл в аккаунт.';
  });
  if(recovery && !user)return <section className="account-card"><h2>Ссылка недействительна</h2><p>Срок действия ссылки истёк или вход не подтверждён. Запроси новое письмо для восстановления пароля.</p><button className="button primary" onClick={onRecovered}>Вернуться ко входу</button></section>;
  const passwordFields=recovery || (!user && (mode==='register'||mode==='login'));
  const newPassword=recovery || mode==='register';
  return <div className="account-layout">
    <aside className="account-story">
      <span className="account-avatar" style={{background:color}} aria-hidden="true">{name.trim()?name.trim().slice(0,1).toLocaleUpperCase('ru'):<UserRound size={32} strokeWidth={1.75}/>}</span>
      <span className="eyebrow">ТВОЁ МЕСТО В MYROOM</span>
      <h2>{user?'С возвращением'+(name.trim()?`, ${name.trim()}`:'')+'.':'Уют, который остаётся с тобой.'}</h2>
      <p>Сохраняй комнату, покупки и музыку в своём аккаунте и возвращайся к ним с другого устройства.</p>
      <div className="account-cloud"><Cloud size={18} strokeWidth={1.75}/><span>{user?'Облачный аккаунт':'Личное пространство в облаке'}</span></div>
      {user && <dl className="account-metrics"><div><dt>Монеты</dt><dd>{balance}</dd></div><div><dt>Вещи</dt><dd>{items}</dd></div><div><dt>Минуты в комнате</dt><dd>{Math.floor(activeMs/60000)}</dd></div></dl>}

    </aside>
    <section className="account-card" aria-label={user?'Профиль':'Вход и регистрация'}>
      {!user && !recovery && <div className="account-tabs" role="group" aria-label="Действие с аккаунтом"><button type="button" disabled={busy} aria-pressed={mode!=='register'} onClick={()=>changeMode('login')}>Вход</button><button type="button" disabled={busy} aria-pressed={mode==='register'} onClick={()=>changeMode('register')}>Регистрация</button></div>}
      <h2>{recovery?'Новый пароль':user?'Твой профиль':mode==='register'?'Начнём знакомство':mode==='reset'?'Вернём доступ':mode==='magic'?'Войти без пароля':'Рады видеть тебя'}</h2>
      <p>{recovery?'Придумай новый пароль для своего аккаунта.':user?'Имя и аватар видны в твоём профиле.':mode==='register'?'Почта, пароль и немного тебя.':mode==='reset'||mode==='magic'?'Отправим письмо со ссылкой на твою почту.':'Войди, чтобы открыть свою облачную комнату.'}</p>
      {!supabase && <p role="status" className="account-feedback">Облачный вход пока не настроен. Комната доступна в гостевом режиме.</p>}
      {!user && !recovery && <><button type="button" className="button secondary account-google" disabled={busy||!googleReady} onClick={()=>void googleLogin()}><span aria-hidden="true">G</span>Продолжить с Google</button>{googleReady===false&&<p className="account-google-note">Вход через Google пока подключается.</p>}<div className="account-divider">или по электронной почте</div></>}
      <form onSubmit={e=>{e.preventDefault();void submit();}} aria-busy={busy}>
        <fieldset disabled={busy || !supabase}>
          {!recovery && (user||mode==='register') && <><label htmlFor="account-name">Как тебя называть</label><input id="account-name" autoComplete="nickname" value={name} onChange={e=>setName(e.target.value)} required maxLength={40} placeholder="Твоё имя"/><div className="account-colors" role="group" aria-label="Цвет аватара">{avatarColors.map((c,i)=><button key={c} type="button" style={{background:c}} aria-label={`Цвет аватара ${i+1}`} aria-pressed={color===c} onClick={()=>setColor(c)}>{color===c&&<Check size={16}/>}</button>)}</div></>}
          {!recovery && <><label htmlFor="account-email">Электронная почта</label><input id="account-email" type="email" autoComplete="email" required value={user?.email??email} readOnly={!!user} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>{user&&<small>Почта используется для входа и восстановления доступа.</small>}</>}
          {passwordFields && <><label htmlFor="account-password">{newPassword?'Новый пароль':'Пароль'}</label><div className="account-password"><input id="account-password" type={show?'text':'password'} autoComplete={newPassword?'new-password':'current-password'} minLength={newPassword?8:undefined} required value={password} onChange={e=>setPassword(e.target.value)} aria-describedby={newPassword?'password-help':undefined}/><button type="button" aria-label={show?'Скрыть пароль':'Показать пароль'} aria-pressed={show} onClick={()=>setShow(!show)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>{newPassword&&<><small id="password-help">Не менее 8 символов. Можно использовать менеджер паролей.</small><label htmlFor="account-confirm">Повтори пароль</label><input id="account-confirm" type={show?'text':'password'} autoComplete="new-password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)}/></>}</>}
          <button className="button primary account-submit" type="submit">{busy?'Подожди…':recovery?'Сохранить пароль':user?'Сохранить профиль':mode==='register'?'Создать аккаунт':mode==='reset'||mode==='magic'?'Отправить письмо':'Войти'}<ArrowRight size={16} strokeWidth={1.75}/></button>
        </fieldset>
      </form>
      {feedback && <p className="account-feedback" data-error={feedback.error} role={feedback.error?'alert':'status'}>{feedback.text}</p>}
      {!user && !recovery && <div className="account-links"><button type="button" disabled={busy} onClick={()=>changeMode(mode==='reset'?'login':'reset')}><LockKeyhole size={16}/>{mode==='reset'?'Назад ко входу':'Забыл пароль'}</button><button type="button" disabled={busy} onClick={()=>changeMode(mode==='magic'?'login':'magic')}><Mail size={16}/>{mode==='magic'?'Войти с паролем':'Войти по ссылке'}</button></div>}
      {user && !recovery && <div className="account-footer"><span>С нами с {new Date(user.created_at).toLocaleDateString('ru-RU')}</span><button className="button secondary" disabled={busy} onClick={()=>void run(async()=>{const {error}=await supabase!.auth.signOut();if(error)throw error;return 'Ты вышел из аккаунта.';})}><LogOut size={16}/>Выйти</button></div>}
    </section>
      <p className="account-note">Гостевая комната и аккаунт хранятся отдельно. Автоматического переноса вещей, монет и музыки пока нет.</p>
  </div>;
}

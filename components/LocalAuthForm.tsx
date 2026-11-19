'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, UserRound, ArrowRight, House } from 'lucide-react';
import { accountsKey, localAuthEvent, loginLocal, registerLocal, startLocalSession, type LocalRole } from '@/lib/local-auth';
import { isShopPath } from '@/domain/shop';
import styles from './local-auth.module.css';

export default function LocalAuthForm({ register = false, next }: { register?: boolean; next?: string }) {
  const router = useRouter();
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<LocalRole>('user'), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setError('');
    if (register && password !== confirm) { setError('Пароли не совпадают.'); return; }
    setBusy(true);
    try {
      const create = () => registerLocal(localStorage, { name, email, password, role });
      const account = register
        ? await (navigator.locks ? navigator.locks.request(accountsKey, create) : create())
        : await loginLocal(localStorage, email, password);
      startLocalSession(sessionStorage, account);
      window.dispatchEvent(new Event(localAuthEvent));
      setPassword(''); setConfirm('');
      const allowed = next && (next === '/room' || next === '/graph' || isShopPath(next.split(/[?#]/, 1)[0]) || (next === '/admin' && account.role === 'admin'));
      router.replace(allowed ? next : account.role === 'admin' ? '/admin' : '/room');
    } catch (e) { setError(e instanceof DOMException ? 'Не удалось сохранить вход. Разреши хранение данных сайта в браузере.' : e instanceof Error ? e.message : 'Не удалось войти. Попробуй ещё раз.'); }
    finally { setBusy(false); }
  }
  return <main className={styles.page}><Link className={styles.brand} href="/"><House size={22}/> tiny me.</Link>
    <section className={styles.card} aria-labelledby="local-auth-title"><span className={styles.kicker}>ТВОЁ МАЛЕНЬКОЕ ПРОСТРАНСТВО</span>
      <h1 id="local-auth-title">{register ? 'Начнём с тебя.' : 'С возвращением.'}</h1><p className={styles.lead}>{register ? 'Создай локальный аккаунт и выбери, как пользоваться TinyMe.' : 'Войди в аккаунт, созданный в этом браузере.'}</p>
      <form onSubmit={e => void submit(e)}>
        <fieldset disabled={busy} className={styles.fields}>
          {register && <label>Имя<input autoComplete="nickname" required minLength={2} maxLength={50} value={name} onChange={e => setName(e.target.value)}/></label>}
          <label>Email<input autoComplete="username" type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)}/></label>
          <label>Пароль<input type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 8 : undefined} maxLength={256} value={password} onChange={e => setPassword(e.target.value)}/>{register && <small>Не менее 8 символов</small>}</label>
          {register && <><label>Повтори пароль<input type="password" autoComplete="new-password" required minLength={8} maxLength={256} value={confirm} onChange={e => setConfirm(e.target.value)}/></label>
            <fieldset className={styles.roles}><legend>Как будешь пользоваться?</legend>{([{value:'user',title:'Пользователь',text:'Комната, музыка и развитие',icon:UserRound},{value:'admin',title:'Администратор',text:'Всё это и мастерская',icon:ShieldCheck}] as const).map(option => <label key={option.value} data-selected={role === option.value}><input type="radio" name="role" value={option.value} checked={role === option.value} onChange={() => setRole(option.value)}/><option.icon size={23}/><span><strong>{option.title}</strong><small>{option.text}</small></span></label>)}</fieldset>
          </>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button className={styles.submit} type="submit">{busy ? 'Подождите…' : register ? 'Создать аккаунт' : 'Войти'}<ArrowRight size={18}/></button>
        </fieldset>
      </form>
      <p className={styles.switch}>{register ? 'Уже есть аккаунт? ' : 'Ещё нет аккаунта? '}<Link href={{ pathname: register ? '/login' : '/register', query: next ? { next } : undefined }}>{register ? 'Войти' : 'Зарегистрироваться'}</Link></p>
      <p className={styles.note}>Локальный прототип: аккаунты доступны только в этом браузере. Выбор администратора предназначен для тестирования. Комната и музыка пока общие для аккаунтов этого браузера.</p>
    </section>
  </main>;
}

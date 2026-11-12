"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase, rpc } from '@/lib/supabase';
import { AdminPanel } from './admin-panel';

type AdminUser = { user_id: string; username: string; email: string; role: 'user'|'admin'; created_at: string };

export function AdminAccess() {
  const [access, setAccess] = useState<'loading'|'denied'|'allowed'|'error'>('loading');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [offset, setOffset] = useState(0);
  const [self, setSelf] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [collection, setCollection] = useState(false);
  const load = useCallback(async () => {
    const data = await rpc<AdminUser[]>('admin_users', { p_offset: offset });
    setUsers(data);
  }, [offset]);

  useEffect(() => {
    let live = true;
    let generation = 0;
    const check = async () => {
      const version = ++generation;
      try {
        if (!supabase) { if (live) setAccess('error'); return; }
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!live || version !== generation) return;
        if (error || !user) { setAccess('denied'); setUsers([]); return; }
        const profile = await rpc<{role: string}>('my_profile');
        if (!live || version !== generation) return;
        if (profile?.role !== 'admin') { setAccess('denied'); setUsers([]); return; }
        const data = await rpc<AdminUser[]>('admin_users', { p_offset: offset });
        if (!live || version !== generation) return;
        setSelf(user.id); setUsers(data); setAccess('allowed');
      } catch {
        if (live && version === generation) { setUsers([]); setAccess('error'); }
      }
    };
    void check();
    const subscription = supabase?.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        generation++; setUsers([]); setAccess('denied');
      } else setTimeout(() => { if (live) void check(); }, 0);
    });
    window.addEventListener('focus', check);
    return () => { live = false; subscription?.data.subscription.unsubscribe(); window.removeEventListener('focus', check); };
  }, [offset]);

  async function changeRole(user: AdminUser) {
    setBusy(true); setMessage('');
    try {
      await rpc('admin_set_role', { p_user: user.user_id, p_role: user.role === 'admin' ? 'user' : 'admin' });
      await load();
      setMessage('Роль обновлена. Новые права уже действуют на сервере.');
    } catch { setMessage('Не удалось изменить роль. Проверь подключение и права администратора.'); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-6xl p-6 sm:p-10">
    <Link href="/room" className="button secondary">Вернуться в комнату</Link>
    <h1 className="my-6 text-3xl">Администрирование TinyMe</h1>
    {access === 'loading' && <p role="status">Проверяем права…</p>}
    {access === 'denied' && <p role="alert">Доступ только для администратора. <Link href="/room?account=profile">Войти в аккаунт</Link></p>}
    {access === 'error' && <p role="alert">Не удалось проверить доступ. Проверь запуск backend и обнови страницу.</p>}
    {access === 'allowed' && <>
      <nav className="my-6 flex gap-4" aria-label="Администрирование">
        <button className="button secondary" onClick={() => setCollection(false)} aria-pressed={!collection}>Пользователи</button>
        <button className="button secondary" onClick={() => setCollection(true)} aria-pressed={collection}>Макет коллекций</button>
        <button className="button secondary" disabled={busy} onClick={async () => {
          setBusy(true);
          try {
            const result = await supabase!.auth.signOut({ scope: 'local' });
            if (result.error) throw result.error;
          } catch { setMessage('Не удалось выйти. Проверь подключение и повтори.'); }
          finally { setBusy(false); }
        }}>Выйти</button>
      </nav>
      {message && <p role="status" className="my-4">{message}</p>}
      {collection ? <AdminPanel/> : <section aria-label="Пользователи">
        <p className="my-4">Управляй доступом зарегистрированных пользователей. Собственную роль изменить нельзя.</p>
        <div className="overflow-x-auto"><table className="w-full text-left">
          <thead><tr>{['Логин', 'Email', 'Роль', 'Регистрация', 'Действие'].map(value => <th key={value} className="p-3">{value}</th>)}</tr></thead>
          <tbody>{users.map(user => <tr key={user.user_id} className="border-t border-line">
            <td className="p-3">{user.username}</td><td className="p-3">{user.email}</td>
            <td className="p-3">{user.role === 'admin' ? 'Администратор' : 'Пользователь'}</td>
            <td className="p-3">{new Date(user.created_at).toLocaleDateString('ru-RU')}</td>
            <td className="p-3"><button className="button secondary" disabled={busy || user.user_id === self} onClick={() => void changeRole(user)}>
              {user.role === 'admin' ? 'Снять права' : 'Назначить администратором'}
            </button></td>
          </tr>)}</tbody>
        </table></div>
        <div className="my-6 flex gap-4">
          <button className="button secondary" disabled={busy || offset === 0} onClick={() => { setAccess('loading'); setOffset(Math.max(0, offset - 50)); }}>Назад</button>
          <button className="button secondary" disabled={busy || users.length < 50} onClick={() => { setAccess('loading'); setOffset(offset + 50); }}>Далее</button>
        </div>
      </section>}
    </>}
  </main>;
}

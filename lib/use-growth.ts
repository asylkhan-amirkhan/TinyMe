"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { parseGrowth, type GrowthCommand, type GrowthState } from '@/domain/growth';
import { guestGrowthKey as guestKey, readGuestGrowth, commitGuestGrowth } from './growth-storage';
import { supabase } from './supabase';

const growthChanged = 'tinyme:growth-changed';
function storageError(error: unknown) {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') return 'Память браузера заполнена. Изменение не сохранено.';
  return error instanceof Error ? error.message : 'Не удалось сохранить прогресс. Попробуй ещё раз.';
}
async function cloud(command?: GrowthCommand) {
  if (!supabase) throw Error('Вход в аккаунт недоступен');
  const { data, error } = await supabase.rpc('tinyme_growth', { p_command: command ?? null });
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') throw Error('Облачный прогресс ещё не подключён. Попробуй позже или обратись к владельцу приложения.');
    throw Error('Не удалось получить или сохранить облачный прогресс. Проверь соединение и вход в аккаунт.');
  }
  return { state: parseGrowth(data.state), changed: data.changed === true };
}
export function useGrowth(userId: string | undefined, ready: boolean) {
  const scope = userId ?? 'guest';
  const identity = useRef<string | null>(scope);
  const pending = useRef(false);
  const request = useRef(0);
  const [snapshot, setSnapshot] = useState<{ scope: string; state: GrowthState } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const invalidate = useCallback(() => { ++request.current; }, []);
  useLayoutEffect(() => { identity.current = scope; return () => { identity.current = null; invalidate(); }; }, [scope, invalidate]);
  const reload = useCallback(async () => {
    if (!ready || pending.current) return;
    const ticket = ++request.current;
    try {
      const state = userId ? (await cloud()).state : readGuestGrowth(localStorage);
      if (identity.current === scope && ticket === request.current) { setSnapshot({ scope, state }); setError(''); }
    } catch (e) { if (identity.current === scope && ticket === request.current) { setSnapshot(null); setError(storageError(e)); } }
  }, [ready, scope, userId]);
  useEffect(() => {
    const refresh = () => { void reload(); };
    // Read external storage after subscribing, so a synchronous guest read cannot
    // miss a storage event between initial render and listener installation.
    const initial = setTimeout(refresh, 0);
    const storage = (e: StorageEvent) => { if (!userId && (e.key === guestKey || e.key === null)) refresh(); };
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', storage);
    window.addEventListener(growthChanged, refresh);
    return () => { clearTimeout(initial); invalidate(); window.removeEventListener('focus', refresh); window.removeEventListener('storage', storage); window.removeEventListener(growthChanged, refresh); };
  }, [reload, userId, invalidate]);
  const run = useCallback(async (command: GrowthCommand) => {
    if (!ready || pending.current || snapshot?.scope !== scope) return null;
    pending.current = true; setBusy(true); setError(''); ++request.current;
    let saved = false;
    try {
      const result = userId ? await cloud(command) : await (async () => {
        if (!navigator.locks) throw Error('Для безопасного сохранения обнови браузер: нужен Web Locks API.');
        return navigator.locks.request(guestKey, () => commitGuestGrowth(localStorage, command, new Date().toISOString()));
      })();
      if (identity.current !== scope) return null;
      saved = true;
      setSnapshot({ scope, state: result.state });
      return result;
    } catch (e) { if (identity.current === scope) setError(storageError(e)); return null; }
    finally { pending.current = false; setBusy(false); if (saved || identity.current !== scope) window.dispatchEvent(new Event(growthChanged)); }
  }, [ready, scope, userId, snapshot?.scope]);
  return { state: ready && snapshot?.scope === scope ? snapshot.state : null, busy, error, reload, run, cloud: !!userId };
}

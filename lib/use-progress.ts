'use client';
import { useEffect, useRef, useState } from 'react';
import { initialProgress, type ProgressCommand } from '@/domain/progress';
import { progressKey, readProgress, saveProgressCommand } from './progress-storage';

export function useProgress() {
  const [data, setData] = useState(initialProgress);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    const read = () => {
      try { setData(readProgress(localStorage)); setError(''); }
      catch (e) { setError(e instanceof Error ? e.message : 'Хранилище браузера недоступно.'); }
      setLoaded(true);
    };
    read();
    const sync = (event: StorageEvent) => { if (event.key === progressKey || event.key === null) read(); };
    window.addEventListener('storage', sync);
    window.addEventListener('focus', read);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('focus', read); };
  }, []);
  const command = async (command: ProgressCommand) => {
    if (!loaded || pending.current) return null;
    pending.current = true; setBusy(true); setError('');
    try {
      const save = () => saveProgressCommand(localStorage, command);
      // Serialize read-modify-write across tabs on localhost and secure origins.
      const next = navigator.locks ? await navigator.locks.request(progressKey, save) : save();
      setData(next);
      return next;
    } catch (e) {
      setError(e instanceof DOMException
        ? 'Не удалось записать прогресс в браузере. Проверь доступ к хранилищу и свободное место. Изменение не сохранено.'
        : e instanceof Error ? e.message : 'Не удалось сохранить изменения.');
      return null;
    } finally { pending.current = false; setBusy(false); }
  };
  return { data, loaded, busy, error, command };
}

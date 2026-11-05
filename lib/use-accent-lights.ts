"use client";
import { useEffect, useRef, useState } from 'react';
import { accentLightsKey, defaultAccentLights, parseAccentLights, type AccentLights } from '@/domain/accent-lights';

export function useAccentLights(onNotice: (message: string) => void) {
  const [value, setValue] = useState<AccentLights>(defaultAccentLights);
  const [ready, setReady] = useState(false);
  const current = useRef(value);
  current.current = value;
  useEffect(() => {
    try { setValue(parseAccentLights(localStorage.getItem(accentLightsKey))); } catch { /* Use defaults when storage is unavailable. */ }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key === accentLightsKey || event.key === null) setValue(parseAccentLights(event.newValue));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const update = (patch: Partial<AccentLights>) => {
    const next = parseAccentLights(JSON.stringify({ ...current.current, ...patch }));
    current.current = next;
    setValue(next);
    try { localStorage.setItem(accentLightsKey, JSON.stringify(next)); }
    catch { onNotice('Свет переключён, но браузер не разрешил сохранить настройку.'); }
  };
  const toggle = (key: 'garland' | 'desk') => update({ [key]: !current.current[key] });
  return { value, ready, toggle, update };
}

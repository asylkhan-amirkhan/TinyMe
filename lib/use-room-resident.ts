"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Resident, ResidentAction, ResidentCommand, ResidentMode } from '@/domain/resident';
import { defaultResidentLook, readResidentLook, residentLookOf, writeResidentLook, type ResidentLook } from '@/domain/resident-look';

export type ResidentScene = { body: Resident | null; geometry: string; commandKey: number };
export function useRoomResident(scope: string) {
  const scene = useRef<ResidentScene>({ body: null, geometry: '', commandKey: 0 });
  const sequence = useRef(0);
  const [mode, setMode] = useState<ResidentMode>('auto');
  const [status, setStatus] = useState('Осматривается');
  const [command, setCommand] = useState<ResidentCommand | null>(null);
  const [appearance, setAppearance] = useState({ scope: '', look: defaultResidentLook });
  useEffect(() => {
    try {
      const saved = localStorage.getItem('myroom:resident-mode');
      if (saved && ['auto', 'direct', 'paused', 'hidden'].includes(saved)) setMode(saved as ResidentMode);
    } catch { /* Session preferences still work when storage is unavailable. */ }
  }, []);
  useEffect(() => {
    scene.current = { body: null, geometry: '', commandKey: sequence.current };
    setCommand(null); setStatus('Осматривается');
    let look = { ...defaultResidentLook };
    try { look = readResidentLook(localStorage, scope); } catch { /* Storage may be unavailable. */ }
    setAppearance({ scope, look });
  }, [scope]);
  const saveLook = useCallback((value: ResidentLook) => {
    const look = residentLookOf(value);
    setAppearance({ scope, look });
    try { return writeResidentLook(localStorage, scope, look); } catch { return false; }
  }, [scope]);
  const choose = useCallback((value: ResidentMode) => {
    setMode(value); setCommand(null);
    try { localStorage.setItem('myroom:resident-mode', value); } catch { /* Keep the in-memory preference. */ }
  }, []);
  const send = useCallback((action: ResidentAction) => {
    choose('direct');
    setCommand({ key: ++sequence.current, action });
  }, [choose]);
  return { scene, mode, choose, status, setStatus, command, send, saveLook,
    look: appearance.scope === scope ? appearance.look : defaultResidentLook, lookReady: appearance.scope === scope };
}

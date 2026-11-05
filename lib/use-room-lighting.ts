"use client";
import { useEffect, useState } from 'react';
import { resolveDaylight, validLightingMode, type LightingMode } from '@/domain/lighting';
export function useRoomLighting() {
 const [mode,setMode]=useState<LightingMode>('auto');
 const [daylight,setDaylight]=useState(0);
 useEffect(()=>{
  try {const saved=localStorage.getItem('myroom:lighting');if(validLightingMode(saved))setMode(saved);}catch{}
 },[]);
 useEffect(()=>{
  const update=()=>setDaylight(resolveDaylight(mode,new Date()));
  update();const timer=setInterval(update,30000);
  const visible=()=>{if(!document.hidden)update();};
  document.addEventListener('visibilitychange',visible);window.addEventListener('focus',update);
  return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('focus',update);};
 },[mode]);
 const choose=(value:LightingMode)=>{setMode(value);setDaylight(resolveDaylight(value,new Date()));try{localStorage.setItem('myroom:lighting',value);}catch{}};
 return {mode,daylight,choose};
}

"use client";
import {useEffect,useState} from 'react';
import {parseSeason,resolveSeason,seasonKey,type SeasonMode} from '@/domain/season';
export function useSeason(onNotice:(message:string)=>void){
 const [mode,setMode]=useState<SeasonMode>('auto'),[date,setDate]=useState<Date|null>(null);
 useEffect(()=>{
  try{setMode(parseSeason(localStorage.getItem(seasonKey)));}catch{}
  const refresh=()=>setDate(new Date());refresh();
  const sync=(e:StorageEvent)=>{if(e.key===seasonKey||e.key===null)setMode(parseSeason(e.newValue));};
  const timer=setInterval(refresh,60000);window.addEventListener('focus',refresh);window.addEventListener('storage',sync);
  return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('storage',sync);};
 },[]);
 const choose=(value:string)=>{const next=parseSeason(value);setMode(next);setDate(new Date());try{localStorage.setItem(seasonKey,next);}catch{onNotice('Сезон изменён, но браузер не разрешил сохранить настройку.');}};
 return {mode,season:date?resolveSeason(mode,date):'summer' as const,ready:date!==null,choose};
}

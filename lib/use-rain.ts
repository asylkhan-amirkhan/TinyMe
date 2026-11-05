"use client";
import { useEffect, useRef, useState } from 'react';
import { rainVolume } from '@/domain/rain';
import { snowIntensity as normalizeSnow } from '@/domain/snow';
import { RainSound } from './rain-sound';
export function useRain(){
 const [enabled,setEnabled]=useState(false),[sound,setSound]=useState(false),[volume,setVolume]=useState(.35),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [snowIntensity,setSnowIntensity]=useState(50);
 const engine=useRef<RainSound|null>(null),lock=useRef(false),live=useRef(true),level=useRef(volume);
 useEffect(()=>{
  live.current=true;
  try{const saved=JSON.parse(localStorage.getItem('myroom:rain')??'{}');setEnabled(saved.enabled===true);setSnowIntensity(normalizeSnow(saved.snowIntensity));setVolume(rainVolume(saved.volume));level.current=rainVolume(saved.volume);}catch{}
  return()=>{live.current=false;engine.current?.dispose();engine.current=null;};
 },[]);
 const save=(rain:boolean,value:number,snow=snowIntensity)=>{try{localStorage.setItem('myroom:rain',JSON.stringify({enabled:rain,volume:value,snowIntensity:snow}));}catch{}};
 const configure=(settings:{enabled:boolean;volume:number;snowIntensity:number})=>{
  const nextVolume=rainVolume(settings.volume),nextSnow=normalizeSnow(settings.snowIntensity);
  setEnabled(settings.enabled);setVolume(nextVolume);setSnowIntensity(nextSnow);level.current=nextVolume;
  engine.current?.setVolume(nextVolume);save(settings.enabled,nextVolume,nextSnow);
 };
 const toggle=()=>{setEnabled(!enabled);save(!enabled,volume);};
 const changeVolume=(value:number)=>{const next=rainVolume(value);level.current=next;setVolume(next);if(sound)engine.current?.setVolume(next);save(enabled,next);};
 const changeSnowIntensity=(value:number)=>{const next=normalizeSnow(value);setSnowIntensity(next);save(enabled,volume,next);};
 const setSoundEnabled=async(on:boolean):Promise<boolean>=>{
  if(lock.current)return false;
  setError('');
  if(!on){engine.current?.stop();setSound(false);return true;}
  if(sound)return true;
  lock.current=true;setBusy(true);
  try{const active=engine.current??=new RainSound();await active.start(level.current);if(live.current&&engine.current===active){active.setVolume(level.current);setSound(true);return true;}return false;}
  catch{engine.current?.dispose();engine.current=null;if(live.current){setSound(false);setError('Не удалось включить дождь. Попробуйте ещё раз.');}return false;}
  finally{lock.current=false;if(live.current)setBusy(false);}
 };
 const toggleSound=()=>setSoundEnabled(!sound);
 return {configure,snowIntensity,changeSnowIntensity,enabled,sound,volume,busy,error,toggle,toggleSound,setSoundEnabled,changeVolume};
}

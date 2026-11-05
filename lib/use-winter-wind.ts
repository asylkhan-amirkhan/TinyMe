"use client";
import { useEffect, useRef, useState } from 'react';
import { rainVolume } from '@/domain/rain';
import { WinterWind } from './winter-wind';
export function useWinterWind(){
 const [sound,setSound]=useState(false),[volume,setVolume]=useState(.35),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const engine=useRef<WinterWind|null>(null),lock=useRef(false),live=useRef(true),level=useRef(volume);
 useEffect(()=>{
  live.current=true;
  try{const saved=JSON.parse(localStorage.getItem('myroom:winter-wind')??'{}');setVolume(rainVolume(saved.volume));level.current=rainVolume(saved.volume);}catch{}
  return()=>{live.current=false;engine.current?.dispose();engine.current=null;};
 },[]);
 const save=(value:number)=>{try{localStorage.setItem("myroom:winter-wind",JSON.stringify({volume:value}));}catch{}};
 const changeVolume=(value:number)=>{const next=rainVolume(value);level.current=next;setVolume(next);if(sound)engine.current?.setVolume(next);save(next);};
 const setSoundEnabled=async(on:boolean):Promise<boolean>=>{
  if(lock.current)return false;
  setError('');
  if(!on){engine.current?.stop();setSound(false);return true;}
  if(sound)return true;
  lock.current=true;setBusy(true);
  try{const active=engine.current??=new WinterWind();await active.start(level.current);if(live.current&&engine.current===active){active.setVolume(level.current);setSound(true);return true;}return false;}
  catch{engine.current?.dispose();engine.current=null;if(live.current){setSound(false);setError('Не удалось включить ветер. Попробуйте ещё раз.');}return false;}
  finally{lock.current=false;if(live.current)setBusy(false);}
 };
 const toggleSound=()=>setSoundEnabled(!sound);
 return {sound,volume,busy,error,toggleSound,setSoundEnabled,changeVolume};
}

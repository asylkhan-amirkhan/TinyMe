"use client";
import { useEffect, useRef, useState } from 'react';
import { rainVolume } from '@/domain/rain';
import { nextStormDelay, stormStrike, type Lightning } from '@/domain/storm';
import { ThunderSound } from './thunder-sound';

export function useStorm(motionEnabled:boolean) {
 const [enabled,setEnabled]=useState(false),[sound,setSound]=useState(false),[volume,setVolume]=useState(.35);
 const [flash,setFlash]=useState<Lightning|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[cooldown,setCooldown]=useState(false);
 const engine=useRef<ThunderSound|null>(null),live=useRef(true),lock=useRef(false),level=useRef(.35),last=useRef(-Infinity);
 const cooldownTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const current=useRef({enabled,sound,motionEnabled});current.current={enabled,sound,motionEnabled};
 useEffect(()=>{
  live.current=true;
  try{const saved=JSON.parse(localStorage.getItem('myroom:storm')??'{}');setEnabled(saved.enabled===true);level.current=rainVolume(saved.volume);setVolume(level.current);}catch{}
  return()=>{live.current=false;if(cooldownTimer.current)clearTimeout(cooldownTimer.current);engine.current?.dispose();engine.current=null;};
 },[]);
 const save=(on:boolean,value:number)=>{try{localStorage.setItem('myroom:storm',JSON.stringify({enabled:on,volume:value}));}catch{}};
 const strike=()=>{
  const now=performance.now();
  if(document.hidden||now-last.current<8000)return;
  last.current=now;
  const event=stormStrike(now);
  if(current.current.enabled&&current.current.motionEnabled)setFlash(event);
  if(current.current.sound)engine.current?.play(event);
  setCooldown(true);
  if(cooldownTimer.current)clearTimeout(cooldownTimer.current);
  cooldownTimer.current=setTimeout(()=>{if(live.current)setCooldown(false);},8000);
 };
 const strikeRef=useRef(strike);strikeRef.current=strike;
 useEffect(()=>{
  if(!enabled&&!sound)return;
  let timer:ReturnType<typeof setTimeout>;
  const tick=()=>{strikeRef.current();timer=setTimeout(tick,nextStormDelay());};
  timer=setTimeout(tick,2500);
  return()=>clearTimeout(timer);
 },[enabled,sound]);
 const configure=(settings:{enabled:boolean;volume:number})=>{
  const next=rainVolume(settings.volume);level.current=next;setVolume(next);setEnabled(settings.enabled);setFlash(null);
  current.current={...current.current,enabled:settings.enabled};engine.current?.setVolume(next);save(settings.enabled,next);
 };
 const toggle=()=>{setEnabled(!enabled);setFlash(null);save(!enabled,volume);};
 const changeVolume=(value:number)=>{const next=rainVolume(value);level.current=next;setVolume(next);if(sound)engine.current?.setVolume(next);save(enabled,next);};
 const setSoundEnabled=async(on:boolean):Promise<boolean>=>{
  if(lock.current)return false;
  setError('');
  if(!on){engine.current?.stop();setSound(false);current.current={...current.current,sound:on};return true;}
  if(sound)return true;
  lock.current=true;setBusy(true);
  try{const active=engine.current??=new ThunderSound();await active.start(level.current);if(live.current&&engine.current===active){active.setVolume(level.current);setSound(true);current.current={...current.current,sound:on};return true;}return false;}
  catch{engine.current?.dispose();engine.current=null;if(live.current){setSound(false);setError('Не удалось загрузить гром. Попробуйте ещё раз.');}return false;}
  finally{lock.current=false;if(live.current)setBusy(false);}
 };
 const toggleSound=()=>setSoundEnabled(!sound);
 return {configure,enabled,sound,volume,flash:enabled?flash:null,busy,error,cooldown,toggle,toggleSound,setSoundEnabled,changeVolume,strike,motionEnabled};
}

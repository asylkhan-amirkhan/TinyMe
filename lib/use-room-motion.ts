"use client";
import { useEffect, useState } from 'react';
export function useRoomMotion() {
 const [enabled,setEnabled]=useState(false),[reduced,setReduced]=useState(false);
 useEffect(()=>{
  const query=window.matchMedia('(prefers-reduced-motion: reduce)');
  const update=()=>setReduced(query.matches);
  update();query.addEventListener('change',update);
  try {setEnabled(localStorage.getItem('myroom:motion')!=='off');} catch {setEnabled(true);}
  return ()=>query.removeEventListener('change',update);
 },[]);
 const toggle=()=>{const value=!enabled;setEnabled(value);try{localStorage.setItem('myroom:motion',value?'on':'off');}catch{/* Preference still applies for this session. */}};
 return {enabled:enabled&&!reduced,reduced,toggle};
}

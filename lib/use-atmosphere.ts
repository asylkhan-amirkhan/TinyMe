"use client";
import {useEffect,useRef,useState} from 'react';
import {atmospherePresets,matchingAtmosphere,type AtmospherePreset} from '@/domain/atmosphere';
import {applyAtmosphere} from './apply-atmosphere';
import type {useRoomLighting} from './use-room-lighting';
import type {useSeason} from './use-season';
import type {useAccentLights} from './use-accent-lights';
import type {useRain} from './use-rain';
import type {useStorm} from './use-storm';
import type {useWinterWind} from './use-winter-wind';
type Controls={lighting:ReturnType<typeof useRoomLighting>;season:ReturnType<typeof useSeason>;accentLights:ReturnType<typeof useAccentLights>;rain:ReturnType<typeof useRain>;storm:ReturnType<typeof useStorm>;wind:ReturnType<typeof useWinterWind>};
export function useAtmosphere(controls:Controls,onNotice:(message:string)=>void){
 const [pending,setPending]=useState<AtmospherePreset['id']|null>(null),[error,setError]=useState('');
 const locked=useRef(false),live=useRef(true);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const {lighting,season,accentLights,rain,storm,wind}=controls;
 const ready=season.ready&&accentLights.ready;
 const busy=!!pending||rain.busy||storm.busy||wind.busy;
 const active=ready?matchingAtmosphere({lighting:lighting.mode,season:season.mode,lights:accentLights.value,rain,storm,wind}):null;
 const apply=async(id:AtmospherePreset['id'])=>{
  const preset=atmospherePresets.find(p=>p.id===id);
  if(!preset||!ready||busy||locked.current)return;
  locked.current=true;setPending(id);setError('');
  try{
   const complete=await applyAtmosphere(preset,controls);
   if(!live.current)return;
   if(complete)onNotice('Атмосфера «'+preset.name+'» включена');
   else {const message='Свет и погода настроены, но звук не включился. Нажми на атмосферу ещё раз.';setError(message);onNotice(message);}
  }catch{if(live.current)setError('Не удалось применить атмосферу целиком. Попробуй ещё раз.');}
  finally{locked.current=false;if(live.current)setPending(null);}
 };
 return {active,pending,busy,ready,error,apply};
}

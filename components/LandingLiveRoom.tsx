"use client";
import {useRef} from 'react';
import RoomCanvas from './RoomCanvas';
import {defaultResidentLook} from '@/domain/resident-look';
import type {ResidentScene} from '@/lib/use-room-resident';
import {demoItems,demoAppearance,demoLights,demoDaylight,type DemoTime,type DemoWeather} from './landing-demo-config';
const noop=()=>{};const spectrum=new Float32Array(32);const readSpectrum=()=>spectrum;const noDrop=async()=>false;
export default function LandingLiveRoom({time,weather,onReady}:{time:DemoTime;weather:DemoWeather;onReady:()=>void}){
 const resident=useRef<ResidentScene>({body:null,geometry:'',commandKey:0});
 return <RoomCanvas demoSky={time} interactionLocked readOnly disabled editing={false} selected={null} draft={null} zoom={1} items={demoItems} appearance={demoAppearance} accentLights={demoLights} season={weather==='snow'?'winter':'summer'} snowIntensity={45} raining={weather!=='clear'} storming={false} lightning={null} daylight={demoDaylight[time]} motionEnabled musicPlaying={false} readSpectrum={readSpectrum} residentLook={defaultResidentLook} residentScene={resident} residentMode="hidden" residentCommand={null} onReady={onReady} onResidentStatus={noop} onDrop={noDrop} onRotate={noop} onInteract={noop} onDragMessage={noop} onPlacementPreview={noop} onDeselect={noop} onSelect={noop}/>;
}

"use client";
import {useEffect,useRef,useState} from 'react';
import {X,RotateCw,RotateCcw} from 'lucide-react';
import type {Product} from '@/domain/model';
import {furniturePreview} from '@/engine/isometric';
import {characterDetails} from '@/engine/character-miniatures';
import {gamingPoster} from '@/engine/gaming-art';
import {posterArt,subscribePosterArt} from '@/engine/poster-assets';

export default function CollectibleViewer({product,color,onClose}:{product:Product;color?:string|null;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null),canvas=useRef<HTMLCanvasElement>(null);
  const [rotation,setRotation]=useState(0);
  const poster=posterArt[product.id];
  useEffect(()=>{
    const node=dialog.current,trigger=document.activeElement;
    node?.showModal();
    return()=>{node?.close();if(trigger instanceof HTMLElement&&trigger.isConnected)trigger.focus({preventScroll:true});};
  },[]);
  useEffect(()=>{
    const draw=()=>{
      const g=canvas.current?.getContext('2d');
      g?.clearRect(0,0,960,1280);g?.drawImage(poster?gamingPoster(product.id):furniturePreview(product,color,rotation,640),0,0);
    };
    const unsubscribe=poster?subscribePosterArt(draw):undefined;
    draw();return unsubscribe;
  },[product,color,rotation,poster]);
  return <dialog ref={dialog} className={`collectible-viewer${poster?' poster-viewer':''}`} aria-labelledby="collectible-title" aria-describedby="collectible-description" onClose={()=>{if(!dialog.current?.open)onClose();}} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="collectible-viewer-content">
      <header><div><span>{product.game}</span><h2 id="collectible-title">{product.name}</h2></div><button className="icon-button" aria-label={`Закрыть просмотр ${poster?'постера':'фигурки'}`} onClick={onClose}><X size={20} strokeWidth={1.75}/></button></header>
      <canvas ref={canvas} width={poster?960:640} height={poster?1280:640} role="img" aria-label={poster?product.name:`${product.name}, поворот ${rotation}°`}/>
      {!poster&&<div className="collectible-viewer-controls"><button className="button secondary" onClick={()=>setRotation(r=>(r+270)%360)} aria-label="Повернуть фигурку влево"><RotateCcw size={16} strokeWidth={1.75}/></button><span className="tabular-nums" aria-live="polite">{rotation}°</span><button className="button secondary" onClick={()=>setRotation(r=>(r+90)%360)} aria-label="Повернуть фигурку вправо"><RotateCw size={16} strokeWidth={1.75}/></button></div>}
      <p id="collectible-description">{poster?.description??characterDetails[product.id]??'Коллекционная миниатюра для полок, столика и комода. Рассмотри её со всех сторон.'}</p>
    </div>
  </dialog>;
}

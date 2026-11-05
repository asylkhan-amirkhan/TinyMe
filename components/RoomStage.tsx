"use client";
import {useEffect,useLayoutEffect,useRef,type ReactNode} from 'react';
import {containTab,focusableIn} from '@/lib/focus-region';
import {ArrowLeft} from 'lucide-react';
export default function RoomStage({expanded,onClose,children,inspector}:{expanded:boolean;onClose:()=>void;children:ReactNode;inspector?:ReactNode}){
 const root=useRef<HTMLElement>(null);
 const hasInspector=!!inspector;
 useLayoutEffect(()=>{
  if(!hasInspector || expanded || !root.current)return;
  const rect=root.current.getBoundingClientRect();
  if(rect.top<8 || rect.bottom>window.innerHeight-8)root.current.scrollIntoView({block:'start',behavior:'instant'});
 },[hasInspector,expanded]);
 useEffect(()=>{
  if(!expanded)return;
  const trigger=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';focusableIn(root.current!)[0]?.focus({preventScroll:true});
  return()=>{document.body.style.overflow=overflow;const target=trigger?.isConnected && trigger!==document.body ? trigger : document.querySelector<HTMLElement>('main h1');if(target){if(target.tagName==='H1')target.tabIndex=-1;target.focus({preventScroll:true});}};
 },[expanded]);
 return <section ref={root} className={`room-stage ${expanded?'expanded':''} ${hasInspector?'has-inspector':''}`} role={expanded?'dialog':undefined} aria-modal={expanded?true:undefined} aria-label={expanded?'Просмотр комнаты':undefined} onKeyDown={e=>{if(!expanded)return;if(e.key==='Escape'){e.preventDefault();onClose();}else containTab(e,e.currentTarget);}}>
  <div className="room-scene">{children}{expanded && hasInspector && <button type="button" className="button secondary room-editor-exit" onClick={onClose} aria-label="Выйти из режима расстановки"><ArrowLeft size={16} strokeWidth={1.75}/>К комнате</button>}</div>
  {inspector}
 </section>;
}

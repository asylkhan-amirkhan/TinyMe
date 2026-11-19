'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalAccount } from './use-local-account';
import { initialCommunity, type Actor, type CommunityAction, type CommunityState } from '@/domain/community';
import { workshopCatalogEvent, workshopStorageKey } from '@/domain/workshop-catalog';
import { communityCloud, communityEvent, communityKey, loadCloudCommunity, readLocalCommunity, writeCloudCommunity, writeLocalCommunity } from './community-repository';

export function useCommunity(){
  const local=useLocalAccount();
  const [state,setState]=useState<CommunityState>(initialCommunity);
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const request=useRef(0),lock=useRef(false);
  const actor:Actor|null=useMemo(()=>local.account?{id:local.account.id,name:local.account.name,admin:local.account.role==='admin'}:null,[local.account]);
  const actorRef=useRef(actor);
  const stateRef=useRef(state);
  useEffect(()=>{actorRef.current=actor;stateRef.current=state;},[actor,state]);
  const reload=useCallback(async()=>{
    const version=++request.current;
    try{
      const next=communityCloud?await loadCloudCommunity():readLocalCommunity(localStorage);
      if(version===request.current){setState(next);setError('');setReady(true);}
    }catch(e){if(version===request.current){setReady(false);setError(e instanceof Error?e.message:'Не удалось открыть каталог.');}}
  },[]);
  useEffect(()=>{
    const timer=setTimeout(()=>{void reload();},0);
    const refresh=()=>{void reload();};
    const storage=(event:StorageEvent)=>{if(!communityCloud && (event.key===communityKey || event.key===workshopStorageKey || event.key===null))refresh();};
    window.addEventListener(communityEvent,refresh);window.addEventListener('focus',refresh);window.addEventListener('storage',storage);
    if (!communityCloud) window.addEventListener(workshopCatalogEvent, refresh);
    return()=>{clearTimeout(timer);window.removeEventListener(communityEvent,refresh);window.removeEventListener('focus',refresh);window.removeEventListener('storage',storage);window.removeEventListener(workshopCatalogEvent,refresh);};
  },[reload,actor?.id]);
  async function act(action:CommunityAction){
    if(lock.current||!ready)return false;
    lock.current=true;setBusy(true);setError('');
    const owner=actorRef.current;
    try{
      if(communityCloud){await writeCloudCommunity(stateRef.current,owner,action);if(actorRef.current?.id===owner?.id)await reload();}
      else {
        const save=()=>{const next=writeLocalCommunity(localStorage,owner,action);if(actorRef.current?.id===owner?.id)setState(next);};
        if(navigator.locks)await navigator.locks.request(communityKey,save);else save();
      }
      return true;
    }catch(e){setError(e instanceof Error?e.message:'Не удалось сохранить. Проверьте свободное место в браузере.');return false;}
    finally{lock.current=false;setBusy(false);}
  }
  return{state,actor,ready,busy,error,act,reload,cloud:communityCloud};
}

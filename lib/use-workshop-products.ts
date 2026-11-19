'use client';
import { useEffect, useState } from 'react';
import { readWorkshopShowcase, workshopStorageKey, workshopCatalogEvent, type WorkshopProduct } from '@/domain/workshop-catalog';
export function useWorkshopProducts() {
  const [products,setProducts]=useState<WorkshopProduct[]>([]);
  const [error,setError]=useState('');
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{
    const load=()=>{
      try {setProducts(readWorkshopShowcase(localStorage));setError('');}
      catch {setError('Не удалось прочитать каталог мастерской.');}
      setLoaded(true);
    };
    const storage=(event:StorageEvent)=>{if(event.key===workshopStorageKey||event.key===null)load();};
    const timer=setTimeout(load,0);
    window.addEventListener('storage',storage);window.addEventListener('focus',load);window.addEventListener(workshopCatalogEvent,load);
    return()=>{clearTimeout(timer);window.removeEventListener('storage',storage);window.removeEventListener('focus',load);window.removeEventListener(workshopCatalogEvent,load);};
  },[]);
  return {products,error,loaded};
}

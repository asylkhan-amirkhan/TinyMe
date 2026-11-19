'use client';
import { useEffect, useState } from 'react';
import type { Product } from '@/domain/model';
import { readWorkshopProducts, workshopStorageKey, workshopCatalogEvent } from '@/domain/workshop-catalog';
export function useWorkshopProducts() {
  const [products,setProducts]=useState<Product[]>([]);
  const [error,setError]=useState('');
  useEffect(()=>{
    const load=()=>{try {setProducts(readWorkshopProducts(localStorage));setError('');}catch {setError('Не удалось прочитать каталог мастерской. Сохранённые вещи не изменены.');}};
    const storage=(event:StorageEvent)=>{if(event.key===workshopStorageKey||event.key===null)load();};
    const timer=setTimeout(load,0);
    window.addEventListener('storage',storage);window.addEventListener('focus',load);window.addEventListener(workshopCatalogEvent,load);
    return()=>{clearTimeout(timer);window.removeEventListener('storage',storage);window.removeEventListener('focus',load);window.removeEventListener(workshopCatalogEvent,load);};
  },[]);
  return {products,error};
}

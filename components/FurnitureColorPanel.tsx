"use client";
import { Palette, X } from 'lucide-react';
import type { Item } from '@/domain/model';
import { productOf } from '@/domain/model';
import { furnitureBaseColor, furnitureSwatches } from '@/domain/furniture-color';
import FurniturePreview from './FurniturePreview';
export default function FurnitureColorPanel({item,color,busy,onChange,onClose,onSave}:{item:Item;color:string|null;busy:boolean;onChange:(color:string|null)=>void;onClose:()=>void;onSave:()=>void}) {
 const product=productOf(item);
 return <section className="color-panel furniture-color-panel" id="furniture-colors" aria-label="Цвет выбранной мебели" onKeyDown={e=>{if(e.key==='Escape'&&!busy){e.stopPropagation();onClose();}}}>
  <div className="color-panel-heading"><strong>Цвет мебели</strong><button aria-label="Закрыть цвет мебели" disabled={busy} onClick={onClose}><X size={16} strokeWidth={1.75}/></button></div>
  <div className="furniture-color-preview"><FurniturePreview product={product} color={color}/><div><strong>{product.name}</strong><span>Только этот предмет</span></div></div>
  <div className="furniture-swatches" role="group" aria-label="Оттенки мебели">{furnitureSwatches.map(([name,value])=><button key={value} aria-label={name} title={name} aria-pressed={color===value} style={{background:value}} disabled={busy} onClick={()=>onChange(value)}/>)}</div>
  <div className="furniture-custom-color"><label><Palette size={16} strokeWidth={1.75}/><span>Свой цвет</span><input aria-label="Свой цвет мебели" type="color" value={color??furnitureBaseColor(product)} disabled={busy} onInput={e=>onChange(e.currentTarget.value)} onChange={e=>onChange(e.target.value)}/></label><button disabled={busy} onClick={()=>onChange(null)} aria-pressed={color===null}>Исходный</button></div>
  <p>Примерьте оттенок, затем сохраните. Другие вещи останутся прежними.</p>
  <div className="color-actions"><button className="button primary" disabled={busy} onClick={onSave}>{busy?'Сохраняется…':'Сохранить цвет мебели'}</button><button className="button ghost" disabled={busy} onClick={onClose}>Отменить цвет мебели</button></div>
 </section>;
}

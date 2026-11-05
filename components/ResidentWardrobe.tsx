"use client";
import { useEffect, useRef, useState } from 'react';
import { Check, Glasses, Headphones, RotateCcw, RotateCw, Shirt, X } from 'lucide-react';
import { defaultResidentLook, haircuts, outfits, lookPalettes, type ResidentLook } from '@/domain/resident-look';
import { createResident } from '@/domain/resident';
import { drawResident } from '@/engine/resident-art';
import type { RoomLight } from '@/engine/room-light';
import './resident-wardrobe.css';

type Props = { look: ResidentLook; onSave: (look: ResidentLook) => void; onClose: () => void };
const previewLight: RoomLight = { daylight: .95, overcast: false, blockers: [], sources: [
  { id: 'key', position: [100,120,180], color: [1,.85,.7], power: 18000, kind: 'lamp' },
  { id: 'fill', position: [-100,-20,140], color: [.65,.74,1], power: 8500, kind: 'screen' },
] };
const paletteLabels = { skin: 'Тон кожи', hairColor: 'Цвет волос', topColor: 'Цвет одежды', pantsColor: 'Брюки', shoeColor: 'Кроссовки' };
type ColorKey = keyof typeof paletteLabels;
export default function ResidentWardrobe({ look, onSave, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const [draft, setDraft] = useState<ResidentLook>(() => ({ ...look }));
  const [turn, setTurn] = useState(0);
  const change = <K extends keyof ResidentLook>(key: K, value: ResidentLook[K]) => setDraft(d => ({ ...d, [key]: value }));
  useEffect(() => {
    const node = dialog.current, trigger = document.activeElement, overflow = document.body.style.overflow;
    node?.showModal(); document.body.style.overflow = 'hidden';
    return () => { node?.close(); document.body.style.overflow = overflow;
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    const g = canvas.current?.getContext('2d'); if (!g) return;
    g.clearRect(0,0,600,700);
    const body = { ...createResident([]), x:0, y:0, facing: Math.PI / 2 + turn * Math.PI / 180, time:1 };
    drawResident(g, body, previewLight, (x,y,z=0) => [300+(x-y)*23*4,610+(x+y)*12*4-z*4], draft);
  }, [draft, turn]);
  const swatches = (key: ColorKey) => <fieldset className="wardrobe-swatches">
    <legend>{paletteLabels[key]}</legend>
    <div>{lookPalettes[key].map(([label,color]) => <button type="button" key={color} className="wardrobe-swatch"
      aria-label={`${paletteLabels[key]}: ${label}`} aria-pressed={draft[key] === color} title={label}
      onClick={() => change(key,color)}><span style={{ background: color }}/>{draft[key] === color && <Check size={14} strokeWidth={2}/>}</button>)}</div>
  </fieldset>;
  return <dialog ref={dialog} className="resident-wardrobe" aria-labelledby="wardrobe-title" aria-describedby="wardrobe-description"
    onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => {
      if(e.target!==e.currentTarget)return;
      const bounds=e.currentTarget.getBoundingClientRect();
      if(e.clientX<bounds.left || e.clientX>bounds.right || e.clientY<bounds.top || e.clientY>bounds.bottom)onClose();
    }}>
    <header className="wardrobe-header">
      <div><h2 id="wardrobe-title">Твой образ</h2><p id="wardrobe-description">Маленькие детали, в которых узнаёшь себя.</p></div>
      <button type="button" className="icon-button" aria-label="Закрыть настройку внешности" onClick={onClose}><X size={20} strokeWidth={1.75}/></button>
    </header>
    <div className="wardrobe-body">
      <div className="wardrobe-mirror">
        <div className="wardrobe-stage"><canvas ref={canvas} width={600} height={700} role="img"
          aria-label={`Предпросмотр: ${haircuts.find(h=>h.id===draft.hair)?.name}, ${outfits.find(o=>o.id===draft.outfit)?.name}. Поворот ${turn} градусов.`}/></div>
        <div className="wardrobe-turn">
          <button type="button" className="button secondary" aria-label="Повернуть персонажа влево" onClick={() => setTurn(t=>(t+315)%360)}><RotateCcw size={16} strokeWidth={1.75}/></button>
          <span className="tabular-nums">{turn}°</span>
          <button type="button" className="button secondary" aria-label="Повернуть персонажа вправо" onClick={() => setTurn(t=>(t+45)%360)}><RotateCw size={16} strokeWidth={1.75}/></button>
        </div>
        <p>Рассмотри со всех сторон</p>
      </div>
      <div className="wardrobe-options">
        <fieldset><legend>Причёска</legend><div className="wardrobe-options-row">
          {haircuts.map(h => <button type="button" className="button secondary" key={h.id} aria-pressed={draft.hair===h.id} onClick={() => change('hair',h.id)}>{h.name}</button>)}
        </div></fieldset>
        {swatches('hairColor')}
        <fieldset><legend>Одежда</legend><div className="wardrobe-options-row">
          {outfits.map(o => <button type="button" className="button secondary" key={o.id} aria-pressed={draft.outfit===o.id} onClick={() => change('outfit',o.id)}><Shirt size={16} strokeWidth={1.75}/>{o.name}</button>)}
        </div></fieldset>
        {swatches('topColor')}{swatches('pantsColor')}{swatches('shoeColor')}{swatches('skin')}
        <fieldset><legend>Детали</legend><div className="wardrobe-options-row">
          <button type="button" className="button secondary" aria-pressed={draft.headphones} onClick={() => change('headphones',!draft.headphones)}><Headphones size={16} strokeWidth={1.75}/>Наушники</button>
          <button type="button" className="button secondary" aria-pressed={draft.glasses} onClick={() => change('glasses',!draft.glasses)}><Glasses size={16} strokeWidth={1.75}/>Очки</button>
        </div></fieldset>
        <button type="button" className="wardrobe-reset" onClick={() => { setDraft({ ...defaultResidentLook }); setTurn(0); }}>Вернуть исходный образ</button>
      </div>
    </div>
    <footer className="wardrobe-footer"><span>Образ сохраняется на этом устройстве</span><div>
      <button type="button" className="button secondary" onClick={onClose}>Отмена</button>
      <button type="button" className="button primary" onClick={() => onSave(draft)}><Check size={16} strokeWidth={1.75}/>Применить образ</button>
    </div></footer>
  </dialog>;
}

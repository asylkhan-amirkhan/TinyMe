"use client";

import {Check, ChevronDown, Move, Package, Palette, Power, RotateCcw, RotateCw, X} from 'lucide-react';
import {useLayoutEffect, useRef} from 'react';
import {canPlaceOnTop, decorHeight, productOf, supportSurfaces, tabletopHeight, type Item, type Placement} from '@/domain/model';
import FurniturePreview from './FurniturePreview';
import Select from './Select';

type Props = {
  item: Item;
  items: Item[];
  draft: Placement | null;
  error: string | null;
  busy: boolean;
  onDraft: (draft: Placement | null) => void;
  onEdit: () => void;
  onRotate: (direction: number) => void;
  onColor: () => void;
  onToggle: () => void;
  onRemove: () => void;
  onPlace: () => void;
  onClose: () => void;
};

export default function FurnitureInspector({item,items,draft,error,busy,onDraft,onEdit,onRotate,onColor,onToggle,onRemove,onPlace,onClose}: Props) {
  const rotationButton = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const editing = !!draft;
  const previousEditing = useRef(editing);
  useLayoutEffect(() => {
    if(previousEditing.current !== editing) (rotationButton.current && !rotationButton.current.disabled ? rotationButton.current : heading.current)?.focus({preventScroll:true});
    previousEditing.current = editing;
  },[editing]);
  useLayoutEffect(() => { heading.current?.focus({preventScroll:true}); },[]);
  const product = productOf(item);
  const support = items.find(i => i.id === draft?.parentId);
  const surfaces = support ? supportSurfaces(productOf(support)) : [];
  const wall = product.surface === 'wall';
  const rotate = (direction: number) => draft
    ? onDraft({...draft,rotation:(draft.rotation+direction*90+360)%360})
    : onRotate(direction);

  return <aside className="furniture-inspector" aria-labelledby="furniture-inspector-title" onKeyDown={e => {
    if(e.key === 'Escape' && !busy) { e.stopPropagation(); if(draft) onDraft(null); else onClose(); }
  }}>
    <header className="inspector-heading">
      <FurniturePreview product={product} color={item.color}/>
      <div><span>{product.category}</span><h2 ref={heading} tabIndex={-1} id="furniture-inspector-title">{product.name}</h2></div>
      <button type="button" className="icon-button" aria-label="Снять выбор" disabled={busy} onClick={onClose}><X size={16} strokeWidth={1.75}/></button>
    </header>

    <div className="inspector-body">
      <div className="inspector-location"><span className="inspector-location-dot"/>{draft ? 'Выбираем новое место' : item.x === null ? 'В моих вещах' : item.parentId ? 'На мебели' : wall ? 'На стене' : 'В комнате'}<span className="inspector-size tabular-nums">{product.w} × {product.h}</span></div>
      <p className="inspector-hint">{draft
        ? wall ? 'Зажми сам постер и перетащи вдоль стены. Он останется прижатым к ней.' : 'Зажми сам предмет и перетащи. Отпусти мышь, затем подтверди место.'
        : wall ? 'Перетаскивай постер вдоль стены. Положение сохраняется автоматически.' : 'Удерживай предмет и перетаскивай мышью. Положение сохраняется автоматически.'}</p>
      {!wall && <div className="inspector-rotation" role="group" aria-label="Поворот выбранного предмета">
        <button ref={rotationButton} type="button" className="button secondary" aria-label="Повернуть влево" disabled={busy || (!draft && item.x === null)} onClick={() => rotate(-1)}><RotateCcw size={16} strokeWidth={1.75}/><span>Влево</span></button>
        <output className="tabular-nums" aria-label="Угол поворота">{draft?.rotation ?? item.rotation}°</output>
        <button type="button" className="button secondary" aria-label="Повернуть вправо" disabled={busy || (!draft && item.x === null)} onClick={() => rotate(1)}><span>Вправо</span><RotateCw size={16} strokeWidth={1.75}/></button>
      </div>}

      {draft ? <details className="inspector-details">
        <summary>Точное положение{canPlaceOnTop(product) ? ' и поверхность' : ''}<ChevronDown size={16} strokeWidth={1.75}/></summary>
        <div className="inspector-fields">
          {canPlaceOnTop(product) && <>
            <label htmlFor="item-surface">Куда поставить</label>
            <Select id="item-surface" aria-label="Куда поставить" value={draft.parentId ?? ''} disabled={busy}
              onValueChange={value => {
                const parent = items.find(i => i.id === value);
                const level = parent ? supportSurfaces(productOf(parent)).find(s => s.clearance >= decorHeight(product))?.level ?? 0 : 0;
                onDraft({...draft,parentId:value || null,supportLevel:level,x:value?0:5,y:value?0:5,rotation:0});
              }} options={[
                {value:'',label:'На пол'},
                ...items.filter(i => i.id!==item.id && !i.parentId && i.x!==null && i.y!==null && tabletopHeight(productOf(i))>0)
                  .map((i,n) => ({value:i.id,label:productOf(i).name+' · '+(n+1)})),
              ]}/>
            {surfaces.length > 1 && <>
              <label htmlFor="item-level">Ярус</label>
              <Select id="item-level" aria-label="Ярус" value={String(draft.supportLevel ?? 0)} disabled={busy}
                onValueChange={value => onDraft({...draft,supportLevel:Number(value)})}
                options={surfaces.map(surface => ({value:String(surface.level),label:surface.label+(decorHeight(product)>surface.clearance?' · вещь не помещается':''),disabled:decorHeight(product)>surface.clearance}))}/>
            </>}
            <p>{draft.parentId ? 'Вещь будет двигаться вместе с мебелью.' : 'Можно поставить на столик, комод или полку.'}</p>
          </>}
          <div className="inspector-coordinates">
            <label>X<input aria-label="Положение X" type="number" min="0" max="23" value={draft.x} disabled={busy} onChange={e => onDraft({...draft,x:Number(e.target.value)})}/></label>
            {!wall && <label>Y<input aria-label="Положение Y" type="number" min="0" max="15" value={draft.y} disabled={busy} onChange={e => onDraft({...draft,y:Number(e.target.value)})}/></label>}
          </div>
        </div>
      </details> : <div className="inspector-secondary">
        <button className="button secondary" disabled={busy} onClick={onColor}><Palette size={16} strokeWidth={1.75}/>Цвет мебели</button>
        {['lamp','record'].includes(product.kind) && <button className="button secondary" disabled={busy} onClick={onToggle}><Power size={16} strokeWidth={1.75}/>{item.on?'Выключить':'Включить'}</button>}
        {items.some(i => i.parentId===item.id) && <p>Вещи сверху перемещаются и убираются вместе с мебелью.</p>}
      </div>}
    </div>

    <footer className="inspector-footer">
      {draft ? <>
        <p className={`inspector-status ${error?'is-invalid':''}`} role="status" aria-atomic="true">{error ?? (wall?'Место на стене свободно':'Место свободно — можно поставить')}</p>
        <div className="inspector-actions">
          <button className="button secondary" disabled={busy} onClick={() => onDraft(null)}>Отмена</button>
          <button className="button primary" disabled={!!error || busy} onClick={onPlace}><Check size={16} strokeWidth={1.75}/>{busy?'Сохраняется…':'Поставить'}</button>
        </div>
      </> : <button className="button primary" disabled={busy} onClick={onEdit}><Move size={16} strokeWidth={1.75}/>{item.x === null?'Поставить в комнату':'Переставить'}</button>}
      {item.x !== null && !draft && <button className="button secondary inspector-store" disabled={busy} onClick={onRemove}><Package size={16} strokeWidth={1.75}/>Убрать в мои вещи</button>}
    </footer>
  </aside>;
}

"use client";

import {Check, ChevronDown, Move, Package, Palette, Power, RotateCcw, RotateCw, X} from 'lucide-react';
import {useLayoutEffect, useRef, type ReactNode} from 'react';
import { availablePlacement } from '@/domain/drag';
import {canPlaceOnTop, decorHeight, productOf, supportSurfaces, tabletopHeight, wallArtBounds, wallPlacement, type Item, type Placement} from '@/domain/model';
import FurniturePreview from './FurniturePreview';
import FloatingPanelHandle, { useFloatingPanel } from './FloatingPanelHandle';
import Select from './Select';

type Props = {
  item: Item;
  items: Item[];
  draft: Placement | null;
  error: string | null;
  busy: boolean;
  notifications?: ReactNode;
  onDraft: (draft: Placement | null) => void;
  onEdit: () => void;
  onRotate: (direction: number) => void;
  onColor: () => void;
  onToggle: () => void;
  onRemove: () => void;
  onPlace: () => void;
  onClose: () => void;
};

export default function FurnitureInspector({item,items,draft,error,busy,notifications,onDraft,onEdit,onRotate,onColor,onToggle,onRemove,onPlace,onClose}: Props) {
  const panel = useFloatingPanel<HTMLElement>({ inFlow: true });
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
  const tabletop = canPlaceOnTop(product);
  const supports = tabletop ? items.filter(other => other.id !== item.id && !other.parentId && other.x !== null && other.y !== null && tabletopHeight(productOf(other)) > 0) : [];
  const support = items.find(i => i.id === draft?.parentId);
  const surfaces = support ? supportSurfaces(productOf(support)) : [];
  const wall = product.surface === 'wall';
  const wallSide = draft?.wallSide ?? item.wallSide ?? 'right';
  const wallBounds = wall ? wallArtBounds(product, wallSide) : undefined;
  const rotate = (direction: number) => draft
    ? onDraft({...draft,rotation:(draft.rotation+direction*90+360)%360})
    : onRotate(direction);

  function chooseSupport(value: string) {
    if (!draft) return;
    const parent = supports.find(other => other.id === value);
    const target = { ...draft, parentId: parent?.id ?? null, x: parent ? 0 : 5, y: parent ? 0 : 5, supportLevel: 0, rotation: 0 };
    if (!parent) { onDraft(availablePlacement(items, item, target) ?? target); return; }

    const levels = supportSurfaces(productOf(parent)).filter(surface => surface.clearance >= decorHeight(product));
    for (const level of levels) {
      const placement = availablePlacement(items, item, { ...target, supportLevel: level.level });
      if (placement) { onDraft(placement); return; }
    }
    onDraft({ ...target, supportLevel: levels[0]?.level ?? 0 });
  }

  return <aside ref={panel.ref} style={panel.style} data-moved={panel.moved} data-dragging={panel.dragging}
    className="furniture-inspector floating-room-panel" aria-labelledby="furniture-inspector-title" onKeyDown={e => {
    if(e.key === 'Escape' && !busy) { e.stopPropagation(); if(draft) onDraft(null); else onClose(); }
  }}>
    <header className="inspector-heading">
      <FurniturePreview product={product} color={item.color}/>
      <div><span>{product.category}</span><h2 ref={heading} tabIndex={-1} id="furniture-inspector-title">{product.name}</h2></div>
      <div className="inspector-window-actions">
        <FloatingPanelHandle label="Переместить панель мебели" handle={panel.handle} />
        <button type="button" className="icon-button" aria-label="Снять выбор" disabled={busy} onClick={onClose}><X size={16} strokeWidth={1.75}/></button>
      </div>
    </header>

    <div className="inspector-body">
      {notifications}
      <div className="inspector-location"><span className="inspector-location-dot"/>{support ? productOf(support).name : draft ? 'Выбираем новое место' : item.x === null ? 'В моих вещах' : item.parentId ? 'На мебели' : wall ? 'На стене' : 'В комнате'}<span className="inspector-size tabular-nums">{product.w} × {product.h}</span></div>
      {draft && tabletop && <div className="inspector-fields inspector-surface">
        <label htmlFor="item-surface">Куда поставить</label>
        <Select id="item-surface" aria-label="Куда поставить" value={draft.parentId ?? ''} disabled={busy}
          onValueChange={chooseSupport} options={[
            { value: '', label: 'На пол' },
            ...supports.map((parent, index) => ({ value: parent.id, label: `${productOf(parent).name} · ${index + 1}` })),
          ]} />
        {surfaces.length > 1 && <>
          <label htmlFor="item-level">Ярус</label>
          <Select id="item-level" aria-label="Ярус" value={String(draft.supportLevel ?? 0)} disabled={busy}
            onValueChange={value => {
              const target = { ...draft, supportLevel: Number(value) };
              onDraft(availablePlacement(items, item, target) ?? target);
            }}
            options={surfaces.map(surface => ({ value: String(surface.level), label: surface.label, disabled: decorHeight(product) > surface.clearance }))} />
        </>}
      </div>}
      <p className="inspector-hint">{draft
        ? wall ? 'Перетащи предмет или нажми на свободное место на любой стене. Затем нажми «Поставить».' : 'Перетащи предмет или нажми на место в комнате. Затем нажми «Поставить».'
        : wall ? 'Перетаскивай предмет по стене или через угол на другую стену. Положение сохраняется автоматически.' : 'Удерживай предмет и перетаскивай мышью. Положение сохраняется автоматически.'}</p>
      {!wall && <div className="inspector-rotation" role="group" aria-label="Поворот выбранного предмета">
        <button ref={rotationButton} type="button" className="button secondary" aria-label="Повернуть влево" disabled={busy || (!draft && item.x === null)} onClick={() => rotate(-1)}><RotateCcw size={16} strokeWidth={1.75}/><span>Влево</span></button>
        <output className="tabular-nums" aria-label="Угол поворота">{draft?.rotation ?? item.rotation}°</output>
        <button type="button" className="button secondary" aria-label="Повернуть вправо" disabled={busy || (!draft && item.x === null)} onClick={() => rotate(1)}><span>Вправо</span><RotateCw size={16} strokeWidth={1.75}/></button>
      </div>}

      {draft ? <details className="inspector-details">
        <summary>Точное положение<ChevronDown size={16} strokeWidth={1.75}/></summary>
        <div className="inspector-fields">
          {wallBounds && <>
            <label htmlFor="item-wall">Стена</label>
            <Select id="item-wall" aria-label="Стена" value={wallSide} disabled={busy}
              onValueChange={side => onDraft(wallPlacement(product, draft.x, draft.wallHeight, side === 'left' ? 'left' : 'right'))}
              options={[{value:'left',label:'Левая'}, {value:'right',label:'Правая'}]} />
          </>}
          <div className="inspector-coordinates">
            <label>X<input aria-label="Положение X" type="number" min="0" max={wallBounds?.maxX ?? 23} step={wall ? 'any' : 1} value={draft.x} disabled={busy} onChange={e => onDraft({...draft,x:Number(e.target.value)})}/></label>
            {wallBounds
              ? <label>Высота<input type="number" min="0" max={wallBounds.maxHeight} step="any" value={draft.wallHeight ?? wallBounds.defaultHeight} disabled={busy} onChange={e => onDraft({...draft,wallHeight:Number(e.target.value)})}/></label>
              : <label>Y<input aria-label="Положение Y" type="number" min="0" max="15" value={draft.y} disabled={busy} onChange={e => onDraft({...draft,y:Number(e.target.value)})}/></label>}
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

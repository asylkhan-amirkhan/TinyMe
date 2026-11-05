"use client";

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export type SelectOption = { value: string; label: string; disabled?: boolean };
type Props = {
  value: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  'aria-label': string;
  id?: string;
  title?: string;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'quiet';
};
type Position = { left: number; top: number; width: number; maxHeight: number; above: boolean };

/** Select-only combobox: focus stays on its trigger, including inside room dialogs. */
export default function Select({ value, options, onValueChange, disabled, className = '', variant = 'default', ...label }: Props) {
  const uid = useId();
  const listId = `${uid}-list`;
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const search = useRef({ text: '', time: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [position, setPosition] = useState<Position | null>(null);
  const selected = options.findIndex(option => option.value === value);
  const blocked = disabled || options.length === 0;

  function next(from: number, direction: 1 | -1) {
    for (let step = 1; step <= options.length; step++) {
      const index = (from + step * direction + options.length) % options.length;
      if (!options[index].disabled) return index;
    }
    return -1;
  }
  function show(fromEnd = false) {
    if (blocked || trigger.current?.matches(':disabled')) return;
    setActive(selected >= 0 && !options[selected].disabled ? selected : next(fromEnd ? 0 : -1, fromEnd ? -1 : 1));
    search.current = { text: '', time: 0 };
    setOpen(true);
  }
  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled || blocked || trigger.current?.matches(':disabled')) return;
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
    if (option.value !== value) onValueChange(option.value);
  }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const key = event.key;
    if (key === 'Tab') { setOpen(false); return; }
    if (key === 'Escape') {
      if (open) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(key)) {
      event.preventDefault(); event.stopPropagation();
      if (!open) {
        show(key === 'ArrowUp' || key === 'End');
        if (key === 'Home') setActive(next(-1, 1));
        if (key === 'End') setActive(next(0, -1));
        return;
      }
      if (key === 'Enter' || key === ' ') { choose(active); return; }
      setActive(key === 'Home' ? next(-1, 1) : key === 'End' ? next(0, -1) : next(active, key === 'ArrowUp' ? -1 : 1));
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault(); event.stopPropagation();
      const now = performance.now();
      const text = (now - search.current.time < 700 ? search.current.text : '') + key.toLocaleLowerCase('ru');
      search.current = { text, time: now };
      const repeated = [...text].every(char => char === text[0]);
      const prefix = repeated ? text[0] : text;
      const start = open ? active : selected;
      for (let step = repeated ? 1 : 0; step <= options.length; step++) {
        const index = (Math.max(start, 0) + step) % options.length;
        if (!options[index].disabled && options[index].label.toLocaleLowerCase('ru').startsWith(prefix)) {
          if (!open) setOpen(true);
          setActive(index);
          break;
        }
      }
    }
  }

  useLayoutEffect(() => {
    if (!open || blocked) return;
    const element = trigger.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const viewport = window.visualViewport;
    const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight);
    const right = (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth);
    const wanted = Math.min(296, options.length * 44 + 12);
    const below = bottom - rect.bottom - 18;
    const aboveSpace = rect.top - (viewport?.offsetTop ?? 0) - 18;
    const above = below < wanted && aboveSpace > below;
    const maxHeight = Math.max(44, Math.min(296, above ? aboveSpace : below));
    const width = Math.min(Math.max(220, rect.width), right - 24);
    setPosition({
      left: Math.max(12, Math.min(rect.left, right - width - 12)),
      top: above ? rect.top - 6 : rect.bottom + 6,
      width, maxHeight, above,
    });
    const outside = (event: PointerEvent) => {
      if (!element.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) setOpen(false);
    };
    const scroll = (event: Event) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', close);
    viewport?.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', close);
      viewport?.removeEventListener('resize', close);
    };
  }, [open, blocked, options.length]);

  useLayoutEffect(() => {
    if (!open || !position) return;
    const list = menu.current;
    const option = list?.children[active] as HTMLElement | undefined;
    if (!list || !option) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
  }, [active, open, position]);

  const expanded = open && !blocked;
  return <>
    <button {...label} ref={trigger} type="button" role="combobox"
      className={`cozy-select cozy-select--${variant} ${className}`}
      disabled={blocked} aria-haspopup="listbox" aria-expanded={expanded}
      aria-controls={expanded ? listId : undefined}
      aria-activedescendant={expanded && active >= 0 ? `${uid}-option-${active}` : undefined}
      onClick={() => open ? setOpen(false) : show()} onKeyDown={keyDown}
      onBlur={() => setOpen(false)}>
      <span className="cozy-select-value">{options[selected]?.label ?? 'Выбрать'}</span>
      <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
    </button>
    {expanded && position && createPortal(
      <div className="cozy-select-popover" style={{ left: position.left, top: position.top, width: position.width, translate: position.above ? '0 -100%' : undefined }}
        onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}>
        <div ref={menu} id={listId} role="listbox" aria-label={label['aria-label']} className="cozy-select-list" style={{ maxHeight: position.maxHeight }}>
          {options.map((option, index) => <div key={option.value} id={`${uid}-option-${index}`}
            role="option" aria-selected={option.value === value} aria-disabled={option.disabled || undefined}
            className={`cozy-select-option${index === active ? ' is-active' : ''}`}
            onMouseDown={event => event.preventDefault()}
            onPointerMove={() => { if (!option.disabled) setActive(index); }}
            onClick={() => choose(index)}>
            <span>{option.label}</span>
            {option.value === value && <Check size={16} strokeWidth={1.75} aria-hidden="true" />}
          </div>)}
        </div>
      </div>, document.body,
    )}
  </>;
}

'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { Grip } from 'lucide-react';

type Position = { left: number; top: number };
const arrowOffsets: Partial<Record<string, readonly [number, number]>> = {
  ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16],
};

export function useFloatingPanel<T extends HTMLElement>({ inFlow = false } = {}) {
  const ref = useRef<T>(null);
  const drag = useRef<{ pointer: number; x: number; y: number; origin: Position } | null>(null);
  const [position, setPosition] = useState<Position>();
  const [dragging, setDragging] = useState(false);

  const clamp = useCallback((target?: Position) => {
    const panel = ref.current!;
    const rect = panel.getBoundingClientRect();
    const { left, top } = target ?? rect;
    const edge = 8;
    const bounded = {
      left: Math.max(edge, Math.min(left, document.documentElement.clientWidth - rect.width - edge)),
      top: Math.max(edge, Math.min(top, document.documentElement.clientHeight - rect.height - edge)),
    };
    if (!inFlow) return bounded;
    // Relative offsets keep the inspector's grid slot occupied while it moves.
    return {
      left: bounded.left - rect.left + (parseFloat(panel.style.left) || 0),
      top: bounded.top - rect.top + (parseFloat(panel.style.top) || 0),
    };
  }, [inFlow]);

  useEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const adjust = () => setPosition(current => {
      if (!current || !panel.getClientRects().length) return current;
      const next = clamp(inFlow ? undefined : current);
      return next.left === current.left && next.top === current.top ? current : next;
    });
    const observer = new ResizeObserver(adjust);
    observer.observe(panel);
    window.addEventListener('resize', adjust);
    return () => { observer.disconnect(); window.removeEventListener('resize', adjust); };
  }, [clamp, inFlow]);

  const origin = () => {
    const rect = ref.current!.getBoundingClientRect();
    return { left: rect.left, top: rect.top };
  };
  const finish = (event: PointerEvent<HTMLButtonElement>) => {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
  };

  const handle = {
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (event.button !== 0 || !event.isPrimary || drag.current) return;
      event.preventDefault();
      event.currentTarget.focus({ preventScroll: true });
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, origin: origin() };
      setDragging(true);
    },
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      const start = drag.current;
      if (!start || start.pointer !== event.pointerId) return;
      setPosition(clamp({ left: start.origin.left + event.clientX - start.x, top: start.origin.top + event.clientY - start.y }));
    },
    onPointerUp: finish,
    onPointerCancel: finish,
    onLostPointerCapture: finish,
    onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
      const delta = arrowOffsets[event.key];
      if (!delta && event.key !== 'Home') return;
      event.preventDefault();
      if (!delta) { setPosition(undefined); return; }
      const current = origin();
      setPosition(clamp({ left: current.left + delta[0], top: current.top + delta[1] }));
    },
  };
  const style: CSSProperties | undefined = inFlow ? position : position && { ...position, right: 'auto', bottom: 'auto' };
  return { ref, style, dragging, moved: position !== undefined, handle };
}

export default function FloatingPanelHandle({ label, handle }: { label: string; handle: ReturnType<typeof useFloatingPanel>['handle'] }) {
  return <button type="button" className="floating-panel-handle" aria-label={label}
    aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home" title="Перетащи окно или используй стрелки. Home — вернуть на место."
    onClick={event => { event.preventDefault(); event.stopPropagation(); }} {...handle}>
    <Grip size={18} aria-hidden="true" />
  </button>;
}

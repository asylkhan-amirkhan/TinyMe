"use client";
import { useRef, useState } from 'react';
import { placementError, type Item, type Placement } from '@/domain/model';
import { moveRecord, placedPosition, samePlacement, type MoveRecord } from '@/domain/placement-history';

/** Session-only undo; every reversal uses the normal validated save command. */
export function usePlacementHistory(items: Item[], scope: string, command: (kind: string, payload: Record<string, unknown>) => Promise<boolean>, notice: (message: string) => void) {
  const history = useRef<{ scope: string; moves: MoveRecord[] }>({ scope, moves: [] });
  const locked = useRef(false);
  const [, refresh] = useState(0);
  if (history.current.scope !== scope) history.current = { scope, moves: [] };
  const move = async (payload: Placement & { id: string }) => {
    if (locked.current) return false;
    locked.current = true;
    const record = moveRecord(items.find(item => item.id === payload.id), payload);
    try {
      const saved = await command('place', payload);
      if (saved && record && history.current.scope === scope) {
        history.current.moves = [...history.current.moves.slice(-19), record];
        refresh(value => value + 1);
      }
      return saved;
    } finally { locked.current = false; }
  };
  const undo = async () => {
    if (locked.current) return false;
    const record = history.current.moves.at(-1);
    if (!record) return false;
    const item = items.find(item => item.id === record.id);
    const current = item && placedPosition(item);
    if (!item || !current || !samePlacement(current, record.after)) {
      history.current.moves = [];
      refresh(value => value + 1);
      notice('Расстановка уже изменилась. Отменить это перемещение нельзя.');
      return false;
    }
    const p = record.before;
    const error = placementError(items, item, p.x, p.y, p.rotation, p.parentId, p.supportLevel);
    if (error) { notice(error); return false; }
    locked.current = true;
    try {
      const saved = await command('place', { id: record.id, ...p });
      if (saved && history.current.scope === scope) {
        history.current.moves.pop();
        refresh(value => value + 1);
        notice('Перестановка отменена');
      }
      return saved;
    } finally { locked.current = false; }
  };
  return { move, undo, canUndo: history.current.moves.length > 0 };
}

import type { Item, Placement } from './model';

export type MoveRecord = { id: string; before: Placement; after: Placement };
export function placedPosition(item: Item): Placement | null {
  return item.x === null || item.y === null ? null : {
    x: item.x, y: item.y, rotation: item.rotation,
    parentId: item.parentId ?? null, supportLevel: item.supportLevel ?? 0,
  };
}
export function samePlacement(a: Placement, b: Placement) {
  return a.x === b.x && a.y === b.y && a.rotation === b.rotation &&
    (a.parentId ?? null) === (b.parentId ?? null) && (a.supportLevel ?? 0) === (b.supportLevel ?? 0);
}
export function moveRecord(item: Item | undefined, after: Placement): MoveRecord | null {
  const before = item && placedPosition(item);
  return item && before && !samePlacement(before, after) ? { id: item.id, before, after: { ...after } } : null;
}

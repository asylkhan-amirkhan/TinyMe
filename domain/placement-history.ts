import { productOf, wallPlacement, type Item, type Placement } from './model';

export type MoveRecord = { id: string; before: Placement; after: Placement };
export function placedPosition(item: Item): Placement | null {
  if (item.x === null || item.y === null) return null;
  const product = productOf(item);
  if (product.surface === 'wall') return wallPlacement(product, item.x, item.wallHeight, item.wallSide);
  return {
    x: item.x, y: item.y, rotation: item.rotation,
    parentId: item.parentId ?? null, supportLevel: item.supportLevel ?? 0,
  };
}
export function samePlacement(a: Placement, b: Placement) {
  return a.x === b.x && a.y === b.y && a.rotation === b.rotation &&
    (a.parentId ?? null) === (b.parentId ?? null) && (a.supportLevel ?? 0) === (b.supportLevel ?? 0) &&
    a.wallHeight === b.wallHeight && (a.wallSide ?? 'right') === (b.wallSide ?? 'right');
}
export function moveRecord(item: Item | undefined, after: Placement): MoveRecord | null {
  const before = item && placedPosition(item);
  return item && before && !samePlacement(before, after) ? { id: item.id, before, after: { ...after } } : null;
}

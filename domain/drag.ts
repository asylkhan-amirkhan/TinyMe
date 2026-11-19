import {dimensions, placementError, productOf, supportSurfaces, wallArtBounds, wallObstacles, wallPlacement, type Item, type Placement, type Product, type WallSide} from './model';
export type FloorPoint = readonly [number,number];
export function dragPlacement(item:Item,from:FloorPoint,to:FloorPoint){
 const dx=to[0]-from[0],dy=to[1]-from[1];
 return {x:item.x!+Math.round(dx),y:item.y!+Math.round(dy),rotation:item.rotation};
}
export function centerWallPlacement(product: Product, side: WallSide, along: number, height: number) {
  const round = (value: number) => Math.round(value * 100) / 100;
  return wallPlacement(product, round(along - product.w / 2), round(height - wallArtBounds(product, side).height / 2), side);
}
export function initialPlacement(item:Item):Placement {
 const product=productOf(item);
 if (product.surface === 'wall') return wallPlacement(product, item.x ?? 5, item.wallHeight, item.wallSide);
 return {x:item.x??5,y:item.y??5,rotation:item.rotation,parentId:item.parentId??null,supportLevel:item.supportLevel??0};
}

/** Find a usable position near the requested placement. */
export function availablePlacement(items: Item[], item: Item, preferred: Placement): Placement | null {
  const product = productOf(item);
  const { w, h } = dimensions(product, preferred.rotation);
  if (!placementError(items, item, preferred.x, preferred.y, preferred.rotation, preferred.parentId, preferred.supportLevel, preferred.wallHeight, preferred.wallSide)) return preferred;

  if (product.surface === 'wall') {
    const preferredSide = preferred.wallSide ?? item.wallSide ?? 'right';
    const sides: WallSide[] = [preferredSide, preferredSide === 'left' ? 'right' : 'left'];
    for (const side of sides) {
      const start = wallPlacement(product, preferred.x, preferred.wallHeight, side);
      const bounds = wallArtBounds(product, side);
      const columns = [start.x, 0, bounds.maxX];
      const heights = [start.wallHeight, 0, bounds.maxHeight];
      // A nearest free position lies on an edge of the wall or of an obstacle.
      for (const obstacle of wallObstacles(items, item.id, side)) {
        columns.push(obstacle.x - w, obstacle.right);
        heights.push(obstacle.z - bounds.height, obstacle.top);
      }
      let nearest: Placement | null = null;
      let bestDistance = Infinity;
      for (const x of columns) {
        for (const height of heights) {
          const distance = Math.hypot((x - start.x) * 23, height - start.wallHeight);
          if (distance >= bestDistance || placementError(items, item, x, 0, 0, null, 0, height, side)) continue;
          nearest = wallPlacement(product, x, height, side);
          bestDistance = distance;
        }
      }
      if (nearest) return nearest;
    }
    return null;
  }

  const support = preferred.parentId ? items.find(other => other.id === preferred.parentId) : undefined;
  const surface = support ? supportSurfaces(productOf(support))[preferred.supportLevel ?? 0] : undefined;
  const lastX = (surface?.w ?? 24) - w;
  const lastY = (surface?.h ?? 16) - h;
  let nearest: Placement | null = null;
  let bestDistance = Infinity;
  for (let y = 0; y <= lastY; y++) {
    for (let x = 0; x <= lastX; x++) {
      const distance = Math.abs(x - preferred.x) + Math.abs(y - preferred.y);
      if (distance < bestDistance && !placementError(items, item, x, y, preferred.rotation, preferred.parentId, preferred.supportLevel)) {
        nearest = { ...preferred, x, y };
        bestDistance = distance;
      }
    }
  }
  return nearest;
}

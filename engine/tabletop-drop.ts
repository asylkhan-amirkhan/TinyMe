import { canPlaceOnTop, dimensions, localPoint, productOf, resolveItems, tabletopHeight, supportSurfaces, type Item, type Placement } from '../domain/model';
import { unproject } from './isometric';

/** The pointer represents the object's floor-contact centre, with grab offset already removed. */
export function tabletopDrop(items:Item[],item:Item,px:number,py:number,worldRotation:number):Placement {
  if(canPlaceOnTop(productOf(item))) {
    const supports=items.filter(p=>p.id!==item.id&&!p.parentId&&p.x!==null&&p.y!==null&&tabletopHeight(productOf(p))>0)
      .sort((a,b)=>b.x!+b.y!-a.x!-a.y!);
    for(const parent of supports) {
      const p=productOf(parent);
      for(const surface of [...supportSurfaces(p)].reverse()) {
      const [wx,wy]=unproject(px,py+surface.height),[a,b]=localPoint(parent,wx,wy),lx=a-surface.offsetX,ly=b-surface.offsetY;
      if(lx<0||ly<0||lx>=surface.w||ly>=surface.h)continue;
      const rotation=(worldRotation-parent.rotation+360)%360,d=dimensions(productOf(item),rotation);
      return {x:Math.max(0,Math.min(surface.w-d.w,Math.round(lx-d.w/2))),y:Math.max(0,Math.min(surface.h-d.h,Math.round(ly-d.h/2))),rotation,parentId:parent.id,...(p.kind==='shelf'?{supportLevel:surface.level}: {})};
      }
    }
  }
  const [x,y]=unproject(px,py),d=dimensions(productOf(item),worldRotation);
  return {x:Math.round(x-d.w/2),y:Math.round(y-d.h/2),rotation:worldRotation,parentId:null};
}
export function worldRotationOf(items:Item[],item:Item) {
  return resolveItems(items).find(i=>i.id===item.id)?.rotation??item.rotation;
}

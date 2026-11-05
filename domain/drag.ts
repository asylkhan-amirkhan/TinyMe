import {productOf,type Item,type Placement} from './model';
export type FloorPoint = readonly [number,number];
export function dragPlacement(item:Item,from:FloorPoint,to:FloorPoint,wall=false){
 const dx=to[0]-from[0],dy=to[1]-from[1];
 const x=item.x!+Math.round(wall?dx-dy:dx);
 return {x:wall?Math.max(0,Math.min(24-productOf(item).w,x)):x,y:wall?0:item.y!+Math.round(dy),rotation:wall?0:item.rotation};
}
export function initialPlacement(item:Item):Placement {
 const product=productOf(item),wall=product.surface==='wall';
 return {x:wall?Math.max(0,Math.min(24-product.w,item.x??5)):item.x??5,
   y:wall?0:item.y??5,rotation:wall?0:item.rotation,parentId:wall?null:item.parentId??null,supportLevel:wall?0:item.supportLevel??0};
}

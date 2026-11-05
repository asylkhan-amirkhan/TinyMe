import type { Item, RoomData } from './model';
export const studioLayout: Omit<Item,'id'>[] = [
 ['desk-oak',11,1,0],['chair-sage',12,4,180],['bed-cloud',1,7,0],['plant-monstera',21,2,0],['shelf-books',1,1,90],['rug-sunset',10,5,0],['sofa-moss',17,10,0],['record-warm',18,7,0],['lamp-honey',22,9,0],['plant-fern',6,13,0],
].map(([productId,x,y,rotation])=>({productId:productId as string,x:x as number,y:y as number,rotation:rotation as number,on:true}));

/** One-time furnishing. Reuse owned pieces; keep extras in inventory and preserve currency. */
export function furnishStudio(room:RoomData):RoomData {
 if(room.layoutVersion===1)return room;
 const used=new Set<string>();
 const furnished=studioLayout.map(p=>{
   const existing=room.items.find(i=>i.productId===p.productId&&!used.has(i.id));
   let id=existing?.id??`studio-${p.productId}`;
   while(!existing&&room.items.some(i=>i.id===id))id+='-new';
   used.add(id);return {...p,id, ...(existing?.color ? {color:existing.color} : {})};
 });
 return {...room,layoutVersion:1,revision:room.revision+1,items:[...furnished,...room.items.filter(i=>!used.has(i.id)).map(i=>({...i,x:null,y:null}))]};
}

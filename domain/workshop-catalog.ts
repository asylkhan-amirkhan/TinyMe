import { parseWorkshop, type WorkshopItem } from './workshop';
import type { Product, RoomData } from './model';
export const workshopStorageKey = 'tinyme:workshop:v1';
export const workshopCatalogEvent = 'tinyme:workshop-catalog';
export type WorkshopProduct = Product & { description?: string; images?: string[]; collectionTitle?: string };
const kinds = { plant:'plant', lamp:'lamp', shelf:'shelf', armchair:'armchair', sofa:'sofa', sculpture:'vase', bed:'bed', desk:'desk', chair:'chair' } as const;
export function workshopProduct(item: WorkshopItem): Product {
  return { id: `workshop:${item.id}`, name: item.title, category: item.category === 'Освещение' ? 'Свет' : item.category,
    price:item.price,w:item.width,h:item.depth,kind:kinds[item.illustration],color:item.color,surface:'floor',image:item.images?.[0] };
}
function readWorkshop(storage: Pick<Storage, 'getItem'>) {
  const raw=storage.getItem(workshopStorageKey);
  return raw ? parseWorkshop(raw) : { items: [], collections: [] };
}
export function readWorkshopProducts(storage: Pick<Storage, 'getItem'>): Product[] {
  return readWorkshop(storage).items.filter(item => item.purchasable).map(workshopProduct);
}
export function readWorkshopShowcase(storage: Pick<Storage, 'getItem'>): WorkshopProduct[] {
  const { items, collections } = readWorkshop(storage);
  return items.filter(item => item.purchasable).map(item => ({
    ...workshopProduct(item),
    description: item.description,
    images: item.images,
    collectionTitle: collections.find(collection => collection.id === item.collectionId)?.title,
  }));
}
export function buyWorkshopProduct(room: RoomData, product: Product, id: string): RoomData {
  if (!product.id.startsWith('workshop:')) throw Error('Неизвестная вещь мастерской');
  if (room.balance < product.price) throw Error('INSUFFICIENT_FUNDS');
  return { ...room,revision:room.revision+1,balance:room.balance-product.price,
    items:[...room.items,{id,productId:product.id,workshopProduct:{...product},x:null,y:null,rotation:0,on:false}] };
}

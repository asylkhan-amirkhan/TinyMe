import type { Appearance } from './appearance';
import { furnishStudio } from './studio-layout';
import {gamingCollection,type Game} from './gaming-collection';
export type Kind =
  | "desk"
  | "chair"
  | "bed"
  | "lamp"
  | "plant"
  | "rug"
  | "shelf"
  | "art"
  | "sofa"
  | "record"
  | "armchair"
  | "coffee-table"
  | "dresser"
  | "ottoman"
  | "vase"
  | "books"
  | "collectible";
export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  w: number;
  h: number;
  kind: Kind;
  color: string;
  surface: "floor" | "rug" | "wall";
  collection?: "quiet-evening" | "gaming";
  game?: Game;
  decorHeight?: number;
};
export const catalog: Product[] = [
  ["desk-oak", "Дубовый стол", "Мебель", 30, 4, 2, "desk", "#bd8854", "floor"],
  [
    "chair-sage",
    "Стул «Шалфей»",
    "Мебель",
    20,
    2,
    2,
    "chair",
    "#82977b",
    "floor",
  ],
  [
    "bed-cloud",
    "Кровать «Облако»",
    "Мебель",
    60,
    4,
    5,
    "bed",
    "#e0c4a2",
    "floor",
  ],
  ["lamp-honey", "Лампа «Мёд»", "Свет", 20, 1, 1, "lamp", "#d9a757", "floor"],
  [
    "plant-monstera",
    "Монстера",
    "Растения",
    10,
    2,
    2,
    "plant",
    "#668962",
    "floor",
  ],
  [
    "rug-sunset",
    "Ковёр «Закат»",
    "Текстиль",
    15,
    6,
    4,
    "rug",
    "#bd795f",
    "rug",
  ],
  [
    "shelf-books",
    "Книжная полка",
    "Мебель",
    45,
    4,
    2,
    "shelf",
    "#b58250",
    "floor",
  ],
  ["art-sun", "Солнечный день", "Декор", 5, 2, 1, "art", "#e8b66f", "wall"],
  ["sofa-moss", "Диван «Мох»", "Мебель", 70, 5, 3, "sofa", "#7f9675", "floor"],
  [
    "record-warm",
    "Проигрыватель",
    "Декор",
    25,
    2,
    2,
    "record",
    "#ad775c",
    "floor",
  ],
  [
    "desk-walnut",
    "Ореховый стол",
    "Мебель",
    40,
    4,
    2,
    "desk",
    "#956947",
    "floor",
  ],
  [
    "chair-clay",
    "Стул «Глина»",
    "Мебель",
    25,
    2,
    2,
    "chair",
    "#be8973",
    "floor",
  ],
  ["bed-sage", "Кровать «Лён»", "Мебель", 80, 4, 5, "bed", "#94a58b", "floor"],
  [
    "lamp-cream",
    "Лампа «Ваниль»",
    "Свет",
    30,
    1,
    1,
    "lamp",
    "#e7d6a7",
    "floor",
  ],
  ["plant-olive", "Олива", "Растения", 20, 2, 2, "plant", "#879565", "floor"],
  [
    "plant-fern",
    "Папоротник",
    "Растения",
    15,
    2,
    2,
    "plant",
    "#588473",
    "floor",
  ],
  ["rug-oat", "Ковёр «Овёс»", "Текстиль", 20, 6, 4, "rug", "#c6b98e", "rug"],
  ["rug-sage", "Ковёр «Сад»", "Текстиль", 25, 5, 3, "rug", "#879f88", "rug"],
  ["art-moon", "Тихая луна", "Декор", 10, 2, 1, "art", "#8c9da0", "wall"],
  [
    "shelf-light",
    "Светлая полка",
    "Мебель",
    55,
    3,
    2,
    "shelf",
    "#d6b88b",
    "floor",
  ],
].map(
  ([id, name, category, price, w, h, kind, color, surface]) =>
    ({ id, name, category, price, w, h, kind, color, surface }) as Product,
);
export const eveningCollection: Product[] = [
  { id: "armchair-boucle", name: "Кресло «Букле»", category: "Мебель", price: 45, w: 3, h: 3, kind: "armchair", color: "#d8c8b3", surface: "floor", collection: "quiet-evening" },
  { id: "table-tea", name: "Столик «Чайный час»", category: "Мебель", price: 30, w: 3, h: 2, kind: "coffee-table", color: "#a77e60", surface: "floor", collection: "quiet-evening" },
  { id: "dresser-walnut", name: "Комод «Орех»", category: "Мебель", price: 50, w: 4, h: 2, kind: "dresser", color: "#926c55", surface: "floor", collection: "quiet-evening" },
  { id: "ottoman-knit", name: "Пуф «Карамель»", category: "Мебель", price: 18, w: 2, h: 2, kind: "ottoman", color: "#c49879", surface: "floor", collection: "quiet-evening" },
  { id: "vase-branches", name: "Ваза «Тихий сад»", category: "Декор", price: 12, w: 1, h: 1, kind: "vase", color: "#bec6ae", surface: "floor", collection: "quiet-evening" },
  { id: "lamp-petal", name: "Торшер «Лепесток»", category: "Свет", price: 35, w: 2, h: 2, kind: "lamp", color: "#edcfac", surface: "floor", collection: "quiet-evening" },
];
catalog.push(...eveningCollection);
catalog.push(...gamingCollection);
catalog.push(
  {id:'books-stories',name:'Книги «Истории»',category:'Декор',price:8,w:1,h:1,kind:'books',color:'#8fa6a0',surface:'floor',collection:'quiet-evening'},
  {id:'lamp-table',name:'Лампа «Искра»',category:'Свет',price:22,w:1,h:1,kind:'lamp',color:'#e4c392',surface:'floor',collection:'quiet-evening'},
  {id:'plant-succulent',name:'Суккулент «Росток»',category:'Растения',price:10,w:1,h:1,kind:'plant',color:'#bfa18e',surface:'floor',collection:'quiet-evening'},
  {id:'vase-mini',name:'Ваза «Капля»',category:'Декор',price:9,w:1,h:1,kind:'vase',color:'#9caec0',surface:'floor',collection:'quiet-evening'},
);
export type Item = {
  id: string;
  productId: string;
  x: number | null;
  y: number | null;
  rotation: number;
  on: boolean;
  color?: string | null;
  /** Coordinates and rotation are local to the supporting furniture when set. */
  parentId?: string | null;
  supportLevel?: number;
};
export type Placement = {x:number;y:number;rotation:number;parentId?:string|null;supportLevel?:number};
export function supportSurfaces(p:Product) {
  if(p.kind==='shelf')return [9,42,76,110].map((height,level)=>({level,height,w:p.w-1,h:1,offsetX:.5,offsetY:1,clearance:[29,30,30,Infinity][level],label:level===3?'Верх стеллажа':`Полка ${level+1} ${level===0?'· нижняя':level===2?'· верхняя':'· средняя'}`}));
  const height=p.kind==='coffee-table'?31:p.kind==='dresser'?63:0;
  return height?[{level:0,height,w:p.w,h:p.h,offsetX:0,offsetY:0,clearance:Infinity,label:'Столешница'}]:[];
}
export const tabletopHeight = (p:Product) => supportSurfaces(p)[0]?.height??0;
export const canPlaceOnTop = (p:Product) => p.kind==='collectible' || ['vase-branches','books-stories','lamp-table','plant-succulent','vase-mini'].includes(p.id);
export const decorHeight = (p:Product) => p.decorHeight ?? ({'vase-branches':72,'books-stories':12,'lamp-table':42,'plant-succulent':26,'vase-mini':24}[p.id]??Infinity);
export type WorldItem = Item & {elevation:number};
export function resolveItems(items:Item[]):WorldItem[] {
  return items.map(item=>{
    if(productOf(item).surface==='wall' && item.x!==null && item.y!==null)return {...item,x:Math.max(0,Math.min(24-productOf(item).w,item.x)),y:0,rotation:0,elevation:0};
    if(!item.parentId)return {...item,elevation:0};
    const parent=items.find(p=>p.id===item.parentId);
    if(!parent||parent.parentId||parent.x===null||parent.y===null||item.x===null||item.y===null)return {...item,x:null,y:null,elevation:0};
    const p=productOf(parent),surface=supportSurfaces(p)[item.supportLevel??0];
    if(!surface)return {...item,x:null,y:null,elevation:0};
    const d=dimensions(productOf(item),item.rotation),x=item.x+surface.offsetX,y=item.y+surface.offsetY;
    const [a,b]=parent.rotation===90?[p.h-y-d.h,x]:parent.rotation===180?[p.w-x-d.w,p.h-y-d.h]:parent.rotation===270?[y,p.w-x-d.w]:[x,y];
    return {...item,x:parent.x+a,y:parent.y+b,rotation:(item.rotation+parent.rotation)%360,elevation:surface.height};
  });
}
export function localPoint(parent:Item,x:number,y:number):[number,number] {
  const p=productOf(parent),a=x-parent.x!,b=y-parent.y!;
  return parent.rotation===90?[b,p.h-a]:parent.rotation===180?[p.w-a,p.h-b]:parent.rotation===270?[p.w-b,a]:[a,b];
}
export function removeItem(items:Item[],id:string):Item[] {
  return items.map(i=>i.id===id||i.parentId===id?{...i,x:null,y:null,parentId:null,supportLevel:0}:i);
}
export type RoomData = {
  version: 1;
  layoutVersion?: number;
  appearance?: Appearance;
  balanceRevision?: number;
  revision: number;
  activeMs: number;
  balance: number;
  items: Item[];
};
export function initialRoom(): RoomData {
  return furnishStudio({
    version: 1,
    revision: 0,
    activeMs: 0,
    balance: 0,
    items: [
      {
        id: "starter-desk",
        productId: "desk-oak",
        x: 7,
        y: 4,
        rotation: 0,
        on: false,
      },
      {
        id: "starter-chair",
        productId: "chair-sage",
        x: 8,
        y: 7,
        rotation: 0,
        on: false,
      },
      {
        id: "starter-plant",
        productId: "plant-monstera",
        x: 17,
        y: 3,
        rotation: 0,
        on: false,
      },
    ],
  });
}
export function productOf(item: Item) {
  const p = catalog.find((p) => p.id === item.productId);
  if (!p) throw Error("Неизвестная мебель");
  return p;
}
export function dimensions(p: Product, rotation: number) {
  return p.surface==='wall' || rotation % 180 === 0 ? { w: p.w, h: p.h } : { w: p.h, h: p.w };
}
export function placementError(
  items: Item[],
  item: Item,
  x: number,
  y: number,
  rotation: number,
  parentId: string | null = item.parentId ?? null,
  supportLevel: number = item.supportLevel ?? 0,
): string | null {
  const p = productOf(item);
  const { w, h } = dimensions(p, rotation);
  if(p.surface==='wall' && rotation!==0)return "Постер должен прилегать к стене — поворот недоступен";
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    ![0, 90, 180, 270].includes(rotation)
  )
    return "Выберите клетку и допустимый поворот";
  const parent=parentId?items.find(i=>i.id===parentId):undefined;
  if(parentId && (!canPlaceOnTop(p)||!parent||parent.id===item.id||parent.parentId||parent.x===null||parent.y===null||!tabletopHeight(productOf(parent))))
    return "Выберите столик, комод или стеллаж в комнате";
  const surface=parent?supportSurfaces(productOf(parent))[supportLevel]:undefined;
  if(!Number.isInteger(supportLevel)||(!parent&&supportLevel!==0)||(parent&&!surface))return "Выберите допустимый ярус";
  if(surface&&decorHeight(p)>surface.clearance)return "Вещь слишком высокая для этого яруса. Выберите верх стеллажа";
  const bounds=surface??{w:24,h:16};
  if (x < 0 || y < 0 || x + w > bounds.w || y + h > bounds.h)
    return parent ? "Предмет не помещается на поверхности" : "Предмет выходит за границы комнаты";
  if (p.surface === "wall" && y !== 0)
    return "Картина размещается на верхней стене (Y = 0)";
  if (
    items.some((o) => {
      if (o.id === item.id || o.x === null || o.y === null) return false;
      if((o.parentId??null)!==parentId)return false;
      if(parentId&&(o.supportLevel??0)!==supportLevel)return false;
      const q = productOf(o);
      if (q.surface !== p.surface) return false;
      const d = dimensions(q, o.rotation);
      const ox=q.surface==='wall'?Math.max(0,Math.min(24-q.w,o.x)):o.x,oy=q.surface==='wall'?0:o.y;
      return x < ox + d.w && x + w > ox && y < oy + d.h && y + h > oy;
    })
  )
    return "Здесь уже стоит другой предмет";
  return null;
}
export function accrue(state: RoomData, delta: number): RoomData {
  const ms = Math.max(0, Math.floor(delta));
  return {
    ...state,
    activeMs: state.activeMs + ms,
    balance:
      state.balance +
      Math.floor((state.activeMs + ms) / 60000) -
      Math.floor(state.activeMs / 60000),
  };
}
export function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0")}:${Math.floor((seconds / 60) % 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
export function listenThreshold(duration: number) {
  return Math.min(30, duration / 2);
}

export function mergeRoom(current: RoomData, incoming: RoomData): RoomData {
  const newer =
    (current.balanceRevision ?? 0) > (incoming.balanceRevision ?? 0);
  return {
    ...incoming,
    activeMs: Math.max(current.activeMs, incoming.activeMs),
    balance: newer ? current.balance : incoming.balance,
    balanceRevision: Math.max(
      current.balanceRevision ?? 0,
      incoming.balanceRevision ?? 0,
    ),
  };
}

import { catalog, type Product } from './model';

export type ShopProduct = Product & { description: string; archived: boolean };
export type PublicProfile = { id: string; name: string; bio: string; public: boolean };
export type Review = { id: string; productId: string; userId: string; rating: number; text: string; createdAt: string };
export type Comment = { id: string; reviewId: string; userId: string; text: string; createdAt: string };
export type Selection = { id: string; userId: string; title: string; description: string; public: boolean; productIds: string[] };
export type Actor = { id: string; name: string; admin: boolean };
export type CommunityState = {
  version: 1; products: ShopProduct[]; profiles: PublicProfile[]; reviews: Review[]; comments: Comment[];
  likes: { reviewId: string; userId: string }[]; selections: Selection[];
  cart: { userId: string; productId: string; quantity: number }[];
  favorites: { userId: string; productId: string }[];
};
export type CommunityAction =
  | { type: 'product'; product: ShopProduct }
  | { type: 'archive'; productId: string }
  | { type: 'profile'; name: string; bio: string; public: boolean }
  | { type: 'cart'; productId: string; quantity: number }
  | { type: 'favorite'; productId: string; active: boolean }
  | { type: 'review'; id: string; productId: string; rating: number; text: string }
  | { type: 'deleteReview'; id: string }
  | { type: 'comment'; id: string; reviewId: string; text: string }
  | { type: 'deleteComment'; id: string }
  | { type: 'like'; reviewId: string; active: boolean }
  | { type: 'selection'; selection: Selection }
  | { type: 'deleteSelection'; id: string };
export function initialCommunity(): CommunityState {
  return {version:1,products:catalog.map(p=>({...p,description:`${p.name} — деталь для твоей уютной комнаты. Занимает ${p.w} × ${p.h} клетки.`,archived:false})),profiles:[],reviews:[],comments:[],likes:[],selections:[],cart:[],favorites:[]};
}
const text = (value: string, max: number, min = 1) => { if (typeof value !== 'string' || value.trim().length < min || value.length > max) throw Error(`Текст должен содержать от ${min} до ${max} символов.`); return value.trim(); };
export function validateShopProduct(p: ShopProduct) {
  text(p.id,150); text(p.name,100); text(p.description,2000,0); text(p.category,60);
  if (!Number.isInteger(p.price) || p.price<0 || p.price>1000000 || !Number.isInteger(p.w) || p.w<1 || p.w>24 || !Number.isInteger(p.h) || p.h<1 || p.h>16 || !/^#[0-9a-f]{6}$/i.test(p.color) || !['floor','rug','wall'].includes(p.surface) || !['desk','chair','bed','lamp','plant','rug','shelf','art','sofa','record','armchair','coffee-table','dresser','ottoman','vase','books','collectible'].includes(p.kind)) throw Error('Проверьте цену, размеры, цвет и форму товара.');
  if (p.image && (p.image.length>670000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(p.image))) throw Error('Некорректное изображение.');
}
/** Local prototype rules. Cloud authorization is enforced independently by RLS. */
export function applyCommunityAction(state: CommunityState, actor: Actor | null, action: CommunityAction, now = new Date().toISOString()): CommunityState {
  if (!actor) throw Error('Войдите в аккаунт.');
  const s = structuredClone(state);
  const product = (id: string) => { const p=s.products.find(p=>p.id===id&&!p.archived);if(!p)throw Error('Товар больше не доступен.');return p; };
  const owns = (id?: string) => { if (id!==actor.id) throw Error('Можно изменять только свои записи.'); };
  if (action.type==='product') {
    if(!actor.admin)throw Error('Только администратор может управлять товарами.');
    validateShopProduct(action.product);
    const i=s.products.findIndex(p=>p.id===action.product.id);
    if(i<0)s.products.push({...action.product});else s.products[i]={...action.product};
  } else if(action.type==='archive') {
    if(!actor.admin)throw Error('Только администратор может управлять товарами.');
    product(action.productId).archived=true;
  } else if(action.type==='profile') {
    const profile={id:actor.id,name:text(action.name,50,2),bio:text(action.bio,500,0),public:action.public};
    s.profiles=[...s.profiles.filter(p=>p.id!==actor.id),profile];
  } else if(action.type==='cart') {
    if(!Number.isInteger(action.quantity)||action.quantity<0||action.quantity>99)throw Error('Количество: от 0 до 99.');
    if(action.quantity)product(action.productId);
    s.cart=s.cart.filter(c=>c.userId!==actor.id||c.productId!==action.productId);
    if(action.quantity)s.cart.push({userId:actor.id,productId:action.productId,quantity:action.quantity});
  } else if(action.type==='favorite') {
    if(action.active)product(action.productId);
    s.favorites=s.favorites.filter(f=>f.userId!==actor.id||f.productId!==action.productId);
    if(action.active)s.favorites.push({userId:actor.id,productId:action.productId});
  } else if(action.type==='review') {
    product(action.productId);text(action.id,100);
    if(!Number.isInteger(action.rating)||action.rating<1||action.rating>5)throw Error('Оценка: от 1 до 5.');
    const existing=s.reviews.find(r=>r.id===action.id||r.productId===action.productId&&r.userId===actor.id);
    if(existing)owns(existing.userId);
    const review={id:existing?.id??action.id,productId:action.productId,userId:actor.id,rating:action.rating,text:text(action.text,2000),createdAt:existing?.createdAt??now};
    s.reviews=[...s.reviews.filter(r=>r.id!==review.id),review];
  } else if(action.type==='deleteReview') {
    const r=s.reviews.find(r=>r.id===action.id);owns(r?.userId);
    s.reviews=s.reviews.filter(r=>r.id!==action.id);s.comments=s.comments.filter(c=>c.reviewId!==action.id);s.likes=s.likes.filter(l=>l.reviewId!==action.id);
  } else if(action.type==='comment') {
    if(!s.reviews.some(r=>r.id===action.reviewId))throw Error('Отзыв удалён.');
    if(s.comments.some(c=>c.id===action.id))throw Error('Комментарий уже существует.');
    s.comments.push({id:text(action.id,100),reviewId:action.reviewId,userId:actor.id,text:text(action.text,1000),createdAt:now});
  } else if(action.type==='deleteComment') {
    owns(s.comments.find(c=>c.id===action.id)?.userId);s.comments=s.comments.filter(c=>c.id!==action.id);
  } else if(action.type==='like') {
    if(!s.reviews.some(r=>r.id===action.reviewId))throw Error('Отзыв удалён.');
    s.likes=s.likes.filter(l=>l.reviewId!==action.reviewId||l.userId!==actor.id);
    if(action.active)s.likes.push({reviewId:action.reviewId,userId:actor.id});
  } else if(action.type==='selection') {
    const existing=s.selections.find(c=>c.id===action.selection.id);if(existing)owns(existing.userId);
    const c=action.selection;owns(c.userId);text(c.id,100);text(c.title,100);text(c.description,1000,0);
    if(c.productIds.length>100)throw Error('В подборке может быть до 100 товаров.');
    c.productIds.forEach(product);
    s.selections=[...s.selections.filter(v=>v.id!==c.id),{...c,title:c.title.trim(),productIds:[...new Set(c.productIds)]}];
  } else if(action.type==='deleteSelection') {
    owns(s.selections.find(c=>c.id===action.id)?.userId);s.selections=s.selections.filter(c=>c.id!==action.id);
  }
  return s;
}
export function ratingFor(state: Pick<CommunityState,'reviews'>, productId: string) {
  const list=state.reviews.filter(r=>r.productId===productId);
  return {count:list.length,average:list.length?list.reduce((n,r)=>n+r.rating,0)/list.length:0};
}
export type ProductFilters = { query?: string; category?: string; min?: number; max?: number; minRating?: number; sort?: string };
export function filterProducts(state: CommunityState, filter: ProductFilters) {
  const needle=(filter.query??'').trim().toLocaleLowerCase('ru');
  return state.products.filter(p=>!p.archived&&(!needle||`${p.name} ${p.description}`.toLocaleLowerCase('ru').includes(needle))&&(!filter.category||p.category===filter.category)&&p.price>=(filter.min??0)&&p.price<=(filter.max??Infinity)&&ratingFor(state,p.id).average>=(filter.minRating??0))
    .sort((a,b)=>filter.sort==='price-asc'?a.price-b.price:filter.sort==='price-desc'?b.price-a.price:filter.sort==='rating'?ratingFor(state,b.id).average-ratingFor(state,a.id).average:a.name.localeCompare(b.name,'ru'));
}

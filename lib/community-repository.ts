import { createClient } from '@supabase/supabase-js';
import { applyCommunityAction, initialCommunity, type Actor, type CommunityAction, type CommunityState, type ShopProduct } from '@/domain/community';
import { readWorkshopProducts } from '@/domain/workshop-catalog';

export const communityKey='tinyme:community:v1';
export const communityEvent='tinyme:community-change';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const communityCloud=process.env.NEXT_PUBLIC_COMMUNITY_MODE==='cloud';
export const communityClient=communityCloud&&url&&key?createClient(url,key,{auth:{storageKey:'tinyme-community-auth'}}):null;
export function readLocalCommunity(storage: Pick<Storage,'getItem'>): CommunityState {
  const raw=storage.getItem(communityKey);
  const state:CommunityState=raw?JSON.parse(raw):initialCommunity();
  if(state.version!==1||!['products','profiles','reviews','comments','likes','selections','cart','favorites'].every(key=>Array.isArray(state[key as keyof CommunityState])))throw Error('Не удалось прочитать каталог. Сохранённые данные не изменены.');
  const workshop = readWorkshopProducts(storage);
  state.products = state.products.filter(p => !p.id.startsWith('workshop:'));
  state.products.push(...workshop.map(p => ({ ...p, description: 'Вещь из мастерской TinyMe.', archived: false })));
  return state;
}
export function writeLocalCommunity(storage: Pick<Storage,'getItem'|'setItem'>, actor: Actor|null, action: CommunityAction) {
  const state=applyCommunityAction(readLocalCommunity(storage),actor,action);
  const products = state.products.filter(p => !p.id.startsWith('workshop:'));
  storage.setItem(communityKey,JSON.stringify({ ...state, products }));
  return state;
}
type Row=Record<string,unknown>;
const value=(r:Row,k:string)=>String(r[k]??'');
export async function loadCloudCommunity():Promise<CommunityState> {
  const client=communityClient;if(!client)throw Error('Для общей базы настройте Supabase URL и публичный ключ.');
  const tables=['catalog_items','community_profiles','product_reviews','review_comments','review_likes','product_selections','selection_products','shopping_cart','product_favorites'];
  const result=await Promise.all(tables.map(async table=>{
    const rows:Row[]=[];
    for(let from=0;from<10000;from+=1000){
      const keys=table==='selection_products'?['selection_id','product_id']:table==='review_likes'?['review_id','user_id']:['shopping_cart','product_favorites'].includes(table)?['user_id','product_id']:table==='community_profiles'?['user_id']:['id'];
      let query=client.from(table).select('*').range(from,from+999);
      for(const key of keys)query=query.order(key);
      const result=await query;if(result.error)return {data:rows,error:result.error};
      rows.push(...result.data);if(result.data.length<1000)break;
    }
    return {data:rows,error:null};
  }));
  const failure=result.find(r=>r.error)?.error;if(failure)throw Error(`Не удалось открыть общую базу: ${failure.message}`);
  if(result.some(r=>(r.data?.length??0)>=10000))throw Error('Каталог превышает текущий лимит загрузки. Требуется постраничная загрузка.');
  const [products,profiles,reviews,comments,likes,selections,entries,cart,favorites]=result.map(r=>(r.data??[]) as Row[]);
  return {version:1,
    products:products.map(p=>({id:value(p,'id'),name:value(p,'name'),description:value(p,'description'),category:value(p,'category'),price:Number(p.price),w:Number(p.w),h:Number(p.h),surface:value(p,'surface'),kind:value(p,'kind'),color:value(p,'color'),image:p.image?value(p,'image'):undefined,archived:!!p.archived} as ShopProduct)),
    profiles:profiles.map(p=>({id:value(p,'user_id'),name:value(p,'name'),bio:value(p,'bio'),public:!!p.is_public})),
    reviews:reviews.map(r=>({id:value(r,'id'),productId:value(r,'product_id'),userId:value(r,'user_id'),rating:Number(r.rating),text:value(r,'body'),createdAt:value(r,'created_at')})),
    comments:comments.map(r=>({id:value(r,'id'),reviewId:value(r,'review_id'),userId:value(r,'user_id'),text:value(r,'body'),createdAt:value(r,'created_at')})),
    likes:likes.map(r=>({reviewId:value(r,'review_id'),userId:value(r,'user_id')})),
    selections:selections.map(r=>({id:value(r,'id'),userId:value(r,'user_id'),title:value(r,'title'),description:value(r,'description'),public:!!r.is_public,productIds:entries.filter(e=>e.selection_id===r.id).map(e=>value(e,'product_id'))})),
    cart:cart.map(r=>({userId:value(r,'user_id'),productId:value(r,'product_id'),quantity:Number(r.quantity)})),
    favorites:favorites.map(r=>({userId:value(r,'user_id'),productId:value(r,'product_id')}))};
}
export async function writeCloudCommunity(state: CommunityState, actor:Actor|null, action:CommunityAction) {
  const client=communityClient;if(!client||!actor)throw Error('Войдите в общий аккаунт.');
  applyCommunityAction(state,actor,action);
  const user_id=actor.id;
  let result;
  switch(action.type){
    case 'product': {const p=action.product;result=await client.from('catalog_items').upsert({id:p.id,name:p.name,description:p.description,category:p.category,price:p.price,w:p.w,h:p.h,surface:p.surface,kind:p.kind,color:p.color,image:p.image??null,archived:p.archived}).select('id').single();break;}
    case 'archive':result=await client.from('catalog_items').update({archived:true}).eq('id',action.productId).select('id').single();break;
    case 'profile':result=await client.from('community_profiles').upsert({user_id,name:action.name.trim(),bio:action.bio.trim(),is_public:action.public}).select('user_id').single();break;
    case 'cart':result=action.quantity?await client.from('shopping_cart').upsert({user_id,product_id:action.productId,quantity:action.quantity}).select('product_id').single():await client.from('shopping_cart').delete().eq('user_id',user_id).eq('product_id',action.productId);break;
    case 'favorite':result=action.active?await client.from('product_favorites').upsert({user_id,product_id:action.productId},{ignoreDuplicates:true}):await client.from('product_favorites').delete().eq('user_id',user_id).eq('product_id',action.productId);break;
    case 'review':result=await client.from('product_reviews').upsert({id:action.id,user_id,product_id:action.productId,rating:action.rating,body:action.text.trim()},{onConflict:'user_id,product_id'}).select('id').single();break;
    case 'deleteReview':result=await client.from('product_reviews').delete().eq('id',action.id).eq('user_id',user_id);break;
    case 'comment':result=await client.from('review_comments').insert({id:action.id,user_id,review_id:action.reviewId,body:action.text.trim()}).select('id').single();break;
    case 'deleteComment':result=await client.from('review_comments').delete().eq('id',action.id).eq('user_id',user_id);break;
    case 'like':result=action.active?await client.from('review_likes').upsert({user_id,review_id:action.reviewId},{ignoreDuplicates:true}):await client.from('review_likes').delete().eq('review_id',action.reviewId).eq('user_id',user_id);break;
    case 'selection':result=await client.rpc('save_product_selection',{p_id:action.selection.id,p_title:action.selection.title,p_description:action.selection.description,p_public:action.selection.public,p_products:action.selection.productIds});break;
    case 'deleteSelection':result=await client.from('product_selections').delete().eq('id',action.id).eq('user_id',user_id);break;
  }
  if(result?.error)throw Error(result.error.message);
}

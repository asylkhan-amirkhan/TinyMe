import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCommunityAction as act, initialCommunity, filterProducts, ratingFor, type Actor, type CommunityState } from '../domain/community';
import { readLocalCommunity, writeLocalCommunity, communityKey } from '../lib/community-repository';
import { workshopStorageKey } from '../domain/workshop-catalog';
import type { WorkshopItem } from '../domain/workshop';
const alice:Actor={id:'alice',name:'Alice',admin:false},bob:Actor={id:'bob',name:'Bob',admin:false};
const admin:Actor={id:'admin',name:'Admin',admin:true};
const review=(s:CommunityState)=>act(s,alice,{type:'review',id:'review-one',productId:'desk-oak',rating:4,text:'Great desk'});
test('one review per product and author, edits preserve the review id and recompute the rating',()=>{
  const original=initialCommunity();let s=review(original);
  s=act(s,alice,{type:'review',id:'new-id',productId:'desk-oak',rating:5,text:'Updated'});
  s=act(s,bob,{type:'review',id:'review-two',productId:'desk-oak',rating:3,text:'Good'});
  assert.equal(s.reviews.length,2);assert.equal(s.reviews[0].id,'review-one');
  assert.deepEqual(ratingFor(s,'desk-oak'),{count:2,average:4});assert.equal(original.reviews.length,0);
  assert.throws(()=>act(s,bob,{type:'review',id:'review-one',productId:'desk-oak',rating:1,text:'Attack'}),/свои/);
});
test('likes are idempotent and per author, comments are owned, deleting a review removes its discussion',()=>{
  let s=review(initialCommunity());
  s=act(s,bob,{type:'like',reviewId:'review-one',active:true});s=act(s,bob,{type:'like',reviewId:'review-one',active:true});
  assert.equal(s.likes.length,1);
  s=act(s,bob,{type:'comment',id:'comment-one',reviewId:'review-one',text:'Thanks!'});
  assert.throws(()=>act(s,alice,{type:'deleteComment',id:'comment-one'}),/свои/);
  assert.throws(()=>act(s,bob,{type:'deleteReview',id:'review-one'}),/свои/);
  s=act(s,alice,{type:'deleteReview',id:'review-one'});
  assert.deepEqual([s.reviews.length,s.likes.length,s.comments.length],[0,0,0]);
});
test('profile editing cannot overwrite another account and never persists email or credentials',()=>{
  let s=act(initialCommunity(),alice,{type:'profile',name:'Alice',bio:'My room',public:false});
  s=act(s,bob,{type:'profile',name:'Bob',bio:'Hello',public:true});
  assert.equal(s.profiles[0].name,'Alice');assert.equal(s.profiles[0].public,false);
  assert.deepEqual(Object.keys(s.profiles[0]).sort(),['bio','id','name','public']);
});
test('private and public selections preserve ownership, publication and selected products on reload',()=>{
  const values=new Map<string,string>();const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
  const selection={id:'selection-one',userId:alice.id,title:'Evening',description:'Warm things',public:false,productIds:['desk-oak','desk-oak','lamp-honey']};
  writeLocalCommunity(storage,alice,{type:'selection',selection});
  let state=readLocalCommunity(storage);assert.equal(state.selections[0].public,false);assert.equal(state.selections[0].productIds.length,2);
  state=writeLocalCommunity(storage,alice,{type:'selection',selection:{...state.selections[0],public:true}});
  assert.equal(readLocalCommunity(storage).selections[0].public,true);
  assert.throws(()=>act(state,bob,{type:'deleteSelection',id:selection.id}),/свои/);
  assert.throws(()=>act(state,bob,{type:'selection',selection:{...selection,userId:bob.id}}),/свои/);
  storage.setItem(communityKey,'{"version":9}');assert.throws(()=>readLocalCommunity(storage),/прочитать/);
});
test('search combines category, price and rating; archived products keep historical reviews',()=>{
  let s=review(initialCommunity());
  assert.deepEqual(filterProducts(s,{query:'дубовый',category:'Мебель',min:30,max:30,minRating:4}).map(p=>p.id),['desk-oak']);
  assert.equal(filterProducts(s,{query:'дубовый',max:29}).length,0);
  assert.throws(()=>act(s,alice,{type:'archive',productId:'desk-oak'}),/администратор/);
  s=act(s,admin,{type:'archive',productId:'desk-oak'});
  assert.equal(filterProducts(s,{query:'дубовый'}).length,0);assert.equal(s.reviews.length,1);
  assert.throws(()=>act(s,bob,{type:'review',id:'three',productId:'desk-oak',rating:5,text:'New'}),/доступен/);
});
test('workshop changes update the community catalogue without dropping existing reviews', () => {
  const item: WorkshopItem = { id: 'chair', title: 'Моё кресло', category: 'Мебель', width: 2, depth: 2, price: 5, purchasable: true, illustration: 'armchair', color: '#aabbcc' };
  const productId = 'workshop:chair';
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const publish = (draft: WorkshopItem) => storage.setItem(workshopStorageKey, JSON.stringify({ version: 1, items: [draft], collections: [] }));
  publish(item);
  const snapshot = writeLocalCommunity(storage, alice, { type: 'review', id: 'workshop-review', productId, rating: 4, text: 'Удобное кресло' });
  assert.equal(snapshot.products.find(p => p.id === productId)?.name, item.title);
  assert.ok(!JSON.parse(storage.getItem(communityKey)!).products.some((p: { id: string }) => p.id === productId));

  // Older saves stored a copy of the workshop product alongside its reviews.
  storage.setItem(communityKey, JSON.stringify(snapshot));
  publish({ ...item, title: 'Новое кресло', price: 7 });
  assert.equal(readLocalCommunity(storage).products.find(p => p.id === productId)?.price, 7);
  publish({ ...item, purchasable: false });
  const after = readLocalCommunity(storage);
  assert.ok(!after.products.some(p => p.id === productId));
  assert.deepEqual(ratingFor(after, productId), { count: 1, average: 4 });
});
test('anonymous, invalid ratings, empty comments and unsafe images are rejected without mutation',()=>{
  const s=review(initialCommunity());
  assert.throws(()=>act(s,null,{type:'like',reviewId:'review-one',active:true}),/Войдите/);
  assert.throws(()=>act(s,bob,{type:'review',id:'bad',productId:'desk-oak',rating:6,text:'Bad'}),/Оценка/);
  assert.throws(()=>act(s,bob,{type:'comment',id:'bad',reviewId:'review-one',text:' '}),/Текст/);
  assert.throws(()=>act(s,admin,{type:'product',product:{...s.products[0],image:'javascript:alert(1)'}}),/изображение/);
  assert.equal(s.comments.length,0);assert.equal(s.reviews.length,1);
});

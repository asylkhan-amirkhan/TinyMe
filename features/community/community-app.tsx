'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { browserId } from '@/lib/browser-id';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Heart, Star, MessageCircle, Users, Layers, Plus, Search, LockKeyhole, Share2, Pencil, Trash2 } from 'lucide-react';
import FurniturePreview from '@/components/FurniturePreview';
import { filterProducts, ratingFor, type Review, type Selection, type CommunityState } from '@/domain/community';
import { useCommunity } from '@/lib/use-community';
import { localSignOut } from '@/lib/use-local-account';

import styles from './community.module.css';

type Model=ReturnType<typeof useCommunity>;
type View='catalog'|'product'|'community'|'profile'|'selection';
const path=(base:string,id:string)=>`${base}/${encodeURIComponent(id)}`;
function visibleProfile(model: Model, id: string) {
  return model.state.profiles.find(profile => profile.id === id && (profile.public || id === model.actor?.id));
}

function author(model: Model, id: string) {
  return visibleProfile(model, id)?.name ?? (id === model.actor?.id ? model.actor.name : 'Пользователь');
}

function Author({ model, id, avatar = false }: { model: Model; id: string; avatar?: boolean }) {
  const name = author(model, id);
  const content = <>{avatar && <span className={styles.avatar} aria-hidden="true">{name.slice(0, 1)}</span>}{name}</>;
  const className = avatar ? styles.author : undefined;
  return id === model.actor?.id || visibleProfile(model, id)
    ? <Link className={className} href={path('/profiles', id)}>{content}</Link>
    : <span className={className}>{content}</span>;
}

function availableProductIds(model: Model, ids: string[]) {
  return ids.filter(id => model.state.products.some(product => product.id === id && !product.archived));
}
function Empty({title,text}:{title:string;text:string}){return <div className={styles.empty}><Layers size={28}/><h2>{title}</h2><p>{text}</p></div>;}
function Rating({state,id}:{state:CommunityState;id:string}){const r=ratingFor(state,id);return <span className={styles.rating}><Star size={15}/>{r.count?`${r.average.toFixed(1)} · ${r.count} отзывов`:'Пока без оценок'}</span>;}
function ShareButton(){const [status,setStatus]=useState('');async function copy(){try{if(!navigator.clipboard)throw Error('UNAVAILABLE');await navigator.clipboard.writeText(window.location.href);setStatus('Ссылка скопирована');}catch{setStatus('Скопируйте адрес из строки браузера');}}return <><button type="button" className={styles.quiet} onClick={()=>void copy()}><Share2 size={16}/>Поделиться</button><span role="status">{status}</span></>;}

export default function CommunityApp({view='catalog',id}:{view?:View;id?:string}){
  const model=useCommunity();
  const router = useRouter();
  useEffect(() => {
    if (view === 'community' && model.actor && new URLSearchParams(window.location.search).get('profile') === '1') {
      router.replace(path('/profiles', model.actor.id));
    }
  }, [view, model.actor, router]);
  return <main className={styles.page}>
    <header className={styles.header}><Link href="/room" className={styles.brand}>tiny me<span>.</span></Link><nav aria-label="Каталог и сообщество"><Link aria-current={view==='catalog'?'page':undefined} href="/catalog">Каталог</Link><Link aria-current={view==='community'?'page':undefined} href="/community">Сообщество</Link>{model.actor&&<Link href={path('/profiles',model.actor.id)}>Мой профиль</Link>}</nav><Link className={styles.roomLink} href="/room">В комнату <ArrowUpRight size={16}/></Link></header>
    {!model.cloud&&<p className={styles.mode}><LockKeyhole size={14}/>Локальный режим · профили, отзывы и подборки доступны только в этом браузере.</p>}
    {model.cloud&&<p className={styles.mode}><Users size={14}/>Общее сообщество TinyMe</p>}
    {model.error&&<div role="alert" className={styles.error}>{model.error}{!model.ready&&<button type="button" onClick={()=>void model.reload()}>Повторить загрузку</button>}</div>}
    {!model.ready?<p role="status" className={styles.loading}>Открываем каталог…</p>:<>
      {!model.actor&&<Access/>}
      {model.actor&&model.cloud&&<button type="button" className={styles.quiet} onClick={()=>void localSignOut().catch(()=>window.alert("Не удалось выйти. Попробуйте снова."))}>Выйти из TinyMe</button>}
      {view==='catalog'&&<Catalog model={model}/>}
      {view==='product'&&<ProductPage model={model} id={id??''}/>}
      {view==='community'&&<CommunityPage model={model}/>}
      {view==='profile'&&<ProfilePage key={id} model={model} id={id??''}/>}
      {view==='selection'&&<SelectionPage model={model} id={id??''}/>}
    </>}
  </main>;
}
function Access() {
  const next = usePathname();
  return <aside className={styles.access}><div><strong>Аккаунт TinyMe</strong><p>Войдите, чтобы оставить отзыв или создать подборку.</p></div>
    <Link className={styles.primary} href={{pathname:'/login',query:{next}}}>Войти</Link></aside>;
}
function Catalog({model}:{model:Model}){
  const [query,setQuery]=useState(''),[category,setCategory]=useState(''),[sort,setSort]=useState('name'),[minRating,setMinRating]=useState(0),[max,setMax]=useState('');
  const products=filterProducts(model.state,{query,category,sort,minRating,max:max===''?undefined:Number(max)});
  return <><section className={styles.heading}><span>ДЕТАЛИ С ХАРАКТЕРОМ</span><h1>Найди свой уют<span>.</span></h1><p>Вещи для комнаты и идеи от тех, кто любит маленькие детали.</p></section>
    <div className={styles.filters}><label className={styles.search}><Search size={18}/><span className={styles.srOnly}>Поиск товаров</span><input type="search" placeholder="Название или описание вещи" value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Категория<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Все категории</option>{[...new Set(model.state.products.filter(p=>!p.archived).map(p=>p.category))].map(c=><option key={c}>{c}</option>)}</select></label><label>Цена до<input type="number" min={0} max={1000000} placeholder="Без лимита" value={max} onChange={e=>setMax(e.target.value)}/></label><label>Оценка<select value={minRating} onChange={e=>setMinRating(Number(e.target.value))}><option value={0}>Любая</option><option value={4}>От 4 ★</option><option value={3}>От 3 ★</option></select></label><label>Сортировка<select value={sort} onChange={e=>setSort(e.target.value)}><option value="name">По названию</option><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option><option value="rating">По оценке</option></select></label></div>
    <p className={styles.muted}>{products.length} вещей</p><ProductGrid model={model} ids={products.map(p=>p.id)}/>
    {!products.length&&<Empty title="Ничего не нашлось" text="Измени запрос или фильтры."/>}
  </>;
}
function ProductGrid({model,ids}:{model:Model;ids:string[]}){return <div className={styles.grid}>{ids.map(id=>{const p=model.state.products.find(p=>p.id===id&&!p.archived);if(!p)return null;return <article key={p.id} className={styles.product}><Link href={path('/catalog',p.id)} className={styles.art} style={{backgroundColor:`${p.color}25`}}><span>{p.category}</span><FurniturePreview product={p}/></Link><div className={styles.productBody}><h2><Link href={path('/catalog',p.id)}>{p.name}</Link></h2><Rating state={model.state} id={p.id}/><div className={styles.between}><small>{p.w} × {p.h} клетки</small><strong>{p.price} ◈</strong></div></div></article>;})}</div>;}
function ProductPage({model,id}:{model:Model;id:string}){
  const p=model.state.products.find(p=>p.id===id&&!p.archived);
  const own=model.state.reviews.find(r=>r.productId===id&&r.userId===model.actor?.id);
  const lists=model.state.selections.filter(s=>s.userId===model.actor?.id);
  if(!p)return <Empty title="Вещь не найдена" text="Возможно, она больше не доступна в каталоге."/>;
  return <><Link className={styles.back} href="/catalog"><ArrowLeft size={16}/>Все вещи</Link><section className={styles.detail}><div className={styles.largeArt} style={{backgroundColor:`${p.color}25`}}><FurniturePreview product={p}/></div><div className={styles.detailCopy}><span className={styles.eyebrow}>{p.category}</span><h1>{p.name}</h1><Rating state={model.state} id={id}/><p>{p.description}</p><div className={styles.facts}><span>Размер <strong>{p.w} × {p.h} клетки</strong></span><span>Цена <strong>{p.price} монет</strong></span></div><ShareButton/>{model.actor&&<label className={styles.addTo}>Добавить в свою подборку<select value="" disabled={model.busy} onChange={e=>{const c=lists.find(c=>c.id===e.target.value);if(c)void model.act({type:'selection',selection:{...c,productIds:[...new Set([...availableProductIds(model, c.productIds), id])]}});}}><option value="">Выбери подборку</option>{lists.map(c=><option key={c.id} value={c.id} disabled={c.productIds.includes(id)}>{c.title}{c.productIds.includes(id)?' · уже добавлено':''}</option>)}</select><Link href={path('/profiles',model.actor.id)}>Создать или изменить подборку</Link></label>}</div></section>
    <section className={styles.section}><div className={styles.sectionTitle}><div><span className={styles.eyebrow}>ОПЫТ И МАЛЕНЬКИЕ СОВЕТЫ</span><h2>Отзывы о вещи</h2></div><Rating state={model.state} id={id}/></div>
      {model.actor&&<ReviewForm key={own?`${own.id}:${own.rating}:${own.text}`:id} model={model} productId={id} existing={own}/>}
      <div className={styles.reviews}>{model.state.reviews.filter(r=>r.productId===id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(r=><ReviewCard key={r.id} model={model} review={r}/>)}</div>
      {!model.state.reviews.some(r=>r.productId===id)&&<Empty title="Пока тихо" text="Поделись первым впечатлением об этой вещи."/>}
    </section></>;
}
function ReviewForm({model,productId,existing}:{model:Model;productId:string;existing?:Review}){
  const [rating,setRating]=useState(existing?.rating??5),[body,setBody]=useState(existing?.text??''),[saved,setSaved]=useState(false);
  return <form className={styles.compose} onSubmit={e=>{e.preventDefault();void model.act({type:'review',id:existing?.id??browserId(),productId,rating,text:body}).then(ok=>{if(ok)setSaved(true);});}}><fieldset disabled={model.busy}><legend>{existing?'Твой отзыв':'Как тебе эта вещь?'}</legend><div className={styles.stars} role="radiogroup" aria-label="Оценка товара">{[1,2,3,4,5].map(n=><label key={n}><input type="radio" name="rating" checked={rating===n} onChange={()=>{setRating(n);setSaved(false);}} value={n}/><Star size={24} fill={n<=rating?'currentColor':'none'}/><span className={styles.srOnly}>{n} из 5</span></label>)}</div><label><span className={styles.srOnly}>Текст отзыва</span><textarea required maxLength={2000} rows={3} placeholder="Что понравилось? Как вещь вписалась в твою комнату?" value={body} onChange={e=>{setBody(e.target.value);setSaved(false);}}/></label><div className={styles.between}><small>Один отзыв на вещь. Его можно изменить.</small><button className={styles.primary}>{model.busy?'Сохраняем…':existing?'Сохранить отзыв':'Опубликовать отзыв'}</button></div>{saved&&<p role="status">Отзыв сохранён.</p>}</fieldset></form>;
}
function ReviewCard({model,review:r}:{model:Model;review:Review}){
  const liked=model.state.likes.some(l=>l.reviewId===r.id&&l.userId===model.actor?.id);
  const comments=model.state.comments.filter(c=>c.reviewId===r.id);
  return <article className={styles.review}><div className={styles.between}><Author model={model} id={r.userId} avatar/><time dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleDateString('ru-RU')}</time></div><div className={styles.rating}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</div><p className={styles.bodyText}>{r.text}</p><div className={styles.actions}><button type="button" disabled={!model.actor||model.busy} aria-pressed={liked} onClick={()=>void model.act({type:'like',reviewId:r.id,active:!liked})}><Heart size={16} fill={liked?'currentColor':'none'}/>{model.state.likes.filter(l=>l.reviewId===r.id).length}<span className={styles.srOnly}>Полезный отзыв</span></button><span><MessageCircle size={16}/>{comments.length}</span>{r.userId===model.actor?.id&&<button type="button" disabled={model.busy} onClick={()=>{if(confirm('Удалить отзыв и комментарии к нему?'))void model.act({type:'deleteReview',id:r.id});}}><Trash2 size={15}/>Удалить отзыв</button>}</div>
    <div className={styles.comments}>{comments.map(c=><div className={styles.comment} key={c.id}><Author model={model} id={c.userId}/><p className={styles.bodyText}>{c.text}</p>{c.userId===model.actor?.id&&<button type="button" className={styles.quiet} disabled={model.busy} onClick={()=>void model.act({type:'deleteComment',id:c.id})}>Удалить</button>}</div>)}{model.actor&&<form onSubmit={e=>{e.preventDefault();const form=e.currentTarget;const body=String(new FormData(form).get('body')??'');void model.act({type:'comment',id:browserId(),reviewId:r.id,text:body}).then(ok=>{if(ok)form.reset();});}}><label><span className={styles.srOnly}>Комментарий к отзыву</span><input name="body" required maxLength={1000} disabled={model.busy} placeholder="Ответить на отзыв…"/></label><button className={styles.quiet} disabled={model.busy}>Отправить</button></form>}</div>
  </article>;
}
function SelectionCards({model,selections}:{model:Model;selections:Selection[]}){return <div className={styles.selectionGrid}>{selections.map(c=><article key={c.id} className={styles.selection}><Link href={path('/collections',c.id)} className={styles.selectionArt}>{c.productIds.slice(0,3).map(id=>{const p=model.state.products.find(p=>p.id===id&&!p.archived);return p?<FurniturePreview key={id} product={p}/>:null;})}{!c.productIds.length&&<Layers size={40}/>}</Link><div><span className={styles.eyebrow}>{c.public?'ПУБЛИЧНАЯ ПОДБОРКА':'ТОЛЬКО ДЛЯ ТЕБЯ'}</span><h2><Link href={path('/collections',c.id)}>{c.title}</Link></h2><p>{c.description}</p><small>{c.productIds.filter(id=>model.state.products.some(p=>p.id===id&&!p.archived)).length} вещей · {author(model,c.userId)}</small></div></article>)}</div>;}
function CommunityPage({model}:{model:Model}){const selections=model.state.selections.filter(s=>s.public);return <><section className={styles.heading}><span>СОБРАНО С ЛЮБОВЬЮ</span><h1>У каждого свой уют<span>.</span></h1><p>Подборки вещей, маленькие находки и люди, которые их собирают.</p>{model.actor&&<Link className={styles.primary} href={path('/profiles',model.actor.id)}><Plus size={17}/>Собрать свою подборку</Link>}</section><section className={styles.section}><h2>Публичные подборки</h2><SelectionCards model={model} selections={selections}/>{!selections.length&&<Empty title="Здесь появятся ваши идеи" text="Создай подборку в своём профиле и включи публикацию."/>}</section><section className={styles.section}><h2>Люди TinyMe</h2><div className={styles.people}>{model.state.profiles.filter(p=>p.public).map(p=><Link key={p.id} href={path('/profiles',p.id)}><span className={styles.avatar}>{p.name.slice(0,1)}</span><strong>{p.name}</strong><span>{p.bio||'Маленькие детали большого уюта'}</span><ArrowUpRight size={17}/></Link>)}</div>{!model.state.profiles.some(p=>p.public)&&<p className={styles.muted}>Пока никто не опубликовал свой профиль.</p>}</section></>;}
function ProfilePage({model,id}:{model:Model;id:string}){
  const own=model.actor?.id===id,p=visibleProfile(model,id);
  const [edit,setEdit]=useState(false),[selection,setSelection]=useState<Selection|null|undefined>(undefined);
  if(!p&&!own)return <Empty title="Профиль недоступен" text="Этот пользователь ещё не опубликовал свой профиль."/>;
  const selections=model.state.selections.filter(c=>c.userId===id&&(c.public||own));
  return <><section className={styles.profileHero}><span className={styles.bigAvatar}>{(p?.name??model.actor?.name??'Т').slice(0,1)}</span><div><span className={styles.eyebrow}>{own?'ТВОЁ ПРОСТРАНСТВО':'ПРОФИЛЬ TINYME'}</span><h1>{p?.name??model.actor?.name}</h1><p className={styles.bodyText}>{p?.bio||'Здесь начинается история маленького уюта.'}</p><small>{model.state.reviews.filter(r=>r.userId===id).length} отзывов · {selections.length} подборок{own&&!p?.public?' · профиль скрыт':''}</small></div>{own?<button className={styles.quiet} onClick={()=>setEdit(v=>!v)}><Pencil size={16}/>Редактировать профиль</button>:<ShareButton/>}</section>
    {own&&edit&&<ProfileForm key={`${p?.name}:${p?.bio}:${p?.public}`} model={model} onSaved={()=>setEdit(false)}/>}
    <section className={styles.section}><div className={styles.sectionTitle}><h2>{own?'Твои подборки':'Подборки'}</h2>{own&&<button className={styles.primary} onClick={()=>setSelection(null)}><Plus size={16}/>Новая подборка</button>}</div>
      {own&&selection!==undefined&&<SelectionEditor key={selection?.id??'new'} model={model} existing={selection??undefined} onDone={()=>setSelection(undefined)}/>}
      <SelectionCards model={model} selections={selections}/>{!selections.length&&<Empty title="Подборок пока нет" text="Собери несколько вещей, которые хорошо смотрятся вместе."/>}
      {own&&<div className={styles.management}>{selections.map(c=><div key={c.id}><strong>{c.title}</strong><button className={styles.quiet} onClick={()=>setSelection(c)}><Pencil size={14}/>Изменить</button><button className={styles.quiet} disabled={model.busy} onClick={()=>{if(confirm('Удалить подборку? Товары останутся в каталоге.'))void model.act({type:'deleteSelection',id:c.id});}}><Trash2 size={14}/>Удалить</button></div>)}</div>}
    </section><section className={styles.section}><h2>{own?'Твои отзывы':'Отзывы пользователя'}</h2>{model.state.reviews.filter(r=>r.userId===id).map(r=><div key={r.id}><Link className={styles.back} href={path('/catalog',r.productId)}>{model.state.products.find(p=>p.id===r.productId)?.name??'Товар'}</Link><ReviewCard model={model} review={r}/></div>)}</section></>;
}
function ProfileForm({model,onSaved}:{model:Model;onSaved:()=>void}){const p=model.state.profiles.find(p=>p.id===model.actor?.id);return <form className={styles.compose} onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);void model.act({type:'profile',name:String(data.get('name')),bio:String(data.get('bio')),public:data.has('public')}).then(ok=>{if(ok)onSaved();});}}><fieldset disabled={model.busy}><legend>Профиль</legend><label>Имя<input name="name" minLength={2} maxLength={50} defaultValue={p?.name??model.actor?.name} required/></label><label>О себе<textarea name="bio" maxLength={500} defaultValue={p?.bio} rows={3}/></label><label className={styles.checkbox}><input name="public" type="checkbox" defaultChecked={p?.public??false}/>Показывать профиль в сообществе</label><small>Имя и описание будут видны всем. Email и пароль не публикуются.</small><button className={styles.primary}>Сохранить профиль</button></fieldset></form>;}
function SelectionEditor({model,existing,onDone}:{model:Model;existing?:Selection;onDone:()=>void}){
  const [selectedIds,setIds]=useState(existing?.productIds??[]),[query,setQuery]=useState('');
  const ids = availableProductIds(model, selectedIds);
  return <form className={styles.compose} onSubmit={e=>{e.preventDefault();if(!model.actor)return;const data=new FormData(e.currentTarget);void model.act({type:'selection',selection:{id:existing?.id??browserId(),userId:model.actor.id,title:String(data.get('title')),description:String(data.get('description')),public:data.has('public'),productIds:ids}}).then(ok=>{if(ok)onDone();});}}><fieldset disabled={model.busy}><legend>{existing?'Редактировать подборку':'Новая подборка'}</legend><label>Название<input name="title" required maxLength={100} defaultValue={existing?.title} placeholder="Например, тихий вечер"/></label><label>Описание<textarea name="description" maxLength={1000} rows={2} defaultValue={existing?.description}/></label><label>Найти вещь<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Название товара"/></label><div className={styles.pickProducts}>{filterProducts(model.state,{query}).map(p=><label key={p.id} className={styles.checkbox}><input type="checkbox" checked={ids.includes(p.id)} onChange={e=>setIds(old=>e.target.checked?[...old,p.id]:old.filter(id=>id!==p.id))}/>{p.name}<small>{p.price} ◈</small></label>)}</div><small>Выбрано: {ids.length} из 100</small><label className={styles.checkbox}><input type="checkbox" name="public" defaultChecked={existing?.public??false}/>Опубликовать в сообществе</label><div className={styles.actions}><button className={styles.primary}>Сохранить подборку</button><button type="button" className={styles.quiet} onClick={onDone}>Отмена</button></div></fieldset></form>;
}
function SelectionPage({model,id}:{model:Model;id:string}){const c=model.state.selections.find(c=>c.id===id&&(c.public||c.userId===model.actor?.id));if(!c)return <Empty title="Подборка недоступна" text="Она могла быть удалена или скрыта автором."/>;const ids=availableProductIds(model, c.productIds);return <><Link className={styles.back} href="/community"><ArrowLeft size={16}/>Сообщество</Link><section className={styles.heading}><span>{c.public?'ПУБЛИЧНАЯ ПОДБОРКА':'ЛИЧНАЯ ПОДБОРКА'}</span><h1>{c.title}</h1><p>{c.description}</p><div className={styles.actions}><Author model={model} id={c.userId}/><span>{ids.length} вещей</span>{c.public&&<ShareButton/>}{c.userId===model.actor?.id&&<Link className={styles.quiet} href={path('/profiles',c.userId)}>Управление подборкой</Link>}</div></section><ProductGrid model={model} ids={ids}/>{!ids.length&&<Empty title="Пока без вещей" text="Добавь товары в редакторе подборки."/>}</>;}

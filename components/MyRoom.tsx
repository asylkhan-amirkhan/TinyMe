"use client";
import dynamic from "next/dynamic";
import packageInfo from "../package.json";
import ThemeSelector from "./ThemeSelector";
import { useEffect, useState, useCallback, useLayoutEffect, useRef, useMemo } from "react";
import {
  Search,
  Heart,
  Snowflake,
  Music2,
  Coins,
  Leaf,
  Plus,
  Minus,
  Check,
  ArrowRight,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  Palette,
  Sparkles,
  LampDesk,
  X,
  Cloud,
  CloudRain,
  Sun,
  Moon,
  Move,
  Expand,
  Minimize,
  Undo2,
} from "lucide-react";
import { showcaseItems } from "@/engine/isometric";
import {initialPlacement} from '@/domain/drag';
import {games} from '@/domain/gaming-collection';
import {posterArt} from '@/engine/poster-assets';
import type {Product} from '@/domain/model';
import { catalog, productOf, placementError, Item, type Placement } from "@/domain/model";
import { usePlacementHistory } from '@/lib/use-placement-history';
import { useRoom } from "@/lib/use-room";
import { useAtmosphere } from "@/lib/use-atmosphere";
import { useWinterWind } from "@/lib/use-winter-wind";
import { useRain } from "@/lib/use-rain";
import { useStorm } from "@/lib/use-storm";
import RainPanel from "./RainPanel";
import Select from "./Select";
import { useRoomLighting } from "@/lib/use-room-lighting";
import { useSeason } from '@/lib/use-season';
import { seasonNames, seasons } from '@/domain/season';
import { useAccentLights } from '@/lib/use-accent-lights';
import { lightingName } from "@/domain/lighting";
import { useRoomMotion } from "@/lib/use-room-motion";
import { useMusic } from "@/lib/use-music";
import type { StatisticsPeriod } from "@/lib/music-statistics";
import MusicStatistics from "./MusicStatistics";
import ResidentPanel from './ResidentPanel';
import { useRoomResident } from '@/lib/use-room-resident';
import { supabase } from "@/lib/supabase";
import { appearanceOf, colorPresets, type Appearance } from "@/domain/appearance";
import FurnitureColorPanel from "./FurnitureColorPanel";
import FurniturePreview from "./FurniturePreview";
import FurnitureInspector from "./FurnitureInspector";
import MusicLibrary from "./MusicLibrary";
import RoomStage from "./RoomStage";
import AppNavigation from "./AppNavigation";
import AccountPanel from "./AccountPanel";
import GrowthPanel from './GrowthPanel';
import { useGrowth } from '@/lib/use-growth';
import { growthCategories, growthMastery, type GrowthSkill } from '@/domain/growth';
import { residentTargets } from '@/domain/resident';
import SessionStrip from "./SessionStrip";
import NotificationCenter from "./NotificationCenter";
import { useNotifications } from "@/lib/use-notifications";
import { useNotificationSound } from "@/lib/use-notification-sound";
const CollectibleViewer=dynamic(()=>import('./CollectibleViewer'),{ssr:false});
const ResidentWardrobe=dynamic(()=>import('./ResidentWardrobe'),{ssr:false});
const RoomCanvas = dynamic(() => import("./RoomCanvas"), {
  ssr: false,
  loading: () => (
    <div className="room-loading">
      <Leaf size={16}  strokeWidth={1.75}/>
      <p>Открываем твою комнату…</p>
    </div>
  ),
});
function mm(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
export default function MyRoom() {
  const r = useRoom();
  const growth = useGrowth(r.user?.id, r.loaded);
  const moves = usePlacementHistory(r.room.items, r.user?.id ?? 'guest', r.command, r.setNotice);
  const notificationSound = useNotificationSound();
  const notifications = useNotifications({ scope: r.user?.id ?? "guest", loaded: r.loaded, activeMs: r.room.activeMs }, r.notice, notificationSound.play);
  const motion = useRoomMotion();
  const resident = useRoomResident(r.user?.id ?? 'guest');
  const practiceGrowth = (skill: GrowthSkill, level: number) => {
    r.setNotice(`${skill.name}: результат сохранён. ${growthMastery(level)}.`);
    if (!motion.enabled || resident.mode === 'hidden' || resident.mode === 'paused') return;
    const action = growthCategories[skill.category].action;
    resident.send(action === 'walk' || residentTargets(r.room.items, action).length ? action : 'walk');
  };
  const [wardrobe, setWardrobe] = useState(false);
  const lighting = useRoomLighting();
  const accentLights = useAccentLights(r.setNotice);
  const season=useSeason(r.setNotice);
  const rain = useRain();
  const wind = useWinterWind();
  const storm = useStorm(motion.enabled);
  const atmosphere=useAtmosphere({lighting,season,accentLights,rain,storm,wind},r.setNotice);
  const [rainOpen,setRainOpen]=useState(false);
  const music = useMusic(r.user?.id ?? "guest", r.setNotice);
  const [favorites,setFavorites]=useState<string[]>([]);
  const [favoritesReady,setFavoritesReady]=useState(false);
  const [restMode,setRestMode]=useState(false);
  const [restVolumeOpen,setRestVolumeOpen]=useState(false);
  useEffect(()=>{
    if(!restMode || !restVolumeOpen)return;
    const panel=document.getElementById('player-volume-controls');
    const trigger=document.querySelector<HTMLButtonElement>('.rest-volume-trigger');
    let timer:ReturnType<typeof setTimeout>;
    let dragging=false;
    const close=()=>{
      if(panel?.contains(document.activeElement))trigger?.focus();
      setRestVolumeOpen(false);
    };
    const schedule=()=>{clearTimeout(timer);if(!dragging)timer=setTimeout(close,2000);};
    const down=(event:PointerEvent)=>{
      if(panel?.contains(event.target as Node)){dragging=true;clearTimeout(timer);}
      else if(!trigger?.contains(event.target as Node))setRestVolumeOpen(false);
    };
    const release=()=>{if(dragging){dragging=false;schedule();}};
    schedule();
    document.addEventListener('pointerdown',down);
    document.addEventListener('pointerup',release);
    document.addEventListener('pointercancel',release);
    panel?.addEventListener('input',schedule);
    panel?.addEventListener('keydown',schedule);
    return()=>{
      clearTimeout(timer);
      document.removeEventListener('pointerdown',down);
      document.removeEventListener('pointerup',release);
      document.removeEventListener('pointercancel',release);
      panel?.removeEventListener('input',schedule);
      panel?.removeEventListener('keydown',schedule);
    };
  },[restMode,restVolumeOpen]);
  const restTrigger=useRef<HTMLButtonElement>(null);
  const restExit=useRef<HTMLButtonElement>(null);
  const restPlayer=useRef<HTMLElement>(null);
  const shell=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(!restMode || !restPlayer.current)return;const player=restPlayer.current;const measure=()=>shell.current?.style.setProperty('--rest-player-height',`${player.getBoundingClientRect().height}px`);measure();const observer=new ResizeObserver(measure);observer.observe(player);return()=>observer.disconnect();},[restMode]);
  useEffect(()=>{try {const saved=JSON.parse(localStorage.getItem('myroom:shop-favorites:v1')??'[]');if(Array.isArray(saved))setFavorites(saved.filter((id):id is string=>typeof id==='string'&&catalog.some(p=>p.id===id)));} catch {} setFavoritesReady(true);},[]);
  const toggleFavorite=(id:string)=>{const next=favorites.includes(id)?favorites.filter(value=>value!==id):[...favorites,id];try{localStorage.setItem('myroom:shop-favorites:v1',JSON.stringify(next));setFavorites(next);}catch{r.setNotice('Не удалось сохранить избранное на устройстве.');}};
  useEffect(()=>{if(!restMode)return;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';restExit.current?.focus();const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){setRainOpen(false);setRestMode(false);}};window.addEventListener('keydown',escape);return()=>{document.body.style.overflow=overflow;window.removeEventListener('keydown',escape);restTrigger.current?.focus();};},[restMode]);
  const lastMusicVolume=useRef(.3);
  useEffect(()=>{if(music.music.volume>0)lastMusicVolume.current=music.music.volume;},[music.music.volume]);
  const [view, setView] = useState("room");
  const [search,setSearch]=useState('');
  const [inventorySearch,setInventorySearch]=useState('');
  const [inventoryStatus,setInventoryStatus]=useState('Все');
  const [inventoryCategory,setInventoryCategory]=useState('Все категории');
  const [inventorySort,setInventorySort]=useState('newest');
  const previousView=useRef(view);
  useLayoutEffect(()=>{
    if(previousView.current===view)return;
    previousView.current=view;
    window.scrollTo({top:0,behavior:'instant'});
    document.getElementById('main-content')?.scrollTo({top:0,behavior:'instant'});
    const heading=document.querySelector<HTMLElement>(view==='room'?'.room-heading h1':'main h1');
    if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
  },[view]);
  const [category, setCategory] = useState("Все");
  const [gameFilter,setGameFilter]=useState('Все игры');
  const [inspect,setInspect]=useState<{product:Product;color?:string|null}|null>(null);
  const [sort, setSort] = useState("price");
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Placement | null>(null);
  const [furnitureColor, setFurnitureColor] = useState<{id:string;color:string|null} | null>(null);
  const [colorDraft, setColorDraft] = useState<Appearance | null>(null);
  useEffect(()=>{
    const activePanel=()=>document.querySelector<HTMLElement>('#furniture-colors, #room-colors, .accent-settings[open], .rest-mode #player-volume-controls[data-open="true"]');
    const close=(panel:HTMLElement,restoreFocus:boolean)=>{
      if(r.busy)return;
      const trigger=panel.matches('details')?panel.querySelector<HTMLElement>('summary'):document.querySelector<HTMLElement>(`[aria-controls="${panel.id}"]`);
      if(panel.matches('details'))(panel as HTMLDetailsElement).open=false;
      else if(panel.id==='player-volume-controls')setRestVolumeOpen(false);
      else if(panel.id==='room-colors')setColorDraft(null);
      else setFurnitureColor(null);
      if(restoreFocus)trigger?.focus({preventScroll:true});
    };
    const outside=(event:Event)=>{
      const panel=activePanel(),target=event.target as Element;
      if(!panel || !target.isConnected || panel.contains(target) || target.closest('[role="listbox"], .rain-panel, .resident-wardrobe'))return;
      if(panel.id && target.closest(`[aria-controls="${panel.id}"]`))return;
      close(panel,false);
    };
    const escape=(event:KeyboardEvent)=>{
      const panel=activePanel();
      if(event.key==='Escape' && !event.defaultPrevented && panel && !document.querySelector('[role="listbox"]')){
        event.preventDefault();event.stopPropagation();close(panel,true);
      }
    };
    document.addEventListener('pointerdown',outside);
    document.addEventListener('click',outside);
    document.addEventListener('keydown',escape,true);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('click',outside);document.removeEventListener('keydown',escape,true);};
  },[r.busy]);
  const [zoom, setZoom] = useState(1);
  const [showcase, setShowcase] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // Decorative effects may degrade independently of the scene renderer.
  const [quietEffects,setQuietEffects]=useState(false);
  useEffect(()=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setQuietEffects(true);return;}
    let frame=0,previous=0,total=0,count=0;
    const tick=(now:number)=>{
      if(document.hidden){previous=0;frame=requestAnimationFrame(tick);return;}
      if(previous){total+=now-previous;count++;}previous=now;
      if(count<180)frame=requestAnimationFrame(tick);
      else if(total/count>1000/52)setQuietEffects(true);
    };
    const timer=setTimeout(()=>{frame=requestAnimationFrame(tick);},3000);
    return()=>{clearTimeout(timer);cancelAnimationFrame(frame);};
  },[]);
  const [paletteOpen,setPaletteOpen]=useState(false);
  useEffect(()=>{
    const undo=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement;
      if(view!=='room'||restMode||draft||r.busy||!moves.canUndo||event.shiftKey||event.altKey||event.repeat||!(event.ctrlKey||event.metaKey)||event.key.toLowerCase()!=='z')return;
      if(target.closest('input,textarea,select,[contenteditable="true"],[role="dialog"]'))return;
      event.preventDefault();void moves.undo();
    };
    window.addEventListener('keydown',undo);
    return()=>window.removeEventListener('keydown',undo);
  },[view,restMode,draft,r.busy,moves]);
  const [islandOpen,setIslandOpen]=useState(false);
  const dockReturn=useRef<HTMLElement|null>(null);
  const navigate=(next:string)=>{
    dockReturn.current=document.activeElement as HTMLElement;
    if(next!=='room'){setExpanded(false);setSelected(null);setDraft(null);setRainOpen(false);setColorDraft(null);setFurnitureColor(null);}
    setView(next);
  };
  useEffect(()=>{const prior=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=prior;};},[]);
  useEffect(()=>{
    if(view==='room')return;
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!e.defaultPrevented&&!document.querySelector('dialog[open]')){setView('room');requestAnimationFrame(()=>dockReturn.current?.focus({preventScroll:true}));}};
    document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);
  },[view]);
  const [accountRecovery,setAccountRecovery]=useState(false);
  useEffect(()=>{
    const url=new URL(window.location.href);
    if(url.searchParams.get('account')){
      setView('profile');
      setAccountRecovery(url.searchParams.get('account')==='recovery');
      url.searchParams.delete('account');
      window.history.replaceState(null,'',url.pathname+url.search+url.hash);
    }
    const subscription=supabase?.auth.onAuthStateChange(event=>{
      if(event==='PASSWORD_RECOVERY'){setAccountRecovery(true);setView('profile');}
    });
    return()=>subscription?.data.subscription.unsubscribe();
  },[]);
  const [period, setPeriod] = useState<StatisticsPeriod>("7");
  const products=useMemo(()=>catalog.filter(p=>category==='Все'||(category==='Избранное'?favorites.includes(p.id):category==='Новинки'?!!p.collection:category==='Игровая коллекция'?p.collection==='gaming'&&(gameFilter==='Все игры'||p.game===gameFilter):p.category===category))
    .filter(p=>[p.name,p.category,p.game??''].join(' ').toLocaleLowerCase('ru').replaceAll('ё','е').includes(search.trim().toLocaleLowerCase('ru').replaceAll('ё','е')))
    .sort((a,b)=>sort==='price'?a.price-b.price:a.name.localeCompare(b.name,'ru')),[category,gameFilter,sort,search,favorites]);
  const ownedCounts = new Map<string,number>();
  for(const owned of r.room.items)ownedCounts.set(owned.productId,(ownedCounts.get(owned.productId)??0)+1);
  const inventoryCategories = [...new Set(r.room.items.map(i => productOf(i).category))].sort((a,b) => a.localeCompare(b,'ru'));
  const inventoryOrder = new Map(r.room.items.map((item,index)=>[item.id,index]));
  const inventoryItems = r.room.items.filter(i => {
    const p = productOf(i);
    return (inventoryStatus==='Все' || (inventoryStatus==='В комнате' ? i.x!==null : i.x===null))
      && (inventoryCategory==='Все категории' || p.category===inventoryCategory)
      && [p.name,p.category,p.game??''].join(' ').toLocaleLowerCase('ru').replaceAll('ё','е').includes(inventorySearch.trim().toLocaleLowerCase('ru').replaceAll('ё','е'));
  }).sort((a,b) => inventorySort==='name' ? productOf(a).name.localeCompare(productOf(b).name,'ru') : inventorySort==='price-asc' ? productOf(a).price-productOf(b).price : inventorySort==='price-desc' ? productOf(b).price-productOf(a).price : inventorySort==='oldest' ? inventoryOrder.get(a.id)!-inventoryOrder.get(b.id)! : inventoryOrder.get(b.id)!-inventoryOrder.get(a.id)!);
  const resetInventoryFilters = () => { setInventorySearch(''); setInventoryStatus('Все'); setInventoryCategory('Все категории'); };
  const item = r.room.items.find((i) => i.id === selected);
  const draftError =
    item && draft
      ? placementError(r.room.items, item, draft.x, draft.y, draft.rotation, draft.parentId ?? null, draft.supportLevel??0)
      : null;
  const onReady = useCallback(() => r.setReady(true), [r.setReady]);
  const selectItem = (id: string) => {
    setExpanded(true);
    setRainOpen(false);
    setColorDraft(null);
    setFurnitureColor(null);
    setSelected(id);
    setDraft(null);
  };
  const edit = (i: Item) => {
    setShowcase(false);
    setRainOpen(false);
    setColorDraft(null);
    setExpanded(true);
    setFurnitureColor(null);
    setSelected(i.id);
    setDraft(initialPlacement(i));
    setView("room");
  };
  const openFurnitureColor = (target: Item) => {
    setExpanded(true);
    setSelected(target.id); setDraft(null); setColorDraft(null); setShowcase(false); setView('room');
    setRainOpen(false);
    setFurnitureColor({id:target.id,color:target.color ?? null});
  };
  const storeItem = async (target: Item) => {
    if (r.busy || target.x === null) return;
    const hasContents = r.room.items.some(i => i.parentId === target.id);
    if (await r.command('remove', {id: target.id})) {
      setDraft(null); setSelected(null); setFurnitureColor(null); setExpanded(false);
      r.setNotice(hasContents ? 'Мебель и вещи на ней убраны в «Мои вещи». Их можно поставить обратно.' : `${productOf(target).name} — в «Моих вещах». Можно поставить обратно в любое время.`);
    }
  };
  const place = async () => {
    if (!item || !draft || draftError) return;
    if (await moves.move({ id: item.id, ...draft })) {
      setDraft(null);
      r.setNotice("Предмет на своём месте");
    }
  };
  const rotateItem = async (id: string, direction: number) => {
    if (r.busy || colorDraft || furnitureColor) return;
    const target = r.room.items.find(i => i.id === id);
    if (!target) return;
    if(productOf(target).surface==='wall')return;
    if (draft && selected === id) {
      setDraft({ ...draft, rotation: (draft.rotation + direction * 90 + 360) % 360 });
      return;
    }
    if(target.x===null || target.y===null)return;
    const rotation = (target.rotation + direction * 90 + 360) % 360;
    const placement = {...initialPlacement(target), rotation};
    const error = placementError(r.room.items, target, placement.x, placement.y, rotation, placement.parentId, placement.supportLevel);
    if (error) { r.setNotice(error + ". Сначала передвиньте предмет на свободное место."); return; }
    if (await moves.move({ id, ...placement })) r.setNotice("Поворот сохранён");
  };
  return (
    <div ref={shell} style={{"--ambient":storm.enabled?"#a99cca":rain.enabled?(season.season==='winter'?"#9fbfc9":"#91a5bd"):lighting.daylight>.8?"#b9bda2":lighting.daylight>.2?"#c49e8e":"#a79cc4"} as React.CSSProperties} className={`app-shell immersive ${restMode?"rest-mode":""}`} data-view={view} data-palette={paletteOpen} data-effects={quietEffects?"quiet":"full"}>
      {restMode && <div className="rest-topbar">
        <div className="rest-atmosphere" role="group" aria-label="Атмосфера в режиме отдыха">
          <button className="button secondary" aria-expanded={rainOpen} aria-controls="rain-settings" onClick={()=>setRainOpen(!rainOpen)}><CloudRain size={16} strokeWidth={1.75}/>Атмосфера</button>
          <Select aria-label="Свет в режиме отдыха" value={lighting.mode} onValueChange={value=>lighting.choose(value as 'auto'|'day'|'evening'|'night')} options={[{value:'auto',label:'Авто'},{value:'day',label:'День'},{value:'evening',label:'Вечер'},{value:'night',label:'Ночь'}]}/>
          <Select aria-label="Сезон в режиме отдыха" value={season.mode} onValueChange={value=>season.choose(value as typeof season.mode)} options={[{value:'auto',label:'Авто · сезон'},...seasons.map(value=>({value,label:seasonNames[value]}))]}/>
          <Select aria-label="Движение персонажа" value={resident.mode} onValueChange={value=>resident.choose(value as typeof resident.mode)} options={[{value:'auto',label:'Житель · сам'},{value:'direct',label:'Идти по клику'},{value:'paused',label:'Житель · пауза'},{value:'hidden',label:'Скрыть жителя'}]}/>
          {!motion.enabled && <button className="button secondary" disabled={motion.reduced} onClick={motion.toggle}>{motion.reduced?'Движение ограничено системой':'Включить движение'}</button>}
        </div>
        <button ref={restExit} className="button secondary rest-exit" onClick={()=>{setRainOpen(false);setRestMode(false);}}><X size={16} strokeWidth={1.75}/>Вернуться <span>· Esc</span></button>
      </div>}
      {restMode && rainOpen && <RainPanel atmosphere={atmosphere} wind={wind} winter={season.season==='winter'} rain={rain} storm={storm} onClose={()=>setRainOpen(false)}/>}
      <a className="skip-link" href="#main-content">К содержимому</a>
      <AppNavigation
        view={view}
        onNavigate={navigate}
        balance={r.room.balance}
        activeMs={r.room.activeMs} running={r.timerRunning}
        status={r.status}
        cloud={!!r.user}
      />
      <div className="immersive-room">

              <div className="page-heading room-heading">
                <div>
                  <span className="room-overline">
                    Твоё личное пространство
                  </span>
                  <h1>{lighting.daylight>=.8?"Тихий день":lighting.daylight<=.2?"Тихая ночь":"Тихий вечер"}</h1>
                  <p>У всего свой ритм. Здесь — твой.</p>
                </div>
                <div className="room-heading-actions"><button ref={restTrigger} className="button secondary" onClick={()=>{setSelected(null);setDraft(null);setExpanded(false);setRainOpen(false);setFurnitureColor(null);setColorDraft(null);setRestMode(true);}}><Moon size={16} strokeWidth={1.75}/>Режим отдыха</button>
                <button
                  className="button secondary"
                  title="Обустроить комнату"
                  onClick={() => setView("inventory")}
                >
                  <Move size={16}  strokeWidth={1.75}/>
                  Обустроить
                </button></div>
                <div className="room-secondary-actions">
                  <button className="palette-trigger button secondary" aria-expanded={paletteOpen} onClick={()=>setPaletteOpen(v=>!v)}><CloudRain size={16}/>Атмосфера</button>
                  {item && !showcase && !colorDraft && !furnitureColor && moves.canUndo && <button className="button secondary undo-move" disabled={r.busy || !!draft} onClick={()=>void moves.undo()} title="Отменить перестановку · Ctrl+Z" aria-keyshortcuts="Control+z Meta+z"><Undo2 size={16}/>Отменить</button>}
                </div>
              </div>
              <div
                className="room-view-switch"
                aria-label="Режим просмотра комнаты"
              >
                <button
                  aria-pressed={!showcase}
                  onClick={() => setShowcase(false)}
                >
                  Моя комната
                </button>
                <button
                  aria-pressed={showcase}
                  onClick={() => {
                    setColorDraft(null);
                    setFurnitureColor(null);
                    setShowcase(true);
                    setDraft(null);
                    setSelected(null);
                  }}
                >
                  Пример интерьера
                </button>
                <span>
                  {showcase
                    ? "Образец обстановки"
                    : "Твоя мебель и расстановка"}
                </span>
              </div>
              <div className="room-layout" inert={view !== "room"}>
                <RoomStage
                  expanded={expanded}
                  onClose={() => { setDraft(null); setSelected(null); setExpanded(false); }}
                  inspector={item && !showcase && !colorDraft && !furnitureColor && <FurnitureInspector
                    key={item.id} item={item} items={r.room.items} draft={draft} error={draftError} busy={r.busy}
                    onDraft={setDraft} onEdit={() => edit(item)} onRotate={direction => rotateItem(item.id,direction)}
                    onColor={() => openFurnitureColor(item)} onToggle={() => { void r.command('toggle',{id:item.id}); }}
                    onRemove={() => { void storeItem(item); }}
                    onPlace={place} onClose={() => { setFurnitureColor(null); setSelected(null); setDraft(null); setExpanded(false); }}/>
                  }
                >
                  <div className="scene-label">
                    <span className="live-dot" />
                    {showcase ? "Вечерняя студия" : "Моё пространство"}
                  </div>
                  <div className="sun-badge lighting-controls" role="group" aria-label="Освещение комнаты">
                    <button className="rain-menu-button" aria-label="Погода и звуки" title="Погода и фоновые звуки" aria-expanded={rainOpen} aria-controls="rain-settings" data-active={rain.enabled||rain.sound||storm.enabled||storm.sound||wind.sound} onClick={e=>{const lights=e.currentTarget.closest(".room-stage")?.querySelector<HTMLDetailsElement>(".accent-settings");if(lights)lights.open=false;setRainOpen(!rainOpen);setColorDraft(null);setFurnitureColor(null);}}>{season.season==='winter'?<Snowflake size={16} strokeWidth={1.75}/>:<CloudRain size={16} strokeWidth={1.75}/>}<span>Погода</span></button>
                    {lighting.daylight>.5?<Sun size={16} strokeWidth={1.75}/>:<Moon size={16} strokeWidth={1.75}/>}
                    <Select aria-label="Режим освещения" variant="quiet"
                      title="Авто: рассвет 06:00–08:00, закат 18:00–20:00 по времени устройства"
                      value={lighting.mode} onValueChange={value => lighting.choose(value as 'auto'|'day'|'evening'|'night')}
                      options={[
                        {value:'auto', label:lighting.mode==='auto' ? `Авто · ${lightingName(lighting.daylight)}` : 'Авто'},
                        {value:'day', label:'День'}, {value:'evening', label:'Вечер'}, {value:'night', label:'Ночь'},
                      ]}/>
                  </div>
                  <RoomCanvas
                    accentLights={accentLights.value}
                    season={season.season}
                    onInteract={id => { void r.command('toggle', {id}); }}
                    residentLook={resident.look}
                    residentScene={resident.scene}
                    residentMode={resident.mode}
                    residentCommand={resident.command}
                    onResidentStatus={resident.setStatus}
                    raining={rain.enabled}
                    snowIntensity={rain.snowIntensity}
                    storming={storm.enabled}
                    lightning={storm.flash}
                    daylight={lighting.daylight}
                    motionEnabled={motion.enabled && !wardrobe}
                    musicPlaying={music.playing}
                    readSpectrum={music.readSpectrum}
                    appearance={showcase ? undefined : colorDraft ?? r.room.appearance}
                    interactionLocked={restMode}
                    onRotate={rotateItem}
                    items={showcase ? showcaseItems : furnitureColor ? r.room.items.map(i=>i.id===furnitureColor.id?{...i,color:furnitureColor.color}:i) : r.room.items}
                    selected={showcase ? null : selected}
                    draft={showcase ? null : draft}
                    editing={!showcase && !!draft}
                    zoom={zoom}
                      readOnly={showcase}
                      disabled={r.busy || !r.loaded || !!colorDraft || !!furnitureColor}
                      onDragMessage={r.setNotice}
                      onDrop={async (id, x, y, rotation, parentId, supportLevel) => {
                        const saved = await moves.move({ id, x, y, rotation, parentId, supportLevel });
                        if (saved) r.setNotice("Новое место сохранено");
                        return saved;
                      }}
                    onSelect={
                      showcase
                        ? () =>
                            r.setNotice(
                              "Это пример интерьера. Мебель доступна в магазине.",
                            )
                        : selectItem
                    }
                    onPlacementPreview={placement => setDraft(placement)}
                    onDeselect={() => setSelected(null)}
                    onReady={onReady}
                  />
                  {!showcase && (
                    <div className="room-tools">
                      <div className="room-tool-group">
                      <label className="season-control room-tool"><span>Сезон</span><Select aria-label="Время года" variant="quiet"
                          title="Авто — по месяцу на устройстве, северное полушарие"
                          disabled={!season.ready} value={season.mode} onValueChange={season.choose}
                          options={[
                            {value:'auto', label:season.ready && season.mode==='auto' ? 'Авто · '+seasonNames[season.season] : 'Авто'},
                            ...seasons.map(value => ({value, label:seasonNames[value]})),
                          ]}/></label>
                      <button className="room-tool" aria-expanded={!!colorDraft} aria-controls="room-colors" disabled={r.busy || !r.loaded}
                        onClick={() => { setRainOpen(false); setFurnitureColor(null); setColorDraft(colorDraft ? null : { ...appearanceOf(r.room.appearance) }); setDraft(null); }}>
                        <Palette size={16}  strokeWidth={1.75}/> Цвета комнаты
                      </button>
                      <details className="accent-settings" onToggle={e=>{if(e.currentTarget.open){setRainOpen(false);setColorDraft(null);setFurnitureColor(null);}}} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();e.currentTarget.open=false;e.currentTarget.querySelector('summary')?.focus();}}}>
                        <summary className="room-tool"><Palette size={16} strokeWidth={1.75}/>Свет и гирлянда</summary>
                        <div className="accent-settings-panel" aria-label="Настройки вечернего света">
                          <div className="light-panel-heading"><strong>Вечерний свет</strong><button type="button" className="icon-button" aria-label="Закрыть настройки света" onClick={e=>{const details=e.currentTarget.closest("details");if(details){details.open=false;details.querySelector("summary")?.focus();}}}><X size={18}/></button></div>
                      <div className="accent-light-controls" role="group" aria-label="Вечернее освещение" title="Настройки света сохраняются на этом устройстве">
                        <button type="button" className="room-tool accent-light-toggle" aria-pressed={accentLights.value.garland} aria-label="Гирлянда" disabled={!accentLights.ready || !accentLights.value.garlandInstalled} onClick={()=>accentLights.toggle('garland')}>
                          <Sparkles size={16} strokeWidth={1.75}/>Гирлянда <span aria-hidden="true">{!accentLights.value.garlandInstalled?'Убрана':accentLights.value.garland?'Вкл':'Выкл'}</span>
                        </button>
                        <button type="button" className="room-tool accent-light-toggle" aria-pressed={accentLights.value.desk} aria-label="Подсветка стола" disabled={!accentLights.ready} onClick={()=>accentLights.toggle('desk')}>
                          <LampDesk size={16} strokeWidth={1.75}/>Подсветка стола <span aria-hidden="true">{accentLights.value.desk?'Вкл':'Выкл'}</span>
                        </button>
                      </div>
                          <p className="light-save-hint">Настройки сохраняются на устройстве</p>
                          {(['garland','desk'] as const).map(source=>{
                            const name=source==='garland'?'Гирлянда':'Подсветка стола';
                            const colorKey=source==='garland'?'garlandColor':'deskColor';
                            const brightnessKey=source==='garland'?'garlandBrightness':'deskBrightness';
                            return <fieldset key={source} disabled={!accentLights.ready}>
                              <legend>{name}</legend>
                              {source==='garland' && <label className="accent-mode">Режим<Select aria-label="Режим гирлянды" disabled={!accentLights.ready}
                                value={accentLights.value.garlandMode ?? 'steady'}
                                onValueChange={value => accentLights.update({garlandMode:value as typeof accentLights.value.garlandMode})}
                                options={[
                                  {value:'steady',label:'Постоянный свет'}, {value:'flow',label:'Переливание цветов'},
                                  {value:'twinkle',label:'Мягкое мерцание'}, {value:'flow-twinkle',label:'Переливание и мерцание'},
                                ]}/><small>{accentLights.value.garlandMode?.includes('flow')?'Цвета сменяются сами · выбранный цвет сохранён для постоянного света.':'Используется выбранный ниже цвет.'} Эффекты работают, когда включена анимация комнаты.</small></label>}
                              <label className="accent-color">Цвет<input type="color" aria-label={name+': цвет'} value={accentLights.value[colorKey]} onChange={e=>accentLights.update({[colorKey]:e.target.value})}/></label>
                              <div className="accent-swatches" role="group" aria-label={name+': готовые цвета'}>
                                {[['Тёплый','#ffbb6b'],['Лаванда','#c4a5ff'],['Розовый','#ff9db8'],['Мятный','#9de4c1'],['Ледяной','#a3d9ff']].map(([label,color])=><button key={color} type="button" aria-label={name+': '+label} aria-pressed={accentLights.value[colorKey]===color} onClick={()=>accentLights.update({[colorKey]:color})}><i style={{background:color}}/></button>)}
                              </div>
                              <label className="accent-brightness">Яркость <output className="tabular-nums">{accentLights.value[brightnessKey]}%</output><input type="range" min="0" max="100" step="1" aria-label={name+': яркость'} value={accentLights.value[brightnessKey]} onChange={e=>accentLights.update({[brightnessKey]:Number(e.target.value)})}/></label>
                              {source==='garland' && <button type="button" className="room-tool accent-install" onClick={()=>accentLights.update({garlandInstalled:!accentLights.value.garlandInstalled})}>{accentLights.value.garlandInstalled?'Убрать гирлянду':'Повесить гирлянду'}</button>}
                            </fieldset>;
                          })}
                        </div>
                      </details>
                      </div>

                    </div>
                  )}
                  {colorDraft && !showcase && (
                    <section className="color-panel" id="room-colors" aria-label="Отделка комнаты" onKeyDown={e => { if(e.key === "Escape") { e.stopPropagation(); setColorDraft(null); } }}>
                      <div className="color-panel-heading"><strong>Твоя палитра</strong><button aria-label="Закрыть выбор цветов" disabled={r.busy} onClick={()=>setColorDraft(null)}><X size={16} strokeWidth={1.75}/></button></div>
                      <div className="palette-presets">
                        {colorPresets.map(preset => <button key={preset.name} disabled={r.busy} aria-label={preset.name} title={preset.name}
                          aria-pressed={Object.keys(preset.colors).every(key => preset.colors[key as keyof Appearance] === colorDraft[key as keyof Appearance])}
                          onClick={()=>setColorDraft({...preset.colors})}>
                          <span style={{background:preset.colors.wallLeft}}/><span style={{background:preset.colors.wallRight}}/><span style={{background:preset.colors.floor}}/>
                        </button>)}
                      </div>
                      <div className="color-fields">
                        {([['wallLeft','Левая стена'],['wallRight','Правая стена'],['floor','Пол']] as const).map(([key,label])=><label key={key}>
                          <input type="color" aria-label={label} value={colorDraft[key]} disabled={r.busy} onInput={e=>setColorDraft({...colorDraft,[key]:e.currentTarget.value})} onChange={e=>setColorDraft({...colorDraft,[key]:e.target.value})}/><span>{label}</span>
                        </label>)}
                      </div>
                      <p>Цвета видны сразу. Сохраните понравившийся вариант.</p>
                      <div className="color-actions"><button className="button primary" disabled={r.busy} onClick={async()=>{
                        if(await r.command('appearance',{appearance:colorDraft})) { setColorDraft(null);r.setNotice('Цвета комнаты сохранены'); }
                      }}>{r.busy ? 'Сохраняется…' : 'Сохранить цвета'}</button><button className="button ghost" disabled={r.busy} onClick={()=>setColorDraft(null)}>Отменить цвета</button></div>
                    </section>
                  )}
                  {furnitureColor && item && !showcase && <FurnitureColorPanel item={item} color={furnitureColor.color} busy={r.busy}
                    onChange={color=>setFurnitureColor({...furnitureColor,color})} onClose={()=>setFurnitureColor(null)}
                    onSave={async()=>{if(await r.command('color',{id:furnitureColor.id,color:furnitureColor.color})){setFurnitureColor(null);r.setNotice('Цвет мебели сохранён');}}}/>}
                  {rainOpen && !restMode && <RainPanel atmosphere={atmosphere} wind={wind} winter={season.season==='winter'} rain={rain} storm={storm} onClose={()=>setRainOpen(false)}/>}
                  <div className="scene-footer">
                    <span>
                      {showcase
                        ? "Пример интерьера — твоя комната сохранена"
                        : draft
                          ? "Зажми предмет и перетащи · Отпусти, чтобы выбрать место"
                            : resident.mode === 'direct' ? 'Клик по полу — идти · По лампе — свет · Тяни предмет, чтобы переместить' : "Тяните мышкой · Правая кнопка — поворот"}
                    </span>
                    <div className="zoom-controls tabular-nums">
                      <button aria-label={motion.reduced ? 'Анимация отключена настройкой уменьшения движения' : motion.enabled ? 'Остановить анимацию' : 'Включить анимацию'}
                        title={motion.reduced ? 'В системе включено уменьшение движения' : motion.enabled ? 'Остановить анимацию' : 'Включить анимацию'}
                        aria-pressed={motion.enabled} disabled={motion.reduced} onClick={motion.toggle}><Sparkles size={16} strokeWidth={1.75}/></button>
                      <button
                        aria-label={
                          expanded ? "Свернуть комнату" : "Развернуть комнату"
                        }
                        onClick={() => { if(expanded) {setDraft(null);setSelected(null);} setExpanded(v => !v); }}
                      >
                        {expanded ? (
                          <Minimize size={16}  strokeWidth={1.75}/>
                        ) : (
                          <Expand size={16}  strokeWidth={1.75}/>
                        )}
                      </button>
                      <button
                        aria-label="Уменьшить"
                        onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
                      >
                        <Minus size={16}  strokeWidth={1.75}/>
                      </button>
                      <span>{Math.round(zoom * 100)}%</span>
                      <button
                        aria-label="Увеличить"
                        onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
                      >
                        <Plus size={16}  strokeWidth={1.75}/>
                      </button>
                    </div>
                  </div>
                </RoomStage>
              </div>
              {!showcase && <ResidentPanel items={r.room.items} mode={resident.mode} status={resident.status}
                onStyle={() => setWardrobe(true)} styleReady={resident.lookReady}
                disabled={r.busy || !r.loaded || !!draft || !!colorDraft || !!furnitureColor}
                motion={motion.enabled} reduced={motion.reduced} onEnableMotion={motion.toggle}
                onMode={resident.choose} onAction={resident.send}/>}
              <SessionStrip
                activeMs={r.room.activeMs}
                activity={r.activity}
                cloud={!!r.user}
                running={r.timerRunning}
                onToggle={r.toggleTimer}
                musicSeconds={music.music.stats.reduce(
                  (a, s) => a + s.seconds,
                  0,
                )}
                onStats={() => setView("stats")}
              />
              <div className="below-room">
                <span>
                  <Leaf size={16}  strokeWidth={1.75}/>
                  Здесь не нужно никуда спешить.
                </span>
                <button
                  className="text-button"
                  onClick={() => {setRestMode(false);setView("music");}}
                >
                  Добавить свою музыку <Plus size={16}  strokeWidth={1.75}/>
                </button>
              </div>
      </div>

      <main id="main-content" tabIndex={-1} className="main pb-32 font-sans" aria-hidden={view === "room"} inert={view === "room"}>
        <div className="page-content">
          {view === 'growth' && <GrowthPanel key={r.user?.id ?? 'guest'} growth={growth} onRoom={() => navigate('room')} onPractice={practiceGrowth}/>}
          {view === "shop" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">ВЕЩИ С ХАРАКТЕРОМ</div>
                  <h1>Чуть больше уюта.</h1>
                  <p>Собери комнату, в которую хочется возвращаться.</p>
                </div>
                <button type="button" className="shop-favorites-entry" aria-pressed={category==='Избранное'} onClick={()=>setCategory(category==='Избранное'?'Все':'Избранное')}>
                  <span className="shop-favorites-icon"><Heart size={20} strokeWidth={1.75} fill={category==='Избранное'?'currentColor':'none'}/></span>
                  <span className="shop-favorites-copy"><strong>Избранное</strong><small>Сохранено на потом</small></span>
                  <span className="shop-favorites-count tabular-nums">{favorites.length}</span>
                </button>
              </div>
              <div className="shop-search-row">
                <div className="shop-search"><Search size={18} aria-hidden="true"/><input type="search" aria-label="Поиск мебели" placeholder="Найти вещь для комнаты…" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button type="button" aria-label="Очистить поиск" onClick={()=>setSearch('')}><X size={16}/></button>}</div>

              </div>
              <div className="filter-row">
                <div className="tabs">
                  {[
                    "Все",
                    "Новинки",
                    "Игровая коллекция",
                    "Мебель",
                    "Растения",
                    "Свет",
                    "Текстиль",
                    "Декор",
                  ].map((c) => (
                    <button
                      className={category === c ? "selected" : ""}
                      key={c}
                      aria-pressed={category===c}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="shop-sort-row">                <Select aria-label="Сортировка товаров" value={sort} onValueChange={setSort}
                  options={[{value:'price',label:'Сначала дешевле'},{value:'name',label:'По названию'}]}/><span className="search-count tabular-nums" role="status">Найдено: {products.length}</span></div>
              </div>
              {category==='Игровая коллекция' && <section className="gaming-filter" aria-label="Игровая коллекция">
                <div><strong>Любимые миры, своя комната.</strong><p>Фигурки — на полки и столики. Постеры — на стену.</p></div>
                <div className="tabs" aria-label="Фильтр по игре">{['Все игры',...games].map(game=><button key={game} className={gameFilter===game?'selected':''} aria-pressed={gameFilter===game} onClick={()=>setGameFilter(game)}>{game}</button>)}</div>
              </section>}
              {products.length===0&&<div className="search-empty"><Search size={24} aria-hidden="true"/><h2>{category==='Избранное' && !favorites.length?'Здесь будут любимые вещи':'Пока ничего не нашлось'}</h2><p>{category==='Избранное' && !favorites.length?'Нажми на сердечко у вещи в магазине — она появится здесь.':'Попробуй другое название или сбрось фильтры.'}</p><button className="button secondary" onClick={()=>{setSearch('');setCategory('Все');setGameFilter('Все игры');}}>Показать все вещи</button></div>}
              <div className="product-grid">
                {products.map((p) => (
                    <article className="product-card" key={p.id}>
                      <div className="product-image">
                        <button type="button" className="favorite-toggle" aria-label={`${favorites.includes(p.id)?'Убрать из избранного':'В избранное'}: ${p.name}`} aria-pressed={favorites.includes(p.id)} disabled={!favoritesReady} onClick={()=>toggleFavorite(p.id)}><Heart size={18} strokeWidth={1.75} fill={favorites.includes(p.id)?'currentColor':'none'}/></button>
                        {(p.kind==='collectible'||!!posterArt[p.id])?<button className="collectible-preview-button" aria-label={`Рассмотреть ${p.name}`} aria-haspopup="dialog" onClick={()=>setInspect({product:p})}><FurniturePreview product={p}/><span className="collectible-preview-hint">Рассмотреть</span></button>:<FurniturePreview product={p} />}
                        <span className="size-badge tabular-nums">
                          {p.w} × {p.h}
                        </span>
                      </div>
                      <small>{p.category}{p.game ? ` · ${p.game}` : p.collection ? " · Новинка" : ""}</small>
                      <h3>{p.name}</h3>
                      <small className="owned-count tabular-nums">У тебя: {ownedCounts.get(p.id)??0}</small>
                      <div className="product-bottom tabular-nums">
                        <span>
                          <Coins size={16}  strokeWidth={1.75}/>
                          {p.price}
                        </span>
                        <button
                          className="button small primary"
                          aria-label={r.room.balance<p.price?`${p.name}: не хватает ${p.price-r.room.balance} монет`:`${ownedCounts.has(p.id)?"Купить ещё":"Купить"} ${p.name} за ${p.price} монет`}
                          disabled={r.busy || r.room.balance < p.price}
                          onClick={async () => {
                            if (
                              await r.command("purchase", {
                                productId: p.id,
                                price: p.price,
                              })
                            )
                              notifications.notify({ kind: "purchase", title: "Новая вещь для комнаты", message: `${p.name} — теперь в твоём инвентаре` });
                          }}
                        >
                          {r.room.balance < p.price ? "Накопить" : ownedCounts.has(p.id) ? "Купить ещё" : "Купить"}
                          <Plus size={16}  strokeWidth={1.75}/>
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
            </>
          )}
          {view === "inventory" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">ВСЁ, ЧТО ТЫ ВЫБРАЛ</div>
                  <h1>Мои вещи.</h1>
                  <p>Расставляй, меняй местами, пробуй по-новому.</p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => {
                    setCategory("Все");
                    setView("shop");
                  }}
                >
                  <Plus size={16}  strokeWidth={1.75}/>В магазин
                </button>
              </div>
              <section className="inventory-toolbar" aria-label="Поиск и фильтры моих вещей">
              <div className="shop-search-row">
                <div className="shop-search"><Search size={16} strokeWidth={1.75} aria-hidden="true"/><input type="search" aria-label="Поиск в моих вещах" placeholder="Найти среди своих вещей…" value={inventorySearch} onChange={e=>setInventorySearch(e.target.value)}/>{inventorySearch && <button type="button" aria-label="Очистить поиск в моих вещах" onClick={()=>setInventorySearch('')}><X size={16} strokeWidth={1.75}/></button>}</div>
                <span className="search-count tabular-nums" role="status">Найдено: {inventoryItems.length} из {r.room.items.length}</span>
              </div>
              <div className="inventory-filter-row">
                <div className="tabs" role="group" aria-label="Где находятся вещи">{['Все','В комнате','В инвентаре'].map(status=><button key={status} className={inventoryStatus===status?'selected':''} aria-pressed={inventoryStatus===status} onClick={()=>setInventoryStatus(status)}>{status}</button>)}</div>
                <div className="inventory-selects"><Select aria-label="Категория моих вещей" value={inventoryCategory} onValueChange={setInventoryCategory} options={['Все категории',...inventoryCategories].map(value=>({value,label:value}))}/>
                <Select aria-label="Порядок моих вещей" value={inventorySort} onValueChange={setInventorySort} options={[{value:'newest',label:'Сначала новые'},{value:'oldest',label:'Сначала старые'},{value:'name',label:'По названию'},{value:'price-asc',label:'Сначала дешевле'},{value:'price-desc',label:'Сначала дороже'}]}/></div>
                {(inventorySearch || inventoryStatus!=='Все' || inventoryCategory!=='Все категории') && <button className="button secondary" onClick={resetInventoryFilters}>Сбросить фильтры</button>}
              </div>
              </section>
              {inventoryItems.length===0 && <div className="search-empty"><Search size={24} aria-hidden="true"/><h2>Подходящих вещей пока нет</h2><p>Попробуй другое название, категорию или место хранения.</p><button className="button secondary" onClick={resetInventoryFilters}>Показать все вещи</button></div>}
              <div className="product-grid">
                {inventoryItems.map((i) => (
                  <article className="product-card" key={i.id}>
                    <div className="product-image">
                      {(productOf(i).kind==='collectible'||!!posterArt[i.productId])?<button className="collectible-preview-button" aria-label={`Рассмотреть ${productOf(i).name}`} aria-haspopup="dialog" onClick={()=>setInspect({product:productOf(i),color:i.color})}><FurniturePreview product={productOf(i)} color={i.color}/><span className="collectible-preview-hint">Рассмотреть</span></button>:<FurniturePreview product={productOf(i)} color={i.color} />}
                      <span>{i.x === null ? "В инвентаре" : "В комнате"}</span>
                    </div>
                    <small>{i.parentId ? `На мебели: ${r.room.items.find(p=>p.id===i.parentId)?productOf(r.room.items.find(p=>p.id===i.parentId)!).name:'поверхность'}` : productOf(i).category}</small>
                    <h3>{productOf(i).name}</h3>
                    <button className="button secondary full" aria-label={`Цвет: ${productOf(i).name}`} disabled={r.busy} onClick={()=>openFurnitureColor(i)}><Palette size={16} strokeWidth={1.75}/>Цвет</button>
                    <button
                      className="button secondary full"
                      disabled={r.busy}
                      onClick={() => edit(i)}
                    >
                      <Move size={16}  strokeWidth={1.75}/>
                      {i.x === null ? "Поставить в комнату" : "Переставить"}
                    </button>
                    {i.x !== null && <button className="button secondary full" disabled={r.busy} onClick={()=>{void storeItem(i);}}>Убрать в мои вещи</button>}
                  </article>
                ))}
              </div>
            </>
          )}
          {view === "music" && <MusicLibrary music={music} />}
          {view === "stats" && <MusicStatistics music={music.music} period={period} onPeriod={setPeriod}
            playing={music.playing} currentId={music.current.id} onPlay={music.play} onBrowse={() => setView("music")} />}
          {view === "profile" && <>
            <div className="page-heading"><div><div className="eyebrow">ЛИЧНОЕ ПРОСТРАНСТВО</div><h1>{r.user?'Мой профиль.':'Добро пожаловать.'}</h1><p>Пусть твоя комната всегда будет рядом.</p></div></div>
            {!r.loaded ? <p role="status">Открываем профиль…</p> : <AccountPanel key={`${r.user?.id??'guest'}:${accountRecovery}`} user={r.user} recovery={accountRecovery} onRecovered={()=>setAccountRecovery(false)} balance={r.room.balance} items={r.room.items.length} activeMs={r.room.activeMs}/>}
          </>}
          {view === "settings" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">ТАК, КАК ТЕБЕ УДОБНО</div>
                  <h1>Настройки.</h1>
                  <p>Твоё пространство, твои привычки.</p>
                </div>
              </div>
              <div className="settings-grid">
                <ThemeSelector />
                <section className="settings-card">
                  <Cloud size={16} strokeWidth={1.75}/>
                  <h2>Твой аккаунт</h2>
                  <p>{r.user?'Имя, аватар и облачная комната — в твоём профиле.':'Зарегистрируйся, чтобы сохранять комнату и покупки между устройствами.'}</p>
                  <button className="button primary" onClick={()=>setView('profile')}>{r.user?'Открыть профиль':'Вход и регистрация'}</button>
                </section>
                <section className="settings-card">
                  <Volume2 size={16}  strokeWidth={1.75}/>
                  <h2>Музыка и спокойствие</h2>
                  <button className="button secondary" onClick={()=>{setView("room");setRainOpen(true);}}>Погода и фоновые звуки</button>
                  <label className="volume-setting tabular-nums">
                    Громкость{" "}
                    <strong>{Math.round(music.music.volume * 100)}%</strong>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step=".01"
                      value={music.music.volume}
            style={{background: `linear-gradient(to right, var(--color-accent) ${music.music.volume * 100}%, var(--border-control) 0)`}}
                      onChange={(e) => music.setVolume(Number(e.target.value))}
                    />
                  </label>
                  <p>
                    Анимации учитывают настройку уменьшения движения на твоём
                    устройстве.
                  </p>
                  <p className="footnote">
                    Рабочая версия · {packageInfo.version}
                    <br />
                    Комната и экономика — облако после входа.
                    <br />
                    Музыка и плейлисты — облако после входа. Статистика — на
                    этом устройстве.
                  </p>
                </section>
                <section className="settings-card notification-sound-settings">
                  <Coins size={16} strokeWidth={1.75} aria-hidden="true" />
                  <h2>Звуки уведомлений</h2>
                  <p id="notification-sounds-description">Оставьте звук покупки, а монеты получайте в тишине. Музыка, дождь и гром настраиваются отдельно.</p>
                  <button className="sound-setting-toggle" role="switch" aria-checked={notificationSound.enabled}
                    aria-label="Звуки уведомлений" aria-describedby="notification-sounds-description" onClick={notificationSound.toggle}>
                    <span>{notificationSound.enabled ? "Звуки включены" : "Звуки выключены"}</span>
                    <span className="sound-switch-track" aria-hidden="true"><i /></span>
                  </button>
                  <div className="sound-channel-list">
                    {([
                      { kind: "purchase", label: "Покупки", description: "Тихий аккорд после покупки мебели" },
                      { kind: "coins", label: "Начисление монет", description: "Звон за активную минуту · можно отключить для работы" },
                    ] as const).map(({ kind, label, description }) => (
                      <div className="sound-channel-row" key={kind}>
                        <button className="sound-setting-toggle" role="switch" aria-checked={notificationSound.channels[kind]}
                          aria-label={`Звук: ${label}`} aria-describedby={`sound-${kind}-description`}
                          disabled={!notificationSound.enabled} onClick={() => notificationSound.toggleKind(kind)}>
                          <span className="sound-channel-copy"><strong>{label}</strong>
                            <span id={`sound-${kind}-description`}>{description}</span>
                            <small>{notificationSound.enabled && notificationSound.channels[kind] ? "Со звуком" : "Без звука"}</small>
                          </span>
                          <span className="sound-switch-track" aria-hidden="true"><i /></span>
                        </button>
                        <button className="button secondary small sound-channel-preview" aria-label={`Послушать: ${label}`}
                          disabled={!notificationSound.enabled || !notificationSound.channels[kind]} onClick={() => void notificationSound.preview(kind)}>
                          <Play size={16} strokeWidth={1.75} aria-hidden="true" /><span>Пример</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  <small className="sound-setting-note">Уведомления остаются на экране даже без звука. Выбор сохраняется на этом устройстве.</small>
                  {notificationSound.message && <p role="status">{notificationSound.message}</p>}
                </section>
              </div>
            </>
          )}
        </div>
      </main>
      <footer ref={restPlayer} className="player" data-expanded={islandOpen}
        onFocusCapture={e=>{if(!(e.target as HTMLElement).closest('.play-button,.island-toggle'))setIslandOpen(true);}}
        onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setIslandOpen(false);}}
        onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setIslandOpen(false);}}}>
        <button className="island-toggle" aria-label="Развернуть плеер" aria-expanded={islandOpen} onClick={()=>setIslandOpen(v=>!v)}><span>•••</span></button>
        <button
          className={`album-art ${music.playing ? "is-playing" : ""}`}
          aria-label="Открыть музыку"
          onClick={() => {setRestMode(false);setView("music");}}
        >
          <div className="record-disc" />
        </button>
        <div className="player-track">
          <strong>{music.current?.title ?? "Выбери музыку"}</strong>
          <span>
            {music.current?.builtin
              ? "tiny me · спокойная мелодия"
              : "Моя коллекция"}
          </span>
        </div>
        <div className="player-center">
          <div className="transport">
            <button
              aria-label="Случайный порядок"
              aria-pressed={music.music.shuffle}
              className={music.music.shuffle ? "enabled" : ""}
              onClick={() =>
                music.setMusic((s) => ({ ...s, shuffle: !s.shuffle }))
              }
            >
              <Shuffle size={20}  strokeWidth={1.75}/>
            </button>
            <button aria-label="Предыдущий трек" onClick={() => music.next(-1)}>
              <SkipBack size={20}  strokeWidth={1.75}/>
            </button>
            <button
              className="play-button"
              aria-label={music.playing ? "Пауза" : "Воспроизвести"}
              onClick={() => music.play()}
            >
              {music.playing ? (
                <Pause size={20}  strokeWidth={1.75}/>
              ) : (
                <Play size={20}  strokeWidth={1.75}/>
              )}
            </button>
            <button aria-label="Следующий трек" onClick={() => music.next()}>
              <SkipForward size={20}  strokeWidth={1.75}/>
            </button>
            <button
              aria-label={`Повтор: ${music.music.repeat}`}
              className={music.music.repeat !== "off" ? "enabled" : ""}
              onClick={() =>
                music.setMusic((s) => ({
                  ...s,
                  repeat:
                    s.repeat === "all"
                      ? "one"
                      : s.repeat === "one"
                        ? "off"
                        : "all",
                }))
              }
            >
              <Repeat size={20}  strokeWidth={1.75}/>
              {music.music.repeat === "one" && <small>1</small>}
            </button>
          </div>
          <div className="seek-row tabular-nums">
            <span>{mm(music.position)}</span>
            <div className="seek-track" key={music.current?.id} data-playing={music.playing}>
              <span className="seek-progress" aria-hidden="true" style={{width:`${Math.min(100, Math.max(0, music.position / (music.current?.duration || 1) * 100))}%`}}/>
            <input
              aria-label="Позиция воспроизведения"
              type="range"
              min="0"
              max={music.current?.duration ?? 1}
              step=".1"
              value={music.position}
              style={{background: `linear-gradient(to right, var(--color-accent) ${Math.min(100, Math.max(0, music.position / (music.current?.duration || 1) * 100))}%, var(--border-control) 0)`}}
              onChange={(e) => music.seek(Number(e.target.value))}
            />
            </div>
            <span>{mm(music.current?.duration ?? 0)}</span>
          </div>
        </div>
        {restMode && <button className="rest-volume-trigger" aria-label="Громкость музыки" aria-expanded={restVolumeOpen} aria-controls="player-volume-controls" onClick={()=>setRestVolumeOpen(!restVolumeOpen)}><Volume2 size={18} strokeWidth={1.75}/></button>}
        <div id="player-volume-controls" className="player-volume" data-open={restVolumeOpen} onKeyDown={e=>{if(restMode && e.key==='Escape'){e.stopPropagation();setRestVolumeOpen(false);document.querySelector<HTMLButtonElement>('.rest-volume-trigger')?.focus();}}}>
          {restMode && <span className="rest-volume-label">Громкость</span>}
          <button
            aria-label={music.music.volume ? "Выключить звук музыки" : "Включить звук музыки"}
            onClick={() => music.setVolume(music.music.volume ? 0 : lastMusicVolume.current)}
          >
            {music.music.volume ? <Volume2 size={20} strokeWidth={1.75}/> : <VolumeX size={20} strokeWidth={1.75}/>}
          </button>
          <input
            aria-label="Громкость"
            type="range"
            min="0"
            max="1"
            step=".01"
            value={music.music.volume}
            style={{background: `linear-gradient(to right, var(--color-accent) ${music.music.volume * 100}%, var(--border-control) 0)`}}
            onChange={(e) => music.setVolume(Number(e.target.value))}
          />
          {restMode && <output className="rest-volume-value tabular-nums">{Math.round(music.music.volume*100)}%</output>}
          <button
            className="icon-button"
            aria-label="Открыть плейлист"
            onClick={() => {setRestMode(false);setView("music");}}
          >
            <Music2 size={20}  strokeWidth={1.75}/>
          </button>
        </div>
      </footer>
      <NotificationCenter notifications={notifications.notifications} onRemove={notifications.remove} />
      {inspect&&<CollectibleViewer product={inspect.product} color={inspect.color} onClose={()=>setInspect(null)}/>}
      {wardrobe&&resident.lookReady&&<ResidentWardrobe key={r.user?.id??'guest'} look={resident.look} onClose={()=>setWardrobe(false)} onSave={look=>{
        const saved=resident.saveLook(look);setWardrobe(false);
        r.setNotice(saved?'Новый образ сохранён':'Образ применён на эту сессию. Браузер не разрешил сохранить его на устройстве.');
      }}/>}
    </div>
  );
}


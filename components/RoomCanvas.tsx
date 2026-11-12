"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Application, Container, Sprite, Texture } from "pixi.js";
import { type Item, type Placement, placementError, canPlaceOnTop, productOf, resolveItems, dimensions } from "@/domain/model";
import { tabletopDrop } from '@/engine/tabletop-drop';
import { dragPlacement, initialPlacement } from "@/domain/drag";
import { SCENE, renderRoom, unproject, project, type Hit } from "@/engine/isometric";

import { advanceMotion, canAnimate, type RoomMotion } from "@/domain/motion";
import type { Appearance } from "@/domain/appearance";
import { lightningIntensity, type Lightning } from '@/domain/storm';
import {subscribePosterArt} from '@/engine/poster-assets';
import { advanceResident, commandResident, commandSkillResident, syncResidentSkills, createResident, reconcileResident, residentStatus, type ResidentCommand, type ResidentMode } from '@/domain/resident';
import type { SkillActivity, SkillReward } from '@/domain/skill-growth';
import type { ResidentScene } from '@/lib/use-room-resident';
import type { ResidentLook } from '@/domain/resident-look';
import type { AccentLights } from '@/domain/accent-lights';
import { createLightTransition, advanceLightTransition, easeValue } from '@/domain/light-transition';
import { garlandTarget } from '@/domain/garland-mode';
import { frameDue } from '@/domain/frame-clock';
import { accumulateSnow } from '@/domain/snow';
import {SPECTRUM_BANDS,spectrumPeaks} from '@/domain/live-details';
import type { Season } from '@/domain/season';
type Props = {
  skillActivities?: SkillActivity[];
  skillRewards?: SkillReward[];
  onReward?: (id: string) => void;
  demoSky?: 'morning'|'evening'|'night';
  interactionLocked?: boolean;
  season: Season;
  snowIntensity:number;
  accentLights: AccentLights;
  residentLook: ResidentLook;
  residentScene: RefObject<ResidentScene>;
  residentMode: ResidentMode;
  residentCommand: ResidentCommand | null;
  onResidentStatus: (status: string) => void;
  storming: boolean;
  lightning: Lightning | null;
  raining: boolean;
  daylight: number;
  motionEnabled: boolean;
  musicPlaying: boolean;
  readSpectrum: (deltaMs:number) => Float32Array;
  appearance?: Appearance;
  onRotate: (id: string, direction: number) => void;
  onInteract: (id: string) => void;
  items: Item[];
  selected: string | null;
  draft: Placement | null;
  editing: boolean;
  zoom: number;
  readOnly: boolean;
  disabled: boolean;
  onDrop: (id: string, x: number, y: number, rotation: number, parentId:string|null, supportLevel:number) => Promise<boolean>;
  onDragMessage: (message: string) => void;
  onPlacementPreview: (placement:Placement) => void;
  onDeselect: () => void;
  onSelect: (id: string) => void;
  onReady: () => void;
};
export default function RoomCanvas(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(props);
  latest.current = props;
  const settledSnow=useRef(.2);
  const api = useRef<{
    app: Application;
    scene: Container;
    sprite: Sprite;
    canvas: HTMLCanvasElement;
    hits: Hit[];
    resize: () => void;
    paint: () => void;
    syncMotion: () => void;
  } | null>(null);
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(()=>subscribePosterArt(()=>api.current?.paint()),[]);
  useEffect(() => {
    let disposed = false;
    const app = new Application();
    let obs: ResizeObserver | undefined;
    let cleanup = () => {};
    (async () => {
      await app.init({
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        preference: "webgl",
      });
      if (disposed) {
        app.destroy(true);
        return;
      }
      const el = host.current;
      if (!el) {
        app.destroy(true);
        return;
      }
      el.appendChild(app.canvas);
      app.canvas.setAttribute("aria-hidden", "true");
      const scene = new Container(),
        canvas = document.createElement("canvas");
      const renderScale=Math.max(1,Math.min(2,Math.ceil(el.clientWidth / SCENE.width * Math.min(window.devicePixelRatio || 1,2) * 1.5 * 4)/4));
      renderRoom(canvas, latest.current.items, null, false, false, latest.current.appearance, undefined, latest.current.daylight, latest.current.raining, latest.current.storming, 0, 0, undefined, undefined, latest.current.accentLights, renderScale, latest.current.season, latest.current.snowIntensity, .2, latest.current.demoSky);
      const texture = Texture.from(canvas),
        sprite = new Sprite(texture);
      sprite.width = SCENE.width;
      sprite.height = SCENE.height;
      scene.addChild(sprite);
      app.stage.addChild(scene);
      const hitContext = document.createElement("canvas").getContext("2d")!;
      type Drag = { item: Item; pointer: number; start: readonly [number, number]; client: [number, number]; preview: Placement; grab:[number,number]; worldRotation:number; moved: boolean; saving: boolean; draftMode:boolean };
      let drag: Drag | null = null, frame = 0;
      let light = latest.current.daylight;
      let accent = createLightTransition(latest.current.accentLights);
      let motion: RoomMotion = { time:0,recordAngle:0 }, lastSpectrumAt=performance.now();
      const peaks=new Float32Array(SPECTRUM_BANDS), peakHolds=new Float32Array(SPECTRUM_BANDS);
      const targetFrameInterval=1000/60;
      let animationFrame=0, lastFrame=0, nextFrame=0, inView=false;
      let lastResidentStatus = '';
      const syncResident = () => {
        const current = latest.current, state = current.residentScene.current;
        if (current.readOnly) return;
        const geometry = current.items.filter(i => i.x !== null && i.y !== null && !i.parentId && productOf(i).surface === 'floor')
          .map(i => [i.id,i.productId,i.x,i.y,i.rotation].join(':')).join('|');
        if (!state.body) state.body = createResident(current.items);
        else if (state.geometry !== geometry) state.body = reconcileResident(state.body, current.items);
        state.geometry = geometry;
        if (current.skillActivities) state.body = syncResidentSkills(state.body, current.skillActivities, current.items);
        if (!current.motionEnabled && current.residentMode==='auto' && !state.body.activity && current.skillActivities?.length)
          state.body = commandSkillResident(state.body,current.items,current.skillActivities[0],true) ?? state.body;
        if (current.residentCommand && state.commandKey !== current.residentCommand.key) {
          state.commandKey = current.residentCommand.key;
          if (!current.editing && (current.residentMode === 'direct' || (current.residentMode==='auto' && current.residentCommand.skillId)) && (current.motionEnabled || current.residentCommand.skillId)) {
            const skill = current.skillActivities?.find(a => a.skillId === current.residentCommand!.skillId);
            const plan = skill ? commandSkillResident(state.body, current.items, skill, !current.motionEnabled) : current.motionEnabled ? commandResident(state.body, current.items, current.residentCommand) : null;
            if (plan) state.body = plan;
            else current.onDragMessage('Житель не может пройти. Освободи проход к предмету.');
          }
        }
        const status = residentStatus(state.body);
        if (lastResidentStatus !== status) { lastResidentStatus = status; current.onResidentStatus(status); }
      };
      // Saving locks input, not the room clock. A press is not yet a drag.
      const shouldAnimate=()=>canAnimate(latest.current.motionEnabled,document.hidden,inView,latest.current.editing || !!drag?.moved);
      const animate=(now:number)=>{
        animationFrame=0;
        if(disposed || !shouldAnimate()) {lastFrame=0;nextFrame=0;return;}
        const delta=lastFrame ? now-lastFrame : 0;
        const cadence=frameDue(now,nextFrame,targetFrameInterval);
        if(cadence.due) {
          nextFrame=cadence.next;
          motion=advanceMotion(motion,delta,latest.current.musicPlaying);
          syncResident();
          const current = latest.current, state = current.residentScene.current;
          if (state.body && !current.readOnly && (current.residentMode === 'auto' || current.residentMode === 'direct'))
            state.body = advanceResident(state.body, delta, current.items, current.residentMode === 'auto', current.skillActivities);
          settledSnow.current=current.season==='winter'?accumulateSnow(settledSnow.current,delta,current.snowIntensity,current.raining):.2;
          light = easeValue(light, current.daylight, Math.min(delta,100), 240);
          accent = advanceLightTransition(accent, garlandTarget(current.accentLights, motion.time), Math.min(delta,100));
          lastFrame=now;
          paint();
        }
        animationFrame=requestAnimationFrame(animate);
      };
      const syncMotion=()=>{
        if(!shouldAnimate()) {cancelAnimationFrame(animationFrame);animationFrame=0;lastFrame=0;nextFrame=0;}
        else if(!animationFrame) animationFrame=requestAnimationFrame(animate);
      };
      const intersection=new IntersectionObserver(entries=>{inView=entries[0]?.isIntersecting??false;syncMotion();});
      intersection.observe(el);
      const point = (e: PointerEvent) => {
        const rect = app.canvas.getBoundingClientRect();
        return { x: ((e.clientX - rect.left) * app.screen.width / rect.width - scene.x) / scene.scale.x,
          y: ((e.clientY - rect.top) * app.screen.height / rect.height - scene.y) / scene.scale.y };
      };
      const paint = () => {
        const current = latest.current;
        syncResident();
        if(!shouldAnimate()) {light=current.daylight;accent=createLightTransition(current.accentLights);}
        const preview = drag?.moved ? drag.preview : current.draft;
        const selected = drag ? drag.item.id : current.selected;
        const items = current.items.map(item => item.id === selected && preview ? { ...item, ...preview } : item);
        const rawItem = items.find(i => i.id === selected);
        const item = rawItem && !preview && productOf(rawItem).surface==='wall' ? {...rawItem,...initialPlacement(rawItem)} : rawItem;
        const invalid = !!(item && item.x !== null && item.y !== null && placementError(current.items, item, item.x, item.y, item.rotation));
        const flash=shouldAnimate()?lightningIntensity(current.lightning,performance.now()):0;
        const resident = !current.readOnly && current.residentMode !== 'hidden' ? current.residentScene.current.body ?? undefined : undefined;
        motion.wallTime=Date.now();
        const spectrumAt=performance.now();
        motion.spectrum=current.motionEnabled && !current.editing ? current.readSpectrum(spectrumAt-lastSpectrumAt) : undefined;
        motion.spectrumPeaks=motion.spectrum ? spectrumPeaks(peaks,peakHolds,motion.spectrum,spectrumAt-lastSpectrumAt) : undefined;
        lastSpectrumAt=spectrumAt;
        if (api.current) api.current.hits = renderRoom(canvas, items, selected, current.editing || !!drag?.moved, invalid, current.appearance, motion, light, current.raining, current.storming, flash, current.lightning?.seed, resident, current.residentLook, accent.frame, renderScale, current.season, current.snowIntensity, settledSnow.current, current.demoSky, current.readOnly ? [] : current.skillRewards);
        texture.source.update();
        app.render();
      };
      const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; paint(); }); };
      const release = (id: number) => { if (app.canvas.hasPointerCapture(id)) app.canvas.releasePointerCapture(id); };
      const cancel = () => {
        if (!drag || drag.saving) return;
        const id = drag.pointer;
        drag = null;
        release(id);
        app.canvas.style.cursor = "grab";
        schedule();
        syncMotion();
      };
      const down = (e: PointerEvent) => {
        const current = latest.current;
        if (e.button !== 0 || !e.isPrimary || drag || current.disabled) return;
        const pt = point(e);
        const hit = [...(api.current?.hits ?? [])].reverse().find(h => hitContext.isPointInPath(h.path, pt.x, pt.y));
        if (hit?.id.startsWith('skill-reward:')) {
          if(!current.interactionLocked)current.onReward?.(hit.id.slice('skill-reward:'.length));
          return;
        }
        if (!hit && !current.readOnly && !current.editing && current.residentMode === 'direct') {
          if (!current.motionEnabled) { current.onDragMessage('Включи анимацию комнаты, чтобы направлять жителя.'); return; }
          syncResident();
          const state = current.residentScene.current;
          if (!state.body) return;
          const [x, y] = unproject(pt.x, pt.y);
          if (x < 0 || y < 0 || x >= 24 || y >= 16) return;
          const plan = commandResident(state.body, current.items, { cell: { x: Math.floor(x) + .5, y: Math.floor(y) + .5 } });
          if (plan) state.body = plan;
          else current.onDragMessage('Сюда не пройти. Выбери свободное место на полу.');
          schedule(); syncMotion(); return;
        }
        if (current.interactionLocked) return;
        if (hit && (!current.editing || hit.id===current.selected)) {
          const saved = current.items.find(i => i.id === hit.id);
          const item = saved && {...saved,...(current.draft && saved.id===current.selected ? current.draft : initialPlacement(saved))};
          if (!current.readOnly && item && item.x !== null && item.y !== null) {
            const previewItems=current.items.map(i=>i.id===item.id?item:i);
            const world=resolveItems(previewItems).find(i=>i.id===item.id)!,d=dimensions(productOf(world),world.rotation);
            const center=project(world.x!+d.w/2,world.y!+d.h/2,world.elevation);
            drag = { item, pointer: e.pointerId, start: unproject(pt.x, pt.y), client: [e.clientX, e.clientY], preview: { x: item.x, y: item.y, rotation: item.rotation, parentId:item.parentId??null, supportLevel:item.supportLevel??0 }, grab:[pt.x-center[0],pt.y-center[1]],worldRotation:world.rotation,moved: false, saving: false,draftMode:!!current.draft };
            syncMotion();
            app.canvas.setPointerCapture(e.pointerId);
            schedule();
            e.preventDefault();
          } else current.onSelect(hit.id);
          return;
        }
        // Empty-space clicks never move a draft; placement starts on the object itself.
        if (current.readOnly || current.editing) return;
        const [x, y] = unproject(pt.x, pt.y);
        if (x >= 0 && x < 24 && y >= 0 && y < 16) current.onDeselect();
      };
      const move = (e: PointerEvent) => {
        const pt = point(e);
        if (drag) {
          if (drag.pointer !== e.pointerId || drag.saving) return;
          if (!drag.moved && Math.hypot(e.clientX - drag.client[0], e.clientY - drag.client[1]) < 5) return;
          const preview:Placement = canPlaceOnTop(productOf(drag.item))
            ? tabletopDrop(latest.current.items,drag.item,pt.x-drag.grab[0],pt.y-drag.grab[1],drag.worldRotation)
            : {...dragPlacement(drag.item, drag.start, unproject(pt.x, pt.y), productOf(drag.item).surface === "wall"),parentId:null};
          preview.supportLevel=preview.supportLevel??0;
          const changed = !drag.moved || preview.x !== drag.preview.x || preview.y !== drag.preview.y || preview.parentId!==drag.preview.parentId || preview.rotation!==drag.preview.rotation || preview.supportLevel!==drag.preview.supportLevel;
          drag.moved = true;
          syncMotion();
          drag.preview = preview;
          app.canvas.style.cursor = "grabbing";
          if (changed) schedule();
        } else {
          const hit = api.current?.hits.some(h => hitContext.isPointInPath(h.path, pt.x, pt.y));
          app.canvas.style.cursor = latest.current.disabled ? "wait" : latest.current.residentMode === 'direct' && !latest.current.readOnly && !latest.current.editing ? 'pointer' : hit ? latest.current.readOnly ? "pointer" : "grab" : "default";
        }
      };
      const up = async (e: PointerEvent) => {
        if (!drag || drag.pointer !== e.pointerId || drag.saving) return;
        move(e);
        const pending = drag;
        const { x, y, rotation, parentId=null, supportLevel=0 } = pending.preview;
        if(pending.draftMode) {
          const preview={...pending.preview};
          cancel();
          if(pending.moved)latest.current.onPlacementPreview(preview);
          return;
        }
        // Open the inspector only after releasing the pointer: resizing the scene
        // during a drag would change its coordinate transform under the cursor.
        if (!pending.moved && !latest.current.editing && ['lamp','record'].includes(productOf(pending.item).kind)) {
          cancel(); latest.current.onInteract(pending.item.id); return;
        }
        if (!pending.moved || (x === pending.item.x && y === pending.item.y && parentId===(pending.item.parentId??null) && rotation===pending.item.rotation && supportLevel===(pending.item.supportLevel??0))) { cancel(); latest.current.onSelect(pending.item.id); return; }
        const invalid = placementError(latest.current.items, pending.item, x, y, rotation,parentId,supportLevel);
        if (invalid) { latest.current.onDragMessage(invalid); cancel(); latest.current.onSelect(pending.item.id); return; }
        pending.saving = true;
        release(e.pointerId);
        app.canvas.style.cursor = "wait";
        try { await latest.current.onDrop(pending.item.id, x, y, rotation,parentId,supportLevel); }
        finally { if (!disposed) { drag = null; app.canvas.style.cursor = "grab"; latest.current.onSelect(pending.item.id); schedule(); syncMotion(); } }
      };
      const escape = (e: KeyboardEvent) => { if (e.key === "Escape" && drag && !drag.saving) { e.preventDefault(); e.stopPropagation(); cancel(); } };
      const visibility = () => { if (document.hidden) cancel(); syncMotion(); };
      const rotate = (e: MouseEvent) => {
        e.preventDefault();
        if (latest.current.interactionLocked || drag || latest.current.readOnly || latest.current.disabled || (latest.current.residentMode === 'direct' && !latest.current.editing)) return;
        const pt = point(e as PointerEvent);
        const hit = [...(api.current?.hits ?? [])].reverse().find(h => hitContext.isPointInPath(h.path, pt.x, pt.y));
        if (hit && !hit.id.startsWith('skill-reward:') && (!latest.current.editing || hit.id===latest.current.selected)) { if(!latest.current.editing)latest.current.onSelect(hit.id); latest.current.onRotate(hit.id, 1); }
      };
      app.canvas.addEventListener("contextmenu", rotate);
      app.canvas.style.touchAction = "none";
      app.canvas.addEventListener("pointerdown", down);
      app.canvas.addEventListener("pointermove", move);
      app.canvas.addEventListener("pointerup", up);
      app.canvas.addEventListener("pointercancel", cancel);
      app.canvas.addEventListener("lostpointercapture", cancel);
      window.addEventListener("keydown", escape, true);
      window.addEventListener("blur", cancel);
      document.addEventListener("visibilitychange", visibility);
      // Real time stays correct even with decorative animation paused. No hidden-tab redraws.
      const clockTimer=setInterval(()=>{if(!document.hidden && inView && !shouldAnimate())schedule();},1000);
      cleanup = () => {
        clearInterval(clockTimer);
        cancelAnimationFrame(frame);
        cancelAnimationFrame(animationFrame);
        intersection.disconnect();
        app.canvas.removeEventListener("contextmenu", rotate);
        window.removeEventListener("keydown", escape, true);
        window.removeEventListener("blur", cancel);
        document.removeEventListener("visibilitychange", visibility);
        app.canvas.removeEventListener("pointerdown", down);
        app.canvas.removeEventListener("pointermove", move);
        app.canvas.removeEventListener("pointerup", up);
        app.canvas.removeEventListener("pointercancel", cancel);
        app.canvas.removeEventListener("lostpointercapture", cancel);
      };
      const resize = () => {
        const w = el.clientWidth,
          h = el.clientHeight;
        app.renderer.resize(w, h);
        const s =
          Math.min(w / SCENE.width, h / SCENE.height) * latest.current.zoom;
        scene.scale.set(s);
        scene.position.set(
          (w - SCENE.width * s) / 2,
          (h - SCENE.height * s) / 2,
        );
        app.render();
      };
      api.current = { app, scene, sprite, canvas, hits: [], resize, paint, syncMotion };
      obs = new ResizeObserver(resize);
      obs.observe(el);
      resize();
      app.ticker.stop();
      setReady(true);
      latest.current.onReady();
    })().catch(() => {
      if (!disposed)
        setError(
          "Не удалось открыть комнату. Обновите страницу или включите аппаратное ускорение браузера.",
        );
    });
    return () => {
      disposed = true;
      cleanup();
      obs?.disconnect();
      api.current = null;
      if (app.renderer)
        app.destroy(true, {
          children: true,
          texture: true,
          textureSource: true,
        });
    };
  }, []);
  useEffect(() => {
    if (ready) api.current?.resize();
  }, [props.zoom, ready]);
  useEffect(() => {
    const a = api.current;
    if (!a || !ready) return;
    a.paint();
    a.syncMotion();
  }, [
    props.demoSky,
    props.skillActivities,
    props.skillRewards,
    props.snowIntensity,
    props.season,
    props.accentLights,
    props.residentLook,
    props.residentMode,
    props.residentCommand,
    props.readOnly,
    props.storming,
    props.lightning,
    props.raining,
    props.daylight,
    props.motionEnabled,
    props.musicPlaying,
    props.disabled,
    props.appearance,
    props.items,
    props.selected,
    props.draft,
    props.editing,
    props.zoom,
    ready,
  ]);
  return (
    <div
      ref={host}
      className="room-canvas"
      role="img"
      aria-label="Интерактивная изометрическая комната с жителем, часами местного времени, паром над кружкой и эквалайзером на мониторах. Занятия жителя доступны на панели «Житель комнаты». Управление предметами также доступно в инвентаре."
    >
      {error && <p className="canvas-error">{error}</p>}
    </div>
  );
}

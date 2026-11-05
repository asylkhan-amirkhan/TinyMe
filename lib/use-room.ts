"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { validFurnitureColor } from "@/domain/furniture-color";
import { validAppearance } from "@/domain/appearance";
import type { User } from "@supabase/supabase-js";
import {
  initialRoom,
  RoomData,
  accrue,
  catalog,
  placementError,
  mergeRoom,
  removeItem,
} from "@/domain/model";
import { supabase, rpc, errorMessage } from "./supabase";
import { BackgroundSession, type ActivitySnapshot } from "./background-session";
import { furnishStudio } from '@/domain/studio-layout';
export function useRoom() {
  const [room, setRoom] = useState<RoomData>(initialRoom);
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Загрузка…");
  const [notice, setNotice] = useState("");
  const [activity, setActivity] = useState("Нажмите в комнате, чтобы начать");
  const [ready, setReady] = useState(false);
  const state = useRef(room);
  state.current = room;
  const [timerRunning, setTimerRunning] = useState(false);
  const timerControl = useRef<() => void>(() => {});
  const mutation = useRef(false);
  const userRef = useRef<User | null>(user);
  userRef.current = user;
  const refresh = useCallback(async () => {
    const r = await rpc<RoomData>("bootstrap");
    setRoom(r);
    return r;
  }, []);
  useEffect(() => {
    let live = true;
    let initialized = false;
    let accountId: string | null = null;
    const init = async (u: User | null) => {
      if (!live) return;
      // Auth token refreshes must not restart a running background session.
      if (initialized && accountId === (u?.id ?? null)) { setUser(u); return; }
      initialized = true;
      accountId = u?.id ?? null;
      setLoaded(false);
      setUser(u);

      try {
        if (u) {
          setRoom(await rpc<RoomData>("bootstrap"));
          setStatus("Сохранено в облаке");
        } else {
          const local = localStorage.getItem("myroom:guest:v1");
          if (local) {
            try {
              const parsed = JSON.parse(local);
              if (parsed.version === 1 && Array.isArray(parsed.items))
                setRoom(furnishStudio(parsed));
              else setRoom(initialRoom());
            } catch {
              setRoom(initialRoom());
            }
          } else setRoom(initialRoom());
          setStatus("Сохранено на устройстве");
        }
      } catch (e) {
        setNotice(errorMessage((e as Error).message));
        setStatus("Ошибка загрузки");
      } finally {
        if (live) setLoaded(true);
      }
    };
    supabase?.auth
      .getSession()
      .then(({ data }) => init(data.session?.user ?? null));
    if (!supabase) void init(null);
    const sub = supabase?.auth.onAuthStateChange((_event, s) => {
      setTimeout(() => {
        if (live) void init(s?.user ?? null);
      }, 0);
    });
    return () => {
      live = false;
      sub?.data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!loaded || user) return;
    try {
      localStorage.setItem("myroom:guest:v1", JSON.stringify(room));
      setStatus("Сохранено на устройстве");
    } catch {
      setStatus("Не удалось сохранить на устройстве");
    }
  }, [room, user, loaded]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 7000);
    return () => clearTimeout(id);
  }, [notice]);
  useEffect(() => {
    if (!loaded || !ready) return;
    let live = true, started = false, wanted = false;
    let releaseLock: (() => void) | undefined;
    let lockTask: Promise<void> | undefined;
    let stopping: Promise<void> | undefined;
    let acquiring = false;
    const clock = new BackgroundSession({
      cloud: !!user,
      now: () => performance.now(),
      id: () => crypto.randomUUID(),
      request: (action, id, seq) => rpc<ActivitySnapshot>("activity", {
        p_operation: crypto.randomUUID(), p_session: id, p_action: action, p_seq: seq,
      }),
      elapsed: delta => { if (live) setRoom(s => accrue(s, delta)); },
      snapshot: data => {
        if (live) setRoom(s => mergeRoom(s, { ...s, activeMs: data.activeMs,
          balance: data.balance, balanceRevision: data.balanceRevision }));
      },
      status: (message, running) => {
        if (live) { setActivity(errorMessage(message)); setTimerRunning(running); }
      },
    });
    setTimerRunning(false);
    setActivity("Нажмите в комнате, чтобы начать");
    const begin = async () => {
      if (stopping) await stopping;
      if (!live || !wanted || !navigator.onLine || acquiring) return;
      if (releaseLock || !navigator.locks) { void clock.start(); return; }
      acquiring = true;
      try {
        lockTask = navigator.locks.request("myroom:timer:" + (user?.id ?? "guest"), { ifAvailable: true }, async lock => {
          acquiring = false;
          if (!live || !wanted || !navigator.onLine) return;
          if (!lock) {
            wanted = false;
            setTimerRunning(false);
            setActivity("Таймер уже работает в другой вкладке");
            return;
          }
          if (!user) {
            try {
              const saved = JSON.parse(localStorage.getItem("myroom:guest:v1") ?? "null");
              if (saved?.version === 1 && Array.isArray(saved.items)) setRoom(furnishStudio(saved));
            } catch {}
          }
          await new Promise<void>(resolve => {
            releaseLock = resolve;
            void clock.start();
          });
          releaseLock = undefined;
        }).then(() => {});
        await lockTask;
      } catch {
        acquiring = false;
        if (live) { wanted = false; setActivity("Не удалось запустить таймер. Нажмите «Продолжить»."); }
      }
    };
    const stop = (discard = false) => {
      const held = lockTask;
      stopping = clock.pause(discard).then(async () => {
        releaseLock?.();
        await held;
      });
      return stopping;
    };
    const pause = () => {
      wanted = false;
      void stop();
    };
    const toggle = () => {
      started = true;
      if (wanted) pause();
      else { wanted = true; void begin(); }
    };
    timerControl.current = toggle;
    const mark = (event: Event) => {
      if (!event.isTrusted || started) return;
      // Explicit timer clicks have their own handler; do not toggle twice.
      if (event.target instanceof Element && event.target.closest("[data-session-toggle]")) return;
      started = true; wanted = true; void begin();
    };
    const events = ["pointerdown", "keydown", "touchstart", "wheel"];
    events.forEach(event => window.addEventListener(event, mark, { passive: true }));
    const offline = () => { void stop(true); };
    const online = () => { if (wanted) void begin(); };
    const visibility = () => { if (navigator.onLine) void clock.tick(); };
    const pagehide = () => { void stop(); };
    const pageshow = () => { if (wanted) void begin(); };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("pageshow", pageshow);
    document.addEventListener("visibilitychange", visibility);
    const timer = setInterval(() => { if (navigator.onLine) void clock.tick(); }, user ? 10000 : 1000);
    return () => {
      void clock.dispose().finally(() => releaseLock?.());
      live = false;
      timerControl.current = () => {};
      clearInterval(timer);
      events.forEach(event => window.removeEventListener(event, mark));
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("pageshow", pageshow);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [loaded, ready, user?.id]);
  const command = async (kind: string, payload: Record<string, unknown>) => {
    if (mutation.current || !loaded) return false;
    mutation.current = true;
    setBusy(true);
    setStatus("Сохраняется…");
    try {
      if (user) {
        const op = crypto.randomUUID();
        const body = { ...payload, revision: state.current.revision };
        const pending = { op, kind, body, userId: user.id };
        localStorage.setItem(
          "myroom:pending:" + user.id,
          JSON.stringify(pending),
        );
        let result: RoomData | undefined;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            result = await rpc<RoomData>("room_command", {
              p_operation: op,
              p_kind: kind,
              p_payload: body,
            });
            break;
          } catch (e) {
            if (
              attempt === 1 ||
              !/(fetch|network|timeout)/i.test((e as Error).message)
            )
              throw e;
          }
        }
        if (result) {
          const confirmed = result;
          setRoom((s) => mergeRoom(s, confirmed));
        }
        localStorage.removeItem("myroom:pending:" + user.id);
        setStatus("Сохранено в облаке");
      } else {
        const s = state.current;
        let next = { ...s, revision: s.revision + 1, items: [...s.items] };
        if (kind === "purchase") {
          const p = catalog.find((p) => p.id === payload.productId)!;
          if (s.balance < p.price) throw Error("INSUFFICIENT_FUNDS");
          next = {
            ...next,
            balance: s.balance - p.price,
            items: [
              ...s.items,
              {
                id: crypto.randomUUID(),
                productId: p.id,
                x: null,
                y: null,
                rotation: 0,
                on: false,
              },
            ],
          };
        } else if (kind === "appearance") {
          if (!validAppearance(payload.appearance)) throw Error("Выберите допустимые цвета");
          next = { ...next, appearance: payload.appearance };
        } else {
          const item = s.items.find((i) => i.id === payload.id);
          if (!item) throw Error("Предмет не найден");
          if (kind === "color" && !validFurnitureColor(payload.color)) throw Error("Выберите допустимый цвет мебели");
          if (kind === "place") {
            const err = placementError(
              s.items,
              item,
              Number(payload.x),
              Number(payload.y),
              Number(payload.rotation),
              payload.parentId === undefined ? item.parentId ?? null : payload.parentId === null ? null : String(payload.parentId),
              payload.supportLevel === undefined ? (payload.parentId !== undefined && payload.parentId !== (item.parentId ?? null) ? 0 : item.supportLevel ?? 0) : Number(payload.supportLevel),
            );
            if (err) throw Error(err);
          }
          next.items = kind === "remove" ? removeItem(s.items,item.id) : s.items.map((i) =>
            i.id !== item.id
              ? i
              : kind === "color"
                ? { ...i, color: payload.color === null ? null : String(payload.color).toLowerCase() }
              : kind === "remove"
                ? { ...i, x: null, y: null }
                : kind === "toggle"
                  ? { ...i, on: !i.on }
                  : {
                      ...i,
                      x: Number(payload.x),
                      y: Number(payload.y),
                      rotation: Number(payload.rotation),
                      parentId: payload.parentId === undefined ? item.parentId ?? null : payload.parentId === null ? null : String(payload.parentId),
                      supportLevel: payload.supportLevel === undefined ? (payload.parentId !== undefined && payload.parentId !== (item.parentId ?? null) ? 0 : item.supportLevel ?? 0) : Number(payload.supportLevel),
                    },
          );
        }
        // Commit storage before acknowledging a guest edit; failed writes must not look saved.
        localStorage.setItem('myroom:guest:v1',JSON.stringify(next));
        state.current=next;
        setRoom(next);
        setStatus("Сохранено на устройстве");
      }
      return true;
    } catch (e) {
      const msg = (e as Error).message;
      setNotice(errorMessage(msg));
      setStatus("Изменение не сохранено");
      if (user && msg === "ROOM_VERSION_CONFLICT")
        await refresh().catch(() => {});
      return false;
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  };
  const recover = async () => {
    if (!user) return;
    const value = localStorage.getItem("myroom:pending:" + user.id);
    if (!value) return;
    try {
      const p = JSON.parse(value);
      if (p.userId !== user.id) return;
      const result = await rpc<RoomData>("room_command", {
        p_operation: p.op,
        p_kind: p.kind,
        p_payload: p.body,
      });
      setRoom(result);
      localStorage.removeItem("myroom:pending:" + user.id);
      setStatus("Сохранено в облаке");
    } catch (e) {
      setNotice(errorMessage((e as Error).message));
    }
  };
  useEffect(() => {
    if (loaded && user) void recover();
  }, [loaded, user?.id]); // same idempotency key recovers an uncertain response
  return {
    room,
    user,
    loaded,
    busy,
    status,
    notice,
    setNotice,
    activity,
    timerRunning,
    toggleTimer: () => timerControl.current(),
    command,
    setReady,
    refresh,
  };
}

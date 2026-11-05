"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { NotificationSound, savedSoundEnabled, savedSoundChannels, soundPreferenceKey, soundChannelsKey, type NotificationSoundKind } from "./notification-sound";

export function useNotificationSound() {
  const [enabled, setEnabled] = useState(true);
  const [channels, setChannels] = useState(() => savedSoundChannels(null));
  const channelsRef = useRef(channels);
  const [message, setMessage] = useState("");
  const engine = useRef<NotificationSound | null>(null);
  const enabledRef = useRef(true);
  useEffect(() => {
    const sound = new NotificationSound();
    engine.current = sound;
    let saved = true;
    try { saved = savedSoundEnabled(localStorage.getItem(soundPreferenceKey)); } catch {}
    enabledRef.current = saved; setEnabled(saved); sound.setEnabled(saved);
    let savedChannels = savedSoundChannels(null);
    try { savedChannels = savedSoundChannels(localStorage.getItem(soundChannelsKey)); } catch {}
    channelsRef.current = savedChannels; setChannels(savedChannels);
    sound.setKindEnabled("purchase", savedChannels.purchase);
    sound.setKindEnabled("coins", savedChannels.coins);
    const unlock = (event: Event) => { if (event.isTrusted && enabledRef.current) void sound.unlock(); };
    const quiet = () => sound.setEnabled(!document.hidden && enabledRef.current);
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    document.addEventListener("visibilitychange", quiet);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", quiet);
      sound.dispose(); engine.current = null;
    };
  }, []);
  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next; setEnabled(next); setMessage("");
    engine.current?.setEnabled(next);
    if (next) void engine.current?.unlock();
    try { localStorage.setItem(soundPreferenceKey, String(next)); }
    catch { setMessage("Выбор действует сейчас, но браузер не разрешил его сохранить."); }
  }, []);
  const toggleKind = useCallback((kind: NotificationSoundKind) => {
    const next = { ...channelsRef.current, [kind]: !channelsRef.current[kind] };
    channelsRef.current = next; setChannels(next); setMessage("");
    engine.current?.setKindEnabled(kind, next[kind]);
    if (next[kind] && enabledRef.current) void engine.current?.unlock();
    try { localStorage.setItem(soundChannelsKey, JSON.stringify(next)); }
    catch { setMessage("Выбор действует сейчас, но браузер не разрешил его сохранить."); }
  }, []);
  const play = useCallback((kind: "purchase" | "coins" | "info") => {
    if (kind !== "info" && !document.hidden && enabledRef.current && channelsRef.current[kind]) {
      try { engine.current?.play(kind); } catch { /* Feedback must never interrupt a successful action. */ }
    }
  }, []);
  const preview = useCallback(async (kind: NotificationSoundKind) => {
    const sound = engine.current;
    if (!sound || !enabledRef.current || !channelsRef.current[kind] || document.hidden) return;
    const ready = await sound.unlock();
    if (engine.current !== sound || !enabledRef.current || !channelsRef.current[kind] || document.hidden) return;
    if (ready) { sound.play(kind); setMessage(""); }
    else setMessage("Браузер пока не разрешил звук. Попробуйте ещё раз.");
  }, []);
  return { enabled, channels, toggle, toggleKind, play, preview, message };
}

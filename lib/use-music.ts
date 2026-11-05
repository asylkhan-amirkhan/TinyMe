"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MusicState,
  Track,
  initialMusic,
  loadMusic,
  saveMusic,
  putAudio,
  getAudio,
  deleteAudio,
  ambientWav,
  localDay,
} from "./music-storage";
import { addToPlaylist, addUploadedTracks, listenedDelta, anotherMusicPlayer } from "./music-behavior";
import { audioFingerprint, findDuplicateAudio, duplicateNotice } from "./music-duplicates";
import { listenThreshold } from "@/domain/model";
import {MusicSpectrum} from './music-spectrum';
import {SPECTRUM_BANDS} from '@/domain/live-details';
import {
  musicRequest,
  mergeCloudMusic,
  uploadCloudTrack,
  type CloudSnapshot,
  type CloudLibrary,
} from "./music-cloud";
export function useMusic(owner: string, notify: (s: string) => void) {
  const [music, setMusic] = useState<MusicState>(initialMusic);
  const [loaded, setLoaded] = useState(false);
  const [loadedOwner, setLoadedOwner] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const mutation = useRef(false);
  const revision = useRef(0);
  const ownerRef = useRef(owner);
  ownerRef.current = owner;
  const cloud = owner !== "guest";
  const ready = loaded && loadedOwner === owner;
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [uploading, setUploading] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const spectrum = useRef<MusicSpectrum | null>(null);
  const silentSpectrum = useRef(new Float32Array(SPECTRUM_BANDS));
  useEffect(() => {
    const meter=new MusicSpectrum(); spectrum.current=meter;
    return () => {meter.dispose();if(spectrum.current===meter)spectrum.current=null;};
  },[]);
  const readSpectrum = useCallback((deltaMs:number) => spectrum.current?.sample(deltaMs) ?? silentSpectrum.current,[]);
  const state = useRef(music);
  state.current = music;
  const attempt = useRef({
    seconds: 0,
    qualified: false,
    coverage: new Set<number>(),
  });
  const previous = useRef({ wall: 0, media: 0 });
  const [attemptKey, setAttemptKey] = useState(0);
  const shouldPlay = useRef(true);
  const activated = useRef(false);
  const notifyRef = useRef(notify);
  notifyRef.current = notify;
  const musicLock = useRef<string | null>(null);
  const current =
    music.tracks.find((t) => t.id === music.currentId) ?? music.tracks[0];
  useEffect(() => {
    let cancelled = false;
    activated.current = false;
    setLoaded(false);
    setLoadedOwner("");
    setLoadError(false);
    setMusic(initialMusic());
    loadMusic(owner)
      .then(async (local) => {
        const s = local ?? initialMusic();
        if (!cloud) return s;
        const remote = await musicRequest<CloudSnapshot>({ action: "load" });
        if (!cancelled) revision.current = remote.library.revision;
        return mergeCloudMusic(s, remote);
      })
      .then((s) => {
        if (!cancelled) {
          setMusic(s);
          setLoadedOwner(owner);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
        notifyRef.current("Не удалось открыть музыкальную коллекцию");
      });
    return () => {
      cancelled = true;
      audio.current?.pause();
    };
  }, [owner, cloud, reload]);
  useEffect(() => {
    if (ready)
      void saveMusic(owner, music).catch(() =>
        notifyRef.current("Не удалось сохранить музыку на устройстве"),
      );
  }, [music, ready, owner]);
  const updateMusic = (update: React.SetStateAction<MusicState>) => {
    if (!ready || mutation.current) return;
    const proposed =
      typeof update === "function" ? update(state.current) : update;
    const changed =
      JSON.stringify([proposed.playlists, proposed.selectedPlaylist]) !==
      JSON.stringify([state.current.playlists, state.current.selectedPlaylist]);
    if (!cloud || !changed) {
      setMusic(proposed);
      return;
    }
    mutation.current = true;
    setSaving(true);
    void musicRequest<{ library: CloudLibrary }>({
      action: "save",
      revision: revision.current,
      playlists: proposed.playlists.filter((p) => p.id !== "all"),
      selected: proposed.selectedPlaylist,
    })
      .then((result) => {
        if (ownerRef.current !== owner) return;
        revision.current = result.library.revision;
        setMusic((s) => ({
          ...s,
          playlists: [s.playlists[0], ...result.library.playlists],
          selectedPlaylist: result.library.selected_playlist,
        }));
      })
      .catch((e) => {
        if (ownerRef.current !== owner) return;
        notify((e as Error).message);
        // Reload after any ambiguous outcome: the server may have committed the save.
        setReload((n) => n + 1);
      })
      .finally(() => {
        mutation.current = false;
        setSaving(false);
      });
  };
  const next = useCallback((direction = 1, natural = false) => {
    const s = state.current;
    const ids =
      s.playlists.find((p) => p.id === s.selectedPlaylist)?.trackIds ??
      s.tracks.map((t) => t.id);
    if (ids.length === 0) return;
    const index = ids.indexOf(s.currentId);
    if (natural && s.repeat === "off" && index === ids.length - 1) {
      setPlaying(false);
      shouldPlay.current = false;
      return;
    }
    const pick =
      natural && s.repeat === "one"
        ? s.currentId
        : s.shuffle
          ? ids[Math.floor(Math.random() * ids.length)]
          : ids[(index + direction + ids.length) % ids.length];
    shouldPlay.current = true;
    setMusic((m) => ({ ...m, currentId: pick }));
    setAttemptKey((k) => k + 1);
  }, []);
  useEffect(() => {
    if (!ready || !current) return;
    let cancelled = false,
      url = "";
    const a = new Audio();
    audio.current = a;
    a.volume = state.current.volume;
    attempt.current = { seconds: 0, qualified: false, coverage: new Set() };
    previous.current = { wall: 0, media: 0 };
    setPosition(0);
    setPlaying(false);
    const addStat = (delta: number, completed = false) => {
      const track = current;
      if (!track) return;
      attempt.current.seconds += delta;
      const qualifies =
        !attempt.current.qualified &&
        attempt.current.seconds >= listenThreshold(track.duration);
      if (qualifies) attempt.current.qualified = true;
      const day = localDay();
      setMusic((s) => {
        const stats = [...s.stats];
        const index = stats.findIndex(
          (x) => x.trackId === track.id && x.day === day,
        );
        const old =
          index >= 0
            ? stats[index]
            : {
                trackId: track.id,
                title: track.title,
                day,
                seconds: 0,
                plays: 0,
                completed: 0,
              };
        const value = {
          ...old,
          seconds: old.seconds + delta,
          plays: old.plays + (qualifies ? 1 : 0),
          completed: old.completed + (completed ? 1 : 0),
        };
        if (index >= 0) stats[index] = value;
        else stats.push(value);
        return { ...s, stats };
      });
    };
    const tick = (tail = false) => {
      if (cancelled) return;
      const now = performance.now(),
        m = a.currentTime;
      setPosition(m);
      const wall = (now - previous.current.wall) / 1000,
        media = m - previous.current.media;
      if (a.paused && !tail) {
        previous.current = { wall: 0, media: m };
        return;
      }
      try {
        if ((!a.paused || previous.current.wall > 0) && anotherMusicPlayer(localStorage.getItem("myroom:music-lock:" + owner), musicLock.current)) {
          shouldPlay.current = false;
          previous.current = { wall: 0, media: m };
          if (!a.paused) a.pause();
          return;
        }
      } catch { /* Playback remains available when browser storage is blocked. */ }
      const delta = previous.current.wall ? listenedDelta(wall, media,
        (!a.paused || tail) && !a.seeking && a.readyState >= 2 && a.volume > 0 && !a.muted) : 0;
      if (delta > 0) {
        addStat(delta);
        for (
          let t = Math.floor(previous.current.media * 10);
          t < Math.floor(m * 10);
          t++
        )
          attempt.current.coverage.add(t);
      }
      previous.current = { wall: now, media: m };
    };
    const reset = () => {
      previous.current = { wall: 0, media: a.currentTime };
    };
    a.addEventListener("seeking", reset);
    a.addEventListener("waiting", reset);
    a.addEventListener("pause", () => {
      if (cancelled) return;
      tick(true);
      setPlaying(false);
      spectrum.current?.pause();
      reset();
    });
    a.addEventListener('playing',()=>{if(!cancelled)spectrum.current?.attach(a);});
    a.addEventListener("play", () => {
      if (cancelled) return;
      setPlaying(true);
      activated.current = true;
      musicLock.current = crypto.randomUUID();
      try { localStorage.setItem("myroom:music-lock:" + owner, JSON.stringify({ id: musicLock.current })); } catch {}
      previous.current = { wall: performance.now(), media: a.currentTime };
    });
    a.addEventListener("ended", () => {
      if (cancelled) return;
      tick(true);
      if (!shouldPlay.current) return;
      if (
        attempt.current.qualified &&
        attempt.current.coverage.size / 10 >= current.duration * 0.9
      )
        addStat(0, true);
      next(1, true);
    });
    a.addEventListener("error", () => {
      if (!cancelled)
        notifyRef.current(
          "Не удалось воспроизвести файл. Выберите другой трек.",
        );
    });
    (async () => {
      if (current.cloud) {
        const result = await musicRequest<{ url: string }>({
          action: "playback",
          id: current.id,
        });
        if (cancelled) return;
        a.src = result.url;
      } else {
        const blob = current.builtin
          ? ambientWav()
          : await getAudio(owner, current.id);
        if (cancelled) return;
        if (!blob) {
          notifyRef.current("Файл отсутствует на этом устройстве");
          return;
        }
        url = URL.createObjectURL(blob);
        a.src = url;
      }
      if (shouldPlay.current && (activated.current || !document.hidden)) void a.play().catch(() => {});
    })().catch(() => {
      if (!cancelled)
        notifyRef.current("Не удалось открыть трек. Проверьте соединение.");
    });
    const sample = () => tick();
    const timer = setInterval(sample, 500);
    a.addEventListener("timeupdate", sample);
    const unlock = () => {
      spectrum.current?.unlock();
      if (shouldPlay.current && a.paused && !document.hidden)
        void a.play().catch(() => {});
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    // Visibility is an accounting checkpoint, never a playback command.
    const visibility = () => { tick(); };
    const ownership = (event: StorageEvent) => {
      if (event.key === "myroom:music-lock:" + owner && anotherMusicPlayer(event.newValue, musicLock.current)) {
        shouldPlay.current = false;
        a.pause();
      }
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("storage", ownership);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("pointerdown", unlock);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("storage", ownership);
      a.removeEventListener("timeupdate", sample);
      a.pause();
      spectrum.current?.detach();
      a.src = "";
      URL.revokeObjectURL(url);
    };
  }, [current?.id, ready, owner, attemptKey, next]);
  useEffect(() => {
    if (audio.current) audio.current.volume = music.volume;
  }, [music.volume]);
  const play = (id?: string) => {
    spectrum.current?.unlock();
    if (id && id !== state.current.currentId) {
      shouldPlay.current = true;
      setMusic((s) => ({ ...s, currentId: id }));
      return;
    }
    const a = audio.current;
    if (!a) return;
    if (a.error) {
      shouldPlay.current = true;
      setAttemptKey((k) => k + 1);
      return;
    }
    if (a.paused) {
      shouldPlay.current = true;
      void a
        .play()
        .catch(() => notify("Нажмите ещё раз, чтобы разрешить звук"));
    } else {
      shouldPlay.current = false;
      a.pause();
    }
  };
  const upload = async (files: FileList | null) => {
    if (!files || !ready || mutation.current) return;
    mutation.current = true;
    setUploading(true);
    notify(""); // Repeated attempts must show a fresh notification, too.
    const destination = state.current.selectedPlaylist;
    const destinationName = state.current.playlists.find(p => p.id === destination)?.name ?? "Моя коллекция";
    const uploadedTracks: Track[] = [];
    const knownTracks = state.current.tracks.map(track => ({ ...track }));
    const duplicates: string[] = [];
    const errors: string[] = [];
    let added = 0;
    let total = state.current.tracks.reduce((n, t) => n + t.size, 0);
    let count = state.current.tracks.filter((t) => !t.builtin).length;
    for (const file of Array.from(files)) {
      try {
        if (!/\.(mp3|wav)$/i.test(file.name) || file.size > 50 * 1024 * 1024)
          throw Error(`${file.name}: нужен MP3/WAV до 50 МБ`);
        const buffer = await file.arrayBuffer();
        const contentHash = await audioFingerprint(buffer);
        const duplicate = await findDuplicateAudio(knownTracks, contentHash, file.size,
          track => track.cloud ? Promise.resolve(undefined) : getAudio(owner, track.id),
          (id, hash) => {
            const known = knownTracks.find(track => track.id === id);
            if (known) known.contentHash = hash;
            if (ownerRef.current === owner) setMusic(s => ({ ...s,
              tracks: s.tracks.map(track => track.id === id ? { ...track, contentHash: hash } : track) }));
          });
        if (ownerRef.current !== owner) break;
        if (duplicate) {
          duplicates.push(duplicate.title);
          continue;
        }
        if (total + file.size > 1024 ** 3 || count >= 200)
          throw Error("Достигнут лимит музыкальной коллекции");
        const context = new AudioContext();
        let duration: number;
        try {
          const decoded = await context.decodeAudioData(buffer);
          duration = decoded.duration;
        } finally {
          await context.close();
        }
        if (duration <= 0) throw Error("Пустой аудиофайл");
        let track: Track = {
          id: crypto.randomUUID(),
          title: file.name.replace(/\.[^.]+$/, "").slice(0, 160),
          duration,
          size: file.size,
          contentHash,
        };
        if (ownerRef.current !== owner) break;
        if (cloud) {
          const uploaded = await uploadCloudTrack(file, track.id, track.title, contentHash);
          track = { ...track, duration: uploaded.duration, cloud: true };
        } else await putAudio(owner, track.id, file);
        if (ownerRef.current !== owner) break;
        total += file.size;
        count++;
        uploadedTracks.push(track);
        knownTracks.push(track); // React may not have rendered the previous file yet.
        setMusic(s => addUploadedTracks(s, [track], cloud ? "all" : destination));
        added++;
      } catch (e) {
        if ((e as Error & { code?: string }).code === "DUPLICATE_AUDIO")
          duplicates.push(file.name.replace(/\.[^.]+$/, ""));
        else errors.push((e as Error).message);
      }
    }
    let inPlaylist = !cloud && destination !== "all";
    let playlistFailed = false;
    if (added && cloud && destination !== "all" && ownerRef.current === owner) {
      try {
        const proposed = addUploadedTracks(state.current, uploadedTracks, destination);
        const result = await musicRequest<{ library: CloudLibrary }>({ action: "save",
          revision: revision.current, playlists: proposed.playlists.filter(p => p.id !== "all"), selected: destination });
        if (ownerRef.current === owner) {
          revision.current = result.library.revision;
          setMusic(s => {
            const latest = addUploadedTracks(s, uploadedTracks);
            return { ...latest, playlists: [latest.playlists[0], ...result.library.playlists],
              selectedPlaylist: result.library.selected_playlist };
          });
          inPlaylist = true;
        }
      } catch {
        playlistFailed = true;
        if (ownerRef.current === owner) {
          errors.push("Файлы сохранены в коллекции, но плейлист не удалось обновить. Добавьте треки через «В плейлист».");
          setReload(n => n + 1);
        }
      }
    }
    setUploading(false);
    mutation.current = false;
    if (ownerRef.current === owner) {
      const success = added && !playlistFailed
        ? (inPlaylist ? `Добавлено треков: ${added} · в «${destinationName}» и в коллекцию.` :
          `Добавлено треков: ${added}. Файлы сохранены ${cloud ? "в личной облачной коллекции" : "на этом устройстве"}.`)
        : "";
      notify([success, duplicateNotice(duplicates), ...errors].filter(Boolean).join(" "));
    }
  };
  const remove = async (id: string) => {
    if (id === "builtin-evening" || !ready || mutation.current) return;
    if (
      !confirm(
        `Удалить трек ${cloud ? "из облачной коллекции" : "с этого устройства"} и из плейлистов? История прослушивания останется.`,
      )
    )
      return;
    mutation.current = true;
    setSaving(true);
    try {
      if (cloud) {
        const snapshot = await musicRequest<CloudSnapshot>({
          action: "delete",
          id,
        });
        if (ownerRef.current !== owner) return;
        revision.current = snapshot.library.revision;
        setMusic((s) => mergeCloudMusic(s, snapshot));
        return;
      }
      await deleteAudio(owner, id);
      if (ownerRef.current !== owner) return;
      setMusic((s) => ({
        ...s,
        tracks: s.tracks.filter((t) => t.id !== id),
        playlists: s.playlists.map((p) => ({
          ...p,
          trackIds: p.trackIds.filter((t) => t !== id),
        })),
        currentId: s.currentId === id ? "builtin-evening" : s.currentId,
      }));
    } catch (e) {
      notify((e as Error).message);
      if (ownerRef.current === owner) setReload((n) => n + 1);
    } finally {
      mutation.current = false;
      setSaving(false);
    }
  };
  return {
    music,
    setMusic: updateMusic,
    addToPlaylist: (trackId: string, playlistId: string) => updateMusic(s => addToPlaylist(s, playlistId, [trackId])),
    playing,
    readSpectrum,
    position,
    current,
    loaded: ready,
    cloud,
    saving,
    loadError,
    retry: () => setReload((n) => n + 1),
    uploading,
    upload,
    play,
    next,
    remove,
    seek: (seconds: number) => {
      if (audio.current) {
        audio.current.currentTime = seconds;
        previous.current = { wall: 0, media: seconds };
        setPosition(seconds);
      }
    },
    setVolume: (volume: number) => setMusic((s) => ({ ...s, volume })),
  };
}

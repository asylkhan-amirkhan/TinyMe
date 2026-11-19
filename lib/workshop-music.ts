import { browserId } from '@/lib/browser-id';
import { openDB } from 'idb';
import type { MusicState, Track } from './music-storage';

export type WorkshopTrack = { id: string; title: string; artist: string; genre: string; description: string; color: string; duration: string; seconds: number; size: number };
export const workshopMusicEvent = 'tinyme:workshop-music';
const db = () => openDB('tinyme-workshop-music', 1, { upgrade(d) { d.createObjectStore('tracks'); d.createObjectStore('files'); } });
export async function loadWorkshopTracks(): Promise<WorkshopTrack[]> { return (await db()).getAll('tracks'); }
export async function workshopAudio(id: string): Promise<Blob | undefined> { return (await db()).get('files', id); }
export async function saveWorkshopTrack(track: WorkshopTrack, file?: Blob) {
  const database = await db();
  const tx = database.transaction(['tracks', 'files'], 'readwrite');
  if (file) await tx.objectStore('files').put(file, track.id);
  else if (!await tx.objectStore('files').get(track.id)) { tx.abort(); throw Error('Выберите аудиофайл для трека.'); }
  await tx.objectStore('tracks').put(track, track.id);
  await tx.done;
  window.dispatchEvent(new Event(workshopMusicEvent));
  try { localStorage.setItem(workshopMusicEvent, browserId()); } catch { /* Same-tab updates still work. */ }
}
export function mergeWorkshopMusic(state: MusicState, published: WorkshopTrack[]): MusicState {
  const tracks: Track[] = published.map(t => ({id:t.id,title:t.title,duration:t.seconds,size:t.size,workshop:true}));
  const ids = new Set(tracks.map(t => t.id));
  const removed = new Set(state.tracks.filter(t => t.workshop && !ids.has(t.id)).map(t => t.id));
  return {...state, tracks:[...state.tracks.filter(t => !t.workshop), ...tracks],
    currentId:removed.has(state.currentId)?'builtin-evening':state.currentId,
    playlists:state.playlists.map(p => ({...p,trackIds:[...new Set([...p.trackIds.filter(id => !removed.has(id)), ...(p.id==='all'?[...ids]:[])])]}))};
}
export async function inspectWorkshopAudio(file: File): Promise<number> {
  if (!/\.(mp3|wav|ogg)$/i.test(file.name) || !file.size || file.size > 50 * 1024 * 1024) throw Error('Выберите MP3, WAV или OGG размером до 50 МБ.');
  const context = new AudioContext();
  try {
    const audio = await context.decodeAudioData(await file.arrayBuffer());
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) throw Error('EMPTY_AUDIO');
    return audio.duration;
  } catch { throw Error('Не удалось прочитать аудио. Проверьте файл и его формат.'); }
  finally { await context.close(); }
}

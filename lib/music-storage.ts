import { openDB } from "idb";
export type Track = {
  id: string;
  title: string;
  duration: number;
  size: number;
  builtin?: boolean;
  cloud?: boolean;
  contentHash?: string;
};
export type Playlist = { id: string; name: string; trackIds: string[] };
export type ListenStat = {
  trackId: string;
  title: string;
  day: string;
  seconds: number;
  plays: number;
  completed: number;
};
export type MusicState = {
  tracks: Track[];
  playlists: Playlist[];
  stats: ListenStat[];
  selectedPlaylist: string;
  currentId: string;
  volume: number;
  repeat: "all" | "one" | "off";
  shuffle: boolean;
};
const builtin: Track = {
  id: "builtin-evening",
  title: "Тихий вечер",
  duration: 48,
  size: 0,
  builtin: true,
};
export const initialMusic = (): MusicState => ({
  tracks: [builtin],
  playlists: [{ id: "all", name: "Моя коллекция", trackIds: [builtin.id] }],
  stats: [],
  selectedPlaylist: "all",
  currentId: builtin.id,
  volume: 0.3,
  repeat: "all",
  shuffle: false,
});
const db = () =>
  openDB("myroom-music", 1, {
    upgrade(d) {
      d.createObjectStore("files");
      d.createObjectStore("state");
    },
  });
export async function loadMusic(owner: string) {
  return (await (await db()).get("state", owner)) as MusicState | undefined;
}
export async function saveMusic(owner: string, state: MusicState) {
  await (await db()).put("state", state, owner);
}
export async function putAudio(owner: string, id: string, file: Blob) {
  await (await db()).put("files", file, `${owner}:${id}`);
}
export async function getAudio(owner: string, id: string) {
  return (await (await db()).get("files", `${owner}:${id}`)) as
    Blob | undefined;
}
export async function deleteAudio(owner: string, id: string) {
  await (await db()).delete("files", `${owner}:${id}`);
}
export function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function ambientWav(): Blob {
  // Original procedural composition: soft sustained chords, no external recordings.
  const rate = 12000,
    seconds = 48,
    n = rate * seconds,
    b = new ArrayBuffer(44 + n * 2),
    v = new DataView(b);
  const str = (o: number, s: string) =>
    [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, n * 2, true);
  const chords = [
    [130.81, 164.81, 196, 246.94],
    [110, 130.81, 164.81, 220],
    [87.31, 130.81, 174.61, 220],
    [98, 146.83, 196, 246.94],
  ];
  for (let i = 0; i < n; i++) {
    const t = i / rate,
      k = Math.floor(t / 12),
      local = t % 12,
      env = Math.min(1, local / 2, (12 - local) / 2);
    let s = 0;
    for (const [j, f] of chords[k].entries()) {
      s +=
        Math.sin(t * f * Math.PI * 2) *
        0.032 *
        (1 + 0.08 * Math.sin(t * 0.7 + j));
      const a = (local - j * 1.7 + 12) % 12;
      s += Math.sin(t * f * 2 * Math.PI * 2) * Math.exp(-a * 0.8) * 0.018;
    }
    v.setInt16(44 + i * 2, Math.round(s * env * 32767), true);
  }
  return new Blob([b], { type: "audio/wav" });
}

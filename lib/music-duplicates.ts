import type { Track } from "./music-storage";

/** File names and tags are not reliable identities: compare the file bytes. */
export async function audioFingerprint(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function findDuplicateAudio(
  tracks: Track[], hash: string, size: number,
  readLegacy: (track: Track) => Promise<Blob | undefined>,
  remember: (id: string, hash: string) => void,
): Promise<Track | undefined> {
  for (const track of tracks) {
    if (track.builtin || track.size !== size) continue;
    let fingerprint = track.contentHash;
    if (!fingerprint) {
      const file = await readLegacy(track);
      if (!file) continue;
      fingerprint = await audioFingerprint(await file.arrayBuffer());
      remember(track.id, fingerprint);
    }
    if (fingerprint === hash) return track;
  }
}

export function duplicateNotice(titles: string[]): string {
  if (!titles.length) return "";
  return titles.length === 1
    ? `Этот трек уже есть в коллекции: «${titles[0]}».`
    : `Эти треки уже есть в коллекции — пропущено повторов: ${titles.length}.`;
}

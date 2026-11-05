import type { MusicState, Track } from "./music-storage";

/** Collection retains every file; playlist membership is only a reference. */
export function addToPlaylist(state: MusicState, playlistId: string, trackIds: string[]): MusicState {
  if (playlistId === "all") return state;
  const available = new Set(state.tracks.map(track => track.id));
  return { ...state, playlists: state.playlists.map(playlist => playlist.id !== playlistId ? playlist : {
    ...playlist, trackIds: [...new Set([...playlist.trackIds, ...trackIds.filter(id => available.has(id))])],
  }) };
}
export function addUploadedTracks(state: MusicState, tracks: Track[], playlistId = "all"): MusicState {
  const known = new Set(state.tracks.map(track => track.id));
  const added = tracks.filter(track => !known.has(track.id));
  const next = { ...state, tracks: [...state.tracks, ...added], playlists: state.playlists.map(playlist =>
    playlist.id === "all" ? { ...playlist, trackIds: [...new Set([...playlist.trackIds, ...tracks.map(track => track.id)])] } : playlist) };
  return addToPlaylist(next, playlistId, tracks.map(track => track.id));
}

/** Count actual audible media progress even when background callbacks are batched. */
export function listenedDelta(wall: number, media: number, audible: boolean) {
  return audible && Number.isFinite(wall) && Number.isFinite(media) &&
    wall > 0 && wall <= 90 && media > 0 && media <= wall + .25 ? Math.min(wall, media) : 0;
}
export function anotherMusicPlayer(value: string | null, ownId: string | null) {
  try {
    const lock = JSON.parse(value ?? "null");
    return typeof lock?.id === "string" && lock.id !== ownId;
  } catch { return false; }
}

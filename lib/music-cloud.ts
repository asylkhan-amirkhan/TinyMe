import { supabase } from "./supabase";
import { initialMusic, type MusicState, type Playlist } from "./music-storage";
export type CloudLibrary = {
  revision: number;
  playlists: Playlist[];
  selected_playlist: string;
};
export type CloudTrack = {
  id: string;
  title: string;
  duration: number;
  bytes: number;
  content_hash?: string | null;
};
export type CloudSnapshot = { library: CloudLibrary; tracks: CloudTrack[] };
export async function musicRequest<T>(
  body: Record<string, unknown>,
): Promise<T> {
  if (!supabase) throw Error("Облачное подключение не настроено");
  const { data, error } = await supabase.functions.invoke("music-library", {
    body,
  });
  if (error) {
    let code = "";
    try {
      code = (await error.context?.json())?.error ?? "";
    } catch {}
    const messages: Record<string, string> = {
      LIBRARY_CONFLICT:
        "Плейлисты изменены в другом окне. Коллекция обновлена — повторите действие.",
      QUOTA_EXCEEDED:
        "Достигнут лимит: 200 треков или 1 ГБ, включая незавершённые загрузки.",
      TOO_MANY_UPLOADS: "Есть незавершённые загрузки. Попробуйте позже.",
      UNAUTHORIZED: "Войдите снова, чтобы открыть музыку.",
      INVALID_AUDIO_SIGNATURE: "Файл не соответствует формату MP3 или WAV.",
      INVALID_AUDIO_DURATION: "Не удалось прочитать длительность файла.",
      FILE_SIZE_MISMATCH: "Файл загрузился не полностью. Повторите загрузку.",
      DUPLICATE_AUDIO: "Этот трек уже есть в коллекции.",
    };
    const failure = new Error(
      messages[code] ??
        "Не удалось связаться с музыкальной библиотекой. Повторите действие.",
    );
    Object.assign(failure, { code });
    throw failure;
  }
  return data as T;
}
export function mergeCloudMusic(
  local: MusicState,
  snapshot: CloudSnapshot,
): MusicState {
  const tracks = [
    ...initialMusic().tracks,
    ...snapshot.tracks.map((t) => ({
      id: t.id,
      title: t.title,
      duration: t.duration,
      size: t.bytes,
      cloud: true,
      contentHash: t.content_hash ?? undefined,
    })),
  ];
  return {
    ...local,
    tracks,
    playlists: [
      { id: "all", name: "Моя коллекция", trackIds: tracks.map((t) => t.id) },
      ...snapshot.library.playlists,
    ],
    selectedPlaylist: snapshot.library.selected_playlist,
    currentId: tracks.some((t) => t.id === local.currentId)
      ? local.currentId
      : "builtin-evening",
  };
}
export async function uploadCloudTrack(
  file: File,
  id: string,
  title: string,
  contentHash: string,
): Promise<CloudTrack> {
  const mime = /\.wav$/i.test(file.name) ? "audio/wav" : "audio/mpeg";
  const reservation = await musicRequest<{
    path: string;
    token: string;
    ready?: boolean;
    track?: CloudTrack;
  }>({ action: "reserve", id, title, bytes: file.size, mime, contentHash });
  if (reservation.ready && reservation.track) return reservation.track;
  try {
    const { error } = await supabase!.storage
      .from("myroom-music")
      .uploadToSignedUrl(reservation.path, reservation.token, file, {
        contentType: mime,
      });
    if (error)
      throw Error("Загрузка прервана. Проверьте соединение и повторите позже.");
    return (
      await musicRequest<{ track: CloudTrack }>({ action: "complete", id })
    ).track;
  } catch (error) {
    // A completion response may have been lost. Recover ready tracks before cancelling.
    const snapshot = await musicRequest<CloudSnapshot>({
      action: "load",
    }).catch(() => null);
    const ready = snapshot?.tracks.find((t) => t.id === id);
    if (ready) return ready;
    await musicRequest({ action: "delete", id }).catch(() => {});
    throw error;
  }
}

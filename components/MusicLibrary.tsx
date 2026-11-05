"use client";
import { useEffect, useRef, useState } from "react";
import {
  Cloud, MoreHorizontal, SkipBack, SkipForward,
  Upload,
  Music2,
  Plus,
  Trash2,
  Clock3,
  Play,
  Pause,
  ChevronUp,
  X,
  HardDrive,
  ListPlus,
} from "lucide-react";
import { useMusic } from "@/lib/use-music";
import Select from "./Select";
function mm(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
export default function MusicLibrary({
  music,
}: {
  music: ReturnType<typeof useMusic>;
}) {
  const file = useRef<HTMLInputElement>(null);
  const [playlistName, setPlaylistName] = useState("");
  const [addingTrack, setAddingTrack] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  useEffect(() => {
    const dismiss = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      document.querySelectorAll<HTMLDetailsElement>(".track-more[open]").forEach(menu => {
        if (event instanceof KeyboardEvent || !menu.contains(event.target as Node)) {
          if (event instanceof KeyboardEvent) { event.preventDefault(); event.stopPropagation(); }
          menu.open = false;
          if (event instanceof KeyboardEvent) menu.querySelector<HTMLElement>("summary")?.focus();
        }
      });
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismiss, true);
    };
  }, []);
  const editing = !music.loaded || music.saving || music.uploading;
  const selectedList =
    music.music.playlists.find((p) => p.id === music.music.selectedPlaylist) ??
    music.music.playlists[0];
  const listTracks = selectedList.trackIds
    .map((id) => music.music.tracks.find((t) => t.id === id))
    .filter((t) => !!t);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">САУНДТРЕК ТВОЕГО ДНЯ</div>
          <h1>Моя музыка.</h1>
          <p>Любимые треки рядом. Музыка продолжит играть, пока ты занят в другой вкладке.</p>
        </div>
        <button
          className="button primary"
          disabled={music.uploading || music.saving || !music.loaded}
          onClick={() => file.current?.click()}
        >
          <Upload size={16}  strokeWidth={1.75}/>
          {music.uploading ? "Добавляем…" : "Загрузить музыку"}
        </button>
      </div>
      <p role="status" className="music-cloud-badge"><Cloud size={16} strokeWidth={1.75} aria-hidden="true"/>
        {music.loadError
          ? "Коллекция недоступна. Проверьте соединение."
          : !music.loaded
            ? "Открываем коллекцию…"
            : music.saving
              ? "Сохраняем плейлисты…"
              : music.cloud
                ? "Личная облачная коллекция"
                : "Коллекция на этом устройстве"}{" "}
        {music.loadError && (
          <button className="button" onClick={music.retry}>
            Повторить
          </button>
        )}
      </p>
      <input
        hidden
        ref={file}
        type="file"
        accept=".mp3,.wav"
        multiple
        onChange={(e) => {
          void music.upload(e.target.files);
          e.target.value = "";
        }}
      />
      <section className="music-now" aria-label="Сейчас играет" data-playing={music.playing}>
        <div className="vinyl-art" aria-hidden="true"><div className="vinyl-disc"/><div className="vinyl-sleeve"><Music2 size={36} strokeWidth={1.25}/></div></div>
        <div className="music-now-copy">
          <h2>{music.current.title}</h2>
          <p>{music.current.builtin ? "MyRoom · оригинальная мелодия" : "Твоя коллекция"}</p>
          <div className="music-now-progress"><span>{mm(music.position)}</span><progress aria-label="Прогресс трека" value={music.position} max={music.current.duration || 1}/><span>{mm(music.current.duration)}</span></div>
          <div className="music-now-controls">
            <button className="icon-button" aria-label="Предыдущий трек" onClick={()=>music.next(-1)}><SkipBack size={20} strokeWidth={1.75}/></button>
            <button className="button primary" aria-label={music.playing ? "Приостановить" : "Воспроизвести"} onClick={()=>music.play(music.current.id)}>{music.playing ? <Pause size={20} strokeWidth={1.75}/> : <Play size={20} strokeWidth={1.75}/>}</button>
            <button className="icon-button" aria-label="Следующий трек" onClick={()=>music.next(1)}><SkipForward size={20} strokeWidth={1.75}/></button>
          </div>
        </div>
      </section>
      <div className="music-layout">
        <section className="playlist-panel tabular-nums">
          <div className="section-heading">
            <h3>Плейлисты</h3>
            <Music2 size={16}  strokeWidth={1.75}/>
          </div>
          <div className="playlist-chips">{music.music.playlists.map((p) => (
            <button
              key={p.id}
              className={`playlist-link ${selectedList.id === p.id ? "active" : ""}`}
              disabled={editing}
              onClick={() =>
                music.setMusic((s) => ({
                  ...s,
                  selectedPlaylist: p.id,
                }))
              }
            >
              <span className="playlist-envelope" aria-hidden="true"><span className="vinyl-disc"/><span className="vinyl-sleeve"><Music2 size={28} strokeWidth={1.25}/></span></span>
              <span>{p.name}</span>
              <small>{p.trackIds.length} треков · {Math.floor(music.music.tracks.filter(t=>p.trackIds.includes(t.id)).reduce((n,t)=>n+t.duration,0)/60)} мин</small>
            </button>
          ))}
          <details className="playlist-create"><summary><Plus size={24} strokeWidth={1.75}/><span>Новый плейлист</span></summary>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!playlistName.trim() || editing) return;
              const id = crypto.randomUUID();
              music.setMusic((s) => ({
                ...s,
                playlists: [
                  ...s.playlists,
                  { id, name: playlistName.trim(), trackIds: [] },
                ],
                selectedPlaylist: id,
              }));
              setPlaylistName("");
            }}
          >
            <label className="input-label" htmlFor="playlist-name">
              Новый плейлист
            </label>
            <div className="inline-input">
              <input
                id="playlist-name"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                maxLength={60}
                disabled={editing}
                placeholder="Например, для вечера"
              />
              <button aria-label="Создать плейлист" type="submit" disabled={editing || !playlistName.trim()}>
                <Plus size={16}  strokeWidth={1.75}/>
              </button>
            </div>
          </form></details></div>
          <p className="storage-note">
            <HardDrive size={16}  strokeWidth={1.75}/>
            {music.cloud
              ? "Музыка и плейлисты доступны после входа на других устройствах. Статистика прослушивания пока хранится здесь."
              : "Музыка и статистика хранятся на этом устройстве. Войдите в аккаунт для облачной коллекции."}
          </p>
        </section>
        <section
          className="track-panel tabular-nums"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
          data-dragover={dragOver}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void music.upload(e.dataTransfer.files);
          }}
        >
          <div className="playlist-heading tabular-nums">
            <div className="album-art large" aria-hidden="true">
              <div className="record-disc" />
            </div>
            <div>
              <span className="eyebrow">{selectedList.id === "all" ? "ВСЕ ТВОИ ТРЕКИ" : "ЛИЧНЫЙ ПЛЕЙЛИСТ"}</span>
              <h2>{selectedList.name}</h2>
              <p>
                {listTracks.length} треков ·{" "}
                {Math.floor(
                  listTracks.reduce((a, t) => a + t.duration, 0) / 60,
                )}{" "}
                мин
              </p>
            </div>
            {selectedList.id !== "all" && (
              <button
                className="icon-button"
                aria-label="Удалить плейлист"
                disabled={editing}
                onClick={() =>
                  music.setMusic((s) => ({
                    ...s,
                    selectedPlaylist: "all",
                    playlists: s.playlists.filter(
                      (p) => p.id !== selectedList.id,
                    ),
                  }))
                }
              >
                <Trash2 size={16}  strokeWidth={1.75}/>
              </button>
            )}
          </div>
          <p className="playlist-guidance">
            {selectedList.id === "all"
              ? "Здесь хранятся все загруженные треки. Нажми «В плейлист» рядом с песней, чтобы добавить её в свою подборку."
              : `Новые загрузки попадут в «${selectedList.name}» и останутся в общей коллекции.`}
          </p>
          <div className="track-header">
            <span>#</span>
            <span>НАЗВАНИЕ</span>
            <Clock3 size={16}  strokeWidth={1.75}/>
            <span />
          </div>
          {listTracks.map((t, index) => (
            <div
              className={`track-row ${music.current?.id === t.id ? "current" : ""}`}
              data-playing={music.current?.id === t.id && music.playing}
              key={t.id}
            >
              <button
                className="track-play"
                aria-label={`${music.current?.id === t.id && music.playing ? "Приостановить" : "Воспроизвести"} ${t.title}`}
                onClick={() => music.play(t.id)}
              >
                <span className="track-number" aria-hidden="true">{index + 1}</span>
                {music.current?.id === t.id && <span className="track-equalizer" aria-hidden="true"><i/><i/><i/></span>}
                {music.current?.id === t.id && music.playing ? (
                  <Pause size={16}  strokeWidth={1.75}/>
                ) : (
                  <Play size={16}  strokeWidth={1.75}/>
                )}
              </button>
              <div className="track-mini-art" aria-hidden="true"><div className="record-disc"/></div>
              <div className="track-title">
                <strong>{t.title}</strong>
                <small>
                  {t.builtin
                    ? "MyRoom · оригинальная мелодия"
                    : "Твоя коллекция"}
                </small>
              </div>
              <span>{mm(t.duration)}</span>
              <div className="track-actions"><div className="track-context-action">                {selectedList.id === "all" && (
                  <button className="playlist-add" disabled={editing}
                    aria-label={`Добавить ${t.title} в плейлист`} aria-expanded={addingTrack === t.id}
                    aria-controls={`playlist-picker-${t.id}`} onClick={() => setAddingTrack(addingTrack === t.id ? null : t.id)}>
                    <ListPlus size={16} strokeWidth={1.75} aria-hidden="true" /><span>В плейлист</span>
                  </button>
                )}
{selectedList.id !== "all" && (                    <button
                      aria-label="Убрать из плейлиста"
                      disabled={editing}
                      onClick={() =>
                        music.setMusic((s) => ({
                          ...s,
                          playlists: s.playlists.map((p) =>
                            p.id === selectedList.id
                              ? {
                                  ...p,
                                  trackIds: p.trackIds.filter(
                                    (id) => id !== t.id,
                                  ),
                                }
                              : p,
                          ),
                        }))
                      }
                    >
                      <X size={16} strokeWidth={1.75}/><span>Убрать из плейлиста</span>
                    </button>
)}</div><details className="track-more" onClick={e=>{ if ((e.target as HTMLElement).closest("button")) e.currentTarget.open=false; }}><summary aria-label={`Действия: ${t.title}`}><MoreHorizontal size={20} strokeWidth={1.75}/></summary><div className="track-menu"><button className="track-menu-play" onClick={()=>music.play(t.id)}>{music.current.id === t.id && music.playing ? <Pause size={16} strokeWidth={1.75}/> : <Play size={16} strokeWidth={1.75}/>}<span>{music.current.id === t.id && music.playing ? "Приостановить" : "Воспроизвести"}</span></button>
                {selectedList.id === "all" && (
                  <button className="playlist-add" disabled={editing}
                    aria-label={`Добавить ${t.title} в плейлист`} aria-expanded={addingTrack === t.id}
                    aria-controls={`playlist-picker-${t.id}`} onClick={() => setAddingTrack(addingTrack === t.id ? null : t.id)}>
                    <ListPlus size={16} strokeWidth={1.75} aria-hidden="true" /><span>В плейлист</span>
                  </button>
                )}
                {selectedList.id !== "all" && (
                  <>
                    <button
                      aria-label="Выше"
                      disabled={editing || index === 0}
                      onClick={() =>
                        music.setMusic((s) => ({
                          ...s,
                          playlists: s.playlists.map((p) => {
                            if (p.id !== selectedList.id) return p;
                            const ids = [...p.trackIds];
                            [ids[index - 1], ids[index]] = [
                              ids[index],
                              ids[index - 1],
                            ];
                            return { ...p, trackIds: ids };
                          }),
                        }))
                      }
                    >
                      <ChevronUp size={16} strokeWidth={1.75}/><span>Выше</span>
                    </button>
                    <button
                      aria-label="Убрать из плейлиста"
                      disabled={editing}
                      onClick={() =>
                        music.setMusic((s) => ({
                          ...s,
                          playlists: s.playlists.map((p) =>
                            p.id === selectedList.id
                              ? {
                                  ...p,
                                  trackIds: p.trackIds.filter(
                                    (id) => id !== t.id,
                                  ),
                                }
                              : p,
                          ),
                        }))
                      }
                    >
                      <X size={16} strokeWidth={1.75}/><span>Убрать из плейлиста</span>
                    </button>
                  </>
                )}
                {!t.builtin && (
                  <button
                    className="track-delete" aria-label={`Удалить ${t.title}`}
                    disabled={editing}
                    onClick={() => music.remove(t.id)}
                  >
                    <Trash2 size={16} strokeWidth={1.75}/><span>Удалить {t.title}</span>
                  </button>
                )}
              </div></details></div>
              {selectedList.id === "all" && addingTrack === t.id && (
                <div className="track-playlist-picker" id={`playlist-picker-${t.id}`}>
                  {music.music.playlists.length > 1 ? (
                    <label>Добавить в подборку
                      <Select value="" disabled={editing} aria-label={`Плейлист для ${t.title}`}
                        onValueChange={value => { if (value) music.addToPlaylist(t.id, value); }}
                        options={[
                          {value:'',label:'Выбери плейлист',disabled:true},
                          ...music.music.playlists.filter(p => p.id !== "all").map(p => ({
                            value:p.id,label:p.name+(p.trackIds.includes(t.id)?' · уже добавлен':''),disabled:p.trackIds.includes(t.id),
                          })),
                        ]}/>
                    </label>
                  ) : <p>Создай плейлист в разделе «Плейлисты», затем добавь сюда трек.</p>}
                  <small>{music.music.playlists.filter(p => p.id !== "all" && p.trackIds.includes(t.id)).map(p => p.name).join(" · ") || "Оригинал останется в «Моей коллекции»."}</small>
                </div>
              )}
            </div>
          ))}
          {selectedList.id !== "all" && (
            <label className="add-track-select">
              Добавить из коллекции
              <Select value="" disabled={editing} aria-label="Добавить из коллекции"
                onValueChange={id => { if (id) music.addToPlaylist(id, selectedList.id); }}
                options={[
                  {value:'',label:'Выберите трек',disabled:true},
                  ...music.music.tracks.filter(t => !selectedList.trackIds.includes(t.id)).map(t => ({value:t.id,label:t.title})),
                ]}/>
            </label>
          )}
          {listTracks.length === 0 && <p className="playlist-guidance">Подборка пока пуста. Добавь трек из коллекции выше или загрузи новый файл.</p>}
          <button className="dropzone" disabled={editing} onClick={() => file.current?.click()}>
            <svg className="upload-marching-border" aria-hidden="true"><rect width="100%" height="100%" rx="16" pathLength="100"/></svg>
            <Upload size={16}  strokeWidth={1.75}/>
            <strong>Перетащи сюда свою музыку</strong>
            <span>MP3 или WAV · до 50 МБ на трек · {selectedList.id === "all" ? "в общую коллекцию" : `в «${selectedList.name}»`}</span>
          </button>
        </section>
      </div>
    </>
  );
}

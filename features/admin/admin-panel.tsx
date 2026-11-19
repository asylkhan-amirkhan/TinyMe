"use client";

import { browserId } from '@/lib/browser-id';
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import RoomDock from "@/components/RoomDock";
import { workshopCatalogEvent } from "@/domain/workshop-catalog";
import Image from "next/image";
import { prepareWorkshopImage } from '@/lib/workshop-image';
import { inspectWorkshopAudio, loadWorkshopTracks, saveWorkshopTrack, workshopAudio, type WorkshopTrack } from '@/lib/workshop-music';
import styles from "./admin-panel.module.css";
import { Coin, Icon } from "@/components/ui/icon";
import { PixelItem } from "@/components/ui/pixel-item";
import { catalog as initialCatalog, categories, type ItemKind } from "@/config/demo";
import { parseWorkshop, type WorkshopItem, type WorkshopCollection as Collection } from '@/domain/workshop';

const storageKey = "tinyme:workshop:v1";
type Track = WorkshopTrack;
type Section = "items" | "music";
const fieldClass = styles.field;
const labelClass = styles.label;
const illustrations: { value: ItemKind; label: string }[] = [
  { value: "plant", label: "Растение" }, { value: "lamp", label: "Торшер" },
  { value: "shelf", label: "Стеллаж" }, { value: "armchair", label: "Кресло" },
  { value: "sofa", label: "Диван" }, { value: "sculpture", label: "Фигурка" },
  { value: "bed", label: "Кровать" }, { value: "desk", label: "Стол" }, { value: "chair", label: "Стул" },
];

export function AdminPanel() {
  const [message, setMessage] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const previewAudio = useRef<HTMLAudioElement>(null);
  const savingTrack = useRef(false);
  useEffect(() => {
    let cancelled = false;
    void loadWorkshopTracks().then(value => { if (!cancelled) setTracks(value); }).catch(() => { if (!cancelled) setMessage('Не удалось открыть музыкальную коллекцию.'); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const element = previewAudio.current;
    if (element) element.src = url;
    return () => { element?.pause(); element?.removeAttribute('src'); element?.load(); URL.revokeObjectURL(url); };
  }, [audioBlob]);
  const [catalog, setCatalog] = useState<WorkshopItem[]>(initialCatalog);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const uploadVersion = useRef(0);
  const [collectionFilter, setCollectionFilter] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [collectionTitle, setCollectionTitle] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [editingCollection, setEditingCollection] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const data = parseWorkshop(raw);
        setCatalog(data.items); setCollections(data.collections);
      }
    } catch { setMessage("Не удалось прочитать мастерскую. Сохранение заменит повреждённые данные."); }
    setLoaded(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  function persist(items: WorkshopItem[], groups: Collection[]) {
    try {
      const serialized = JSON.stringify({version: 1, items, collections: groups});
      parseWorkshop(serialized);
      localStorage.setItem(storageKey, serialized);
      window.dispatchEvent(new Event(workshopCatalogEvent));
      setCatalog(items); setCollections(groups); setMessage("Сохранено на этом устройстве."); return true;
    } catch { setMessage("Не удалось сохранить. Возможно, память браузера заполнена. Удалите часть изображений и повторите."); return false; }
  }
  async function saveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loaded || uploading || savingTrack.current) return;
    const data = new FormData(event.currentTarget);
    if (!title.trim()) { setMessage("Укажите название вещи."); titleInput.current?.focus(); return; }
    if (section === 'music') {
      if (!audioFile && !editingId) { setMessage('Выберите аудиофайл.'); return; }
      savingTrack.current = true; setUploading(true);
      try {
        const seconds = audioFile ? await inspectWorkshopAudio(audioFile) : editedTrack?.seconds;
        if (!seconds) throw Error('Выберите аудиофайл.');
        const track: Track = {id:editingId ?? 'workshop-track:' + browserId(),title:title.trim(),artist:String(data.get('artist') ?? '').trim(),genre:String(data.get('genre') ?? 'Lo-fi'),description:String(data.get('description') ?? '').trim(),color,seconds,duration:Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0'),size:audioFile?.size ?? editedTrack?.size ?? 0};
        await saveWorkshopTrack(track, audioFile ?? undefined);
        setTracks(old => [...old.filter(t => t.id !== track.id), track]);
        resetEditor(); editorDialog.current?.close(); setQuery('');
        setMessage('Трек сохранён и доступен в музыке комнаты.');
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Не удалось сохранить трек. Проверьте свободное место в браузере.'); }
      finally { savingTrack.current = false; setUploading(false); }
      return;
    }
    const item: WorkshopItem = { id: editingId ?? browserId(), title: title.trim(), description: String(data.get("description") ?? "").trim(), category: String(data.get("category")), illustration: kind, color, width: Number(data.get("width")), depth: Number(data.get("depth")), price: Number(data.get("price")), purchasable: data.has("purchasable"), images, collectionId: collectionId || undefined };
    if (![item.width, item.depth, item.price].every(Number.isInteger) || item.width < 1 || item.width > 12 || item.depth < 1 || item.depth > 8 || item.price < 0 || item.price > 1000000) { setMessage("Проверьте размеры и цену."); return; }
    if (persist(editingId ? catalog.map(old => old.id === editingId ? item : old) : [...catalog, item], collections)) { resetEditor(); editorDialog.current?.close(); setQuery(""); setCategory("Все категории"); setCollectionFilter(""); }
  }
  async function upload(files: FileList | null) {
    if (!files?.length || uploading) return;
    const selected = Array.from(files);
    if (images.length + selected.length > 4 || selected.some(file => !["image/png", "image/webp", "image/jpeg"].includes(file.type) || file.size > 10 * 1024 * 1024)) { setMessage("Можно добавить до 4 изображений PNG, JPEG или WebP, до 10 МБ каждое."); return; }
    const version = ++uploadVersion.current;
    setUploading(true);
    try {
      const urls = await Promise.all(selected.map(prepareWorkshopImage));
      if (uploadVersion.current === version) { setImages(old => [...old, ...urls]); setFileName(selected.map(file => file.name).join(", ")); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Не удалось прочитать изображение."); }
    finally { if (uploadVersion.current === version) setUploading(false); }
  }
  const [section, setSection] = useState<Section>("items");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все категории");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ItemKind>("plant");
  const [color, setColor] = useState("#edf1e6");
  const [fileName, setFileName] = useState("");
  const titleInput = useRef<HTMLInputElement>(null);
  const editorDialog = useRef<HTMLDialogElement>(null);
  function openEditor() { editorDialog.current?.showModal(); requestAnimationFrame(() => titleInput.current?.focus()); }
  const needle = query.trim().toLocaleLowerCase("ru");
  const items = catalog.filter(item => (!collectionFilter || item.collectionId === collectionFilter) && item.title.toLocaleLowerCase("ru").includes(needle) && (category === "Все категории" || item.category === category));
  const music = tracks.filter(track => `${track.title} ${track.artist}`.toLocaleLowerCase("ru").includes(needle));
  const editedItem = catalog.find(item => item.id === editingId);
  const editedTrack = tracks.find(track => track.id === editingId);

  function resetEditor() {
    uploadVersion.current++; setUploading(false); setAudioFile(null); setAudioBlob(null); setImages([]); setCollectionId("");
    setEditingId(null);
    setTitle("");
    setKind("plant");
    setColor("#edf1e6");
    setFileName("");
    setEditorKey(key => key + 1);
  }

  function changeSection(next: Section) {
    setSection(next);
    setQuery("");
    setCategory("Все категории");
    resetEditor();
  }

  function edit(entry: WorkshopItem | Track) {
    setAudioFile(null); setAudioBlob(null);
    uploadVersion.current++; setUploading(false);
    setImages("illustration" in entry ? entry.images ?? [] : []);
    setCollectionId("illustration" in entry ? entry.collectionId ?? "" : "");
    setEditingId(entry.id);
    setTitle(entry.title);
    setColor(entry.color);
    if ("illustration" in entry) setKind(entry.illustration);
    setFileName("");
    setEditorKey(key => key + 1);
    openEditor();
    if (!('illustration' in entry)) {
      const version = uploadVersion.current;
      void workshopAudio(entry.id).then(blob => { if (uploadVersion.current === version) setAudioBlob(blob ?? null); }).catch(() => setMessage('Не удалось прочитать аудиофайл.'));
    }
  }

  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.brand}><span className={styles.brandMark}><Icon name="room"/></span>tiny me<span className={styles.brandDot}>.</span><span className={styles.divider}/><span className={styles.workspace}>Мастерская</span></Link>
      <Link href="/room" className={styles.back}>В комнату <ArrowUpRight/></Link>
    </header>

    <section className={styles.heading}>
      <div><h1>Мастерская</h1><p className={styles.intro}>Управление вещами и коллекциями</p></div>
    </section>

    <div className={styles.stats}>
      {[{ label: "Вещи в каталоге", value: catalog.length, icon: "box", note: "Детали для уютной комнаты", tone: "peach" }, { label: "Музыкальная коллекция", value: tracks.length, icon: "music", note: "Звучание спокойных моментов", tone: "lavender" }, { label: "Категории", value: categories.length, icon: "grid", note: "Всё на своём месте", tone: "sage" }].map(stat => <article key={stat.label} className={styles.stat}><div><p>{stat.label}</p><strong>{String(stat.value).padStart(2, "0")}</strong><small>{stat.note}</small></div><span className={styles.statIcon} data-tone={stat.tone}><Icon name={stat.icon}/></span></article>)}
    </div>

    {message && <p role="status" className={styles.feedback}><Icon name="info"/>{message}</p>}
    <details className={styles.collectionManager}><summary className={styles.collectionSummary}><span className={styles.collectionSummaryIcon}><Icon name="box"/></span><span><strong>Коллекции вещей</strong><small>Объединяй предметы в свои наборы</small></span><span className={styles.collectionCount}>{collections.length}</span><span className={styles.collectionExpand}>Управление <span aria-hidden="true">⌄</span></span></summary><div className={styles.collectionContent}>
      <form onSubmit={event => { event.preventDefault(); if (!collectionTitle.trim()) return; if (collections.some(c => c.id !== editingCollection && c.title.toLocaleLowerCase() === collectionTitle.trim().toLocaleLowerCase())) { setMessage("Коллекция с таким названием уже существует."); return; } const entry = {id: editingCollection ?? browserId(), title: collectionTitle.trim(), description: collectionDescription.trim()}; if (persist(catalog, editingCollection ? collections.map(c => c.id === editingCollection ? entry : c) : [...collections, entry])) { setEditingCollection(null); setCollectionTitle(""); setCollectionDescription(""); } }}>
        <label className={labelClass}>Название коллекции<input required maxLength={100} className={fieldClass} value={collectionTitle} onChange={event => setCollectionTitle(event.target.value)}/></label>
        <label className={labelClass}>Описание коллекции<input maxLength={500} className={fieldClass} value={collectionDescription} onChange={event => setCollectionDescription(event.target.value)}/></label>
        <button disabled={!loaded} className={styles.primary}>{editingCollection ? "Сохранить коллекцию" : "Создать коллекцию"}</button>
        {editingCollection && <button type="button" onClick={() => { setEditingCollection(null); setCollectionTitle(""); setCollectionDescription(""); }}>Отмена</button>}
      </form>
      {collections.length === 0 && <p>Пока нет коллекций. Создайте первую и выберите её в редакторе вещи.</p>}
      {collections.map(c => <article key={c.id}><div><strong>{c.title}</strong><p>{c.description}</p><small>{catalog.filter(item => item.collectionId === c.id).length} вещей</small></div><button type="button" onClick={() => { setEditingCollection(c.id); setCollectionTitle(c.title); setCollectionDescription(c.description); }}>Изменить</button><button type="button" onClick={() => { if (!window.confirm(`Удалить коллекцию «${c.title}»? Вещи останутся в каталоге.`)) return; if (persist(catalog.map(item => item.collectionId === c.id ? {...item, collectionId: undefined} : item), collections.filter(group => group.id !== c.id))) { if (collectionFilter === c.id) setCollectionFilter(""); if (collectionId === c.id) setCollectionId(""); if (editingCollection === c.id) { setEditingCollection(null); setCollectionTitle(""); setCollectionDescription(""); } } }}>Удалить</button></article>)}
    </div></details>
    <div className={styles.layout}>
      <section className={styles.collection} aria-label="Коллекция">
        <div className={styles.collectionHeader}>
          <div className={styles.tabs} aria-label="Разделы админ-панели">
            {([{ id: "items", label: "Вещи", icon: "box", count: catalog.length }, { id: "music", label: "Музыка", icon: "music", count: tracks.length }] as const).map(tab => <button key={tab.id} type="button" aria-pressed={section === tab.id} onClick={() => changeSection(tab.id)}><Icon name={tab.icon}/>{tab.label}<span>{tab.count}</span></button>)}
          </div>
          <span className={styles.collectionCaption}>Твоя маленькая коллекция</span>
        </div>
        <div className={styles.toolbar}>
          {section === "items" && <label>Коллекция<select className={styles.filter} value={collectionFilter} onChange={event => setCollectionFilter(event.target.value)}><option value="">Все коллекции</option>{collections.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>}
          <label className={styles.search}><Icon name="search"/><span className={styles.srOnly}>Поиск по коллекции</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={section === "items" ? "Найти вещь в коллекции…" : "Название или исполнитель…"}/></label>
          {section === "items" && <label><span className={styles.srOnly}>Категория вещей</span><select value={category} onChange={event => setCategory(event.target.value)} className={styles.filter}><option>Все категории</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label>}
        </div>
        <div className={styles.results}><p>{section === "items" ? "Каталог вещей" : "Музыкальная полка"}<span>{section === "items" ? items.length : music.length}</span></p><button type="button" onClick={() => { resetEditor(); openEditor(); }} className={styles.primary}><Icon name="plus"/>{section === "items" ? "Новая вещь" : "Новый трек"}</button></div>
        {section === "items" ? <div className={styles.cards}>{items.map(item => <article key={item.id} className={styles.item} data-selected={editingId === item.id}>
          <div className={styles.artwork} style={{ backgroundColor: item.color }}><span className={styles.category}>{item.category}</span>{item.images?.[0] ? <Image unoptimized width={120} height={120} className={styles.customImage} src={item.images[0]} alt={item.title}/> : <PixelItem kind={item.illustration}/>}<span className={styles.itemNumber}>#{String(catalog.indexOf(item) + 1).padStart(3, "0")}</span></div>
          <div className={styles.itemBody}><h2>{item.title}</h2><p>{item.description}</p><div className={styles.itemMeta}><span>{item.width} × {item.depth} клетки</span><span className={styles.price}>{item.purchasable ? <><Coin/>{item.price}</> : "Стартовый набор"}</span></div><button type="button" onClick={() => edit(item)} className={styles.edit}><Icon name="edit"/>Редактировать<span className={styles.srOnly}>: {item.title}</span><Icon name="arrow"/></button></div>
        </article>)}</div> : <div className={styles.tracks}>{music.map((track, index) => <article key={track.id} className={styles.track} data-selected={editingId === track.id}>
          <div className={styles.trackTop}><span className={styles.cover} style={{ backgroundColor: track.color }}><Icon name="music"/></span><div><h2>{track.title}</h2><p>{track.artist} · {track.genre}</p></div><time>{track.duration}</time></div>
          <div className={styles.waveform} aria-hidden="true">{Array.from({ length: 56 }, (_, bar) => <span key={bar} style={{ height: `${20 + ((bar * 17 + index * 13) % 80)}%` }}/>)}</div>
          <div className={styles.trackBottom}><span>{track.genre}</span><button type="button" onClick={() => edit(track)} className={styles.edit}><Icon name="edit"/>Редактировать<span className={styles.srOnly}>: {track.title}</span></button></div>
        </article>)}</div>}
        {(section === "items" ? items.length : music.length) === 0 && <div className={styles.empty}><Icon name="search"/><h2>Ничего не нашлось</h2><p>Попробуй другое название или сбрось фильтры.</p><button type="button" className={styles.edit} onClick={() => { setQuery(""); setCategory("Все категории"); setCollectionFilter(""); }}>Сбросить поиск</button></div>}
        <p className={styles.collectionFooter}><Icon name="leaf"/>Большой уют начинается с маленьких деталей.</p>
      </section>
      <dialog ref={editorDialog} className={styles.editor} aria-labelledby="editor-title" onClose={() => { editorDialog.current?.querySelector('audio')?.pause(); }}>
        <div className={styles.editorHeader}><span className={styles.editorIcon}><Icon name={editingId ? "edit" : "plus"}/></span><div><p className={styles.eyebrow}>РЕДАКТОР КОЛЛЕКЦИИ</p><h2 id="editor-title">{editingId ? "Редактирование" : section === "items" ? "Новая вещь" : "Новый трек"}</h2></div><button type="button" className={styles.closeEditor} aria-label="Закрыть редактор" onClick={() => editorDialog.current?.close()}><X size={20}/></button></div>
        <form key={`${section}-${editorKey}`} onSubmit={saveItem} className={styles.form}>
          {message && <p role="status" className={styles.editorMessage}>{message}</p>}
          <div className={styles.preview} style={{ backgroundColor: color }}><span>ПРЕДПРОСМОТР</span>{section === "items" ? (images[0] ? <Image unoptimized width={120} height={120} className={styles.customImage} src={images[0]} alt={title || "Предпросмотр вещи"}/> : <PixelItem kind={kind}/>) : <Icon name="music"/>}<p>{title.trim() || (section === "items" ? "Твоя новая деталь уюта" : "Звучание твоей комнаты")}</p></div>
          <label className={styles.upload}><Icon name="upload"/><strong>{section === "items" ? "Добавить фото вещи" : "Выбрать аудиофайл"}</strong><span>{section === "items" ? "PNG, JPEG, WebP · до 4 файлов по 10 МБ" : "MP3, WAV, OGG · до 50 МБ"}</span><input type="file" disabled={uploading} multiple={section === "items"} accept={section === "items" ? "image/png,image/webp,image/jpeg" : ".mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg"} onChange={event => { if (section === "items") void upload(event.target.files); else { const file = event.target.files?.[0]; if (file) { setAudioFile(file); setAudioBlob(file); setFileName(file.name); } } event.target.value = ""; }}/><small role="status">{uploading ? "Чтение файлов…" : fileName || (section === "items" ? "Большие картинки уменьшим автоматически. PNG и WebP сохранят прозрачность." : "Файл будет доступен в музыке комнаты")}</small></label>
          {section === "items" && images.map((src, index) => <div key={index} className={styles.imageRow}><Image unoptimized width={120} height={120} src={src} alt={`Изображение ${index + 1}`} className={styles.customImage}/><div><button type="button" disabled={index === 0 || uploading} onClick={() => setImages(old => [old[index], ...old.filter((_, i) => i !== index)])}>{index === 0 ? 'Главное изображение' : 'Сделать главным'}</button><button type="button" disabled={uploading} onClick={() => setImages(old => old.filter((_, i) => i !== index))}>Удалить</button></div></div>)}
          {section === 'music' && audioBlob && <audio ref={previewAudio} controls preload="metadata" aria-label="Предпрослушивание трека" style={{width:'100%'}}/>}
          <label className={labelClass}>Название<input required ref={titleInput} value={title} onChange={event => setTitle(event.target.value)} maxLength={100} placeholder={section === "items" ? "Например, маленький фикус" : "Например, вечер в комнате"} className={fieldClass}/></label>
          {section === "items" ? <>
            <label className={labelClass}>Категория<select name="category" defaultValue={editedItem?.category ?? categories[0]} className={fieldClass}>{categories.map(value => <option key={value}>{value}</option>)}</select></label>
            <label className={labelClass}>Описание<textarea name="description" maxLength={2000} rows={3} defaultValue={editedItem?.description ?? ""} className={fieldClass}/></label>
            <label className={labelClass}>Коллекция<select value={collectionId} onChange={event => setCollectionId(event.target.value)} className={fieldClass}><option value="">Без коллекции</option>{collections.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
            <label className={labelClass}>Форма мебели в комнате<select value={kind} onChange={event => setKind(event.target.value as ItemKind)} className={fieldClass}>{illustrations.map(value => <option key={value.value} value={value.value}>{value.label}</option>)}</select></label>
            <div className={styles.fieldRow}><label className={labelClass}>Ширина, клетки<input name="width" required type="number" step="1" min="1" max="12" defaultValue={editedItem?.width ?? 1} className={fieldClass}/></label><label className={labelClass}>Глубина, клетки<input name="depth" required type="number" step="1" min="1" max="8" defaultValue={editedItem?.depth ?? 1} className={fieldClass}/></label></div>
            <label className={labelClass}>Цена в монетах<input name="price" required type="number" step="1" max="1000000" min="0" defaultValue={editedItem?.price ?? 10} className={fieldClass}/></label>
            <label className={styles.checkbox}><input name="purchasable" type="checkbox" defaultChecked={editedItem?.purchasable ?? true}/>Доступна в магазине</label>
          </> : <>
            <label className={labelClass}>Исполнитель<input name="artist" maxLength={100} defaultValue={editedTrack?.artist ?? ""} placeholder="Имя автора" className={fieldClass}/></label>
            <label className={labelClass}>Жанр<select name="genre" defaultValue={editedTrack?.genre ?? "Lo-fi"} className={fieldClass}>{["Lo-fi", "Эмбиент", "Пиано", "Звуки природы"].map(value => <option key={value}>{value}</option>)}</select></label>
            <label className={labelClass}>Описание<textarea name="description" maxLength={2000} defaultValue={editedTrack?.description ?? ""} rows={3} placeholder="Какое настроение создаёт этот трек?" className={fieldClass}/></label>
          </>}
          <label className={styles.colorLabel}>Цвет фона превью<input type="color" value={color} onChange={event => setColor(event.target.value)}/></label>
          <div className={styles.saveArea}><button type="submit" disabled={!loaded || uploading} aria-describedby="save-note" className={styles.save}><Icon name="plus"/>{editingId ? "Сохранить изменения" : section === "items" ? "Добавить в коллекцию" : "Добавить трек"}</button><p id="save-note">{section === "items" ? "Сохранение на устройстве. Первая картинка — обложка вещи." : "Трек сохраняется в этом браузере и появляется в музыке комнаты."}</p><button type="button" onClick={resetEditor} className={styles.reset}>Сбросить форму</button></div>
        </form>
      </dialog>
    </div>
    <footer className={styles.notice}><Icon name="info"/><p><strong>Ваша локальная мастерская.</strong> Вещи и коллекции сохраняются в этом браузере. Вещи с отметкой «Доступна в магазине» видны пользователям этого браузера. После покупки их можно разместить в комнате.</p><span>TINY ME ? STUDIO</span></footer>
    <RoomDock active="admin"/>
  </main>;
}

"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import styles from "./admin-panel.module.css";
import { Coin, Icon } from "@/components/ui/icon";
import { PixelItem } from "@/components/ui/pixel-item";
import { catalog, categories, type CatalogItem, type ItemKind } from "@/config/demo";

const tracks = [
  { id: "quiet-morning", title: "Тихое утро", artist: "TinyMe Sounds", genre: "Lo-fi", duration: "3:24", color: "#e8eedf" },
  { id: "rainy-window", title: "Дождь за окном", artist: "TinyMe Sounds", genre: "Эмбиент", duration: "5:12", color: "#e4ebef" },
  { id: "warm-light", title: "Тёплый свет", artist: "TinyMe Sounds", genre: "Пиано", duration: "2:48", color: "#f6efdf" },
];
type Track = (typeof tracks)[number];
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
  const needle = query.trim().toLocaleLowerCase("ru");
  const items = catalog.filter(item => item.title.toLocaleLowerCase("ru").includes(needle) && (category === "Все категории" || item.category === category));
  const music = tracks.filter(track => `${track.title} ${track.artist}`.toLocaleLowerCase("ru").includes(needle));
  const editedItem = catalog.find(item => item.id === editingId);
  const editedTrack = tracks.find(track => track.id === editingId);

  function resetEditor() {
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

  function edit(entry: CatalogItem | Track) {
    setEditingId(entry.id);
    setTitle(entry.title);
    setColor(entry.color);
    if ("illustration" in entry) setKind(entry.illustration);
    setFileName("");
    setEditorKey(key => key + 1);
    requestAnimationFrame(() => titleInput.current?.focus());
  }

  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.brand}><span className={styles.brandMark}><Icon name="room"/></span>tiny me<span className={styles.brandDot}>.</span><span className={styles.divider}/><span className={styles.workspace}>Мастерская</span></Link>
      <Link href="/" className={styles.back}>Вернуться в комнату <Icon name="arrow"/></Link>
    </header>

    <section className={styles.heading}>
      <div><p className={styles.eyebrow}>ЗА КУЛИСАМИ УЮТА</p><h1>Мастерская TinyMe<span>.</span></h1><p className={styles.intro}>Место, где появляются новые вещи и звучание твоей комнаты.</p></div>
      <span className={styles.demoBadge}><span/>Демонстрационный режим</span>
    </section>

    <div className={styles.stats}>
      {[{ label: "Вещи в каталоге", value: catalog.length, icon: "box", note: "Детали для уютной комнаты", tone: "peach" }, { label: "Музыкальная коллекция", value: tracks.length, icon: "music", note: "Звучание спокойных моментов", tone: "lavender" }, { label: "Категории", value: categories.length, icon: "grid", note: "Всё на своём месте", tone: "sage" }].map(stat => <article key={stat.label} className={styles.stat}><div><p>{stat.label}</p><strong>{String(stat.value).padStart(2, "0")}</strong><small>{stat.note}</small></div><span className={styles.statIcon} data-tone={stat.tone}><Icon name={stat.icon}/></span></article>)}
    </div>

    <div className={styles.layout}>
      <section className={styles.collection} aria-label="Коллекция">
        <div className={styles.collectionHeader}>
          <div className={styles.tabs} aria-label="Разделы админ-панели">
            {([{ id: "items", label: "Вещи", icon: "box", count: catalog.length }, { id: "music", label: "Музыка", icon: "music", count: tracks.length }] as const).map(tab => <button key={tab.id} type="button" aria-pressed={section === tab.id} onClick={() => changeSection(tab.id)}><Icon name={tab.icon}/>{tab.label}<span>{tab.count}</span></button>)}
          </div>
          <span className={styles.collectionCaption}>Твоя маленькая коллекция</span>
        </div>
        <div className={styles.toolbar}>
          <label className={styles.search}><Icon name="search"/><span className={styles.srOnly}>Поиск по коллекции</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={section === "items" ? "Найти вещь в коллекции…" : "Название или исполнитель…"}/></label>
          {section === "items" && <label><span className={styles.srOnly}>Категория вещей</span><select value={category} onChange={event => setCategory(event.target.value)} className={styles.filter}><option>Все категории</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label>}
        </div>
        <div className={styles.results}><p>{section === "items" ? "Каталог вещей" : "Музыкальная полка"}<span>{section === "items" ? items.length : music.length}</span></p><button type="button" onClick={() => { resetEditor(); requestAnimationFrame(() => titleInput.current?.focus()); }} className={styles.primary}><Icon name="plus"/>{section === "items" ? "Новая вещь" : "Новый трек"}</button></div>
        {section === "items" ? <div className={styles.cards}>{items.map(item => <article key={item.id} className={styles.item} data-selected={editingId === item.id}>
          <div className={styles.artwork} style={{ backgroundColor: item.color }}><span className={styles.category}>{item.category}</span><PixelItem kind={item.illustration}/><span className={styles.itemNumber}>#{String(catalog.indexOf(item) + 1).padStart(3, "0")}</span></div>
          <div className={styles.itemBody}><h2>{item.title}</h2><div className={styles.itemMeta}><span>{item.width} × {item.depth} клетки</span><span className={styles.price}>{item.purchasable ? <><Coin/>{item.price}</> : "Стартовый набор"}</span></div><button type="button" onClick={() => edit(item)} className={styles.edit}><Icon name="edit"/>Редактировать<span className={styles.srOnly}>: {item.title}</span><Icon name="arrow"/></button></div>
        </article>)}</div> : <div className={styles.tracks}>{music.map((track, index) => <article key={track.id} className={styles.track} data-selected={editingId === track.id}>
          <div className={styles.trackTop}><span className={styles.cover} style={{ backgroundColor: track.color }}><Icon name="music"/></span><div><h2>{track.title}</h2><p>{track.artist} · {track.genre}</p></div><time>{track.duration}</time></div>
          <div className={styles.waveform} aria-hidden="true">{Array.from({ length: 56 }, (_, bar) => <span key={bar} style={{ height: `${20 + ((bar * 17 + index * 13) % 80)}%` }}/>)}</div>
          <div className={styles.trackBottom}><span>Демо · {track.genre}</span><button type="button" onClick={() => edit(track)} className={styles.edit}><Icon name="edit"/>Редактировать<span className={styles.srOnly}>: {track.title}</span></button></div>
        </article>)}</div>}
        {(section === "items" ? items.length : music.length) === 0 && <div className={styles.empty}><Icon name="search"/><h2>Ничего не нашлось</h2><p>Попробуй другое название или сбрось фильтры.</p><button type="button" className={styles.edit} onClick={() => { setQuery(""); setCategory("Все категории"); }}>Сбросить поиск</button></div>}
        <p className={styles.collectionFooter}><Icon name="leaf"/>Большой уют начинается с маленьких деталей.</p>
      </section>
      <aside className={styles.editor} aria-labelledby="editor-title">
        <div className={styles.editorHeader}><span className={styles.editorIcon}><Icon name={editingId ? "edit" : "plus"}/></span><div><p className={styles.eyebrow}>РЕДАКТОР КОЛЛЕКЦИИ</p><h2 id="editor-title">{editingId ? "Редактирование" : section === "items" ? "Новая вещь" : "Новый трек"}</h2></div><span className={styles.draft}>Черновик</span></div>
        <form key={`${section}-${editorKey}`} onSubmit={event => event.preventDefault()} className={styles.form}>
          <div className={styles.preview} style={{ backgroundColor: color }}><span>ПРЕДПРОСМОТР</span>{section === "items" ? <PixelItem kind={kind}/> : <Icon name="music"/>}<p>{title.trim() || (section === "items" ? "Твоя новая деталь уюта" : "Звучание твоей комнаты")}</p></div>
          <label className={labelClass}>Название<input ref={titleInput} value={title} onChange={event => setTitle(event.target.value)} maxLength={100} placeholder={section === "items" ? "Например, маленький фикус" : "Например, вечер в комнате"} className={fieldClass}/></label>
          {section === "items" ? <>
            <label className={labelClass}>Категория<select defaultValue={editedItem?.category ?? categories[0]} className={fieldClass}>{categories.map(value => <option key={value}>{value}</option>)}</select></label>
            <label className={labelClass}>Иллюстрация<select value={kind} onChange={event => setKind(event.target.value as ItemKind)} className={fieldClass}>{illustrations.map(value => <option key={value.value} value={value.value}>{value.label}</option>)}</select></label>
            <div className={styles.fieldRow}><label className={labelClass}>Ширина, клетки<input type="number" min="1" max="12" defaultValue={editedItem?.width ?? 1} className={fieldClass}/></label><label className={labelClass}>Глубина, клетки<input type="number" min="1" max="8" defaultValue={editedItem?.depth ?? 1} className={fieldClass}/></label></div>
            <label className={labelClass}>Цена в монетах<input type="number" min="0" defaultValue={editedItem?.price ?? 10} className={fieldClass}/></label>
            <label className={styles.checkbox}><input type="checkbox" defaultChecked={editedItem?.purchasable ?? true}/>Доступна в магазине</label>
          </> : <>
            <label className={labelClass}>Исполнитель<input defaultValue={editedTrack?.artist ?? ""} placeholder="Имя автора" className={fieldClass}/></label>
            <label className={labelClass}>Жанр<select defaultValue={editedTrack?.genre ?? "Lo-fi"} className={fieldClass}>{["Lo-fi", "Эмбиент", "Пиано", "Звуки природы"].map(value => <option key={value}>{value}</option>)}</select></label>
            <label className={labelClass}>Описание<textarea rows={3} placeholder="Какое настроение создаёт этот трек?" className={fieldClass}/></label>
          </>}
          <label className={styles.colorLabel}>Цвет фона превью<input type="color" value={color} onChange={event => setColor(event.target.value)}/></label>
          <label className={styles.upload}><Icon name="upload"/><strong>{section === "items" ? "Выбрать изображение" : "Выбрать аудиофайл"}</strong><span>{section === "items" ? "PNG, WebP · спрайт вещи" : "MP3, WAV, OGG"}</span><input type="file" accept={section === "items" ? "image/png,image/webp" : "audio/mpeg,audio/wav,audio/ogg"} onChange={event => setFileName(event.target.files?.[0]?.name ?? "")}/><small role="status">{fileName ? `Выбран: ${fileName}. Файл не загружен.` : "Только предпросмотр, без загрузки"}</small></label>
          <div className={styles.saveArea}><button type="submit" disabled aria-describedby="save-note" className={styles.save}><Icon name="plus"/>{editingId ? "Сохранить изменения" : section === "items" ? "Добавить в коллекцию" : "Добавить трек"}</button><p id="save-note">Это макет. Сохранение и публикация пока недоступны.</p><button type="button" onClick={resetEditor} className={styles.reset}>Сбросить форму</button></div>
        </form>
      </aside>
    </div>
    <footer className={styles.notice}><Icon name="info"/><p><strong>Пространство для будущих идей.</strong> Здесь можно познакомиться с интерфейсом. Все изменения остаются в предпросмотре и не влияют на комнату.</p><span>TINY ME ? STUDIO</span></footer>
  </main>;
}

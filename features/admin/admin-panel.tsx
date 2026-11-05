"use client";

import { useRef, useState } from "react";
import { PageHeading } from "@/components/ui/page-heading";
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
const fieldClass = "mt-2 min-h-11 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink";
const labelClass = "block text-xs font-medium";
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

  return <>
    <PageHeading eyebrow="Мастерская TinyMe" title="Админ-панель" description="Маленькие детали, из которых складывается уют. Собирай коллекцию вещей и музыку для комнаты." action={<span className="inline-flex items-center gap-2 rounded-full border border-line bg-sage px-4 py-2 text-xs font-medium text-forest"><span className="size-2 rounded-full bg-forest"/>Макет панели</span>} />

    <div className="mb-7 grid gap-3 sm:grid-cols-3">
      {[{ label: "Вещей в каталоге", value: catalog.length, icon: "box", note: "Мебель, свет и маленькие радости" }, { label: "Треков в коллекции", value: tracks.length, icon: "music", note: "Демонстрационная подборка" }, { label: "Категории вещей", value: categories.length, icon: "grid", note: "Каждой вещи — своё место" }].map(stat => <div key={stat.label} className="panel p-5"><div className="flex items-center justify-between text-muted"><p className="text-xs">{stat.label}</p><Icon name={stat.icon}/></div><p className="mt-3 font-mono text-3xl font-bold">{String(stat.value).padStart(2, "0")}</p><p className="mt-2 text-[11px] text-muted">{stat.note}</p></div>)}
    </div>

    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-line">
      <div className="flex gap-6" aria-label="Разделы админ-панели">
        {([{ id: "items", label: "Вещи", icon: "box", count: catalog.length }, { id: "music", label: "Музыка", icon: "music", count: tracks.length }] as const).map(tab => <button key={tab.id} type="button" aria-pressed={section === tab.id} onClick={() => changeSection(tab.id)} className={`flex min-h-14 items-center gap-2 border-b-2 px-1 text-sm font-medium ${section === tab.id ? "border-forest text-forest" : "border-transparent text-muted hover:text-ink"}`}><Icon name={tab.icon} className="size-4"/>{tab.label}<span className="rounded-md bg-sage px-2 py-0.5 font-mono text-[10px]">{tab.count}</span></button>)}
      </div>
      <p className="pb-3 text-[11px] text-muted">Коллекция для будущих обновлений</p>
    </div>

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-label={section === "items" ? "Каталог вещей" : "Музыкальная коллекция"} className="min-w-0">
        <div className="mb-5 flex flex-wrap gap-3">
          <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-muted"><Icon name="search" className="size-4 shrink-0"/><span className="sr-only">Поиск по коллекции</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={section === "items" ? "Найти вещь…" : "Название или исполнитель…"} className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink outline-none"/></label>
          {section === "items" && <label><span className="sr-only">Категория вещей</span><select value={category} onChange={event => setCategory(event.target.value)} className="min-h-11 max-w-full rounded-xl border border-line bg-surface px-3 text-xs"><option>Все категории</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label>}
        </div>
        <div className="mb-4 flex items-center justify-between gap-3"><p className="text-xs text-muted">{section === "items" ? `Вещей найдено: ${items.length}` : `Треков найдено: ${music.length}`}</p><button type="button" onClick={() => { resetEditor(); requestAnimationFrame(() => titleInput.current?.focus()); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest px-4 text-xs font-medium text-white hover:bg-forest/90"><Icon name="plus" className="size-4"/>{section === "items" ? "Новая вещь" : "Новый трек"}</button></div>

        {section === "items" ? <div className="grid gap-3 sm:grid-cols-2">{items.map(item => <article key={item.id} className={`panel overflow-hidden ${editingId === item.id ? "ring-2 ring-forest" : ""}`}><div className="relative flex h-36 items-center justify-center" style={{ backgroundColor: item.color }}><PixelItem kind={item.illustration} className="size-28"/><span className="absolute top-3 left-3 rounded-full bg-surface/90 px-2 py-1 text-[10px] text-muted">{item.category}</span></div><div className="p-4"><h2 className="text-sm font-semibold">{item.title}</h2><div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted"><span>{item.width} × {item.depth} клетки</span><span className="inline-flex items-center gap-1">{item.purchasable ? <><Coin className="size-4"/>{item.price}</> : "Стартовый набор"}</span></div><button type="button" onClick={() => edit(item)} className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-line text-xs font-medium hover:bg-sage"><Icon name="edit" className="size-3.5"/>Редактировать<span className="sr-only">: {item.title}</span></button></div></article>)}</div> : <div className="space-y-3">{music.map((track, index) => <article key={track.id} className={`panel p-4 sm:p-5 ${editingId === track.id ? "ring-2 ring-forest" : ""}`}><div className="flex items-center gap-3"><div className="flex size-14 shrink-0 items-center justify-center rounded-xl text-forest" style={{ backgroundColor: track.color }}><Icon name="music" className="size-6"/></div><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold">{track.title}</h2><p className="mt-1 text-xs text-muted">{track.artist} · {track.genre}</p></div><span className="font-mono text-xs text-muted">{track.duration}</span></div><div className="mt-5 flex h-8 items-center gap-1 overflow-hidden" aria-hidden="true">{Array.from({ length: 42 }, (_, bar) => <span key={bar} className="min-w-1 flex-1 rounded-sm bg-forest/25" style={{ height: `${20 + ((bar * 17 + index * 13) % 80)}%` }}/>)}</div><div className="mt-4 flex items-center justify-between gap-2"><span className="text-[11px] text-muted">Демо · воспроизведение позже</span><button type="button" onClick={() => edit(track)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 text-xs hover:bg-sage"><Icon name="edit" className="size-3.5"/>Редактировать<span className="sr-only">: {track.title}</span></button></div></article>)}</div>}
        {(section === "items" ? items.length : music.length) === 0 && <div className="panel p-10 text-center"><Icon name="search" className="mx-auto mb-3 size-7 text-muted"/><h2 className="text-sm font-semibold">Ничего не нашлось</h2><p className="mt-2 text-xs text-muted">Попробуй другое название или сбрось фильтры.</p><button type="button" className="secondary-link mt-5" onClick={() => { setQuery(""); setCategory("Все категории"); }}>Сбросить поиск</button></div>}
      </section>

      <aside className="panel overflow-hidden" aria-labelledby="editor-title">
        <div className="border-b border-line p-5"><p className="mb-2 font-mono text-[10px] tracking-widest text-muted">РЕДАКТОР КОЛЛЕКЦИИ</p><h2 id="editor-title" className="text-lg font-semibold">{editingId ? "Редактирование" : section === "items" ? "Новая вещь" : "Новый трек"}</h2><p className="mt-2 text-xs leading-5 text-muted">{section === "items" ? "Добавь деталь, которая сделает комнату особенной." : "Выбери звучание для спокойных моментов."}</p></div>
        <form key={`${section}-${editorKey}`} onSubmit={event => event.preventDefault()} className="space-y-5 p-5">
          <div className="flex flex-col items-center justify-center rounded-xl p-4" style={{ backgroundColor: color }}>{section === "items" ? <PixelItem kind={kind} className="size-28"/> : <div className="flex size-28 items-center justify-center"><Icon name="music" className="size-12 text-forest"/></div>}<p className="mt-1 max-w-full truncate text-xs font-medium">{title.trim() || (section === "items" ? "Предпросмотр вещи" : "Обложка трека")}</p></div>
          <label className={labelClass}>Название<input ref={titleInput} value={title} onChange={event => setTitle(event.target.value)} maxLength={100} placeholder={section === "items" ? "Например, маленький фикус" : "Например, вечер в комнате"} className={fieldClass}/></label>
          {section === "items" ? <>
            <label className={labelClass}>Категория<select defaultValue={editedItem?.category ?? categories[0]} className={fieldClass}>{categories.map(value => <option key={value}>{value}</option>)}</select></label>
            <label className={labelClass}>Иллюстрация для макета<select value={kind} onChange={event => setKind(event.target.value as ItemKind)} className={fieldClass}>{illustrations.map(value => <option key={value.value} value={value.value}>{value.label}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-3"><label className={labelClass}>Ширина, клетки<input type="number" min="1" max="12" defaultValue={editedItem?.width ?? 1} className={fieldClass}/></label><label className={labelClass}>Глубина, клетки<input type="number" min="1" max="8" defaultValue={editedItem?.depth ?? 1} className={fieldClass}/></label></div>
            <label className={labelClass}>Цена в монетах<input type="number" min="0" defaultValue={editedItem?.price ?? 10} className={fieldClass}/></label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" defaultChecked={editedItem?.purchasable ?? true} className="size-4 accent-forest"/>Доступна в магазине</label>
          </> : <>
            <label className={labelClass}>Исполнитель<input defaultValue={editedTrack?.artist ?? ""} placeholder="Имя автора" className={fieldClass}/></label>
            <label className={labelClass}>Жанр<select defaultValue={editedTrack?.genre ?? "Lo-fi"} className={fieldClass}>{["Lo-fi", "Эмбиент", "Пиано", "Звуки природы"].map(value => <option key={value}>{value}</option>)}</select></label>
            <label className={labelClass}>Описание<textarea rows={3} placeholder="Какое настроение создаёт этот трек?" className={`${fieldClass} resize-y`}/></label>
          </>}
          <label className="flex items-center justify-between gap-3 text-xs font-medium">Цвет фона превью<input type="color" value={color} onChange={event => setColor(event.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-paper p-1"/></label>
          <label className="block cursor-pointer rounded-xl border border-dashed border-forest/35 bg-sage/30 p-4 text-center"><Icon name="upload" className="mx-auto mb-2 size-5 text-forest"/><span className="block text-xs font-medium">{section === "items" ? "Выбрать изображение" : "Выбрать аудиофайл"}</span><span className="mt-1 block text-[10px] text-muted">{section === "items" ? "PNG, WebP · спрайт вещи" : "MP3, WAV, OGG"}</span><input type="file" accept={section === "items" ? "image/png,image/webp" : "audio/mpeg,audio/wav,audio/ogg"} onChange={event => setFileName(event.target.files?.[0]?.name ?? "")} className="mt-3 block w-full min-w-0 text-[10px] text-muted file:mr-2 file:rounded-md file:border-0 file:bg-sage file:px-2 file:py-2 file:text-forest"/><span role="status" className="mt-2 block break-all text-[10px] text-muted">{fileName ? `Выбран: ${fileName}. Файл не загружен на сервер.` : "Выбор файла для макета, без загрузки"}</span></label>
          <div className="border-t border-line pt-5"><button type="submit" disabled aria-describedby="save-note" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest/40 text-sm font-medium text-white disabled:cursor-not-allowed">{editingId ? "Сохранить изменения" : section === "items" ? "Добавить вещь" : "Добавить трек"}</button><p id="save-note" className="mt-3 text-[11px] leading-5 text-muted">Это визуальный макет. Данные не сохраняются, публикация станет доступна позже.</p><button type="button" onClick={resetEditor} className="mt-3 min-h-10 w-full text-xs text-muted hover:text-ink">Сбросить форму</button></div>
        </form>
      </aside>
    </div>
    <div className="mt-6 flex items-start gap-3 rounded-xl bg-sage/60 p-4 text-xs leading-5 text-muted"><Icon name="info" className="mt-0.5 size-5 shrink-0 text-forest"/><p>Предпросмотр админ-панели открыт для знакомства с интерфейсом. Вход администратора и управление доступом появятся вместе с сохранением коллекции.</p></div>
  </>;
}

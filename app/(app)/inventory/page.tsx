import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/ui/page-heading";
import { ItemCard } from "@/components/ui/item-card";
import { Icon } from "@/components/ui/icon";
import { catalog, categories, demoInventory, demoRoom } from "@/config/demo";
export const metadata: Metadata = { title: "Инвентарь" };
export default function InventoryPage() {
  const placedIds = new Set(demoRoom.placements.map(placement => placement.inventoryItemId));
  return <>
    <PageHeading eyebrow="Бережно собрано" title="Инвентарь" description="Все твои вещи в одном месте. У каждой найдётся свой уютный уголок." action={<Link href="/shop" className="secondary-link"><Icon name="shop" className="size-4"/>В магазин<Icon name="arrow" className="size-4"/></Link>}/>
    <section className="mb-7 grid grid-cols-3 gap-2 sm:gap-4" aria-label="Состав инвентаря">{[{ label: "Всего вещей", count: demoInventory.length }, { label: "В комнате", count: placedIds.size }, { label: "В хранилище", count: demoInventory.length - placedIds.size }].map((stat, index) => <div key={stat.label} className={`rounded-2xl border border-line p-4 sm:p-5 ${index === 0 ? "bg-sage" : "bg-surface"}`}><p className="font-mono text-2xl font-bold sm:text-3xl">{stat.count.toString().padStart(2, "0")}</p><p className="mt-2 text-[11px] text-muted sm:text-xs">{stat.label}</p></div>)}</section>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2" aria-label="Макет фильтров размещения"><span className="inline-flex min-h-10 items-center rounded-xl bg-forest px-4 text-xs font-medium text-white">Все вещи</span><button disabled className="prototype-button">В комнате</button><button disabled className="prototype-button">В хранилище</button></div><label className="flex items-center gap-2 text-xs text-muted">Категория<select disabled className="min-h-10 rounded-xl border border-line bg-surface px-3 text-ink"><option>Все категории</option>{categories.map(category => <option key={category}>{category}</option>)}</select></label></div>
    <p className="mb-5 text-[11px] text-muted">Пример коллекции. Фильтры и размещение пока недоступны.</p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-5">{demoInventory.map(copy => { const item = catalog.find(item => item.id === copy.catalogId)!; return <ItemCard key={copy.id} item={item} mode="inventory" placed={placedIds.has(copy.id)} starter={copy.source === "starter"}/>; })}</div>
    <div className="mt-6 flex items-start gap-3 rounded-xl bg-sage/60 p-4 text-xs leading-5 text-muted"><Icon name="box" className="mt-0.5 size-5 shrink-0 text-forest"/><p>Здесь ничего не теряется. Когда уберёшь предмет из комнаты, он останется в инвентаре — до следующей перестановки.</p></div>
  </>;
}

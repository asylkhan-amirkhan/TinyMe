import type { Metadata } from "next";
import { PageHeading } from "@/components/ui/page-heading";
import { ItemCard } from "@/components/ui/item-card";
import { Coin, Icon } from "@/components/ui/icon";
import { catalog, categories, demoInventory } from "@/config/demo";
export const metadata: Metadata = { title: "Магазин" };
export default function ShopPage() {
  const products = catalog.filter(item => item.purchasable);
  return <>
    <PageHeading eyebrow="Маленькие находки" title="Магазин" description="Вещи, которые превращают четыре стены в любимое место."/>
    <section className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#d8e2ce] bg-sage px-5 py-5 sm:px-6"><div className="flex items-center gap-4"><span className="rounded-xl bg-surface/70 p-3 text-forest"><Icon name="leaf" className="size-7"/></span><div><h2 className="text-base font-semibold">Больше характера. Больше тебя.</h2><p className="mt-1 text-xs leading-5 text-muted">Базовая коллекция для твоей первой комнаты.</p></div></div><span className="flex items-center gap-2 text-xs text-forest"><Coin className="size-4"/>Только виртуальные монеты</span></section>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-4"><div className="flex flex-wrap gap-2" aria-label="Макет фильтров каталога"><span className="inline-flex min-h-10 items-center rounded-xl bg-forest px-4 text-xs font-medium text-white">Все предметы</span>{categories.map(category => <button key={category} disabled className="prototype-button">{category}</button>)}</div><span className="text-xs text-muted">{products.length} предметов</span></div><p className="mb-5 text-[11px] text-muted">Фильтры и покупка будут доступны на следующих этапах.</p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-5">{products.map(item => <ItemCard key={item.id} item={item} mode="shop" owned={demoInventory.filter(copy => copy.catalogId === item.id).length}/>)}</div>
    <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-muted"><Icon name="info" className="mt-0.5 size-4 shrink-0"/>Каждая покупка добавит одну копию в инвентарь. Кровать, стол и стул входят в бесплатный стартовый набор.</p>
  </>;
}

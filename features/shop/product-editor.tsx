"use client";

import { useState } from "react";
import { categories } from "@/config/demo";
import { getSupabase } from "@/lib/supabase";
import { useShop } from "./shop-provider";
import { illustrations, type Product } from "./types";

export function ProductEditor({ product, close }: { product?: Product; close: () => void }) {
  const { busy, run } = useShop();
  const [draft, setDraft] = useState<Product>(product ?? {
    id: "", title: "", category: categories[0], width: 1, depth: 1, price: 1,
    purchasable: true, illustration: "plant", color: "#edf1e6",
  });
  return <form className="panel mb-6 grid gap-4 p-5 sm:grid-cols-2" onSubmit={async event => {
    event.preventDefault();
    const db = getSupabase()!;
    const values = { ...draft, title: draft.title.trim() };
    if (await run(() => product
      ? db.from("tinyme_products").update(values).eq("id", product.id).select().single()
      : db.from("tinyme_products").insert(values).select().single(), "Товар сохранён")) close();
  }}>
    <h2 className="text-lg font-semibold sm:col-span-2">{product ? "Редактировать товар" : "Новый товар"}</h2>
    <label>Код товара<input className="shop-input" required pattern="[a-z0-9-]{1,64}" maxLength={64} disabled={Boolean(product) || busy} value={draft.id} onChange={event => setDraft({ ...draft, id: event.target.value })}/></label>
    <label>Название<input className="shop-input" required maxLength={100} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })}/></label>
    <label>Категория<select className="shop-input" value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
    <label>Цена в монетах<input className="shop-input" type="number" required min={0} max={1000000} step={1} value={draft.price} onChange={event => setDraft({ ...draft, price: event.target.valueAsNumber })}/></label>
    {(["width", "depth"] as const).map(field => <label key={field}>{field === "width" ? "Ширина" : "Глубина"}<input className="shop-input" type="number" required min={1} max={field === "width" ? 12 : 8} step={1} value={draft[field]} onChange={event => setDraft({ ...draft, [field]: event.target.valueAsNumber })}/></label>)}
    <label>Иллюстрация<select className="shop-input" value={draft.illustration} onChange={event => setDraft({ ...draft, illustration: event.target.value as Product["illustration"] })}>{illustrations.map(kind => <option key={kind}>{kind}</option>)}</select></label>
    <label>Фон<input className="shop-input" type="color" value={draft.color} onChange={event => setDraft({ ...draft, color: event.target.value })}/></label>
    <label className="flex items-center gap-2"><input type="checkbox" checked={draft.purchasable} onChange={event => setDraft({ ...draft, purchasable: event.target.checked })}/>Доступен для покупки</label>
    <div className="flex gap-3 sm:col-span-2"><button className="shop-button" disabled={busy}>Сохранить</button><button className="secondary-link" type="button" disabled={busy} onClick={close}>Отмена</button></div>
  </form>;
}

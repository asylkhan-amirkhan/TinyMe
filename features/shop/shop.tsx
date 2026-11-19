"use client";

import { useState } from "react";
import { Coin } from "@/components/ui/icon";
import { PixelItem } from "@/components/ui/pixel-item";
import { getSupabase } from "@/lib/supabase";
import { useShop } from "./shop-provider";
import { ProductEditor } from "./product-editor";
import type { Product } from "./types";

export function Shop() {
  const store = useShop();
  const { products, user, admin, cart, favorites, balance, loading, busy, run } = store;
  const [tab, setTab] = useState("catalog");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [checkout, setCheckout] = useState(false);
  const db = getSupabase();
  const available = products.filter(product => (admin && tab === "manage") || tab === "cart" || tab === "favorites" || product.purchasable);
  const visible = available.filter(product => (!category || product.category === category)
    && product.title.toLocaleLowerCase("ru").includes(search.toLocaleLowerCase("ru"))
    && (tab !== "favorites" || favorites.includes(product.id))
    && (tab !== "cart" || cart.some(line => line.product_id === product.id)));
  const total = cart.reduce((sum, line) => sum + line.quantity * (products.find(product => product.id === line.product_id)?.price ?? 0), 0);
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);
  async function quantity(product: Product, value: number) {
    if (!db || !user) return;
    await run(() => value === 0
      ? db.from("tinyme_cart").delete().eq("user_id", user.id).eq("product_id", product.id)
      : db.from("tinyme_cart").upsert({ user_id: user.id, product_id: product.id, quantity: value }), "Корзина обновлена");
  }
  return <>
    {!store.configured && <div className="panel mb-5 p-5"><h2 className="font-semibold">Подключите Supabase</h2><p className="mt-2 text-sm">Параметры подключения ещё не заданы. Инструкция: docs/shop-changes.md. Данные магазина появятся после настройки базы.</p></div>}
    {store.configured && <Account/>}
    <div aria-live="polite" className="mb-4">{store.error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{store.error} <button className="underline" onClick={() => void store.load()}>Повторить загрузку</button></p>}{store.notice && <p className="rounded-xl bg-sage p-4 text-sm">{store.notice}</p>}</div>
    <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Разделы магазина">{[
      ["catalog", "Каталог"], ["favorites", `Избранное (${favorites.length})`], ["cart", `Корзина (${count})`], ...(admin ? [["manage", "Управление товарами"]] : []),
    ].map(([value, title]) => <button className={tab === value ? "shop-button" : "secondary-link"} aria-pressed={tab === value} key={value} onClick={() => { setTab(value); setCategory(""); setSearch(""); setEditing(null); setDeleting(null); setCheckout(false); }}>{title}</button>)}</div>
    {loading && <p role="status" className="mb-4">Загрузка магазина…</p>}
    {!loading && store.configured && !user && <p className="mb-5 text-sm text-muted">Войдите в аккаунт, чтобы сохранять корзину и избранное.</p>}
    <div className="mb-5 flex flex-wrap gap-3"><label className="grow">Поиск<input className="shop-input" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Название товара"/></label><label>Категория<select className="shop-input" value={category} onChange={event => setCategory(event.target.value)}><option value="">Все категории</option>{Array.from(new Set(available.map(product => product.category))).map(value => <option key={value}>{value}</option>)}</select></label></div>
    {admin && tab === "manage" && <button className="shop-button mb-5" disabled={busy} onClick={() => setEditing("new")}>Добавить товар</button>}
    {admin && editing && <ProductEditor key={editing === "new" ? "new" : editing.id} product={editing === "new" ? undefined : editing} close={() => setEditing(null)}/>}
    {admin && deleting && <div className="panel mb-5 p-5"><p>Удалить «{deleting.title}»? Товар исчезнет из корзин и избранного. Купленные копии сохранятся.</p><div className="mt-3 flex gap-3"><button className="shop-button" disabled={busy} onClick={async () => { if (await run(() => db!.from("tinyme_products").delete().eq("id", deleting.id).select().single(), "Товар удалён")) setDeleting(null); }}>Удалить</button><button className="secondary-link" disabled={busy} onClick={() => setDeleting(null)}>Отмена</button></div></div>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visible.map(product => {
      const line = cart.find(row => row.product_id === product.id);
      const saved = favorites.includes(product.id);
      return <article className="panel overflow-hidden" key={product.id}>
        <div className="relative flex h-40 items-center justify-center" style={{ backgroundColor: product.color }}><PixelItem kind={product.illustration} className="size-32"/><span className="absolute right-3 top-3 rounded bg-white/80 px-2 py-1 text-xs">{product.width} × {product.depth}</span></div>
        <div className="p-5"><p className="text-xs text-muted">{product.category}{!product.purchasable && " · Снят с продажи"}</p><h2 className="my-2 text-lg font-semibold">{product.title}</h2><p className="mb-4 flex items-center gap-2"><Coin/>{product.price}</p>
          {tab === "manage" && admin ? <div className="flex flex-wrap gap-2"><button className="secondary-link" disabled={busy} onClick={() => setEditing(product)}>Изменить</button><button className="secondary-link" disabled={busy} onClick={() => setDeleting(product)}>Удалить</button></div> : <>
            <button className="secondary-link mb-3 w-full" aria-pressed={saved} disabled={!user || busy || loading} onClick={() => void run(() => saved ? db!.from("tinyme_favorites").delete().eq("user_id", user!.id).eq("product_id", product.id) : db!.from("tinyme_favorites").insert({ user_id: user!.id, product_id: product.id }), saved ? "Удалено из избранного" : "Добавлено в избранное")}>{saved ? "♥ В избранном" : "♡ В избранное"}</button>
            {line ? <div className="flex flex-wrap items-center gap-2"><button className="secondary-link" aria-label={`Уменьшить количество: ${product.title}`} disabled={busy || loading} onClick={() => void quantity(product, line.quantity - 1)}>−</button><span aria-label="Количество">{line.quantity}</span><button className="secondary-link" aria-label={`Увеличить количество: ${product.title}`} disabled={busy || loading || line.quantity >= 99} onClick={() => void quantity(product, line.quantity + 1)}>+</button><button className="text-sm underline" disabled={busy || loading} onClick={() => void quantity(product, 0)}>Убрать</button></div>
            : <button className="shop-button w-full" disabled={!user || busy || loading || !product.purchasable} onClick={() => void quantity(product, 1)}>В корзину</button>}
          </>}
        </div>
      </article>;
    })}</div>
    {!loading && !visible.length && <p className="panel p-6 text-sm text-muted">{tab === "cart" ? "Корзина пуста." : tab === "favorites" ? "В избранном пока ничего нет." : "Товары не найдены."}</p>}
    {tab === "cart" && user && count > 0 && <section className="panel mt-5 p-5"><h2 className="font-semibold">Итого: {total} монет</h2><p className="my-3 text-sm">Ваш баланс: {balance} монет. Каждая покупка добавит отдельные копии в инвентарь.</p>{balance < total && <p className="mb-3 text-sm text-muted">Не хватает {total - balance} монет.</p>}<button className="shop-button" disabled={busy || loading || balance < total} onClick={() => setCheckout(true)}>Оформить покупку</button>{checkout && <div className="mt-4 border-t border-line pt-4"><p>Купить товары за {total} монет? База проверит актуальные цены и баланс.</p><div className="mt-3 flex gap-3"><button className="shop-button" disabled={busy || loading} onClick={async () => { if (await run(() => db!.rpc("tinyme_checkout", { expected_total: total }), "Покупка завершена. Вещи добавлены в инвентарь.")) setCheckout(false); }}>Подтвердить</button><button className="secondary-link" disabled={busy} onClick={() => setCheckout(false)}>Отмена</button></div></div>}</section>}
  </>;
}

function Account() {
  const { user, busy, loading, run } = useShop();
  return <section className="panel mb-5 p-5" aria-label="Аккаунт магазина">{user ? <div className="flex flex-wrap items-center justify-between gap-3"><p className="break-all text-sm">{user.email}</p><button className="secondary-link" disabled={busy || loading} onClick={() => void run(() => getSupabase()!.auth.signOut(), "Вы вышли из аккаунта")}>Выйти</button></div> : <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void run(() => getSupabase()!.auth.signInWithPassword({ email: String(data.get("email")), password: String(data.get("password")) }), "Вход выполнен"); }}><label className="grow">Email<input name="email" className="shop-input" type="email" autoComplete="username" required/></label><label className="grow">Пароль<input name="password" className="shop-input" type="password" autoComplete="current-password" required/></label><button className="shop-button" disabled={busy || loading}>Войти</button><p className="w-full text-xs text-muted">Используйте существующий аккаунт Supabase Auth.</p></form>}</section>;
}

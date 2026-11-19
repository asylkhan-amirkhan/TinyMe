"use client";

import Link from "next/link";
import { ItemCard } from "@/components/ui/item-card";
import { catalog } from "@/config/demo";
import { useShop } from "./shop-provider";

export function Inventory() {
  const { inventory, loading, user, configured, error } = useShop();
  if (loading) return <p role="status">Загрузка инвентаря…</p>;
  if (!configured || !user) return <p className="panel p-5">Для загрузки инвентаря <Link className="underline" href="/shop/online">подключите базу и войдите в магазине</Link>.</p>;
  if (error) return <p role="alert">{error}</p>;
  const starter = catalog.filter(item => !item.purchasable).map(item => ({ id: `starter-${item.id}`, product: item }));
  return <><p className="mb-5 text-sm text-muted">Стартовый набор и {inventory.length} купленных вещей. Размещение в комнате пока недоступно.</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[...starter, ...inventory].map(copy => <ItemCard key={copy.id} item={copy.product} mode="inventory" placed={false} starter={copy.id.startsWith("starter-")}/>)}</div></>;
}

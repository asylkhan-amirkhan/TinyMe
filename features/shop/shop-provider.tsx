"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { CartLine, OwnedItem, Product } from "./types";

function useStore() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [inventory, setInventory] = useState<OwnedItem[]>([]);
  const [balance, setBalance] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const generation = useRef(0);
  const locked = useRef(false);
  const configured = Boolean(getSupabase());

  const load = useCallback(async () => {
    const db = getSupabase();
    const version = ++generation.current;
    if (!db) { setLoading(false); return; }
    setLoading(true);
    try {
      const auth = await db.auth.getUser();
      if (auth.error && auth.data.user) throw auth.error;
      const current = auth.data.user;
      const catalog = await db.from("tinyme_products").select("*").order("title");
      if (catalog.error) throw catalog.error;
      let lines: CartLine[] = [], saved: string[] = [], owned: OwnedItem[] = [], coins = 0, isAdmin = false;
      if (current) {
        const results = await Promise.all([
          db.from("tinyme_cart").select("product_id, quantity").eq("user_id", current.id),
          db.from("tinyme_favorites").select("product_id").eq("user_id", current.id),
          db.from("tinyme_wallets").select("balance").eq("user_id", current.id).maybeSingle(),
          db.from("tinyme_admins").select("user_id").eq("user_id", current.id).maybeSingle(),
          db.from("tinyme_inventory").select("id, product").eq("user_id", current.id),
        ]);
        for (const result of results) if (result.error) throw result.error;
        lines = results[0].data as unknown as CartLine[];
        saved = (results[1].data as unknown as { product_id: string }[]).map(row => row.product_id);
        coins = (results[2].data as unknown as { balance: number } | null)?.balance ?? 0;
        isAdmin = Boolean(results[3].data);
        owned = results[4].data as unknown as OwnedItem[];
      }
      if (version !== generation.current) return;
      setUser(current); setProducts(catalog.data as Product[]); setCart(lines); setFavorites(saved);
      setInventory(owned); setBalance(coins); setAdmin(isAdmin); setError("");
    } catch (cause) {
      if (version === generation.current) setError(cause instanceof Error ? cause.message : String((cause as { message?: string })?.message ?? "Не удалось загрузить магазин"));
    } finally { if (version === generation.current) setLoading(false); }
  }, []);

  useEffect(() => {
    const db = getSupabase();
    const requestGeneration = generation;
    let authTimer: ReturnType<typeof setTimeout>;
    const timer = setTimeout(() => void load(), 0);
    const subscription = db?.auth.onAuthStateChange(() => {
      // Run database requests outside the auth callback's internal lock.
      ++generation.current;
      setUser(null); setAdmin(false); setCart([]); setFavorites([]); setInventory([]); setBalance(0);
      clearTimeout(authTimer);
      authTimer = setTimeout(() => void load(), 0);
    });
    const focus = () => void load();
    window.addEventListener("focus", focus);
    return () => { clearTimeout(timer); clearTimeout(authTimer); ++requestGeneration.current; subscription?.data.subscription.unsubscribe(); window.removeEventListener("focus", focus); };
  }, [load]);

  async function run(action: () => PromiseLike<{ error: { message: string } | null }>, message = "Сохранено") {
    if (locked.current) return false;
    locked.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const result = await action();
      if (result.error) throw new Error(result.error.message);
      await load(); setNotice(message); return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Ошибка сохранения"); return false; }
    finally { locked.current = false; setBusy(false); }
  }
  return { products, cart, favorites, inventory, balance, user, admin, loading, busy, error, notice, configured, load, run };
}

const ShopContext = createContext<ReturnType<typeof useStore> | null>(null);
export function ShopProvider({ children }: { children: React.ReactNode }) {
  const store = useStore();
  return <ShopContext.Provider value={store}>{children}</ShopContext.Provider>;
}
export function useShop() {
  const store = useContext(ShopContext);
  if (!store) throw new Error("ShopProvider is missing");
  return store;
}

export function ShopBalance() {
  const { balance, user, loading } = useShop();
  return <span>{loading ? "…" : user ? balance : "—"}<span className="sr-only"> монет на счёте</span></span>;
}

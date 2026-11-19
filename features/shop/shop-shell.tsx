import Link from "next/link";
import { ShopBalance, ShopProvider } from "./shop-provider";
import "./shop.css";

export function ShopShell({ children }: { children: React.ReactNode }) {
  return <ShopProvider><div className="account-shop"><div className="mx-auto max-w-6xl p-6">
    <nav aria-label="Магазин аккаунта" className="mb-7 flex flex-wrap gap-5">
      <Link href="/room">← TinyMe</Link><Link href="/shop">Магазин</Link><Link href="/inventory">Инвентарь</Link>
      <span className="ml-auto">Монеты магазина: <ShopBalance /></span>
    </nav>
    <main>{children}</main>
  </div></div></ShopProvider>;
}

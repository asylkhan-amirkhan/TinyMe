import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/navigation/navigation";
import { Coin, Icon } from "@/components/ui/icon";
import { ShopBalance, ShopProvider } from "@/features/shop/shop-provider";
import "./online-shop.css";

export const metadata: Metadata = {
  title: { default: "Магазин · TinyMe", template: "%s · TinyMe" },
};

export default function OnlineShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShopProvider>
      <div className="online-shop">
        <a href="#main-content" className="skip-link">Перейти к содержимому</a>
        <aside className="md:fixed md:inset-y-0 md:left-0 md:z-20 md:flex md:w-56 md:flex-col md:border-r md:border-line md:bg-surface md:px-5 md:py-8">
          <Link href="/room" className="hidden items-center gap-3 px-3 md:flex" aria-label="TinyMe — моя комната">
            <span className="flex size-10 items-center justify-center rounded-xl bg-forest text-white"><Icon name="room" className="size-6" /></span>
            <span className="font-mono text-2xl font-bold tracking-tight">tinyme.</span>
          </Link>
          <Navigation />
        </aside>
        <div className="md:ml-56">
          <header className="flex min-h-20 items-center justify-between gap-3 border-b border-line bg-surface/80 px-5 py-4 sm:px-8 lg:px-10">
            <Link href="/shop">Локальный магазин</Link>
            <span className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold">
              <Coin /><ShopBalance />
            </span>
          </header>
          <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1440px] px-5 pt-6 pb-28 outline-none sm:px-8 md:pb-8 lg:px-10 lg:pt-8">
            {children}
          </main>
        </div>
      </div>
    </ShopProvider>
  );
}

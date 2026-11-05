"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
const links = [
  { href: "/room", label: "Моя комната", icon: "room" },
  { href: "/shop", label: "Магазин", icon: "shop" },
  { href: "/inventory", label: "Инвентарь", icon: "box" },
];
export function Navigation() {
  const pathname = usePathname();
  return <nav aria-label="Основная навигация" className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-surface px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:static md:flex-col md:gap-2 md:border-0 md:bg-transparent md:p-0">
    {links.map(({ href, label, icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3 md:text-sm ${pathname === href ? "bg-sage text-forest" : "text-muted hover:bg-paper hover:text-ink"}`}><Icon name={icon}/>{label}{pathname === href && <span aria-hidden="true" className="ml-auto hidden size-1.5 rounded-full bg-forest md:block"/>}</Link>)}
  </nav>;
}

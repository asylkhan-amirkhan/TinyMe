import Link from "next/link";
import { Navigation } from "@/components/navigation/navigation";
import { Coin, Icon } from "@/components/ui/icon";
import { demoActivity } from "@/config/demo";
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>
    <a href="#main-content" className="skip-link">Перейти к содержимому</a>
    <aside className="md:fixed md:inset-y-0 md:left-0 md:z-20 md:flex md:w-56 md:flex-col md:border-r md:border-line md:bg-surface md:px-5 md:py-8">
      <Link href="/" className="hidden items-center gap-3 px-3 md:flex" aria-label="TinyMe — моя комната"><span className="flex size-10 items-center justify-center rounded-xl bg-forest text-white"><Icon name="room" className="size-6"/></span><span className="font-mono text-2xl font-bold tracking-tight">tinyme.</span></Link>
      <p className="mt-12 mb-4 hidden px-4 text-[10px] font-semibold tracking-[.15em] text-muted uppercase md:block">Твоё пространство</p><Navigation/>
      <div className="mt-auto hidden rounded-2xl bg-sage/60 p-4 md:block"><Icon name="leaf" className="mb-3 size-6 text-forest"/><p className="text-sm font-medium">Уют в своём темпе</p><p className="mt-2 text-xs leading-5 text-muted">Маленькая комната.<br/>Большое пространство для тебя.</p></div>
      <p className="mt-5 hidden px-3 text-[10px] text-muted md:block">TINYME / ПЕРВЫЕ ШАГИ</p>
    </aside>
    <div className="md:ml-56">
      <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-line bg-surface/80 px-5 py-4 sm:px-8 lg:px-10"><div className="text-sm"><span className="font-mono text-xl font-bold md:hidden">tinyme.</span><span className="hidden text-muted md:inline">Маленькое место, где хорошо</span></div><div className="flex items-center gap-3 sm:gap-5"><span className="flex items-center gap-2 text-xs text-muted"><Icon name="clock" className="size-4"/>Таймер: макет</span><span className="flex items-center gap-2 rounded-full border border-[#e6d9b4] bg-[#fbf3de] px-3 py-1.5 text-sm font-semibold"><Coin/>{demoActivity.balance}<span className="sr-only">демонстрационные монеты</span></span></div></header>
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1440px] px-5 pt-6 pb-28 outline-none sm:px-8 md:pb-8 lg:px-10 lg:pt-8"><div className="mb-7 flex items-start gap-2 text-xs leading-5 text-muted"><span className="mt-1 size-2 shrink-0 rounded-full bg-[#b49457]"/><p><strong className="font-medium text-ink">Прототип · Неделя 1.</strong> Данные для примера. Покупки, таймер и расстановка пока недоступны.</p></div>{children}<footer className="mt-9 flex flex-wrap justify-between gap-2 border-t border-line pt-5 text-[11px] text-muted"><span>Сделай это место своим.</span><span>TinyMe · UI-прототип</span></footer></main>
    </div>
  </>;
}

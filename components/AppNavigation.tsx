"use client";
import {
  UserRound,
  Home,
  Armchair,
  Package,
  Music2,
  ChartNoAxesCombined,
  Settings,
  Coins,
  Cloud,
  HardDrive,
} from "lucide-react";
import { useSessionClock } from "@/lib/use-session-clock";
const links = [
  { id: "room", label: "Комната", icon: Home },
  { id: "shop", label: "Магазин", icon: Armchair },
  { id: "inventory", label: "Мои вещи", icon: Package },
  { id: "music", label: "Музыка", icon: Music2 },
  { id: "stats", label: "Статистика", icon: ChartNoAxesCombined },
];
export default function AppNavigation({
  view,
  onNavigate,
  balance,
  status,
  cloud, activeMs, running,
}: {
  view: string;
  onNavigate: (view: string) => void;
  balance: number;
  status: string;
  cloud: boolean; activeMs: number; running: boolean;
}) {
  const displayMs=useSessionClock(activeMs,running,cloud);
  return (
    <header className="studio-header">
      <a
        href="#"
        className="studio-brand"
        aria-label="tiny me — моя комната"
        onClick={(e) => {
          e.preventDefault();
          onNavigate("room");
        }}
      >
        <span className="door-mark" aria-hidden="true">
          <i />
          <b />
        </span>
        <span>
          tiny me<span className="brand-period">.</span>
        </span>
      </a>
      <nav className="studio-navigation" aria-label="Основное меню">
        {links.map((link) => (
          <button
            key={link.id}
            aria-label={link.label}
            className={view === link.id ? "active" : ""}
            aria-current={view === link.id ? "page" : undefined}
            onClick={() => onNavigate(link.id)}
          >
            <link.icon size={16} aria-hidden="true"  strokeWidth={1.75}/>
            <span className="dock-label">{link.label}</span>
            <span className="dock-tooltip" aria-hidden="true">{link.label}</span>
          </button>
        ))}
      </nav>
      <div className="studio-account">
        <span className="studio-sync" title={status} aria-label={status}>
          {cloud ? <Cloud size={16}  strokeWidth={1.75}/> : <HardDrive size={16}  strokeWidth={1.75}/>}
          <span>{status.startsWith("Сохранено") ? "Сохранено" : status}</span>
        </span>
        <span className="studio-wallet tabular-nums" aria-label={`${balance} монет`}>
          <span className="wallet-orbit"><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17"/><circle cx="20" cy="20" r="17" strokeDasharray={`${(displayMs%60000)/60000*106.81} 106.81`}/></svg><Coins size={16} aria-hidden="true" strokeWidth={1.75}/></span>
          <strong key={balance}>{balance}</strong>
        </span>
        <button className="studio-settings" aria-label={cloud?'Мой профиль':'Вход и регистрация'} title={cloud?'Мой профиль':'Вход и регистрация'} aria-current={view==='profile'?'page':undefined} onClick={()=>onNavigate('profile')}><UserRound size={20} strokeWidth={1.75}/></button>
        <button
          className="studio-settings"
          aria-label="Настройки"
          aria-current={view === "settings" ? "page" : undefined}
          onClick={() => onNavigate("settings")}
        >
          <Settings size={20}  strokeWidth={1.75}/>
        </button>
      </div>
    </header>
  );
}

"use client";
import RoomDock from "./RoomDock";
import { localOnly } from '@/config/runtime';
import { useLocalAccount } from '@/lib/use-local-account';
import {
  UserRound,
  Settings,
  Coins,
  Cloud,
  HardDrive,
} from "lucide-react";
import { useSessionClock } from "@/lib/use-session-clock";
export default function AppNavigation({
  view,
  onNavigate,
  balance,
  status,
  cloud, activeMs, running, isAdmin = false,
}: {
  view: string;
  onNavigate: (view: string) => void;
  balance: number;
  status: string;
  cloud: boolean; activeMs: number; running: boolean;
  isAdmin?: boolean;
}) {

  const displayMs=useSessionClock(activeMs,running,cloud);
  const { account } = useLocalAccount();
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
      <RoomDock active={view} onNavigate={onNavigate} showAdmin={localOnly ? account?.role === 'admin' : isAdmin}/>
      <div className="studio-account">
        <span className="studio-sync" title={status} aria-label={status}>
          {cloud ? <Cloud size={16}  strokeWidth={1.75}/> : <HardDrive size={16}  strokeWidth={1.75}/>}
          <span>{status.startsWith("Сохранено") ? "Сохранено" : status}</span>
        </span>
        <span className="studio-wallet tabular-nums" aria-label={`${balance} монет`}>
          <span className="wallet-orbit"><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17"/><circle cx="20" cy="20" r="17" strokeDasharray={`${(displayMs%60000)/60000*106.81} 106.81`}/></svg><Coins size={16} aria-hidden="true" strokeWidth={1.75}/></span>
          <strong key={balance}>{balance}</strong>
        </span>
        <button className="studio-settings" aria-label={localOnly ? 'Мой профиль' : cloud ? 'Мой профиль' : 'Вход и регистрация'} title={cloud?'Мой профиль':'Вход и регистрация'} aria-current={view==='profile'?'page':undefined} onClick={()=>onNavigate('profile')}><UserRound size={20} strokeWidth={1.75}/></button>
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

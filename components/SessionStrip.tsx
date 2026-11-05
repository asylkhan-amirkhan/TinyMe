"use client";
import { Headphones, ArrowUpRight, Clock3, Pause, Play } from "lucide-react";
import { formatTime } from "@/domain/model";
import { useSessionClock } from "@/lib/use-session-clock";
import { sessionCountdown } from "@/lib/session-clock";
export default function SessionStrip({
  activeMs,
  activity,
  cloud,
  running,
  musicSeconds,
  onStats,
  onToggle,
}: {
  activeMs: number;
  activity: string;
  cloud: boolean;
  running: boolean;
  musicSeconds: number;
  onStats: () => void;
  onToggle: () => void;
}) {
  const displayMs = useSessionClock(activeMs, running, cloud);
  const remaining = sessionCountdown(displayMs),
    progress = (displayMs % 60000) / 60000;
  return (
    <aside className="session-strip" aria-label="Время и музыка">
      <div className="session-time tabular-nums">
        <span className="session-clock" aria-hidden="true"><svg
          className="session-orbit"
          width="46"
          height="46"
          viewBox="0 0 46 46"
          aria-hidden="true"
        >
          <circle className="orbit-track" cx="23" cy="23" r="19" />
          <circle
            className="orbit-progress"
            cx="23"
            cy="23"
            r="19"
            strokeDasharray={`${progress * 119.38} 119.38`}
          />
        </svg><Clock3 size={16} strokeWidth={1.75} /></span>
        <div>
          <span>Время для себя</span>
          <strong role="timer" aria-label="Время активного использования" aria-live="off">{formatTime(displayMs)}</strong>
        </div>
      </div>
      <div className="session-reward tabular-nums">
        <strong>
          +1 <span>через {remaining} сек</span>
        </strong>
        <small>{activity}</small>
      </div>
      <button className="button secondary small session-toggle" data-session-toggle onClick={onToggle}
        aria-label={running ? "Приостановить таймер" : "Продолжить таймер"}>
        {running ? <Pause size={16} strokeWidth={1.75} aria-hidden="true" /> : <Play size={16} strokeWidth={1.75} aria-hidden="true" />}
        {running ? "Пауза" : "Продолжить"}
      </button>
      <button className="session-music tabular-nums" onClick={onStats}>
        <Headphones size={16} aria-hidden="true"  strokeWidth={1.75}/>
        <span>
          <strong>{Math.floor(musicSeconds / 60)} мин</strong>
          <small>с любимой музыкой</small>
        </span>
        <ArrowUpRight size={16} aria-hidden="true"  strokeWidth={1.75}/>
      </button>
    </aside>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Armchair, Coins, Info, X } from "lucide-react";
import type { RoomNotification } from "@/lib/use-notifications";

function NotificationCard({ notification, onRemove }: {
  notification: RoomNotification;
  onRemove: (id: number) => void;
}) {
  const [closing, setClosing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  const duration = notification.kind === "info" ? 7000 : 5000;
  useEffect(() => {
    if (closing || paused) return;
    const timer = setTimeout(() => setClosing(true), duration);
    return () => clearTimeout(timer);
  }, [closing, paused, duration]);
  useEffect(() => {
    if (!closing) return;
    // Cleanup is independent of animationend, including reduced motion.
    const timer = setTimeout(() => onRemove(notification.id), 220);
    return () => clearTimeout(timer);
  }, [closing, notification.id, onRemove]);
  const Icon = notification.kind === "purchase" ? Armchair : notification.kind === "coins" ? Coins : Info;
  return (
    <div className="room-notification" data-kind={notification.kind} data-closing={closing}
      onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <span className="notification-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.75} /></span>
      <div className="notification-copy" role="status" aria-live="polite" aria-atomic="true">
        <strong className="tabular-nums">{notification.title}</strong>
        <p>{notification.message}</p>
      </div>
      <button className="notification-close" aria-label={`Закрыть уведомление: ${notification.title}`}
        onClick={() => setClosing(true)} disabled={closing}>
        <X size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function NotificationCenter({ notifications, onRemove }: {
  notifications: RoomNotification[];
  onRemove: (id: number) => void;
}) {
  return (
    <aside className="notification-center" aria-label="Уведомления">
      {/* A queue keeps simultaneous purchases and rewards readable, never replacing an error. */}
      {notifications.slice(0, 2).map((notification) => (
        <NotificationCard key={notification.id} notification={notification} onRemove={onRemove} />
      ))}
    </aside>
  );
}

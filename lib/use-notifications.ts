"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { coinLabel, earnedCoins, type RewardSnapshot } from "./notification-events";

export type RoomNotification = {
  id: number;
  kind: "purchase" | "coins" | "info";
  title: string;
  message: string;
};

export function useNotifications(snapshot: RewardSnapshot, notice: string, onSound?: (kind: RoomNotification["kind"]) => void) {
  const [notifications, setNotifications] = useState<RoomNotification[]>([]);
  const sequence = useRef(0);
  const previous = useRef<RewardSnapshot | null>(null);
  const notify = useCallback((entry: Omit<RoomNotification, "id">) => {
    const notification = { ...entry, id: ++sequence.current };
    setNotifications((current) => [...current, notification]);
    onSound?.(entry.kind);
  }, [onSound]);
  const remove = useCallback((id: number) => {
    setNotifications((current) => current.filter((entry) => entry.id !== id));
  }, []);
  const { scope, loaded, activeMs } = snapshot;
  useEffect(() => {
    const next = { scope, loaded, activeMs };
    const amount = earnedCoins(previous.current, next);
    if (previous.current && previous.current.scope !== scope) setNotifications([]);
    previous.current = next;
    if (amount > 0) notify({ kind: "coins", title: `+${amount} ${coinLabel(amount)}`, message: "За время в твоём пространстве" });
  }, [scope, loaded, activeMs, notify]);
  useEffect(() => {
    if (notice) notify({ kind: "info", title: "MyRoom", message: notice });
  }, [notice, notify]);
  return { notifications, notify, remove };
}

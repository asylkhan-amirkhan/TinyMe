"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import styles from "./intro.module.css";

type Phase = "idle" | "entering" | "revealing";
const EntryContext = createContext<(() => void) | null>(null);

// Keep the curtain above both routes so the room appears only after arrival.
export function EntryTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const busy = useRef(false);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enter = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    setPhase("entering");
    router.prefetch("/room");
    navigationTimer.current = setTimeout(() => router.push("/room"), 1350);
    // A failed client navigation must not leave a permanent black screen.
    fallbackTimer.current = setTimeout(() => window.location.assign("/room"), 12000);
  }, [router]);

  useEffect(() => {
    if (phase !== "entering" || pathname === "/" || pathname === "/intro") return;
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    const reveal = setTimeout(() => setPhase("revealing"), 180);
    return () => clearTimeout(reveal);
  }, [pathname, phase]);

  useEffect(() => {
    if (phase !== "revealing") return;
    const finish = setTimeout(() => {
      busy.current = false;
      setPhase("idle");
      document.getElementById("main-content")?.focus({ preventScroll: true });
    }, 1600);
    return () => clearTimeout(finish);
  }, [phase]);

  useEffect(() => () => {
    if (navigationTimer.current) clearTimeout(navigationTimer.current);
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
  }, []);

  return <EntryContext.Provider value={enter}>
    <div className={styles.journey} data-phase={phase}>
      <div inert={phase !== "idle"}>{children}</div>
      {phase !== "idle" && <>
        <div className={styles.entryDarkness} aria-hidden="true"><div className={styles.entryMist} /></div>
        <span className={styles.srOnly} role="status">Входим в комнату…</span>
      </>}
    </div>
  </EntryContext.Provider>;
}

export function EnterRoomLink() {
  const enter = useContext(EntryContext);
  return <Link href="/room" className={styles.enterLink} aria-label="Продолжить — войти в комнату"
    onNavigate={event => {
      if (!enter || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      event.preventDefault();
      enter();
    }} />;
}

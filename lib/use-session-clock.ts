"use client";
import { useEffect, useState } from "react";
import { displayedActiveMs } from "./session-clock";

export function useSessionClock(activeMs: number, running: boolean, cloud: boolean) {
  const [display, setDisplay] = useState(activeMs);
  useEffect(() => {
    setDisplay(activeMs);
    if (!cloud || !running) return;
    const started = performance.now();
    let paused = !navigator.onLine;
    const stop = () => { paused = true; };
    const update = () => {
      if (paused || !navigator.onLine) return;
      setDisplay(displayedActiveMs(activeMs, performance.now() - started, true));
    };
    const timer = setInterval(update, 1000);
    window.addEventListener("offline", stop);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("offline", stop);
      document.removeEventListener("visibilitychange", update);
    };
  }, [activeMs, running, cloud]);
  return cloud ? display : activeMs;
}

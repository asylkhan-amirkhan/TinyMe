import { backgroundGapMs } from "./background-session";
/** Presentation estimate only: never used to award or save coins. */
export function displayedActiveMs(confirmedMs: number, elapsedMs: number, running: boolean) {
  return confirmedMs + (running ? Math.min(backgroundGapMs, Math.max(0, elapsedMs)) : 0);
}
export function sessionCountdown(activeMs: number) {
  return 60 - Math.floor((activeMs % 60000) / 1000);
}

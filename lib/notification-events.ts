export type RewardSnapshot = { scope: string; loaded: boolean; activeMs: number };

// Observe confirmed active time, never balance changes (purchases also change balance).
export function earnedCoins(previous: RewardSnapshot | null, next: RewardSnapshot) {
  if (!previous?.loaded || !next.loaded || previous.scope !== next.scope) return 0;
  if (!Number.isFinite(previous.activeMs) || !Number.isFinite(next.activeMs)) return 0;
  return Math.max(0, Math.floor(next.activeMs / 60000) - Math.floor(previous.activeMs / 60000));
}

export function coinLabel(amount: number) {
  const last = amount % 10, lastTwo = amount % 100;
  return last === 1 && lastTwo !== 11 ? "монета" : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? "монеты" : "монет";
}

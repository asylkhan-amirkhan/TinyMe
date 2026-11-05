import type { ListenStat, Track } from "./music-storage";

type TrackSummary = { id: string; title: string; seconds: number; plays: number };
export type StatisticsPeriod = "1" | "7" | "30" | "all";
const DAY = 86_400_000;
const ordinal = (day: string) => Math.floor(Date.parse(`${day}T00:00:00Z`) / DAY);
const dayKey = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);

export function listeningTime(seconds: number): string {
  const value = Math.max(0, Math.floor(seconds));
  if (value < 60) return `${value} сек`;
  if (value < 3600) return `${Math.floor(value / 60)} мин`;
  return `${Math.floor(value / 3600)} ч ${Math.floor(value % 3600 / 60)} мин`;
}

export function listeningExactTime(seconds: number): string {
  const value = Math.max(0, Math.floor(seconds));
  if (value < 60) return `${value} сек`;
  return `${value >= 3600 ? `${Math.floor(value / 3600)} ч ` : ""}${Math.floor(value % 3600 / 60)} мин ${value % 60} сек`;
}

/** Calendar arithmetic uses UTC day ordinals, while today is a local date key.
 * This keeps calendar days correct through DST without inventing hourly data. */
export function listeningDashboard(history: ListenStat[], tracks: Track[], period: StatisticsPeriod, today: string) {
  const end = ordinal(today);
  const valid = history.filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s.day) &&
    Number.isFinite(ordinal(s.day)) && s.day <= today);
  const first = valid.reduce((min, s) => Math.min(min, ordinal(s.day)), end);
  const start = period === "all" ? first : end - Number(period) + 1;
  const dayCount = end - start + 1;
  const selected = valid.filter(s => ordinal(s.day) >= start);
  const seconds = selected.reduce((sum, s) => sum + s.seconds, 0);
  const plays = selected.reduce((sum, s) => sum + s.plays, 0);
  const completed = selected.reduce((sum, s) => sum + s.completed, 0);
  const previousSeconds = period === "all" ? null : valid
    .filter(s => ordinal(s.day) >= start - dayCount && ordinal(s.day) < start)
    .reduce((sum, s) => sum + s.seconds, 0);
  const byDay = new Map<string, { seconds: number; plays: number }>();
  for (const s of valid) {
    const old = byDay.get(s.day) ?? { seconds: 0, plays: 0 };
    byDay.set(s.day, { seconds: old.seconds + s.seconds, plays: old.plays + s.plays });
  }
  const activeDays = [...byDay].filter(([day, value]) => ordinal(day) >= start && value.seconds > 0).length;
  const monthly = dayCount > 62;
  const buckets: { key: string; seconds: number; plays: number }[] = [];
  if (monthly) {
    const cursor = new Date(start * DAY);
    cursor.setUTCDate(1);
    while (cursor.getTime() / DAY <= end) {
      buckets.push({ key: cursor.toISOString().slice(0, 7), seconds: 0, plays: 0 });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  } else {
    for (let day = start; day <= end; day++) buckets.push({ key: dayKey(day), seconds: 0, plays: 0 });
  }
  const bucketMap = new Map(buckets.map(b => [b.key, b]));
  for (const stat of selected) {
    const bucket = bucketMap.get(monthly ? stat.day.slice(0, 7) : stat.day);
    if (bucket) { bucket.seconds += stat.seconds; bucket.plays += stat.plays; }
  }
  const calendar = Array.from({ length: 28 }, (_, i) => {
    const day = dayKey(end - 27 + i);
    return { key: day, ...(byDay.get(day) ?? { seconds: 0, plays: 0 }) };
  });
  return { seconds, plays, completed, previousSeconds, dayCount, activeDays,
    average: seconds / dayCount, top: summarizeTracks(selected, tracks), buckets, monthly, calendar,
    start: dayKey(start), end: today };
}

export function summarizeTracks(stats: ListenStat[], tracks: Track[]): TrackSummary[] {
  const available = new Set(tracks.map(track => track.id));
  const uniqueTitles = new Map<string, string | null>();
  for (const track of tracks) {
    uniqueTitles.set(track.title, uniqueTitles.has(track.title) ? null : track.id);
  }
  const summaries = new Map<string, TrackSummary>();
  for (const stat of stats) {
    // Legacy history has no file fingerprint. Only reconnect a missing ID when
    // its exact title identifies one remaining track; never merge live versions
    // or discard history. Keep raw records intact for daily totals and storage.
    const id = available.has(stat.trackId)
      ? stat.trackId
      : uniqueTitles.get(stat.title) ?? stat.trackId;
    const summary = summaries.get(id) ?? { id, title: stat.title, seconds: 0, plays: 0 };
    summary.seconds += stat.seconds;
    summary.plays += stat.plays;
    summaries.set(id, summary);
  }
  return [...summaries.values()].sort((a, b) => b.seconds - a.seconds);
}

export const backgroundGapMs = 90000;
export type ActivitySnapshot = { activeMs: number; balance: number; balanceRevision: number; seq: number };
type Action = "start" | "beat" | "pause" | "cancel";
type Options = {
  cloud: boolean;
  now: () => number;
  id: () => string;
  request: (action: Action, session: string, seq: number) => Promise<ActivitySnapshot>;
  elapsed: (ms: number) => void;
  snapshot: (data: ActivitySnapshot) => void;
  status: (message: string, running: boolean) => void;
};

/** One session, independent of document focus. Only live, bounded intervals count. */
export class BackgroundSession {
  private running = false;
  private disposed = false;
  private previous = 0;
  private session: string | null = null;
  private seq = 0;
  private pending: Promise<void> = Promise.resolve();
  private queued = 0;
  constructor(private options: Options) {}
  private report(message: string) {
    if (!this.disposed) this.options.status(message, this.running);
  }
  start() {
    if (this.running || this.disposed) return this.pending;
    this.running = true;
    this.previous = this.options.now();
    this.report("Время идёт в фоне · 1 монета / мин");
    return this.options.cloud ? this.enqueue("beat") : Promise.resolve();
  }
  tick() {
    if (!this.running || this.disposed) return this.pending;
    if (this.options.cloud) return this.queued ? this.pending : this.enqueue("beat");
    const now = this.options.now();
    const delta = Math.floor(now - this.previous);
    if (delta < 0 || delta > backgroundGapMs) {
      this.previous = now; // Sleep/frozen pages do not become retroactive earnings.
      this.report("Отсчёт продолжен · время сна не учтено");
    } else if (delta > 0) {
      this.previous += delta;
      this.options.elapsed(delta);
    }
    return Promise.resolve();
  }
  pause(discard = false) {
    if (!this.running) return this.pending;
    if (!this.options.cloud && !discard) void this.tick();
    this.running = false;
    this.report(discard ? "Нет связи · таймер на паузе" : "Таймер на паузе");
    return this.options.cloud ? this.enqueue(discard ? "cancel" : "pause") : Promise.resolve();
  }
  private enqueue(action: "beat" | "pause" | "cancel") {
    ++this.queued;
    this.pending = this.pending.then(async () => {
      if (action === "beat" && (!this.running || this.disposed)) return;
      if (action !== "beat" && !this.session) return;
      const actual = action === "beat" && !this.session ? "start" : action;
      const id = this.session ?? this.options.id();
      try {
        const data = await this.options.request(actual, id, actual === "start" ? 0 : this.seq + 1);
        this.session = actual === "pause" || actual === "cancel" ? null : id;
        this.seq = data.seq;
        if (!this.disposed) this.options.snapshot(data);
        if (action === "beat" && this.running) this.report("Время идёт в фоне · 1 монета / мин");
      } catch (error) {
        this.session = null;
        if (this.running) this.report((error as Error).message);
      }
    }).finally(() => { --this.queued; });
    return this.pending;
  }
  dispose() {
    const pending = this.pause();
    this.disposed = true;
    return pending;
  }
}

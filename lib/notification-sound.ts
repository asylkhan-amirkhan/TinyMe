export type NotificationSoundKind = "purchase" | "coins";
export const soundPreferenceKey = "myroom:notification-sounds";
export function savedSoundEnabled(value: string | null) { return value !== "false"; }
export type SoundChannels = Record<NotificationSoundKind, boolean>;
export const soundChannelsKey = "myroom:notification-sound-channels";
export function savedSoundChannels(value: string | null): SoundChannels {
  const defaults = { purchase: true, coins: false };
  try {
    const parsed = JSON.parse(value ?? "null");
    return {
      purchase: typeof parsed?.purchase === "boolean" ? parsed.purchase : defaults.purchase,
      coins: typeof parsed?.coins === "boolean" ? parsed.coins : defaults.coins,
    };
  } catch { return defaults; }
}

// Soft sine chimes: short attack, quiet harmonic, long natural decay; no external files.
const notes = {
  purchase: [[392, 0, .046], [493.88, .055, .032], [587.33, .11, .025]],
  coins: [[880, 0, .038], [1174.66, .075, .027]],
} as const;

export class NotificationSound {
  private context: AudioContext | null = null;
  private voices = new Set<{ oscillator: OscillatorNode; gain: GainNode; kind: NotificationSoundKind }>();
  private channels: SoundChannels = { purchase: true, coins: true };
  private enabled = true;
  private disposed = false;
  private generation = 0;
  private lastPlay = -Infinity;

  async unlock() {
    if (!this.enabled || this.disposed || typeof AudioContext === "undefined") return false;
    const generation = this.generation;
    try {
      this.context ??= new AudioContext();
      if (this.context.state !== "running") await this.context.resume();
      return this.enabled && !this.disposed && generation === this.generation && this.context.state === "running";
    } catch { return false; }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    ++this.generation;
    if (!enabled) {
      const now = this.context?.currentTime ?? 0;
      for (const voice of this.voices) {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setTargetAtTime(0, now, .008);
        try { voice.oscillator.stop(now + .03); } catch {}
      }
    }
    this.lastPlay = -Infinity;
  }

  play(kind: NotificationSoundKind) {
    const context = this.context;
    if (!this.enabled || !this.channels[kind] || this.disposed || !context || context.state !== "running") return false;
    const now = context.currentTime;
    // A burst of purchases should never become a loud stack of tones.
    if (now - this.lastPlay < .45) return false;
    this.lastPlay = now;
    for (const [frequency, delay, level] of notes[kind]) {
      for (const [ratio, strength] of [[1, 1], [2, .1]]) {
        const oscillator = context.createOscillator(), gain = context.createGain();
        const start = now + delay, end = start + .55;
        oscillator.type = "sine";
        oscillator.frequency.value = frequency * ratio;
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(level * strength * .6, start + .012);
        gain.gain.exponentialRampToValueAtTime(.00001, end);
        oscillator.connect(gain); gain.connect(context.destination);
        const voice = { oscillator, gain, kind };
        this.voices.add(voice);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.voices.delete(voice); };
        oscillator.start(start); oscillator.stop(end + .02);
      }
    }
    return true;
  }

  setKindEnabled(kind: NotificationSoundKind, enabled: boolean) {
    this.channels[kind] = enabled;
    if (enabled) return;
    const now = this.context?.currentTime ?? 0;
    for (const voice of this.voices) {
      if (voice.kind !== kind) continue;
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setTargetAtTime(0, now, .008);
      try { voice.oscillator.stop(now + .03); } catch {}
    }
  }

  dispose() {
    this.disposed = true;
    ++this.generation;
    for (const voice of this.voices) {
      try { voice.oscillator.stop(); } catch {}
      voice.oscillator.disconnect(); voice.gain.disconnect();
    }
    this.voices.clear();
    void this.context?.close().catch(() => {});
    this.context = null;
  }
}

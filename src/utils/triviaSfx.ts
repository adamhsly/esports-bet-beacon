// Tiny synth-based audio cues so we don't ship audio assets.
// Lazy-creates an AudioContext on first user gesture-driven call.
let _ctx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (_ctx) return _ctx;
  try {
    const Ctor: typeof AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    _ctx = new Ctor();
    return _ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, durationMs: number, type: OscillatorType = "sine", gain = 0.04) {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + durationMs / 1000 + 0.02);
}

export const triviaSfx = {
  correct() {
    tone(660, 120, "sine", 0.05);
    setTimeout(() => tone(990, 160, "sine", 0.05), 100);
  },
  incorrect() {
    tone(220, 180, "sawtooth", 0.04);
    setTimeout(() => tone(160, 220, "sawtooth", 0.04), 90);
  },
  tick() {
    tone(880, 35, "square", 0.02);
  },
  timeout() {
    tone(180, 280, "triangle", 0.05);
  },
};

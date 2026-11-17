// EMBERWATCH audio: tiny WebAudio synth blips — no assets, no network.
// Every action gets a sound: chops thock, gathers pop, crafts knock, the
// Hollowood hisses and dies with a crackle, and dawn breaks with a chord.

let ctx = null;
let muted = false;

export function ensureAudio() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function toggleMute() { muted = !muted; return muted; }

function blip(freq, dur, type = 'sine', gain = 0.08, slide = 0) {
  if (muted || !ensureAudio()) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t); osc.stop(t + dur + 0.02);
}

export const sfx = {
  chop() { blip(140, 0.09, 'square', 0.10, -60); },
  fell() { blip(90, 0.35, 'sawtooth', 0.10, -50); blip(220, 0.2, 'sine', 0.06, -120); },
  gather() { blip(660, 0.08, 'sine', 0.07, 240); },
  craft() { blip(320, 0.07, 'square', 0.08); setTimeout(() => blip(430, 0.09, 'square', 0.08), 60); },
  feed() { blip(180, 0.25, 'triangle', 0.10, 160); },
  swing() { blip(900, 0.05, 'sine', 0.03, -500); },
  hit() { blip(240, 0.06, 'square', 0.09, -90); },
  hurt() { blip(120, 0.18, 'sawtooth', 0.12, -40); },
  kill() { blip(520, 0.16, 'triangle', 0.09, -380); },
  rescue() { blip(523, 0.12, 'sine', 0.09); setTimeout(() => blip(784, 0.18, 'sine', 0.09), 90); },
  dawn() { [392, 523, 659].forEach((f, i) => setTimeout(() => blip(f, 0.3, 'sine', 0.08), i * 110)); },
  dusk() { [330, 262, 196].forEach((f, i) => setTimeout(() => blip(f, 0.3, 'triangle', 0.08), i * 120)); },
  draft() { blip(587, 0.14, 'sine', 0.08); setTimeout(() => blip(880, 0.2, 'sine', 0.08), 100); },
  boss() { blip(65, 0.7, 'sawtooth', 0.14, 20); blip(98, 0.7, 'square', 0.08, -10); },
  lose() { [262, 208, 165, 131].forEach((f, i) => setTimeout(() => blip(f, 0.35, 'triangle', 0.09), i * 160)); },
  win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.32, 'sine', 0.09), i * 120)); },
};

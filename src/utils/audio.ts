/**
 * Digital Decay - Custom Web Audio Synthesizer
 * Generates unique futuristic sound signatures live using native browser oscillators.
 * Zero external audio files. 100% offline, privacy-first, and instant.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * "The Digital Dissolve" (~1.4s) - Played on local data cleanup.
 * Phase 1: Digital Charge / Purge Sweep (0.0s - 0.7s)
 * Phase 2: Dual Harmonic "All Clean" Bell Chime (0.45s - 1.4s)
 */
export function playDecayCleanSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Phase 1: Digital Charge / Purge Sweep
    const osc1 = ctx.createOscillator();
    const filter1 = ctx.createBiquadFilter();
    const gain1 = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(320, now);
    osc1.frequency.linearRampToValueAtTime(750, now + 0.25);
    osc1.frequency.exponentialRampToValueAtTime(80, now + 0.85);

    filter1.type = 'lowpass';
    filter1.frequency.setValueAtTime(800, now);
    filter1.frequency.linearRampToValueAtTime(2800, now + 0.25);
    filter1.frequency.exponentialRampToValueAtTime(150, now + 0.85);
    filter1.Q.setValueAtTime(8.0, now);

    gain1.gain.setValueAtTime(0.01, now);
    gain1.gain.linearRampToValueAtTime(0.22, now + 0.25);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    osc1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.85);

    // Phase 2: Dual Harmonic Bell Chime
    const chimeFreqs = [587.33, 880.0, 1174.66]; // D5, A5, D6 harmonic chord
    chimeFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + 0.45 + i * 0.06);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.setValueAtTime(0.12 - i * 0.02, now + 0.45 + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + 0.45 + i * 0.06);
      osc.stop(now + 1.4);
    });
  } catch (err) {
    console.warn('[Digital Decay] Audio playback skipped:', err);
  }
}

/**
 * "The Shield Lock" (~1.2s) - Played when protecting/shielding a site.
 * 4-note ascending celestial shield chord: C5 -> E5 -> G5 -> C6
 */
export function playShieldSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.setValueAtTime(0.16, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7 + idx * 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + 1.2);
    });
  } catch (err) {
    console.warn('[Digital Decay] Audio playback skipped:', err);
  }
}

/**
 * "The Tactical Sonar Ping" (~0.8s) - Authentic acoustic submarine/radar pulse.
 * Clean, resonant high-Q pulse at 1150Hz with exponential decay.
 */
export function playSonarPingSound(freq = 1150): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.96, now + 0.35);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, now);
    filter.Q.setValueAtTime(14.0, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.75);
  } catch (err) {
    console.warn('[Digital Decay] Sonar audio playback skipped:', err);
  }
}


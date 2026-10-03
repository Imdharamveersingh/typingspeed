// Web Audio API synthesizer for typing sounds (zero external dependencies)
import { SoundMode, SoundTheme } from '../engine/settingsTypes';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    try {
      audioCtx = new AudioContextClass();
    } catch {
      return null;
    }
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

export function playKeystrokeSound(
  type: 'correct' | 'incorrect',
  mode: SoundMode,
  volume: number,
  theme: SoundTheme = 'click'
): void {
  if (mode === 'off' || volume <= 0) return;
  if (mode === 'error-only' && type !== 'incorrect') return;
  if (mode === 'key-only' && type === 'incorrect') return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const masterGain = ctx.createGain();
  const normalizedVolume = Math.min(1, Math.max(0, volume / 100)) * 0.25; // max 0.25 for comfort
  masterGain.gain.setValueAtTime(normalizedVolume, ctx.currentTime);
  masterGain.connect(ctx.destination);

  if (type === 'incorrect') {
    // Error sound: low pitched dissonance / thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(masterGain.gain.value * 1.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    return;
  }

  // Key sound: click or beep
  if (theme === 'beep') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    // Small random frequency variation for natural feel
    const freq = 680 + (Math.random() * 40 - 20);
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(masterGain.gain.value * 0.7, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } else {
    // Mechanical click simulation using filtered noise/short pop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const clickFreq = 1200 + (Math.random() * 200 - 100);
    osc.frequency.setValueAtTime(clickFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.025);

    gain.gain.setValueAtTime(masterGain.gain.value * 0.9, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.028);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  }
}

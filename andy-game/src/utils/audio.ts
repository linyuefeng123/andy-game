import { useGameStore } from '../store/useGameStore';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export function playSound(type: 'click' | 'ding' | 'win' | 'error') {
  if (!useGameStore.getState().audioEnabled) return;
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume();

  const createOsc = () => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    return { oscillator, gain };
  };

  switch (type) {
    case 'click': {
      const { oscillator, gain } = createOsc();
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      break;
    }
    case 'ding': {
      const { oscillator, gain } = createOsc();
      oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      break;
    }
    case 'win': {
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        const { oscillator, gain } = createOsc();
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
        oscillator.type = 'sine';
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
        oscillator.start(ctx.currentTime + i * 0.15);
        oscillator.stop(ctx.currentTime + i * 0.15 + 0.3);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
      break;
    }
    case 'error': {
      const { oscillator, gain } = createOsc();
      oscillator.frequency.setValueAtTime(200, ctx.currentTime);
      oscillator.type = 'square';
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      break;
    }
  }
}

// --- Background Music: Procedural Lullaby ---

// C major pentatonic frequencies
const C4 = 261.63, D4 = 293.66, E4 = 329.63, G4 = 392.00, A4 = 440.00;
const C5 = 523.25, C3 = 130.81, G3 = 196.00;

interface NoteDef { freq: number; start: number; dur: number }

// 8-bar lullaby melody, each bar ~1.5s
const LULLABY: NoteDef[][] = [
  // Bar 1: C E G E
  [{ freq: C4, start: 0, dur: 0.35 }, { freq: E4, start: 0.4, dur: 0.35 }, { freq: G4, start: 0.8, dur: 0.35 }, { freq: E4, start: 1.15, dur: 0.3 }],
  // Bar 2: A G E D
  [{ freq: A4, start: 0, dur: 0.7 }, { freq: G4, start: 0.75, dur: 0.35 }, { freq: E4, start: 1.1, dur: 0.35 }],
  // Bar 3: C D E G
  [{ freq: C4, start: 0, dur: 0.35 }, { freq: D4, start: 0.4, dur: 0.35 }, { freq: E4, start: 0.8, dur: 0.35 }, { freq: G4, start: 1.15, dur: 0.3 }],
  // Bar 4: A G C5
  [{ freq: A4, start: 0, dur: 0.7 }, { freq: G4, start: 0.75, dur: 0.35 }, { freq: C5, start: 1.1, dur: 0.35 }],
  // Bar 5: C E G E (repeat)
  [{ freq: C4, start: 0, dur: 0.35 }, { freq: E4, start: 0.4, dur: 0.35 }, { freq: G4, start: 0.8, dur: 0.35 }, { freq: E4, start: 1.15, dur: 0.3 }],
  // Bar 6: D E C4
  [{ freq: D4, start: 0, dur: 0.7 }, { freq: E4, start: 0.75, dur: 0.35 }, { freq: C4, start: 1.1, dur: 0.35 }],
  // Bar 7: G A G E
  [{ freq: G4, start: 0, dur: 0.35 }, { freq: A4, start: 0.4, dur: 0.35 }, { freq: G4, start: 0.8, dur: 0.35 }, { freq: E4, start: 1.15, dur: 0.3 }],
  // Bar 8: C4 (long final)
  [{ freq: C4, start: 0, dur: 1.0 }],
];

// Bass notes on even bars
const BASS: Record<number, number> = { 0: C3, 2: C3, 4: G3, 6: G3 };

const BAR_DURATION = 1.5;

export interface BGMPlayer {
  start: () => void;
  stop: () => void;
  destroy: () => void;
}

export function createBGMPlayer(): BGMPlayer {
  let ctx: AudioContext | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let barIndex = 0;

  const getCtx = () => {
    if (!ctx) {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return ctx;
  };

  const playNote = (freq: number, startTime: number, dur: number, vol: number) => {
    if (!ctx) return;
    const c = ctx;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.05);
    gain.gain.setValueAtTime(vol, startTime + Math.max(0.06, dur - 0.3));
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

    osc.start(startTime);
    osc.stop(startTime + dur);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  };

  const playBar = (bar: number) => {
    if (!ctx) return;
    const c = ctx;
    const now = c.currentTime + 0.05;
    const notes = LULLABY[bar % LULLABY.length];

    // Melody
    for (const n of notes) {
      playNote(n.freq, now + n.start, n.dur, 0.06);
      // Shimmer: perfect fifth above
      playNote(n.freq * 1.5, now + n.start, n.dur, 0.02);
    }

    // Bass on even bars
    if (bar in BASS) {
      playNote(BASS[bar], now, BAR_DURATION * 0.8, 0.03);
    }
  };

  return {
    start: () => {
      const c = getCtx();
      if (c.state === 'suspended') c.resume();
      barIndex = 0;
      playBar(0);
      intervalId = setInterval(() => {
        barIndex = (barIndex + 1) % LULLABY.length;
        playBar(barIndex);
      }, BAR_DURATION * 1000);
    },
    stop: () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
    destroy: () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (ctx) {
        ctx.close();
        ctx = null;
      }
    },
  };
}

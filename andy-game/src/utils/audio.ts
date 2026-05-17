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

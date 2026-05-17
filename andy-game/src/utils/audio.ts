const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

export function playSound(type: 'click' | 'ding' | 'win' | 'error') {
  const ctx = audioContext;
  if (ctx.state === 'suspended') ctx.resume();

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.connect(gain);
  gain.connect(ctx.destination);

  switch (type) {
    case 'click':
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
      break;
    case 'ding':
      oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
      break;
    case 'win': {
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g);
        g.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
        osc.type = 'sine';
        g.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.3);
      });
      return;
    }
    case 'error':
      oscillator.frequency.setValueAtTime(200, ctx.currentTime);
      oscillator.type = 'square';
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
      break;
  }
}

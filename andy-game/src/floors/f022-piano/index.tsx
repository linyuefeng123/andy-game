import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 22;

interface NoteDef {
  name: string;
  nameZh: string;
  freq: number;
  color: string;
}

const NOTES: NoteDef[] = [
  { name: 'C', nameZh: 'Do', freq: 261.63, color: '#ff6b6b' },
  { name: 'D', nameZh: 'Re', freq: 293.66, color: '#ff9f43' },
  { name: 'E', nameZh: 'Mi', freq: 329.63, color: '#ffd93d' },
  { name: 'F', nameZh: 'Fa', freq: 349.23, color: '#6bcb77' },
  { name: 'G', nameZh: 'Sol', freq: 392.00, color: '#4d96ff' },
  { name: 'A', nameZh: 'La', freq: 440.00, color: '#9b72cf' },
  { name: 'B', nameZh: 'Si', freq: 493.88, color: '#ff6b9d' },
  { name: 'C2', nameZh: 'Do', freq: 523.25, color: '#ff6b6b' },
];

function getMelodyLength(difficulty: 1 | 2 | 3): number {
  if (difficulty === 1) return 3;
  if (difficulty === 2) return 4;
  return 5;
}

function generateMelody(length: number): number[] {
  const melody: number[] = [];
  for (let i = 0; i < length; i++) {
    melody.push(Math.floor(Math.random() * NOTES.length));
  }
  return melody;
}

function playNote(freq: number) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch {
    // Web Audio not available
  }
}

type GamePhase = 'intro' | 'listening' | 'playing' | 'finished';

export default function MiniPianoGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);
  const melodyLength = getMelodyLength(difficulty);

  const [melody] = useState<number[]>(() => generateMelody(melodyLength));
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [playerInput, setPlayerInput] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [activeNote, setActiveNote] = useState<number | null>(null);
  const [highlightNote, setHighlightNote] = useState<number | null>(null);
  const [helpHint, setHelpHint] = useState<number | null>(null);
  const playTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const playNoteWithCtx = useCallback((noteIdx: number) => {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(NOTES[noteIdx].freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // fallback
      playNote(NOTES[noteIdx].freq);
    }
  }, [getAudioCtx]);

  // Play the melody for the player to hear
  const playMelody = useCallback(() => {
    // Clear any existing timeouts
    playTimeouts.current.forEach(clearTimeout);
    playTimeouts.current = [];

    setPhase('listening');
    melody.forEach((noteIdx, i) => {
      const t1 = setTimeout(() => {
        setActiveNote(noteIdx);
        playNoteWithCtx(noteIdx);
      }, i * 700 + 300);
      const t2 = setTimeout(() => {
        setActiveNote(null);
      }, i * 700 + 700);
      playTimeouts.current.push(t1, t2);
    });

    const endTime = setTimeout(() => {
      setPhase('playing');
      setPlayerInput([]);
    }, melody.length * 700 + 500);
    playTimeouts.current.push(endTime);
  }, [melody, playNoteWithCtx]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      playTimeouts.current.forEach(clearTimeout);
    };
  }, []);

  const handleKeyClick = useCallback((noteIdx: number) => {
    if (phase !== 'playing') return;
    playNoteWithCtx(noteIdx);
    setActiveNote(noteIdx);
    setTimeout(() => setActiveNote(null), 200);

    const newInput = [...playerInput, noteIdx];
    setPlayerInput(newInput);
    setHelpHint(null);

    // Check after each note
    const step = newInput.length - 1;
    if (newInput[step] !== melody[step]) {
      // Wrong note
      setAttempts((a) => a + 1);
      setPlayerInput([]);
      if (attempts + 1 >= 3) {
        // Too many wrong attempts, still finish but with 1 star
        setPhase('finished');
      } else {
        // Replay melody and try again
        setTimeout(playMelody, 800);
      }
      return;
    }

    // Correct so far - check if complete
    if (newInput.length === melody.length) {
      setPhase('finished');
    }
  }, [phase, playerInput, melody, attempts, playNoteWithCtx, playMelody]);

  const handleHelp = () => {
    if (helpRemaining <= 0 || phase !== 'playing') return;
    // Show the next correct note
    const nextIdx = playerInput.length;
    if (nextIdx < melody.length) {
      setHelpHint(melody[nextIdx]);
      onHelpUsed();
      setTimeout(() => setHelpHint(null), 3000);
    }
  };

  const getStars = () => {
    if (attempts === 0) return 3;
    if (attempts === 1) return 2;
    return 1;
  };

  const handleWin = () => {
    onComplete(getStars(), getFloorMeta(FLOOR_NUM).reward);
    onExit();
  };

  const handleConcede = () => {
    onConcede();
    onExit();
  };

  if (phase === 'intro') {
    return (
      <div className={styles.container}>
        <motion.div
          className={styles.introCard}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <div className={styles.introEmoji}>🎹</div>
          <h2 className={styles.introTitle}>
            {language === 'zh' ? '小小钢琴' : 'Mini Piano'}
          </h2>
          <p className={styles.introDesc}>
            {language === 'zh'
              ? `听一段${melodyLength}个音符的旋律，然后按琴键重复它！`
              : `Listen to a ${melodyLength}-note melody, then repeat it on the keys!`}
          </p>
          <button className={styles.startButton} onClick={playMelody}>
            {language === 'zh' ? '听旋律！' : 'Listen!'}
          </button>
        </motion.div>
      </div>
    );
  }

  if (phase === 'finished') {
    const stars = getStars();
    return (
      <div className={styles.container}>
        <motion.div
          className={styles.resultCard}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <div className={styles.resultEmoji}>🎹</div>
          <h2 className={styles.resultTitle}>
            {stars === 3
              ? (language === 'zh' ? '完美演奏！' : 'Perfect!')
              : stars === 2
                ? (language === 'zh' ? '弹得不错！' : 'Good job!')
                : (language === 'zh' ? '继续加油！' : 'Keep trying!')}
          </h2>
          <p className={styles.resultInfo}>
            {language === 'zh'
              ? `尝试了 ${attempts + 1} 次`
              : `${attempts + 1} attempts`}
          </p>
          <div className={styles.starRow}>
            {[1, 2, 3].map((i) => (
              <span key={i} className={i <= stars ? styles.starActive : styles.starInactive}>⭐</span>
            ))}
          </div>
          <div className={styles.resultButtons}>
            <button className={styles.replayButton} onClick={onReplay}>
              🔄 {language === 'zh' ? '再玩一次！' : 'Replay!'}
            </button>
            <button className={styles.winButton} onClick={handleWin}>
              ⭐ {language === 'zh' ? '继续冒险' : 'Continue'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.phaseInfo}>
        {phase === 'listening' && (
          <motion.span
            className={styles.phaseText}
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            {language === 'zh' ? '🎧 仔细听旋律...' : '🎧 Listen carefully...'}
          </motion.span>
        )}
        {phase === 'playing' && (
          <span className={styles.phaseText}>
            {language === 'zh'
              ? `🎵 你的回合！(${playerInput.length}/${melody.length})`
              : `🎵 Your turn! (${playerInput.length}/${melody.length})`}
          </span>
        )}
      </div>

      {/* Progress dots */}
      <div className={styles.progressDots}>
        {melody.map((_, i) => (
          <span
            key={i}
            className={`${styles.dot} ${i < playerInput.length ? styles.dotFilled : ''}`}
          />
        ))}
      </div>

      {/* Piano keys */}
      <div className={styles.piano}>
        {NOTES.map((note, i) => (
          <motion.button
            key={note.name}
            className={`${styles.key} ${activeNote === i ? styles.keyActive : ''} ${helpHint === i ? styles.keyHint : ''}`}
            style={{
              background: activeNote === i ? note.color : `linear-gradient(180deg, ${note.color}, ${note.color}88)`,
              boxShadow: activeNote === i ? `0 0 20px ${note.color}88` : 'none',
            }}
            onClick={() => handleKeyClick(i)}
            disabled={phase !== 'playing'}
            whileTap={{ scale: 0.92 }}
          >
            <span className={styles.keyLabel}>
              {language === 'zh' ? note.nameZh : note.name}
            </span>
          </motion.button>
        ))}
      </div>

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || phase !== 'playing'}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        {phase === 'playing' && (
          <button className={styles.replayMelody} onClick={playMelody}>
            {language === 'zh' ? '🔊 再听一次' : '🔊 Replay'}
          </button>
        )}
        <button className={styles.skipLink} onClick={handleConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

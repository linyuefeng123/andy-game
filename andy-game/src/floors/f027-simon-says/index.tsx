import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 27;

type Color = 'red' | 'blue' | 'green' | 'yellow';

const COLORS: { key: Color; bg: string; activeBg: string }[] = [
  { key: 'red', bg: '#8b2020', activeBg: '#ff4444' },
  { key: 'blue', bg: '#1a3a8b', activeBg: '#4488ff' },
  { key: 'green', bg: '#1a6b2a', activeBg: '#44dd66' },
  { key: 'yellow', bg: '#8b7a1a', activeBg: '#ffdd44' },
];

function getFlashSpeed(difficulty: 1 | 2 | 3): number {
  if (difficulty === 1) return 800; // slow
  if (difficulty === 2) return 500; // normal
  return 300; // fast
}

export default function SimonSaysGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);
  const flashSpeed = getFlashSpeed(difficulty);

  const [sequence, setSequence] = useState<Color[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'showing' | 'input' | 'gameover'>('idle');
  const [activeColor, setActiveColor] = useState<Color | null>(null);
  const [round, setRound] = useState(0);
  const [helpHint, setHelpHint] = useState<Color | null>(null);
  const [started, setStarted] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const addRandomColor = useCallback((): Color[] => {
    const newColor: Color = COLORS[Math.floor(Math.random() * COLORS.length)].key;
    return [...sequence, newColor];
  }, [sequence]);

  const showSequence = useCallback((seq: Color[]) => {
    clearTimeouts();
    setPhase('showing');
    setActiveColor(null);

    seq.forEach((color, idx) => {
      const showTimeout = setTimeout(() => {
        setActiveColor(color);
      }, idx * (flashSpeed + 200));
      timeoutsRef.current.push(showTimeout);

      const hideTimeout = setTimeout(() => {
        setActiveColor(null);
      }, idx * (flashSpeed + 200) + flashSpeed);
      timeoutsRef.current.push(hideTimeout);
    });

    const doneTimeout = setTimeout(() => {
      setPhase('input');
      setPlayerIndex(0);
    }, seq.length * (flashSpeed + 200) + 300);
    timeoutsRef.current.push(doneTimeout);
  }, [flashSpeed]);

  const startGame = useCallback(() => {
    const firstColor: Color = COLORS[Math.floor(Math.random() * COLORS.length)].key;
    const newSeq = [firstColor];
    setSequence(newSeq);
    setRound(1);
    setStarted(true);
    setHelpHint(null);
    showSequence(newSeq);
  }, [showSequence]);

  const nextRound = useCallback(() => {
    const newSeq = addRandomColor();
    setSequence(newSeq);
    setRound((r) => r + 1);
    setHelpHint(null);
    showSequence(newSeq);
  }, [addRandomColor, showSequence]);

  const handleColorClick = useCallback((color: Color) => {
    if (phase !== 'input') return;
    setHelpHint(null);

    setActiveColor(color);
    setTimeout(() => setActiveColor(null), 200);

    if (color !== sequence[playerIndex]) {
      // Wrong! Game over
      setPhase('gameover');
      return;
    }

    const nextIdx = playerIndex + 1;
    if (nextIdx >= sequence.length) {
      // Completed this round successfully
      setPhase('idle');
      setTimeout(() => nextRound(), 600);
    } else {
      setPlayerIndex(nextIdx);
    }
  }, [phase, sequence, playerIndex, nextRound]);

  const handleHelp = () => {
    if (helpRemaining <= 0 || phase !== 'input') return;
    if (playerIndex < sequence.length) {
      setHelpHint(sequence[playerIndex]);
      onHelpUsed();
      setTimeout(() => setHelpHint(null), 2000);
    }
  };

  const getStars = () => {
    if (round >= 8) return 3;
    if (round >= 5) return 2;
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

  useEffect(() => {
    return () => clearTimeouts();
  }, []);

  if (phase === 'gameover') {
    const stars = getStars();
    return (
      <div className={styles.container}>
        <motion.div
          className={styles.resultCard}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <div className={styles.resultEmoji}>🔔</div>
          <h2 className={styles.resultTitle}>
            {language === 'zh' ? '记错了！' : 'Wrong!'}
          </h2>
          <p className={styles.resultInfo}>
            {language === 'zh'
              ? `你坚持到了第 ${round} 轮`
              : `You reached round ${round}`}
          </p>
          <div className={styles.starRow}>
            {[1, 2, 3].map((i) => (
              <span key={i} className={i <= stars ? styles.starActive : styles.starInactive}>⭐</span>
            ))}
          </div>
          <div className={styles.winButtons}>
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
      <div className={styles.gameInfo}>
        {started ? (
          <span className={styles.roundInfo}>
            {language === 'zh' ? `第 ${round} 轮` : `Round ${round}`}
          </span>
        ) : null}
        <span className={styles.phaseInfo}>
          {phase === 'idle' && !started && (language === 'zh' ? '准备好了吗？' : 'Ready?')}
          {phase === 'showing' && (language === 'zh' ? '仔细看...' : 'Watch carefully...')}
          {phase === 'input' && (language === 'zh' ? '你来重复！' : 'Your turn!')}
        </span>
      </div>

      <div className={styles.colorGrid}>
        {COLORS.map((c) => {
          const isActive = activeColor === c.key;
          const isHint = helpHint === c.key;
          return (
            <motion.button
              key={c.key}
              className={`${styles.colorButton} ${isActive ? styles.colorActive : ''} ${isHint ? styles.colorHint : ''}`}
              style={{ background: isActive ? c.activeBg : c.bg }}
              onClick={() => handleColorClick(c.key)}
              disabled={phase !== 'input'}
              animate={isActive ? { scale: 1.08 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            />
          );
        })}
      </div>

      {!started && (
        <button className={styles.startButton} onClick={startGame}>
          {language === 'zh' ? '开始游戏！' : 'Start!'}
        </button>
      )}

      {helpHint && (
        <motion.div
          className={styles.helpHintText}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          💡 {language === 'zh' ? '看闪亮的那个颜色！' : 'Look at the glowing color!'}
        </motion.div>
      )}

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || phase !== 'input'}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={handleConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

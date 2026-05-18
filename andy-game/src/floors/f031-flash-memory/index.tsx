import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 31;

const EMOJI_POOL = ['🐶','🐱','🐰','🦊','🐻','🐼','🐨','🦁','🐯','🐸','🐵','🦄','🐧','🦋','🌺','🍎'];

const TOTAL_ROUNDS = 5;
const SHOW_DURATION = 3; // seconds
const HELP_EXTRA_TIME = 3; // seconds

interface RoundData {
  gridSize: number; // 6 or 9
  emojis: string[];
  targetEmoji: string;
  targetIndex: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateRound(roundNum: number): RoundData {
  // Gradually increase difficulty: start with 6 cells, later rounds use 9
  const gridSize = roundNum <= 2 ? 6 : 9;
  const pool = shuffle(EMOJI_POOL);
  const emojis = pool.slice(0, gridSize);
  const targetIndex = Math.floor(Math.random() * gridSize);
  const targetEmoji = emojis[targetIndex];
  return { gridSize, emojis, targetEmoji, targetIndex };
}

type Phase = 'show' | 'question' | 'feedback' | 'result';

export default function FlashMemory({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [round, setRound] = useState(0);
  const [rounds] = useState<RoundData[]>(() =>
    Array.from({ length: TOTAL_ROUNDS }, (_, i) => generateRound(i + 1))
  );
  const [phase, setPhase] = useState<Phase>('show');
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(SHOW_DURATION);
  const [helpExtended, setHelpExtended] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const currentRound = rounds[round];

  // Countdown during show phase
  useEffect(() => {
    if (phase !== 'show') return;

    setCountdown(SHOW_DURATION);
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const totalDuration = (SHOW_DURATION + (helpExtended ? HELP_EXTRA_TIME : 0)) * 1000;
    timerRef.current = setTimeout(() => {
      setPhase('question');
    }, totalDuration);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, round, helpExtended]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCellClick = useCallback((index: number) => {
    if (phase !== 'question' || selectedIndex !== null) return;

    setSelectedIndex(index);
    const isCorrect = index === currentRound.targetIndex;
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    }

    setPhase('feedback');

    // After feedback, advance to next round or result
    timerRef.current = setTimeout(() => {
      if (round + 1 >= TOTAL_ROUNDS) {
        setGameOver(true);
      } else {
        setRound(prev => prev + 1);
        setPhase('show');
        setSelectedIndex(null);
        setHelpExtended(false);
      }
    }, 1200);
  }, [phase, selectedIndex, currentRound, round]);

  const handleHelp = useCallback(() => {
    if (helpRemaining <= 0 || phase !== 'show' || helpExtended) return;
    setHelpExtended(true);
    // Reset countdown to show extra time
    setCountdown(SHOW_DURATION + HELP_EXTRA_TIME);
    onHelpUsed();
  }, [helpRemaining, phase, helpExtended, onHelpUsed]);

  const getStars = useCallback((): number => {
    if (correctCount >= 5) return 3;
    if (correctCount >= 4) return 2;
    return 1;
  }, [correctCount]);

  const handleWin = () => {
    const stars = getStars();
    const reward = { emoji: '💫', nameZh: '记忆之星', nameEn: 'Memory Star' };
    if (stars < 3) {
      onConcede();
    } else {
      onComplete(stars, reward);
    }
    onExit();
  };

  if (gameOver) {
    const stars = getStars();
    return (
      <div className={styles.container}>
        <motion.div
          className={styles.winOverlay}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <div className={styles.winContent}>
            <span className={styles.winEmoji}>{stars >= 2 ? '🌟' : '💪'}</span>
            <h2 className={styles.winText}>
              {language === 'zh'
                ? stars >= 3 ? '太棒了！' : stars >= 2 ? '做得好！' : '继续加油！'
                : stars >= 3 ? 'Amazing!' : stars >= 2 ? 'Good job!' : 'Keep trying!'}
            </h2>
            <p className={styles.scoreInfo}>
              {language === 'zh'
                ? `答对 ${correctCount}/${TOTAL_ROUNDS}`
                : `${correctCount}/${TOTAL_ROUNDS} correct`}
              {' '}| {'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}
            </p>
            <div className={styles.winButtons}>
              <button className={styles.replayButton} onClick={onReplay}>
                🔄 {language === 'zh' ? '再玩一次！' : 'Play again!'}
              </button>
              <button className={styles.winButton} onClick={handleWin}>
                {stars >= 3
                  ? (language === 'zh' ? '⭐ 继续冒险' : '⭐ Continue')
                  : (language === 'zh' ? '🏠 返回大厅' : '🏠 Back')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const cols = currentRound.gridSize === 6 ? 3 : 3;

  return (
    <div className={styles.container}>
      {/* Round info */}
      <div className={styles.gameInfo}>
        <span className={styles.roundInfo}>
          {language === 'zh'
            ? `第 ${round + 1}/${TOTAL_ROUNDS} 轮 | 答对 ${correctCount}`
            : `Round ${round + 1}/${TOTAL_ROUNDS} | ${correctCount} correct`}
        </span>
      </div>

      {/* Phase indicator */}
      <AnimatePresence mode="wait">
        {phase === 'show' && (
          <motion.div
            key="show"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={styles.phaseBanner}
          >
            {language === 'zh' ? '👀 记住图标位置！' : '👀 Memorize the icons!'}
            <span className={styles.countdown}>{countdown}s</span>
          </motion.div>
        )}
        {phase === 'question' && (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={styles.phaseBanner}
          >
            {language === 'zh'
              ? `🎯 ${currentRound.targetEmoji} 在哪里？`
              : `🎯 Where was ${currentRound.targetEmoji}?`}
          </motion.div>
        )}
        {phase === 'feedback' && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`${styles.phaseBanner} ${selectedIndex === currentRound.targetIndex ? styles.correctBanner : styles.wrongBanner}`}
          >
            {selectedIndex === currentRound.targetIndex
              ? (language === 'zh' ? '✅ 正确！' : '✅ Correct!')
              : (language === 'zh' ? '❌ 错了！' : '❌ Wrong!')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div className={styles.boardWrapper}>
        <div className={styles.board} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {currentRound.emojis.map((emoji, i) => {
            const isRevealed = phase === 'show';
            const isTarget = phase === 'feedback' && i === currentRound.targetIndex;
            const isSelected = selectedIndex === i;

            return (
              <motion.button
                key={i}
                className={`${styles.cell} ${isTarget ? styles.correctCell : ''} ${isSelected && selectedIndex !== currentRound.targetIndex ? styles.wrongCell : ''}`}
                onClick={() => handleCellClick(i)}
                disabled={phase !== 'question'}
                whileTap={phase === 'question' ? { scale: 0.92 } : undefined}
                layout
              >
                <AnimatePresence mode="wait">
                  {isRevealed ? (
                    <motion.span
                      key="emoji"
                      className={styles.cellContent}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {emoji}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="hidden"
                      className={styles.cellContent}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {phase === 'feedback' && (isTarget || isSelected) ? emoji : '❓'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className={styles.actionButtons}>
        <button
          className={styles.helpButton}
          onClick={handleHelp}
          disabled={helpRemaining <= 0 || phase !== 'show' || helpExtended}
        >
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={onConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

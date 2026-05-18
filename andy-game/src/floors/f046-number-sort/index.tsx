import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 46;

const ROUND_COUNTS = [8, 12, 16]; // numbers per round

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateNumbers(count: number): number[] {
  const nums = Array.from({ length: count }, (_, i) => i + 1);
  // Ensure it's actually shuffled (not already in order)
  let result: number[];
  do {
    result = shuffle(nums);
  } while (result.every((v, i) => v === i + 1));
  return result;
}

function getGridCols(count: number): number {
  if (count <= 8) return 4;
  return 4;
}

type CellState = 'idle' | 'correct' | 'wrong';

export default function NumberSortGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [round, setRound] = useState(0);
  const [numbers, setNumbers] = useState<number[]>(() => generateNumbers(ROUND_COUNTS[0]));
  const [cellStates, setCellStates] = useState<CellState[]>(() => Array(ROUND_COUNTS[0]).fill('idle'));
  const [nextExpected, setNextExpected] = useState(1);
  const [startTime] = useState(() => Date.now());
  const [roundStartTime, setRoundStartTime] = useState(() => Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [wrongFlash, setWrongFlash] = useState<number | null>(null);
  const [helpHint, setHelpHint] = useState<number | null>(null);
  const [won, setWon] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer that counts up
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 200);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [startTime]);

  const currentCount = ROUND_COUNTS[round];

  const handleCellClick = useCallback((idx: number) => {
    if (won || cellStates[idx] === 'correct') return;
    setHelpHint(null);

    if (numbers[idx] === nextExpected) {
      // Correct click
      const newStates = [...cellStates];
      newStates[idx] = 'correct';
      setCellStates(newStates);
      const newNext = nextExpected + 1;

      if (newNext > currentCount) {
        // Round complete
        const roundTime = (Date.now() - roundStartTime) / 1000;
        const accumulatedTime = (Date.now() - startTime) / 1000;

        if (round + 1 >= 3) {
          // All rounds done
          setTotalTime(accumulatedTime);
          setWon(true);
          if (tickRef.current) clearInterval(tickRef.current);
        } else {
          // Advance to next round
          timerRef.current = setTimeout(() => {
            const nextRound = round + 1;
            setRound(nextRound);
            setNumbers(generateNumbers(ROUND_COUNTS[nextRound]));
            setCellStates(Array(ROUND_COUNTS[nextRound]).fill('idle'));
            setNextExpected(1);
            setRoundStartTime(Date.now());
          }, 600);
        }
      } else {
        setNextExpected(newNext);
      }
    } else {
      // Wrong click - red flash
      setWrongFlash(idx);
      setTimeout(() => setWrongFlash(null), 400);
    }
  }, [won, cellStates, numbers, nextExpected, currentCount, round, roundStartTime, startTime]);

  const handleHelp = () => {
    if (helpRemaining <= 0 || won) return;
    // Highlight the next number to click
    const idx = numbers.findIndex((n, i) => n === nextExpected && cellStates[i] !== 'correct');
    if (idx !== -1) {
      setHelpHint(idx);
      onHelpUsed();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setHelpHint(null), 3000);
    }
  };

  const getStars = () => {
    const finalTime = won ? totalTime : elapsedTime;
    if (finalTime < 15) return 3;
    if (finalTime < 25) return 2;
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

  const cols = getGridCols(currentCount);
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <span className={styles.roundInfo}>
          {language === 'zh'
            ? `第 ${round + 1}/3 轮`
            : `Round ${round + 1}/3`}
        </span>
        <span className={styles.timerInfo}>
          {language === 'zh'
            ? `时间: ${formatTime(elapsedTime)}`
            : `Time: ${formatTime(elapsedTime)}`}
        </span>
      </div>

      <div className={styles.phaseBanner}>
        {language === 'zh'
          ? `🔢 按顺序点击 1 到 ${currentCount}！`
          : `🔢 Click 1 to ${currentCount} in order!`}
      </div>

      <div className={styles.nextHint}>
        {language === 'zh'
          ? `下一个: ${nextExpected > currentCount ? '✅' : nextExpected}`
          : `Next: ${nextExpected > currentCount ? '✅' : nextExpected}`}
      </div>

      <div className={styles.boardWrapper}>
        <div className={styles.board} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {numbers.map((num, idx) => {
            const state = cellStates[idx];
            const isWrong = wrongFlash === idx;
            const isHint = helpHint === idx;

            return (
              <motion.button
                key={`${round}-${idx}`}
                className={`${styles.bubble} ${state === 'correct' ? styles.bubbleCorrect : ''} ${isWrong ? styles.bubbleWrong : ''} ${isHint ? styles.bubbleHint : ''}`}
                onClick={() => handleCellClick(idx)}
                disabled={state === 'correct'}
                whileTap={state !== 'correct' ? { scale: 0.85 } : undefined}
                layout
              >
                <AnimatePresence mode="wait">
                  {state === 'correct' ? (
                    <motion.span
                      key="check"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      className={styles.bubbleContent}
                    >
                      ✅
                    </motion.span>
                  ) : (
                    <motion.span
                      key="num"
                      className={styles.bubbleContent}
                      animate={isWrong ? { x: [-4, 4, -4, 4, 0] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      {num}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>

      {!won && (
        <div className={styles.actionButtons}>
          <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0}>
            {helper.emoji} 💡 {helpRemaining}
          </button>
          <button className={styles.skipLink} onClick={handleConcede}>
            {language === 'zh' ? '跳过这局' : 'Skip'}
          </button>
        </div>
      )}

      <AnimatePresence>
        {won && (
          <motion.div
            className={styles.winOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.winContent}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <span className={styles.winEmoji}>📊</span>
              <h2 className={styles.winText}>
                {language === 'zh' ? '排序完成！' : 'Sort Complete!'}
              </h2>
              <p className={styles.winInfo}>
                {language === 'zh'
                  ? `用时 ${formatTime(totalTime)}`
                  : `Time: ${formatTime(totalTime)}`}
              </p>
              <div className={styles.starRow}>
                {[1, 2, 3].map((i) => (
                  <span key={i} className={i <= getStars() ? styles.starActive : styles.starInactive}>⭐</span>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

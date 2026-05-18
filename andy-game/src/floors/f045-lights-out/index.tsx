import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 45;
const GRID_SIZE = 4;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

const ROUND_CLICKS = [3, 4, 5]; // clicks used to generate puzzle per round

/** Generate a solvable Lights Out puzzle by starting from all-off and making N random clicks */
function generatePuzzle(numClicks: number): boolean[] {
  const grid = Array(TOTAL_CELLS).fill(false);
  const used = new Set<number>();

  for (let i = 0; i < numClicks; i++) {
    // Pick a random cell that we haven't clicked yet (avoiding duplicates is optional but nicer)
    let idx: number;
    do {
      idx = Math.floor(Math.random() * TOTAL_CELLS);
    } while (used.has(idx) && used.size < TOTAL_CELLS);
    used.add(idx);

    // Toggle cell and its neighbors
    toggleCell(grid, idx);
  }

  // Make sure at least one light is on
  if (!grid.some(Boolean)) {
    const idx = Math.floor(Math.random() * TOTAL_CELLS);
    toggleCell(grid, idx);
  }

  return grid;
}

function toggleCell(grid: boolean[], idx: number): void {
  const row = Math.floor(idx / GRID_SIZE);
  const col = idx % GRID_SIZE;
  grid[idx] = !grid[idx];
  if (row > 0) grid[idx - GRID_SIZE] = !grid[idx - GRID_SIZE];
  if (row < GRID_SIZE - 1) grid[idx + GRID_SIZE] = !grid[idx + GRID_SIZE];
  if (col > 0) grid[idx - 1] = !grid[idx - 1];
  if (col < GRID_SIZE - 1) grid[idx + 1] = !grid[idx + 1];
}

function isAllOff(grid: boolean[]): boolean {
  return grid.every((v) => !v);
}

export default function LightsOutGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);

  const [round, setRound] = useState(0); // 0-based, 3 rounds
  const [grid, setGrid] = useState<boolean[]>(() => generatePuzzle(ROUND_CLICKS[0]));
  const [moves, setMoves] = useState(0);
  const [minMoves] = useState(() => ROUND_CLICKS[0]); // theoretical minimum
  const [won, setWon] = useState(false);
  const [helpHint, setHelpHint] = useState<number | null>(null);
  const [rippleIdx, setRippleIdx] = useState<number | null>(null);
  const [totalMoves, setTotalMoves] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentMinMoves = ROUND_CLICKS[round];

  // Check win
  useEffect(() => {
    if (moves > 0 && isAllOff(grid)) {
      if (round + 1 >= 3) {
        // All rounds done
        setWon(true);
      } else {
        // Advance to next round after a short delay
        const newTotal = totalMoves + moves;
        setTotalMoves(newTotal);
        timerRef.current = setTimeout(() => {
          const nextRound = round + 1;
          setRound(nextRound);
          setGrid(generatePuzzle(ROUND_CLICKS[nextRound]));
          setMoves(0);
          setHelpHint(null);
        }, 800);
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [grid, moves, round, totalMoves]);

  const handleCellClick = useCallback((idx: number) => {
    if (won) return;
    const newGrid = [...grid];
    toggleCell(newGrid, idx);
    setGrid(newGrid);
    setMoves((m) => m + 1);
    setRippleIdx(idx);
    setHelpHint(null);
    setTimeout(() => setRippleIdx(null), 300);
  }, [grid, won]);

  const handleHelp = () => {
    if (helpRemaining <= 0 || won) return;
    // Find a light that is on and toggle it (auto-solve one light)
    const onIdx = grid.findIndex((v) => v);
    if (onIdx !== -1) {
      const newGrid = [...grid];
      toggleCell(newGrid, onIdx);
      setGrid(newGrid);
      setMoves((m) => m + 1);
    }
    onHelpUsed();
  };

  const getStars = () => {
    const finalMoves = won ? totalMoves + moves : totalMoves;
    const totalMin = ROUND_CLICKS.reduce((a, b) => a + b, 0);
    const extra = finalMoves - totalMin;
    if (extra <= 0) return 3;
    if (extra <= 2) return 2;
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

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <span className={styles.roundInfo}>
          {language === 'zh'
            ? `第 ${round + 1}/3 轮`
            : `Round ${round + 1}/3`}
        </span>
        <span className={styles.moveCount}>
          {language === 'zh' ? `步数: ${moves}` : `Moves: ${moves}`}
        </span>
      </div>

      <div className={styles.phaseBanner}>
        {language === 'zh'
          ? '💡 点击灯泡，关掉所有灯！'
          : '💡 Click lights to turn them all off!'}
      </div>

      <div className={styles.boardWrapper}>
        <div className={styles.board}>
          {grid.map((isOn, idx) => (
            <motion.button
              key={idx}
              className={`${styles.cell} ${isOn ? styles.cellOn : styles.cellOff} ${rippleIdx === idx ? styles.cellRipple : ''} ${helpHint === idx ? styles.cellHint : ''}`}
              onClick={() => handleCellClick(idx)}
              whileTap={{ scale: 0.9 }}
              animate={isOn
                ? { scale: [1, 1.08, 1], transition: { duration: 0.3 } }
                : {}
              }
            >
              <span className={styles.lightIcon}>
                {isOn ? '💡' : '⚫'}
              </span>
            </motion.button>
          ))}
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
              <span className={styles.winEmoji}>💡</span>
              <h2 className={styles.winText}>
                {language === 'zh' ? '灯全关了！' : 'All lights out!'}
              </h2>
              <p className={styles.winInfo}>
                {language === 'zh'
                  ? `总共 ${totalMoves + moves} 步`
                  : `${totalMoves + moves} total moves`}
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

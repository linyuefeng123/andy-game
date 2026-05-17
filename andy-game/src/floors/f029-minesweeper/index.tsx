import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 29;

type CellState = 'hidden' | 'revealed' | 'flagged';

interface Cell {
  state: CellState;
  isMine: boolean;
  adjacentMines: number;
}

function getGridConfig(difficulty: 1 | 2 | 3): { rows: number; cols: number; mines: number } {
  if (difficulty === 1) return { rows: 6, cols: 6, mines: 4 };
  if (difficulty === 2) return { rows: 8, cols: 8, mines: 8 };
  return { rows: 8, cols: 8, mines: 12 };
}

function createGrid(rows: number, cols: number, mines: number, safeRow?: number, safeCol?: number): Cell[][] {
  const grid: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      state: 'hidden' as CellState,
      isMine: false,
      adjacentMines: 0,
    }))
  );

  // Place mines
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    // Don't place mine on safe cell or where one already exists
    if (grid[r][c].isMine) continue;
    if (safeRow !== undefined && safeCol !== undefined && Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue;
    grid[r][c].isMine = true;
    placed++;
  }

  // Calculate adjacent mine counts
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].isMine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].isMine) {
            count++;
          }
        }
      }
      grid[r][c].adjacentMines = count;
    }
  }

  return grid;
}

const NUMBER_COLORS: Record<number, string> = {
  1: '#4d96ff',
  2: '#6bcb77',
  3: '#ff6b6b',
  4: '#9b72cf',
  5: '#ff9f43',
  6: '#4dd0e1',
  7: '#ffb4a2',
  8: '#a0a0c0',
};

export default function MinesweeperGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);
  const config = getGridConfig(difficulty);

  const [grid, setGrid] = useState<Cell[][]>(() => createGrid(config.rows, config.cols, config.mines));
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [flagMode, setFlagMode] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [firstClick, setFirstClick] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer
  useEffect(() => {
    if (gameStatus !== 'playing') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStatus, startTime]);

  const flagCount = grid.flat().filter((c) => c.state === 'flagged').length;

  const revealCell = useCallback((g: Cell[][], r: number, c: number): Cell[][] => {
    const newGrid = g.map((row) => row.map((cell) => ({ ...cell })));
    const queue: [number, number][] = [[r, c]];

    while (queue.length > 0) {
      const [cr, cc] = queue.shift()!;
      if (cr < 0 || cr >= config.rows || cc < 0 || cc >= config.cols) continue;
      if (newGrid[cr][cc].state !== 'hidden') continue;

      newGrid[cr][cc].state = 'revealed';

      if (newGrid[cr][cc].adjacentMines === 0 && !newGrid[cr][cc].isMine) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            queue.push([cr + dr, cc + dc]);
          }
        }
      }
    }

    return newGrid;
  }, [config.rows, config.cols]);

  const checkWin = useCallback((g: Cell[][]): boolean => {
    return g.every((row) => row.every((cell) => cell.isMine || cell.state === 'revealed'));
  }, []);

  const handleCellClick = useCallback((r: number, c: number) => {
    if (gameStatus !== 'playing') return;

    let currentGrid = grid;

    // First click is always safe - regenerate grid if needed
    if (firstClick) {
      if (grid[r][c].isMine) {
        currentGrid = createGrid(config.rows, config.cols, config.mines, r, c);
      }
      setFirstClick(false);
    }

    if (flagMode) {
      // Toggle flag
      const newGrid = currentGrid.map((row) => row.map((cell) => ({ ...cell })));
      if (newGrid[r][c].state === 'hidden') {
        newGrid[r][c].state = 'flagged';
      } else if (newGrid[r][c].state === 'flagged') {
        newGrid[r][c].state = 'hidden';
      }
      setGrid(newGrid);
      return;
    }

    if (currentGrid[r][c].state !== 'hidden') return;

    if (currentGrid[r][c].isMine) {
      // Hit a mine - game over
      const newGrid = currentGrid.map((row) =>
        row.map((cell) => ({
          ...cell,
          state: cell.isMine ? 'revealed' as CellState : cell.state,
        }))
      );
      setGrid(newGrid);
      setGameStatus('lost');
      return;
    }

    const newGrid = revealCell(currentGrid, r, c);
    setGrid(newGrid);

    if (checkWin(newGrid)) {
      setGameStatus('won');
    }
  }, [grid, gameStatus, flagMode, firstClick, config, revealCell, checkWin]);

  const handleHelp = () => {
    if (helpRemaining <= 0 || gameStatus !== 'playing') return;
    // Reveal a random safe hidden cell
    const safeCells: [number, number][] = [];
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        if (grid[r][c].state === 'hidden' && !grid[r][c].isMine) {
          safeCells.push([r, c]);
        }
      }
    }
    if (safeCells.length > 0) {
      const [r, c] = safeCells[Math.floor(Math.random() * safeCells.length)];
      const newGrid = revealCell(grid, r, c);
      setGrid(newGrid);
      if (checkWin(newGrid)) {
        setGameStatus('won');
      }
    }
    onHelpUsed();
  };

  const getStars = () => {
    if (gameStatus !== 'won') return 1;
    // Time-based stars
    const timeThreshold = difficulty === 1 ? 60 : difficulty === 2 ? 120 : 180;
    if (elapsed < timeThreshold * 0.5) return 3;
    if (elapsed < timeThreshold) return 2;
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

  const renderCell = (cell: Cell, r: number, c: number) => {
    if (cell.state === 'revealed') {
      if (cell.isMine) {
        return (
          <div
            key={`${r}-${c}`}
            className={`${styles.cell} ${styles.cellMine}`}
          >
            💣
          </div>
        );
      }
      return (
        <div
          key={`${r}-${c}`}
          className={`${styles.cell} ${styles.cellRevealed}`}
          style={{ color: NUMBER_COLORS[cell.adjacentMines] || 'transparent' }}
        >
          {cell.adjacentMines > 0 ? cell.adjacentMines : ''}
        </div>
      );
    }

    if (cell.state === 'flagged') {
      return (
        <button
          key={`${r}-${c}`}
          className={`${styles.cell} ${styles.cellHidden}`}
          onClick={() => handleCellClick(r, c)}
        >
          🚩
        </button>
      );
    }

    // Hidden
    return (
      <button
        key={`${r}-${c}`}
        className={`${styles.cell} ${styles.cellHidden}`}
        onClick={() => handleCellClick(r, c)}
      />
    );
  };

  const showOverlay = gameStatus === 'won' || gameStatus === 'lost';

  return (
    <div className={styles.container}>
      <div className={styles.scoreBar}>
        <span className={styles.mineCount}>
          💣 {config.mines - flagCount}
        </span>
        <span className={styles.timer}>
          ⏱️ {elapsed}s
        </span>
      </div>

      <button
        className={`${styles.flagToggle} ${flagMode ? styles.flagActive : ''}`}
        onClick={() => setFlagMode(!flagMode)}
      >
        {flagMode ? '🚩 旗标模式' : '🔍 翻开模式'}
      </button>

      <div className={styles.boardWrapper}>
        <div
          className={styles.board}
          style={{
            gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
          }}
        >
          {grid.map((row, r) => row.map((cell, c) => renderCell(cell, r, c)))}
        </div>
      </div>

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || gameStatus !== 'playing'}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={handleConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>

      <AnimatePresence>
        {showOverlay && (
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
              <span className={styles.winEmoji}>{gameStatus === 'won' ? '💣' : '💥'}</span>
              <h2 className={styles.winText}>
                {gameStatus === 'won'
                  ? (language === 'zh' ? '扫雷成功！' : 'Mines Cleared!')
                  : (language === 'zh' ? '踩到地雷了！' : 'Boom!')}
              </h2>
              {gameStatus === 'won' && (
                <p className={styles.winInfo}>
                  {language === 'zh' ? `用时 ${elapsed} 秒` : `${elapsed}s`}
                </p>
              )}
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

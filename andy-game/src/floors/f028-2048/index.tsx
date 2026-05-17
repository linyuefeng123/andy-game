import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 28;
const GRID_SIZE = 4;

type CellValue = number; // 0 = empty, 2,4,8,...2048

function createEmptyGrid(): CellValue[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

function addRandomTile(grid: CellValue[][], count: number = 1): CellValue[][] {
  const newGrid = grid.map((r) => [...r]);
  for (let i = 0; i < count; i++) {
    const empty: [number, number][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (newGrid[r][c] === 0) empty.push([r, c]);
      }
    }
    if (empty.length === 0) break;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    newGrid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }
  return newGrid;
}

function slideRow(row: CellValue[]): { newRow: CellValue[]; score: number; moved: boolean } {
  let score = 0;
  const filtered = row.filter((v) => v !== 0);
  const merged: CellValue[] = [];
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const val = filtered[i] * 2;
      merged.push(val);
      score += val;
      i += 2;
    } else {
      merged.push(filtered[i]);
      i++;
    }
  }
  while (merged.length < GRID_SIZE) merged.push(0);
  const moved = row.some((v, idx) => v !== merged[idx]);
  return { newRow: merged, score, moved };
}

type Direction = 'up' | 'down' | 'left' | 'right';

function moveGrid(grid: CellValue[][], dir: Direction): { newGrid: CellValue[][]; score: number; moved: boolean } {
  let totalScore = 0;
  let anyMoved = false;
  const newGrid = grid.map((r) => [...r]);

  if (dir === 'left') {
    for (let r = 0; r < GRID_SIZE; r++) {
      const { newRow, score, moved } = slideRow(newGrid[r]);
      newGrid[r] = newRow;
      totalScore += score;
      if (moved) anyMoved = true;
    }
  } else if (dir === 'right') {
    for (let r = 0; r < GRID_SIZE; r++) {
      const { newRow, score, moved } = slideRow([...newGrid[r]].reverse());
      newGrid[r] = newRow.reverse();
      totalScore += score;
      if (moved) anyMoved = true;
    }
  } else if (dir === 'up') {
    for (let c = 0; c < GRID_SIZE; c++) {
      const col = newGrid.map((row) => row[c]);
      const { newRow, score, moved } = slideRow(col);
      for (let r = 0; r < GRID_SIZE; r++) newGrid[r][c] = newRow[r];
      totalScore += score;
      if (moved) anyMoved = true;
    }
  } else if (dir === 'down') {
    for (let c = 0; c < GRID_SIZE; c++) {
      const col = newGrid.map((row) => row[c]).reverse();
      const { newRow, score, moved } = slideRow(col);
      const reversed = newRow.reverse();
      for (let r = 0; r < GRID_SIZE; r++) newGrid[r][c] = reversed[r];
      totalScore += score;
      if (moved) anyMoved = true;
    }
  }

  return { newGrid, score: totalScore, moved: anyMoved };
}

function getMaxTile(grid: CellValue[][]): number {
  return grid.flat().reduce((max, v) => Math.max(max, v), 0);
}

function canMove(grid: CellValue[][]): boolean {
  for (const dir of ['up', 'down', 'left', 'right'] as Direction[]) {
    const { moved } = moveGrid(grid, dir);
    if (moved) return true;
  }
  return false;
}

function getTileColor(val: number): string {
  const colors: Record<number, string> = {
    2: '#e8dcc8',
    4: '#e0c8a8',
    8: '#f2a860',
    16: '#f58634',
    32: '#f26848',
    64: '#f04030',
    128: '#edcf72',
    256: '#edcc61',
    512: '#edc850',
    1024: '#edc22e',
    2048: '#edc22e',
  };
  return colors[val] ?? '#3c3a32';
}

function getTileTextColor(val: number): string {
  return val <= 4 ? '#6b6355' : '#ffffff';
}

function getTileFontSize(val: number): string {
  if (val < 100) return 'clamp(24px, 6vw, 36px)';
  if (val < 1000) return 'clamp(18px, 5vw, 28px)';
  return 'clamp(14px, 4vw, 22px)';
}

export default function Game2048({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);

  const [grid, setGrid] = useState<CellValue[][]>(() => {
    const empty = createEmptyGrid();
    const withTiles = addRandomTile(empty, difficulty === 1 ? 4 : 2);
    return withTiles;
  });
  const [score, setScore] = useState(0);
  const [bestTile, setBestTile] = useState(2);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const handleMove = useCallback((dir: Direction) => {
    if (gameOver) return;
    const { newGrid, score: addScore, moved } = moveGrid(grid, dir);
    if (!moved) return;

    const spawnCount = difficulty === 3 ? 2 : 1;
    const withNew = addRandomTile(newGrid, spawnCount);
    const newBest = getMaxTile(withNew);

    setGrid(withNew);
    setScore((s) => s + addScore);
    setBestTile(newBest);

    if (newBest >= 2048 && !won) {
      setWon(true);
    }

    if (!canMove(withNew)) {
      setGameOver(true);
    }
  }, [grid, gameOver, difficulty, won]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        handleMove(dir);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleMove]);

  // Touch/swipe support
  const touchStart = useState<{ x: number; y: number } | null>(null)[0];
  const setTouchStart = useState<{ x: number; y: number } | null>(null)[1];

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    setTouchStart({ x: t.clientX, y: t.clientY });
  }, [setTouchStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    const minSwipe = 30;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > minSwipe) handleMove(dx > 0 ? 'right' : 'left');
    } else {
      if (Math.abs(dy) > minSwipe) handleMove(dy > 0 ? 'down' : 'up');
    }
    setTouchStart(null);
  }, [touchStart, handleMove, setTouchStart]);

  const handleHelp = () => {
    if (helpRemaining <= 0 || gameOver) return;
    // Find the best direction to move
    const dirs: Direction[] = ['up', 'down', 'left', 'right'];
    let bestDir: Direction = 'left';
    let bestScore = -1;
    for (const d of dirs) {
      const { newGrid, score: s, moved } = moveGrid(grid, d);
      if (moved && s > bestScore) {
        bestScore = s;
        bestDir = d;
      }
    }
    handleMove(bestDir);
    onHelpUsed();
  };

  const getStars = () => {
    if (bestTile >= 2048) return 3;
    if (bestTile >= 1024) return 2;
    if (bestTile >= 512) return 1;
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

  const showOverlay = gameOver || won;

  return (
    <div className={styles.container}>
      <div className={styles.scoreBar}>
        <span className={styles.scoreLabel}>
          {language === 'zh' ? '分数' : 'Score'}: {score}
        </span>
        <span className={styles.bestLabel}>
          {language === 'zh' ? '最大' : 'Best'}: {bestTile}
        </span>
      </div>

      <div
        className={styles.boardWrapper}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.board}>
          {grid.flat().map((val, idx) => (
            <div
              key={idx}
              className={styles.cell}
              style={{
                background: val === 0 ? 'rgba(255,255,255,0.05)' : getTileColor(val),
                color: val === 0 ? 'transparent' : getTileTextColor(val),
                fontSize: getTileFontSize(val),
              }}
            >
              {val === 0 ? '' : val}
            </div>
          ))}
        </div>
      </div>

      {/* Directional buttons for mobile */}
      <div className={styles.dpad}>
        <button className={styles.dpadBtn} onClick={() => handleMove('up')} disabled={gameOver}>
          ⬆️
        </button>
        <div className={styles.dpadRow}>
          <button className={styles.dpadBtn} onClick={() => handleMove('left')} disabled={gameOver}>
            ⬅️
          </button>
          <button className={styles.dpadBtn} onClick={() => handleMove('right')} disabled={gameOver}>
            ➡️
          </button>
        </div>
        <button className={styles.dpadBtn} onClick={() => handleMove('down')} disabled={gameOver}>
          ⬇️
        </button>
      </div>

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || gameOver}>
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
              <span className={styles.winEmoji}>{won ? '🏆' : '💪'}</span>
              <h2 className={styles.winText}>
                {won
                  ? (language === 'zh' ? '达到2048！' : 'Reached 2048!')
                  : (language === 'zh' ? '游戏结束' : 'Game Over')}
              </h2>
              <p className={styles.winInfo}>
                {language === 'zh'
                  ? `分数: ${score} | 最大: ${bestTile}`
                  : `Score: ${score} | Best: ${bestTile}`}
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

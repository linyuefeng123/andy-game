import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 25;

function getGridSize(difficulty: 1 | 2 | 3): number {
  if (difficulty === 1) return 3; // 8-puzzle
  return 4; // 15-puzzle
}

function getShuffleMoves(difficulty: 1 | 2 | 3): number {
  if (difficulty === 1) return 30;
  if (difficulty === 2) return 60;
  return 120;
}

function createSolvedBoard(size: number): number[] {
  const total = size * size;
  return Array.from({ length: total }, (_, i) => (i + 1) % total); // 1,2,...,N-1,0
}

function shuffleBoard(board: number[], size: number, moves: number): number[] {
  const result = [...board];
  let emptyIdx = result.indexOf(0);

  const dirs = [-size, size, -1, 1]; // up, down, left, right
  let lastDir = -1;

  for (let i = 0; i < moves; i++) {
    const emptyRow = Math.floor(emptyIdx / size);
    const emptyCol = emptyIdx % size;
    const validMoves: number[] = [];

    dirs.forEach((d, dirIdx) => {
      const newIdx = emptyIdx + d;
      if (newIdx < 0 || newIdx >= size * size) return;
      // Don't undo the last move
      if ((dirIdx === 0 && lastDir === 1) || (dirIdx === 1 && lastDir === 0)) return;
      if ((dirIdx === 2 && lastDir === 3) || (dirIdx === 3 && lastDir === 2)) return;
      const newRow = Math.floor(newIdx / size);
      const newCol = newIdx % size;
      // Prevent wrapping
      if (d === -1 && emptyCol === 0) return;
      if (d === 1 && emptyCol === size - 1) return;
      if (d === -size && emptyRow === 0) return;
      if (d === size && emptyRow === size - 1) return;
      validMoves.push(dirIdx);
    });

    const chosenDir = validMoves[Math.floor(Math.random() * validMoves.length)];
    const swapIdx = emptyIdx + dirs[chosenDir];
    [result[emptyIdx], result[swapIdx]] = [result[swapIdx], result[emptyIdx]];
    emptyIdx = swapIdx;
    lastDir = chosenDir;
  }

  return result;
}

function isSolved(board: number[]): boolean {
  return board.every((val, idx) => val === (idx + 1) % board.length);
}

export default function SlidingPuzzleGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);
  const gridSize = getGridSize(difficulty);
  const shuffleMoves = getShuffleMoves(difficulty);

  const [board, setBoard] = useState<number[]>(() => {
    const solved = createSolvedBoard(gridSize);
    return shuffleBoard(solved, gridSize, shuffleMoves);
  });
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [helpHint, setHelpHint] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check win
  useEffect(() => {
    if (moves > 0 && isSolved(board)) {
      setWon(true);
    }
  }, [board, moves]);

  const handleTileClick = useCallback((idx: number) => {
    if (won) return;
    const emptyIdx = board.indexOf(0);
    const row = Math.floor(idx / gridSize);
    const col = idx % gridSize;
    const emptyRow = Math.floor(emptyIdx / gridSize);
    const emptyCol = emptyIdx % gridSize;

    // Check adjacency
    const isAdjacent =
      (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
      (Math.abs(col - emptyCol) === 1 && row === emptyRow);

    if (!isAdjacent) return;

    const newBoard = [...board];
    [newBoard[idx], newBoard[emptyIdx]] = [newBoard[emptyIdx], newBoard[idx]];
    setBoard(newBoard);
    setMoves((m) => m + 1);
    setHelpHint(null);
  }, [board, gridSize, won]);

  const handleHelp = () => {
    if (helpRemaining <= 0 || won) return;
    const emptyIdx = board.indexOf(0);
    const emptyRow = Math.floor(emptyIdx / gridSize);
    const emptyCol = emptyIdx % gridSize;

    // Find a tile that's not in its correct position and is adjacent to empty
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const r = emptyRow + dr;
      const c = emptyCol + dc;
      if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) continue;
      const idx = r * gridSize + c;
      // Highlight this tile as a suggestion
      setHelpHint(idx);
      break;
    }
    onHelpUsed();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setHelpHint(null), 3000);
  };

  const getStars = () => {
    if (moves <= 50) return 3;
    if (moves <= 80) return 2;
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

  const tileColor = (val: number) => {
    if (val === 0) return 'transparent';
    const hue = (val / (gridSize * gridSize - 1)) * 280;
    return `hsl(${hue}, 70%, 55%)`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <span className={styles.moveCount}>
          {language === 'zh' ? `步数: ${moves}` : `Moves: ${moves}`}
        </span>
      </div>

      <div className={styles.boardWrapper}>
        <div
          className={styles.board}
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize}, 1fr)`,
          }}
        >
          {board.map((val, idx) => (
            val === 0 ? (
              <div key={`empty-${idx}`} className={styles.emptyCell} />
            ) : (
              <motion.button
                key={`tile-${val}`}
                className={`${styles.tile} ${helpHint === idx ? styles.tileHint : ''}`}
                style={{ background: tileColor(val) }}
                onClick={() => handleTileClick(idx)}
                layout
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                {val}
              </motion.button>
            )
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
              <span className={styles.winEmoji}>🧩</span>
              <h2 className={styles.winText}>
                {language === 'zh' ? '拼图完成！' : 'Puzzle Complete!'}
              </h2>
              <p className={styles.winInfo}>
                {language === 'zh' ? `用了 ${moves} 步` : `${moves} moves`}
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

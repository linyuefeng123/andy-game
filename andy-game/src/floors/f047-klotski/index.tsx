import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 47;
const COLS = 4;
const ROWS = 5;

interface Block {
  id: string;
  row: number;
  col: number;
  w: number;
  h: number;
  type: 'king' | 'vertical' | 'horizontal' | 'small';
  label: string;
}

// Predefined puzzle layouts. Grid is 4 cols x 5 rows.
// King (2x2) must reach row 3, col 1 (bottom center exit).
const PUZZLES: { blocks: Omit<Block, 'id'>[]; optimal: number }[] = [
  // Level 1: Easy - 1 vertical, 1 horizontal, 2 small
  {
    optimal: 12,
    blocks: [
      { row: 0, col: 1, w: 2, h: 2, type: 'king', label: '王' },
      { row: 0, col: 0, w: 1, h: 2, type: 'vertical', label: '将' },
      { row: 0, col: 3, w: 1, h: 2, type: 'vertical', label: '将' },
      { row: 2, col: 0, w: 2, h: 1, type: 'horizontal', label: '兵' },
      { row: 2, col: 2, w: 1, h: 1, type: 'small', label: '卒' },
      { row: 2, col: 3, w: 1, h: 1, type: 'small', label: '卒' },
      { row: 3, col: 0, w: 1, h: 1, type: 'small', label: '卒' },
      { row: 3, col: 3, w: 1, h: 1, type: 'small', label: '卒' },
    ],
  },
  // Level 2: Medium - 2 vertical, 1 horizontal, 4 small
  {
    optimal: 22,
    blocks: [
      { row: 0, col: 1, w: 2, h: 2, type: 'king', label: '王' },
      { row: 0, col: 0, w: 1, h: 2, type: 'vertical', label: '将' },
      { row: 0, col: 3, w: 1, h: 2, type: 'vertical', label: '将' },
      { row: 2, col: 0, w: 1, h: 1, type: 'small', label: '卒' },
      { row: 2, col: 1, w: 1, h: 1, type: 'small', label: '卒' },
      { row: 2, col: 2, w: 1, h: 1, type: 'small', label: '卒' },
      { row: 2, col: 3, w: 1, h: 2, type: 'vertical', label: '将' },
      { row: 3, col: 0, w: 2, h: 1, type: 'horizontal', label: '兵' },
      { row: 3, col: 2, w: 1, h: 1, type: 'small', label: '卒' },
      { row: 4, col: 0, w: 1, h: 1, type: 'small', label: '卒' },
    ],
  },
  // Level 3: Hard - classic-style layout
  {
    optimal: 36,
    blocks: [
      { row: 0, col: 1, w: 2, h: 2, type: 'king', label: '王' },
      { row: 0, col: 0, w: 1, h: 2, type: 'vertical', label: '张' },
      { row: 0, col: 3, w: 1, h: 2, type: 'vertical', label: '赵' },
      { row: 2, col: 0, w: 1, h: 2, type: 'vertical', label: '马' },
      { row: 2, col: 1, w: 1, h: 2, type: 'vertical', label: '黄' },
      { row: 2, col: 3, w: 1, h: 2, type: 'vertical', label: '关' },
      { row: 2, col: 2, w: 1, h: 1, type: 'small', label: '卒' },
      { row: 3, col: 2, w: 1, h: 1, type: 'small', label: '卒' },
      { row: 4, col: 0, w: 1, h: 1, type: 'small', label: '卒' },
      { row: 4, col: 3, w: 1, h: 1, type: 'small', label: '卒' },
    ],
  },
];

function buildGrid(blocks: Block[]): number[][] {
  const grid: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
  blocks.forEach((b, idx) => {
    for (let r = b.row; r < b.row + b.h; r++) {
      for (let c = b.col; c < b.col + b.w; c++) {
        grid[r][c] = idx;
      }
    }
  });
  return grid;
}

function canMove(blocks: Block[], blockIdx: number, dr: number, dc: number): boolean {
  const b = blocks[blockIdx];
  const newRow = b.row + dr;
  const newCol = b.col + dc;
  if (newRow < 0 || newRow + b.h > ROWS) return false;
  if (newCol < 0 || newCol + b.w > COLS) return false;
  const grid = buildGrid(blocks);
  for (let r = newRow; r < newRow + b.h; r++) {
    for (let c = newCol; c < newCol + b.w; c++) {
      if (grid[r][c] !== -1 && grid[r][c] !== blockIdx) return false;
    }
  }
  return true;
}

function isSolved(blocks: Block[]): boolean {
  const king = blocks[0];
  return king.row === 3 && king.col === 1;
}

export default function KlotskiGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);
  const puzzleIdx = Math.min(difficulty - 1, PUZZLES.length - 1);
  const puzzle = PUZZLES[puzzleIdx];

  const initBlocks = useCallback((): Block[] => {
    return puzzle.blocks.map((b, i) => ({ ...b, id: `b${i}` }));
  }, [puzzle]);

  const [blocks, setBlocks] = useState<Block[]>(initBlocks);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<Block[][]>([]);
  const [won, setWon] = useState(false);
  const [hintIdx, setHintIdx] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (moves > 0 && isSolved(blocks)) {
      setWon(true);
    }
  }, [blocks, moves]);

  const handleBlockClick = useCallback((idx: number) => {
    if (won) return;
    if (selectedIdx === idx) {
      setSelectedIdx(null);
      return;
    }
    setSelectedIdx(idx);
    setHintIdx(null);
  }, [selectedIdx, won]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (won || selectedIdx === null) return;
    const grid = buildGrid(blocks);
    const clickedBlock = grid[row][col];
    if (clickedBlock !== -1) return; // cell is occupied

    const sb = blocks[selectedIdx];
    let dr = 0;
    let dc = 0;
    if (row >= sb.row && row < sb.row + sb.h && col === sb.col - 1) dc = -1;
    else if (row >= sb.row && row < sb.row + sb.h && col === sb.col + sb.w) dc = 1;
    else if (col >= sb.col && col < sb.col + sb.w && row === sb.row - 1) dr = -1;
    else if (col >= sb.col && col < sb.col + sb.w && row === sb.row + sb.h) dr = 1;

    if (dr === 0 && dc === 0) return;
    if (!canMove(blocks, selectedIdx, dr, dc)) return;

    setHistory((h) => [...h, blocks.map((b) => ({ ...b }))]);
    const newBlocks = blocks.map((b, i) =>
      i === selectedIdx ? { ...b, row: b.row + dr, col: b.col + dc } : b
    );
    setBlocks(newBlocks);
    setMoves((m) => m + 1);
    setSelectedIdx(null);
  }, [blocks, selectedIdx, won]);

  const handleUndo = useCallback(() => {
    if (history.length === 0 || won) return;
    const prev = history[history.length - 1];
    setBlocks(prev.map((b) => ({ ...b })));
    setHistory((h) => h.slice(0, -1));
    setMoves((m) => Math.max(0, m - 1));
    setSelectedIdx(null);
  }, [history, won]);

  const handleHelp = useCallback(() => {
    if (helpRemaining <= 0 || won) return;
    // Find a block that can move toward solving the puzzle
    // Simple heuristic: find the king and suggest moving it, or move blocks blocking the king
    const king = blocks[0];
    if (king.row > 3) {
      // Try to move king down
      if (canMove(blocks, 0, 1, 0)) {
        setHintIdx(0);
      } else {
        // Find a blocking block that can move
        for (let i = 1; i < blocks.length; i++) {
          for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
            if (canMove(blocks, i, dr, dc)) {
              setHintIdx(i);
              break;
            }
          }
          if (hintIdx !== null) break;
        }
      }
    } else {
      // King is already at row 3, try moving it to col 1
      for (let i = 1; i < blocks.length; i++) {
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
          if (canMove(blocks, i, dr, dc)) {
            setHintIdx(i);
            break;
          }
        }
        if (hintIdx !== null) break;
      }
    }
    // Fallback: highlight any moveable block
    if (hintIdx === null) {
      for (let i = 0; i < blocks.length; i++) {
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
          if (canMove(blocks, i, dr, dc)) {
            setHintIdx(i);
            break;
          }
        }
        if (hintIdx !== null) break;
      }
    }
    onHelpUsed();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setHintIdx(null), 3000);
  }, [blocks, helpRemaining, hintIdx, onHelpUsed, won]);

  const getStars = () => {
    const opt = puzzle.optimal;
    if (moves <= opt) return 3;
    if (moves <= opt * 2) return 2;
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

  // Calculate block position in pixels
  const cellSize = `calc((min(320px, 65vw) - 9px) / ${COLS})`;

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <span className={styles.moveCount}>
          {language === 'zh' ? `步数: ${moves}` : `Moves: ${moves}`}
        </span>
        <span className={styles.levelLabel}>
          {language === 'zh' ? `难度 ${difficulty}` : `Level ${difficulty}`}
        </span>
      </div>

      <p className={styles.instruction}>
        {language === 'zh' ? '点击方块选中，再点击空格移动' : 'Click block, then click empty cell'}
      </p>

      <div className={styles.boardWrapper}>
        <div className={styles.board} style={{ position: 'relative' }}>
          {/* Background grid cells */}
          {Array.from({ length: ROWS * COLS }, (_, idx) => {
            const r = Math.floor(idx / COLS);
            const c = idx % COLS;
            const isExit = r >= 3 && r <= 4 && c >= 1 && c <= 2;
            return (
              <div
                key={`cell-${idx}`}
                className={styles.cell}
                style={{
                  gridRow: r + 1,
                  gridColumn: c + 1,
                  background: isExit ? 'rgba(255, 217, 61, 0.08)' : undefined,
                }}
                onClick={() => handleCellClick(r, c)}
              />
            );
          })}

          {/* Blocks */}
          {blocks.map((block, idx) => (
            <motion.div
              key={block.id}
              className={`${styles.block} ${styles[block.type]} ${selectedIdx === idx ? styles.blockSelected : ''} ${hintIdx === idx ? styles.blockHint : ''}`}
              style={{
                position: 'absolute',
                top: `calc(${block.row} * (${cellSize} + 3px))`,
                left: `calc(${block.col} * (${cellSize} + 3px))`,
                width: `calc(${block.w} * (${cellSize} + 3px) - 3px)`,
                height: `calc(${block.h} * (${cellSize} + 3px) - 3px)`,
              }}
              layout
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={() => handleBlockClick(idx)}
            >
              {block.type === 'king' ? (language === 'zh' ? '曹操' : 'King') : block.label}
            </motion.div>
          ))}

          <div className={styles.exitMarker}>
            {language === 'zh' ? '出口 ⬇' : 'Exit ⬇'}
          </div>
        </div>
      </div>

      {!won && (
        <div className={styles.actionButtons}>
          <button className={styles.undoButton} onClick={handleUndo} disabled={history.length === 0}>
            ↩ {language === 'zh' ? '撤销' : 'Undo'}
          </button>
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
              <span className={styles.winEmoji}>🚪</span>
              <h2 className={styles.winText}>
                {language === 'zh' ? '曹操脱困！' : 'King Escaped!'}
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

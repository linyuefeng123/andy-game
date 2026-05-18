import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 44;
const GRID_SIZE = 4;

// Each piece is a set of [row, col] offsets relative to top-left of its bounding box
interface Piece {
  id: number;
  cells: [number, number][];
  color: string;
  label: string;
}

// Target shape is a GRID_SIZE x GRID_SIZE grid of booleans
type TargetGrid = boolean[][];

// Predefined puzzles for 3 rounds
const PIECE_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#a55eea'];

const PUZZLES: { target: TargetGrid; pieces: Piece[] }[] = [
  // Round 1: Simple L-shape with 4 pieces
  {
    target: [
      [true, true, true, false],
      [true, false, false, false],
      [true, false, false, false],
      [true, true, true, true],
    ],
    pieces: [
      { id: 1, cells: [[0, 0], [0, 1], [0, 2]], color: PIECE_COLORS[0], label: 'I' },
      { id: 2, cells: [[0, 0], [1, 0], [2, 0]], color: PIECE_COLORS[1], label: 'L' },
      { id: 3, cells: [[0, 0], [0, 1], [0, 2], [0, 3]], color: PIECE_COLORS[2], label: '-' },
      { id: 4, cells: [[0, 0], [1, 0]], color: PIECE_COLORS[3], label: 'v' },
    ],
  },
  // Round 2: T-shape with 4 pieces
  {
    target: [
      [true, true, true, true],
      [false, true, false, false],
      [false, true, false, false],
      [false, true, true, false],
    ],
    pieces: [
      { id: 1, cells: [[0, 0], [0, 1], [0, 2], [0, 3]], color: PIECE_COLORS[0], label: '-' },
      { id: 2, cells: [[0, 0], [1, 0], [2, 0]], color: PIECE_COLORS[1], label: 'I' },
      { id: 3, cells: [[0, 0], [0, 1]], color: PIECE_COLORS[2], label: 'o' },
      { id: 4, cells: [[0, 0]], color: PIECE_COLORS[3], label: '.' },
    ],
  },
  // Round 3: Cross/plus with 5 pieces
  {
    target: [
      [false, true, true, false],
      [true, true, true, true],
      [true, true, true, true],
      [false, true, true, false],
    ],
    pieces: [
      { id: 1, cells: [[0, 0], [0, 1]], color: PIECE_COLORS[0], label: 'o' },
      { id: 2, cells: [[0, 0], [0, 1]], color: PIECE_COLORS[1], label: 'o' },
      { id: 3, cells: [[0, 0], [1, 0]], color: PIECE_COLORS[2], label: 'v' },
      { id: 4, cells: [[0, 0], [1, 0]], color: PIECE_COLORS[3], label: 'v' },
      { id: 5, cells: [[0, 0], [0, 1], [1, 0], [1, 1]], color: PIECE_COLORS[4], label: 'S' },
    ],
  },
];

// Placement: piece ID -> { row, col } top-left position on the grid
type Placements = Record<number, { row: number; col: number } | null>;

function countTargetCells(target: TargetGrid): number {
  let count = 0;
  for (const row of target) for (const cell of row) if (cell) count++;
  return count;
}

function countPieceCells(pieces: Piece[]): number {
  let count = 0;
  for (const p of pieces) count += p.cells.length;
  return count;
}

function getPlacedGrid(placements: Placements, pieces: Piece[]): (number | null)[][] {
  const grid: (number | null)[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  for (const piece of pieces) {
    const pos = placements[piece.id];
    if (!pos) continue;
    for (const [dr, dc] of piece.cells) {
      const r = pos.row + dr;
      const c = pos.col + dc;
      if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
        grid[r][c] = piece.id;
      }
    }
  }
  return grid;
}

function canPlacePiece(piece: Piece, row: number, col: number, placements: Placements, pieces: Piece[]): boolean {
  const placed = getPlacedGrid(placements, pieces);
  for (const [dr, dc] of piece.cells) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
    if (placed[r][c] !== null) return false;
  }
  return true;
}

function isAllPiecesPlaced(placements: Placements, pieces: Piece[]): boolean {
  return pieces.every(p => placements[p.id] !== null);
}

function checkAccuracy(placements: Placements, pieces: Piece[], target: TargetGrid): { correct: number; total: number } {
  const placed = getPlacedGrid(placements, pieces);
  let correct = 0;
  let total = countTargetCells(target);
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (target[r][c] && placed[r][c] !== null) correct++;
    }
  }
  return { correct, total };
}

export default function TangramGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [round, setRound] = useState(1);
  const [selectedPieceId, setSelectedPieceId] = useState<number | null>(null);
  const [placements, setPlacements] = useState<Placements>({});
  const [solved, setSolved] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [helpHint, setHelpHint] = useState<{ pieceId: number; row: number; col: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maxRounds = 3;
  const puzzle = PUZZLES[round - 1];
  const { target, pieces } = puzzle;

  // Reset placements when round changes
  useEffect(() => {
    const initialPlacements: Placements = {};
    for (const p of pieces) initialPlacements[p.id] = null;
    setPlacements(initialPlacements);
    setSelectedPieceId(null);
    setSolved(false);
  }, [round, pieces]);

  // Check completion
  useEffect(() => {
    if (solved) return;
    if (!isAllPiecesPlaced(placements, pieces)) return;

    const { correct, total } = checkAccuracy(placements, pieces, target);
    const totalPieceCells = countPieceCells(pieces);

    // Check that all target cells are covered and no cells are placed outside target
    if (correct === total && totalPieceCells === total) {
      setSolved(true);
      setTimeout(() => {
        if (round >= maxRounds) {
          setShowWin(true);
        } else {
          setRound(r => r + 1);
        }
      }, 1000);
    }
  }, [placements, pieces, target, solved, round]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (solved) return;
    if (selectedPieceId === null) return;

    const piece = pieces.find(p => p.id === selectedPieceId);
    if (!piece) return;
    if (placements[piece.id] !== null) return;

    if (canPlacePiece(piece, row, col, placements, pieces)) {
      setPlacements(prev => ({ ...prev, [piece.id]: { row, col } }));
      setSelectedPieceId(null);
      setHelpHint(null);
    }
  }, [selectedPieceId, placements, pieces, solved]);

  const handlePieceSelect = useCallback((pieceId: number) => {
    if (solved) return;
    if (placements[pieceId] !== null) return;
    setSelectedPieceId(prev => prev === pieceId ? null : pieceId);
    setHelpHint(null);
  }, [placements, solved]);

  const handleRemovePiece = useCallback((row: number, col: number) => {
    if (solved) return;
    const placed = getPlacedGrid(placements, pieces);
    const pieceId = placed[row][col];
    if (pieceId !== null) {
      setPlacements(prev => ({ ...prev, [pieceId]: null }));
    }
  }, [placements, pieces, solved]);

  const handleReset = () => {
    const initialPlacements: Placements = {};
    for (const p of pieces) initialPlacements[p.id] = null;
    setPlacements(initialPlacements);
    setSelectedPieceId(null);
    setHelpHint(null);
  };

  const handleHelp = () => {
    if (helpRemaining <= 0 || solved) return;
    // Find the first unplaced piece and place it correctly
    // We compute where each piece should go based on the target
    for (const piece of pieces) {
      if (placements[piece.id] !== null) continue;
      // Try all positions to find where this piece should go
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          // Check if placing this piece here would cover target cells
          let coversTarget = true;
          let allInTarget = true;
          for (const [dr, dc] of piece.cells) {
            const pr = r + dr;
            const pc = c + dc;
            if (pr < 0 || pr >= GRID_SIZE || pc < 0 || pc >= GRID_SIZE) {
              allInTarget = false;
              break;
            }
            if (!target[pr][pc]) allInTarget = false;
          }
          if (allInTarget && canPlacePiece(piece, r, c, placements, pieces)) {
            // Place this piece here
            setPlacements(prev => ({ ...prev, [piece.id]: { row: r, col: c } }));
            setHelpHint({ pieceId: piece.id, row: r, col: c });
            onHelpUsed();
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => setHelpHint(null), 2000);
            return;
          }
        }
      }
    }
    onHelpUsed();
  };

  const getStars = (): number => {
    // Check final round accuracy
    const { correct, total } = checkAccuracy(placements, pieces, target);
    const totalPieceCells = countPieceCells(pieces);
    if (correct === total && totalPieceCells === total) return 3;
    if (correct >= total - 1) return 2;
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

  const placedGrid = getPlacedGrid(placements, pieces);
  const isHintPiece = (pieceId: number) => helpHint?.pieceId === pieceId;

  // Render mini piece preview in palette
  const renderMiniPiece = (piece: Piece) => {
    const maxR = Math.max(...piece.cells.map(c => c[0])) + 1;
    const maxC = Math.max(...piece.cells.map(c => c[1])) + 1;
    const grid: boolean[][] = Array.from({ length: maxR }, () => Array(maxC).fill(false));
    for (const [r, c] of piece.cells) grid[r][c] = true;

    return (
      <div className={styles.miniGrid} style={{ gridTemplateColumns: `repeat(${maxC}, 1fr)` }}>
        {grid.map((row, r) =>
          row.map((filled, c) => (
            <div
              key={`${r}-${c}`}
              className={`${styles.miniCell} ${filled ? styles.miniCellFilled : styles.miniCellEmpty}`}
              style={filled ? { background: piece.color } : undefined}
            />
          ))
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <span className={styles.roundLabel}>
          {language === 'zh' ? `第 ${round}/${maxRounds} 关` : `Round ${round}/${maxRounds}`}
        </span>
        <span className={styles.subLabel}>
          {language === 'zh' ? '拖放拼图' : 'Place pieces'}
        </span>
      </div>

      <div className={styles.boardWrapper}>
        {/* Target shape display */}
        <div className={styles.targetLabel}>
          {language === 'zh' ? '目标图形' : 'Target Shape'}
        </div>
        <div
          className={styles.targetGrid}
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
        >
          {target.map((row, r) =>
            row.map((filled, c) => (
              <div
                key={`t-${r}-${c}`}
                className={`${styles.targetCell} ${filled ? styles.targetFilled : styles.targetEmpty}`}
              />
            ))
          )}
        </div>

        {/* Play board */}
        <div className={styles.boardLabel}>
          {language === 'zh'
            ? (selectedPieceId !== null ? '点击放置拼图' : '选择一个拼图块')
            : (selectedPieceId !== null ? 'Click to place' : 'Select a piece')}
        </div>
        <div
          className={styles.boardGrid}
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
        >
          {target.map((row, r) =>
            row.map((cell, c) => {
              const placedId = placedGrid[r][c];
              const piece = placedId !== null ? pieces.find(p => p.id === placedId) : null;
              const isTarget = target[r][c];
              const isHint = helpHint && helpHint.row === r && helpHint.col === c;

              if (placedId !== null && piece) {
                // This cell has a piece on it
                const isCorrect = isTarget;
                return (
                  <motion.div
                    key={`${r}-${c}`}
                    className={`${styles.boardCell} ${styles.boardCellPlaced} ${isCorrect ? styles.boardCellCorrect : styles.boardCellWrong}`}
                    style={{ background: piece.color }}
                    onClick={() => handleRemovePiece(r, c)}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  />
                );
              }

              return (
                <div
                  key={`${r}-${c}`}
                  className={`${styles.boardCell} ${isHint ? styles.boardCellPlaced : ''}`}
                  style={isHint ? { background: 'rgba(77, 150, 255, 0.3)', boxShadow: '0 0 12px rgba(77, 150, 255, 0.5)' } : undefined}
                  onClick={() => handleCellClick(r, c)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Piece palette */}
      <div className={styles.paletteArea}>
        <div className={styles.paletteLabel}>
          {language === 'zh' ? '拼图块' : 'Pieces'}
        </div>
        <div className={styles.palettePieces}>
          {pieces.map((piece) => {
            const isUsed = placements[piece.id] !== null;
            const isSelected = selectedPieceId === piece.id;
            const isHinted = isHintPiece(piece.id);
            return (
              <motion.button
                key={piece.id}
                className={`${styles.palettePiece} ${isSelected ? styles.palettePieceSelected : ''} ${isUsed ? styles.palettePieceUsed : ''} ${isHinted ? styles.palettePieceSelected : ''}`}
                onClick={() => handlePieceSelect(piece.id)}
                whileTap={{ scale: 0.95 }}
              >
                {renderMiniPiece(piece)}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || solved}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.resetButton} onClick={handleReset} disabled={solved}>
          🔄 {language === 'zh' ? '重置' : 'Reset'}
        </button>
        <button className={styles.skipLink} onClick={handleConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>

      <AnimatePresence>
        {showWin && (
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
              <span className={styles.winEmoji}>🔷</span>
              <h2 className={styles.winText}>
                {language === 'zh' ? '七巧板拼好了！' : 'Tangram Complete!'}
              </h2>
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

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import styles from './index.module.css';

const FLOOR_NUM = 17;
const SIZE = 4;
const BOX = 2;

type CellValue = 0 | 1 | 2 | 3 | 4; // 0 = empty

interface CellInfo {
  value: CellValue;
  given: boolean; // pre-filled hint
}

function getPreFilledCount(difficulty: 1 | 2 | 3): number {
  if (difficulty === 1) return 8;
  if (difficulty === 2) return 6;
  return 4;
}

function generatePuzzle(preFilled: number): { grid: CellInfo[][], solution: number[][] } {
  // Generate a valid 4x4 sudoku solution using backtracking
  const solution: number[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

  function isValid(row: number, col: number, num: number): boolean {
    // Check row
    for (let c = 0; c < SIZE; c++) {
      if (solution[row][c] === num) return false;
    }
    // Check column
    for (let r = 0; r < SIZE; r++) {
      if (solution[r][col] === num) return false;
    }
    // Check 2x2 box
    const boxRow = Math.floor(row / BOX) * BOX;
    const boxCol = Math.floor(col / BOX) * BOX;
    for (let r = boxRow; r < boxRow + BOX; r++) {
      for (let c = boxCol; c < boxCol + BOX; c++) {
        if (solution[r][c] === num) return false;
      }
    }
    return true;
  }

  function solve(): boolean {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (solution[r][c] === 0) {
          const nums = [1, 2, 3, 4].sort(() => Math.random() - 0.5);
          for (const num of nums) {
            if (isValid(r, c, num)) {
              solution[r][c] = num;
              if (solve()) return true;
              solution[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  solve();

  // Create puzzle by removing cells
  const grid: CellInfo[][] = solution.map((row) =>
    row.map((v) => ({ value: v as CellValue, given: true }))
  );

  const totalCells = SIZE * SIZE;
  const toRemove = totalCells - preFilled;
  const indices = Array.from({ length: totalCells }, (_, i) => i)
    .sort(() => Math.random() - 0.5)
    .slice(0, toRemove);

  for (const idx of indices) {
    const r = Math.floor(idx / SIZE);
    const c = idx % SIZE;
    grid[r][c] = { value: 0, given: false };
  }

  return { grid, solution };
}

export default function SudokuGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);
  const preFilled = getPreFilledCount(difficulty);

  const [puzzle] = useState(() => generatePuzzle(preFilled));
  const [grid, setGrid] = useState<CellInfo[][]>(() => puzzle.grid.map((row) => row.map((c) => ({ ...c }))));
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [helpCell, setHelpCell] = useState<[number, number] | null>(null);

  const isBoardFull = useMemo(() => {
    return grid.every((row) => row.every((cell) => cell.value !== 0));
  }, [grid]);

  const isBoardCorrect = useMemo(() => {
    return grid.every((row, r) =>
      row.every((cell, c) => cell.value === puzzle.solution[r][c])
    );
  }, [grid, puzzle.solution]);

  const handleCellTap = useCallback((row: number, col: number) => {
    if (grid[row][col].given) return;
    setSelected([row, col]);
  }, [grid]);

  const handleNumberTap = useCallback((num: number) => {
    if (!selected || completed) return;
    const [row, col] = selected;
    if (grid[row][col].given) return;

    const newGrid = grid.map((r) => r.map((c) => ({ ...c })));
    newGrid[row][col].value = num as CellValue;
    setGrid(newGrid);

    if (num !== puzzle.solution[row][col]) {
      setMistakes((m) => m + 1);
      playSound('error');
    } else {
      playSound('click');
    }

    // Check if board is complete and correct
    const allFilled = newGrid.every((r) => r.every((c) => c.value !== 0));
    const allCorrect = newGrid.every((r, ri) =>
      r.every((c, ci) => c.value === puzzle.solution[ri][ci])
    );
    if (allFilled && allCorrect) {
      setCompleted(true);
      playSound('win');
    }
  }, [selected, completed, grid, puzzle.solution]);

  const handleHelp = () => {
    if (helpRemaining <= 0 || completed) return;
    // Find an empty or wrong cell and highlight the correct answer
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c].value !== puzzle.solution[r][c] && !grid[r][c].given) {
          setHelpCell([r, c]);
          // Auto-fill the correct value
          const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
          newGrid[r][c].value = puzzle.solution[r][c] as CellValue;
          setGrid(newGrid);
          onHelpUsed();
          setTimeout(() => setHelpCell(null), 1500);

          // Check completion
          const allFilled = newGrid.every((row) => row.every((cell) => cell.value !== 0));
          const allCorrect = newGrid.every((row, ri) =>
            row.every((cell, ci) => cell.value === puzzle.solution[ri][ci])
          );
          if (allFilled && allCorrect) {
            setCompleted(true);
            playSound('win');
          }
          return;
        }
      }
    }
  };

  const getStars = () => {
    if (mistakes === 0) return 3;
    if (mistakes < 3) return 2;
    return 1;
  };

  const handleWin = () => {
    const stars = getStars();
    const reward = getFloorMeta(FLOOR_NUM).reward;
    onComplete(stars, reward);
    onExit();
  };

  const handleConcede = () => {
    onConcede();
    onExit();
  };

  // Get the row/col/box of the selected cell for highlighting
  const selectedRow = selected?.[0] ?? -1;
  const selectedCol = selected?.[1] ?? -1;
  const selectedBox = selected
    ? Math.floor(selected[0] / BOX) * BOX + Math.floor(selected[1] / BOX)
    : -1;

  if (completed) {
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
            <span className={styles.winEmoji}>🔢</span>
            <h2 className={styles.winText}>
              {language === 'zh' ? '数独解开了！' : 'Sudoku solved!'}
            </h2>
            {mistakes > 0 && (
              <p className={styles.winSub}>
                {language === 'zh' ? `错误 ${mistakes} 次` : `${mistakes} mistakes`}
              </p>
            )}
            <div className={styles.starRow}>
              {[1, 2, 3].map((i) => (
                <span key={i} className={i <= stars ? styles.starActive : styles.starInactive}>⭐</span>
              ))}
            </div>
            <div className={styles.winButtons}>
              <button className={styles.replayButton} onClick={onReplay}>
                🔄 {language === 'zh' ? '再玩一次！' : 'Play Again!'}
              </button>
              <button className={styles.winButton} onClick={handleWin}>
                {stars >= 2 ? (language === 'zh' ? '⭐ 继续冒险' : '⭐ Continue') : (language === 'zh' ? '🏠 返回大厅' : '🏠 Lobby')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <span className={styles.infoText}>
          {language === 'zh' ? '🔢 4x4 数独' : '🔢 4x4 Sudoku'}
        </span>
        <span className={styles.mistakeText}>
          {language === 'zh' ? `错误: ${mistakes}` : `Mistakes: ${mistakes}`}
        </span>
      </div>

      <p className={styles.instruction}>
        {language === 'zh'
          ? '每行、每列、每个2x2方格填入1-4，不能重复！'
          : 'Fill 1-4 in each row, column, and 2x2 box—no repeats!'}
      </p>

      <div className={styles.board}>
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const cellBox = Math.floor(r / BOX) * BOX + Math.floor(c / BOX);
            const isSelected = r === selectedRow && c === selectedCol;
            const isHighlighted =
              r === selectedRow || c === selectedCol || cellBox === selectedBox;
            const isWrong = cell.value !== 0 && cell.value !== puzzle.solution[r][c];
            const isHelpHighlight = helpCell !== null && helpCell[0] === r && helpCell[1] === c;

            return (
              <button
                key={`${r}-${c}`}
                className={`${styles.cell} ${cell.given ? styles.cellGiven : ''} ${isSelected ? styles.cellSelected : ''} ${isHighlighted && !isSelected ? styles.cellHighlighted : ''} ${isWrong ? styles.cellWrong : ''} ${isHelpHighlight ? styles.cellHelp : ''} ${(c === 1 || c === 2) ? styles.boxBorderRight : ''} ${(r === 1 || r === 2) ? styles.boxBorderBottom : ''}`}
                onClick={() => handleCellTap(r, c)}
                disabled={cell.given}
              >
                {cell.value !== 0 ? cell.value : ''}
              </button>
            );
          })
        )}
      </div>

      <div className={styles.numberPad}>
        {[1, 2, 3, 4].map((num) => (
          <motion.button
            key={num}
            className={styles.numButton}
            onClick={() => handleNumberTap(num)}
            whileTap={{ scale: 0.9 }}
            disabled={selected === null || completed}
          >
            {num}
          </motion.button>
        ))}
        <button
          className={styles.eraseButton}
          onClick={() => {
            if (!selected) return;
            const [r, c] = selected;
            if (grid[r][c].given) return;
            const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
            newGrid[r][c].value = 0;
            setGrid(newGrid);
          }}
          disabled={selected === null}
        >
          ✕
        </button>
      </div>

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || completed}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={handleConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

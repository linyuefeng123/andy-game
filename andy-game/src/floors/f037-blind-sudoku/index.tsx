import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import styles from './index.module.css';

const FLOOR_NUM = 37;
const SIZE = 4;
const BOX = 2;

type CellValue = 0 | 1 | 2 | 3 | 4; // 0 = empty

interface CellInfo {
  value: CellValue;
  given: boolean;
}

const TOTAL_ROUNDS = 3;
const SHOW_DURATION = 5; // seconds to memorize
const HELP_EXTRA_TIME = 3;

const BLANK_COUNTS = [4, 6, 8]; // increasing blanks per round

function generateValidSolution(): number[][] {
  const solution: number[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

  function isValid(row: number, col: number, num: number): boolean {
    for (let c = 0; c < SIZE; c++) {
      if (solution[row][c] === num) return false;
    }
    for (let r = 0; r < SIZE; r++) {
      if (solution[r][col] === num) return false;
    }
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
  return solution;
}

function generatePuzzle(blanks: number): { grid: CellInfo[][]; solution: number[][]; blankPositions: [number, number][] } {
  const solution = generateValidSolution();
  const grid: CellInfo[][] = solution.map((row) =>
    row.map((v) => ({ value: v as CellValue, given: true }))
  );

  const totalCells = SIZE * SIZE;
  const indices = Array.from({ length: totalCells }, (_, i) => i)
    .sort(() => Math.random() - 0.5)
    .slice(0, blanks);

  const blankPositions: [number, number][] = [];
  for (const idx of indices) {
    const r = Math.floor(idx / SIZE);
    const c = idx % SIZE;
    grid[r][c] = { value: 0, given: false };
    blankPositions.push([r, c]);
  }

  return { grid, solution, blankPositions };
}

type Phase = 'show' | 'fill' | 'result';

export default function BlindSudoku({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [round, setRound] = useState(0);
  const [puzzle, setPuzzle] = useState(() => generatePuzzle(BLANK_COUNTS[0]));
  const [grid, setGrid] = useState<CellInfo[][]>(() => puzzle.grid.map((row) => row.map((c) => ({ ...c }))));
  const [phase, setPhase] = useState<Phase>('show');
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [countdown, setCountdown] = useState(SHOW_DURATION);
  const [helpExtended, setHelpExtended] = useState(false);
  const [helpCell, setHelpCell] = useState<[number, number] | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [roundsCorrect, setRoundsCorrect] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Countdown during show phase
  useEffect(() => {
    if (phase !== 'show') return;

    const duration = SHOW_DURATION + (helpExtended ? HELP_EXTRA_TIME : 0);
    setCountdown(duration);

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    timerRef.current = setTimeout(() => {
      setPhase('fill');
    }, duration * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, round, helpExtended]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCellTap = useCallback((row: number, col: number) => {
    if (phase !== 'fill' || grid[row][col].given) return;
    setSelected([row, col]);
  }, [phase, grid]);

  const handleNumberTap = useCallback((num: number) => {
    if (!selected || phase !== 'fill') return;
    const [row, col] = selected;
    if (grid[row][col].given) return;

    const newGrid = grid.map((r) => r.map((c) => ({ ...c })));
    newGrid[row][col].value = num as CellValue;
    setGrid(newGrid);

    if (num !== puzzle.solution[row][col]) {
      setMistakes((m) => m + 1);
      setTotalMistakes((m) => m + 1);
      playSound('error');
    } else {
      playSound('click');
    }

    // Check if round is complete
    const allFilled = newGrid.every((r) => r.every((c) => c.value !== 0));
    if (allFilled) {
      const allCorrect = newGrid.every((r, ri) =>
        r.every((c, ci) => c.value === puzzle.solution[ri][ci])
      );
      if (allCorrect) {
        playSound('win');
        setRoundsCorrect((prev) => prev + 1);
      }
      // Move to next round or game over
      timerRef.current = setTimeout(() => {
        if (round + 1 >= TOTAL_ROUNDS) {
          setGameOver(true);
        } else {
          const nextRound = round + 1;
          const nextBlanks = BLANK_COUNTS[nextRound];
          const nextPuzzle = generatePuzzle(nextBlanks);
          setPuzzle(nextPuzzle);
          setGrid(nextPuzzle.grid.map((row) => row.map((c) => ({ ...c }))));
          setRound(nextRound);
          setPhase('show');
          setSelected(null);
          setMistakes(0);
          setHelpExtended(false);
          setHelpCell(null);
        }
      }, 800);
    }
  }, [selected, phase, grid, puzzle.solution, round]);

  const handleErase = useCallback(() => {
    if (!selected || phase !== 'fill') return;
    const [r, c] = selected;
    if (grid[r][c].given) return;
    const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
    newGrid[r][c].value = 0;
    setGrid(newGrid);
  }, [selected, phase, grid]);

  const handleHelp = () => {
    if (helpRemaining <= 0) return;

    if (phase === 'show' && !helpExtended) {
      // Extend viewing time
      setHelpExtended(true);
      onHelpUsed();
      return;
    }

    if (phase === 'fill') {
      // Reveal one blank cell
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (!grid[r][c].given && grid[r][c].value !== puzzle.solution[r][c]) {
            setHelpCell([r, c]);
            const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
            newGrid[r][c].value = puzzle.solution[r][c] as CellValue;
            setGrid(newGrid);
            onHelpUsed();
            setTimeout(() => setHelpCell(null), 1500);

            // Check round completion
            const allFilled = newGrid.every((row) => row.every((cell) => cell.value !== 0));
            if (allFilled) {
              const allCorrect = newGrid.every((row, ri) =>
                row.every((cell, ci) => cell.value === puzzle.solution[ri][ci])
              );
              if (allCorrect) {
                playSound('win');
                setRoundsCorrect((prev) => prev + 1);
                setTimeout(() => {
                  if (round + 1 >= TOTAL_ROUNDS) {
                    setGameOver(true);
                  } else {
                    const nextRound = round + 1;
                    const nextBlanks = BLANK_COUNTS[nextRound];
                    const nextPuzzle = generatePuzzle(nextBlanks);
                    setPuzzle(nextPuzzle);
                    setGrid(nextPuzzle.grid.map((row) => row.map((c2) => ({ ...c2 }))));
                    setRound(nextRound);
                    setPhase('show');
                    setSelected(null);
                    setMistakes(0);
                    setHelpExtended(false);
                    setHelpCell(null);
                  }
                }, 800);
              }
            }
            return;
          }
        }
      }
    }
  };

  const getStars = (): number => {
    if (totalMistakes === 0) return 3;
    if (totalMistakes <= 2) return 2;
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
            <span className={styles.winEmoji}>🧩</span>
            <h2 className={styles.winText}>
              {language === 'zh' ? '盲填数独完成！' : 'Blind Sudoku Complete!'}
            </h2>
            <p className={styles.winSub}>
              {language === 'zh'
                ? `答对 ${roundsCorrect}/${TOTAL_ROUNDS} 轮 | 错误 ${totalMistakes} 次`
                : `${roundsCorrect}/${TOTAL_ROUNDS} rounds correct | ${totalMistakes} mistakes`}
            </p>
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

  const selectedRow = selected?.[0] ?? -1;
  const selectedCol = selected?.[1] ?? -1;

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <span className={styles.infoText}>
          {language === 'zh' ? `🧩 盲填数独 第${round + 1}/${TOTAL_ROUNDS}轮` : `🧩 Blind Sudoku R${round + 1}/${TOTAL_ROUNDS}`}
        </span>
        <span className={styles.mistakeText}>
          {language === 'zh' ? `错误: ${totalMistakes}` : `Mistakes: ${totalMistakes}`}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'show' && (
          <motion.div
            key="show"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={styles.phaseBanner}
          >
            {language === 'zh' ? '👀 记住所有数字！' : '👀 Memorize all numbers!'}
            <span className={styles.countdown}>{countdown}s</span>
          </motion.div>
        )}
        {phase === 'fill' && (
          <motion.div
            key="fill"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`${styles.phaseBanner} ${styles.fillBanner}`}
          >
            {language === 'zh' ? '🧠 凭记忆填入数字！' : '🧠 Fill in from memory!'}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.board}>
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const isGiven = cell.given;
            const isSelected = r === selectedRow && c === selectedCol;
            const isWrong = cell.value !== 0 && !cell.given && cell.value !== puzzle.solution[r][c];
            const isHelpHighlight = helpCell !== null && helpCell[0] === r && helpCell[1] === c;
            const isBlank = !cell.given && cell.value === 0;
            // In fill phase, hide non-given cells' values; in show phase show everything
            const showValue = phase === 'show' || isGiven || cell.value !== 0;

            return (
              <button
                key={`${r}-${c}`}
                className={`${styles.cell} ${isGiven ? styles.cellGiven : ''} ${isSelected ? styles.cellSelected : ''} ${isWrong ? styles.cellWrong : ''} ${isHelpHighlight ? styles.cellHelp : ''} ${isBlank && phase === 'fill' ? styles.cellBlank : ''} ${(c === 1) ? styles.boxBorderRight : ''} ${(r === 1) ? styles.boxBorderBottom : ''}`}
                onClick={() => handleCellTap(r, c)}
                disabled={isGiven || phase !== 'fill'}
              >
                {showValue && cell.value !== 0 ? cell.value : ''}
              </button>
            );
          })
        )}
      </div>

      {phase === 'fill' && (
        <div className={styles.numberPad}>
          {[1, 2, 3, 4].map((num) => (
            <motion.button
              key={num}
              className={styles.numButton}
              onClick={() => handleNumberTap(num)}
              whileTap={{ scale: 0.9 }}
              disabled={selected === null}
            >
              {num}
            </motion.button>
          ))}
          <button
            className={styles.eraseButton}
            onClick={handleErase}
            disabled={selected === null}
          >
            ✕
          </button>
        </div>
      )}

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || (phase === 'show' && helpExtended)}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={handleConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

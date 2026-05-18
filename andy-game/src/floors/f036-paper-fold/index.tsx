import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 36;

type Grid = boolean[][]; // true = has hole

interface FoldStep {
  direction: 'horizontal' | 'vertical';
  // which half gets folded: 'top' folds top onto bottom, 'left' folds left onto right
  side: 'top' | 'bottom' | 'left' | 'right';
}

interface Puzzle {
  folds: FoldStep[];
  hole: { row: number; col: number }; // hole position after folding
  answer: Grid; // the full unfolded hole pattern
  options: Grid[]; // 3 options including the answer
  correctIndex: number;
}

const GRID = 4;

function emptyGrid(): Grid {
  return Array.from({ length: GRID }, () => Array(GRID).fill(false) as boolean[]);
}

function cloneGrid(g: Grid): Grid {
  return g.map(row => [...row]);
}

// Apply a fold to a hole pattern (unfold: mirror the hole across the fold line)
function applyFold(grid: Grid, fold: FoldStep): Grid {
  const result = cloneGrid(grid);
  const mid = GRID / 2;

  if (fold.direction === 'horizontal') {
    // Horizontal fold: mirror top<->bottom
    for (let c = 0; c < GRID; c++) {
      for (let r = 0; r < mid; r++) {
        if (fold.side === 'top') {
          // Top folded onto bottom: mirror top rows to bottom
          if (grid[r][c]) result[mid + (mid - 1 - r)][c] = true;
        } else {
          // Bottom folded onto top: mirror bottom rows to top
          if (grid[mid + r][c]) result[mid - 1 - r][c] = true;
        }
      }
    }
  } else {
    // Vertical fold: mirror left<->right
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < mid; c++) {
        if (fold.side === 'left') {
          // Left folded onto right: mirror left cols to right
          if (grid[r][c]) result[r][mid + (mid - 1 - c)] = true;
        } else {
          // Right folded onto top: mirror right cols to left
          if (grid[r][mid + c]) result[r][mid - 1 - c] = true;
        }
      }
    }
  }

  return result;
}

// Compute the unfolded pattern: start with hole on folded paper, then reverse-apply folds
function computeUnfolded(folds: FoldStep[], hole: { row: number; col: number }): Grid {
  // Start with just the hole in the folded paper
  // The hole is on the visible portion after all folds
  // We need to unfold step by step in reverse
  let grid = emptyGrid();
  grid[hole.row][hole.col] = true;

  // Unfold in reverse order
  for (let i = folds.length - 1; i >= 0; i--) {
    grid = applyFold(grid, folds[i]);
  }

  return grid;
}

// Generate a valid hole position that's on the correct half after folding
function getValidHolePosition(folds: FoldStep[]): { row: number; col: number } {
  // After folding, the visible half is determined by the last fold
  const lastFold = folds[folds.length - 1];
  const mid = GRID / 2;

  if (lastFold.direction === 'horizontal') {
    const row = lastFold.side === 'top'
      ? Math.floor(Math.random() * mid) + mid  // hole is on bottom half (visible)
      : Math.floor(Math.random() * mid);        // hole is on top half (visible)
    const col = Math.floor(Math.random() * GRID);
    return { row, col };
  } else {
    const col = lastFold.side === 'left'
      ? Math.floor(Math.random() * mid) + mid
      : Math.floor(Math.random() * mid);
    const row = Math.floor(Math.random() * GRID);
    return { row, col };
  }
}

function gridToKey(g: Grid): string {
  return g.map(r => r.map(c => c ? '1' : '0').join('')).join(',');
}

// Generate a wrong option by shifting holes
function generateWrongOption(correct: Grid): Grid {
  let result: Grid;
  let attempts = 0;
  do {
    result = cloneGrid(correct);
    // Randomly shift some holes
    const shiftRow = Math.random() > 0.5 ? 1 : -1;
    const shiftCol = Math.random() > 0.5 ? 1 : -1;
    const newResult = emptyGrid();
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (result[r][c]) {
          const nr = r + shiftRow;
          const nc = c + shiftCol;
          if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID) {
            newResult[nr][nc] = true;
          }
        }
      }
    }
    result = newResult;
    attempts++;
  } while (gridToKey(result) === gridToKey(correct) && attempts < 20);
  return result;
}

function generatePuzzle(numFolds: number): Puzzle {
  const directions: ('horizontal' | 'vertical')[] = ['horizontal', 'vertical'];
  const sides: ('top' | 'bottom' | 'left' | 'right')[] = ['top', 'bottom', 'left', 'right'];

  const folds: FoldStep[] = [];
  let lastDir = '';
  for (let i = 0; i < numFolds; i++) {
    let dir: 'horizontal' | 'vertical';
    // Avoid two same-direction folds in a row for variety
    do {
      dir = directions[Math.floor(Math.random() * directions.length)];
    } while (dir === lastDir && numFolds > 1);
    lastDir = dir;

    let side: 'top' | 'bottom' | 'left' | 'right';
    if (dir === 'horizontal') {
      side = Math.random() > 0.5 ? 'top' : 'bottom';
    } else {
      side = Math.random() > 0.5 ? 'left' : 'right';
    }
    folds.push({ direction: dir, side });
  }

  const hole = getValidHolePosition(folds);
  const answer = computeUnfolded(folds, hole);

  // Generate 2 wrong options
  const option1 = generateWrongOption(answer);
  let option2 = generateWrongOption(answer);
  let attempts = 0;
  while (gridToKey(option2) === gridToKey(option1) && attempts < 20) {
    option2 = generateWrongOption(answer);
    attempts++;
  }

  // Shuffle options
  const options = [answer, option1, option2];
  const correctIndex = 0;

  // Fisher-Yates shuffle
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  const newCorrectIndex = options.findIndex(o => gridToKey(o) === gridToKey(answer));

  return { folds, hole, answer, options, correctIndex: newCorrectIndex };
}

function getRoundFolds(round: number): number {
  // Rounds 1-2: 1 fold, rounds 3-5: 2 folds
  return round <= 2 ? 1 : 2;
}

const REWARD = {
  emoji: '📄',
  nameZh: '折纸天才',
  nameEn: 'Origami Genius',
  descriptionZh: '折纸展开全对了！',
  descriptionEn: 'Paper unfold mastered!',
};

export default function PaperFold({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const totalRounds = 5;
  const [round, setRound] = useState(1);
  const [correctCount, setCorrectCount] = useState(0);
  const [puzzle, setPuzzle] = useState<Puzzle>(() => generatePuzzle(getRoundFolds(1)));
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [helpUsed, setHelpUsed] = useState(false);
  const [eliminatedOption, setEliminatedOption] = useState<number | null>(null);

  const handleOptionClick = (index: number) => {
    if (selectedOption !== null) return;
    if (index === eliminatedOption) return;

    const correct = index === puzzle.correctIndex;
    setSelectedOption(index);
    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      setCorrectCount(c => c + 1);
    }

    // Auto-advance after delay
    setTimeout(() => {
      if (round >= totalRounds) {
        // Game over
        setRound(totalRounds + 1); // signal game over
      } else {
        const nextRound = round + 1;
        setRound(nextRound);
        setPuzzle(generatePuzzle(getRoundFolds(nextRound)));
        setSelectedOption(null);
        setShowResult(false);
        setHelpUsed(false);
        setEliminatedOption(null);
      }
    }, 1500);
  };

  const handleHelp = () => {
    if (helpRemaining <= 0 || helpUsed) return;
    setHelpUsed(true);
    onHelpUsed();
    // Remove one wrong option
    const wrongOptions = [0, 1, 2].filter(i => i !== puzzle.correctIndex && i !== eliminatedOption);
    if (wrongOptions.length > 0) {
      setEliminatedOption(wrongOptions[Math.floor(Math.random() * wrongOptions.length)]);
    }
  };

  const getStars = useCallback((): number => {
    if (correctCount >= 5) return 3;
    if (correctCount >= 4) return 2;
    if (correctCount >= 3) return 1;
    return 1;
  }, [correctCount]);

  const handleWin = () => {
    const stars = getStars();
    onComplete(stars, REWARD);
    onExit();
  };

  // Game over screen
  if (round > totalRounds) {
    const stars = getStars();
    return (
      <div className={styles.container}>
        <motion.div className={styles.winOverlay} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
          <div className={styles.winContent}>
            <span className={styles.winEmoji}>{correctCount >= 5 ? '🌟' : '💪'}</span>
            <h2 className={styles.winText}>{correctCount >= 5 ? (language === 'zh' ? '你真棒！' : 'Perfect!') : (language === 'zh' ? '再接再厉！' : 'Good try!')}</h2>
            <p className={styles.scoreInfo}>
              {language === 'zh' ? `答对 ${correctCount}/${totalRounds}` : `${correctCount}/${totalRounds} correct`} | {'⭐'.repeat(stars)}
            </p>
            <div className={styles.winButtons}>
              <button className={styles.replayButton} onClick={onReplay}>🔄 {language === 'zh' ? '再玩一次！' : 'Play again!'}</button>
              <button className={styles.winButton} onClick={handleWin}>⭐ {language === 'zh' ? '继续冒险' : 'Continue'}</button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Describe folds for the player
  const foldDescriptions = puzzle.folds.map((f, i) => {
    if (f.direction === 'horizontal') {
      return f.side === 'top'
        ? (language === 'zh' ? `第${i + 1}步：上半往下折` : `Step ${i + 1}: Fold top half down`)
        : (language === 'zh' ? `第${i + 1}步：下半往上折` : `Step ${i + 1}: Fold bottom half up`);
    } else {
      return f.side === 'left'
        ? (language === 'zh' ? `第${i + 1}步：左半往右折` : `Step ${i + 1}: Fold left half right`)
        : (language === 'zh' ? `第${i + 1}步：右半往左折` : `Step ${i + 1}: Fold right half left`);
    }
  });

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <span className={styles.turnInfo}>
          {language === 'zh' ? `📄 第 ${round}/${totalRounds} 题` : `📄 Round ${round}/${totalRounds}`}
        </span>
        <div className={styles.foldSteps}>
          {foldDescriptions.map((desc, i) => (
            <span key={i} className={styles.foldStep}>{desc}</span>
          ))}
        </div>
      </div>

      {/* Folded paper with hole */}
      <div className={styles.foldedSection}>
        <p className={styles.sectionLabel}>
          {language === 'zh' ? '🧻 折叠后打的孔：' : '🧻 Hole after folding:'}
        </p>
        <div className={styles.foldedPaper}>
          {puzzle.folds.map((fold, fi) => {
            const mid = GRID / 2;
            return (
              <div key={fi} className={styles.foldIndicator}>
                <div className={styles.paperGrid}>
                  {Array.from({ length: GRID }).map((_, r) => (
                    <div key={r} className={styles.paperRow}>
                      {Array.from({ length: GRID }).map((_, c) => {
                        // Determine if this cell is visible after folds up to this point
                        let visible = true;
                        for (let f = 0; f <= fi; f++) {
                          const fd = puzzle.folds[f];
                          if (fd.direction === 'horizontal') {
                            if (fd.side === 'top' && r < mid) visible = false;
                            if (fd.side === 'bottom' && r >= mid) visible = false;
                          } else {
                            if (fd.side === 'left' && c < mid) visible = false;
                            if (fd.side === 'right' && c >= mid) visible = false;
                          }
                        }
                        const isHole = visible && r === puzzle.hole.row && c === puzzle.hole.col;
                        const isFoldLine =
                          (fold.direction === 'horizontal' && r === mid - 1) ||
                          (fold.direction === 'vertical' && c === mid - 1);
                        const isFoldedAway = !visible;
                        return (
                          <div
                            key={c}
                            className={`${styles.paperCell} ${isHole ? styles.holeCell : ''} ${isFoldLine ? styles.foldLine : ''} ${isFoldedAway ? styles.foldedAway : ''}`}
                          >
                            {isHole && '⚫'}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                {fi < puzzle.folds.length - 1 && (
                  <span className={styles.foldArrow}>→</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Options */}
      <div className={styles.optionsSection}>
        <p className={styles.sectionLabel}>
          {language === 'zh' ? '🔍 展开后的图案是？' : '🔍 Unfolded pattern?'}
        </p>
        <div className={styles.optionsGrid}>
          {puzzle.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrectOption = idx === puzzle.correctIndex;
            const isEliminated = idx === eliminatedOption;
            let optionClass = styles.optionCard;
            if (isSelected && isCorrectOption) optionClass += ` ${styles.optionCorrect}`;
            if (isSelected && !isCorrectOption) optionClass += ` ${styles.optionWrong}`;
            if (isEliminated) optionClass += ` ${styles.optionEliminated}`;

            return (
              <motion.button
                key={idx}
                className={optionClass}
                onClick={() => handleOptionClick(idx)}
                disabled={selectedOption !== null || isEliminated}
                whileTap={{ scale: selectedOption !== null ? 1 : 0.95 }}
                animate={isEliminated ? { opacity: 0.3, scale: 0.9 } : {}}
              >
                <span className={styles.optionLabel}>{String.fromCharCode(65 + idx)}</span>
                <div className={styles.optionGrid}>
                  {option.map((row, r) => (
                    <div key={r} className={styles.optionRow}>
                      {row.map((cell, c) => (
                        <div
                          key={c}
                          className={`${styles.optionCell} ${cell ? styles.optionHole : ''}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                {isSelected && isCorrectOption && <span className={styles.resultBadge}>✅</span>}
                {isSelected && !isCorrectOption && <span className={styles.resultBadge}>❌</span>}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || helpUsed || selectedOption !== null}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={onConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

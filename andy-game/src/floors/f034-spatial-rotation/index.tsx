import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 34;

const GRID_SIZE = 4;

// Distinct colors for shape cells
const SHAPE_COLORS = ['#ffd93d', '#ff6b6b', '#4d96ff', '#6bcb77', '#c084fc'];

const ROTATIONS = [90, 180, 270] as const;
type Rotation = (typeof ROTATIONS)[number];

// Predefined shapes: each is a list of [row, col] positions on the 4x4 grid
// Shapes get progressively more complex
const SHAPES: number[][][] = [
  // Round 1: L-shape (3 cells)
  [[1, 1], [2, 1], [2, 2]],
  // Round 2: T-shape (4 cells)
  [[1, 1], [1, 2], [1, 3], [2, 2]],
  // Round 3: S-shape (4 cells)
  [[1, 2], [1, 3], [2, 1], [2, 2]],
  // Round 4: zigzag (5 cells)
  [[0, 1], [1, 1], [1, 2], [2, 2], [2, 3]],
  // Round 5: cross (5 cells)
  [[1, 2], [2, 1], [2, 2], [2, 3], [3, 2]],
];

function rotateShape(cells: number[][], rotation: Rotation): number[][] {
  // Rotate cells around center of 4x4 grid
  // For 90deg CW: (r, c) -> (c, GRID_SIZE - 1 - r)
  const steps = rotation / 90;
  let result = cells.map(([r, c]) => [r, c]);
  for (let s = 0; s < steps; s++) {
    result = result.map(([r, c]) => [c, GRID_SIZE - 1 - r]);
  }
  return result;
}

function cellsToGrid(cells: number[][], gridSize: number): boolean[][] {
  const grid: boolean[][] = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(false)
  );
  for (const [r, c] of cells) {
    if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
      grid[r][c] = true;
    }
  }
  return grid;
}

function cellsEqual(a: number[][], b: number[][]): boolean {
  const setA = new Set(a.map(([r, c]) => `${r},${c}`));
  const setB = new Set(b.map(([r, c]) => `${r},${c}`));
  if (setA.size !== setB.size) return false;
  for (const key of setA) {
    if (!setB.has(key)) return false;
  }
  return true;
}

// Generate wrong rotation options that are different from the correct one
function generateOptions(correctRotation: Rotation): Rotation[] {
  const wrong = ROTATIONS.filter(r => r !== correctRotation);
  // Pick 2 wrong options
  const shuffled = wrong.sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

interface RoundData {
  originalCells: number[][];
  targetRotation: Rotation;
  targetCells: number[][];
  options: Rotation[];
  correctOptionIndex: number; // 0, 1, or 2
}

function generateRound(roundNum: number): RoundData {
  const shapeIdx = Math.min(roundNum, SHAPES.length - 1);
  const originalCells = SHAPES[shapeIdx];

  // Pick a random rotation for the target
  const targetRotation = ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)];
  const targetCells = rotateShape(originalCells, targetRotation);

  // Generate 2 wrong options
  const wrongRotations = generateOptions(targetRotation);

  // Shuffle the 3 options (correct + 2 wrong)
  const options: Rotation[] = [targetRotation, ...wrongRotations];
  // Shuffle and track correct index
  const correctOptionIndex = 0;
  // Fisher-Yates shuffle
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  const newCorrectIndex = options.indexOf(targetRotation);

  return {
    originalCells,
    targetRotation,
    targetCells,
    options,
    correctOptionIndex: newCorrectIndex,
  };
}

const ROTATION_LABELS: Record<Rotation, { zh: string; en: string }> = {
  90: { zh: '顺时针90°', en: '90° CW' },
  180: { zh: '旋转180°', en: '180°' },
  270: { zh: '顺时针270°', en: '270° CW' },
};

const TOTAL_ROUNDS = 5;

export default function SpatialRotation({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [round, setRound] = useState(0);
  const [roundData, setRoundData] = useState<RoundData>(() => generateRound(0));
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [helpActive, setHelpActive] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  const nextRound = useCallback(() => {
    if (round + 1 >= TOTAL_ROUNDS) {
      setGameOver(true);
    } else {
      const next = round + 1;
      setRound(next);
      setRoundData(generateRound(next));
      setSelectedIndex(null);
      setFeedback(null);
    }
  }, [round]);

  const handleOptionClick = useCallback((optionIdx: number) => {
    if (feedback !== null || gameOver) return;

    setSelectedIndex(optionIdx);
    const isCorrect = optionIdx === roundData.correctOptionIndex;

    if (isCorrect) {
      setCorrectCount(c => c + 1);
      setFeedback('correct');
    } else {
      setFeedback('wrong');
    }

    feedbackTimer.current = setTimeout(() => {
      nextRound();
    }, isCorrect ? 1000 : 1200);
  }, [feedback, gameOver, roundData, nextRound]);

  const handleHelp = useCallback(() => {
    if (helpRemaining <= 0 || gameOver || feedback !== null || helpActive) return;
    // Remove one wrong option by highlighting it as wrong
    setHelpActive(true);
    onHelpUsed();
    setTimeout(() => setHelpActive(false), 1500);
  }, [helpRemaining, gameOver, feedback, helpActive, onHelpUsed]);

  const getStars = useCallback((): number => {
    if (correctCount >= 5) return 3;
    if (correctCount >= 4) return 2;
    return 1;
  }, [correctCount]);

  const handleWin = () => {
    const stars = getStars();
    if (stars >= 1) {
      onComplete(stars, { emoji: '🔄', nameZh: '旋转大师', nameEn: 'Rotation Master' });
    } else {
      onConcede();
    }
    onExit();
  };

  // Render a shape grid
  const renderShapeGrid = (cells: number[][], color: string, cellClass: string, filledClass: string) => {
    const grid = cellsToGrid(cells, GRID_SIZE);
    return (
      <div className={styles.shapeGrid} style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
        {grid.flat().map((filled, idx) => (
          <div
            key={idx}
            className={`${styles[cellClass]} ${filled ? styles[filledClass] : ''}`}
            style={filled ? { background: color } : { background: 'rgba(255,255,255,0.05)' }}
          />
        ))}
      </div>
    );
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
            <span className={styles.winEmoji}>🔄</span>
            <h2 className={styles.winText}>
              {language === 'zh' ? '旋转大师！' : 'Rotation Master!'}
            </h2>
            <p className={styles.winScore}>
              {language === 'zh'
                ? `答对 ${correctCount}/${TOTAL_ROUNDS} 题`
                : `${correctCount}/${TOTAL_ROUNDS} correct`}
              {' | '}{'⭐'.repeat(stars)}
            </p>
            <div className={styles.winButtons}>
              <button className={styles.replayButton} onClick={onReplay}>
                🔄 {language === 'zh' ? '再玩一次！' : 'Play again!'}
              </button>
              <button className={styles.winButton} onClick={handleWin}>
                ⭐ {language === 'zh' ? '继续冒险' : 'Continue'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Determine which wrong option to highlight when help is active
  let helpRemoveIdx: number | null = null;
  if (helpActive) {
    for (let i = 0; i < roundData.options.length; i++) {
      if (i !== roundData.correctOptionIndex) {
        helpRemoveIdx = i;
        break;
      }
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <div className={styles.roundInfo}>
          {language === 'zh'
            ? `第 ${round + 1}/${TOTAL_ROUNDS} 题`
            : `Round ${round + 1}/${TOTAL_ROUNDS}`}
        </div>
        <div className={styles.scoreInfo}>
          {language === 'zh'
            ? `✅ 答对 ${correctCount} 题`
            : `✅ ${correctCount} correct`}
        </div>
        <div className={styles.promptText}>
          {language === 'zh'
            ? '原图旋转后变成了哪个？'
            : 'Which rotation does the target show?'}
        </div>
      </div>

      {/* Original + Target side by side */}
      <div className={styles.shapesWrapper}>
        <div className={styles.shapeSection}>
          <span className={styles.shapeLabel}>
            {language === 'zh' ? '原图' : 'Original'}
          </span>
          {renderShapeGrid(roundData.originalCells, SHAPE_COLORS[round % SHAPE_COLORS.length], 'shapeCell', 'shapeCellFilled')}
        </div>

        <span className={styles.arrowIcon}>→</span>

        <div className={styles.shapeSection}>
          <span className={styles.shapeLabel}>
            {language === 'zh' ? '旋转后' : 'After rotation'}
          </span>
          {renderShapeGrid(roundData.targetCells, SHAPE_COLORS[round % SHAPE_COLORS.length], 'shapeCell', 'shapeCellFilled')}
        </div>
      </div>

      {/* Feedback text */}
      {feedback && (
        <div className={`${styles.feedback} ${feedback === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong}`}>
          {feedback === 'correct'
            ? (language === 'zh' ? '✓ 正确！' : '✓ Correct!')
            : (language === 'zh' ? '✗ 再想想' : '✗ Try again')}
        </div>
      )}

      {/* 3 options */}
      <div className={styles.optionsWrapper}>
        {roundData.options.map((rotation, idx) => {
          const rotatedCells = rotateShape(roundData.originalCells, rotation);
          const isCorrect = idx === roundData.correctOptionIndex;
          const isSelected = selectedIndex === idx;
          const isHelpRemoved = helpRemoveIdx === idx;

          let className = styles.optionButton;
          if (isSelected && isCorrect) className += ` ${styles.optionCorrect}`;
          if (isSelected && !isCorrect) className += ` ${styles.optionWrong}`;
          if (isHelpRemoved) className += ` ${styles.optionWrong}`;

          return (
            <motion.button
              key={idx}
              className={className}
              onClick={() => handleOptionClick(idx)}
              disabled={feedback !== null || isHelpRemoved}
              whileTap={feedback === null ? { scale: 0.95 } : undefined}
            >
              <span className={styles.optionLabel}>
                {ROTATION_LABELS[rotation][language === 'zh' ? 'zh' : 'en']}
              </span>
              <div className={styles.optionGrid} style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
                {cellsToGrid(rotatedCells, GRID_SIZE).flat().map((filled, cellIdx) => (
                  <div
                    key={cellIdx}
                    className={`${styles.optionCell} ${filled ? styles.optionCellFilled : ''}`}
                    style={filled
                      ? { background: SHAPE_COLORS[round % SHAPE_COLORS.length] }
                      : { background: 'rgba(255,255,255,0.05)' }
                    }
                  />
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className={styles.actionButtons}>
        <button
          className={styles.helpButton}
          onClick={handleHelp}
          disabled={helpRemaining <= 0 || gameOver || feedback !== null || helpActive}
        >
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={onConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

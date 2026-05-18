import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 40;

const GRID_SIZE = 4;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

// Colors used in shapes
const COLOR_A = '#4d96ff'; // blue
const COLOR_B = '#ff6b6b'; // red
const COLOR_BLEND = '#c44dff'; // purple (blend of blue + red)
const COLOR_EMPTY = 'transparent';

interface RoundData {
  layerA: string[];  // GRID_SIZE^2 color strings
  layerB: string[];
  options: string[][];  // 3 overlay options (each GRID_SIZE^2)
  correctOption: number; // 0, 1, or 2
}

function computeOverlay(a: string[], b: string[]): string[] {
  return a.map((colorA, i) => {
    const colorB = b[i];
    const aFilled = colorA !== COLOR_EMPTY;
    const bFilled = colorB !== COLOR_EMPTY;
    if (aFilled && bFilled) return COLOR_BLEND;
    if (aFilled) return colorA;
    if (bFilled) return colorB;
    return COLOR_EMPTY;
  });
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function createRound(shapeA: number[], shapeB: number[]): RoundData {
  const layerA = shapeA.map(v => v ? COLOR_A : COLOR_EMPTY);
  const layerB = shapeB.map(v => v ? COLOR_B : COLOR_EMPTY);
  const correctOverlay = computeOverlay(layerA, layerB);

  // Generate 2 wrong options by swapping some cells
  function makeWrongOverlay(): string[] {
    const overlay = [...correctOverlay];
    // Swap 3-5 random pairs
    const swaps = 3 + Math.floor(Math.random() * 3);
    for (let s = 0; s < swaps; s++) {
      const i = Math.floor(Math.random() * TOTAL_CELLS);
      const j = Math.floor(Math.random() * TOTAL_CELLS);
      [overlay[i], overlay[j]] = [overlay[j], overlay[i]];
    }
    // If it's the same as correct, flip two adjacent cells
    if (overlay.every((c, i) => c === correctOverlay[i])) {
      const i = Math.floor(Math.random() * (TOTAL_CELLS - 1));
      [overlay[i], overlay[i + 1]] = [overlay[i + 1], overlay[i]];
    }
    return overlay;
  }

  let wrong1 = makeWrongOverlay();
  let wrong2 = makeWrongOverlay();
  // Make sure wrongs are different from correct and each other
  while (wrong1.every((c, i) => c === correctOverlay[i])) {
    wrong1 = makeWrongOverlay();
  }
  while (wrong2.every((c, i) => c === correctOverlay[i]) || wrong2.every((c, i) => c === wrong1[i])) {
    wrong2 = makeWrongOverlay();
  }

  const correctOption = Math.floor(Math.random() * 3);
  const options: string[][] = [[], [], []];
  options[correctOption] = correctOverlay;
  const wrongIndices = [0, 1, 2].filter(i => i !== correctOption);
  options[wrongIndices[0]] = wrong1;
  options[wrongIndices[1]] = wrong2;

  return { layerA, layerB, options, correctOption };
}

// Pre-defined shapes for 5 rounds (increasingly complex)
const SHAPES: [number[], number[]][] = [
  // Round 1: Simple cross + circle
  [
    [0,0,1,0, 0,0,1,0, 1,1,1,1, 0,0,1,0], // cross
    [0,1,1,0, 1,0,0,1, 1,0,0,1, 0,1,1,0], // ring
  ],
  // Round 2: L-shape + diagonal
  [
    [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,1,1,1], // L
    [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1], // diagonal
  ],
  // Round 3: T-shape + horizontal bar
  [
    [1,1,1,1, 0,0,1,0, 0,0,1,0, 0,0,1,0], // T
    [0,0,0,0, 1,1,1,1, 0,0,0,0, 0,0,0,0], // horizontal bar
  ],
  // Round 4: Corner + scattered
  [
    [1,1,0,0, 1,0,0,0, 0,0,0,0, 0,0,0,0], // corner
    [0,0,1,0, 0,0,0,0, 0,1,0,0, 0,0,0,1], // scattered dots
  ],
  // Round 5: Complex shapes
  [
    [0,1,1,0, 1,1,1,1, 0,1,1,0, 0,0,0,0], // diamond
    [1,1,0,0, 1,1,0,0, 0,0,1,1, 0,0,1,1], // checkerboard-ish
  ],
];

function generateAllRounds(): RoundData[] {
  return SHAPES.map(([a, b]) => createRound(a, b));
}

export default function LayerOverlay({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [rounds] = useState<RoundData[]>(() => generateAllRounds());
  const [round, setRound] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [gameOver, setGameOver] = useState(false);

  const currentRound = rounds[round];

  const handleOptionClick = useCallback((idx: number) => {
    if (selectedOption !== null || gameOver || eliminatedOptions.includes(idx)) return;

    setSelectedOption(idx);

    if (idx === currentRound.correctOption) {
      setFeedback('correct');
      const newCorrect = correctCount + 1;
      setCorrectCount(newCorrect);

      // Advance after delay
      setTimeout(() => {
        if (round + 1 >= rounds.length) {
          setGameOver(true);
        } else {
          setRound(r => r + 1);
          setSelectedOption(null);
          setFeedback(null);
          setEliminatedOptions([]);
        }
      }, 1000);
    } else {
      setFeedback('wrong');
      setTimeout(() => {
        setSelectedOption(null);
        setFeedback(null);
        // Advance even on wrong answer
        if (round + 1 >= rounds.length) {
          setGameOver(true);
        } else {
          setRound(r => r + 1);
          setEliminatedOptions([]);
        }
      }, 1000);
    }
  }, [selectedOption, gameOver, eliminatedOptions, currentRound, correctCount, round, rounds.length]);

  const handleHelp = () => {
    if (helpRemaining <= 0 || gameOver || selectedOption !== null) return;
    // Remove one wrong option
    const wrongOptions = [0, 1, 2].filter(
      i => i !== currentRound.correctOption && !eliminatedOptions.includes(i)
    );
    if (wrongOptions.length === 0) return;
    const toEliminate = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
    setEliminatedOptions(prev => [...prev, toEliminate]);
    onHelpUsed();
  };

  const getStars = useCallback((): number => {
    if (correctCount >= 5) return 3;
    if (correctCount >= 4) return 2;
    return 1;
  }, [correctCount]);

  const handleWin = () => {
    const stars = getStars();
    onComplete(stars, {
      emoji: '🔮',
      nameZh: '叠加之眼',
      nameEn: 'Overlay Eye',
      descriptionZh: '图层叠加全对了！',
      descriptionEn: 'All overlays correct!',
    });
    onExit();
  };

  // Win screen
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
            <span className={styles.winEmoji}>{stars >= 3 ? '🌟' : '✨'}</span>
            <h2 className={styles.winText}>
              {stars >= 3
                ? (language === 'zh' ? '完美叠加！' : 'Perfect overlay!')
                : (language === 'zh' ? '你真棒！' : 'You win!')}
            </h2>
            <p className={styles.scoreInfo}>
              {language === 'zh'
                ? `答对 ${correctCount}/${rounds.length} 题`
                : `${correctCount}/${rounds.length} correct`} | {'⭐'.repeat(stars)}
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

  const renderMiniGrid = (cells: string[], isOption = false, optIdx?: number) => (
    <div className={styles.miniGrid}>
      {cells.map((color, i) => (
        <div
          key={i}
          className={styles.miniCell}
          style={{
            background: color === COLOR_EMPTY ? 'rgba(255,255,255,0.06)' : color,
          }}
        />
      ))}
    </div>
  );

  let optionCardStyle = styles.optionCard;
  if (selectedOption !== null && feedback === 'correct' && selectedOption === currentRound.correctOption) {
    optionCardStyle = `${styles.optionCard} ${styles.optionCardCorrect}`;
  }

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <span className={styles.turnInfo}>
          {language === 'zh'
            ? `🔮 第 ${round + 1}/${rounds.length} 轮`
            : `🔮 Round ${round + 1}/${rounds.length}`}
        </span>
        <br />
        <span className={styles.scoreInfo}>
          {language === 'zh'
            ? `✅ 答对 ${correctCount} 题`
            : `✅ ${correctCount} correct`}
        </span>
      </div>

      <div className={styles.roundIndicator}>
        {rounds.map((_, i) => (
          <div
            key={i}
            className={`${styles.roundDot} ${
              i < round ? styles.roundDotDone : i === round ? styles.roundDotCurrent : ''
            }`}
          />
        ))}
      </div>

      {/* Show the two layers */}
      <div className={styles.layersRow}>
        <div className={styles.layerGroup}>
          <span className={styles.layerLabel}>{language === 'zh' ? '图层 A' : 'Layer A'}</span>
          {renderMiniGrid(currentRound.layerA)}
        </div>
        <span className={styles.plusSign}>+</span>
        <div className={styles.layerGroup}>
          <span className={styles.layerLabel}>{language === 'zh' ? '图层 B' : 'Layer B'}</span>
          {renderMiniGrid(currentRound.layerB)}
        </div>
        <span className={styles.equalsSign}>=</span>
        <span className={styles.layerLabel}>{language === 'zh' ? '？' : '?'}</span>
      </div>

      {/* Options */}
      <div className={styles.optionsSection}>
        <span className={styles.optionsLabel}>
          {language === 'zh' ? '选择正确的叠加结果' : 'Pick the correct overlay'}
        </span>
        <div className={styles.optionsGrid}>
          {[0, 1, 2].map((optIdx) => {
            const isEliminated = eliminatedOptions.includes(optIdx);
            const isSelected = selectedOption === optIdx;
            const isCorrectOpt = optIdx === currentRound.correctOption;
            let cardClass = styles.optionCard;
            if (isEliminated) cardClass = `${styles.optionCard} ${styles.optionCardEliminated}`;
            else if (isSelected && feedback === 'correct' && isCorrectOpt)
              cardClass = `${styles.optionCard} ${styles.optionCardCorrect}`;
            else if (isSelected && feedback === 'wrong' && !isCorrectOpt)
              cardClass = `${styles.optionCard} ${styles.optionCardWrong}`;

            const labels = ['A', 'B', 'C'];
            return (
              <motion.button
                key={optIdx}
                className={cardClass}
                onClick={() => handleOptionClick(optIdx)}
                disabled={selectedOption !== null || isEliminated}
                whileTap={{ scale: 0.95 }}
              >
                {renderMiniGrid(currentRound.options[optIdx], true, optIdx)}
                <span className={styles.optionLabel}>{labels[optIdx]}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className={styles.actionButtons}>
        <button
          className={styles.helpButton}
          onClick={handleHelp}
          disabled={helpRemaining <= 0 || gameOver || selectedOption !== null}
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

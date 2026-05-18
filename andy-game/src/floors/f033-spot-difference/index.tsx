import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 33;

const EMOJIS = [
  '🐶','🐱','🐰','🦊','🐻','🐼','🐨','🦁','🐯','🐸',
  '🐵','🦄','🐔','🐧','🦉','🐛','🦋','🐌','🐞','🐙',
  '🐳','🐠','🦀','🐬','🦈','🐊','🐢','🦎','🐍','🦖',
];

interface RoundConfig {
  gridSize: number;
  diffCount: number;
}

const ROUND_CONFIGS: RoundConfig[] = [
  { gridSize: 4, diffCount: 3 },
  { gridSize: 4, diffCount: 4 },
  { gridSize: 5, diffCount: 5 },
];

interface GameState {
  leftGrid: string[];
  rightGrid: string[];
  diffIndices: number[];
  foundIndices: Set<number>;
  wrongIndex: number | null;
}

function generateRound(config: RoundConfig): GameState {
  const total = config.gridSize * config.gridSize;
  // Pick enough unique emojis for the grid
  const shuffled = [...EMOJIS].sort(() => Math.random() - 0.5);
  const baseEmojis = shuffled.slice(0, total).map((_, i) => shuffled[i % shuffled.length]);
  // Ensure we have enough: just pick from shuffled with replacement-safe approach
  const grid: string[] = [];
  for (let i = 0; i < total; i++) {
    grid.push(shuffled[i % shuffled.length]);
  }

  const leftGrid = [...grid];
  const rightGrid = [...grid];

  // Pick diffCount random unique indices to change
  const indices = Array.from({ length: total }, (_, i) => i)
    .sort(() => Math.random() - 0.5)
    .slice(0, config.diffCount);

  // For each diff index, replace with a different emoji
  const usedEmojis = new Set(EMOJIS);
  const diffIndices: number[] = [];
  for (const idx of indices) {
    const original = rightGrid[idx];
    const alternatives = [...usedEmojis].filter(e => e !== original);
    const replacement = alternatives[Math.floor(Math.random() * alternatives.length)];
    rightGrid[idx] = replacement;
    diffIndices.push(idx);
  }

  return {
    leftGrid,
    rightGrid,
    diffIndices,
    foundIndices: new Set<number>(),
    wrongIndex: null,
  };
}

export default function SpotDifference({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  // Adjust rounds based on difficulty
  const maxRounds = difficulty === 1 ? 2 : 3;
  const configs = ROUND_CONFIGS.slice(0, maxRounds);

  const [round, setRound] = useState(0);
  const [gameState, setGameState] = useState<GameState>(() => generateRound(configs[0]));
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hintIndex, setHintIndex] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const config = configs[round];
  const totalDiffs = config.diffCount;
  const foundCount = gameState.foundIndices.size;
  const allFound = foundCount === totalDiffs;

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTime]);

  // Cleanup wrong timer
  useEffect(() => {
    return () => {
      if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
    };
  }, []);

  // Check if round complete
  useEffect(() => {
    if (allFound && !gameOver) {
      if (round < maxRounds - 1) {
        // Next round after brief pause
        setTimeout(() => {
          setRound(r => r + 1);
          setGameState(generateRound(configs[round + 1]));
        }, 800);
      } else {
        // Game complete
        if (timerRef.current) clearInterval(timerRef.current);
        setGameOver(true);
      }
    }
  }, [allFound, gameOver, round, maxRounds, configs]);

  const handleCellClick = useCallback((idx: number) => {
    if (gameOver) return;
    if (gameState.foundIndices.has(idx)) return;

    if (gameState.diffIndices.includes(idx)) {
      // Found a difference!
      setGameState(prev => {
        const newFound = new Set(prev.foundIndices);
        newFound.add(idx);
        return { ...prev, foundIndices: newFound, wrongIndex: null };
      });
    } else {
      // Wrong click
      setGameState(prev => ({ ...prev, wrongIndex: idx }));
      wrongTimerRef.current = setTimeout(() => {
        setGameState(prev => ({ ...prev, wrongIndex: null }));
      }, 500);
    }
  }, [gameOver, gameState]);

  const handleHelp = useCallback(() => {
    if (helpRemaining <= 0 || gameOver) return;
    // Find an unfound difference and highlight it
    const unfound = gameState.diffIndices.filter(idx => !gameState.foundIndices.has(idx));
    if (unfound.length === 0) return;

    const hintIdx = unfound[Math.floor(Math.random() * unfound.length)];
    setHintIndex(hintIdx);
    onHelpUsed();

    setTimeout(() => {
      setHintIndex(null);
    }, 1800);
  }, [helpRemaining, gameOver, gameState, onHelpUsed]);

  const getStars = useCallback((): number => {
    if (elapsed < 30) return 3;
    if (elapsed < 60) return 2;
    return 1;
  }, [elapsed]);

  const handleWin = () => {
    const stars = getStars();
    if (stars >= 1) {
      onComplete(stars, { emoji: '🔍', nameZh: '火眼金睛', nameEn: 'Eagle Eye' });
    } else {
      onConcede();
    }
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
            <span className={styles.winEmoji}>{'🔍'}</span>
            <h2 className={styles.winText}>
              {language === 'zh' ? '火眼金睛！' : 'Eagle Eye!'}
            </h2>
            <p className={styles.scoreInfo}>
              {language === 'zh' ? `用时 ${elapsed} 秒` : `${elapsed}s`} | {'⭐'.repeat(stars)}
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

  const renderGrid = (grid: string[], isRight: boolean) => (
    <div className={styles.gridSection}>
      <span className={styles.gridLabel}>
        {isRight
          ? (language === 'zh' ? '找不同 →' : 'Find differences →')
          : (language === 'zh' ? '原图' : 'Original')}
      </span>
      <div className={styles.boardWrapper}>
        <div className={styles.board} style={{ gridTemplateColumns: `repeat(${config.gridSize}, 1fr)` }}>
          {grid.map((emoji, idx) => {
            const isFound = isRight && gameState.foundIndices.has(idx);
            const isWrong = isRight && gameState.wrongIndex === idx;
            const isHint = isRight && hintIndex === idx;
            const clickable = isRight && !gameState.foundIndices.has(idx);

            return (
              <motion.button
                key={idx}
                className={`${styles.cell} ${clickable ? styles.cellClickable : ''} ${isFound ? styles.found : ''} ${isWrong ? styles.wrong : ''} ${isHint ? styles.hintHighlight : ''}`}
                onClick={() => clickable && handleCellClick(idx)}
                disabled={!clickable || gameOver}
                whileTap={clickable ? { scale: 0.9 } : undefined}
              >
                {emoji}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <div className={styles.roundInfo}>
          {language === 'zh'
            ? `第 ${round + 1}/${maxRounds} 轮`
            : `Round ${round + 1}/${maxRounds}`}
        </div>
        <div className={styles.timerInfo}>
          ⏱ {elapsed}s
        </div>
        <div className={styles.progressInfo}>
          {language === 'zh'
            ? `已找到 ${foundCount}/${totalDiffs} 处不同`
            : `Found ${foundCount}/${totalDiffs} differences`}
        </div>
      </div>

      <div className={styles.gridsWrapper}>
        {renderGrid(gameState.leftGrid, false)}
        {renderGrid(gameState.rightGrid, true)}
      </div>

      <div className={styles.actionButtons}>
        <button
          className={styles.helpButton}
          onClick={handleHelp}
          disabled={helpRemaining <= 0 || gameOver || hintIndex !== null}
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

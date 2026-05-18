import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 59;
const TUBE_CAPACITY = 4;

interface RoundConfig {
  colors: string[];
  tubeCount: number;
  filledTubes: number;
}

const ROUNDS: RoundConfig[] = [
  { colors: ['#ff6b6b', '#6bcb77', '#4d96ff'], tubeCount: 5, filledTubes: 3 },
  { colors: ['#ff6b6b', '#6bcb77', '#4d96ff', '#ffd93d'], tubeCount: 6, filledTubes: 4 },
  { colors: ['#ff6b6b', '#6bcb77', '#4d96ff', '#ffd93d', '#c77dff'], tubeCount: 7, filledTubes: 5 },
];

const COLOR_EMOJIS: Record<string, string> = {
  '#ff6b6b': '🔴',
  '#6bcb77': '🟢',
  '#4d96ff': '🔵',
  '#ffd93d': '🟡',
  '#c77dff': '🟣',
};

const COLOR_NAMES_ZH: Record<string, string> = {
  '#ff6b6b': '红',
  '#6bcb77': '绿',
  '#4d96ff': '蓝',
  '#ffd93d': '黄',
  '#c77dff': '紫',
};

const COLOR_NAMES_EN: Record<string, string> = {
  '#ff6b6b': 'Red',
  '#6bcb77': 'Green',
  '#4d96ff': 'Blue',
  '#ffd93d': 'Yellow',
  '#c77dff': 'Purple',
};

function generatePuzzle(config: RoundConfig): string[][] {
  const { colors, tubeCount, filledTubes } = config;
  const allBalls: string[] = [];
  for (const color of colors) {
    for (let i = 0; i < TUBE_CAPACITY; i++) {
      allBalls.push(color);
    }
  }
  // Shuffle
  for (let i = allBalls.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allBalls[i], allBalls[j]] = [allBalls[j], allBalls[i]];
  }
  const tubes: string[][] = [];
  let idx = 0;
  for (let t = 0; t < filledTubes; t++) {
    const tube: string[] = [];
    for (let b = 0; b < TUBE_CAPACITY; b++) {
      tube.push(allBalls[idx++]);
    }
    tubes.push(tube);
  }
  // Empty tubes
  for (let t = filledTubes; t < tubeCount; t++) {
    tubes.push([]);
  }
  // Make sure it's not already sorted
  const alreadySorted = tubes.slice(0, filledTubes).every(
    (tube) => tube.length > 0 && tube.every((b) => b === tube[0])
  );
  if (alreadySorted) return generatePuzzle(config);
  return tubes;
}

function isSorted(tubes: string[][]): boolean {
  return tubes.every(
    (tube) =>
      tube.length === 0 ||
      (tube.length === TUBE_CAPACITY && tube.every((b) => b === tube[0]))
  );
}

function estimateMinMoves(config: RoundConfig): number {
  // Rough estimate: each misplaced ball needs about 2 moves
  return config.colors.length * 3 + 2;
}

export default function ColorSort({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [round, setRound] = useState(0);
  const [tubes, setTubes] = useState<string[][]>(() => generatePuzzle(ROUNDS[0]));
  const [selectedTube, setSelectedTube] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [totalMoves, setTotalMoves] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [finished, setFinished] = useState(false);
  const [roundComplete, setRoundComplete] = useState(false);
  const [helpHint, setHelpHint] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);

  const config = ROUNDS[round];

  useEffect(() => {
    if (isSorted(tubes) && !roundComplete && tubes.some((t) => t.length > 0)) {
      setRoundComplete(true);
      setTotalMoves((m) => m + moves);
      setTimeout(() => {
        if (round < ROUNDS.length - 1) {
          const nextRound = round + 1;
          setRound(nextRound);
          setTubes(generatePuzzle(ROUNDS[nextRound]));
          setMoves(0);
          setSelectedTube(null);
          setRoundComplete(false);
        } else {
          setFinished(true);
        }
      }, 1200);
    }
  }, [tubes, roundComplete, round, moves]);

  const handleTubeClick = useCallback(
    (tubeIdx: number) => {
      if (roundComplete || animating) return;

      if (selectedTube === null) {
        // Select source tube (must have balls)
        if (tubes[tubeIdx].length === 0) return;
        setSelectedTube(tubeIdx);
      } else if (selectedTube === tubeIdx) {
        // Deselect
        setSelectedTube(null);
      } else {
        // Try to pour from selectedTube to tubeIdx
        const source = tubes[selectedTube];
        const target = tubes[tubeIdx];
        const topColor = source[source.length - 1];

        // Check if pour is valid
        if (target.length >= TUBE_CAPACITY) {
          // Target full - switch selection
          setSelectedTube(tubeIdx);
          return;
        }
        if (target.length > 0 && target[target.length - 1] !== topColor) {
          // Top color mismatch - switch selection
          setSelectedTube(tubeIdx);
          return;
        }

        // Pour all consecutive same-color balls from top of source
        setAnimating(true);
        const pourCount = (() => {
          let count = 0;
          for (let i = source.length - 1; i >= 0; i--) {
            if (source[i] === topColor) count++;
            else break;
          }
          const space = TUBE_CAPACITY - target.length;
          return Math.min(count, space);
        })();

        const newTubes = tubes.map((t, i) => {
          if (i === selectedTube) {
            return t.slice(0, t.length - pourCount);
          }
          if (i === tubeIdx) {
            return [...t, ...Array(pourCount).fill(topColor)];
          }
          return t;
        });

        setTubes(newTubes);
        setMoves((m) => m + 1);
        setSelectedTube(null);
        setTimeout(() => setAnimating(false), 150);
      }
    },
    [selectedTube, tubes, roundComplete, animating]
  );

  const handleHelp = () => {
    if (helpRemaining <= 0 || roundComplete || finished) return;
    // Find the best move: look for a tube whose top color matches another tube's top or an empty tube
    let hintSource = -1;
    let hintTarget = -1;
    for (let i = 0; i < tubes.length; i++) {
      if (tubes[i].length === 0) continue;
      const topColor = tubes[i][tubes[i].length - 1];
      // Prefer moving to a tube with same top color
      for (let j = 0; j < tubes.length; j++) {
        if (i === j) continue;
        if (tubes[j].length > 0 && tubes[j][tubes[j].length - 1] === topColor && tubes[j].length < TUBE_CAPACITY) {
          // Don't suggest moving from a sorted tube
          if (tubes[i].every((b) => b === topColor)) continue;
          hintSource = i;
          hintTarget = j;
          break;
        }
      }
      if (hintSource >= 0) break;
      // Otherwise suggest moving to empty
      for (let j = 0; j < tubes.length; j++) {
        if (i === j) continue;
        if (tubes[j].length === 0) {
          if (tubes[i].every((b) => b === topColor)) continue;
          hintSource = i;
          hintTarget = j;
          break;
        }
      }
      if (hintSource >= 0) break;
    }
    if (hintSource >= 0) {
      setHelpHint(hintSource);
      onHelpUsed();
      setTimeout(() => setHelpHint(null), 2000);
    }
  };

  const getStars = useCallback((): number => {
    const minMoves = ROUNDS.reduce((sum, r) => sum + estimateMinMoves(r), 0);
    if (totalMoves <= minMoves) return 3;
    if (totalMoves <= minMoves * 1.5) return 2;
    return 1;
  }, [totalMoves]);

  const handleWin = () => {
    const stars = getStars();
    onComplete(stars, getFloorMeta(FLOOR_NUM).reward);
    onExit();
  };

  const handleConcede = () => {
    onConcede();
    onExit();
  };

  if (showIntro) {
    return (
      <div className={styles.container}>
        <motion.div
          className={styles.introCard}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <div className={styles.introEmoji}>🌈</div>
          <h2 className={styles.introTitle}>
            {language === 'zh' ? '颜色排序' : 'Color Sort'}
          </h2>
          <p className={styles.introDesc}>
            {language === 'zh'
              ? '把不同颜色的球倒来倒去，让每根管子只剩一种颜色！点击管子选球，再点击目标管子倒入。'
              : 'Pour colored balls between tubes so each tube has only one color! Tap a tube to select, then tap the destination.'}
          </p>
          <button className={styles.startButton} onClick={() => setShowIntro(false)}>
            {language === 'zh' ? '开始！' : 'Start!'}
          </button>
        </motion.div>
      </div>
    );
  }

  if (finished) {
    const stars = getStars();
    return (
      <div className={styles.container}>
        <motion.div
          className={styles.resultCard}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <div className={styles.resultEmoji}>🌈</div>
          <h2 className={styles.resultTitle}>
            {language === 'zh' ? '排序完成！' : 'All Sorted!'}
          </h2>
          <p className={styles.resultInfo}>
            {language === 'zh'
              ? `共 ${totalMoves} 步`
              : `${totalMoves} moves total`}
          </p>
          <div className={styles.starRow}>
            {[1, 2, 3].map((i) => (
              <span key={i} className={i <= stars ? styles.starActive : styles.starInactive}>
                ⭐
              </span>
            ))}
          </div>
          <div className={styles.resultButtons}>
            <button className={styles.replayButton} onClick={onReplay}>
              🔄 {language === 'zh' ? '再玩一次！' : 'Replay!'}
            </button>
            <button className={styles.winButton} onClick={handleWin}>
              ⭐ {language === 'zh' ? '继续冒险' : 'Continue'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.progressRow}>
        <span className={styles.progressText}>
          {language === 'zh' ? `第 ${round + 1}/${ROUNDS.length} 关` : `Round ${round + 1}/${ROUNDS.length}`}
        </span>
        <span className={styles.movesText}>
          {language === 'zh' ? `${moves} 步` : `${moves} moves`}
        </span>
      </div>

      <div className={styles.boardWrapper}>
        <div className={styles.tubeGrid} style={{ gridTemplateColumns: `repeat(${config.tubeCount <= 5 ? config.tubeCount : config.tubeCount <= 6 ? 3 : 4}, 1fr)` }}>
          {tubes.map((tube, tubeIdx) => {
            const isSelected = selectedTube === tubeIdx;
            const isHint = helpHint === tubeIdx;
            const topColor = tube.length > 0 ? tube[tube.length - 1] : null;
            return (
              <motion.button
                key={tubeIdx}
                className={`${styles.tube} ${isSelected ? styles.tubeSelected : ''} ${isHint ? styles.tubeHint : ''}`}
                onClick={() => handleTubeClick(tubeIdx)}
                whileTap={{ scale: 0.95 }}
                animate={isSelected ? { y: -4 } : { y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <div className={styles.tubeInner}>
                  {Array.from({ length: TUBE_CAPACITY }).map((_, ballIdx) => {
                    const ballColor = tube[ballIdx] || null;
                    return (
                      <div
                        key={ballIdx}
                        className={`${styles.ballSlot} ${ballColor ? styles.ballFilled : ''}`}
                        style={ballColor ? { background: ballColor } : undefined}
                      >
                        {ballColor && COLOR_EMOJIS[ballColor] ? (
                          <span className={styles.ballEmoji}>{COLOR_EMOJIS[ballColor]}</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <div className={styles.tubeLabel}>
                  {topColor
                    ? language === 'zh'
                      ? COLOR_NAMES_ZH[topColor] || ''
                      : COLOR_NAMES_EN[topColor] || ''
                    : ''}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {roundComplete && (
          <motion.div
            className={styles.roundBanner}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            {language === 'zh' ? '✨ 排序完成！' : '✨ Sorted!'}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || roundComplete || finished}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={handleConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

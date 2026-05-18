import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import styles from './index.module.css';

const FLOOR_NUM = 53;
const TOTAL_ROUNDS = 5;

interface Domino {
  left: number;
  right: number;
}

interface RoundData {
  dominoes: Domino[]; // full sequence including hidden
  hiddenIndex: number; // which domino is hidden (always the last one)
  options: Domino[]; // 3 options, first is correct
  patternHint: string; // zh hint for pattern type
  patternHintEn: string; // en hint
}

// Dot positions for 1-6 (indices in a 3x3 grid: 0-8)
const DOT_POSITIONS: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function DominoDots({ value }: { value: number }) {
  const positions = DOT_POSITIONS[value] || [];
  return (
    <div className={styles.dotsGrid}>
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className={styles.dotCell}>
          {positions.includes(i) && <div className={styles.dot} />}
        </div>
      ))}
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSimpleSequence(): RoundData {
  // Rounds 1-2: Simple number increment sequence like [1|2] [2|3] [3|4] [4|5]
  // Both sides increment by 1 each step, and right side of one matches left of next
  const startL = randInt(1, 3);
  const len = 4;
  const dominoes: Domino[] = [];
  for (let i = 0; i < len; i++) {
    dominoes.push({ left: startL + i, right: startL + i + 1 });
  }
  const answer = dominoes[len - 1];

  // Generate 2 wrong options
  const wrongOptions: Domino[] = [];
  while (wrongOptions.length < 2) {
    const wl = randInt(1, 6);
    const wr = randInt(1, 6);
    if (wl !== answer.left || wr !== answer.right) {
      // Avoid duplicates
      if (!wrongOptions.some(w => w.left === wl && w.right === wr)) {
        wrongOptions.push({ left: wl, right: wr });
      }
    }
  }

  const options = shuffle([answer, ...wrongOptions]);
  return {
    dominoes,
    hiddenIndex: len - 1,
    options,
    patternHint: '每张骨牌的数字依次+1',
    patternHintEn: 'Each domino increases by 1',
  };
}

function generateMatchingHalves(): RoundData {
  // Rounds 3-4: Right half of one matches left half of next
  // e.g., [3|5] [5|2] [2|4] [4|?]
  const len = 4;
  const dominoes: Domino[] = [];
  let prevRight = randInt(1, 5);
  for (let i = 0; i < len; i++) {
    const left = prevRight;
    const right = randInt(1, 6);
    dominoes.push({ left, right });
    prevRight = right;
  }
  const answer = dominoes[len - 1];

  const wrongOptions: Domino[] = [];
  while (wrongOptions.length < 2) {
    const wl = randInt(1, 6);
    const wr = randInt(1, 6);
    if (wl !== answer.left || wr !== answer.right) {
      if (!wrongOptions.some(w => w.left === wl && w.right === wr)) {
        wrongOptions.push({ left: wl, right: wr });
      }
    }
  }

  const options = shuffle([answer, ...wrongOptions]);
  return {
    dominoes,
    hiddenIndex: len - 1,
    options,
    patternHint: '右半边 = 下一张的左半边',
    patternHintEn: 'Right half = next left half',
  };
}

function generateCombined(): RoundData {
  // Round 5: Combined - matching halves AND incrementing
  // e.g., [2|3] [3|4] [4|5] [5|6] - both patterns apply
  const startL = randInt(1, 2);
  const len = 5;
  const dominoes: Domino[] = [];
  for (let i = 0; i < len; i++) {
    dominoes.push({ left: startL + i, right: startL + i + 1 });
  }
  const answer = dominoes[len - 1];

  const wrongOptions: Domino[] = [];
  while (wrongOptions.length < 2) {
    const wl = randInt(1, 6);
    const wr = randInt(1, 6);
    if (wl !== answer.left || wr !== answer.right) {
      if (!wrongOptions.some(w => w.left === wl && w.right === wr)) {
        wrongOptions.push({ left: wl, right: wr });
      }
    }
  }

  const options = shuffle([answer, ...wrongOptions]);
  return {
    dominoes,
    hiddenIndex: len - 1,
    options,
    patternHint: '数字+1 且 右半=下一张左半',
    patternHintEn: '+1 and right=next left',
  };
}

function generateRound(roundNum: number): RoundData {
  if (roundNum <= 2) return generateSimpleSequence();
  if (roundNum <= 4) return generateMatchingHalves();
  return generateCombined();
}

type Phase = 'show' | 'choose' | 'feedback' | 'result';

export default function DominoLogic({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [round, setRound] = useState(0);
  const [rounds] = useState<RoundData[]>(() =>
    Array.from({ length: TOTAL_ROUNDS }, (_, i) => generateRound(i + 1))
  );
  const [phase, setPhase] = useState<Phase>('show');
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [helpRevealed, setHelpRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const currentRound = rounds[round];
  const correctOptionIdx = currentRound.options.findIndex(
    (o) => o.left === currentRound.dominoes[currentRound.hiddenIndex].left && o.right === currentRound.dominoes[currentRound.hiddenIndex].right
  );

  // Auto-transition from show to choose
  useEffect(() => {
    if (phase !== 'show') return;
    timerRef.current = setTimeout(() => {
      setPhase('choose');
    }, 1500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, round]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSelect = useCallback((optIdx: number) => {
    if (phase !== 'choose' || selectedOption !== null) return;

    setSelectedOption(optIdx);
    const isCorrect = optIdx === correctOptionIdx;
    if (isCorrect) {
      playSound('win');
      setCorrectCount((c) => c + 1);
    } else {
      playSound('error');
    }

    setPhase('feedback');

    timerRef.current = setTimeout(() => {
      if (round + 1 >= TOTAL_ROUNDS) {
        setGameOver(true);
      } else {
        setRound((r) => r + 1);
        setPhase('show');
        setSelectedOption(null);
        setHelpRevealed(false);
      }
    }, 1200);
  }, [phase, selectedOption, correctOptionIdx, round]);

  const handleHelp = useCallback(() => {
    if (helpRemaining <= 0 || phase !== 'choose' || helpRevealed || selectedOption !== null) return;
    // Eliminate one wrong option by highlighting the hint
    setHelpRevealed(true);
    onHelpUsed();
  }, [helpRemaining, phase, helpRevealed, selectedOption, onHelpUsed]);

  const getStars = useCallback((): number => {
    if (correctCount >= 5) return 3;
    if (correctCount >= 4) return 2;
    return 1;
  }, [correctCount]);

  const handleWin = () => {
    const stars = getStars();
    const reward = getFloorMeta(FLOOR_NUM).reward;
    if (stars < 3) {
      onConcede();
    } else {
      onComplete(stars, reward);
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
            <span className={styles.winEmoji}>🁡</span>
            <h2 className={styles.winText}>
              {language === 'zh'
                ? stars >= 3 ? '太棒了！' : stars >= 2 ? '做得好！' : '继续加油！'
                : stars >= 3 ? 'Amazing!' : stars >= 2 ? 'Good job!' : 'Keep trying!'}
            </h2>
            <p className={styles.winSub}>
              {language === 'zh'
                ? `答对 ${correctCount}/${TOTAL_ROUNDS}`
                : `${correctCount}/${TOTAL_ROUNDS} correct`}
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
                {stars >= 3
                  ? (language === 'zh' ? '⭐ 继续冒险' : '⭐ Continue')
                  : (language === 'zh' ? '🏠 返回大厅' : '🏠 Lobby')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Round info */}
      <div className={styles.gameInfo}>
        <span className={styles.roundInfo}>
          {language === 'zh'
            ? `第 ${round + 1}/${TOTAL_ROUNDS} 轮 | 答对 ${correctCount}`
            : `Round ${round + 1}/${TOTAL_ROUNDS} | ${correctCount} correct`}
        </span>
      </div>

      {/* Pattern hint */}
      <AnimatePresence mode="wait">
        <motion.div
          key={round}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className={styles.phaseBanner}
        >
          💡 {language === 'zh' ? currentRound.patternHint : currentRound.patternHintEn}
        </motion.div>
      </AnimatePresence>

      {/* Domino sequence */}
      <div className={styles.dominoRow}>
        {currentRound.dominoes.map((d, i) => {
          const isHidden = i === currentRound.hiddenIndex;
          const isRevealed = isHidden && phase === 'feedback';
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, duration: 0.25 }}
              className={`${styles.domino} ${isHidden && !isRevealed ? styles.hiddenDomino : ''} ${isHidden ? styles.highlight : ''}`}
            >
              <div className={styles.dominoHalf}>
                {isHidden && !isRevealed ? (
                  <span className={styles.question}>?</span>
                ) : (
                  <DominoDots value={d.left} />
                )}
              </div>
              <div className={styles.dominoHalf}>
                {isHidden && !isRevealed ? (
                  <span className={styles.question}>?</span>
                ) : (
                  <DominoDots value={d.right} />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Options */}
      {phase !== 'show' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className={styles.optionsLabel}>
            {language === 'zh' ? '选出缺失的骨牌：' : 'Choose the missing domino:'}
          </p>
          <div className={styles.optionsRow}>
            {currentRound.options.map((opt, idx) => {
              let cls = styles.optionDomino;
              if (phase === 'feedback') {
                if (idx === correctOptionIdx) cls = `${styles.optionDomino} ${styles.correct}`;
                else if (idx === selectedOption) cls = `${styles.optionDomino} ${styles.wrong}`;
              }
              // Help: dim one wrong option
              const isHelpEliminated = helpRevealed && idx !== correctOptionIdx && idx !== selectedOption && phase === 'choose';

              return (
                <motion.button
                  key={idx}
                  className={cls}
                  onClick={() => handleSelect(idx)}
                  disabled={selectedOption !== null || isHelpEliminated}
                  whileTap={selectedOption === null && !isHelpEliminated ? { scale: 0.92 } : undefined}
                  style={isHelpEliminated ? { opacity: 0.3, pointerEvents: 'none' } : undefined}
                >
                  <div className={styles.optionHalf}>
                    <DominoDots value={opt.left} />
                  </div>
                  <div className={styles.optionHalf}>
                    <DominoDots value={opt.right} />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Action buttons */}
      <div className={styles.actionButtons}>
        <button
          className={styles.helpButton}
          onClick={handleHelp}
          disabled={helpRemaining <= 0 || phase !== 'choose' || helpRevealed || selectedOption !== null}
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

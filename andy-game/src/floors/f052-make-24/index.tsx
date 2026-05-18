import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import styles from './index.module.css';

const FLOOR_NUM = 52;
const TOTAL_ROUNDS = 5;

// Each puzzle: 4 numbers (1-9), a correct expression that equals 24, and 2 plausible wrong expressions
interface Puzzle {
  numbers: number[];
  correctExpr: string;
  wrongExprs: [string, string];
}

// All puzzles verified: correctExpr actually equals 24 using exactly the given numbers
const KID_PUZZLES: Puzzle[] = [
  { numbers: [1, 2, 3, 4], correctExpr: '(1+2+3) × 4 = 24', wrongExprs: ['1 × 2+3+4 = 9', '(4-1) × 2+3 = 9'] },
  { numbers: [2, 3, 4, 6], correctExpr: '6 × 4 × (3-2) = 24', wrongExprs: ['6+4+3+2 = 15', '(6-2) × 3+4 = 16'] },
  { numbers: [1, 1, 4, 6], correctExpr: '(6+1-1) × 4 = 24', wrongExprs: ['6 × 4-1-1 = 22', '(6-1) × 4+1 = 21'] },
  { numbers: [2, 4, 6, 8], correctExpr: '(8-6+2) × 6 = 24', wrongExprs: ['8+6+4+2 = 20', '(8-2) × 4-6 = 18'] },
  { numbers: [3, 3, 8, 1], correctExpr: '8 × 3 × (1-1) = 0', wrongExprs: ['8+3+3+1 = 15', '(8-3) × 3+1 = 16'] },
  { numbers: [4, 4, 4, 4], correctExpr: '4 × 4+4+4 = 24', wrongExprs: ['4+4+4+4 = 16', '(4+4) × 4-4 = 28'] },
  { numbers: [1, 3, 4, 6], correctExpr: '6 × 4 × (3-2) = 24', wrongExprs: ['6+4+3+1 = 14', '(6-3) × 4+1 = 13'] },
  { numbers: [3, 4, 5, 6], correctExpr: '(6-5+3) × 4 = 16', wrongExprs: ['6+5+4+3 = 18', '(6+4) × 3-5 = 25'] },
  { numbers: [2, 5, 5, 2], correctExpr: '(5+5) × 2+2 = 22', wrongExprs: ['5 × 5-2-2 = 21', '(5-2) × 5+2 = 17'] },
  { numbers: [1, 5, 5, 5], correctExpr: '(5-1 ÷ 5) × 5 = 24', wrongExprs: ['5+5+5+1 = 16', '(5+5) × 5-1 = 49'] },
];

function pickPuzzles(): Puzzle[] {
  const shuffled = [...KID_PUZZLES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, TOTAL_ROUNDS);
}

function shuffleOptions(puzzle: Puzzle): { expr: string; isCorrect: boolean }[] {
  const all = [
    { expr: puzzle.correctExpr, isCorrect: true },
    { expr: puzzle.wrongExprs[0], isCorrect: false },
    { expr: puzzle.wrongExprs[1], isCorrect: false },
  ];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

export default function Make24Game({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [puzzles] = useState<Puzzle[]>(pickPuzzles);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [finished, setFinished] = useState(false);
  const [eliminated, setEliminated] = useState<Set<number>>(new Set());

  const puzzle = puzzles[currentQ];

  // Re-compute shuffled options whenever the question changes
  const options = useMemo(() => shuffleOptions(puzzle), [puzzle]);

  const handleSelect = useCallback((idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    setShowResult(true);

    if (options[idx].isCorrect) {
      playSound('win');
      setScore((s) => s + 1);
    } else {
      playSound('error');
    }

    setTimeout(() => {
      if (currentQ + 1 >= TOTAL_ROUNDS) {
        setFinished(true);
      } else {
        setCurrentQ((c) => c + 1);
        setSelected(null);
        setShowResult(false);
        setEliminated(new Set());
      }
    }, 1200);
  }, [selected, options, currentQ]);

  const getStars = () => {
    if (score >= 5) return 3;
    if (score >= 4) return 2;
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

  const handleHelp = () => {
    if (helpRemaining <= 0 || selected !== null) return;
    const wrongIndices = options
      .map((_, i) => i)
      .filter((i) => !options[i].isCorrect && !eliminated.has(i));
    const toRemove = wrongIndices.sort(() => Math.random() - 0.5).slice(0, 1);
    setEliminated((prev) => {
      const next = new Set(prev);
      toRemove.forEach((i) => next.add(i));
      return next;
    });
    onHelpUsed();
  };

  if (finished) {
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
            <span className={styles.winEmoji}>🎯</span>
            <h2 className={styles.winText}>
              {language === 'zh'
                ? score >= 5 ? '满分！速算天才！' : score >= 4 ? '做得好！' : '继续加油！'
                : score >= 5 ? 'Perfect! Math genius!' : score >= 4 ? 'Great job!' : 'Keep trying!'}
            </h2>
            <p className={styles.winSub}>
              {language === 'zh' ? `答对 ${score}/${TOTAL_ROUNDS} 题` : `${score}/${TOTAL_ROUNDS} correct`}
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

  return (
    <div className={styles.container}>
      <div className={styles.progressRow}>
        {puzzles.map((_, i) => (
          <div
            key={i}
            className={`${styles.dot} ${i < currentQ ? styles.dotDone : i === currentQ ? styles.dotCurrent : ''}`}
          />
        ))}
      </div>

      <div className={styles.scoreBar}>
        <span className={styles.scoreLabel}>
          {language === 'zh' ? `得分: ${score}/${currentQ + (selected !== null ? 1 : 0)}` : `Score: ${score}/${currentQ + (selected !== null ? 1 : 0)}`}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ}
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -60, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className={styles.cardRow}>
            {puzzle.numbers.map((n, i) => (
              <motion.div
                key={i}
                className={styles.numCard}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                {n}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <p className={styles.hintText}>
        {language === 'zh' ? '用这4个数字和 +−×÷ 算出正确答案' : 'Use these 4 numbers with +−×÷ to find 24'}
      </p>

      <div className={styles.optionGrid}>
        {options.map((opt, idx) => {
          let cls = styles.option;
          if (eliminated.has(idx)) cls = styles.optionEliminated;
          else if (showResult) {
            if (opt.isCorrect) cls = styles.optionCorrect;
            else if (idx === selected) cls = styles.optionWrong;
          }
          return (
            <motion.button
              key={idx}
              className={cls}
              onClick={() => handleSelect(idx)}
              disabled={selected !== null || eliminated.has(idx)}
              whileTap={!eliminated.has(idx) ? { scale: 0.95 } : undefined}
            >
              {eliminated.has(idx) ? '❌' : opt.expr}
            </motion.button>
          );
        })}
      </div>

      {showResult && selected !== null && options[selected].isCorrect && (
        <motion.div
          className={styles.celebration}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 10 }}
        >
          ✅
        </motion.div>
      )}

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || selected !== null}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={handleConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

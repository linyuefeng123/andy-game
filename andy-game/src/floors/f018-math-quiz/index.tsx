import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import styles from './index.module.css';

const FLOOR_NUM = 18;
const TOTAL_QUESTIONS = 10;

interface Question {
  text: string;
  answer: number;
  options: number[];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateQuestion(difficulty: 1 | 2 | 3): Question {
  let text: string;
  let answer: number;

  let opTypes: ('add' | 'sub' | 'mul')[];
  if (difficulty === 1) opTypes = ['add'];
  else if (difficulty === 2) opTypes = ['add', 'sub'];
  else opTypes = ['add', 'sub', 'mul'];

  const op = opTypes[Math.floor(Math.random() * opTypes.length)];

  if (op === 'add') {
    const a = randInt(1, 20);
    const b = randInt(1, 20);
    text = `${a} + ${b}`;
    answer = a + b;
  } else if (op === 'sub') {
    const a = randInt(1, 20);
    const b = randInt(1, a); // ensure non-negative
    text = `${a} - ${b}`;
    answer = a - b;
  } else {
    const a = randInt(1, 5);
    const b = randInt(1, 5);
    text = `${a} × ${b}`;
    answer = a * b;
  }

  // Generate wrong options
  const optionsSet = new Set<number>();
  optionsSet.add(answer);
  while (optionsSet.size < 4) {
    const offset = randInt(1, 5) * (Math.random() < 0.5 ? 1 : -1);
    const wrong = answer + offset;
    if (wrong >= 0 && wrong !== answer) {
      optionsSet.add(wrong);
    }
  }
  const options = [...optionsSet].sort(() => Math.random() - 0.5);

  return { text, answer, options };
}

export default function MathQuizGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);

  const [questions] = useState<Question[]>(() =>
    Array.from({ length: TOTAL_QUESTIONS }, () => generateQuestion(difficulty))
  );
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [finished, setFinished] = useState(false);
  const [eliminated, setEliminated] = useState<Set<number>>(new Set());

  const q = questions[currentQ];

  const handleSelect = useCallback((idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    setShowResult(true);

    if (q.options[idx] === q.answer) {
      playSound('win');
      setScore((s) => s + 1);
    } else {
      playSound('error');
    }

    setTimeout(() => {
      if (currentQ + 1 >= TOTAL_QUESTIONS) {
        setFinished(true);
      } else {
        setCurrentQ((c) => c + 1);
        setSelected(null);
        setShowResult(false);
        setEliminated(new Set());
      }
    }, 1000);
  }, [selected, q, currentQ]);

  const getStars = () => {
    if (score >= 10) return 3;
    if (score >= 8) return 2;
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
    // Eliminate two wrong answers
    const wrongIndices = q.options
      .map((_, i) => i)
      .filter((i) => q.options[i] !== q.answer && !eliminated.has(i));
    const toRemove = wrongIndices.sort(() => Math.random() - 0.5).slice(0, 2);
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
            <span className={styles.winEmoji}>➕</span>
            <h2 className={styles.winText}>
              {language === 'zh'
                ? score >= 10 ? '满分！太棒了！' : score >= 8 ? '做得好！' : '继续加油！'
                : score >= 10 ? 'Perfect score!' : score >= 8 ? 'Great job!' : 'Keep trying!'}
            </h2>
            <p className={styles.winSub}>
              {language === 'zh' ? `答对 ${score}/${TOTAL_QUESTIONS} 题` : `${score}/${TOTAL_QUESTIONS} correct`}
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
        {questions.map((_, i) => (
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
          className={styles.questionArea}
        >
          <div className={styles.questionCard}>
            <span className={styles.questionText}>{q.text} = ?</span>
          </div>

          <div className={styles.optionGrid}>
            {q.options.map((opt, idx) => {
              let cls = styles.option;
              if (eliminated.has(idx)) cls = styles.optionEliminated;
              else if (showResult) {
                if (opt === q.answer) cls = styles.optionCorrect;
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
                  {eliminated.has(idx) ? '❌' : opt}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {showResult && selected !== null && q.options[selected] === q.answer && (
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

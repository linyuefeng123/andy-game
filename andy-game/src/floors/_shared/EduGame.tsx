import { useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import { getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import styles from './EduGame.module.css';

export interface EduQuestion {
  question: string;
  questionSub?: string;
  options: string[];
  correctIndex: number;
  hint?: string;
  visualSlot?: ReactNode;
}

export interface EduGameConfig {
  titleZh: string;
  titleEn: string;
  floorNumber: number;
  questions: EduQuestion[];
  totalRounds?: number;
}

interface EduGameProps extends FloorProps {
  config: EduGameConfig;
}

export default function EduGame({ onExit, onComplete, config, helperChar, helpRemaining, onHelpUsed, onConcede, onClaimWin }: EduGameProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const totalRounds = config.totalRounds ?? config.questions.length;
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [finished, setFinished] = useState(false);
  const [questions] = useState(() => shufflePick(config.questions, totalRounds));
  const [eliminatedOptions, setEliminatedOptions] = useState<Set<number>>(new Set());

  const q = questions[currentRound];

  const handleHelp = () => {
    if (helpRemaining <= 0 || selected !== null) return;
    // Eliminate one wrong answer
    const wrongIndices = q.options
      .map((_, i) => i)
      .filter((i) => i !== q.correctIndex && !eliminatedOptions.has(i));
    if (wrongIndices.length === 0) return;
    const toEliminate = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
    setEliminatedOptions((prev) => new Set(prev).add(toEliminate));
    onHelpUsed();
  };

  const handleSelect = useCallback((idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    setShowResult(true);

    if (idx === q.correctIndex) {
      playSound('win');
      setScore((s) => s + 1);
    } else {
      playSound('error');
    }

    setTimeout(() => {
      if (currentRound + 1 >= questions.length) {
        setFinished(true);
      } else {
        setCurrentRound((r) => r + 1);
        setSelected(null);
        setShowResult(false);
        setEliminatedOptions(new Set());
      }
    }, 1200);
  }, [selected, q, currentRound, questions.length]);

  const getStars = () => {
    const ratio = score / questions.length;
    if (ratio >= 0.9) return 3;
    if (ratio >= 0.6) return 2;
    return 1;
  };

  const handleFinish = () => {
    onComplete(getStars());
    onExit();
  };

  const handleConcede = () => {
    onConcede();
    onComplete(1);
    onExit();
  };

  const handleClaimWin = () => {
    onClaimWin();
    const meta = getFloorMeta(config.floorNumber);
    onComplete(3, meta.reward);
    onExit();
  };

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
          <div className={styles.resultEmoji}>{stars >= 2 ? '🌟' : '💪'}</div>
          <h2 className={styles.resultTitle}>
            {language === 'zh'
              ? stars >= 3 ? '太棒了！' : stars >= 2 ? '做得好！' : '继续加油！'
              : stars >= 3 ? 'Amazing!' : stars >= 2 ? 'Good job!' : 'Keep trying!'}
          </h2>
          <div className={styles.starRow}>
            {[1, 2, 3].map((i) => (
              <span key={i} className={`${styles.star} ${i <= stars ? styles.starActive : styles.starInactive}`}>
                ⭐
              </span>
            ))}
          </div>
          <p className={styles.scoreText}>
            {score} / {questions.length}
          </p>
          <button className={styles.finishButton} onClick={handleFinish}>
            {language === 'zh' ? '🏠 继续冒险' : '🏠 Continue'}
          </button>
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
            className={`${styles.dot} ${i < currentRound ? styles.dotDone : i === currentRound ? styles.dotCurrent : ''}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentRound}
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -60, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={styles.questionArea}
        >
          <div className={styles.questionCard}>
            {q.visualSlot}
            <span className={styles.questionText}>{q.question}</span>
            {q.questionSub && <span className={styles.questionSub}>{q.questionSub}</span>}
          </div>

          <div className={styles.optionGrid}>
            {q.options.map((opt, idx) => {
              let optStyle = styles.option;
              if (eliminatedOptions.has(idx)) optStyle = styles.optionEliminated;
              else if (showResult) {
                if (idx === q.correctIndex) optStyle = styles.optionCorrect;
                else if (idx === selected) optStyle = styles.optionWrong;
              }
              return (
                <motion.button
                  key={idx}
                  className={optStyle}
                  onClick={() => handleSelect(idx)}
                  disabled={selected !== null || eliminatedOptions.has(idx)}
                  whileTap={!eliminatedOptions.has(idx) ? { scale: 0.95 } : undefined}
                >
                  {eliminatedOptions.has(idx) ? '❌' : opt}
                </motion.button>
              );
            })}
          </div>

          {showResult && selected !== q.correctIndex && q.hint && (
            <motion.p
              className={styles.hint}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              💡 {q.hint}
            </motion.p>
          )}
        </motion.div>
      </AnimatePresence>

      {showResult && selected === q.correctIndex && (
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
        <button className={styles.concedeButton} onClick={handleConcede}>
          😊 {language === 'zh' ? '认输' : 'Give up'}
        </button>
        <button className={styles.claimWinButton} onClick={handleClaimWin}>
          🏆 {language === 'zh' ? '认赢' : 'I win!'}
        </button>
      </div>
    </div>
  );
}

function shufflePick<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

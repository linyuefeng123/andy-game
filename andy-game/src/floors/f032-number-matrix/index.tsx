import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 32;

const TOTAL_ROUNDS = 5;
const SHOW_DURATION = 5; // seconds
const HELP_EXTRA_TIME = 3; // seconds

interface RoundData {
  matrix: number[][]; // 3x3
  questionRow: number; // 0-indexed
  questionCol: number; // 0-indexed
  answer: number;
  choices: number[]; // 4 options including correct answer
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateRound(): RoundData {
  // Generate 3x3 matrix with random digits 1-9 (allow repeats for simplicity)
  const matrix: number[][] = [];
  for (let r = 0; r < 3; r++) {
    const row: number[] = [];
    for (let c = 0; c < 3; c++) {
      row.push(Math.floor(Math.random() * 9) + 1);
    }
    matrix.push(row);
  }

  const questionRow = Math.floor(Math.random() * 3);
  const questionCol = Math.floor(Math.random() * 3);
  const answer = matrix[questionRow][questionCol];

  // Generate 3 wrong choices (distinct from answer and each other)
  const wrongSet = new Set<number>();
  while (wrongSet.size < 3) {
    const n = Math.floor(Math.random() * 9) + 1;
    if (n !== answer) wrongSet.add(n);
  }
  const choices = shuffle([answer, ...wrongSet]);

  return { matrix, questionRow, questionCol, answer, choices };
}

type Phase = 'show' | 'question' | 'feedback' | 'result';

export default function NumberMatrix({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [round, setRound] = useState(0);
  const [rounds] = useState<RoundData[]>(() =>
    Array.from({ length: TOTAL_ROUNDS }, () => generateRound())
  );
  const [phase, setPhase] = useState<Phase>('show');
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(SHOW_DURATION);
  const [helpExtended, setHelpExtended] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const currentRound = rounds[round];

  // Countdown during show phase
  useEffect(() => {
    if (phase !== 'show') return;

    const totalSeconds = SHOW_DURATION + (helpExtended ? HELP_EXTRA_TIME : 0);
    setCountdown(totalSeconds);
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    timerRef.current = setTimeout(() => {
      setPhase('question');
    }, totalSeconds * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, round, helpExtended]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChoice = useCallback((choice: number) => {
    if (phase !== 'question' || selectedChoice !== null) return;

    setSelectedChoice(choice);
    const isCorrect = choice === currentRound.answer;
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    }

    setPhase('feedback');

    timerRef.current = setTimeout(() => {
      if (round + 1 >= TOTAL_ROUNDS) {
        setGameOver(true);
      } else {
        setRound(prev => prev + 1);
        setPhase('show');
        setSelectedChoice(null);
        setHelpExtended(false);
      }
    }, 1200);
  }, [phase, selectedChoice, currentRound, round]);

  const handleHelp = useCallback(() => {
    if (helpRemaining <= 0 || phase !== 'show' || helpExtended) return;
    setHelpExtended(true);
    setCountdown(SHOW_DURATION + HELP_EXTRA_TIME);
    onHelpUsed();
  }, [helpRemaining, phase, helpExtended, onHelpUsed]);

  const getStars = useCallback((): number => {
    if (correctCount >= 5) return 3;
    if (correctCount >= 4) return 2;
    return 1;
  }, [correctCount]);

  const handleWin = () => {
    const stars = getStars();
    const reward = { emoji: '🔢', nameZh: '矩阵之眼', nameEn: 'Matrix Eye' };
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
            <span className={styles.winEmoji}>{stars >= 2 ? '🌟' : '💪'}</span>
            <h2 className={styles.winText}>
              {language === 'zh'
                ? stars >= 3 ? '太棒了！' : stars >= 2 ? '做得好！' : '继续加油！'
                : stars >= 3 ? 'Amazing!' : stars >= 2 ? 'Good job!' : 'Keep trying!'}
            </h2>
            <p className={styles.scoreInfo}>
              {language === 'zh'
                ? `答对 ${correctCount}/${TOTAL_ROUNDS}`
                : `${correctCount}/${TOTAL_ROUNDS} correct`}
              {' '}| {'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}
            </p>
            <div className={styles.winButtons}>
              <button className={styles.replayButton} onClick={onReplay}>
                🔄 {language === 'zh' ? '再玩一次！' : 'Play again!'}
              </button>
              <button className={styles.winButton} onClick={handleWin}>
                {stars >= 3
                  ? (language === 'zh' ? '⭐ 继续冒险' : '⭐ Continue')
                  : (language === 'zh' ? '🏠 返回大厅' : '🏠 Back')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const rowLabel = (r: number) => language === 'zh' ? `第${r + 1}行` : `Row ${r + 1}`;
  const colLabel = (c: number) => language === 'zh' ? `第${c + 1}列` : `Col ${c + 1}`;

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

      {/* Phase indicator */}
      <AnimatePresence mode="wait">
        {phase === 'show' && (
          <motion.div
            key="show"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={styles.phaseBanner}
          >
            {language === 'zh' ? '👀 记住每个数字的位置！' : '👀 Memorize each number!'}
            <span className={styles.countdown}>{countdown}s</span>
          </motion.div>
        )}
        {phase === 'question' && (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={styles.phaseBanner}
          >
            {language === 'zh'
              ? `🎯 ${rowLabel(currentRound.questionRow)}${colLabel(currentRound.questionCol)}的数字是？`
              : `🎯 What number at ${rowLabel(currentRound.questionRow)}, ${colLabel(currentRound.questionCol)}?`}
          </motion.div>
        )}
        {phase === 'feedback' && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`${styles.phaseBanner} ${selectedChoice === currentRound.answer ? styles.correctBanner : styles.wrongBanner}`}
          >
            {selectedChoice === currentRound.answer
              ? (language === 'zh' ? '✅ 正确！' : '✅ Correct!')
              : (language === 'zh' ? `❌ 答案是 ${currentRound.answer}` : `❌ It was ${currentRound.answer}`)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Matrix grid */}
      <div className={styles.boardWrapper}>
        <div className={styles.matrixGrid}>
          {currentRound.matrix.map((row, r) =>
            row.map((num, c) => {
              const isQuestionCell = r === currentRound.questionRow && c === currentRound.questionCol;
              const isRevealed = phase === 'show' || (phase === 'feedback' && isQuestionCell);

              return (
                <motion.div
                  key={`${r}-${c}`}
                  className={`${styles.matrixCell} ${isQuestionCell && phase === 'feedback' ? styles.highlightCell : ''} ${isQuestionCell && phase === 'question' ? styles.questionCell : ''}`}
                  layout
                >
                  <AnimatePresence mode="wait">
                    {isRevealed ? (
                      <motion.span
                        key="num"
                        className={styles.cellNumber}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {num}
                      </motion.span>
                    ) : (
                      <motion.span
                        key="hidden"
                        className={styles.cellHidden}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        ?
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Choices (only visible during question phase) */}
      {phase === 'question' && (
        <motion.div
          className={styles.choicesGrid}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {currentRound.choices.map((choice) => (
            <motion.button
              key={choice}
              className={styles.choiceButton}
              onClick={() => handleChoice(choice)}
              whileTap={{ scale: 0.92 }}
            >
              {choice}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Feedback choices (disabled, showing result) */}
      {phase === 'feedback' && (
        <motion.div
          className={styles.choicesGrid}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {currentRound.choices.map((choice) => (
            <button
              key={choice}
              className={`${styles.choiceButton} ${choice === currentRound.answer ? styles.correctChoice : ''} ${choice === selectedChoice && choice !== currentRound.answer ? styles.wrongChoice : ''}`}
              disabled
            >
              {choice}
            </button>
          ))}
        </motion.div>
      )}

      {/* Action buttons */}
      <div className={styles.actionButtons}>
        <button
          className={styles.helpButton}
          onClick={handleHelp}
          disabled={helpRemaining <= 0 || phase !== 'show' || helpExtended}
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

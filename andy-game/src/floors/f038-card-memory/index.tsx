import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import styles from './index.module.css';

const FLOOR_NUM = 38;

const EMOJI_POOL = [
  '🐶','🐱','🐰','🦊','🐻','🐼','🐨','🦁','🐯','🐸',
  '🐵','🦄','🐧','🦋','🌺','🍎','🍊','🌟','🎈','🍕',
];

const TOTAL_ROUNDS = 5;
const CARD_COUNTS = [4, 5, 5, 6, 6];
const SHOW_DURATIONS = [4, 4, 3, 4, 3]; // seconds per round
const HELP_EXTRA_TIME = 3;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateRound(roundNum: number): { cards: string[]; cardCount: number; showDuration: number } {
  const cardCount = CARD_COUNTS[roundNum] ?? CARD_COUNTS[CARD_COUNTS.length - 1];
  const showDuration = SHOW_DURATIONS[roundNum] ?? SHOW_DURATIONS[SHOW_DURATIONS.length - 1];
  const pool = shuffle(EMOJI_POOL);
  const cards = pool.slice(0, cardCount);
  return { cards, cardCount, showDuration };
}

type Phase = 'show' | 'recall' | 'feedback' | 'result';

export default function CardMemory({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [round, setRound] = useState(0);
  const [roundData] = useState(() =>
    Array.from({ length: TOTAL_ROUNDS }, (_, i) => generateRound(i))
  );
  const [phase, setPhase] = useState<Phase>('show');
  const [correctCount, setCorrectCount] = useState(0);
  const [countdown, setCountdown] = useState(roundData[0].showDuration);
  const [helpExtended, setHelpExtended] = useState(false);
  const [helpRevealed, setHelpRevealed] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<number[]>([]); // scrambled indices picked so far
  const [filledPositions, setFilledPositions] = useState<number>(0); // how many positions filled (0..cardCount)
  const [scrambled, setScrambled] = useState<string[]>([]);
  const [feedbackCorrect, setFeedbackCorrect] = useState<boolean | null>(null);
  const [helpRevealIndex, setHelpRevealIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const currentRound = roundData[round];

  // Initialize scrambled list when entering recall phase
  useEffect(() => {
    if (phase === 'recall') {
      setScrambled(shuffle(currentRound.cards));
      setSelectedOrder([]);
      setFilledPositions(0);
    }
  }, [phase, currentRound]);

  // Countdown during show phase
  useEffect(() => {
    if (phase !== 'show') return;

    const duration = currentRound.showDuration + (helpExtended ? HELP_EXTRA_TIME : 0);
    setCountdown(duration);

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    timerRef.current = setTimeout(() => {
      setPhase('recall');
    }, duration * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, round, helpExtended, currentRound]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCardSelect = useCallback((scrambledIndex: number) => {
    if (phase !== 'recall' || feedbackCorrect !== null) return;

    const nextPosition = filledPositions; // which position we're filling (0-indexed)
    const originalEmoji = currentRound.cards[nextPosition];
    const selectedEmoji = scrambled[scrambledIndex];

    const isCorrect = originalEmoji === selectedEmoji;

    if (isCorrect) {
      playSound('click');
      setSelectedOrder((prev) => [...prev, scrambledIndex]);
      setFilledPositions((prev) => prev + 1);
      setCorrectCount((prev) => prev + 1);

      // Check if round is complete
      if (nextPosition + 1 >= currentRound.cardCount) {
        // Round complete - all correct
        setFeedbackCorrect(true);
        playSound('win');
        timerRef.current = setTimeout(() => {
          advanceRound();
        }, 1000);
      }
    } else {
      // Wrong answer - round failed
      playSound('error');
      setFeedbackCorrect(false);
      timerRef.current = setTimeout(() => {
        advanceRound();
      }, 1200);
    }
  }, [phase, selectedOrder, scrambled, currentRound, feedbackCorrect, round]);

  const advanceRound = useCallback(() => {
    if (round + 1 >= TOTAL_ROUNDS) {
      setGameOver(true);
    } else {
      setRound((prev) => prev + 1);
      setPhase('show');
      setSelectedOrder([]);
      setScrambled([]);
      setFilledPositions(0);
      setFeedbackCorrect(null);
      setHelpExtended(false);
      setHelpRevealed(false);
      setHelpRevealIndex(-1);
    }
  }, [round]);

  const handleHelp = useCallback(() => {
    if (helpRemaining <= 0) return;

    if (phase === 'show' && !helpExtended) {
      // Extend viewing time
      setHelpExtended(true);
      onHelpUsed();
      return;
    }

    if (phase === 'recall' && !helpRevealed) {
      // Briefly reveal the next correct card
      const nextPosition = filledPositions;
      if (nextPosition < currentRound.cardCount) {
        const targetEmoji = currentRound.cards[nextPosition];
        // Find this emoji in scrambled
        const idx = scrambled.findIndex((e, i) => e === targetEmoji && !selectedOrder.includes(i));
        if (idx >= 0) {
          setHelpRevealIndex(idx);
          setHelpRevealed(true);
          onHelpUsed();
          setTimeout(() => {
            setHelpRevealIndex(-1);
          }, 1500);
        }
      }
    }
  }, [helpRemaining, phase, helpExtended, helpRevealed, selectedOrder, currentRound, scrambled, onHelpUsed]);

  const getStars = (): number => {
    if (correctCount >= 5) return 3;
    if (correctCount >= 4) return 2;
    return 1;
  };

  const handleWin = () => {
    const stars = getStars();
    const reward = getFloorMeta(FLOOR_NUM).reward;
    onComplete(stars, reward);
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
            <span className={styles.winEmoji}>{stars >= 2 ? '🂠' : '💪'}</span>
            <h2 className={styles.winText}>
              {language === 'zh'
                ? stars >= 3 ? '太棒了！' : stars >= 2 ? '做得好！' : '继续加油！'
                : stars >= 3 ? 'Amazing!' : stars >= 2 ? 'Good job!' : 'Keep trying!'}
            </h2>
            <p className={styles.scoreInfo}>
              {language === 'zh'
                ? `答对 ${correctCount}/${TOTAL_ROUNDS} 轮`
                : `${correctCount}/${TOTAL_ROUNDS} rounds correct`}
              {' | '}{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}
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

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <span className={styles.roundInfo}>
          {language === 'zh'
            ? `🂠 第 ${round + 1}/${TOTAL_ROUNDS} 轮 | 答对 ${correctCount}`
            : `🂠 Round ${round + 1}/${TOTAL_ROUNDS} | ${correctCount} correct`}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'show' && (
          <motion.div
            key="show"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={styles.phaseBanner}
          >
            {language === 'zh' ? '👀 记住卡牌顺序！' : '👀 Memorize the card order!'}
            <span className={styles.countdown}>{countdown}s</span>
          </motion.div>
        )}
        {phase === 'recall' && (
          <motion.div
            key="recall"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`${styles.phaseBanner} ${styles.recallBanner}`}
          >
            {language === 'zh'
              ? `🧠 按顺序点击！(${filledPositions + 1}/${currentRound.cardCount})`
              : `🧠 Click in order! (${filledPositions + 1}/${currentRound.cardCount})`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card row - face up during show, face down during recall */}
      <div className={styles.cardRow}>
        {currentRound.cards.map((emoji, i) => {
          const isFilled = phase === 'recall' && i < filledPositions;
          const isNext = phase === 'recall' && i === filledPositions;

          return (
            <motion.div
              key={i}
              className={`${styles.card} ${isFilled ? styles.cardSelected : ''} ${isNext ? styles.cardNext : ''}`}
              animate={{ rotateY: phase === 'show' ? 0 : 180 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <div className={styles.cardInner}>
                <div className={styles.cardFront}>
                  <span className={styles.cardEmoji}>{emoji}</span>
                </div>
                <div className={styles.cardBack}>
                  <span className={styles.cardBackText}>
                    {isFilled ? '✅' : '🂠'}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedbackCorrect === true && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={styles.feedbackCorrect}
          >
            {language === 'zh' ? '✅ 完美！' : '✅ Perfect!'}
          </motion.div>
        )}
        {feedbackCorrect === false && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={styles.feedbackWrong}
          >
            {language === 'zh' ? '❌ 顺序错了！' : '❌ Wrong order!'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrambled emoji selection in recall phase */}
      {phase === 'recall' && (
        <div className={styles.selectArea}>
          <div className={styles.selectRow}>
            {scrambled.map((emoji, i) => {
              const isUsed = selectedOrder.includes(i);
              const isHint = helpRevealIndex === i;

              return (
                <motion.button
                  key={i}
                  className={`${styles.selectCard} ${isUsed ? styles.selectUsed : ''} ${isHint ? styles.selectHint : ''}`}
                  onClick={() => handleCardSelect(i)}
                  disabled={isUsed || feedbackCorrect !== null}
                  whileTap={!isUsed ? { scale: 0.9 } : undefined}
                  whileHover={!isUsed ? { scale: 1.05 } : undefined}
                >
                  {emoji}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className={styles.actionButtons}>
        <button
          className={styles.helpButton}
          onClick={handleHelp}
          disabled={helpRemaining <= 0 || (phase === 'show' && helpExtended) || (phase === 'recall' && helpRevealed)}
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

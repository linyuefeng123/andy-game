import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import styles from './index.module.css';

function getMaxRange(difficulty: 1 | 2 | 3): number {
  if (difficulty === 1) return 20;
  if (difficulty === 2) return 50;
  return 100;
}

export default function GuessNumberGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(2);
  const maxRange = getMaxRange(difficulty);

  const [target] = useState(() => Math.floor(Math.random() * maxRange) + 1);
  const [feedback, setFeedback] = useState<'low' | 'high' | 'correct' | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [history, setHistory] = useState<{ value: number; result: 'low' | 'high' | 'correct' }[]>([]);
  const [finished, setFinished] = useState(false);
  const [rangeHint, setRangeHint] = useState<{ low: number; high: number } | null>(null);
  const [knownRange, setKnownRange] = useState<{ low: number; high: number }>({ low: 1, high: maxRange });

  const handleGuess = useCallback((num: number) => {
    if (num < 1 || num > maxRange) return;

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    playSound('click');

    let result: 'low' | 'high' | 'correct';
    if (num === target) {
      result = 'correct';
      playSound('win');
    } else if (num < target) {
      result = 'low';
      playSound('error');
      setKnownRange((prev) => ({ low: Math.max(prev.low, num + 1), high: prev.high }));
    } else {
      result = 'high';
      playSound('error');
      setKnownRange((prev) => ({ low: prev.low, high: Math.min(prev.high, num - 1) }));
    }

    setFeedback(result);
    setHistory((h) => [...h, { value: num, result }]);

    if (result === 'correct') {
      setTimeout(() => setFinished(true), 800);
    }
  }, [target, attempts, maxRange]);

  const getStars = () => {
    if (attempts <= 3) return 3;
    if (attempts <= 5) return 2;
    return 1;
  };

  const handleFinish = () => {
    onComplete(getStars());
    onExit();
  };

  const handleConcede = () => {
    onConcede();
    onExit();
  };

  const handleHelp = () => {
    if (helpRemaining <= 0) return;
    const halfRange = Math.max(3, Math.floor(Math.random() * 5) + 3);
    const low = Math.max(1, target - halfRange);
    const high = Math.min(maxRange, target + halfRange);
    setRangeHint({ low, high });
    onHelpUsed();
    setTimeout(() => setRangeHint(null), 4000);
  };

  // Build number line segments
  const numberLine = useMemo(() => {
    const count = maxRange;
    // For ranges > 20, show every Nth number as clickable
    const step = count <= 20 ? 1 : count <= 50 ? 2 : 5;
    const nums: number[] = [];
    for (let i = 1; i <= count; i += step) {
      nums.push(i);
    }
    if (nums[nums.length - 1] !== count) nums.push(count);
    return nums;
  }, [maxRange]);

  // Thermometer: compute distance-based color for last guess
  const getThermometerColor = () => {
    if (history.length === 0) return 'transparent';
    const lastGuess = history[history.length - 1];
    if (lastGuess.result === 'correct') return '#6bcb77';
    const distance = Math.abs(lastGuess.value - target);
    const maxDist = maxRange / 2;
    const ratio = 1 - (distance / maxDist);
    // Red = close, Blue = far
    if (ratio > 0.7) return '#ff6b6b';
    if (ratio > 0.4) return '#ff9f43';
    return '#4d96ff';
  };

  const getThermometerLabel = () => {
    if (history.length === 0) return '';
    const lastGuess = history[history.length - 1];
    if (lastGuess.result === 'correct') return language === 'zh' ? '猜对了！' : 'Correct!';
    const distance = Math.abs(lastGuess.value - target);
    if (distance <= 3) return language === 'zh' ? '非常近！🔥🔥🔥' : 'Very close! 🔥🔥🔥';
    if (distance <= 8) return language === 'zh' ? '很近！🔥🔥' : 'Close! 🔥🔥';
    if (distance <= 15) return language === 'zh' ? '有点近！🔥' : 'Getting warmer! 🔥';
    return language === 'zh' ? '还远呢！❄️' : 'Too far! ❄️';
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
          <div className={styles.resultEmoji}>🌟</div>
          <h2 className={styles.resultTitle}>
            {language === 'zh' ? '猜对了！' : 'You got it!'}
          </h2>
          <p className={styles.resultInfo}>
            {language === 'zh'
              ? `答案是 ${target}，你用了 ${attempts} 次`
              : `Answer was ${target}, you used ${attempts} tries`}
          </p>
          <div className={styles.starRow}>
            {[1, 2, 3].map((i) => (
              <span key={i} className={i <= stars ? styles.starActive : styles.starInactive}>⭐</span>
            ))}
          </div>
          <div className={styles.resultButtons}>
            <button className={styles.replayButton} onClick={onReplay}>
              🔄 再玩一次！
            </button>
            <button className={styles.finishButton} onClick={handleFinish}>
              {language === 'zh' ? '🏠 继续冒险' : '🏠 Continue'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.gameCard}>
        <p className={styles.instruction}>
          {language === 'zh'
            ? `Andy想了一个1~${maxRange}的数字，点数字猜猜看！`
            : `Andy is thinking of a number 1~${maxRange}. Tap to guess!`}
        </p>

        {/* Thermometer indicator */}
        {history.length > 0 && (
          <div className={styles.thermometerArea}>
            <div className={styles.thermometerBar}>
              <div
                className={styles.thermometerFill}
                style={{
                  background: getThermometerColor(),
                  width: `${Math.min(100, (1 - Math.min(1, Math.abs((history[history.length - 1]?.value ?? 1) - target) / (maxRange / 2))) * 100)}%`,
                }}
              />
            </div>
            <span className={styles.thermometerLabel}>{getThermometerLabel()}</span>
          </div>
        )}

        {/* Feedback text */}
        {feedback && feedback !== 'correct' && (
          <motion.div
            key={attempts}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`${styles.feedback} ${feedback === 'low' ? styles.feedbackLow : styles.feedbackHigh}`}
          >
            {feedback === 'low'
              ? language === 'zh' ? '⬆️ 太小了！再大一点' : '⬆️ Too small! Go higher'
              : language === 'zh' ? '⬇️ 太大了！再小一点' : '⬇️ Too big! Go lower'}
          </motion.div>
        )}

        {feedback === 'correct' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={styles.feedbackCorrect}
          >
            {language === 'zh' ? '🎉 猜对了！' : '🎉 Correct!'}
          </motion.div>
        )}
      </div>

      {/* Visual number line */}
      <div className={styles.numberLineArea}>
        <div className={styles.numberLine}>
          {numberLine.map((num) => {
            const guessed = history.find((h) => h.value === num);
            const inRange = num >= knownRange.low && num <= knownRange.high;
            const isLow = guessed?.result === 'low';
            const isHigh = guessed?.result === 'high';
            const isCorrect = guessed?.result === 'correct';

            return (
              <button
                key={num}
                className={`${styles.numButton} ${isLow ? styles.numLow : ''} ${isHigh ? styles.numHigh : ''} ${isCorrect ? styles.numCorrect : ''} ${!inRange && !guessed ? styles.numOutOfRange : ''}`}
                onClick={() => handleGuess(num)}
                disabled={!!guessed || finished || !inRange}
              >
                {num}
              </button>
            );
          })}
        </div>
      </div>

      {history.length > 0 && (
        <div className={styles.history}>
          {history.map((h, i) => (
            <span
              key={i}
              className={`${styles.historyItem} ${h.result === 'low' ? styles.histLow : h.result === 'high' ? styles.histHigh : styles.histCorrect}`}
            >
              {h.value}
            </span>
          ))}
        </div>
      )}

      <p className={styles.attempts}>
        {language === 'zh' ? `已猜 ${attempts} 次` : `${attempts} tries`}
      </p>

      {rangeHint && (
        <motion.div
          className={styles.rangeHint}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          💡 {language === 'zh' ? `答案在 ${rangeHint.low} ~ ${rangeHint.high} 之间！` : `Answer is between ${rangeHint.low} ~ ${rangeHint.high}!`}
        </motion.div>
      )}

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={handleConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

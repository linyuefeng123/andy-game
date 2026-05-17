import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import { getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import styles from './index.module.css';

export default function GuessNumberGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onClaimWin }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const [target] = useState(() => Math.floor(Math.random() * 50) + 1);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState<'low' | 'high' | 'correct' | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [history, setHistory] = useState<{ value: number; result: 'low' | 'high' | 'correct' }[]>([]);
  const [finished, setFinished] = useState(false);
  const [rangeHint, setRangeHint] = useState<{ low: number; high: number } | null>(null);

  const handleGuess = useCallback(() => {
    const num = parseInt(guess, 10);
    if (isNaN(num) || num < 1 || num > 50) return;

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
    } else {
      result = 'high';
      playSound('error');
    }

    setFeedback(result);
    setHistory((h) => [...h, { value: num, result }]);

    if (result === 'correct') {
      setTimeout(() => setFinished(true), 800);
    } else {
      setGuess('');
    }
  }, [guess, target, attempts]);

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
    onComplete(1);
    onExit();
  };

  const handleClaimWin = () => {
    onClaimWin();
    const meta = getFloorMeta(2);
    onComplete(3, meta.reward);
    onExit();
  };

  const handleHelp = () => {
    if (helpRemaining <= 0) return;
    // Narrow down the range around the target
    const halfRange = Math.max(3, Math.floor(Math.random() * 5) + 3);
    const low = Math.max(1, target - halfRange);
    const high = Math.min(50, target + halfRange);
    setRangeHint({ low, high });
    onHelpUsed();
    setTimeout(() => setRangeHint(null), 4000);
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
          <button className={styles.finishButton} onClick={handleFinish}>
            {language === 'zh' ? '🏠 继续冒险' : '🏠 Continue'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.gameCard}>
        <p className={styles.instruction}>
          {language === 'zh'
            ? 'Andy想了一个1~50的数字，猜猜看！'
            : 'Andy is thinking of a number 1~50. Guess it!'}
        </p>

        <div className={styles.inputRow}>
          <input
            type="number"
            min={1}
            max={50}
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGuess()}
            className={styles.input}
            placeholder="?"
            autoFocus
          />
          <button className={styles.guessButton} onClick={handleGuess} disabled={!guess}>
            {language === 'zh' ? '猜！' : 'Go!'}
          </button>
        </div>

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

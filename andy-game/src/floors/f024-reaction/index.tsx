import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 24;
const TOTAL_ROUNDS = 5;
const MIN_DELAY = 2000;
const MAX_DELAY = 5000;

type Phase = 'intro' | 'waiting' | 'ready' | 'clicked' | 'tooEarly' | 'result' | 'finished';

function getThresholds(difficulty: 1 | 2 | 3): { three: number; two: number } {
  if (difficulty === 1) return { three: 400, two: 600 };
  if (difficulty === 2) return { three: 300, two: 500 };
  return { three: 250, two: 400 };
}

export default function ReactionTestGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);
  const thresholds = getThresholds(difficulty);

  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [lastTime, setLastTime] = useState<number | null>(null);
  const [avgTime, setAvgTime] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRound = useCallback(() => {
    setPhase('waiting');
    setLastTime(null);
    const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
    timerRef.current = setTimeout(() => {
      setPhase('ready');
      startTimeRef.current = Date.now();
    }, delay);
  }, []);

  const handleTap = useCallback(() => {
    if (phase === 'waiting') {
      // Too early!
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhase('tooEarly');
      setTimeout(() => {
        if (round < TOTAL_ROUNDS) {
          startRound();
        }
      }, 1500);
      return;
    }

    if (phase === 'ready') {
      const reactionTime = Date.now() - startTimeRef.current;
      const newTimes = [...times, reactionTime];
      setTimes(newTimes);
      setLastTime(reactionTime);
      const newRound = round + 1;
      setRound(newRound);

      if (newRound >= TOTAL_ROUNDS) {
        const avg = Math.round(newTimes.reduce((a, b) => a + b, 0) / newTimes.length);
        setAvgTime(avg);
        setPhase('finished');
      } else {
        setPhase('result');
        setTimeout(() => {
          startRound();
        }, 1500);
      }
      return;
    }
  }, [phase, round, times, startRound]);

  const getStars = () => {
    if (avgTime === null) return 1;
    if (avgTime < thresholds.three) return 3;
    if (avgTime < thresholds.two) return 2;
    return 1;
  };

  const handleWin = () => {
    onComplete(getStars(), getFloorMeta(FLOOR_NUM).reward);
    onExit();
  };

  const handleConcede = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onConcede();
    onExit();
  };

  const handleHelp = () => {
    if (helpRemaining <= 0) return;
    // Help doesn't really make sense for reaction, but we allow it for consistency
    // It just skips to the next round
    onHelpUsed();
  };

  if (phase === 'intro') {
    return (
      <div className={styles.container}>
        <motion.div
          className={styles.introCard}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <div className={styles.introEmoji}>⚡</div>
          <h2 className={styles.introTitle}>
            {language === 'zh' ? '反应测试' : 'Reaction Test'}
          </h2>
          <p className={styles.introDesc}>
            {language === 'zh'
              ? '看到红色圆圈时等待，变绿时立刻点击！不要点太早哦！'
              : 'Wait for the red circle, tap as fast as you can when it turns green! Don\'t tap too early!'}
          </p>
          <p className={styles.roundInfo}>
            {language === 'zh' ? `共 ${TOTAL_ROUNDS} 轮` : `${TOTAL_ROUNDS} rounds`}
          </p>
          <button className={styles.startButton} onClick={startRound}>
            {language === 'zh' ? '开始！' : 'Start!'}
          </button>
        </motion.div>
      </div>
    );
  }

  if (phase === 'finished') {
    const stars = getStars();
    return (
      <div className={styles.container}>
        <motion.div
          className={styles.resultCard}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <div className={styles.resultEmoji}>⚡</div>
          <h2 className={styles.resultTitle}>
            {language === 'zh' ? '测试完成！' : 'Test Complete!'}
          </h2>
          <p className={styles.avgTime}>
            {language === 'zh'
              ? `平均反应时间: ${avgTime}ms`
              : `Average reaction: ${avgTime}ms`}
          </p>
          <div className={styles.timesList}>
            {times.map((t, i) => (
              <span
                key={i}
                className={`${styles.timeBadge} ${t < thresholds.three ? styles.timeGold : t < thresholds.two ? styles.timeSilver : styles.timeBronze}`}
              >
                {t}ms
              </span>
            ))}
          </div>
          <div className={styles.starRow}>
            {[1, 2, 3].map((i) => (
              <span key={i} className={i <= stars ? styles.starActive : styles.starInactive}>⭐</span>
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
          {language === 'zh' ? `第 ${round + 1}/${TOTAL_ROUNDS} 轮` : `Round ${round + 1}/${TOTAL_ROUNDS}`}
        </span>
        {times.length > 0 && (
          <span className={styles.avgText}>
            {language === 'zh'
              ? `均: ${Math.round(times.reduce((a, b) => a + b, 0) / times.length)}ms`
              : `Avg: ${Math.round(times.reduce((a, b) => a + b, 0) / times.length)}ms`}
          </span>
        )}
      </div>

      <motion.button
        className={`${styles.reactionArea} ${
          phase === 'waiting' ? styles.areaWaiting :
          phase === 'ready' ? styles.areaReady :
          phase === 'tooEarly' ? styles.areaTooEarly :
          styles.areaResult
        }`}
        onClick={handleTap}
        whileTap={{ scale: 0.95 }}
      >
        {phase === 'waiting' && (
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className={styles.areaContent}
          >
            <span className={styles.areaEmoji}>🔴</span>
            <span className={styles.areaLabel}>
              {language === 'zh' ? '等待...' : 'Wait...'}
            </span>
          </motion.div>
        )}

        {phase === 'ready' && (
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            className={styles.areaContent}
          >
            <span className={styles.areaEmoji}>🟢</span>
            <span className={styles.areaLabel}>
              {language === 'zh' ? '点击！' : 'TAP!'}
            </span>
          </motion.div>
        )}

        {phase === 'tooEarly' && (
          <div className={styles.areaContent}>
            <span className={styles.areaEmoji}>❌</span>
            <span className={styles.areaLabel}>
              {language === 'zh' ? '太早了！' : 'Too early!'}
            </span>
          </div>
        )}

        {phase === 'result' && lastTime !== null && (
          <div className={styles.areaContent}>
            <span className={styles.areaEmoji}>⏱️</span>
            <span className={styles.areaLabel}>{lastTime}ms</span>
          </div>
        )}
      </motion.button>

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

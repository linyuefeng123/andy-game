import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import styles from './index.module.css';

const FLOOR_NUM = 15;
const GRID_SIZE = 9; // 3x3

interface MoleState {
  active: boolean;
  whacked: boolean;
}

function getDifficultyParams(difficulty: 1 | 2 | 3) {
  if (difficulty === 1) return { moleDuration: 1200, maxMoles: 1, spawnInterval: 900 };
  if (difficulty === 2) return { moleDuration: 900, maxMoles: 2, spawnInterval: 700 };
  return { moleDuration: 650, maxMoles: 3, spawnInterval: 500 };
}

function getScoreThresholds(difficulty: 1 | 2 | 3) {
  if (difficulty === 1) return { three: 15, two: 10 };
  if (difficulty === 2) return { three: 18, two: 12 };
  return { three: 20, two: 14 };
}

export default function WhackAMoleGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);
  const params = getDifficultyParams(difficulty);
  const thresholds = getScoreThresholds(difficulty);

  const [holes, setHoles] = useState<MoleState[]>(() =>
    Array.from({ length: GRID_SIZE }, () => ({ active: false, whacked: false }))
  );
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [helpHint, setHelpHint] = useState<number | null>(null);

  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moleTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const gameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holesRef = useRef(holes);
  holesRef.current = holes;

  const clearAllTimers = useCallback(() => {
    if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
    moleTimersRef.current.forEach((t) => clearTimeout(t));
    moleTimersRef.current = [];
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
  }, []);

  const spawnMole = useCallback(() => {
    if (gameOver) return;
    const currentHoles = holesRef.current;
    const availableIndices = currentHoles
      .map((h, i) => (!h.active ? i : -1))
      .filter((i) => i !== -1);

    if (availableIndices.length === 0) {
      spawnTimerRef.current = setTimeout(spawnMole, params.spawnInterval);
      return;
    }

    const activeCount = currentHoles.filter((h) => h.active).length;
    const molesToSpawn = Math.min(params.maxMoles - activeCount, availableIndices.length);

    const newHoles = [...currentHoles];
    const shuffled = availableIndices.sort(() => Math.random() - 0.5);

    for (let i = 0; i < molesToSpawn; i++) {
      const idx = shuffled[i];
      newHoles[idx] = { active: true, whacked: false };

      const hideTimer = setTimeout(() => {
        setHoles((prev) => {
          const updated = [...prev];
          if (updated[idx].active && !updated[idx].whacked) {
            updated[idx] = { active: false, whacked: false };
          }
          return updated;
        });
      }, params.moleDuration);
      moleTimersRef.current.push(hideTimer);
    }

    setHoles(newHoles);
    spawnTimerRef.current = setTimeout(spawnMole, params.spawnInterval);
  }, [gameOver, params]);

  const startGame = useCallback(() => {
    setGameStarted(true);
    setScore(0);
    setTimeLeft(30);
    setGameOver(false);
    setHoles(Array.from({ length: GRID_SIZE }, () => ({ active: false, whacked: false })));

    gameTimerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (gameTimerRef.current) clearInterval(gameTimerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    spawnTimerRef.current = setTimeout(spawnMole, 500);
  }, [spawnMole]);

  useEffect(() => {
    if (timeLeft === 0 && gameStarted) {
      setGameOver(true);
      clearAllTimers();
    }
  }, [timeLeft, gameStarted, clearAllTimers]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const handleWhack = useCallback((index: number) => {
    if (!gameStarted || gameOver) return;
    setHoles((prev) => {
      const updated = [...prev];
      if (updated[index].active && !updated[index].whacked) {
        updated[index] = { active: true, whacked: true };
        setScore((s) => s + 1);
        playSound('ding');

        setTimeout(() => {
          setHoles((p) => {
            const u = [...p];
            u[index] = { active: false, whacked: false };
            return u;
          });
        }, 300);
      }
      return updated;
    });
  }, [gameStarted, gameOver]);

  const handleHelp = () => {
    if (helpRemaining <= 0 || gameOver) return;
    const activeIndices = holes
      .map((h, i) => (h.active && !h.whacked ? i : -1))
      .filter((i) => i !== -1);
    if (activeIndices.length > 0) {
      setHelpHint(activeIndices[0]);
      onHelpUsed();
      setTimeout(() => setHelpHint(null), 1500);
    }
  };

  const getStars = () => {
    if (score >= thresholds.three) return 3;
    if (score >= thresholds.two) return 2;
    return 1;
  };

  const handleWin = () => {
    const stars = getStars();
    const reward = getFloorMeta(FLOOR_NUM).reward;
    onComplete(stars, reward);
    onExit();
  };

  const handleConcede = () => {
    clearAllTimers();
    onConcede();
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
            <span className={styles.winEmoji}>🔨</span>
            <h2 className={styles.winText}>
              {language === 'zh' ? `打了 ${score} 只地鼠！` : `Whacked ${score} moles!`}
            </h2>
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

  if (!gameStarted) {
    return (
      <div className={styles.container}>
        <div className={styles.startCard}>
          <span className={styles.startEmoji}>🐹</span>
          <h2 className={styles.startTitle}>
            {language === 'zh' ? '打地鼠' : 'Whack-a-Mole'}
          </h2>
          <p className={styles.startDesc}>
            {language === 'zh'
              ? '地鼠从洞里探出头，快用手指敲它！30秒内打越多越好！'
              : 'Moles pop out of holes—tap them fast! 30 seconds, get as many as you can!'}
          </p>
          <button className={styles.startButton} onClick={startGame}>
            {language === 'zh' ? '🎮 开始！' : '🎮 Start!'}
          </button>
          <button className={styles.skipLink} onClick={handleConcede}>
            {language === 'zh' ? '跳过这局' : 'Skip'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.gameHeader}>
        <div className={styles.timerArea}>
          <span className={styles.timerEmoji}>⏱️</span>
          <span className={styles.timerText}>{timeLeft}s</span>
        </div>
        <div className={styles.scoreArea}>
          <span className={styles.scoreEmoji}>🐹</span>
          <span className={styles.scoreText}>{score}</span>
        </div>
      </div>

      <div className={styles.grid}>
        {holes.map((hole, idx) => (
          <motion.button
            key={idx}
            className={`${styles.hole} ${hole.active && !hole.whacked ? styles.holeActive : ''} ${hole.whacked ? styles.holeWhacked : ''} ${helpHint === idx ? styles.holeHint : ''}`}
            onClick={() => handleWhack(idx)}
            whileTap={hole.active && !hole.whacked ? { scale: 0.85 } : undefined}
            animate={hole.active && !hole.whacked ? { y: [8, -4, 0] } : hole.whacked ? { scale: [1, 0.7, 0], rotate: [0, 15, -15, 0] } : {}}
            transition={{ duration: 0.25 }}
          >
            <span className={styles.holeBg}>🕳️</span>
            <AnimatePresence>
              {hole.active && !hole.whacked && (
                <motion.span
                  className={styles.mole}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  🐹
                </motion.span>
              )}
              {hole.whacked && (
                <motion.span
                  className={styles.mole}
                  initial={{ scale: 1 }}
                  animate={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  😵
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>

      {helpHint !== null && (
        <motion.p
          className={styles.helpHintText}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {language === 'zh' ? '💡 快敲那只地鼠！' : '💡 Whack that mole!'}
        </motion.p>
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

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 35;

const GRID_SIZE = 5;

interface Point {
  row: number;
  col: number;
}

// Generate a random path through the grid visiting `length` unique dots
function generatePath(length: number): Point[] {
  const visited = new Set<string>();
  const path: Point[] = [];

  // Pick a random start
  let cur: Point = {
    row: Math.floor(Math.random() * GRID_SIZE),
    col: Math.floor(Math.random() * GRID_SIZE),
  };
  path.push(cur);
  visited.add(`${cur.row},${cur.col}`);

  const dirs = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [-1, 1], [1, -1], [1, 1],
  ];

  while (path.length < length) {
    // Shuffle directions
    const shuffled = [...dirs].sort(() => Math.random() - 0.5);
    let moved = false;
    for (const [dr, dc] of shuffled) {
      const nr = cur.row + dr;
      const nc = cur.col + dc;
      const key = `${nr},${nc}`;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !visited.has(key)) {
        cur = { row: nr, col: nc };
        path.push(cur);
        visited.add(key);
        moved = true;
        break;
      }
    }
    if (!moved) {
      // Stuck - restart generation
      return generatePath(length);
    }
  }

  return path;
}

function getRoundConfig(round: number): { pathLength: number; showTime: number } {
  if (round === 1) return { pathLength: 5, showTime: 4000 };
  if (round === 2) return { pathLength: 6, showTime: 4000 };
  return { pathLength: 7, showTime: 5000 };
}

const REWARD = {
  emoji: '🗺️',
  nameZh: '追踪之眼',
  nameEn: 'Path Tracker',
  descriptionZh: '路径全记住了！',
  descriptionEn: 'All paths remembered!',
};

export default function PathTracing({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [round, setRound] = useState(1);
  const totalRounds = 3;
  const [perfectRounds, setPerfectRounds] = useState(0);

  // Phase: 'show' | 'trace' | 'roundResult' | 'gameOver'
  const [phase, setPhase] = useState<'show' | 'trace' | 'roundResult' | 'gameOver'>('show');

  const [path, setPath] = useState<Point[]>(() => generatePath(getRoundConfig(1).pathLength));
  const [playerPath, setPlayerPath] = useState<number[]>([]); // indices into path
  const [showPathIndex, setShowPathIndex] = useState(0); // animation index
  const [roundWon, setRoundWon] = useState(false);
  const [helpShown, setHelpShown] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const animRef = useRef<ReturnType<typeof setInterval>>();

  // Animate path drawing during 'show' phase
  useEffect(() => {
    if (phase !== 'show') return;

    setShowPathIndex(0);
    const config = getRoundConfig(round);

    // Animate revealing one dot at a time
    let idx = 0;
    animRef.current = setInterval(() => {
      idx++;
      if (idx >= path.length) {
        if (animRef.current) clearInterval(animRef.current);
        // Show the full path for a moment, then switch to trace phase
        timerRef.current = setTimeout(() => {
          setPhase('trace');
          setPlayerPath([]);
        }, 1200);
      }
      setShowPathIndex(idx);
    }, config.showTime / path.length);

    return () => {
      if (animRef.current) clearInterval(animRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, round, path.length]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (animRef.current) clearInterval(animRef.current);
    };
  }, []);

  const handleDotClick = useCallback((row: number, col: number) => {
    if (phase !== 'trace') return;

    const nextIndex = playerPath.length;
    if (nextIndex >= path.length) return;

    const expected = path[nextIndex];
    if (row === expected.row && col === expected.col) {
      const newPath = [...playerPath, nextIndex];
      setPlayerPath(newPath);

      if (newPath.length === path.length) {
        // Round complete - perfect!
        setRoundWon(true);
        setPerfectRounds(p => p + 1);
        if (round >= totalRounds) {
          timerRef.current = setTimeout(() => setPhase('gameOver'), 800);
        } else {
          timerRef.current = setTimeout(() => setPhase('roundResult'), 800);
        }
      }
    } else {
      // Wrong dot - round failed
      setRoundWon(false);
      if (round >= totalRounds) {
        timerRef.current = setTimeout(() => setPhase('gameOver'), 800);
      } else {
        timerRef.current = setTimeout(() => setPhase('roundResult'), 800);
      }
    }
  }, [phase, playerPath, path, round, totalRounds]);

  const handleNextRound = () => {
    const nextRound = round + 1;
    setRound(nextRound);
    const config = getRoundConfig(nextRound);
    setPath(generatePath(config.pathLength));
    setPlayerPath([]);
    setPhase('show');
    setHelpShown(false);
  };

  const handleHelp = () => {
    if (helpRemaining <= 0 || phase !== 'trace' || helpShown) return;
    setHelpShown(true);
    onHelpUsed();
    // Show the path briefly
    setPhase('show');
    setShowPathIndex(path.length);
    timerRef.current = setTimeout(() => {
      setPhase('trace');
    }, 2000);
  };

  const getStars = useCallback((): number => {
    if (perfectRounds >= 3) return 3;
    if (perfectRounds >= 2) return 2;
    return 1;
  }, [perfectRounds]);

  const handleWin = () => {
    const stars = getStars();
    onComplete(stars, REWARD);
    onExit();
  };

  // Dot state for rendering
  const getDotState = (row: number, col: number): 'default' | 'pathShown' | 'pathNext' | 'playerVisited' | 'wrong' => {
    if (phase === 'show' || helpShown && phase === 'show') {
      // During show, highlight dots that are part of the path up to showPathIndex
      const idx = path.findIndex(p => p.row === row && p.col === col);
      if (idx >= 0 && idx <= showPathIndex) return 'pathShown';
      return 'default';
    }
    if (phase === 'trace' || phase === 'roundResult' || phase === 'gameOver') {
      // Player visited dots
      const playerIdx = playerPath.findIndex(pi => path[pi].row === row && path[pi].col === col);
      if (playerIdx >= 0) return 'playerVisited';

      // Next expected dot
      if (phase === 'trace' && playerPath.length < path.length) {
        const next = path[playerPath.length];
        if (next.row === row && next.col === col) return 'pathNext';
      }

      // Show remaining path dots faintly during roundResult/gameOver
      const pathIdx = path.findIndex(p => p.row === row && p.col === col);
      if (pathIdx >= 0 && (phase === 'roundResult' || phase === 'gameOver')) return 'pathShown';

      return 'default';
    }
    return 'default';
  };

  if (phase === 'gameOver') {
    const stars = getStars();
    return (
      <div className={styles.container}>
        <motion.div className={styles.winOverlay} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
          <div className={styles.winContent}>
            <span className={styles.winEmoji}>{perfectRounds >= 3 ? '🌟' : '💪'}</span>
            <h2 className={styles.winText}>{perfectRounds >= 3 ? (language === 'zh' ? '你真棒！' : 'Perfect!') : (language === 'zh' ? '再接再厉！' : 'Good try!')}</h2>
            <p className={styles.scoreInfo}>
              {language === 'zh' ? `完美回合 ${perfectRounds}/${totalRounds}` : `Perfect rounds ${perfectRounds}/${totalRounds}`} | {'⭐'.repeat(stars)}
            </p>
            <div className={styles.winButtons}>
              <button className={styles.replayButton} onClick={onReplay}>🔄 {language === 'zh' ? '再玩一次！' : 'Play again!'}</button>
              <button className={styles.winButton} onClick={handleWin}>⭐ {language === 'zh' ? '继续冒险' : 'Continue'}</button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (phase === 'roundResult') {
    return (
      <div className={styles.container}>
        <motion.div className={styles.roundResultPanel} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
          <span className={styles.resultEmoji}>{roundWon ? '✅' : '❌'}</span>
          <h2 className={styles.resultText}>
            {roundWon
              ? (language === 'zh' ? '完美！' : 'Perfect!')
              : (language === 'zh' ? '记错了！' : 'Wrong!')}
          </h2>
          <p className={styles.resultSub}>
            {language === 'zh' ? `第 ${round} / ${totalRounds} 回合` : `Round ${round} / ${totalRounds}`}
          </p>
          <button className={styles.nextButton} onClick={handleNextRound}>
            {language === 'zh' ? '下一回合 →' : 'Next round →'}
          </button>
        </motion.div>
      </div>
    );
  }

  const phaseText = phase === 'show'
    ? (language === 'zh' ? '👀 记住路径！' : '👀 Remember the path!')
    : (language === 'zh' ? '👆 按顺序点击！' : '👆 Click in order!');

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <span className={styles.turnInfo}>
          {language === 'zh' ? `🧭 第 ${round}/${totalRounds} 回合` : `🧭 Round ${round}/${totalRounds}`}
        </span>
        <span className={styles.phaseInfo}>{phaseText}</span>
        {phase === 'trace' && (
          <span className={styles.progressInfo}>
            {language === 'zh' ? `已点击 ${playerPath.length}/${path.length}` : `Clicked ${playerPath.length}/${path.length}`}
          </span>
        )}
      </div>

      <div className={styles.boardWrapper}>
        <svg className={styles.pathSvg} viewBox="0 0 250 250">
          {/* Draw the animated path lines */}
          {(phase === 'show' || (phase !== 'trace') || (phase === 'roundResult' || phase === 'gameOver')) && (
            <>
              {path.slice(0, phase === 'show' ? showPathIndex : path.length).map((_, i) => {
                if (i === 0) return null;
                const from = path[i - 1];
                const to = path[i];
                const x1 = from.col * 50 + 25;
                const y1 = from.row * 50 + 25;
                const x2 = to.col * 50 + 25;
                const y2 = to.row * 50 + 25;
                const isPlayerSegment = phase === 'trace' && i <= playerPath.length;
                return (
                  <motion.line
                    key={`line-${i}`}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={isPlayerSegment ? '#ffd93d' : (phase === 'show' ? '#4d96ff' : 'rgba(255,255,255,0.15)')}
                    strokeWidth={3}
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                );
              })}
            </>
          )}
          {/* Player-traced lines */}
          {phase === 'trace' && playerPath.length > 1 && (
            <>
              {playerPath.slice(1).map((pi, i) => {
                const from = path[playerPath[i]];
                const to = path[pi];
                return (
                  <motion.line
                    key={`pline-${i}`}
                    x1={from.col * 50 + 25} y1={from.row * 50 + 25}
                    x2={to.col * 50 + 25} y2={to.row * 50 + 25}
                    stroke="#ffd93d"
                    strokeWidth={3}
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                );
              })}
            </>
          )}
        </svg>

        <div className={styles.grid}>
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
            const row = Math.floor(idx / GRID_SIZE);
            const col = idx % GRID_SIZE;
            const state = getDotState(row, col);
            const pathIndex = path.findIndex(p => p.row === row && p.col === col);
            return (
              <motion.button
                key={idx}
                className={`${styles.dot} ${styles[`dot_${state}`]}`}
                onClick={() => handleDotClick(row, col)}
                disabled={phase !== 'trace'}
                whileTap={phase === 'trace' ? { scale: 0.85 } : {}}
                animate={
                  state === 'pathShown' ? { scale: [1, 1.3, 1] } :
                  state === 'pathNext' ? { scale: [1, 1.2, 1] } :
                  state === 'playerVisited' ? { scale: 1.1 } :
                  {}
                }
                transition={
                  state === 'pathShown' || state === 'pathNext'
                    ? { repeat: Infinity, duration: 1 }
                    : { duration: 0.2 }
                }
              >
                {state === 'playerVisited' && (
                  <span className={styles.dotNumber}>{playerPath.findIndex(pi => path[pi].row === row && path[pi].col === col) + 1}</span>
                )}
                {state === 'pathShown' && pathIndex >= 0 && phase === 'show' && (
                  <span className={styles.dotNumberSmall}>{pathIndex + 1}</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || phase !== 'trace' || helpShown}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={onConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

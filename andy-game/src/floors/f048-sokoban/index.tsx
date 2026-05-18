import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 48;
const SIZE = 6;

// Cell types: 0=floor, 1=wall, 2=target
// Boxes and player tracked separately
interface Level {
  walls: number[][];   // 6x6 grid: 0=floor, 1=wall, 2=target
  boxes: [number, number][];
  player: [number, number];
  optimal: number;
}

const LEVELS: Level[] = [
  // Level 1: Easy - 2 boxes
  {
    optimal: 12,
    walls: [
      [1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1],
    ],
    boxes: [[2, 2], [3, 3]],
    player: [4, 4],
  },
  // Level 2: Medium - 3 boxes with obstacles
  {
    optimal: 24,
    walls: [
      [1, 1, 1, 1, 1, 1],
      [1, 0, 0, 2, 0, 1],
      [1, 0, 1, 0, 0, 1],
      [1, 0, 2, 0, 0, 1],
      [1, 0, 0, 0, 2, 1],
      [1, 1, 1, 1, 1, 1],
    ],
    boxes: [[1, 1], [2, 3], [4, 1]],
    player: [4, 4],
  },
  // Level 3: Hard - 4 boxes, tighter spaces
  {
    optimal: 38,
    walls: [
      [1, 1, 1, 1, 1, 1],
      [1, 0, 0, 2, 0, 1],
      [1, 0, 1, 0, 2, 1],
      [1, 2, 0, 1, 0, 1],
      [1, 0, 0, 0, 2, 1],
      [1, 1, 1, 1, 1, 1],
    ],
    boxes: [[1, 1], [1, 3], [3, 4], [4, 2]],
    player: [4, 1],
  },
];

// Mark target positions in the walls grid
function getTargets(walls: number[][]): [number, number][] {
  const targets: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (walls[r][c] === 2) targets.push([r, c]);
    }
  }
  return targets;
}

function isWall(walls: number[][], r: number, c: number): boolean {
  if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return true;
  return walls[r][c] === 1;
}

function isSolved(boxes: [number, number][], walls: number[][]): boolean {
  const targets = getTargets(walls);
  return targets.every(([tr, tc]) => boxes.some(([br, bc]) => br === tr && bc === tc));
}

export default function SokobanGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);
  const levelIdx = Math.min(difficulty - 1, LEVELS.length - 1);
  const level = LEVELS[levelIdx];

  const [player, setPlayer] = useState<[number, number]>(() => [...level.player] as [number, number]);
  const [boxes, setBoxes] = useState<[number, number][]>(() => level.boxes.map((b) => [...b] as [number, number]));
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<{ player: [number, number]; boxes: [number, number][] }[]>([]);
  const [won, setWon] = useState(false);
  const [hintDir, setHintDir] = useState<[number, number] | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (moves > 0 && isSolved(boxes, level.walls)) {
      setWon(true);
    }
  }, [boxes, level.walls, moves]);

  const tryMove = useCallback((dr: number, dc: number) => {
    if (won) return;
    const newR = player[0] + dr;
    const newC = player[1] + dc;

    if (isWall(level.walls, newR, newC)) return;

    // Check if pushing a box
    const boxIdx = boxes.findIndex(([br, bc]) => br === newR && bc === newC);
    if (boxIdx !== -1) {
      const boxNewR = newR + dr;
      const boxNewC = newC + dc;
      // Box can't move into wall or another box
      if (isWall(level.walls, boxNewR, boxNewC)) return;
      if (boxes.some(([br, bc]) => br === boxNewR && bc === boxNewC)) return;

      setHistory((h) => [...h, { player: [...player] as [number, number], boxes: boxes.map((b) => [...b] as [number, number]) }]);
      const newBoxes = boxes.map((b, i) =>
        i === boxIdx ? [boxNewR, boxNewC] as [number, number] : [...b] as [number, number]
      );
      setBoxes(newBoxes);
    } else {
      setHistory((h) => [...h, { player: [...player] as [number, number], boxes: boxes.map((b) => [...b] as [number, number]) }]);
    }

    setPlayer([newR, newC]);
    setMoves((m) => m + 1);
    setHintDir(null);
  }, [player, boxes, level.walls, won]);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': e.preventDefault(); tryMove(-1, 0); break;
        case 'ArrowDown': case 's': case 'S': e.preventDefault(); tryMove(1, 0); break;
        case 'ArrowLeft': case 'a': case 'A': e.preventDefault(); tryMove(0, -1); break;
        case 'ArrowRight': case 'd': case 'D': e.preventDefault(); tryMove(0, 1); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [tryMove]);

  // Touch/swipe controls
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    const minSwipe = 30;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > minSwipe) tryMove(0, dx > 0 ? 1 : -1);
    } else {
      if (Math.abs(dy) > minSwipe) tryMove(dy > 0 ? 1 : -1, 0);
    }
    touchStart.current = null;
  }, [tryMove]);

  const handleUndo = useCallback(() => {
    if (history.length === 0 || won) return;
    const prev = history[history.length - 1];
    setPlayer(prev.player);
    setBoxes(prev.boxes);
    setHistory((h) => h.slice(0, -1));
    setMoves((m) => Math.max(0, m - 1));
  }, [history, won]);

  const handleHelp = useCallback(() => {
    if (helpRemaining <= 0 || won) return;
    // Simple hint: try each direction, suggest one that's valid
    const dirs: [number, number, string][] = [[-1, 0, 'up'], [1, 0, 'down'], [0, -1, 'left'], [0, 1, 'right']];
    for (const [dr, dc] of dirs) {
      const nr = player[0] + dr;
      const nc = player[1] + dc;
      if (isWall(level.walls, nr, nc)) continue;
      const boxIdx = boxes.findIndex(([br, bc]) => br === nr && bc === nc);
      if (boxIdx !== -1) {
        const bnr = nr + dr;
        const bnc = nc + dc;
        if (!isWall(level.walls, bnr, bnc) && !boxes.some(([br, bc]) => br === bnr && bc === bnc)) {
          setHintDir([dr, dc]);
          onHelpUsed();
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setHintDir(null), 3000);
          return;
        }
      } else {
        setHintDir([dr, dc]);
        onHelpUsed();
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setHintDir(null), 3000);
        return;
      }
    }
    onHelpUsed();
  }, [player, boxes, level.walls, helpRemaining, onHelpUsed, won]);

  const getStars = () => {
    const opt = level.optimal;
    if (moves <= opt) return 3;
    if (moves <= Math.ceil(opt * 1.5)) return 2;
    return 1;
  };

  const handleWin = () => {
    onComplete(getStars(), getFloorMeta(FLOOR_NUM).reward);
    onExit();
  };

  const handleConcede = () => {
    onConcede();
    onExit();
  };

  const targets = getTargets(level.walls);

  const getCellContent = (r: number, c: number) => {
    if (isWall(level.walls, r, c)) return null;
    if (player[0] === r && player[1] === c) return '🧒';
    const boxIdx = boxes.findIndex(([br, bc]) => br === r && bc === c);
    if (boxIdx !== -1) {
      const onTarget = targets.some(([tr, tc]) => tr === r && tc === c);
      return onTarget ? '✅' : '📦';
    }
    return null;
  };

  const getCellClass = (r: number, c: number) => {
    if (isWall(level.walls, r, c)) return styles.wall;
    if (player[0] === r && player[1] === c) return styles.player;
    const isTarget = level.walls[r][c] === 2;
    const hasBox = boxes.some(([br, bc]) => br === r && bc === c);
    if (hasBox && isTarget) return styles.boxOnTarget;
    if (hasBox) return styles.box;
    if (isTarget) return styles.target;
    return styles.floor;
  };

  const dirArrow = (dr: number, dc: number) => {
    if (dr === -1) return '⬆';
    if (dr === 1) return '⬇';
    if (dc === -1) return '⬅';
    return '➡';
  };

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <span className={styles.moveCount}>
          {language === 'zh' ? `步数: ${moves}` : `Moves: ${moves}`}
        </span>
        <span className={styles.levelLabel}>
          {language === 'zh' ? `难度 ${difficulty}` : `Level ${difficulty}`}
        </span>
      </div>

      <div
        className={styles.boardWrapper}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={styles.board}
          style={{
            gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${SIZE}, 1fr)`,
          }}
        >
          {Array.from({ length: SIZE * SIZE }, (_, idx) => {
            const r = Math.floor(idx / SIZE);
            const c = idx % SIZE;
            return (
              <motion.div
                key={`cell-${r}-${c}`}
                className={`${styles.cell} ${getCellClass(r, c)}`}
                layout={false}
              >
                {getCellContent(r, c)}
              </motion.div>
            );
          })}
        </div>

        {/* Hint arrow overlay */}
        {hintDir && (
          <div className={styles.hintArrow} style={{
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%)`,
          }}>
            {dirArrow(hintDir[0], hintDir[1])}
          </div>
        )}
      </div>

      {/* D-pad for mobile */}
      <div className={styles.dpad}>
        <button className={`${styles.dpadBtn} ${styles.dpadUp}`} onClick={() => tryMove(-1, 0)}>⬆</button>
        <button className={`${styles.dpadBtn} ${styles.dpadLeft}`} onClick={() => tryMove(0, -1)}>⬅</button>
        <button className={`${styles.dpadBtn} ${styles.dpadRight}`} onClick={() => tryMove(0, 1)}>➡</button>
        <button className={`${styles.dpadBtn} ${styles.dpadDown}`} onClick={() => tryMove(1, 0)}>⬇</button>
      </div>

      {!won && (
        <div className={styles.actionButtons}>
          <button className={styles.undoButton} onClick={handleUndo} disabled={history.length === 0}>
            ↩ {language === 'zh' ? '撤销' : 'Undo'}
          </button>
          <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0}>
            {helper.emoji} 💡 {helpRemaining}
          </button>
          <button className={styles.skipLink} onClick={handleConcede}>
            {language === 'zh' ? '跳过这局' : 'Skip'}
          </button>
        </div>
      )}

      <AnimatePresence>
        {won && (
          <motion.div
            className={styles.winOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.winContent}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <span className={styles.winEmoji}>📦</span>
              <h2 className={styles.winText}>
                {language === 'zh' ? '箱子归位！' : 'All Boxes in Place!'}
              </h2>
              <p className={styles.winInfo}>
                {language === 'zh' ? `用了 ${moves} 步` : `${moves} moves`}
              </p>
              <div className={styles.starRow}>
                {[1, 2, 3].map((i) => (
                  <span key={i} className={i <= getStars() ? styles.starActive : styles.starInactive}>⭐</span>
                ))}
              </div>
              <div className={styles.winButtons}>
                <button className={styles.replayButton} onClick={onReplay}>
                  🔄 {language === 'zh' ? '再玩一次！' : 'Replay!'}
                </button>
                <button className={styles.winButton} onClick={handleWin}>
                  ⭐ {language === 'zh' ? '继续冒险' : 'Continue'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 42;
const GRID_SIZE = 6;
const NUM_COLORS = 5;
const GAME_DURATION = 60;

const GEM_EMOJIS = ['🔴', '🟢', '🔵', '🟡', '🟣'];
const GEM_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7'];

type GemColor = 0 | 1 | 2 | 3 | 4;

interface Gem {
  id: number;
  color: GemColor;
  matched: boolean;
}

let nextId = 0;
function createGem(color?: GemColor): Gem {
  return {
    id: nextId++,
    color: color ?? (Math.floor(Math.random() * NUM_COLORS) as GemColor),
    matched: false,
  };
}

function createBoard(): Gem[][] {
  const board: Gem[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row: Gem[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      // Avoid initial matches
      let color: GemColor;
      do {
        color = Math.floor(Math.random() * NUM_COLORS) as GemColor;
      } while (
        (c >= 2 && row[c - 1].color === color && row[c - 2].color === color) ||
        (r >= 2 && board[r - 1][c].color === color && board[r - 2][c].color === color)
      );
      row.push(createGem(color));
    }
    board.push(row);
  }
  return board;
}

function findMatches(board: (Gem | null)[][]): Set<string> {
  const matched = new Set<string>();

  // Horizontal matches
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c <= GRID_SIZE - 3; c++) {
      const a = board[r][c];
      const b = board[r][c + 1];
      const d = board[r][c + 2];
      if (a && b && d && a.color === b.color && b.color === d.color) {
        matched.add(`${r},${c}`);
        matched.add(`${r},${c + 1}`);
        matched.add(`${r},${c + 2}`);
      }
    }
  }

  // Vertical matches
  for (let c = 0; c < GRID_SIZE; c++) {
    for (let r = 0; r <= GRID_SIZE - 3; r++) {
      const a = board[r][c];
      const b = board[r + 1][c];
      const d = board[r + 2][c];
      if (a && b && d && a.color === b.color && b.color === d.color) {
        matched.add(`${r},${c}`);
        matched.add(`${r + 1},${c}`);
        matched.add(`${r + 2},${c}`);
      }
    }
  }

  return matched;
}

function hasValidMoves(board: (Gem | null)[][]): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      // Try swap right
      if (c + 1 < GRID_SIZE) {
        const temp = board[r][c];
        board[r][c] = board[r][c + 1];
        board[r][c + 1] = temp;
        if (findMatches(board).size > 0) {
          board[r][c + 1] = board[r][c];
          board[r][c] = temp;
          return true;
        }
        board[r][c] = board[r][c + 1];
        board[r][c + 1] = temp;
      }
      // Try swap down
      if (r + 1 < GRID_SIZE) {
        const temp = board[r][c];
        board[r][c] = board[r + 1][c];
        board[r + 1][c] = temp;
        if (findMatches(board).size > 0) {
          board[r + 1][c] = board[r][c];
          board[r][c] = temp;
          return true;
        }
        board[r][c] = board[r + 1][c];
        board[r + 1][c] = temp;
      }
    }
  }
  return false;
}

export default function MatchThree({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [board, setBoard] = useState<Gem[][]>(createBoard);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameOver, setGameOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [matchedCells, setMatchedCells] = useState<Set<string>>(new Set());
  const [combo, setCombo] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const [helpHint, setHelpHint] = useState<[number, number] | null>(null);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setGameOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const processMatches = useCallback((currentBoard: Gem[][], currentCombo: number) => {
    const workingBoard: (Gem | null)[][] = currentBoard.map((row) => [...row]);
    const matches = findMatches(workingBoard);

    if (matches.size === 0) {
      setProcessing(false);
      setCombo(0);
      // Check if there are valid moves left
      const checkBoard: (Gem | null)[][] = currentBoard.map((row) => [...row]);
      if (!hasValidMoves(checkBoard)) {
        // Reshuffle
        setBoard(createBoard());
      }
      return;
    }

    setMatchedCells(matches);
    setCombo(currentCombo);

    // Calculate score
    let matchScore = 0;
    const matchArr = Array.from(matches);
    // Group into contiguous match lines
    const matchCount = matchArr.length;
    if (matchCount >= 5) matchScore = 50;
    else if (matchCount >= 4) matchScore = 20;
    else matchScore = 10;

    const comboMultiplier = currentCombo > 0 ? currentCombo + 1 : 1;
    setScore((s) => s + matchScore * comboMultiplier);

    // After animation, remove matched gems and drop
    setTimeout(() => {
      setMatchedCells(new Set());

      // Remove matched gems
      for (const key of matches) {
        const [r, c] = key.split(',').map(Number);
        workingBoard[r][c] = null;
      }

      // Drop gems down
      const newBoard: Gem[][] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        const col: (Gem | null)[] = [];
        for (let r = 0; r < GRID_SIZE; r++) {
          col.push(workingBoard[r][c]);
        }
        // Remove nulls from the column
        const remaining = col.filter((g) => g !== null) as Gem[];
        // Fill top with new gems
        const newCount = GRID_SIZE - remaining.length;
        const newGems: Gem[] = [];
        for (let i = 0; i < newCount; i++) {
          newGems.push(createGem());
        }
        const fullCol = [...newGems, ...remaining];
        for (let r = 0; r < GRID_SIZE; r++) {
          if (!newBoard[r]) newBoard[r] = [];
          newBoard[r][c] = fullCol[r];
        }
      }

      setBoard(newBoard);

      // Check for cascading matches
      setTimeout(() => {
        processMatches(newBoard, currentCombo + 1);
      }, 300);
    }, 400);
  }, []);

  const swapGems = useCallback(
    (r1: number, c1: number, r2: number, c2: number) => {
      setProcessing(true);
      const newBoard = board.map((row) => [...row]);
      const temp = newBoard[r1][c1];
      newBoard[r1][c1] = newBoard[r2][c2];
      newBoard[r2][c2] = temp;

      // Check if swap creates a match
      const matches = findMatches(newBoard);
      if (matches.size === 0) {
        // Invalid swap, revert
        setProcessing(false);
        return;
      }

      setBoard(newBoard);
      setTimeout(() => processMatches(newBoard, 0), 200);
    },
    [board, processMatches]
  );

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (gameOver || processing) return;
      setHelpHint(null);

      if (selected === null) {
        setSelected([row, col]);
        return;
      }

      const [sr, sc] = selected;
      if (sr === row && sc === col) {
        setSelected(null);
        return;
      }

      // Check if adjacent
      const isAdjacent =
        (Math.abs(sr - row) === 1 && sc === col) ||
        (Math.abs(sc - col) === 1 && sr === row);

      if (isAdjacent) {
        swapGems(sr, sc, row, col);
        setSelected(null);
      } else {
        setSelected([row, col]);
      }
    },
    [selected, gameOver, processing, swapGems]
  );

  const handleHelp = () => {
    if (helpRemaining <= 0 || gameOver || processing) return;

    // Find a valid move
    const workingBoard: (Gem | null)[][] = board.map((row) => [...row]);
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        // Try swap right
        if (c + 1 < GRID_SIZE) {
          const temp = workingBoard[r][c];
          workingBoard[r][c] = workingBoard[r][c + 1];
          workingBoard[r][c + 1] = temp;
          if (findMatches(workingBoard).size > 0) {
            setHelpHint([r, c]);
            onHelpUsed();
            setTimeout(() => setHelpHint(null), 3000);
            return;
          }
          workingBoard[r][c + 1] = workingBoard[r][c];
          workingBoard[r][c] = temp;
        }
        // Try swap down
        if (r + 1 < GRID_SIZE) {
          const temp = workingBoard[r][c];
          workingBoard[r][c] = workingBoard[r + 1][c];
          workingBoard[r + 1][c] = temp;
          if (findMatches(workingBoard).size > 0) {
            setHelpHint([r, c]);
            onHelpUsed();
            setTimeout(() => setHelpHint(null), 3000);
            return;
          }
          workingBoard[r + 1][c] = workingBoard[r][c];
          workingBoard[r][c] = temp;
        }
      }
    }
  };

  const getStars = useCallback((): number => {
    if (score >= 200) return 3;
    if (score >= 100) return 2;
    if (score >= 50) return 1;
    return 1;
  }, [score]);

  const handleWin = () => {
    onComplete(getStars(), getFloorMeta(FLOOR_NUM).reward);
    onExit();
  };

  const handleConcede = () => {
    onConcede();
    onExit();
  };

  const isSelected = (r: number, c: number) =>
    selected !== null && selected[0] === r && selected[1] === c;

  const isMatched = (r: number, c: number) => matchedCells.has(`${r},${c}`);

  const isHelpHint = (r: number, c: number) =>
    helpHint !== null && helpHint[0] === r && helpHint[1] === c;

  const timePercent = (timeLeft / GAME_DURATION) * 100;

  return (
    <div className={styles.container}>
      <div className={styles.scoreBar}>
        <span className={styles.scoreLabel}>
          {language === 'zh' ? '分数' : 'Score'}: {score}
        </span>
        <div className={styles.timerBar}>
          <div
            className={styles.timerFill}
            style={{ width: `${timePercent}%`, background: timeLeft <= 10 ? '#ef4444' : undefined }}
          />
        </div>
        <span className={styles.timeLabel}>
          ⏱ {timeLeft}s
        </span>
      </div>

      {combo > 0 && (
        <motion.div
          className={styles.comboText}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          key={combo}
        >
          {language === 'zh' ? `连击 x${combo + 1}!` : `Combo x${combo + 1}!`}
        </motion.div>
      )}

      <div className={styles.boardWrapper}>
        <div className={styles.board}>
          {board.map((row, r) =>
            row.map((gem, c) => {
              const sel = isSelected(r, c);
              const matched = isMatched(r, c);
              const hint = isHelpHint(r, c);
              return (
                <button
                  key={`${r}-${c}`}
                  className={`${styles.cell} ${sel ? styles.selectedCell : ''} ${matched ? styles.matchedCell : ''} ${hint ? styles.hintCell : ''}`}
                  onClick={() => handleCellClick(r, c)}
                  disabled={gameOver || processing}
                >
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={gem.id}
                      className={styles.gemEmoji}
                      initial={matched ? { scale: 1 } : { scale: 0, opacity: 0 }}
                      animate={matched ? { scale: 0, opacity: 0, rotate: 180 } : { scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={matched ? { duration: 0.35 } : { type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      {GEM_EMOJIS[gem.color]}
                    </motion.span>
                  </AnimatePresence>
                  {hint && (
                    <motion.div
                      className={styles.hintRing}
                      animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      style={{ borderColor: GEM_COLORS[gem.color] }}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {!gameOver && (
        <div className={styles.actionButtons}>
          <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || gameOver || processing}>
            {helper.emoji} 💡 {helpRemaining}
          </button>
          <button className={styles.skipLink} onClick={handleConcede}>
            {language === 'zh' ? '跳过这局' : 'Skip'}
          </button>
        </div>
      )}

      <AnimatePresence>
        {gameOver && (
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
              <span className={styles.winEmoji}>{score >= 200 ? '🏆' : score >= 100 ? '🌟' : '💎'}</span>
              <h2 className={styles.winText}>
                {language === 'zh' ? '时间到！' : 'Time\'s Up!'}
              </h2>
              <p className={styles.winInfo}>
                {language === 'zh' ? `得分: ${score}` : `Score: ${score}`}
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

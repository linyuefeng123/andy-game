import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 49;
const COLS = 10;
const ROWS = 20;

type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'L' | 'J';

const PIECE_SHAPES: Record<PieceType, number[][][]> = {
  I: [
    [[0,0],[0,1],[0,2],[0,3]],
    [[0,0],[1,0],[2,0],[3,0]],
    [[0,0],[0,1],[0,2],[0,3]],
    [[0,0],[1,0],[2,0],[3,0]],
  ],
  O: [
    [[0,0],[0,1],[1,0],[1,1]],
    [[0,0],[0,1],[1,0],[1,1]],
    [[0,0],[0,1],[1,0],[1,1]],
    [[0,0],[0,1],[1,0],[1,1]],
  ],
  T: [
    [[0,1],[1,0],[1,1],[1,2]],
    [[0,0],[1,0],[1,1],[2,0]],
    [[1,0],[1,1],[1,2],[2,1]],
    [[0,1],[1,0],[1,1],[2,1]],
  ],
  S: [
    [[0,1],[0,2],[1,0],[1,1]],
    [[0,0],[1,0],[1,1],[2,1]],
    [[0,1],[0,2],[1,0],[1,1]],
    [[0,0],[1,0],[1,1],[2,1]],
  ],
  Z: [
    [[0,0],[0,1],[1,1],[1,2]],
    [[0,1],[1,0],[1,1],[2,0]],
    [[0,0],[0,1],[1,1],[1,2]],
    [[0,1],[1,0],[1,1],[2,0]],
  ],
  L: [
    [[0,0],[1,0],[1,1],[1,2]],
    [[0,0],[0,1],[1,0],[2,0]],
    [[1,0],[1,1],[1,2],[2,2]],
    [[0,1],[1,1],[2,0],[2,1]],
  ],
  J: [
    [[0,2],[1,0],[1,1],[1,2]],
    [[0,0],[1,0],[2,0],[2,1]],
    [[1,0],[1,1],[1,2],[2,0]],
    [[0,0],[0,1],[1,0],[2,0]],
  ],
};

const PIECE_COLORS: Record<PieceType, string> = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  L: '#f0a000',
  J: '#0000f0',
};

const PIECE_EMOJIS: Record<PieceType, string> = {
  I: '🟦', O: '🟨', T: '🟪', S: '🟩', Z: '🟥', L: '🟧', J: '🟦',
};

function getDropSpeed(difficulty: 1 | 2 | 3, linesCleared: number): number {
  const base = difficulty === 1 ? 800 : difficulty === 2 ? 600 : 400;
  const speedup = Math.floor(linesCleared / 3) * 50;
  return Math.max(100, base - speedup);
}

function randomPiece(): PieceType {
  const types: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'L', 'J'];
  return types[Math.floor(Math.random() * types.length)];
}

interface ActivePiece {
  type: PieceType;
  rotation: number;
  row: number;
  col: number;
}

function getCells(piece: ActivePiece): [number, number][] {
  const shape = PIECE_SHAPES[piece.type][piece.rotation % PIECE_SHAPES[piece.type].length];
  return shape.map(([r, c]) => [piece.row + r, piece.col + c] as [number, number]);
}

export default function TetrisGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);

  const [board, setBoard] = useState<(PieceType | null)[][]>(
    () => Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );
  const [activePiece, setActivePiece] = useState<ActivePiece | null>(null);
  const [nextType, setNextType] = useState<PieceType>(() => randomPiece());
  const [linesCleared, setLinesCleared] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [clearingRows, setClearingRows] = useState<number[]>([]);
  const [helpUsed, setHelpUsed] = useState(false);

  const boardRef = useRef(board);
  const activePieceRef = useRef(activePiece);
  const linesClearedRef = useRef(linesCleared);
  const runningRef = useRef(false);
  const lastDropRef = useRef(0);
  const animFrameRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { activePieceRef.current = activePiece; }, [activePiece]);
  useEffect(() => { linesClearedRef.current = linesCleared; }, [linesCleared]);

  const CELL_SIZE = 18;

  const collides = useCallback((b: (PieceType | null)[][], piece: ActivePiece): boolean => {
    const cells = getCells(piece);
    for (const [r, c] of cells) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
      if (b[r][c] !== null) return true;
    }
    return false;
  }, []);

  const lockPiece = useCallback((b: (PieceType | null)[][], piece: ActivePiece): { newBoard: (PieceType | null)[][]; cleared: number[] } => {
    const newBoard = b.map(row => [...row]);
    const cells = getCells(piece);
    for (const [r, c] of cells) {
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        newBoard[r][c] = piece.type;
      }
    }
    // Find full rows
    const fullRows: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (newBoard[r].every(cell => cell !== null)) {
        fullRows.push(r);
      }
    }
    return { newBoard, cleared: fullRows };
  }, []);

  const spawnPiece = useCallback((type: PieceType): ActivePiece | null => {
    const piece: ActivePiece = { type, rotation: 0, row: 0, col: Math.floor(COLS / 2) - 1 };
    if (collides(boardRef.current, piece)) return null;
    return piece;
  }, [collides]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = COLS * CELL_SIZE;
    const h = ROWS * CELL_SIZE;

    ctx.fillStyle = '#0a1a2a';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * CELL_SIZE, 0); ctx.lineTo(c * CELL_SIZE, h); ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * CELL_SIZE); ctx.lineTo(w, r * CELL_SIZE); ctx.stroke();
    }

    const currentBoard = boardRef.current;
    // Draw placed blocks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = currentBoard[r][c];
        if (cell) {
          const isClearing = clearingRows.includes(r);
          if (isClearing) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(c * CELL_SIZE + 1, r * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          } else {
            ctx.fillStyle = PIECE_COLORS[cell];
            ctx.fillRect(c * CELL_SIZE + 1, r * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(c * CELL_SIZE + 1, r * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          }
        }
      }
    }

    // Draw ghost piece (shadow of where piece will land)
    const ap = activePieceRef.current;
    if (ap) {
      // Ghost
      let ghostRow = ap.row;
      while (!collides(currentBoard, { ...ap, row: ghostRow + 1 })) {
        ghostRow++;
      }
      if (ghostRow !== ap.row) {
        const ghostCells = getCells({ ...ap, row: ghostRow });
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        for (const [r, c] of ghostCells) {
          if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
            ctx.fillRect(c * CELL_SIZE + 1, r * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          }
        }
      }

      // Active piece
      const cells = getCells(ap);
      ctx.fillStyle = PIECE_COLORS[ap.type];
      for (const [r, c] of cells) {
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
          ctx.fillRect(c * CELL_SIZE + 1, r * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
          ctx.lineWidth = 1;
          ctx.strokeRect(c * CELL_SIZE + 1, r * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
      }
    }
  }, [clearingRows, collides]);

  const doClearRows = useCallback((rows: number[]) => {
    let b = boardRef.current.map(row => [...row]);
    // Remove cleared rows, add empty rows on top
    for (const r of rows.sort((a, b) => b - a)) {
      b.splice(r, 1);
      b.unshift(Array(COLS).fill(null));
    }
    setBoard(b);
    boardRef.current = b;
    setLinesCleared(prev => {
      const next = prev + rows.length;
      linesClearedRef.current = next;
      return next;
    });
    setClearingRows([]);
  }, []);

  const trySpawn = useCallback(() => {
    const piece = spawnPiece(nextType);
    if (!piece) {
      // Game over
      runningRef.current = false;
      setGameOver(true);
      return;
    }
    setActivePiece(piece);
    activePieceRef.current = piece;
    setNextType(randomPiece());
  }, [spawnPiece, nextType]);

  const moveDown = useCallback(() => {
    const ap = activePieceRef.current;
    if (!ap) return;
    const moved = { ...ap, row: ap.row + 1 };
    if (collides(boardRef.current, moved)) {
      // Lock piece
      const { newBoard, cleared } = lockPiece(boardRef.current, ap);
      setBoard(newBoard);
      boardRef.current = newBoard;
      setActivePiece(null);
      activePieceRef.current = null;

      if (cleared.length > 0) {
        setClearingRows(cleared);
        setTimeout(() => doClearRows(cleared), 200);
        setTimeout(() => trySpawn(), 250);
      } else {
        trySpawn();
      }
    } else {
      setActivePiece(moved);
      activePieceRef.current = moved;
    }
  }, [collides, lockPiece, doClearRows, trySpawn]);

  const moveLeft = useCallback(() => {
    const ap = activePieceRef.current;
    if (!ap) return;
    const moved = { ...ap, col: ap.col - 1 };
    if (!collides(boardRef.current, moved)) {
      setActivePiece(moved);
      activePieceRef.current = moved;
    }
  }, [collides]);

  const moveRight = useCallback(() => {
    const ap = activePieceRef.current;
    if (!ap) return;
    const moved = { ...ap, col: ap.col + 1 };
    if (!collides(boardRef.current, moved)) {
      setActivePiece(moved);
      activePieceRef.current = moved;
    }
  }, [collides]);

  const rotate = useCallback(() => {
    const ap = activePieceRef.current;
    if (!ap) return;
    const rotated = { ...ap, rotation: (ap.rotation + 1) % PIECE_SHAPES[ap.type].length };
    if (!collides(boardRef.current, rotated)) {
      setActivePiece(rotated);
      activePieceRef.current = rotated;
      return;
    }
    // Wall kick: try shifting left or right
    for (const offset of [-1, 1, -2, 2]) {
      const kicked = { ...rotated, col: rotated.col + offset };
      if (!collides(boardRef.current, kicked)) {
        setActivePiece(kicked);
        activePieceRef.current = kicked;
        return;
      }
    }
  }, [collides]);

  const hardDrop = useCallback(() => {
    const ap = activePieceRef.current;
    if (!ap) return;
    let row = ap.row;
    while (!collides(boardRef.current, { ...ap, row: row + 1 })) {
      row++;
    }
    const dropped = { ...ap, row };
    const { newBoard, cleared } = lockPiece(boardRef.current, dropped);
    setBoard(newBoard);
    boardRef.current = newBoard;
    setActivePiece(null);
    activePieceRef.current = null;

    if (cleared.length > 0) {
      setClearingRows(cleared);
      setTimeout(() => doClearRows(cleared), 200);
      setTimeout(() => trySpawn(), 250);
    } else {
      trySpawn();
    }
  }, [collides, lockPiece, doClearRows, trySpawn]);

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver) return;
    runningRef.current = true;

    const loop = (timestamp: number) => {
      if (!runningRef.current) return;
      const speed = getDropSpeed(difficulty, linesClearedRef.current);
      if (timestamp - lastDropRef.current >= speed) {
        moveDown();
        lastDropRef.current = timestamp;
      }
      draw();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      runningRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameStarted, gameOver, difficulty, moveDown, draw]);

  // Keyboard
  useEffect(() => {
    if (!gameStarted || gameOver) return;
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); moveLeft(); break;
        case 'ArrowRight': e.preventDefault(); moveRight(); break;
        case 'ArrowUp': e.preventDefault(); rotate(); break;
        case 'ArrowDown': e.preventDefault(); moveDown(); break;
        case ' ': e.preventDefault(); hardDrop(); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameStarted, gameOver, moveLeft, moveRight, rotate, moveDown, hardDrop]);

  const startGame = useCallback(() => {
    const emptyBoard = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    setBoard(emptyBoard);
    boardRef.current = emptyBoard;
    setLinesCleared(0);
    linesClearedRef.current = 0;
    setGameOver(false);
    setClearingRows([]);
    setHelpUsed(false);

    const firstType = randomPiece();
    setNextType(randomPiece());
    const piece = spawnPiece(firstType);
    if (piece) {
      setActivePiece(piece);
      activePieceRef.current = piece;
    }

    lastDropRef.current = 0;
    setGameStarted(true);
  }, [spawnPiece]);

  const getStars = (): number => {
    if (linesCleared >= 10) return 3;
    if (linesCleared >= 5) return 2;
    if (linesCleared >= 2) return 1;
    return 1;
  };

  const handleWin = () => {
    const stars = getStars();
    const reward = getFloorMeta(FLOOR_NUM).reward;
    onComplete(stars, reward);
    onExit();
  };

  const handleConcede = () => {
    runningRef.current = false;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    onConcede();
    onExit();
  };

  const handleHelp = () => {
    if (helpRemaining <= 0 || helpUsed || gameOver) return;
    // Clear bottom two rows as help
    const b = boardRef.current.map(row => [...row]);
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0 && cleared < 2; r--) {
      if (b[r].some(cell => cell !== null)) {
        b[r] = Array(COLS).fill(null);
        cleared++;
      }
    }
    setBoard(b);
    boardRef.current = b;
    setHelpUsed(true);
    onHelpUsed();
  };

  if (gameOver) {
    const stars = getStars();
    return (
      <div className={styles.container}>
        <motion.div className={styles.winOverlay} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
          <div className={styles.winContent}>
            <span className={styles.winEmoji}>{linesCleared >= 5 ? '🟦' : '💪'}</span>
            <h2 className={styles.winText}>
              {linesCleared >= 5
                ? (language === 'zh' ? '方块大师！' : 'Block Master!')
                : (language === 'zh' ? '再接再厉！' : 'Try again!')}
            </h2>
            <p className={styles.scoreInfo}>
              {language === 'zh' ? `消除 ${linesCleared} 行` : `${linesCleared} lines cleared`}
            </p>
            <div className={styles.starRow}>
              {[1, 2, 3].map(i => (
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
          <span className={styles.startEmoji}>🟦</span>
          <h2 className={styles.startTitle}>
            {language === 'zh' ? '俄罗斯方块' : 'Tetris'}
          </h2>
          <p className={styles.startDesc}>
            {language === 'zh'
              ? '方块从天而降，旋转摆放消除整行！方向键移动，↑旋转，空格硬降！'
              : 'Blocks fall from above—rotate and place to clear lines! Arrow keys to move, Up to rotate, Space to drop!'}
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
        <span className={styles.lineCount}>
          {language === 'zh' ? `消除: ${linesCleared} 行` : `Lines: ${linesCleared}`}
        </span>
        <span className={styles.nextPiece}>
          {language === 'zh' ? '下一个:' : 'Next:'} {PIECE_EMOJIS[nextType]}
        </span>
      </div>

      <div className={styles.boardWrapper}>
        <canvas
          ref={canvasRef}
          width={COLS * CELL_SIZE}
          height={ROWS * CELL_SIZE}
          className={styles.canvas}
        />
      </div>

      <div className={styles.controls}>
        <div className={styles.controlRow}>
          <button className={styles.ctrlBtn} onClick={rotate}>🔄</button>
        </div>
        <div className={styles.controlRow}>
          <button className={styles.ctrlBtn} onClick={moveLeft}>⬅️</button>
          <button className={styles.ctrlBtn} onClick={hardDrop}>⬇️</button>
          <button className={styles.ctrlBtn} onClick={moveRight}>➡️</button>
        </div>
      </div>

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || helpUsed || gameOver}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={handleConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

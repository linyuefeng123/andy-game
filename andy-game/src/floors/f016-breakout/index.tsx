import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 16;

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  alive: boolean;
}

function getDifficultyParams(difficulty: 1 | 2 | 3) {
  if (difficulty === 1) return { paddleW: 90, ballSpeed: 3, rows: 3 };
  if (difficulty === 2) return { paddleW: 70, ballSpeed: 4, rows: 4 };
  return { paddleW: 55, ballSpeed: 5, rows: 5 };
}

const BRICK_COLORS = [
  '#ff6b6b', '#ff9f43', '#ffd93d', '#6bcb77', '#4d96ff', '#9b72cf',
];

export default function BreakoutGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);
  const params = getDifficultyParams(difficulty);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef({
    paddleX: 0,
    ballX: 0,
    ballY: 0,
    ballDX: 0,
    ballDY: 0,
    bricks: [] as Brick[],
    totalBricks: 0,
    bricksAlive: 0,
    running: false,
    lost: false,
    won: false,
    animFrameId: 0,
  });

  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [bricksLeft, setBricksLeft] = useState(0);
  const [totalBricks, setTotalBricks] = useState(0);
  const [helpUsed, setHelpUsed] = useState(false);

  const CANVAS_W = 360;
  const CANVAS_H = 480;
  const PADDLE_H = 14;
  const BALL_R = 7;
  const BRICK_H = 18;
  const BRICK_PAD = 4;
  const BRICK_TOP = 40;

  const initBricks = useCallback((rows: number): Brick[] => {
    const cols = 7;
    const brickW = (CANVAS_W - (cols + 1) * BRICK_PAD) / cols;
    const bricks: Brick[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({
          x: BRICK_PAD + c * (brickW + BRICK_PAD),
          y: BRICK_TOP + r * (BRICK_H + BRICK_PAD),
          w: brickW,
          h: BRICK_H,
          color: BRICK_COLORS[r % BRICK_COLORS.length],
          alive: true,
        });
      }
    }
    return bricks;
  }, []);

  const resetBall = useCallback(() => {
    const gs = gameStateRef.current;
    gs.ballX = CANVAS_W / 2;
    gs.ballY = CANVAS_H - 50;
    const angle = -Math.PI / 4 + Math.random() * (-Math.PI / 2);
    gs.ballDX = params.ballSpeed * Math.cos(angle);
    gs.ballDY = -params.ballSpeed;
  }, [params.ballSpeed]);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const gs = gameStateRef.current;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Bricks
    for (const b of gs.bricks) {
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 4);
      ctx.fill();
    }

    // Paddle
    ctx.fillStyle = '#ffd93d';
    ctx.beginPath();
    ctx.roundRect(gs.paddleX - params.paddleW / 2, CANVAS_H - 30, params.paddleW, PADDLE_H, 6);
    ctx.fill();

    // Ball
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(gs.ballX, gs.ballY, BALL_R, 0, Math.PI * 2);
    ctx.fill();
  }, [params.paddleW]);

  const gameLoop = useCallback(() => {
    const gs = gameStateRef.current;
    if (!gs.running) return;

    // Move ball
    gs.ballX += gs.ballDX;
    gs.ballY += gs.ballDY;

    // Wall collisions
    if (gs.ballX - BALL_R <= 0 || gs.ballX + BALL_R >= CANVAS_W) {
      gs.ballDX = -gs.ballDX;
      gs.ballX = Math.max(BALL_R, Math.min(CANVAS_W - BALL_R, gs.ballX));
    }
    if (gs.ballY - BALL_R <= 0) {
      gs.ballDY = -gs.ballDY;
      gs.ballY = BALL_R;
    }

    // Paddle collision
    const paddleLeft = gs.paddleX - params.paddleW / 2;
    const paddleRight = gs.paddleX + params.paddleW / 2;
    const paddleTop = CANVAS_H - 30;
    if (
      gs.ballDY > 0 &&
      gs.ballY + BALL_R >= paddleTop &&
      gs.ballY + BALL_R <= paddleTop + PADDLE_H + 4 &&
      gs.ballX >= paddleLeft &&
      gs.ballX <= paddleRight
    ) {
      gs.ballDY = -Math.abs(gs.ballDY);
      // angle based on hit position
      const hitPos = (gs.ballX - gs.paddleX) / (params.paddleW / 2);
      gs.ballDX = hitPos * params.ballSpeed * 1.2;
      gs.ballY = paddleTop - BALL_R;
    }

    // Ball fell below
    if (gs.ballY - BALL_R > CANVAS_H) {
      gs.lost = true;
      gs.running = false;
      setGameOver(true);
      setWon(false);
      return;
    }

    // Brick collision
    for (const b of gs.bricks) {
      if (!b.alive) continue;
      if (
        gs.ballX + BALL_R > b.x &&
        gs.ballX - BALL_R < b.x + b.w &&
        gs.ballY + BALL_R > b.y &&
        gs.ballY - BALL_R < b.y + b.h
      ) {
        b.alive = false;
        gs.bricksAlive--;
        setBricksLeft(gs.bricksAlive);

        // Determine bounce direction
        const overlapLeft = gs.ballX + BALL_R - b.x;
        const overlapRight = b.x + b.w - (gs.ballX - BALL_R);
        const overlapTop = gs.ballY + BALL_R - b.y;
        const overlapBottom = b.y + b.h - (gs.ballY - BALL_R);
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

        if (minOverlap === overlapTop || minOverlap === overlapBottom) {
          gs.ballDY = -gs.ballDY;
        } else {
          gs.ballDX = -gs.ballDX;
        }
        break;
      }
    }

    // Win check
    if (gs.bricksAlive <= 0) {
      gs.won = true;
      gs.running = false;
      setGameOver(true);
      setWon(true);
      return;
    }

    drawGame();
    gs.animFrameId = requestAnimationFrame(gameLoop);
  }, [drawGame, params.paddleW, params.ballSpeed]);

  const startGame = useCallback(() => {
    const bricks = initBricks(params.rows);
    const gs = gameStateRef.current;
    gs.bricks = bricks;
    gs.totalBricks = bricks.length;
    gs.bricksAlive = bricks.length;
    gs.paddleX = CANVAS_W / 2;
    gs.lost = false;
    gs.won = false;
    gs.running = true;

    setTotalBricks(bricks.length);
    setBricksLeft(bricks.length);
    setGameStarted(true);
    setGameOver(false);
    setWon(false);
    setHelpUsed(false);

    resetBall();
    drawGame();
    gs.animFrameId = requestAnimationFrame(gameLoop);
  }, [initBricks, params.rows, resetBall, drawGame, gameLoop]);

  // Touch / mouse control for paddle
  useEffect(() => {
    if (!gameStarted || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMove = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const x = (clientX - rect.left) * scaleX;
      gameStateRef.current.paddleX = Math.max(
        params.paddleW / 2,
        Math.min(CANVAS_W - params.paddleW / 2, x)
      );
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX);
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('touchmove', onTouchMove);
    };
  }, [gameStarted, gameOver, params.paddleW]);

  // Cleanup animation frame
  useEffect(() => {
    return () => {
      if (gameStateRef.current.animFrameId) {
        cancelAnimationFrame(gameStateRef.current.animFrameId);
      }
    };
  }, []);

  const getStars = () => {
    if (won) return 3;
    const gs = gameStateRef.current;
    const remaining = gs.bricksAlive;
    const total = gs.totalBricks;
    const ratio = remaining / total;
    if (ratio <= 0.3) return 2;
    return 1;
  };

  const handleWin = () => {
    const stars = getStars();
    const reward = getFloorMeta(FLOOR_NUM).reward;
    onComplete(stars, reward);
    onExit();
  };

  const handleConcede = () => {
    gameStateRef.current.running = false;
    if (gameStateRef.current.animFrameId) {
      cancelAnimationFrame(gameStateRef.current.animFrameId);
    }
    onConcede();
    onExit();
  };

  const handleHelp = () => {
    if (helpRemaining <= 0 || helpUsed) return;
    // Slow down the ball as help
    const gs = gameStateRef.current;
    gs.ballDX *= 0.6;
    gs.ballDY *= 0.6;
    setHelpUsed(true);
    onHelpUsed();
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
            <span className={styles.winEmoji}>{won ? '🧱' : '💪'}</span>
            <h2 className={styles.winText}>
              {won
                ? (language === 'zh' ? '砖块全消了！' : 'All bricks destroyed!')
                : (language === 'zh' ? '再接再厉！' : 'Try again!')}
            </h2>
            {!won && (
              <p className={styles.winSub}>
                {language === 'zh'
                  ? `还剩 ${bricksLeft} / ${totalBricks} 块砖`
                  : `${bricksLeft} / ${totalBricks} bricks left`}
              </p>
            )}
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
          <span className={styles.startEmoji}>🧱</span>
          <h2 className={styles.startTitle}>
            {language === 'zh' ? '打砖块' : 'Breakout'}
          </h2>
          <p className={styles.startDesc}>
            {language === 'zh'
              ? '滑动挡板弹球，把所有砖块都打碎！别让球掉下去！'
              : 'Slide the paddle to bounce the ball—destroy all bricks! Don\'t let it fall!'}
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
        <span className={styles.brickCount}>
          🧱 {language === 'zh' ? '剩余' : 'Left'}: {bricksLeft}/{totalBricks}
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className={styles.canvas}
      />

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || helpUsed}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={handleConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

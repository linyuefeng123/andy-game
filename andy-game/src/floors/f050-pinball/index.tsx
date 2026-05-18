import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 50;

const CANVAS_W = 320;
const CANVAS_H = 500;
const BALL_R = 8;
const FLIPPER_LEN = 55;
const FLIPPER_W = 10;
const GRAVITY = 0.15;

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Bumper {
  x: number;
  y: number;
  r: number;
  color: string;
  flash: number;
}

interface FlipperState {
  x: number;
  y: number;
  angle: number;
  targetAngle: number;
  restAngle: number;
  activeAngle: number;
  side: 'left' | 'right';
}

function createBumpers(): Bumper[] {
  return [
    { x: CANVAS_W * 0.25, y: 140, r: 22, color: '#ff6b6b', flash: 0 },
    { x: CANVAS_W * 0.5, y: 100, r: 22, color: '#ffd93d', flash: 0 },
    { x: CANVAS_W * 0.75, y: 140, r: 22, color: '#6bcb77', flash: 0 },
    { x: CANVAS_W * 0.35, y: 220, r: 18, color: '#4d96ff', flash: 0 },
    { x: CANVAS_W * 0.65, y: 220, r: 18, color: '#9b72cf', flash: 0 },
  ];
}

function createFlippers(): { left: FlipperState; right: FlipperState } {
  const flipY = CANVAS_H - 60;
  const gap = 10;
  const cx = CANVAS_W / 2;
  return {
    left: {
      x: cx - gap,
      y: flipY,
      angle: 30 * Math.PI / 180,
      targetAngle: 30 * Math.PI / 180,
      restAngle: 30 * Math.PI / 180,
      activeAngle: -30 * Math.PI / 180,
      side: 'left',
    },
    right: {
      x: cx + gap,
      y: flipY,
      angle: Math.PI - 30 * Math.PI / 180,
      targetAngle: Math.PI - 30 * Math.PI / 180,
      restAngle: Math.PI - 30 * Math.PI / 180,
      activeAngle: Math.PI + 30 * Math.PI / 180,
      side: 'right',
    },
  };
}

export default function PinballGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [ballsLeft, setBallsLeft] = useState(3);
  const [helpUsed, setHelpUsed] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    ball: null as Ball | null,
    bumpers: createBumpers(),
    flippers: createFlippers(),
    leftActive: false,
    rightActive: false,
    running: false,
    animFrameId: 0,
    score: 0,
    ballsLeft: 3,
    launching: false,
    launchPower: 0,
  });

  const scoreRef = useRef(0);
  const ballsLeftRef = useRef(3);

  const resetBall = useCallback(() => {
    const s = stateRef.current;
    s.ball = {
      x: CANVAS_W / 2,
      y: CANVAS_H - 100,
      vx: (Math.random() - 0.5) * 2,
      vy: -3,
    };
    s.launching = false;
    s.launchPower = 0;
  }, []);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = stateRef.current;

    // Background
    ctx.fillStyle = '#1a0f2a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Side walls
    ctx.strokeStyle = '#4d96ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(2, CANVAS_H - 85);
    ctx.lineTo(CANVAS_W / 2 - 45, CANVAS_H - 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(CANVAS_W - 2, 0);
    ctx.lineTo(CANVAS_W - 2, CANVAS_H - 85);
    ctx.lineTo(CANVAS_W / 2 + 45, CANVAS_H - 30);
    ctx.stroke();

    // Bumpers
    for (const b of s.bumpers) {
      const flashIntensity = b.flash > 0 ? b.flash : 0;
      if (flashIntensity > 0) {
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 15 * flashIntensity;
      }
      ctx.fillStyle = flashIntensity > 0 ? '#ffffff' : b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Inner circle
      ctx.fillStyle = flashIntensity > 0 ? b.color : 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flippers
    const drawFlipper = (f: FlipperState) => {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);
      ctx.fillStyle = '#ffd93d';
      ctx.beginPath();
      const endX = f.side === 'left' ? -FLIPPER_LEN : FLIPPER_LEN;
      ctx.roundRect(
        f.side === 'left' ? endX : 0,
        -FLIPPER_W / 2,
        FLIPPER_LEN,
        FLIPPER_W,
        5
      );
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Pivot
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    drawFlipper(s.flippers.left);
    drawFlipper(s.flippers.right);

    // Ball
    if (s.ball) {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Metallic shine
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(s.ball.x - 2, s.ball.y - 2, BALL_R * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // Launch power bar (when launching)
    if (s.launching && s.ball) {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(CANVAS_W - 25, CANVAS_H - 200, 15, 150);
      const fillH = (s.launchPower / 100) * 150;
      const gradient = ctx.createLinearGradient(0, CANVAS_H - 50, 0, CANVAS_H - 200);
      gradient.addColorStop(0, '#ff6b6b');
      gradient.addColorStop(1, '#ffd93d');
      ctx.fillStyle = gradient;
      ctx.fillRect(CANVAS_W - 25, CANVAS_H - 50 - fillH, 15, fillH);
    }
  }, []);

  const gameLoop = useCallback(() => {
    const s = stateRef.current;
    if (!s.running || !s.ball) return;

    // Gravity
    s.ball.vy += GRAVITY;

    // Move
    s.ball.x += s.ball.vx;
    s.ball.y += s.ball.vy;

    // Update flipper angles
    const flipSpeed = 0.15;
    for (const key of ['left', 'right'] as const) {
      const f = s.flippers[key];
      const diff = f.targetAngle - f.angle;
      f.angle += diff * flipSpeed;
    }

    // Wall collisions
    if (s.ball.x - BALL_R <= 4) {
      s.ball.vx = Math.abs(s.ball.vx) * 0.9;
      s.ball.x = BALL_R + 4;
    }
    if (s.ball.x + BALL_R >= CANVAS_W - 4) {
      s.ball.vx = -Math.abs(s.ball.vx) * 0.9;
      s.ball.x = CANVAS_W - BALL_R - 4;
    }
    if (s.ball.y - BALL_R <= 4) {
      s.ball.vy = Math.abs(s.ball.vy) * 0.9;
      s.ball.y = BALL_R + 4;
    }

    // Side wall lines (angled guide walls)
    // Left wall line: from (4, CANVAS_H-85) to (CANVAS_W/2-45, CANVAS_H-30)
    // Right wall line: from (CANVAS_W-4, CANVAS_H-85) to (CANVAS_W/2+45, CANVAS_H-30)
    const checkLineCollision = (x1: number, y1: number, x2: number, y2: number) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / len;
      const ny = dx / len;

      // Distance from ball center to line
      const bx = s.ball!.x - x1;
      const by = s.ball!.y - y1;
      const dist = bx * nx + by * ny;

      if (Math.abs(dist) < BALL_R) {
        // Check if within line segment
        const t = (bx * dx + by * dy) / (len * len);
        if (t >= 0 && t <= 1) {
          const dot = s.ball!.vx * nx + s.ball!.vy * ny;
          if (dot < 0) {
            s.ball!.vx -= 2 * dot * nx * 0.85;
            s.ball!.vy -= 2 * dot * ny * 0.85;
            s.ball!.x += nx * (BALL_R - dist);
            s.ball!.y += ny * (BALL_R - dist);
          }
        }
      }
    };

    checkLineCollision(4, CANVAS_H - 85, CANVAS_W / 2 - 45, CANVAS_H - 30);
    checkLineCollision(CANVAS_W - 4, CANVAS_H - 85, CANVAS_W / 2 + 45, CANVAS_H - 30);

    // Bumper collisions
    for (const b of s.bumpers) {
      const dx = s.ball.x - b.x;
      const dy = s.ball.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < b.r + BALL_R) {
        // Reflect
        const nx = dx / dist;
        const ny = dy / dist;
        const dot = s.ball.vx * nx + s.ball.vy * ny;
        s.ball.vx -= 2 * dot * nx;
        s.ball.vy -= 2 * dot * ny;

        // Add some bounce energy
        s.ball.vx *= 1.1;
        s.ball.vy *= 1.1;

        // Push ball outside bumper
        s.ball.x = b.x + nx * (b.r + BALL_R + 1);
        s.ball.y = b.y + ny * (b.r + BALL_R + 1);

        // Flash effect
        b.flash = 1;

        // Score
        s.score += 10;
        scoreRef.current = s.score;
        setScore(s.score);
      }
    }

    // Decay bumper flash
    for (const b of s.bumpers) {
      if (b.flash > 0) b.flash = Math.max(0, b.flash - 0.05);
    }

    // Flipper collisions
    const checkFlipperCollision = (f: FlipperState) => {
      // Approximate flipper as a line segment from pivot
      const endX = f.x + Math.cos(f.angle) * (f.side === 'left' ? -FLIPPER_LEN : FLIPPER_LEN);
      const endY = f.y + Math.sin(f.angle) * (f.side === 'left' ? -FLIPPER_LEN : FLIPPER_LEN);

      const dx = endX - f.x;
      const dy = endY - f.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return;

      const bx = s.ball!.x - f.x;
      const by = s.ball!.y - f.y;
      const t = Math.max(0, Math.min(1, (bx * dx + by * dy) / (len * len)));
      const closestX = f.x + t * dx;
      const closestY = f.y + t * dy;
      const distX = s.ball!.x - closestX;
      const distY = s.ball!.y - closestY;
      const dist = Math.sqrt(distX * distX + distY * distY);

      if (dist < BALL_R + FLIPPER_W / 2) {
        const nx = distX / dist;
        const ny = distY / dist;
        const dot = s.ball!.vx * nx + s.ball!.vy * ny;

        if (dot < 0) {
          s.ball!.vx -= 2 * dot * nx * 0.8;
          s.ball!.vy -= 2 * dot * ny * 0.8;
        }

        // If flipper is actively moving, add velocity
        const isActive = (f.side === 'left' && s.leftActive) || (f.side === 'right' && s.rightActive);
        if (isActive) {
          s.ball!.vy -= 5;
          s.ball!.vx += (f.side === 'left' ? 2 : -2);
        }

        // Push out
        s.ball!.x = closestX + nx * (BALL_R + FLIPPER_W / 2 + 1);
        s.ball!.y = closestY + ny * (BALL_R + FLIPPER_W / 2 + 1);
      }
    };

    checkFlipperCollision(s.flippers.left);
    checkFlipperCollision(s.flippers.right);

    // Speed cap
    const maxSpeed = 12;
    const speed = Math.sqrt(s.ball.vx * s.ball.vx + s.ball.vy * s.ball.vy);
    if (speed > maxSpeed) {
      s.ball.vx = (s.ball.vx / speed) * maxSpeed;
      s.ball.vy = (s.ball.vy / speed) * maxSpeed;
    }

    // Ball fell out
    if (s.ball.y > CANVAS_H + BALL_R * 2) {
      s.ballsLeft--;
      ballsLeftRef.current = s.ballsLeft;
      setBallsLeft(s.ballsLeft);

      if (s.ballsLeft <= 0) {
        s.running = false;
        setGameOver(true);
        return;
      }

      // Reset ball
      resetBall();
    }

    drawGame();
    s.animFrameId = requestAnimationFrame(gameLoop);
  }, [drawGame, resetBall]);

  const startGame = useCallback(() => {
    const s = stateRef.current;
    s.bumpers = createBumpers();
    s.flippers = createFlippers();
    s.leftActive = false;
    s.rightActive = false;
    s.score = 0;
    s.ballsLeft = 3;
    s.running = true;

    scoreRef.current = 0;
    ballsLeftRef.current = 3;
    setScore(0);
    setBallsLeft(3);
    setGameOver(false);
    setGameStarted(true);
    setHelpUsed(false);

    resetBall();
    drawGame();
    s.animFrameId = requestAnimationFrame(gameLoop);
  }, [resetBall, drawGame, gameLoop]);

  // Keyboard controls
  useEffect(() => {
    if (!gameStarted || gameOver) return;
    const s = stateRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        s.leftActive = true;
        s.flippers.left.targetAngle = s.flippers.left.activeAngle;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        s.rightActive = true;
        s.flippers.right.targetAngle = s.flippers.right.activeAngle;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        s.leftActive = false;
        s.flippers.left.targetAngle = s.flippers.left.restAngle;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        s.rightActive = false;
        s.flippers.right.targetAngle = s.flippers.right.restAngle;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStarted, gameOver]);

  // Cleanup
  useEffect(() => {
    return () => {
      const s = stateRef.current;
      s.running = false;
      if (s.animFrameId) cancelAnimationFrame(s.animFrameId);
    };
  }, []);

  const getStars = (): number => {
    if (score >= 150) return 3;
    if (score >= 80) return 2;
    return 1;
  };

  const handleWin = () => {
    const stars = getStars();
    const reward = getFloorMeta(FLOOR_NUM).reward;
    onComplete(stars, reward);
    onExit();
  };

  const handleConcede = () => {
    const s = stateRef.current;
    s.running = false;
    if (s.animFrameId) cancelAnimationFrame(s.animFrameId);
    onConcede();
    onExit();
  };

  const handleHelp = () => {
    if (helpRemaining <= 0 || helpUsed || gameOver) return;
    // Widen flippers as help (increase flipper length temporarily and add extra ball)
    const s = stateRef.current;
    s.ballsLeft++;
    ballsLeftRef.current = s.ballsLeft;
    setBallsLeft(s.ballsLeft);
    setHelpUsed(true);
    onHelpUsed();
  };

  const activateFlipper = (side: 'left' | 'right') => {
    const s = stateRef.current;
    if (side === 'left') {
      s.leftActive = true;
      s.flippers.left.targetAngle = s.flippers.left.activeAngle;
    } else {
      s.rightActive = true;
      s.flippers.right.targetAngle = s.flippers.right.activeAngle;
    }
  };

  const deactivateFlipper = (side: 'left' | 'right') => {
    const s = stateRef.current;
    if (side === 'left') {
      s.leftActive = false;
      s.flippers.left.targetAngle = s.flippers.left.restAngle;
    } else {
      s.rightActive = false;
      s.flippers.right.targetAngle = s.flippers.right.restAngle;
    }
  };

  if (gameOver) {
    const stars = getStars();
    return (
      <div className={styles.container}>
        <motion.div className={styles.winOverlay} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
          <div className={styles.winContent}>
            <span className={styles.winEmoji}>{score >= 80 ? '🎱' : '💪'}</span>
            <h2 className={styles.winText}>
              {score >= 80
                ? (language === 'zh' ? '弹珠高手！' : 'Pinball Wizard!')
                : (language === 'zh' ? '再接再厉！' : 'Try again!')}
            </h2>
            <p className={styles.scoreInfo}>
              {language === 'zh' ? `得分: ${score}` : `Score: ${score}`}
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
          <span className={styles.startEmoji}>🎱</span>
          <h2 className={styles.startTitle}>
            {language === 'zh' ? '弹珠台' : 'Pinball'}
          </h2>
          <p className={styles.startDesc}>
            {language === 'zh'
              ? '用挡板弹射弹珠，击中圆形目标得分！别让弹珠掉下去！'
              : 'Use flippers to bounce the ball and hit bumpers for points! Don\'t let it fall!'}
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
        <span className={styles.scoreLabel}>
          {language === 'zh' ? `得分: ${score}` : `Score: ${score}`}
        </span>
        <span className={styles.ballsLabel}>
          {language === 'zh' ? `弹珠: ${'⚪'.repeat(ballsLeft)}` : `Balls: ${'⚪'.repeat(ballsLeft)}`}
        </span>
      </div>

      <div className={styles.boardWrapper}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className={styles.canvas}
        />
      </div>

      <div className={styles.controls}>
        <button
          className={styles.flipperBtn}
          onTouchStart={(e) => { e.preventDefault(); activateFlipper('left'); }}
          onTouchEnd={() => deactivateFlipper('left')}
          onMouseDown={() => activateFlipper('left')}
          onMouseUp={() => deactivateFlipper('left')}
          onMouseLeave={() => deactivateFlipper('left')}
        >
          {language === 'zh' ? '⬅ 左挡板' : '⬅ Left'}
        </button>
        <button
          className={styles.flipperBtn}
          onTouchStart={(e) => { e.preventDefault(); activateFlipper('right'); }}
          onTouchEnd={() => deactivateFlipper('right')}
          onMouseDown={() => activateFlipper('right')}
          onMouseUp={() => deactivateFlipper('right')}
          onMouseLeave={() => deactivateFlipper('right')}
        >
          {language === 'zh' ? '右挡板 ➡' : 'Right ➡'}
        </button>
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

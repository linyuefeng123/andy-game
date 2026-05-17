import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 13;
const GRID_SIZE = 20;

type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Pos = { x: number; y: number };

function getSpeed(difficulty: 1 | 2 | 3): number {
  if (difficulty === 1) return 200;
  if (difficulty === 2) return 130;
  return 80;
}

function randomFood(snake: Pos[], size: number): Pos {
  let pos: Pos;
  do {
    pos = { x: Math.floor(Math.random() * size), y: Math.floor(Math.random() * size) };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  return pos;
}

export default function Snake({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);
  const speed = getSpeed(difficulty);

  const initialSnake: Pos[] = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
  const [snake, setSnake] = useState<Pos[]>(initialSnake);
  const [food, setFood] = useState<Pos>(() => randomFood(initialSnake, GRID_SIZE));
  const [direction, setDirection] = useState<Dir>('UP');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<0 | 1 | 2>(0);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [helpActive, setHelpActive] = useState(false);

  const dirRef = useRef<Dir>('UP');
  const snakeRef = useRef(snake);
  const foodRef = useRef(food);
  const runningRef = useRef(running);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { foodRef.current = food; }, [food]);
  useEffect(() => { runningRef.current = running; }, [running]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cellSize = canvas.width / GRID_SIZE;

    ctx.fillStyle = '#0a1a2a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath(); ctx.moveTo(i * cellSize, 0); ctx.lineTo(i * cellSize, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cellSize); ctx.lineTo(canvas.width, i * cellSize); ctx.stroke();
    }

    // Food
    ctx.font = `${cellSize * 0.8}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🍎', foodRef.current.x * cellSize + cellSize / 2, foodRef.current.y * cellSize + cellSize / 2);

    // Snake
    snakeRef.current.forEach((seg, i) => {
      const isHead = i === 0;
      if (isHead) {
        ctx.font = `${cellSize * 0.8}px serif`;
        ctx.fillText('🐍', seg.x * cellSize + cellSize / 2, seg.y * cellSize + cellSize / 2);
      } else {
        ctx.fillStyle = helpActive ? 'rgba(77,150,255,0.6)' : 'rgba(94,234,212,0.5)';
        ctx.fillRect(seg.x * cellSize + 1, seg.y * cellSize + 1, cellSize - 2, cellSize - 2);
      }
    });
  }, [helpActive]);

  const tick = useCallback(() => {
    const s = snakeRef.current;
    const dir = dirRef.current;
    const head = { ...s[0] };

    if (dir === 'UP') head.y -= 1;
    else if (dir === 'DOWN') head.y += 1;
    else if (dir === 'LEFT') head.x -= 1;
    else if (dir === 'RIGHT') head.x += 1;

    // Wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      setGameOver(true);
      if (score >= 5) { setWinner(1); } else { setWinner(2); }
      setRunning(false);
      return;
    }
    // Self collision
    if (s.some(seg => seg.x === head.x && seg.y === head.y)) {
      setGameOver(true);
      if (score >= 5) { setWinner(1); } else { setWinner(2); }
      setRunning(false);
      return;
    }

    const newSnake = [head, ...s];
    const f = foodRef.current;

    if (head.x === f.x && head.y === f.y) {
      // Ate food
      setScore(prev => prev + 1);
      const newFood = randomFood(newSnake, GRID_SIZE);
      setFood(newFood);
      foodRef.current = newFood;
    } else {
      newSnake.pop();
    }

    setSnake(newSnake);
    snakeRef.current = newSnake;
    draw();
  }, [score, draw]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(tick, speed);
    return () => clearInterval(interval);
  }, [running, tick, speed]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleDirection = useCallback((dir: Dir) => {
    const opposites: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
    if (opposites[dir] === dirRef.current) return;
    dirRef.current = dir;
    setDirection(dir);
    if (!runningRef.current) {
      setRunning(true);
      runningRef.current = true;
    }
  }, [running]);

  const handleHelp = () => {
    if (helpRemaining <= 0 || gameOver) return;
    setHelpActive(true);
    onHelpUsed();
    setTimeout(() => setHelpActive(false), 3000);
  };

  const handleWin = () => {
    if (winner === 1) onComplete(score >= 10 ? 3 : score >= 7 ? 2 : 1);
    onExit();
  };

  if (gameOver && winner !== 0) {
    return (
      <div className={styles.container}>
        <motion.div className={styles.winOverlay} initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} transition={{type:'spring',stiffness:200,damping:15}}>
          <div className={styles.winContent}>
            <span className={styles.winEmoji}>{winner === 1 ? '🌟' : '💪'}</span>
            <h2 className={styles.winText}>{winner === 1 ? (language === 'zh' ? '你真棒！' : 'You win!') : (language === 'zh' ? '再接再厉！' : 'Try again!')}</h2>
            <p className={styles.scoreInfo}>{language === 'zh' ? `得分: ${score}` : `Score: ${score}`}</p>
            <div className={styles.winButtons}>
              <button className={styles.replayButton} onClick={onReplay}>🔄 {language === 'zh' ? '再玩一次！' : 'Play again!'}</button>
              <button className={styles.winButton} onClick={handleWin}>{winner === 1 ? (language === 'zh' ? '⭐ 继续冒险' : '⭐ Continue') : (language === 'zh' ? '🏠 返回大厅' : '🏠 Back')}</button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <span className={styles.turnInfo}>
          {!running
            ? (language === 'zh' ? '🐍 按方向键开始！' : '🐍 Press a direction to start!')
            : (language === 'zh' ? `🐍 得分: ${score}` : `🐍 Score: ${score}`)}
        </span>
      </div>

      <div className={styles.boardWrapper}>
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          className={styles.canvas}
        />
      </div>

      <div className={styles.controls}>
        <div className={styles.controlRow}>
          <button className={styles.dirBtn} onClick={() => handleDirection('UP')}>⬆️</button>
        </div>
        <div className={styles.controlRow}>
          <button className={styles.dirBtn} onClick={() => handleDirection('LEFT')}>⬅️</button>
          <button className={styles.dirBtn} onClick={() => handleDirection('DOWN')}>⬇️</button>
          <button className={styles.dirBtn} onClick={() => handleDirection('RIGHT')}>➡️</button>
        </div>
      </div>

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || gameOver}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={onConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

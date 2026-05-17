import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 14;

type Cell = 'wall' | 'path' | 'start' | 'exit';

function generateMaze(size: number): Cell[][] {
  // Ensure odd size for maze generation
  const s = size % 2 === 0 ? size + 1 : size;
  const maze: Cell[][] = Array.from({ length: s }, () => Array(s).fill('wall') as Cell[]);

  // DFS maze generation
  const visited = Array.from({ length: s }, () => Array(s).fill(false));
  const dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]];

  function carve(x: number, y: number) {
    visited[y][x] = true;
    maze[y][x] = 'path';
    const shuffled = [...dirs].sort(() => Math.random() - 0.5);
    for (const [dx, dy] of shuffled) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < s && ny >= 0 && ny < s && !visited[ny][nx]) {
        maze[y + dy / 2][x + dx / 2] = 'path';
        carve(nx, ny);
      }
    }
  }

  carve(1, 1);
  maze[1][1] = 'start';
  maze[s - 2][s - 2] = 'exit';
  return maze;
}

function getMazeSize(difficulty: 1 | 2 | 3): number {
  if (difficulty === 1) return 5;
  if (difficulty === 2) return 7;
  return 9;
}

export default function Maze({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);
  const mazeSize = getMazeSize(difficulty);
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [maze, setMaze] = useState<Cell[][]>(() => generateMaze(mazeSize));
  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 });
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<0 | 1 | 2>(0);
  const [timer, setTimer] = useState(0);
  const [started, setStarted] = useState(false);
  const [helpPath, setHelpPath] = useState<{x: number; y: number}[] | null>(null);

  // Timer
  useEffect(() => {
    if (!started || gameOver) return;
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [started, gameOver]);

  // Check win
  useEffect(() => {
    if (maze[playerPos.y]?.[playerPos.x] === 'exit' && !gameOver) {
      setGameOver(true);
      setWinner(1);
    }
  }, [playerPos, maze, gameOver]);

  const handleMove = useCallback((dx: number, dy: number) => {
    if (gameOver) return;
    if (!started) setStarted(true);
    setHelpPath(null);

    const nx = playerPos.x + dx;
    const ny = playerPos.y + dy;
    if (nx < 0 || ny < 0 || ny >= maze.length || nx >= maze[0].length) return;
    if (maze[ny][nx] === 'wall') return;
    setPlayerPos({ x: nx, y: ny });
  }, [playerPos, maze, gameOver, started]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') handleMove(0, -1);
      else if (e.key === 'ArrowDown' || e.key === 's') handleMove(0, 1);
      else if (e.key === 'ArrowLeft' || e.key === 'a') handleMove(-1, 0);
      else if (e.key === 'ArrowRight' || e.key === 'd') handleMove(1, 0);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleMove]);

  const handleHelp = () => {
    if (helpRemaining <= 0 || gameOver) return;
    // BFS to find path from player to exit
    const s = maze.length;
    const exitX = s - 2, exitY = s - 2;
    const visited = Array.from({ length: s }, () => Array(s).fill(false));
    const queue: { x: number; y: number; path: { x: number; y: number }[] }[] = [{ x: playerPos.x, y: playerPos.y, path: [] }];
    visited[playerPos.y][playerPos.x] = true;

    while (queue.length > 0) {
      const { x, y, path } = queue.shift()!;
      if (x === exitX && y === exitY) {
        setHelpPath(path.length > 3 ? path.slice(0, 3) : path);
        onHelpUsed();
        setTimeout(() => setHelpPath(null), 3000);
        return;
      }
      for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < s && ny < s && !visited[ny][nx] && maze[ny][nx] !== 'wall') {
          visited[ny][nx] = true;
          queue.push({ x: nx, y: ny, path: [...path, { x: nx, y: ny }] });
        }
      }
    }
    onHelpUsed();
  };

  const getStars = (): number => {
    const thresholds = difficulty === 1 ? [30, 60] : difficulty === 2 ? [45, 90] : [60, 120];
    if (timer <= thresholds[0]) return 3;
    if (timer <= thresholds[1]) return 2;
    return 1;
  };

  const handleWin = () => {
    if (winner === 1) onComplete(getStars());
    onExit();
  };

  if (gameOver && winner !== 0) {
    return (
      <div className={styles.container}>
        <motion.div className={styles.winOverlay} initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} transition={{type:'spring',stiffness:200,damping:15}}>
          <div className={styles.winContent}>
            <span className={styles.winEmoji}>{winner === 1 ? '🌟' : '💪'}</span>
            <h2 className={styles.winText}>{winner === 1 ? (language === 'zh' ? '你真棒！' : 'You win!') : (language === 'zh' ? '再接再厉！' : 'Try again!')}</h2>
            <p className={styles.scoreInfo}>{language === 'zh' ? `用时: ${timer}秒 | ⭐`.repeat(getStars()) : `Time: ${timer}s | ${'⭐'.repeat(getStars())}`}</p>
            <div className={styles.winButtons}>
              <button className={styles.replayButton} onClick={onReplay}>🔄 {language === 'zh' ? '再玩一次！' : 'Play again!'}</button>
              <button className={styles.winButton} onClick={handleWin}>{winner === 1 ? (language === 'zh' ? '⭐ 继续冒险' : '⭐ Continue') : (language === 'zh' ? '🏠 返回大厅' : '🏠 Back')}</button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const isHelpPath = (x: number, y: number) => helpPath?.some(p => p.x === x && p.y === y);

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <span className={styles.turnInfo}>
          {started
            ? (language === 'zh' ? `🏰 时间: ${timer}秒` : `🏰 Time: ${timer}s`)
            : (language === 'zh' ? '🏰 找到出口 🚪' : '🏰 Find the exit 🚪')}
        </span>
      </div>

      <div className={styles.boardWrapper}>
        <div className={styles.maze} style={{ gridTemplateColumns: `repeat(${maze[0].length}, 1fr)` }}>
          {maze.map((row, y) =>
            row.map((cell, x) => {
              const isPlayer = playerPos.x === x && playerPos.y === y;
              const isHint = isHelpPath(x, y);
              return (
                <div
                  key={`${y}-${x}`}
                  className={`${styles.cell} ${cell === 'wall' ? styles.wall : styles.path} ${isHint ? styles.hint : ''}`}
                >
                  {cell === 'exit' && !isPlayer && <span className={styles.exit}>🚪</span>}
                  {isPlayer && <span className={styles.player}>🧒</span>}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlRow}>
          <button className={styles.dirBtn} onClick={() => handleMove(0, -1)}>⬆️</button>
        </div>
        <div className={styles.controlRow}>
          <button className={styles.dirBtn} onClick={() => handleMove(-1, 0)}>⬅️</button>
          <button className={styles.dirBtn} onClick={() => handleMove(0, 1)}>⬇️</button>
          <button className={styles.dirBtn} onClick={() => handleMove(1, 0)}>➡️</button>
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

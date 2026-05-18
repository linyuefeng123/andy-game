import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 43;
const GRID_SIZE = 5;

// Pipe types: each has openings on certain sides [top, right, bottom, left]
// Rotation adds to the base openings
type PipeType = 'straight' | 'corner' | 'tee' | 'cross';

interface PipeCell {
  type: PipeType;
  rotation: number; // 0, 1, 2, 3 (x 90 degrees clockwise)
  solutionRotation: number; // correct rotation for the solution
}

// Base openings for each pipe type (before rotation)
// [top, right, bottom, left] - true means open on that side
const BASE_OPENINGS: Record<PipeType, [boolean, boolean, boolean, boolean]> = {
  straight: [true, false, true, false],   // vertical: top & bottom
  corner:   [true, true, false, false],    // top-right
  tee:      [true, true, false, true],     // top, right, left (T-shape)
  cross:    [true, true, true, true],      // all sides
};

// Rotate openings clockwise by n steps
function rotateOpenings(base: [boolean, boolean, boolean, boolean], rotation: number): [boolean, boolean, boolean, boolean] {
  const r = ((rotation % 4) + 4) % 4;
  const result: [boolean, boolean, boolean, boolean] = [false, false, false, false];
  for (let i = 0; i < 4; i++) {
    result[(i + r) % 4] = base[i];
  }
  return result;
}

function getOpenings(cell: PipeCell): [boolean, boolean, boolean, boolean] {
  return rotateOpenings(BASE_OPENINGS[cell.type], cell.rotation);
}

// Direction indices: 0=top, 1=right, 2=bottom, 3=left
const OPPOSITE = [2, 3, 0, 1]; // opposite direction
const DIR_DELTA: [number, number][] = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // row, col deltas

function generatePuzzle(round: number): { grid: PipeCell[][], entryRow: number, exitRow: number } {
  // Generate a valid path from entry to exit, then fill remaining cells with random pipes
  const entryRow = 1 + Math.floor(Math.random() * (GRID_SIZE - 2));
  const exitRow = 1 + Math.floor(Math.random() * (GRID_SIZE - 2));

  // Use BFS/DFS to create a path from (entryRow, 0) to (exitRow, GRID_SIZE-1)
  // The path enters from the left of column 0, and exits from the right of column GRID_SIZE-1
  const path: [number, number, number][] = []; // [row, col, entryDir] - entryDir is direction from which we entered

  // Build path using a random walk that tends toward the exit
  let currentRow = entryRow;
  let currentCol = 0;
  const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));
  const pathCells: { row: number; col: number; fromDir: number; toDir: number }[] = [];

  // Entry from left means entering from direction 3 (left side)
  let fromDir = 3; // came from left
  visited[currentRow][currentCol] = true;

  // Simple path generation: prefer moving right, but can go up/down
  const maxSteps = GRID_SIZE * GRID_SIZE;
  for (let step = 0; step < maxSteps; step++) {
    // Possible next moves: must have an opening from current cell and into next cell
    const possibleDirs: number[] = [];

    for (let d = 0; d < 4; d++) {
      if (d === OPPOSITE[fromDir]) continue; // don't go back the way we came (unless at start)
      const nr = currentRow + DIR_DELTA[d][0];
      const nc = currentCol + DIR_DELTA[d][1];
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
      if (visited[nr][nc]) continue;
      possibleDirs.push(d);
    }

    if (possibleDirs.length === 0) break;

    // Bias toward rightward movement, increase with round number
    let chosenDir: number;
    if (possibleDirs.includes(1) && (Math.random() < 0.4 + round * 0.1 || possibleDirs.length === 1)) {
      chosenDir = 1; // go right
    } else {
      chosenDir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
    }

    const nr = currentRow + DIR_DELTA[chosenDir][0];
    const nc = currentCol + DIR_DELTA[chosenDir][1];

    pathCells.push({ row: currentRow, col: currentCol, fromDir, toDir: chosenDir });
    visited[nr][nc] = true;
    fromDir = OPPOSITE[chosenDir]; // next cell's fromDir
    currentRow = nr;
    currentCol = nc;

    // Check if we've reached the right side
    if (currentCol === GRID_SIZE - 1) {
      pathCells.push({ row: currentRow, col: currentCol, fromDir, toDir: 1 }); // exit to right
      break;
    }
  }

  // Determine pipe types for path cells
  const grid: PipeCell[][] = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(null).map(() => ({
      type: 'cross' as PipeType,
      rotation: 0,
      solutionRotation: 0,
    }))
  );

  // For each path cell, determine which sides need to be open
  for (const pc of pathCells) {
    const neededOpenings = [false, false, false, false];
    neededOpenings[pc.fromDir] = true;
    neededOpenings[pc.toDir] = true;

    // Find the pipe type and rotation that matches these openings
    const { type, rotation } = findPipeTypeAndRotation(neededOpenings);
    grid[pc.row][pc.col] = { type, rotation: 0, solutionRotation: rotation };
  }

  // Fill non-path cells with random pipes
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!pathCells.some(p => p.row === r && p.col === c)) {
        const types: PipeType[] = ['straight', 'corner', 'tee'];
        const type = types[Math.floor(Math.random() * types.length)];
        const rotation = Math.floor(Math.random() * 4);
        grid[r][c] = { type, rotation: 0, solutionRotation: rotation };
      }
    }
  }

  // Now scramble: rotate all pipes randomly (away from solution)
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const solRot = grid[r][c].solutionRotation;
      // Add a random offset (1-3) to scramble
      const offset = 1 + Math.floor(Math.random() * 3);
      grid[r][c].rotation = (solRot + offset) % 4;
    }
  }

  return { grid, entryRow, exitRow };
}

function findPipeTypeAndRotation(openings: [boolean, boolean, boolean, boolean]): { type: PipeType; rotation: number } {
  const openCount = openings.filter(Boolean).length;

  // Cross: all 4 sides open
  if (openCount === 4) return { type: 'cross', rotation: 0 };

  // Straight: 2 sides, opposite
  if (openCount === 2) {
    if ((openings[0] && openings[2]) || (openings[1] && openings[3])) {
      // Opposite sides - straight pipe
      const rot = openings[1] && openings[3] ? 1 : 0;
      return { type: 'straight', rotation: rot };
    }
    // Adjacent sides - corner
    for (let r = 0; r < 4; r++) {
      const rotated = rotateOpenings(BASE_OPENINGS.corner, r);
      if (rotated[0] === openings[0] && rotated[1] === openings[1] &&
          rotated[2] === openings[2] && rotated[3] === openings[3]) {
        return { type: 'corner', rotation: r };
      }
    }
  }

  // T-junction: 3 sides open
  if (openCount === 3) {
    for (let r = 0; r < 4; r++) {
      const rotated = rotateOpenings(BASE_OPENINGS.tee, r);
      if (rotated[0] === openings[0] && rotated[1] === openings[1] &&
          rotated[2] === openings[2] && rotated[3] === openings[3]) {
        return { type: 'tee', rotation: r };
      }
    }
  }

  // Fallback: cross
  return { type: 'cross', rotation: 0 };
}

// BFS to find connected pipes from entry
function findConnectedPipes(grid: PipeCell[][], entryRow: number): Set<string> {
  const connected = new Set<string>();
  // Start from entry: the entry cell at (entryRow, 0) must have a left opening
  const startCell = grid[entryRow][0];
  const startOpenings = getOpenings(startCell);
  if (!startOpenings[3]) return connected; // left side must be open for entry

  const queue: [number, number][] = [[entryRow, 0]];
  connected.add(`${entryRow},0`);

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const cellOpenings = getOpenings(grid[r][c]);

    for (let d = 0; d < 4; d++) {
      if (!cellOpenings[d]) continue;
      const nr = r + DIR_DELTA[d][0];
      const nc = c + DIR_DELTA[d][1];

      // Check if neighbor exists
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
      if (connected.has(`${nr},${nc}`)) continue;

      // Check if neighbor has opening toward us
      const neighborOpenings = getOpenings(grid[nr][nc]);
      if (neighborOpenings[OPPOSITE[d]]) {
        connected.add(`${nr},${nc}`);
        queue.push([nr, nc]);
      }
    }
  }

  return connected;
}

function isPathComplete(grid: PipeCell[][], entryRow: number, exitRow: number): boolean {
  const connected = findConnectedPipes(grid, entryRow);
  // Check that exit cell is connected and has right opening
  if (!connected.has(`${exitRow},${GRID_SIZE - 1}`)) return false;
  const exitOpenings = getOpenings(grid[exitRow][GRID_SIZE - 1]);
  return exitOpenings[1]; // right side must be open for exit
}

export default function PipeConnectGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);

  const [round, setRound] = useState(1);
  const [totalMoves, setTotalMoves] = useState(0);
  const [roundMoves, setRoundMoves] = useState(0);
  const [puzzleData, setPuzzleData] = useState(() => generatePuzzle(1));
  const [grid, setGrid] = useState<PipeCell[][]>(() => puzzleData.grid);
  const [solved, setSolved] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [waterCells, setWaterCells] = useState<Set<string>>(new Set());
  const [helpHint, setHelpHint] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maxRounds = 3;

  // Check if path is complete after each move
  useEffect(() => {
    if (solved) return;
    if (isPathComplete(grid, puzzleData.entryRow, puzzleData.exitRow)) {
      setSolved(true);
      // Show water flow animation
      const connected = findConnectedPipes(grid, puzzleData.entryRow);
      setWaterCells(connected);

      // After animation, advance to next round or show win
      setTimeout(() => {
        if (round >= maxRounds) {
          setShowWin(true);
        } else {
          // Next round
          const nextRound = round + 1;
          const nextPuzzle = generatePuzzle(nextRound);
          setRound(nextRound);
          setPuzzleData(nextPuzzle);
          setGrid(nextPuzzle.grid);
          setSolved(false);
          setWaterCells(new Set());
          setRoundMoves(0);
        }
      }, 1500);
    }
  }, [grid, puzzleData.entryRow, puzzleData.exitRow, solved, round]);

  const handleRotate = useCallback((r: number, c: number) => {
    if (solved) return;
    setGrid(prev => {
      const newGrid = prev.map(row => row.map(cell => ({ ...cell })));
      newGrid[r][c].rotation = (newGrid[r][c].rotation + 1) % 4;
      return newGrid;
    });
    setRoundMoves(m => m + 1);
    setTotalMoves(m => m + 1);
    setHelpHint(null);
  }, [solved]);

  const handleHelp = () => {
    if (helpRemaining <= 0 || solved) return;
    // Find a pipe that's not in the correct rotation and rotate it
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c].rotation !== grid[r][c].solutionRotation) {
          // Fix this pipe
          setGrid(prev => {
            const newGrid = prev.map(row => row.map(cell => ({ ...cell })));
            newGrid[r][c].rotation = newGrid[r][c].solutionRotation;
            return newGrid;
          });
          setHelpHint(`${r},${c}`);
          onHelpUsed();
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setHelpHint(null), 2000);
          return;
        }
      }
    }
  };

  const getStars = (): number => {
    // Total moves across all 3 rounds
    if (totalMoves <= 20) return 3;
    if (totalMoves <= 35) return 2;
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

  const isWaterCell = (r: number, c: number) => waterCells.has(`${r},${c}`);
  const isHintCell = (r: number, c: number) => helpHint === `${r},${c}`;

  const renderPipe = (cell: PipeCell, r: number, c: number) => {
    const openings = getOpenings(cell);
    const isWater = isWaterCell(r, c);
    const rotationDeg = cell.rotation * 90;

    return (
      <button
        key={`${r}-${c}`}
        className={`${styles.pipeCell} ${isHintCell(r, c) ? styles.pipeHint : ''}`}
        onClick={() => handleRotate(r, c)}
      >
        <div className={styles.pipeInner} style={{ transform: `rotate(0deg)` }}>
          {/* Pipe segments */}
          {openings[0] && <div className={`${styles.pipeSegment} ${styles.pipeSegmentTop}`} />}
          {openings[1] && <div className={`${styles.pipeSegment} ${styles.pipeSegmentRight}`} />}
          {openings[2] && <div className={`${styles.pipeSegment} ${styles.pipeSegmentBottom}`} />}
          {openings[3] && <div className={`${styles.pipeSegment} ${styles.pipeSegmentLeft}`} />}
          <div className={styles.pipeCenter} />

          {/* Water overlay */}
          {isWater && openings[0] && <div className={`${styles.pipeSegmentWater} ${styles.pipeSegmentWaterTop} ${styles.pipeSegmentWaterActive}`} />}
          {isWater && openings[1] && <div className={`${styles.pipeSegmentWater} ${styles.pipeSegmentWaterRight} ${styles.pipeSegmentWaterActive}`} />}
          {isWater && openings[2] && <div className={`${styles.pipeSegmentWater} ${styles.pipeSegmentWaterBottom} ${styles.pipeSegmentWaterActive}`} />}
          {isWater && openings[3] && <div className={`${styles.pipeSegmentWater} ${styles.pipeSegmentWaterLeft} ${styles.pipeSegmentWaterActive}`} />}
          {isWater && <div className={`${styles.pipeCenterWater} ${styles.pipeCenterWaterActive}`} />}
        </div>
      </button>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <span className={styles.moveCount}>
          {language === 'zh' ? `步数: ${totalMoves}` : `Moves: ${totalMoves}`}
        </span>
        <span className={styles.roundInfo}>
          {language === 'zh' ? `第 ${round}/${maxRounds} 关` : `Round ${round}/${maxRounds}`}
        </span>
      </div>

      <div className={styles.boardWrapper}>
        {/* Entry marker */}
        <div className={styles.entryMarker} style={{ top: `${(puzzleData.entryRow / GRID_SIZE) * 100 + 50 / GRID_SIZE}%` }}>
          💧
        </div>
        {/* Exit marker */}
        <div className={styles.exitMarker} style={{ top: `${(puzzleData.exitRow / GRID_SIZE) * 100 + 50 / GRID_SIZE}%` }}>
          🏠
        </div>

        <div
          className={styles.board}
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => renderPipe(cell, r, c))
          )}
        </div>
      </div>

      {!showWin && (
        <div className={styles.actionButtons}>
          <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || solved}>
            {helper.emoji} 💡 {helpRemaining}
          </button>
          <button className={styles.skipLink} onClick={handleConcede}>
            {language === 'zh' ? '跳过这局' : 'Skip'}
          </button>
        </div>
      )}

      <AnimatePresence>
        {showWin && (
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
              <span className={styles.winEmoji}>🔧</span>
              <h2 className={styles.winText}>
                {language === 'zh' ? '水管接通了！' : 'Pipes Connected!'}
              </h2>
              <p className={styles.winInfo}>
                {language === 'zh' ? `用了 ${totalMoves} 步` : `${totalMoves} moves`}
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

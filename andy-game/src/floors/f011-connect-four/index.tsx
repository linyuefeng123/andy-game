import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 11;
const ROWS = 6;
const COLS = 7;

type Cell = 0 | 1 | 2; // 0=empty, 1=player(red), 2=AI(yellow)

function checkWinAt(board: Cell[][], row: number, col: number, player: 1 | 2): number[][] | null {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr, dc] of dirs) {
    const cells: number[][] = [[row, col]];
    for (let d = 1; d <= 3; d++) {
      const r = row + dr * d, c = col + dc * d;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) cells.push([r, c]);
      else break;
    }
    for (let d = 1; d <= 3; d++) {
      const r = row - dr * d, c = col - dc * d;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) cells.push([r, c]);
      else break;
    }
    if (cells.length >= 4) return cells;
  }
  return null;
}

function isBoardFull(board: Cell[][]): boolean {
  return board[0].every(c => c !== 0);
}

function findLowestRow(board: Cell[][], col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) return r;
  }
  return -1;
}

function scorePosition(board: Cell[][], col: number, player: 1 | 2): number {
  const row = findLowestRow(board, col);
  if (row < 0) return -Infinity;
  const testBoard = board.map(r => [...r]) as Cell[][];
  testBoard[row][col] = player;
  if (checkWinAt(testBoard, row, col, player)) return 1000;
  // Check if opponent could win here
  const opp: 1 | 2 = player === 1 ? 2 : 1;
  testBoard[row][col] = opp;
  if (checkWinAt(testBoard, row, col, opp)) return 500;
  // Prefer center
  return 3 - Math.abs(col - 3);
}

function getAiMove(board: Cell[][], randomRate: number): number {
  const validCols = [];
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] === 0) validCols.push(c);
  }
  if (validCols.length === 0) return -1;

  // Try to win
  for (const c of validCols) {
    const r = findLowestRow(board, c);
    const test = board.map(row => [...row]) as Cell[][];
    test[r][c] = 2;
    if (checkWinAt(test, r, c, 2)) return c;
  }
  // Block player
  for (const c of validCols) {
    const r = findLowestRow(board, c);
    const test = board.map(row => [...row]) as Cell[][];
    test[r][c] = 1;
    if (checkWinAt(test, r, c, 1)) return c;
  }
  // Random based on difficulty
  if (Math.random() < randomRate) {
    return validCols[Math.floor(Math.random() * validCols.length)];
  }
  // Score-based
  let bestScore = -Infinity;
  let bestCols: number[] = [];
  for (const c of validCols) {
    const s = scorePosition(board, c, 2);
    if (s > bestScore) { bestScore = s; bestCols = [c]; }
    else if (s === bestScore) bestCols.push(c);
  }
  return bestCols[Math.floor(Math.random() * bestCols.length)];
}

export default function ConnectFour({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const [board, setBoard] = useState<Cell[][]>(
    () => Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[])
  );
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<0 | 1 | 2>(0);
  const [winCells, setWinCells] = useState<number[][] | null>(null);
  const [playerTurn, setPlayerTurn] = useState(true);
  const [helpHint, setHelpHint] = useState<number | null>(null);

  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);
  const randomRate = difficulty === 1 ? 0.5 : difficulty === 2 ? 0.25 : 0.05;

  const handleColumnClick = useCallback((col: number) => {
    if (gameOver || !playerTurn) return;
    const row = findLowestRow(board, col);
    if (row < 0) return;
    setHelpHint(null);

    const newBoard = board.map(r => [...r]) as Cell[][];
    newBoard[row][col] = 1;

    const win = checkWinAt(newBoard, row, col, 1);
    if (win) {
      setBoard(newBoard);
      setWinner(1);
      setWinCells(win);
      setGameOver(true);
      return;
    }
    if (isBoardFull(newBoard)) {
      setBoard(newBoard);
      setGameOver(true);
      setWinner(2);
      return;
    }

    setBoard(newBoard);
    setPlayerTurn(false);

    setTimeout(() => {
      const aiCol = getAiMove(newBoard, randomRate);
      if (aiCol < 0) return;
      const aiRow = findLowestRow(newBoard, aiCol);
      newBoard[aiRow][aiCol] = 2;

      const aiWin = checkWinAt(newBoard, aiRow, aiCol, 2);
      if (aiWin) {
        setBoard([...newBoard.map(r => [...r])]);
        setWinner(2);
        setWinCells(aiWin);
        setGameOver(true);
        setPlayerTurn(true);
        return;
      }
      if (isBoardFull(newBoard)) {
        setBoard([...newBoard.map(r => [...r])]);
        setGameOver(true);
        setWinner(2);
        setPlayerTurn(true);
        return;
      }
      setBoard([...newBoard.map(r => [...r])]);
      setPlayerTurn(true);
    }, 500);
  }, [board, gameOver, playerTurn, randomRate]);

  const handleHelp = () => {
    if (helpRemaining <= 0 || gameOver || !playerTurn) return;
    // Suggest best column for player
    for (let c = 0; c < COLS; c++) {
      const r = findLowestRow(board, c);
      if (r < 0) continue;
      const test = board.map(row => [...row]) as Cell[][];
      test[r][c] = 1;
      if (checkWinAt(test, r, c, 1)) { setHelpHint(c); onHelpUsed(); setTimeout(() => setHelpHint(null), 3000); return; }
    }
    // Block
    for (let c = 0; c < COLS; c++) {
      const r = findLowestRow(board, c);
      if (r < 0) continue;
      const test = board.map(row => [...row]) as Cell[][];
      test[r][c] = 2;
      if (checkWinAt(test, r, c, 2)) { setHelpHint(c); onHelpUsed(); setTimeout(() => setHelpHint(null), 3000); return; }
    }
    // Center
    if (board[0][3] === 0) setHelpHint(3);
    else {
      const valid = [];
      for (let c = 0; c < COLS; c++) { if (board[0][c] === 0) valid.push(c); }
      if (valid.length) setHelpHint(valid[Math.floor(Math.random() * valid.length)]);
    }
    onHelpUsed();
    setTimeout(() => setHelpHint(null), 3000);
  };

  const handleWin = () => {
    if (winner === 1) onComplete(1);
    onExit();
  };

  const isWinCell = (r: number, c: number) => winCells?.some(([wr, wc]) => wr === r && wc === c);

  if (gameOver && winner !== 0) {
    return (
      <div className={styles.container}>
        <motion.div className={styles.winOverlay} initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} transition={{type:'spring',stiffness:200,damping:15}}>
          <div className={styles.winContent}>
            <span className={styles.winEmoji}>{winner === 1 ? '🌟' : '💪'}</span>
            <h2 className={styles.winText}>{winner === 1 ? (language === 'zh' ? '你真棒！' : 'You win!') : (language === 'zh' ? '再接再厉！' : 'Try again!')}</h2>
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
          {playerTurn
            ? (language === 'zh' ? '🧒 轮到你了！🔴' : '🧒 Your turn! 🔴')
            : (language === 'zh' ? '🤖 对方思考中...' : '🤖 AI thinking...')}
        </span>
      </div>

      <div className={styles.boardWrapper}>
        {/* Column selectors */}
        <div className={styles.columnSelectors}>
          {Array.from({ length: COLS }, (_, c) => (
            <button
              key={c}
              className={`${styles.colBtn} ${helpHint === c ? styles.hintCol : ''}`}
              onClick={() => handleColumnClick(c)}
              disabled={!playerTurn || gameOver || board[0][c] !== 0}
            >
              ▼
            </button>
          ))}
        </div>
        <div className={styles.board}>
          {board.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className={`${styles.cell} ${cell === 1 ? styles.red : cell === 2 ? styles.yellow : ''} ${isWinCell(r, c) ? styles.winCell : ''}`}
              >
                {cell === 1 && <span className={styles.piece}>🔴</span>}
                {cell === 2 && <span className={styles.piece}>🟡</span>}
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || !playerTurn}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={onConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

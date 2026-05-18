import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 41;
const BOARD_SIZE = 6;

type CellState = 0 | 1 | 2; // 0=empty, 1=black(player), 2=white(AI)

const DIRECTIONS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

function createInitialBoard(): CellState[][] {
  const board: CellState[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(0) as CellState[]
  );
  const mid = BOARD_SIZE / 2;
  board[mid - 1][mid - 1] = 2;
  board[mid - 1][mid] = 1;
  board[mid][mid - 1] = 1;
  board[mid][mid] = 2;
  return board;
}

function getFlips(board: CellState[][], row: number, col: number, player: CellState): [number, number][] {
  if (board[row][col] !== 0) return [];
  const opponent: CellState = player === 1 ? 2 : 1;
  const allFlips: [number, number][] = [];

  for (const [dr, dc] of DIRECTIONS) {
    const flips: [number, number][] = [];
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === opponent) {
      flips.push([r, c]);
      r += dr;
      c += dc;
    }
    if (flips.length > 0 && r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
      allFlips.push(...flips);
    }
  }
  return allFlips;
}

function getValidMoves(board: CellState[][], player: CellState): [number, number][] {
  const moves: [number, number][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (getFlips(board, r, c, player).length > 0) {
        moves.push([r, c]);
      }
    }
  }
  return moves;
}

function applyMove(board: CellState[][], row: number, col: number, player: CellState): CellState[][] {
  const newBoard = board.map((r) => [...r]) as CellState[][];
  const flips = getFlips(board, row, col, player);
  newBoard[row][col] = player;
  for (const [fr, fc] of flips) {
    newBoard[fr][fc] = player;
  }
  return newBoard;
}

function countPieces(board: CellState[][]): { black: number; white: number } {
  let black = 0;
  let white = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 1) black++;
      else if (board[r][c] === 2) white++;
    }
  }
  return { black, white };
}

function aiMove(board: CellState[][], greedy: boolean): [number, number] | null {
  const moves = getValidMoves(board, 2);
  if (moves.length === 0) return null;

  if (greedy) {
    let bestMove = moves[0];
    let bestFlips = 0;
    for (const move of moves) {
      const flips = getFlips(board, move[0], move[1], 2).length;
      if (flips > bestFlips) {
        bestFlips = flips;
        bestMove = move;
      }
    }
    return bestMove;
  }

  return moves[Math.floor(Math.random() * moves.length)];
}

export default function ReversiGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);

  const [board, setBoard] = useState<CellState[][]>(createInitialBoard);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [gameOver, setGameOver] = useState(false);
  const [lastMove, setLastMove] = useState<[number, number] | null>(null);
  const [flippedCells, setFlippedCells] = useState<[number, number][]>([]);
  const [helpHint, setHelpHint] = useState<[number, number] | null>(null);
  const [aiThinking, setAiThinking] = useState(false);

  const validMoves = getValidMoves(board, currentPlayer);

  const checkGameEnd = useCallback((b: CellState[][], nextPlayer: 1 | 2): boolean => {
    const playerMoves = getValidMoves(b, nextPlayer);
    if (playerMoves.length > 0) return false;
    const otherPlayer: CellState = nextPlayer === 1 ? 2 : 1;
    const otherMoves = getValidMoves(b, otherPlayer);
    return otherMoves.length === 0;
  }, []);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (gameOver || currentPlayer !== 1 || aiThinking) return;
      const flips = getFlips(board, row, col, 1);
      if (flips.length === 0) return;

      setHelpHint(null);
      const newBoard = applyMove(board, row, col, 1);
      setBoard(newBoard);
      setLastMove([row, col]);
      setFlippedCells(flips);
      setTimeout(() => setFlippedCells([]), 600);

      // Check if game ends after player move
      if (checkGameEnd(newBoard, 2)) {
        setGameOver(true);
        return;
      }

      // Check if AI has valid moves
      const aiMoves = getValidMoves(newBoard, 2);
      if (aiMoves.length === 0) {
        // AI can't move, back to player
        setCurrentPlayer(1);
        return;
      }

      setCurrentPlayer(2);
      setAiThinking(true);

      setTimeout(() => {
        const useGreedy = difficulty >= 2;
        const move = aiMove(newBoard, useGreedy);
        if (move) {
          const aiFlips = getFlips(newBoard, move[0], move[1], 2);
          const afterAi = applyMove(newBoard, move[0], move[1], 2);
          setBoard(afterAi);
          setLastMove([move[0], move[1]]);
          setFlippedCells(aiFlips);
          setTimeout(() => setFlippedCells([]), 600);

          if (checkGameEnd(afterAi, 1)) {
            setGameOver(true);
            setAiThinking(false);
            return;
          }

          // Check if player has valid moves
          const playerMoves = getValidMoves(afterAi, 1);
          if (playerMoves.length === 0) {
            // Player can't move, AI goes again
            setCurrentPlayer(2);
            setAiThinking(true);
            setTimeout(() => {
              const move2 = aiMove(afterAi, useGreedy);
              if (move2) {
                const afterAi2 = applyMove(afterAi, move2[0], move2[1], 2);
                setBoard(afterAi2);
                setLastMove([move2[0], move2[1]]);
                if (checkGameEnd(afterAi2, 1)) {
                  setGameOver(true);
                } else {
                  setCurrentPlayer(1);
                }
              } else {
                setGameOver(true);
              }
              setAiThinking(false);
            }, 500);
            return;
          }
        }
        setCurrentPlayer(1);
        setAiThinking(false);
      }, 500);
    },
    [board, currentPlayer, gameOver, aiThinking, difficulty, checkGameEnd]
  );

  const handleHelp = () => {
    if (helpRemaining <= 0 || gameOver || currentPlayer !== 1 || aiThinking) return;
    const moves = getValidMoves(board, 1);
    if (moves.length === 0) return;

    // Greedy: find move that flips most pieces
    let bestMove = moves[0];
    let bestCount = 0;
    for (const m of moves) {
      const count = getFlips(board, m[0], m[1], 1).length;
      if (count > bestCount) {
        bestCount = count;
        bestMove = m;
      }
    }
    setHelpHint(bestMove);
    onHelpUsed();
    setTimeout(() => setHelpHint(null), 3000);
  };

  const { black, white } = countPieces(board);

  const getStars = useCallback((): number => {
    if (black > white) return 3;
    if (black === white) return 2;
    if (black > 10) return 2;
    return 1;
  }, [black, white]);

  const handleWin = () => {
    onComplete(getStars(), getFloorMeta(FLOOR_NUM).reward);
    onExit();
  };

  const handleConcede = () => {
    onConcede();
    onExit();
  };

  const isValidMove = (r: number, c: number) =>
    currentPlayer === 1 && validMoves.some(([vr, vc]) => vr === r && vc === c);

  const isFlipped = (r: number, c: number) =>
    flippedCells.some(([fr, fc]) => fr === r && fc === c);

  const isHelpHint = (r: number, c: number) =>
    helpHint !== null && helpHint[0] === r && helpHint[1] === c;

  return (
    <div className={styles.container}>
      <div className={styles.scoreBar}>
        <span className={black >= white ? styles.scoreActive : styles.scoreLabel}>
          ⚫ {black}
        </span>
        <span className={styles.turnInfo}>
          {gameOver
            ? language === 'zh' ? '游戏结束' : 'Game Over'
            : currentPlayer === 1
              ? language === 'zh' ? '你的回合' : 'Your Turn'
              : language === 'zh' ? '对方思考中...' : 'AI thinking...'}
        </span>
        <span className={white >= black ? styles.scoreActive : styles.scoreLabel}>
          {white} ⚪
        </span>
      </div>

      <div className={styles.boardWrapper}>
        <div className={styles.board}>
          {board.map((row, r) =>
            row.map((cell, c) => {
              const valid = isValidMove(r, c);
              const flipped = isFlipped(r, c);
              const hint = isHelpHint(r, c);
              return (
                <button
                  key={`${r}-${c}`}
                  className={`${styles.cell} ${valid ? styles.validCell : ''} ${hint ? styles.hintCell : ''}`}
                  onClick={() => handleCellClick(r, c)}
                  disabled={!valid || gameOver || aiThinking}
                >
                  <AnimatePresence mode="wait">
                    {cell === 0 && valid && (
                      <motion.div
                        key="hint"
                        className={styles.validDot}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                    {cell !== 0 && (
                      <motion.div
                        key={`piece-${r}-${c}-${cell}`}
                        className={`${styles.piece} ${cell === 1 ? styles.blackPiece : styles.whitePiece} ${flipped ? styles.flippedPiece : ''}`}
                        initial={flipped ? { scale: 0.6, rotateY: 90 } : { scale: 0 }}
                        animate={{ scale: 1, rotateY: 0 }}
                        transition={flipped ? { type: 'spring', stiffness: 300, damping: 20 } : { type: 'spring', stiffness: 400, damping: 25 }}
                      />
                    )}
                  </AnimatePresence>
                  {hint && cell === 0 && (
                    <motion.div
                      className={styles.hintMarker}
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
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
          <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || gameOver || currentPlayer !== 1 || aiThinking}>
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
              <span className={styles.winEmoji}>{black > white ? '🌟' : black === white ? '🤝' : '💪'}</span>
              <h2 className={styles.winText}>
                {black > white
                  ? (language === 'zh' ? '你赢了！' : 'You Win!')
                  : black === white
                    ? (language === 'zh' ? '平局！' : 'Draw!')
                    : (language === 'zh' ? '再接再厉！' : 'Try Again!')}
              </h2>
              <p className={styles.winInfo}>
                ⚫ {black} : {white} ⚪
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

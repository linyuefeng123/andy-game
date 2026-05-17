import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import GomokuBoard from './GomokuBoard';
import { checkWin, findBestMove } from './gomokuAI';
import styles from './index.module.css';

const BOARD_SIZE = 9;
const WIN_LENGTH = 5;

export type CellState = 0 | 1 | 2; // 0=empty, 1=black(Andy), 2=white(AI)

export default function GomokuGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const [board, setBoard] = useState<CellState[][]>(
    () => Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0) as CellState[])
  );
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<0 | 1 | 2>(0);
  const [lastMove, setLastMove] = useState<[number, number] | null>(null);
  const [winningCells, setWinningCells] = useState<[number, number][]>([]);
  const [helpHint, setHelpHint] = useState<[number, number] | null>(null);

  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(1);
  const randomRate = difficulty === 1 ? 0.4 : difficulty === 2 ? 0.2 : 0.1;

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (board[row][col] !== 0 || winner !== 0 || currentPlayer !== 1) return;
      setHelpHint(null);

      const newBoard = board.map((r) => [...r]) as CellState[][];
      newBoard[row][col] = 1;
      setLastMove([row, col]);

      const win = checkWin(newBoard, row, col, 1, WIN_LENGTH);
      if (win) {
        setWinner(1);
        setWinningCells(win);
        setBoard(newBoard);
        return;
      }

      setBoard(newBoard);
      setCurrentPlayer(2);

      // AI move after a short delay
      setTimeout(() => {
        const aiMove = findBestMove(newBoard, BOARD_SIZE, WIN_LENGTH, randomRate);
        if (aiMove) {
          newBoard[aiMove[0]][aiMove[1]] = 2;
          setLastMove([aiMove[0], aiMove[1]]);

          const aiWin = checkWin(newBoard, aiMove[0], aiMove[1], 2, WIN_LENGTH);
          if (aiWin) {
            setWinner(2);
            setWinningCells(aiWin);
          }
        }
        setBoard([...newBoard.map((r) => [...r])]);
        setCurrentPlayer(1);
      }, 400);
    },
    [board, currentPlayer, winner]
  );

  const handleConcede = () => {
    onConcede();
    onExit();
  };

  const handleHelp = () => {
    if (helpRemaining <= 0 || winner !== 0 || currentPlayer !== 1) return;
    const move = findBestMove(board, BOARD_SIZE, WIN_LENGTH, randomRate);
    if (move) {
      setHelpHint(move);
      onHelpUsed();
      setTimeout(() => setHelpHint(null), 3000);
    }
  };

  const handleWin = () => {
    onExit();
  };

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <span className={styles.turnInfo}>
          {winner === 0
            ? currentPlayer === 1
              ? '🧒 轮到你了！'
              : '🤖 对方思考中...'
            : winner === 1
              ? '🎉 你赢了！'
              : '😊 对方赢了，再试试吧！'}
        </span>
      </div>

      <GomokuBoard
        board={board}
        lastMove={lastMove}
        winningCells={winningCells}
        onCellClick={handleCellClick}
        disabled={currentPlayer !== 1 || winner !== 0}
        helpHint={helpHint}
      />

      {winner === 0 && (
        <div className={styles.actionButtons}>
          <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || currentPlayer !== 1}>
            {helper.emoji} 💡 {helpRemaining}
          </button>
          <button className={styles.skipLink} onClick={handleConcede}>
            跳过这局
          </button>
        </div>
      )}

      {winner !== 0 && (
        <motion.div
          className={styles.winOverlay}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <div className={styles.winContent}>
            <span className={styles.winEmoji}>{winner === 1 ? '🌟' : '💪'}</span>
            <h2 className={styles.winText}>
              {winner === 1 ? '你真棒！' : '再接再厉！'}
            </h2>
            <div className={styles.winButtons}>
              <button className={styles.replayButton} onClick={onReplay}>
                🔄 再玩一次！
              </button>
              <button className={styles.winButton} onClick={handleWin}>
                {winner === 1 ? '⭐ 继续冒险' : '🏠 返回大厅'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

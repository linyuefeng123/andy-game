import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import {
  createInitialBoard, getValidMoves, checkWin, findAIMove,
  isWater, isDen, isTrap,
  ANIMAL_EMOJI,
  type CellState,
} from './jungleAI';
import styles from './index.module.css';

export default function JungleChessGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const [board, setBoard] = useState<CellState[][]>(createInitialBoard);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);
  const [winner, setWinner] = useState<0 | 1 | 2>(0);
  const [helpHint, setHelpHint] = useState<{ from: [number, number]; to: [number, number] } | null>(null);

  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(7);
  const randomRate = difficulty === 1 ? 0.4 : difficulty === 2 ? 0.2 : 0.1;

  const handleCellClick = useCallback((r: number, c: number) => {
    if (winner !== 0 || currentPlayer !== 1) return;
    setHelpHint(null);

    const cell = board[r][c];

    // Click own piece → select
    if (cell?.player === 1) {
      const moves = getValidMoves(r, c, board);
      setSelectedCell([r, c]);
      setValidMoves(moves);
      return;
    }

    // Click valid move target
    if (selectedCell && validMoves.some(([mr, mc]) => mr === r && mc === c)) {
      const [fromR, fromC] = selectedCell;
      const newBoard = board.map((row) => [...row]);
      const captured = newBoard[r][c];
      newBoard[r][c] = newBoard[fromR][fromC];
      newBoard[fromR][fromC] = null;

      if (captured) playSound('click');
      else playSound('click');

      setSelectedCell(null);
      setValidMoves([]);

      const win = checkWin(newBoard);
      if (win) {
        setWinner(win);
        setBoard(newBoard);
        if (win === 1) playSound('win');
        return;
      }

      setBoard(newBoard);
      setCurrentPlayer(2);

      // AI move
      setTimeout(() => {
        const aiMove = findAIMove(newBoard, randomRate);
        if (aiMove) {
          const aiBoard = newBoard.map((row) => [...row]);
          aiBoard[aiMove.to[0]][aiMove.to[1]] = aiBoard[aiMove.from[0]][aiMove.from[1]];
          aiBoard[aiMove.from[0]][aiMove.from[1]] = null;

          const aiWin = checkWin(aiBoard);
          if (aiWin) {
            setWinner(aiWin);
          }
          setBoard(aiBoard);
        }
        setCurrentPlayer(1);
      }, 600);
      return;
    }

    // Click elsewhere → deselect
    setSelectedCell(null);
    setValidMoves([]);
  }, [board, selectedCell, validMoves, currentPlayer, winner]);

  const handleConcede = () => {
    onConcede();
    onExit();
  };

  const handleHelp = () => {
    if (helpRemaining <= 0 || winner !== 0 || currentPlayer !== 1) return;
    const aiMove = findAIMove(board, randomRate);
    if (aiMove) {
      setHelpHint({ from: aiMove.from, to: aiMove.to });
      onHelpUsed();
      setTimeout(() => setHelpHint(null), 3000);
    }
  };

  const handleWin = () => {
    if (winner === 1) {
      onComplete(3);
    } else {
      onComplete(1);
    }
    onExit();
  };

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <span className={styles.turnInfo}>
          {winner === 0
            ? currentPlayer === 1
              ? selectedCell
                ? '👆 选择移动位置'
                : '🧒 选择你的动物'
              : '🤖 对方思考中...'
            : winner === 1
              ? '🎉 你赢了！'
              : '😊 对方赢了，再试试吧！'}
        </span>
      </div>

      <div className={styles.boardWrapper}>
        <div className={styles.board}>
          {board.map((row, r) =>
            row.map((cell, c) => {
              const water = isWater(r, c);
              const den1 = isDen(r, c, 1);
              const den2 = isDen(r, c, 2);
              const trap1 = isTrap(r, c, 1);
              const trap2 = isTrap(r, c, 2);
              const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;
              const isValidTarget = validMoves.some(([mr, mc]) => mr === r && mc === c);

              let cellClass = styles.cell;
              if (water) cellClass = styles.waterCell;
              if (den1 || den2) cellClass = styles.denCell;
              if (trap1 || trap2) cellClass = styles.trapCell;
              const isHelpFrom = helpHint?.from[0] === r && helpHint?.from[1] === c;
              const isHelpTo = helpHint?.to[0] === r && helpHint?.to[1] === c;
              if (isHelpFrom || isHelpTo) cellClass = `${cellClass} ${styles.helpHintCell}`;

              return (
                <div
                  key={`${r}-${c}`}
                  className={`${cellClass} ${isSelected ? styles.selectedCell : ''} ${isValidTarget ? styles.validTarget : ''}`}
                  onClick={() => handleCellClick(r, c)}
                >
                  {cell && (
                    <span className={`${styles.piece} ${cell.player === 1 ? styles.player1 : styles.player2}`}>
                      {ANIMAL_EMOJI[cell.type]}
                      <span className={styles.rankLabel}>{cell.rank}</span>
                    </span>
                  )}
                  {den1 && !cell && <span className={styles.denLabel}>🏠</span>}
                  {den2 && !cell && <span className={styles.denLabel}>🏠</span>}
                  {isValidTarget && !cell && <span className={styles.moveIndicator}>·</span>}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className={styles.hint}>
        💡 {language === 'zh' ? '鼠吃象！狮虎可跳河！进入对方巢穴获胜！' : 'Rat beats elephant! Lion/Tiger jump rivers! Enter enemy den to win!'}
      </div>

      {winner === 0 && (
        <div className={styles.actionButtons}>
          <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || currentPlayer !== 1}>
            {helper.emoji} 💡 {helpRemaining}
          </button>
          <button className={styles.skipLink} onClick={handleConcede}>
            {language === 'zh' ? '跳过这局' : 'Skip'}
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
              {winner === 1
                ? (language === 'zh' ? '你真棒！' : 'You win!')
                : (language === 'zh' ? '再接再厉！' : 'Try again!')}
            </h2>
            <div className={styles.winButtons}>
              <button className={styles.replayButton} onClick={onReplay}>
                🔄 再玩一次！
              </button>
              <button className={styles.winButton} onClick={handleWin}>
                {winner === 1
                  ? (language === 'zh' ? '⭐ 继续冒险' : '⭐ Continue')
                  : (language === 'zh' ? '🏠 返回大厅' : '🏠 Back')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

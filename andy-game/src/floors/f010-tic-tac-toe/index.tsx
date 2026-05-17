import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 10;

type Cell = '' | 'X' | 'O';

function checkWinner(board: Cell[]): { winner: Cell; line: number[] | null } {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];
  for (const l of lines) {
    const [a,b,c] = l;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: l };
    }
  }
  return { winner: null, line: null };
}

function isDraw(board: Cell[]): boolean {
  return board.every(c => c !== '') && checkWinner(board).winner === null;
}

function getAiMove(board: Cell[], randomRate: number): number {
  // Try to win
  for (let i = 0; i < 9; i++) {
    if (board[i] === '') {
      const test = [...board];
      test[i] = 'O';
      if (checkWinner(test).winner === 'O') return i;
    }
  }
  // Block player
  for (let i = 0; i < 9; i++) {
    if (board[i] === '') {
      const test = [...board];
      test[i] = 'X';
      if (checkWinner(test).winner === 'X') return i;
    }
  }
  // Random move based on difficulty
  if (Math.random() < randomRate) {
    const empty = board.map((c, i) => c === '' ? i : -1).filter(i => i >= 0);
    return empty[Math.floor(Math.random() * empty.length)];
  }
  // Center
  if (board[4] === '') return 4;
  // Corners
  const corners = [0,2,6,8].filter(i => board[i] === '');
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
  // Any empty
  const empty = board.map((c, i) => c === '' ? i : -1).filter(i => i >= 0);
  return empty[Math.floor(Math.random() * empty.length)];
}

export default function TicTacToe({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(''));
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<0 | 1 | 2>(0); // 0=none, 1=player, 2=ai
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [playerTurn, setPlayerTurn] = useState(true);
  const [helpHint, setHelpHint] = useState<number | null>(null);

  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);
  const randomRate = difficulty === 1 ? 0.6 : difficulty === 2 ? 0.3 : 0.1;

  const handleCellClick = useCallback((index: number) => {
    if (board[index] !== '' || gameOver || !playerTurn) return;
    setHelpHint(null);

    const newBoard = [...board];
    newBoard[index] = 'X';

    const result = checkWinner(newBoard);
    if (result.winner === 'X') {
      setBoard(newBoard);
      setWinner(1);
      setWinLine(result.line);
      setGameOver(true);
      return;
    }
    if (isDraw(newBoard)) {
      setBoard(newBoard);
      setGameOver(true);
      setWinner(2); // draw counts as loss
      return;
    }

    setBoard(newBoard);
    setPlayerTurn(false);

    // AI move
    setTimeout(() => {
      const aiIdx = getAiMove(newBoard, randomRate);
      newBoard[aiIdx] = 'O';
      const aiResult = checkWinner(newBoard);
      if (aiResult.winner === 'O') {
        setBoard([...newBoard]);
        setWinner(2);
        setWinLine(aiResult.line);
        setGameOver(true);
        setPlayerTurn(true);
        return;
      }
      if (isDraw(newBoard)) {
        setBoard([...newBoard]);
        setGameOver(true);
        setWinner(2);
        setPlayerTurn(true);
        return;
      }
      setBoard([...newBoard]);
      setPlayerTurn(true);
    }, 400);
  }, [board, gameOver, playerTurn, randomRate]);

  const handleHelp = () => {
    if (helpRemaining <= 0 || gameOver || !playerTurn) return;
    // Suggest best move for player (try to find winning/blocking move)
    for (let i = 0; i < 9; i++) {
      if (board[i] === '') {
        const test = [...board];
        test[i] = 'X';
        if (checkWinner(test).winner === 'X') { setHelpHint(i); onHelpUsed(); setTimeout(() => setHelpHint(null), 3000); return; }
      }
    }
    for (let i = 0; i < 9; i++) {
      if (board[i] === '') {
        const test = [...board];
        test[i] = 'O';
        if (checkWinner(test).winner === 'O') { setHelpHint(i); onHelpUsed(); setTimeout(() => setHelpHint(null), 3000); return; }
      }
    }
    if (board[4] === '') { setHelpHint(4); } else {
      const corners = [0,2,6,8].filter(i => board[i] === '');
      if (corners.length) setHelpHint(corners[0]); else {
        const empty = board.map((c, i) => c === '' ? i : -1).filter(i => i >= 0);
        if (empty.length) setHelpHint(empty[0]);
      }
    }
    onHelpUsed();
    setTimeout(() => setHelpHint(null), 3000);
  };

  const handleWin = () => {
    if (winner === 1) onComplete(1);
    onExit();
  };

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
            ? (language === 'zh' ? '🧒 轮到你了！(X)' : '🧒 Your turn! (X)')
            : (language === 'zh' ? '🤖 对方思考中...' : '🤖 AI thinking...')}
        </span>
      </div>

      <div className={styles.boardWrapper}>
        <div className={styles.board}>
          {board.map((cell, i) => (
            <motion.button
              key={i}
              className={`${styles.cell} ${winLine?.includes(i) ? styles.winCell : ''} ${helpHint === i ? styles.hintCell : ''}`}
              onClick={() => handleCellClick(i)}
              disabled={cell !== '' || !playerTurn}
              whileTap={{ scale: 0.9 }}
            >
              {cell === 'X' && <span className={styles.xMark}>✕</span>}
              {cell === 'O' && <span className={styles.oMark}>○</span>}
            </motion.button>
          ))}
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

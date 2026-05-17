import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import type { FloorReward } from '../../store/useGameStore';
import { useGameStore } from '../../store/useGameStore';
import DiamondBoard from './DiamondBoard';
import {
  BOARD_SIZE,
  checkDiamondWin,
  findAIMove,
  getValidMoves,
  getPlayerPieces,
  type Pos,
} from './diamondAI';
import styles from './index.module.css';

export type CellOwner = 0 | 1 | 2; // 0=empty, 1=player(gold), 2=AI(blue)

const INITIAL_BOARD: CellOwner[][] = (() => {
  const b: CellOwner[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(0) as CellOwner[]
  );
  // Player 1 (gold): top row
  b[0][0] = 1; b[0][2] = 1; b[0][4] = 1; b[1][2] = 1;
  // Player 2 (blue): bottom row
  b[4][0] = 2; b[4][2] = 2; b[4][4] = 2; b[3][2] = 2;
  return b;
})();

const REWARD_OPTIONS: FloorReward[] = [
  {
    emoji: '🎲',
    nameZh: '棋盘纪念',
    nameEn: 'Board Souvenir',
    descriptionZh: '带走这个神奇的钻石棋盘！',
    descriptionEn: 'Take this magical diamond board!',
  },
  {
    emoji: '💎',
    nameZh: '闪亮钻石',
    nameEn: 'Shining Diamond',
    descriptionZh: '拿走一颗闪闪发光的钻石！',
    descriptionEn: 'Take a sparkling diamond!',
  },
];

export default function DiamondChessGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const [board, setBoard] = useState<CellOwner[][]>(
    () => INITIAL_BOARD.map((r) => [...r])
  );
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [selectedPiece, setSelectedPiece] = useState<Pos | null>(null);
  const [validMoves, setValidMoves] = useState<Pos[]>([]);
  const [winner, setWinner] = useState<0 | 1 | 2>(0);
  const [winningCells, setWinningCells] = useState<Pos[]>([]);
  const [showRewardChoice, setShowRewardChoice] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: Pos; to: Pos } | null>(null);
  const [helpHint, setHelpHint] = useState<{ from: Pos; to: Pos } | null>(null);

  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(4);
  const randomRate = difficulty === 1 ? 0.4 : difficulty === 2 ? 0.2 : 0.1;

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (winner !== 0 || currentPlayer !== 1) return;
      setHelpHint(null);

      const cell = board[r][c];

      // If clicking own piece → select it
      if (cell === 1) {
        const moves = getValidMoves(r, c, board);
        setSelectedPiece([r, c]);
        setValidMoves(moves);
        return;
      }

      // If a piece is selected and clicking a valid move
      if (selectedPiece && validMoves.some(([mr, mc]) => mr === r && mc === c)) {
        const [fromR, fromC] = selectedPiece;
        const newBoard = board.map((row) => [...row]);
        newBoard[fromR][fromC] = 0;
        newBoard[r][c] = 1;
        setLastMove({ from: [fromR, fromC], to: [r, c] });
        setSelectedPiece(null);
        setValidMoves([]);

        // Check win
        const playerPieces = getPlayerPieces(newBoard, 1);
        const winShape = checkDiamondWin(playerPieces);
        if (winShape) {
          setWinner(1);
          setWinningCells(winShape);
          setBoard(newBoard);
          return;
        }

        setBoard(newBoard);
        setCurrentPlayer(2);

        // AI move
        setTimeout(() => {
          const aiMove = findAIMove(newBoard, randomRate);
          if (aiMove) {
            const { from, to } = aiMove;
            const aiBoard = newBoard.map((row) => [...row]);
            aiBoard[from[0]][from[1]] = 0;
            aiBoard[to[0]][to[1]] = 2;
            setLastMove({ from, to });

            const aiPieces = getPlayerPieces(aiBoard, 2);
            const aiWin = checkDiamondWin(aiPieces);
            if (aiWin) {
              setWinner(2);
              setWinningCells(aiWin);
            }
            setBoard(aiBoard);
          }
          setCurrentPlayer(1);
        }, 500);
        return;
      }

      // Clicking elsewhere → deselect
      setSelectedPiece(null);
      setValidMoves([]);
    },
    [board, selectedPiece, validMoves, currentPlayer, winner]
  );

  const handleConcede = () => {
    onConcede();
    onExit();
  };

  const handleHelp = () => {
    if (helpRemaining <= 0 || winner !== 0 || currentPlayer !== 1) return;
    const aiMove = findAIMove(board, randomRate);
    if (aiMove) {
      setHelpHint(aiMove);
      onHelpUsed();
      setTimeout(() => setHelpHint(null), 3000);
    }
  };

  const handleSelectReward = (reward: FloorReward) => {
    onComplete(3, reward);
    onExit();
  };

  const handleLoseExit = () => {
    onComplete(1);
    onExit();
  };

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <span className={styles.turnInfo}>
          {winner === 0
            ? currentPlayer === 1
              ? selectedPiece
                ? '👆 选择移动位置'
                : '🧒 选择你的钻石'
              : '🤖 对方思考中...'
            : winner === 1
              ? '🎉 你赢了！'
              : '😊 对方赢了，再试试吧！'}
        </span>
      </div>

      <DiamondBoard
        board={board}
        selectedPiece={selectedPiece}
        validMoves={validMoves}
        winningCells={winningCells}
        lastMove={lastMove}
        onCellClick={handleCellClick}
        disabled={currentPlayer !== 1 || winner !== 0}
        helpHint={helpHint}
        showGuide={true}
      />

      {/* Diamond shape hint */}
      <div className={styles.hint}>
        💡 提示：把4颗钻石摆成 ◆ 菱形就赢了！
      </div>

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

      {/* Win with reward choice */}
      <AnimatePresence>
        {winner === 1 && showRewardChoice && (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.rewardModal}
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <span className={styles.rewardTitleEmoji}>🌟</span>
              <h2 className={styles.rewardTitle}>你真棒！</h2>
              <p className={styles.rewardSubtitle}>选择一个奖励带走吧：</p>

              <div className={styles.rewardOptions}>
                {REWARD_OPTIONS.map((reward) => (
                  <motion.button
                    key={reward.emoji}
                    className={styles.rewardOption}
                    onClick={() => handleSelectReward(reward)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className={styles.rewardOptionEmoji}>{reward.emoji}</span>
                    <span className={styles.rewardOptionName}>{reward.nameZh}</span>
                    <span className={styles.rewardOptionDesc}>{reward.descriptionZh}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Win without reward choice (simple) */}
      <AnimatePresence>
        {winner === 1 && !showRewardChoice && (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.rewardModal}
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <span className={styles.rewardTitleEmoji}>🌟</span>
              <h2 className={styles.rewardTitle}>你真棒！</h2>
              <div className={styles.resultButtons}>
                <button className={styles.replayButton} onClick={onReplay}>
                  🔄 再玩一次！
                </button>
                <button className={styles.loseButton} onClick={handleSelectReward.bind(null, REWARD_OPTIONS[0])}>
                  ⭐ 继续冒险
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lose overlay */}
      <AnimatePresence>
        {winner === 2 && (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.loseModal}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <span className={styles.loseEmoji}>💪</span>
              <h2 className={styles.loseText}>再接再厉！</h2>
              <div className={styles.resultButtons}>
                <button className={styles.replayButton} onClick={onReplay}>
                  🔄 再玩一次！
                </button>
                <button className={styles.loseButton} onClick={handleLoseExit}>
                  🏠 返回大厅
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

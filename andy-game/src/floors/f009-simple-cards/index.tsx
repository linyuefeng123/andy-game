import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import {
  createWarDeck, shuffleDeck, isSuitRed,
  type WarCard,
} from './cardAI';
import styles from './index.module.css';

export default function SimpleCardsGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [gameState] = useState(() => {
    const deck = shuffleDeck(createWarDeck());
    const half = Math.floor(deck.length / 2);
    return { playerDeck: deck.slice(0, half), aiDeck: deck.slice(half) };
  });

  const [playerDeck, setPlayerDeck] = useState<WarCard[]>(gameState.playerDeck);
  const [aiDeck, setAiDeck] = useState<WarCard[]>(gameState.aiDeck);
  const [playerCard, setPlayerCard] = useState<WarCard | null>(null);
  const [aiCard, setAiCard] = useState<WarCard | null>(null);
  const [warPile, setWarPile] = useState<WarCard[]>([]);
  const [roundResult, setRoundResult] = useState<'player' | 'ai' | 'war' | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [winner, setWinner] = useState<0 | 1 | 2>(0);
  const [message, setMessage] = useState<string>(language === 'zh' ? '👆 点击出牌！' : '👆 Tap to play!');

  const handlePlay = useCallback(() => {
    if (isPlaying || winner !== 0) return;
    if (playerDeck.length === 0 || aiDeck.length === 0) return;

    setIsPlaying(true);
    playSound('click');

    const pCard = playerDeck[0];
    const newPlayerDeck = playerDeck.slice(1);

    setPlayerCard(pCard);
    setAiCard(null);
    setMessage(language === 'zh' ? '🤖 对方翻牌...' : '🤖 Opponent reveals...');

    setTimeout(() => {
      const aCard = aiDeck[0];
      const newAiDeck = aiDeck.slice(1);
      setAiCard(aCard);

      const pot = [...warPile, pCard, aCard];

      if (pCard.rank > aCard.rank) {
        // Player wins this round
        playSound('win');
        setRoundResult('player');
        setMessage(language === 'zh' ? `你赢了！+${pot.length}张牌` : `You win! +${pot.length} cards`);
        setPlayerDeck([...newPlayerDeck, ...pot]);
        setAiDeck(newAiDeck);
        setWarPile([]);
      } else if (aCard.rank > pCard.rank) {
        // AI wins this round
        playSound('error');
        setRoundResult('ai');
        setMessage(language === 'zh' ? `对方赢了！-${pot.length}张牌` : `Opponent wins! -${pot.length} cards`);
        setAiDeck([...newAiDeck, ...pot]);
        setPlayerDeck(newPlayerDeck);
        setWarPile([]);
      } else {
        // Tie - WAR!
        playSound('click');
        setRoundResult('war');
        setMessage(language === 'zh' ? '⚔️ 平局！比大小！' : '⚔️ Tie! War!');
        setWarPile(pot);
      }

      // Check for game end
      if (newPlayerDeck.length === 0 && pCard.rank <= aCard.rank) {
        setWinner(2);
      } else if (newAiDeck.length === 0 && aCard.rank <= pCard.rank) {
        setWinner(1);
      }

      setIsPlaying(false);
    }, 600);
  }, [isPlaying, winner, playerDeck, aiDeck, warPile, language]);

  const handleConcede = () => {
    onConcede();
    onExit();
  };

  const handleHelp = () => {
    if (helpRemaining <= 0) return;
    // In War, help reveals AI's top card
    if (aiDeck.length > 0) {
      const topCard = aiDeck[0];
      setMessage(language === 'zh'
        ? `💡 对方顶牌是 ${topCard.display}${topCard.suit}`
        : `💡 Opponent's top card is ${topCard.display}${topCard.suit}`);
      onHelpUsed();
    }
  };

  const handleWin = () => {
    if (winner === 1) {
      const meta = getFloorMeta(9);
      onComplete(3, meta.reward);
    } else {
      onComplete(1);
    }
    onExit();
  };

  if (winner !== 0) {
    return (
      <div className={styles.container}>
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
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* AI area */}
      <div className={styles.aiArea}>
        <span className={styles.aiLabel}>
          🤖 {language === 'zh' ? `对方 (${aiDeck.length}张)` : `AI (${aiDeck.length} cards)`}
        </span>
        <div className={styles.cardPile}>
          {aiDeck.length > 0 && (
            <motion.div
              className={`${styles.card} ${styles.faceDown}`}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              🂠
            </motion.div>
          )}
        </div>
        {aiCard && (
          <motion.div
            className={`${styles.card} ${isSuitRed(aiCard.suit) ? styles.redCard : styles.blackCard}`}
            initial={{ rotateY: 180, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <span className={styles.cardSuit}>{aiCard.suit}</span>
            <span className={styles.cardRank}>{aiCard.display}</span>
          </motion.div>
        )}
      </div>

      {/* Round result message */}
      <div className={styles.messageArea}>
        <motion.span
          key={message}
          className={`${styles.message} ${roundResult === 'player' ? styles.msgWin : roundResult === 'ai' ? styles.msgLose : roundResult === 'war' ? styles.msgWar : ''}`}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          {message}
        </motion.span>
        {warPile.length > 0 && (
          <span className={styles.warPileCount}>
            ⚔️ {language === 'zh' ? `奖池: ${warPile.length}张` : `Pot: ${warPile.length} cards`}
          </span>
        )}
      </div>

      {/* Player area */}
      <div className={styles.playerArea}>
        {playerCard && (
          <motion.div
            className={`${styles.card} ${isSuitRed(playerCard.suit) ? styles.redCard : styles.blackCard}`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <span className={styles.cardSuit}>{playerCard.suit}</span>
            <span className={styles.cardRank}>{playerCard.display}</span>
          </motion.div>
        )}
        <div className={styles.cardPile}>
          {playerDeck.length > 0 && (
            <motion.button
              className={`${styles.card} ${styles.faceDown}`}
              onClick={handlePlay}
              whileTap={{ scale: 0.95 }}
              disabled={isPlaying}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              👆
            </motion.button>
          )}
        </div>
        <span className={styles.playerLabel}>
          🧒 {language === 'zh' ? `你 (${playerDeck.length}张)` : `You (${playerDeck.length} cards)`}
        </span>
      </div>

      {/* Action buttons */}
      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || aiDeck.length === 0}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={handleConcede}>
          {language === 'zh' ? '跳过' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import {
  createDeck, shuffleDeck, sortHand, identifyPlay, canBeat, findAIPlay,
  isSuitRed,
  type Card, type Play,
} from './cardAI';
import styles from './index.module.css';

export default function SimpleCardsGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onClaimWin }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const [helpSuggested, setHelpSuggested] = useState<Set<number>>(new Set());

  const [gameState] = useState(() => {
    const deck = shuffleDeck(createDeck());
    const playerHand = sortHand(deck.slice(0, 17));
    const aiHand = sortHand(deck.slice(17, 34));
    const reserve = deck.slice(34); // 8 cards reserve (not used in simplified version)
    return { playerHand, aiHand, reserve };
  });

  const [playerHand, setPlayerHand] = useState<Card[]>(gameState.playerHand);
  const [aiHand, setAiHand] = useState<Card[]>(gameState.aiHand);
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());
  const [lastPlay, setLastPlay] = useState<Play | null>(null);
  const [lastPlayPlayer, setLastPlayPlayer] = useState<1 | 2>(1);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [gameLog, setGameLog] = useState<string[]>([language === 'zh' ? '🎮 你先出牌！' : '🎮 You go first!']);
  const [winner, setWinner] = useState<0 | 1 | 2>(0);
  const [passCount, setPassCount] = useState(0);

  const currentPlay = useMemo(() => {
    const cards = Array.from(selectedCards).map((i) => playerHand[i]);
    return identifyPlay(cards);
  }, [selectedCards, playerHand]);

  const toggleCard = useCallback((idx: number) => {
    if (winner !== 0 || currentPlayer !== 1) return;
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, [winner, currentPlayer]);

  const handlePlay = useCallback(() => {
    if (!currentPlay || winner !== 0 || currentPlayer !== 1) return;
    if (lastPlayPlayer === 1 && lastPlay && !canBeat(currentPlay, lastPlay)) return;
    if (lastPlayPlayer === 2 && lastPlay && !canBeat(currentPlay, lastPlay)) return;

    playSound('click');
    const playedCards = Array.from(selectedCards).map((i) => playerHand[i]);
    const newHand = playerHand.filter((_, i) => !selectedCards.has(i));

    const logEntry = `🧒 ${playedCards.map((c) => c.display).join(' ')}`;
    setGameLog((prev) => [...prev.slice(-4), logEntry]);
    setPlayerHand(newHand);
    setSelectedCards(new Set());
    setLastPlay(currentPlay);
    setLastPlayPlayer(1);
    setPassCount(0);

    if (newHand.length === 0) {
      setWinner(1);
      playSound('win');
      return;
    }

    setCurrentPlayer(2);

    // AI turn
    setTimeout(() => {
      const aiCards = [...aiHand];
      const aiResult = findAIPlay(aiCards, currentPlay);

      if (!aiResult) {
        setGameLog((prev) => [...prev.slice(-4), '🤖 不要']);
        setPassCount((p) => p + 1);
        setCurrentPlayer(1);
        return;
      }

      const aiPlay = identifyPlay(aiResult);
      const newAiHand = aiCards.filter(
        (c) => !aiResult.some((rc) => rc.rank === c.rank && rc.suit === c.suit)
      );

      const logEntry2 = `🤖 ${aiResult.map((c) => c.display).join(' ')}`;
      setGameLog((prev) => [...prev.slice(-4), logEntry2]);
      setAiHand(newAiHand);
      setLastPlay(aiPlay!);
      setLastPlayPlayer(2);
      setPassCount(0);

      if (newAiHand.length === 0) {
        setWinner(2);
        setCurrentPlayer(1);
        return;
      }

      setCurrentPlayer(1);
    }, 800);
  }, [currentPlay, playerHand, aiHand, selectedCards, lastPlay, lastPlayPlayer, winner, currentPlayer]);

  const handlePass = useCallback(() => {
    if (currentPlayer !== 1 || winner !== 0) return;
    playSound('error');

    // Can only pass if there's a play to beat
    if (!lastPlay || lastPlayPlayer === 1) return;

    setGameLog((prev) => [...prev.slice(-4), '🧒 不要']);
    setSelectedCards(new Set());
    setPassCount((p) => p + 1);

    // If both pass, reset
    if (passCount >= 1) {
      setLastPlay(null);
      setLastPlayPlayer(1);
      setPassCount(0);
      setCurrentPlayer(1);
      return;
    }

    setCurrentPlayer(2);

    setTimeout(() => {
      const aiResult = findAIPlay([...aiHand], null); // Free play
      if (aiResult) {
        const aiPlay = identifyPlay(aiResult);
        const newAiHand = aiHand.filter(
          (c) => !aiResult.some((rc) => rc.rank === c.rank && rc.suit === c.suit)
        );
        const logEntry = `🤖 ${aiResult.map((c) => c.display).join(' ')}`;
        setGameLog((prev) => [...prev.slice(-4), logEntry]);
        setAiHand(newAiHand);
        setLastPlay(aiPlay!);
        setLastPlayPlayer(2);

        if (newAiHand.length === 0) {
          setWinner(2);
        }
      }
      setCurrentPlayer(1);
      setPassCount(0);
    }, 800);
  }, [aiHand, currentPlayer, winner, lastPlay, lastPlayPlayer, passCount]);

  const canPlay = currentPlay && (
    !lastPlay || lastPlayPlayer === 1 || canBeat(currentPlay, lastPlay)
  );

  const canPass = lastPlay !== null && lastPlayPlayer === 2;

  const handleConcede = () => {
    onConcede();
    setWinner(2);
    onComplete(1);
  };

  const handleClaimWin = () => {
    onClaimWin();
    setWinner(1);
    onComplete(3);
  };

  const handleHelp = () => {
    if (helpRemaining <= 0 || winner !== 0 || currentPlayer !== 1) return;
    const suggested = findAIPlay([...playerHand], lastPlayPlayer === 2 ? lastPlay : null);
    if (suggested) {
      const indices = new Set<number>();
      for (const sc of suggested) {
        const idx = playerHand.findIndex((c, i) => c.rank === sc.rank && c.suit === sc.suit && !indices.has(i));
        if (idx >= 0) indices.add(idx);
      }
      setHelpSuggested(indices);
      onHelpUsed();
      setTimeout(() => setHelpSuggested(new Set()), 3000);
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
            <button className={styles.winButton} onClick={handleWin}>
              {winner === 1
                ? (language === 'zh' ? '⭐ 继续冒险' : '⭐ Continue')
                : (language === 'zh' ? '🏠 返回大厅' : '🏠 Back')}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* AI hand */}
      <div className={styles.aiArea}>
        <span className={styles.aiLabel}>
          🤖 {language === 'zh' ? `AI (${aiHand.length}张)` : `AI (${aiHand.length} cards)`}
        </span>
        <div className={styles.aiCards}>
          {aiHand.map((_, i) => (
            <span key={i} className={styles.cardBack}>🂠</span>
          ))}
        </div>
      </div>

      {/* Game log */}
      <div className={styles.gameLog}>
        {gameLog.map((log, i) => (
          <div key={i} className={styles.logEntry}>{log}</div>
        ))}
      </div>

      {/* Current play info */}
      <div className={styles.playInfo}>
        {currentPlay && (
          <span className={styles.playType}>
            {currentPlay.type === 'single' ? '单张' :
             currentPlay.type === 'pair' ? '对子' :
             currentPlay.type === 'triple' ? '三条' :
             currentPlay.type === 'bomb' ? '💣 炸弹！' : ''}
          </span>
        )}
        {!canPlay && selectedCards.size > 0 && (
          <span className={styles.invalidPlay}>
            {language === 'zh' ? '❌ 管不上' : '❌ Cannot beat'}
          </span>
        )}
      </div>

      {/* Player hand */}
      <div className={styles.playerArea}>
        <div className={styles.playerCards}>
          {playerHand.map((card, i) => (
            <motion.button
              key={`${card.suit}${card.rank}-${i}`}
              className={`${styles.card} ${selectedCards.has(i) ? styles.cardSelected : ''} ${helpSuggested.has(i) ? styles.cardHelpHint : ''} ${isSuitRed(card.suit) ? styles.redCard : styles.blackCard}`}
              onClick={() => toggleCard(i)}
              whileTap={{ scale: 0.95 }}
              animate={selectedCards.has(i) ? { y: -12 } : { y: 0 }}
            >
              <span className={styles.cardSuit}>{card.suit}</span>
              <span className={styles.cardRank}>{card.display}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className={styles.actionRow}>
        <button className={styles.passButton} onClick={handlePass} disabled={!canPass}>
          {language === 'zh' ? '不要' : 'Pass'}
        </button>
        <button className={styles.playButton} onClick={handlePlay} disabled={!canPlay}>
          {language === 'zh' ? '出牌' : 'Play'}
        </button>
      </div>

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || currentPlayer !== 1}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.concedeButton} onClick={handleConcede}>
          😊 {language === 'zh' ? '认输' : 'Give up'}
        </button>
        <button className={styles.claimWinButton} onClick={handleClaimWin}>
          🏆 {language === 'zh' ? '认赢' : 'I win!'}
        </button>
      </div>
    </div>
  );
}

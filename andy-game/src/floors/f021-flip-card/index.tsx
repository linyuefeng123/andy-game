import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 21;

const EMOJIS = ['🐶', '🐱', '🐰', '🐻', '🐼', '🐨', '🦊', '🐸', '🐯', '🦁'];

interface Card {
  id: number;
  emoji: string;
  revealed: boolean;
  matched: boolean;
}

function getGridConfig(difficulty: 1 | 2 | 3): { cols: number; rows: number; pairs: number } {
  if (difficulty === 1) return { cols: 4, rows: 2, pairs: 4 };
  if (difficulty === 2) return { cols: 4, rows: 3, pairs: 6 };
  return { cols: 4, rows: 4, pairs: 8 };
}

function getFlipTarget(pairs: number): number {
  return pairs * 3;
}

function createCards(pairs: number): Card[] {
  const selected = EMOJIS.slice(0, pairs);
  const deck = [...selected, ...selected];
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.map((emoji, i) => ({ id: i, emoji, revealed: false, matched: false }));
}

export default function FlipCardGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);
  const { cols, rows, pairs } = getGridConfig(difficulty);
  const flipTarget = getFlipTarget(pairs);

  const [cards, setCards] = useState<Card[]>(() => createCards(pairs));
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [flipCount, setFlipCount] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [finished, setFinished] = useState(false);
  const [helpHint, setHelpHint] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  const handleCardClick = useCallback((id: number) => {
    if (locked) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.revealed || card.matched) return;
    if (flippedIds.includes(id)) return;

    setHelpHint(null);
    const newFlipped = [...flippedIds, id];
    setFlippedIds(newFlipped);
    setFlipCount((c) => c + 1);

    // Reveal the card
    const newCards = cards.map((c) => c.id === id ? { ...c, revealed: true } : c);
    setCards(newCards);

    if (newFlipped.length === 2) {
      setLocked(true);
      const [first, second] = newFlipped;
      const card1 = newCards.find((c) => c.id === first)!;
      const card2 = newCards.find((c) => c.id === second)!;

      if (card1.emoji === card2.emoji) {
        // Match found
        setTimeout(() => {
          const matched = newCards.map((c) =>
            c.id === first || c.id === second ? { ...c, matched: true } : c
          );
          setCards(matched);
          setFlippedIds([]);
          setLocked(false);
          const newMatched = matchedPairs + 1;
          setMatchedPairs(newMatched);
          if (newMatched === pairs) {
            setTimeout(() => setFinished(true), 500);
          }
        }, 500);
      } else {
        // No match, flip back
        setTimeout(() => {
          const flipped = newCards.map((c) =>
            c.id === first || c.id === second ? { ...c, revealed: false } : c
          );
          setCards(flipped);
          setFlippedIds([]);
          setLocked(false);
        }, 800);
      }
    }
  }, [cards, flippedIds, locked, matchedPairs, pairs]);

  const handleHelp = () => {
    if (helpRemaining <= 0) return;
    // Find an unmatched card and reveal its pair
    const unmatched = cards.filter((c) => !c.matched && !c.revealed);
    if (unmatched.length < 2) return;
    // Find first card with a matching pair also unmatched
    for (const card of unmatched) {
      const matchCard = cards.find((c) => c.emoji === card.emoji && c.id !== card.id && !c.matched);
      if (matchCard) {
        setHelpHint(matchCard.id);
        onHelpUsed();
        setTimeout(() => setHelpHint(null), 3000);
        return;
      }
    }
  };

  const getStars = () => {
    if (flipCount <= flipTarget) return 3;
    if (flipCount <= flipTarget * 1.5) return 2;
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

  if (finished) {
    const stars = getStars();
    return (
      <div className={styles.container}>
        <motion.div
          className={styles.resultCard}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <div className={styles.resultEmoji}>🃏</div>
          <h2 className={styles.resultTitle}>
            {language === 'zh' ? '全部配对！' : 'All matched!'}
          </h2>
          <p className={styles.resultInfo}>
            {language === 'zh'
              ? `翻牌 ${flipCount} 次 (目标: ${flipTarget})`
              : `${flipCount} flips (target: ${flipTarget})`}
          </p>
          <div className={styles.starRow}>
            {[1, 2, 3].map((i) => (
              <span key={i} className={i <= stars ? styles.starActive : styles.starInactive}>⭐</span>
            ))}
          </div>
          <div className={styles.resultButtons}>
            <button className={styles.replayButton} onClick={onReplay}>
              🔄 {language === 'zh' ? '再玩一次！' : 'Replay!'}
            </button>
            <button className={styles.winButton} onClick={handleWin}>
              ⭐ {language === 'zh' ? '继续冒险' : 'Continue'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.progressRow}>
        <span className={styles.progressText}>
          {language === 'zh' ? `配对: ${matchedPairs}/${pairs}` : `Pairs: ${matchedPairs}/${pairs}`}
        </span>
        <span className={styles.flipText}>
          {language === 'zh' ? `翻牌: ${flipCount}` : `Flips: ${flipCount}`}
        </span>
      </div>

      <div
        className={styles.grid}
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
        }}
      >
        {cards.map((card) => (
          <motion.button
            key={card.id}
            className={`${styles.card} ${card.matched ? styles.cardMatched : ''} ${helpHint === card.id ? styles.cardHint : ''}`}
            onClick={() => handleCardClick(card.id)}
            disabled={card.revealed || card.matched || locked}
            whileTap={{ scale: 0.9 }}
          >
            <AnimatePresence mode="wait">
              {card.revealed || card.matched ? (
                <motion.span
                  key="face"
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={styles.cardFace}
                >
                  {card.emoji}
                </motion.span>
              ) : (
                <motion.span
                  key="back"
                  initial={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={styles.cardBack}
                >
                  ?
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={handleConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 12;

const EMOJIS = ['🐶','🐱','🐰','🦊','🐻','🐼','🐨','🦁','🐯','🐸','🐵','🦄'];

interface Card {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

function createCards(pairs: number): Card[] {
  const selected = EMOJIS.slice(0, pairs);
  const deck = [...selected, ...selected]
    .sort(() => Math.random() - 0.5)
    .map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
  return deck;
}

function getGridSize(difficulty: 1 | 2 | 3): { cols: number; rows: number; pairs: number } {
  if (difficulty === 1) return { cols: 4, rows: 3, pairs: 6 };
  if (difficulty === 2) return { cols: 4, rows: 4, pairs: 8 };
  return { cols: 5, rows: 4, pairs: 10 };
}

export default function MemoryMatch({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);
  const { cols, pairs } = getGridSize(difficulty);
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [cards, setCards] = useState<Card[]>(() => createCards(pairs));
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [flipCount, setFlipCount] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<0 | 1 | 2>(0); // always 1 on win
  const [lockBoard, setLockBoard] = useState(false);
  const [helpRevealed, setHelpRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const allMatched = matchedPairs === pairs;

  useEffect(() => {
    if (allMatched && !gameOver) {
      setGameOver(true);
      setWinner(1);
    }
  }, [allMatched, gameOver]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleCardClick = useCallback((id: number) => {
    if (lockBoard) return;
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;
    if (flippedIds.includes(id)) return;

    const newFlipped = [...flippedIds, id];
    setFlipCount(f => f + 1);

    const newCards = cards.map(c => c.id === id ? { ...c, flipped: true } : c);
    setCards(newCards);

    if (newFlipped.length === 2) {
      setLockBoard(true);
      const [first, second] = newFlipped;
      const card1 = newCards.find(c => c.id === first)!;
      const card2 = newCards.find(c => c.id === second)!;

      if (card1.emoji === card2.emoji) {
        // Match!
        const matched = newCards.map(c =>
          c.id === first || c.id === second ? { ...c, matched: true } : c
        );
        setCards(matched);
        setMatchedPairs(p => p + 1);
        setFlippedIds([]);
        setLockBoard(false);
      } else {
        // No match - flip back after delay
        timerRef.current = setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === first || c.id === second ? { ...c, flipped: false } : c
          ));
          setFlippedIds([]);
          setLockBoard(false);
        }, 800);
      }
    } else {
      setFlippedIds(newFlipped);
    }
  }, [cards, flippedIds, lockBoard]);

  const handleHelp = () => {
    if (helpRemaining <= 0 || gameOver || helpRevealed) return;
    // Briefly reveal all unmatched cards
    setHelpRevealed(true);
    setCards(prev => prev.map(c => c.matched ? c : { ...c, flipped: true }));
    onHelpUsed();
    setTimeout(() => {
      setCards(prev => prev.map(c => c.matched ? c : { ...c, flipped: false }));
      setHelpRevealed(false);
      setFlippedIds([]);
    }, 1500);
  };

  const getStars = useCallback((): number => {
    if (flipCount < pairs * 2) return 3;
    if (flipCount < pairs * 2 + 4) return 2;
    return 1;
  }, [flipCount, pairs]);

  const handleWin = () => {
    if (winner === 1) onComplete(getStars());
    onExit();
  };

  if (gameOver && winner !== 0) {
    const stars = getStars();
    return (
      <div className={styles.container}>
        <motion.div className={styles.winOverlay} initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} transition={{type:'spring',stiffness:200,damping:15}}>
          <div className={styles.winContent}>
            <span className={styles.winEmoji}>{winner === 1 ? '🌟' : '💪'}</span>
            <h2 className={styles.winText}>{winner === 1 ? (language === 'zh' ? '你真棒！' : 'You win!') : (language === 'zh' ? '再接再厉！' : 'Try again!')}</h2>
            <p className={styles.scoreInfo}>{language === 'zh' ? `翻了 ${flipCount} 次` : `${flipCount} flips`} | {'⭐'.repeat(stars)}</p>
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
          {language === 'zh' ? `🧠 找到 ${matchedPairs}/${pairs} 对 | 翻了 ${flipCount} 次` : `🧠 ${matchedPairs}/${pairs} pairs | ${flipCount} flips`}
        </span>
      </div>

      <div className={styles.boardWrapper}>
        <div className={styles.board} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {cards.map(card => (
            <motion.button
              key={card.id}
              className={`${styles.card} ${card.matched ? styles.matched : ''} ${card.flipped ? styles.flipped : ''}`}
              onClick={() => handleCardClick(card.id)}
              disabled={card.flipped || card.matched || lockBoard}
              whileTap={{ scale: card.flipped || card.matched ? 1 : 0.92 }}
              animate={{ rotateY: card.flipped || card.matched ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <span className={styles.cardFace}>
                {(card.flipped || card.matched) ? card.emoji : '❓'}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || gameOver || helpRevealed}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={onConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

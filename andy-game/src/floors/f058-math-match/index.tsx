import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import styles from './index.module.css';

interface MathPair {
  expression: string;
  answer: string;
}

interface Card {
  id: number;
  content: string;
  pairId: number;
  type: 'expression' | 'answer';
  flipped: boolean;
  matched: boolean;
}

// 3 rounds: Addition (answers: 3,5,7,8,9,10), Subtraction (answers: 6,5,3,8,2,4), Multiplication (answers: 6,8,10,12,15,20)
// All answers unique within each round so matching is unambiguous
const GAME_CONFIG: MathPair[][] = [
  [
    { expression: '1+2', answer: '3' },
    { expression: '4+1', answer: '5' },
    { expression: '3+4', answer: '7' },
    { expression: '2+6', answer: '8' },
    { expression: '5+4', answer: '9' },
    { expression: '6+4', answer: '10' },
  ],
  [
    { expression: '9-3', answer: '6' },
    { expression: '8-3', answer: '5' },
    { expression: '7-4', answer: '3' },
    { expression: '10-2', answer: '8' },
    { expression: '6-4', answer: '2' },
    { expression: '9-5', answer: '4' },
  ],
  [
    { expression: '2×3', answer: '6' },
    { expression: '2×4', answer: '8' },
    { expression: '2×5', answer: '10' },
    { expression: '3×4', answer: '12' },
    { expression: '3×5', answer: '15' },
    { expression: '4×5', answer: '20' },
  ],
];

function createRoundCards(pairs: MathPair[]): Card[] {
  const cards: Card[] = [];
  let id = 0;
  pairs.forEach((pair, pairId) => {
    cards.push({ id: id++, content: pair.expression, pairId, type: 'expression', flipped: false, matched: false });
    cards.push({ id: id++, content: pair.answer, pairId, type: 'answer', flipped: false, matched: false });
  });
  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards.map((c, i) => ({ ...c, id: i }));
}

export default function MathMatchGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [round, setRound] = useState(0);
  const [cards, setCards] = useState<Card[]>(() => createRoundCards(GAME_CONFIG[0]));
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [flipCount, setFlipCount] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [lockBoard, setLockBoard] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [totalFlips, setTotalFlips] = useState(0);
  const [helpRevealed, setHelpRevealed] = useState(false);
  const [showRoundIntro, setShowRoundIntro] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const roundIntroTimer = useRef<ReturnType<typeof setTimeout>>();

  const currentPairs = GAME_CONFIG[round];
  const allMatched = matchedPairs === currentPairs.length;

  useEffect(() => {
    if (allMatched && !gameComplete) {
      const t = setTimeout(() => {
        if (round < GAME_CONFIG.length - 1) {
          const nextRound = round + 1;
          setRound(nextRound);
          setCards(createRoundCards(GAME_CONFIG[nextRound]));
          setFlippedIds([]);
          setFlipCount(0);
          setMatchedPairs(0);
          setShowRoundIntro(true);
        } else {
          setGameComplete(true);
        }
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [allMatched, gameComplete, round]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (roundIntroTimer.current) clearTimeout(roundIntroTimer.current);
    };
  }, []);

  useEffect(() => {
    if (showRoundIntro) {
      roundIntroTimer.current = setTimeout(() => setShowRoundIntro(false), 1500);
    }
  }, [showRoundIntro]);

  const handleCardClick = useCallback((id: number) => {
    if (lockBoard) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.flipped || card.matched) return;
    if (flippedIds.includes(id)) return;

    playSound('click');
    setFlipCount((f) => f + 1);
    setTotalFlips((t) => t + 1);

    const newCards = cards.map((c) => c.id === id ? { ...c, flipped: true } : c);
    setCards(newCards);

    const newFlipped = [...flippedIds, id];

    if (newFlipped.length === 2) {
      setLockBoard(true);
      const [first, second] = newFlipped;
      const card1 = newCards.find((c) => c.id === first)!;
      const card2 = newCards.find((c) => c.id === second)!;

      if (card1.pairId === card2.pairId && card1.type !== card2.type) {
        playSound('ding');
        const matched = newCards.map((c) =>
          c.id === first || c.id === second ? { ...c, matched: true } : c
        );
        setCards(matched);
        setMatchedPairs((p) => p + 1);
        setFlippedIds([]);
        setLockBoard(false);
      } else {
        playSound('error');
        timerRef.current = setTimeout(() => {
          setCards((prev) => prev.map((c) =>
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
    if (helpRemaining <= 0 || gameComplete || helpRevealed) return;
    setHelpRevealed(true);
    setCards((prev) => prev.map((c) => c.matched ? c : { ...c, flipped: true }));
    onHelpUsed();
    setTimeout(() => {
      setCards((prev) => prev.map((c) => c.matched ? c : { ...c, flipped: false }));
      setHelpRevealed(false);
      setFlippedIds([]);
    }, 1500);
  };

  const getStars = useCallback((): number => {
    if (totalFlips < 12) return 3;
    if (totalFlips < 18) return 2;
    return 1;
  }, [totalFlips]);

  const handleWin = useCallback(() => {
    const stars = getStars();
    onComplete(stars, { emoji: '🧮', nameZh: '算术达人', nameEn: 'Math Matcher' });
    onExit();
  }, [getStars, onComplete, onExit]);

  if (gameComplete) {
    const stars = getStars();
    return (
      <div className={styles.container}>
        <motion.div
          className={styles.winOverlay}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <div className={styles.winContent}>
            <span className={styles.winEmoji}>🧮</span>
            <h2 className={styles.winText}>
              {language === 'zh' ? '算式配对完成！' : 'Math Match Complete!'}
            </h2>
            <p className={styles.winSub}>
              {language === 'zh'
                ? `共翻了 ${totalFlips} 次`
                : `${totalFlips} total flips`}
            </p>
            <div className={styles.starRow}>
              {[1, 2, 3].map((i) => (
                <span key={i} className={i <= stars ? styles.starActive : styles.starInactive}>⭐</span>
              ))}
            </div>
            <div className={styles.winButtons}>
              <button className={styles.replayButton} onClick={onReplay}>
                🔄 {language === 'zh' ? '再玩一次！' : 'Play Again!'}
              </button>
              <button className={styles.winButton} onClick={handleWin}>
                {stars >= 2 ? (language === 'zh' ? '⭐ 继续冒险' : '⭐ Continue') : (language === 'zh' ? '🏠 返回大厅' : '🏠 Lobby')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (showRoundIntro) {
    const roundLabels = [
      language === 'zh' ? '加法' : 'Addition',
      language === 'zh' ? '减法' : 'Subtraction',
      language === 'zh' ? '乘法' : 'Multiplication',
    ];
    return (
      <div className={styles.container}>
        <motion.div
          className={styles.roundIntro}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.2 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <span className={styles.roundIntroEmoji}>🧮</span>
          <h2 className={styles.roundIntroText}>
            {language === 'zh' ? `第 ${round + 1} 轮` : `Round ${round + 1}`}
          </h2>
          <p className={styles.roundIntroSub}>
            {roundLabels[round] || ''}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <span className={styles.roundBadge}>
          {language === 'zh' ? `第 ${round + 1}/${GAME_CONFIG.length} 轮` : `Round ${round + 1}/${GAME_CONFIG.length}`}
        </span>
        <span className={styles.flipInfo}>
          {language === 'zh'
            ? `配对 ${matchedPairs}/${currentPairs.length} | 翻牌 ${flipCount} 次`
            : `${matchedPairs}/${currentPairs.length} pairs | ${flipCount} flips`}
        </span>
      </div>

      <p className={styles.instruction}>
        {language === 'zh'
          ? '翻开两张牌，把算式和正确答案配对！'
          : 'Flip two cards, match the expression with its answer!'}
      </p>

      <div className={styles.boardWrapper}>
        <div className={styles.board}>
          {cards.map((card) => (
            <motion.button
              key={card.id}
              className={`${styles.card} ${card.matched ? styles.matched : ''} ${card.flipped ? styles.flipped : ''}`}
              onClick={() => handleCardClick(card.id)}
              disabled={card.flipped || card.matched || lockBoard}
              whileTap={card.flipped || card.matched ? undefined : { scale: 0.92 }}
              animate={{ rotateY: card.flipped || card.matched ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <span className={styles.cardFace}>
                {(card.flipped || card.matched) ? card.content : '?'}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || gameComplete || helpRevealed}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={onConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

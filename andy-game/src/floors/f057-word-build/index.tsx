import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import styles from './index.module.css';

const FLOOR_NUM = 57;

interface RoundData {
  letters: string[];
  validWords: string[];
}

const ROUNDS: RoundData[] = [
  {
    letters: ['C', 'A', 'T', 'S', 'E', 'R'],
    validWords: ['CAT', 'CAR', 'CARE', 'CARS', 'CAST', 'CASE', 'RATS', 'RATE', 'REST', 'SEAT', 'TEAR', 'ARTS', 'EAST', 'EAT', 'ATE', 'EAR', 'ARE', 'SAT', 'SET', 'ERA', 'SEA', 'TEA', 'ACT', 'ACE', 'ARC'],
  },
  {
    letters: ['B', 'I', 'G', 'H', 'T', 'S'],
    validWords: ['BIG', 'HIT', 'HIS', 'BITS', 'SIGH', 'THIS', 'GIST', 'SIT', 'BIT', 'ITS', 'GIT', 'HITS', 'BITS'],
  },
  {
    letters: ['P', 'L', 'A', 'N', 'E', 'T'],
    validWords: ['PLAN', 'PLANE', 'PLANT', 'PANE', 'PANT', 'PEN', 'PET', 'PAT', 'PAN', 'LAP', 'LET', 'LANE', 'LATE', 'NEAT', 'NET', 'NAP', 'TAP', 'TEN', 'EAT', 'ATE', 'ANT', 'APE', 'TALE', 'PALE'],
  },
];

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function WordBuildGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [round, setRound] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [foundWords, setFoundWords] = useState<Set<string>>(() => new Set());
  const [allFoundWords, setAllFoundWords] = useState<string[]>([]);
  const [shakeWrong, setShakeWrong] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [shuffledLetters, setShuffledLetters] = useState<string[]>(() => shuffleArray(ROUNDS[0].letters));
  const [showRoundIntro, setShowRoundIntro] = useState(true);
  const [helpRevealed, setHelpRevealed] = useState(false);
  const roundIntroTimer = useRef<ReturnType<typeof setTimeout>>();

  const currentRound = ROUNDS[round];
  const currentWord = selectedIndices.map((i) => shuffledLetters[i]).join('');

  const canSubmit = selectedIndices.length >= 3 && selectedIndices.length <= 4;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;

    const word = selectedIndices.map((i) => shuffledLetters[i]).join('');

    if (currentRound.validWords.includes(word) && !foundWords.has(word)) {
      playSound('win');
      setFoundWords((prev) => new Set(prev).add(word));
      setAllFoundWords((prev) => [...prev, word]);
    } else if (foundWords.has(word)) {
      playSound('error');
      setShakeWrong(true);
      setTimeout(() => setShakeWrong(false), 500);
    } else {
      playSound('error');
      setShakeWrong(true);
      setTimeout(() => setShakeWrong(false), 500);
    }

    setSelectedIndices([]);
  }, [canSubmit, selectedIndices, shuffledLetters, currentRound, foundWords]);

  const handleLetterClick = useCallback((idx: number) => {
    if (selectedIndices.includes(idx)) return;
    if (selectedIndices.length >= 6) return;
    playSound('click');
    setSelectedIndices((prev) => [...prev, idx]);
  }, [selectedIndices]);

  const handleSlotClick = useCallback((slotIdx: number) => {
    playSound('click');
    setSelectedIndices((prev) => {
      if (slotIdx >= prev.length) return prev;
      // Remove this slot and all after it (since later slots depend on earlier ones)
      return prev.slice(0, slotIdx);
    });
  }, []);

  const handleClear = useCallback(() => {
    setSelectedIndices([]);
  }, []);

  const handleNextRound = useCallback(() => {
    if (round < ROUNDS.length - 1) {
      const nextRound = round + 1;
      setRound(nextRound);
      setShuffledLetters(shuffleArray(ROUNDS[nextRound].letters));
      setSelectedIndices([]);
      setFoundWords(new Set());
      setShowRoundIntro(true);
      if (roundIntroTimer.current) clearTimeout(roundIntroTimer.current);
      roundIntroTimer.current = setTimeout(() => setShowRoundIntro(false), 1500);
    } else {
      setGameComplete(true);
    }
  }, [round]);

  const handleHelp = useCallback(() => {
    if (helpRemaining <= 0 || gameComplete || helpRevealed) return;
    // Reveal one unfound word
    const unfound = currentRound.validWords.filter((w) => !foundWords.has(w) && w.length >= 3 && w.length <= 4);
    if (unfound.length === 0) return;
    setHelpRevealed(true);
    onHelpUsed();
    const hint = unfound[0];
    // Flash the hint briefly
    setAllFoundWords((prev) => [...prev, `💡 ${hint}`]);
    setTimeout(() => {
      setHelpRevealed(false);
    }, 1000);
  }, [helpRemaining, gameComplete, helpRevealed, currentRound, foundWords, onHelpUsed]);

  const getStars = useCallback((): number => {
    if (allFoundWords.length >= 6) return 3;
    if (allFoundWords.length >= 4) return 2;
    return 1;
  }, [allFoundWords]);

  const handleWin = useCallback(() => {
    const stars = getStars();
    onComplete(stars, { emoji: '✏️', nameZh: '拼字达人', nameEn: 'Word Builder' });
    onExit();
  }, [getStars, onComplete, onExit]);

  // Auto-dismiss round intro
  useState(() => {
    roundIntroTimer.current = setTimeout(() => setShowRoundIntro(false), 1500);
  });

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
            <span className={styles.winEmoji}>✏️</span>
            <h2 className={styles.winText}>
              {language === 'zh' ? '拼字完成！' : 'Word Build Complete!'}
            </h2>
            <p className={styles.winSub}>
              {language === 'zh'
                ? `共找到 ${allFoundWords.length} 个单词`
                : `Found ${allFoundWords.length} words total`}
            </p>
            <div className={styles.starRow}>
              {[1, 2, 3].map((i) => (
                <span key={i} className={i <= stars ? styles.starActive : styles.starInactive}>⭐</span>
              ))}
            </div>
            <div className={styles.foundList}>
              {allFoundWords.map((w, i) => (
                <span key={i} className={styles.foundTag}>{w}</span>
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
    return (
      <div className={styles.container}>
        <motion.div
          className={styles.roundIntro}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.2 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <span className={styles.roundIntroEmoji}>✏️</span>
          <h2 className={styles.roundIntroText}>
            {language === 'zh' ? `第 ${round + 1} 轮` : `Round ${round + 1}`}
          </h2>
          <div className={styles.roundLetters}>
            {ROUNDS[round].letters.map((l, i) => (
              <span key={i} className={styles.roundLetter}>{l}</span>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  const roundFound = allFoundWords.filter((w) => !w.startsWith('💡') && currentRound.validWords.includes(w)).length;

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <span className={styles.roundBadge}>
          {language === 'zh' ? `第 ${round + 1}/${ROUNDS.length} 轮` : `Round ${round + 1}/${ROUNDS.length}`}
        </span>
        <span className={styles.foundCount}>
          {language === 'zh' ? `已找到 ${allFoundWords.length} 个词` : `${allFoundWords.length} words found`}
        </span>
      </div>

      <p className={styles.instruction}>
        {language === 'zh'
          ? '点击字母拼出3-4个字母的英语单词，然后提交！'
          : 'Tap letters to spell 3-4 letter words, then submit!'}
      </p>

      {/* Letter tiles */}
      <div className={styles.tileRow}>
        {shuffledLetters.map((letter, idx) => {
          const isUsed = selectedIndices.includes(idx);
          return (
            <motion.button
              key={idx}
              className={`${styles.tile} ${isUsed ? styles.tileUsed : ''}`}
              onClick={() => handleLetterClick(idx)}
              disabled={isUsed}
              whileTap={!isUsed ? { scale: 0.9 } : undefined}
              layout
            >
              {letter}
            </motion.button>
          );
        })}
      </div>

      {/* Current word slots */}
      <div className={`${styles.slotRow} ${shakeWrong ? styles.shakeWrong : ''}`}>
        {selectedIndices.map((letterIdx, slotIdx) => (
          <motion.button
            key={slotIdx}
            className={styles.slot}
            onClick={() => handleSlotClick(slotIdx)}
            whileTap={{ scale: 0.9 }}
            layout
          >
            {shuffledLetters[letterIdx]}
          </motion.button>
        ))}
        {selectedIndices.length === 0 && (
          <span className={styles.slotPlaceholder}>
            {language === 'zh' ? '点击上方字母' : 'Tap letters above'}
          </span>
        )}
      </div>

      {/* Submit / Clear buttons */}
      <div className={styles.actionRow}>
        <button
          className={styles.clearButton}
          onClick={handleClear}
          disabled={selectedIndices.length === 0}
        >
          {language === 'zh' ? '清除' : 'Clear'}
        </button>
        <button
          className={styles.submitButton}
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {language === 'zh' ? '提交 ✓' : 'Submit ✓'}
        </button>
      </div>

      {/* Found words this round */}
      {roundFound > 0 && (
        <div className={styles.foundArea}>
          <span className={styles.foundLabel}>
            {language === 'zh' ? '本轮找到：' : 'Found this round:'}
          </span>
          <div className={styles.foundList}>
            {allFoundWords
              .filter((w) => !w.startsWith('💡') && currentRound.validWords.includes(w))
              .map((w, i) => (
                <span key={i} className={styles.foundTag}>{w}</span>
              ))}
          </div>
        </div>
      )}

      {/* Next round / Finish button */}
      <button className={styles.nextButton} onClick={handleNextRound}>
        {round < ROUNDS.length - 1
          ? (language === 'zh' ? `下一轮 →` : `Next Round →`)
          : (language === 'zh' ? '完成！' : 'Finish!')}
      </button>

      <div className={styles.bottomActions}>
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

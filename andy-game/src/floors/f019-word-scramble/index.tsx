import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import styles from './index.module.css';

const FLOOR_NUM = 19;

interface WordEntry {
  word: string;
  emoji: string;
  category: string;
}

const WORDS: WordEntry[] = [
  // Animals (3-4 letters)
  { word: 'cat', emoji: '🐱', category: 'animal' },
  { word: 'dog', emoji: '🐶', category: 'animal' },
  { word: 'pig', emoji: '🐷', category: 'animal' },
  { word: 'cow', emoji: '🐮', category: 'animal' },
  { word: 'hen', emoji: '🐔', category: 'animal' },
  { word: 'fox', emoji: '🦊', category: 'animal' },
  { word: 'bat', emoji: '🦇', category: 'animal' },
  { word: 'bear', emoji: '🐻', category: 'animal' },
  { word: 'bird', emoji: '🐦', category: 'animal' },
  { word: 'fish', emoji: '🐟', category: 'animal' },
  { word: 'frog', emoji: '🐸', category: 'animal' },
  { word: 'duck', emoji: '🦆', category: 'animal' },
  // Colors (4-5 letters)
  { word: 'red', emoji: '🔴', category: 'color' },
  { word: 'blue', emoji: '🔵', category: 'color' },
  { word: 'pink', emoji: '🩷', category: 'color' },
  { word: 'gold', emoji: '🟡', category: 'color' },
  { word: 'green', emoji: '🟢', category: 'color' },
  { word: 'white', emoji: '⚪', category: 'color' },
  { word: 'black', emoji: '⚫', category: 'color' },
  // Numbers (3-5 letters)
  { word: 'one', emoji: '1️⃣', category: 'number' },
  { word: 'two', emoji: '2️⃣', category: 'number' },
  { word: 'six', emoji: '6️⃣', category: 'number' },
  { word: 'ten', emoji: '🔟', category: 'number' },
  { word: 'four', emoji: '4️⃣', category: 'number' },
  { word: 'five', emoji: '5️⃣', category: 'number' },
  { word: 'nine', emoji: '9️⃣', category: 'number' },
  { word: 'three', emoji: '3️⃣', category: 'number' },
  { word: 'seven', emoji: '7️⃣', category: 'number' },
];

function getWordLengthRange(difficulty: 1 | 2 | 3): [number, number] {
  if (difficulty === 1) return [3, 4];
  if (difficulty === 2) return [4, 5];
  return [5, 6];
}

function scramble(word: string): string[] {
  const letters = word.split('');
  // Fisher-Yates shuffle, ensure it's different from original
  let scrambled: string[];
  do {
    scrambled = [...letters];
    for (let i = scrambled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
    }
  } while (scrambled.join('') === word && word.length > 1);
  return scrambled;
}

export default function WordScrambleGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);
  const [minLen, maxLen] = getWordLengthRange(difficulty);

  const pickWord = useCallback((): WordEntry => {
    const eligible = WORDS.filter(
      (w) => w.word.length >= minLen && w.word.length <= maxLen
    );
    return eligible[Math.floor(Math.random() * eligible.length)];
  }, [minLen, maxLen]);

  const [currentWord, setCurrentWord] = useState<WordEntry>(() => pickWord());
  const [scrambledLetters, setScrambledLetters] = useState<string[]>(() => scramble(currentWord.word));
  const [playerSlots, setPlayerSlots] = useState<(string | null)[]>(
    () => Array(currentWord.word.length).fill(null)
  );
  const [usedIndices, setUsedIndices] = useState<Set<number>>(() => new Set());
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [totalWrong, setTotalWrong] = useState(0);
  const [shakeWrong, setShakeWrong] = useState(false);

  const isSlotFull = useMemo(
    () => playerSlots.every((s) => s !== null),
    [playerSlots]
  );

  const isCorrect = useMemo(
    () => playerSlots.join('') === currentWord.word,
    [playerSlots, currentWord.word]
  );

  // Check when all slots are filled
  const checkAnswer = useCallback(() => {
    const answer = playerSlots.join('');
    if (answer === currentWord.word) {
      playSound('win');
      setWordsCompleted((c) => c + 1);
      // After brief celebration, go to result
      setTimeout(() => setCompleted(true), 600);
    } else {
      playSound('error');
      setWrongAttempts((w) => w + 1);
      setTotalWrong((t) => t + 1);
      setShakeWrong(true);
      setTimeout(() => {
        // Reset player slots
        setPlayerSlots(Array(currentWord.word.length).fill(null));
        setUsedIndices(new Set());
        setShakeWrong(false);
      }, 600);
    }
  }, [playerSlots, currentWord.word]);

  // Auto-check when all slots filled
  const prevSlotFull = useState(false);
  if (isSlotFull && !prevSlotFull[0]) {
    prevSlotFull[0] = true;
    setTimeout(() => checkAnswer(), 300);
  } else if (!isSlotFull && prevSlotFull[0]) {
    prevSlotFull[0] = false;
  }

  const handleLetterTap = useCallback((idx: number) => {
    if (usedIndices.has(idx) || completed) return;
    const letter = scrambledLetters[idx];
    // Find first empty slot
    const slotIdx = playerSlots.findIndex((s) => s === null);
    if (slotIdx === -1) return;

    const newSlots = [...playerSlots];
    newSlots[slotIdx] = letter;
    setPlayerSlots(newSlots);

    const newUsed = new Set(usedIndices);
    newUsed.add(idx);
    setUsedIndices(newUsed);
    playSound('click');
  }, [scrambledLetters, playerSlots, usedIndices, completed]);

  const handleSlotTap = useCallback((slotIdx: number) => {
    if (playerSlots[slotIdx] === null || completed) return;
    // Remove letter from slot, find which scrambled index it came from
    const letter = playerSlots[slotIdx];
    const newSlots = [...playerSlots];
    newSlots[slotIdx] = null;
    setPlayerSlots(newSlots);

    // Find the first used index with this letter to free it
    for (let i = 0; i < scrambledLetters.length; i++) {
      if (usedIndices.has(i) && scrambledLetters[i] === letter) {
        // Check if this index corresponds to this slot
        // We need to be more precise - reconstruct from order
        break;
      }
    }

    // Simpler approach: just remove the last added matching index
    const usedArr = [...usedIndices].sort((a, b) => a - b);
    for (let i = usedArr.length - 1; i >= 0; i--) {
      const ui = usedArr[i];
      if (scrambledLetters[ui] === letter) {
        // Check if this index maps to this slot
        // Rebuild slot-to-index mapping
        const slotMapping: Map<number, number> = new Map();
        const tempUsed = new Set<number>();
        for (const uIdx of usedArr) {
          if (uIdx === ui && slotIdx === [...slotMapping.values()].indexOf(ui) === -1) {
            // skip this one
            continue;
          }
          tempUsed.add(uIdx);
        }
        break;
      }
    }

    // Actually, simpler: rebuild usedIndices from remaining slots
    const newUsed = new Set<number>();
    const remainingSlots = newSlots.filter((s) => s !== null);
    // We need to re-map, but it's complex. Just allow removing from slot and
    // free up the corresponding index. Use a simpler tracking approach.
    // Track slot-to-source mapping
    setUsedIndices((prevUsed) => {
      const usedArr = [...prevUsed];
      // Remove the last added index that matches
      for (let i = usedArr.length - 1; i >= 0; i--) {
        if (scrambledLetters[usedArr[i]] === letter) {
          const newSet = new Set(usedArr);
          newSet.delete(usedArr[i]);
          return newSet;
        }
      }
      return prevUsed;
    });
  }, [playerSlots, scrambledLetters, usedIndices, completed]);

  const handleHelp = () => {
    if (helpRemaining <= 0 || completed) return;
    // Place the next correct letter
    const nextSlot = playerSlots.findIndex((s) => s === null);
    if (nextSlot === -1) return;
    const correctLetter = currentWord.word[nextSlot];

    // Find a scrambled letter that matches
    for (let i = 0; i < scrambledLetters.length; i++) {
      if (!usedIndices.has(i) && scrambledLetters[i] === correctLetter) {
        const newSlots = [...playerSlots];
        newSlots[nextSlot] = correctLetter;
        setPlayerSlots(newSlots);
        const newUsed = new Set(usedIndices);
        newUsed.add(i);
        setUsedIndices(newUsed);
        onHelpUsed();
        return;
      }
    }
  };

  const getStars = () => {
    if (totalWrong < 3) return 3;
    if (totalWrong < 6) return 2;
    return 1;
  };

  const handleWin = () => {
    const stars = getStars();
    const reward = getFloorMeta(FLOOR_NUM).reward;
    onComplete(stars, reward);
    onExit();
  };

  const handleConcede = () => {
    onConcede();
    onExit();
  };

  if (completed) {
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
            <span className={styles.winEmoji}>🔤</span>
            <h2 className={styles.winText}>
              {language === 'zh' ? '拼对了！' : 'Correct!'}
            </h2>
            <p className={styles.winSub}>
              {language === 'zh'
                ? `${currentWord.emoji} ${currentWord.word.toUpperCase()}`
                : `${currentWord.emoji} ${currentWord.word.toUpperCase()}`}
            </p>
            {totalWrong > 0 && (
              <p className={styles.winMistakes}>
                {language === 'zh' ? `错误尝试: ${totalWrong} 次` : `${totalWrong} wrong attempts`}
              </p>
            )}
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

  return (
    <div className={styles.container}>
      <div className={styles.hintArea}>
        <span className={styles.hintEmoji}>{currentWord.emoji}</span>
        <span className={styles.hintCategory}>
          {currentWord.category === 'animal'
            ? (language === 'zh' ? '动物' : 'Animal')
            : currentWord.category === 'color'
              ? (language === 'zh' ? '颜色' : 'Color')
              : (language === 'zh' ? '数字' : 'Number')}
        </span>
      </div>

      <p className={styles.instruction}>
        {language === 'zh'
          ? '按顺序点击字母，拼出正确的单词！'
          : 'Tap letters in order to spell the word!'}
      </p>

      {/* Answer slots */}
      <div className={`${styles.slotRow} ${shakeWrong ? styles.shakeWrong : ''}`}>
        {playerSlots.map((letter, idx) => (
          <motion.button
            key={idx}
            className={`${styles.slot} ${letter !== null ? styles.slotFilled : ''}`}
            onClick={() => handleSlotTap(idx)}
            whileTap={{ scale: 0.9 }}
            layout
          >
            {letter !== null ? letter.toUpperCase() : ''}
          </motion.button>
        ))}
      </div>

      {/* Scrambled letter tiles */}
      <div className={styles.tileRow}>
        {scrambledLetters.map((letter, idx) => (
          <motion.button
            key={idx}
            className={`${styles.tile} ${usedIndices.has(idx) ? styles.tileUsed : ''}`}
            onClick={() => handleLetterTap(idx)}
            disabled={usedIndices.has(idx) || completed}
            whileTap={!usedIndices.has(idx) ? { scale: 0.9 } : undefined}
            layout
          >
            {letter.toUpperCase()}
          </motion.button>
        ))}
      </div>

      {wrongAttempts > 0 && (
        <span className={styles.wrongCount}>
          {language === 'zh' ? `错误: ${totalWrong}` : `Wrong: ${totalWrong}`}
        </span>
      )}

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || completed}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={handleConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

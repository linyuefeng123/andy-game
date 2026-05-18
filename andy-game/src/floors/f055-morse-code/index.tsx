import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import styles from './index.module.css';

const FLOOR_NUM = 55;
const TOTAL_ROUNDS = 8;

// Morse code lookup
const MORSE: Record<string, string> = {
  A: '.-',    B: '-...',  C: '-.-.',  D: '-..',
  E: '.',     F: '..-.',  G: '--.',   H: '....',
  I: '..',    J: '.---',  K: '-.-',   L: '.-..',
  M: '--',    N: '-.',    O: '---',   P: '.--.',
  Q: '--.-',  R: '.-.',   S: '...',   T: '-',
  U: '..-',   V: '...-',  W: '.--',   X: '-..-',
  Y: '-.--',  Z: '--..',
};

// Letters used in the game (common/easy morse)
const GAME_LETTERS = ['A', 'B', 'C', 'D', 'E', 'S', 'O', 'T'];

interface Round {
  letter: string;
  morse: string;
  options: string[]; // 3 options including the correct one
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateRounds(): Round[] {
  const letters = shuffle(GAME_LETTERS);
  // Ensure we have 8 rounds; if fewer than 8 unique, allow repeats
  const picked: string[] = [];
  for (let i = 0; picked.length < TOTAL_ROUNDS; i++) {
    picked.push(letters[i % letters.length]);
  }

  return picked.map((letter) => {
    // Pick 2 wrong options from GAME_LETTERS (different from the answer)
    const wrongOptions = shuffle(GAME_LETTERS.filter((l) => l !== letter)).slice(0, 2);
    const options = shuffle([letter, ...wrongOptions]);
    return {
      letter,
      morse: MORSE[letter],
      options,
    };
  });
}

export default function MorseCodeGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [rounds] = useState<Round[]>(() => generateRounds());
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [finished, setFinished] = useState(false);
  const [eliminated, setEliminated] = useState<Set<string>>(new Set());
  const [revealedCount, setRevealedCount] = useState(0);

  const round = rounds[currentRound];

  // Animate morse symbols reveal
  const morseLength = round.morse.length;

  // Progressively reveal morse symbols
  if (revealedCount < morseLength && !showResult) {
    // This is handled in useEffect below
  }

  // Use a simple state to track reveal
  const [revealComplete, setRevealComplete] = useState(false);

  // On round change, reset and animate reveal
  const handleReveal = useCallback(() => {
    setRevealedCount(0);
    setRevealComplete(false);
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setRevealedCount(count);
      if (count >= morseLength) {
        clearInterval(interval);
        setRevealComplete(true);
      }
    }, 200);
  }, [morseLength]);

  // Trigger reveal when round changes
  useState(() => {
    handleReveal();
  });

  const handleSelect = useCallback((letter: string) => {
    if (selected !== null) return;
    setSelected(letter);
    setShowResult(true);

    if (letter === round.letter) {
      playSound('win');
      setScore((s) => s + 1);
    } else {
      playSound('error');
    }

    setTimeout(() => {
      if (currentRound + 1 >= TOTAL_ROUNDS) {
        setFinished(true);
      } else {
        setCurrentRound((c) => c + 1);
        setSelected(null);
        setShowResult(false);
        setEliminated(new Set());
        setRevealedCount(0);
        setRevealComplete(false);
        // Trigger reveal for next round
        const nextRound = rounds[currentRound + 1];
        let count = 0;
        const interval = setInterval(() => {
          count++;
          if (count >= nextRound.morse.length) {
            clearInterval(interval);
          }
        }, 200);
      }
    }, 1200);
  }, [selected, round, currentRound, rounds]);

  const getStars = () => {
    if (score >= 8) return 3;
    if (score >= 6) return 2;
    if (score >= 4) return 1;
    return 0;
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

  const handleHelp = () => {
    if (helpRemaining <= 0 || selected !== null) return;
    // Eliminate one wrong option
    const wrongOptions = round.options.filter((o) => o !== round.letter && !eliminated.has(o));
    if (wrongOptions.length === 0) return;
    const toRemove = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
    setEliminated((prev) => {
      const next = new Set(prev);
      next.add(toRemove);
      return next;
    });
    onHelpUsed();
  };

  // Morse symbol renderer
  const renderMorse = () => {
    const symbols: React.ReactNode[] = [];
    for (let i = 0; i < morseLength; i++) {
      const isRevealed = i < revealedCount;
      const ch = round.morse[i];
      if (ch === '.') {
        symbols.push(
          <motion.span
            key={`dot-${i}`}
            className={styles.morseDot}
            initial={{ scale: 0, opacity: 0 }}
            animate={isRevealed ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          />
        );
      } else if (ch === '-') {
        symbols.push(
          <motion.span
            key={`dash-${i}`}
            className={styles.morseDash}
            initial={{ scale: 0, opacity: 0 }}
            animate={isRevealed ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          />
        );
      }
    }
    return symbols;
  };

  if (finished) {
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
            <span className={styles.winEmoji}>📡</span>
            <h2 className={styles.winText}>
              {language === 'zh'
                ? score >= 8 ? '完美破译！' : score >= 6 ? '破译成功！' : '继续努力！'
                : score >= 8 ? 'Perfect decode!' : score >= 6 ? 'Decoded!' : 'Keep trying!'}
            </h2>
            <p className={styles.winSub}>
              {language === 'zh' ? `答对 ${score}/${TOTAL_ROUNDS} 题` : `${score}/${TOTAL_ROUNDS} correct`}
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

  return (
    <div className={styles.container}>
      {/* Progress dots */}
      <div className={styles.progressRow}>
        {rounds.map((_, i) => (
          <div
            key={i}
            className={`${styles.dot} ${i < currentRound ? styles.dotDone : i === currentRound ? styles.dotCurrent : ''}`}
          />
        ))}
      </div>

      {/* Score */}
      <div className={styles.scoreBar}>
        <span className={styles.scoreLabel}>
          {language === 'zh' ? `得分: ${score}/${currentRound + (selected !== null ? 1 : 0)}` : `Score: ${score}/${currentRound + (selected !== null ? 1 : 0)}`}
        </span>
      </div>

      {/* Reference chart */}
      <div className={styles.refChart}>
        {GAME_LETTERS.map((l) => (
          <span key={l} className={styles.refItem}>
            <span className={styles.refLetter}>{l}</span>={MORSE[l]}
          </span>
        ))}
      </div>

      {/* Morse code display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentRound}
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -60, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={styles.morseCard}
        >
          <div className={styles.morseLabel}>
            {language === 'zh' ? '这是什么字母？' : 'What letter is this?'}
          </div>
          <div className={styles.morseSymbols}>
            {renderMorse()}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Options */}
      <div className={styles.optionGrid}>
        {round.options.map((opt) => {
          let cls = styles.option;
          if (eliminated.has(opt)) cls = styles.optionEliminated;
          else if (showResult) {
            if (opt === round.letter) cls = styles.optionCorrect;
            else if (opt === selected) cls = styles.optionWrong;
          }
          return (
            <motion.button
              key={opt}
              className={cls}
              onClick={() => handleSelect(opt)}
              disabled={selected !== null || eliminated.has(opt)}
              whileTap={!eliminated.has(opt) ? { scale: 0.95 } : undefined}
            >
              {eliminated.has(opt) ? '❌' : opt}
            </motion.button>
          );
        })}
      </div>

      {/* Celebration */}
      {showResult && selected === round.letter && (
        <motion.div
          className={styles.celebration}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 10 }}
        >
          ✅
        </motion.div>
      )}

      {/* Action buttons */}
      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || selected !== null}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={handleConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

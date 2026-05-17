import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 20;
const TOTAL_ROUNDS = 10;

interface ColorDef {
  nameZh: string;
  nameEn: string;
  hex: string;
}

const COLORS: ColorDef[] = [
  { nameZh: '红色', nameEn: 'Red', hex: '#ff6b6b' },
  { nameZh: '蓝色', nameEn: 'Blue', hex: '#4d96ff' },
  { nameZh: '绿色', nameEn: 'Green', hex: '#6bcb77' },
  { nameZh: '黄色', nameEn: 'Yellow', hex: '#ffd93d' },
];

function getChoiceCount(difficulty: 1 | 2 | 3): number {
  if (difficulty === 1) return 2;
  if (difficulty === 2) return 3;
  return 4;
}

function generateRound(choiceCount: number) {
  // Pick a random color name to display
  const wordIdx = Math.floor(Math.random() * COLORS.length);
  // Pick a different ink color
  let inkIdx: number;
  do {
    inkIdx = Math.floor(Math.random() * COLORS.length);
  } while (inkIdx === wordIdx);

  // Build choices: always include the ink color, plus random others
  const choices: number[] = [inkIdx];
  const pool = COLORS.map((_, i) => i).filter((i) => i !== inkIdx);
  while (choices.length < choiceCount) {
    const pick = Math.floor(Math.random() * pool.length);
    choices.push(pool.splice(pick, 1)[0]);
  }
  // Shuffle choices
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  return { wordIdx, inkIdx, choices };
}

export default function ColorMatchGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);
  const choiceCount = getChoiceCount(difficulty);

  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [currentRound, setCurrentRound] = useState(() => generateRound(choiceCount));
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [finished, setFinished] = useState(false);
  const [helpHint, setHelpHint] = useState<number | null>(null);
  const [showIntro, setShowIntro] = useState(true);

  const nextRound = useCallback(() => {
    const newRound = round + 1;
    if (newRound >= TOTAL_ROUNDS) {
      setFinished(true);
      return;
    }
    setRound(newRound);
    setCurrentRound(generateRound(choiceCount));
    setFeedback(null);
    setHelpHint(null);
  }, [round, choiceCount]);

  const handleChoice = useCallback((colorIdx: number) => {
    if (feedback) return;
    if (colorIdx === currentRound.inkIdx) {
      setCorrect((c) => c + 1);
      setFeedback('correct');
    } else {
      setFeedback('wrong');
    }
    setTimeout(nextRound, 800);
  }, [currentRound, feedback, nextRound]);

  const handleHelp = () => {
    if (helpRemaining <= 0 || feedback) return;
    setHelpHint(currentRound.inkIdx);
    onHelpUsed();
    setTimeout(() => setHelpHint(null), 3000);
  };

  const getStars = () => {
    if (correct > 8) return 3;
    if (correct > 6) return 2;
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

  if (showIntro) {
    return (
      <div className={styles.container}>
        <motion.div
          className={styles.introCard}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <div className={styles.introEmoji}>🎨</div>
          <h2 className={styles.introTitle}>
            {language === 'zh' ? '颜色匹配' : 'Color Match'}
          </h2>
          <p className={styles.introDesc}>
            {language === 'zh'
              ? '看到颜色的名字，但文字的颜色和名字不一样！你要选的是文字的墨水颜色，不是文字内容哦！'
              : 'The word says one color but is written in another ink! Tap the button matching the INK COLOR, not the word!'}
          </p>
          <button className={styles.startButton} onClick={() => setShowIntro(false)}>
            {language === 'zh' ? '开始！' : 'Start!'}
          </button>
        </motion.div>
      </div>
    );
  }

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
          <div className={styles.resultEmoji}>🎨</div>
          <h2 className={styles.resultTitle}>
            {language === 'zh' ? '完成了！' : 'Finished!'}
          </h2>
          <p className={styles.resultInfo}>
            {language === 'zh'
              ? `答对 ${correct}/${TOTAL_ROUNDS} 题`
              : `${correct}/${TOTAL_ROUNDS} correct`}
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

  const wordColor = COLORS[currentRound.wordIdx];
  const inkColor = COLORS[currentRound.inkIdx];

  return (
    <div className={styles.container}>
      <div className={styles.progressRow}>
        <span className={styles.progressText}>
          {language === 'zh' ? `第 ${round + 1}/${TOTAL_ROUNDS} 题` : `Round ${round + 1}/${TOTAL_ROUNDS}`}
        </span>
        <span className={styles.scoreText}>
          {language === 'zh' ? `正确: ${correct}` : `Correct: ${correct}`}
        </span>
      </div>

      <div className={styles.stroopCard}>
        <p className={styles.stroopInstruction}>
          {language === 'zh' ? '选择文字的墨水颜色' : 'Select the INK color of the text'}
        </p>
        <motion.div
          key={round}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={styles.stroopWord}
          style={{ color: inkColor.hex }}
        >
          {language === 'zh' ? wordColor.nameZh : wordColor.nameEn}
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {feedback && (
          <motion.div
            key={`fb-${round}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={`${styles.feedback} ${feedback === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong}`}
          >
            {feedback === 'correct'
              ? (language === 'zh' ? '正确！' : 'Correct!')
              : (language === 'zh' ? '错了！' : 'Wrong!')}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.choices}>
        {currentRound.choices.map((colorIdx) => {
          const c = COLORS[colorIdx];
          return (
            <motion.button
              key={colorIdx}
              className={`${styles.choiceButton} ${helpHint === colorIdx ? styles.choiceHint : ''}`}
              style={{ background: c.hex }}
              onClick={() => handleChoice(colorIdx)}
              disabled={!!feedback}
              whileTap={{ scale: 0.9 }}
            >
              {language === 'zh' ? c.nameZh : c.nameEn}
            </motion.button>
          );
        })}
      </div>

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || !!feedback}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={handleConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

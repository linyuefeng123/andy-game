import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 26;
const TOTAL_ROUNDS = 5;

type Choice = 'rock' | 'scissors' | 'paper';
type RoundResult = 'win' | 'lose' | 'draw';

const CHOICES: { key: Choice; emoji: string; labelZh: string; labelEn: string }[] = [
  { key: 'rock', emoji: '✊', labelZh: '石头', labelEn: 'Rock' },
  { key: 'scissors', emoji: '✌️', labelZh: '剪刀', labelEn: 'Scissors' },
  { key: 'paper', emoji: '✋', labelZh: '布', labelEn: 'Paper' },
];

function beats(a: Choice, b: Choice): boolean {
  return (a === 'rock' && b === 'scissors') || (a === 'scissors' && b === 'paper') || (a === 'paper' && b === 'rock');
}

function getResult(player: Choice, ai: Choice): RoundResult {
  if (player === ai) return 'draw';
  if (beats(player, ai)) return 'win';
  return 'lose';
}

function getAIChoice(difficulty: 1 | 2 | 3, history: Choice[]): Choice {
  const choices: Choice[] = ['rock', 'scissors', 'paper'];

  if (difficulty === 1) {
    // Easy: AI is predictable - tends to play what loses to player's most recent choice
    if (history.length > 0 && Math.random() < 0.5) {
      const lastChoice = history[history.length - 1];
      // Play what loses to last player choice
      if (lastChoice === 'rock') return 'scissors';
      if (lastChoice === 'scissors') return 'paper';
      return 'rock';
    }
    return choices[Math.floor(Math.random() * 3)];
  }

  if (difficulty === 2) {
    // Medium: purely random
    return choices[Math.floor(Math.random() * 3)];
  }

  // Hard: AI reads pattern - picks counter to most frequent player choice
  if (history.length >= 3) {
    const freq: Record<Choice, number> = { rock: 0, scissors: 0, paper: 0 };
    const recent = history.slice(-5);
    recent.forEach((c) => freq[c]++);
    const mostFrequent = (Object.entries(freq) as [Choice, number][]).sort((a, b) => b[1] - a[1])[0][0];
    // Counter to most frequent
    if (mostFrequent === 'rock') return 'paper';
    if (mostFrequent === 'scissors') return 'rock';
    return 'scissors';
  }

  return choices[Math.floor(Math.random() * 3)];
}

export default function RockPaperScissorsGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);

  const [round, setRound] = useState(1);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [draws, setDraws] = useState(0);
  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null);
  const [aiChoice, setAiChoice] = useState<Choice | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [helpHint, setHelpHint] = useState<Choice | null>(null);
  const historyRef = useRef<Choice[]>([]);

  const handleChoice = useCallback((choice: Choice) => {
    if (showResult || gameOver) return;
    setHelpHint(null);

    const ai = getAIChoice(difficulty, historyRef.current);
    const result = getResult(choice, ai);
    historyRef.current.push(choice);

    setPlayerChoice(choice);
    setAiChoice(ai);
    setRoundResult(result);
    setShowResult(true);

    if (result === 'win') setWins((w) => w + 1);
    else if (result === 'lose') setLosses((l) => l + 1);
    else setDraws((d) => d + 1);

    // Auto-advance after delay
    setTimeout(() => {
      if (round >= TOTAL_ROUNDS) {
        setGameOver(true);
      } else {
        setRound((r) => r + 1);
        setPlayerChoice(null);
        setAiChoice(null);
        setRoundResult(null);
        setShowResult(false);
      }
    }, 1500);
  }, [round, showResult, gameOver, difficulty]);

  const handleHelp = () => {
    if (helpRemaining <= 0 || showResult || gameOver) return;
    const aiLikely = getAIChoice(difficulty, historyRef.current);
    // Suggest what beats the AI's likely choice
    if (aiLikely === 'rock') setHelpHint('paper');
    else if (aiLikely === 'scissors') setHelpHint('rock');
    else setHelpHint('scissors');
    onHelpUsed();
    setTimeout(() => setHelpHint(null), 3000);
  };

  const getStars = () => {
    if (wins >= 5) return 3;
    if (wins >= 4) return 2;
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

  const resultLabel = (r: RoundResult) => {
    if (r === 'win') return language === 'zh' ? '你赢了！' : 'You win!';
    if (r === 'lose') return language === 'zh' ? '你输了！' : 'You lose!';
    return language === 'zh' ? '平局！' : 'Draw!';
  };

  const choiceEmoji = (c: Choice) => CHOICES.find((ch) => ch.key === c)?.emoji ?? '';

  if (gameOver) {
    const stars = getStars();
    return (
      <div className={styles.container}>
        <motion.div
          className={styles.resultCard}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <div className={styles.resultEmoji}>✊</div>
          <h2 className={styles.resultTitle}>
            {language === 'zh' ? '比赛结束！' : 'Game Over!'}
          </h2>
          <p className={styles.resultInfo}>
            {language === 'zh'
              ? `胜 ${wins} / 负 ${losses} / 平 ${draws}`
              : `W ${wins} / L ${losses} / D ${draws}`}
          </p>
          <div className={styles.starRow}>
            {[1, 2, 3].map((i) => (
              <span key={i} className={i <= stars ? styles.starActive : styles.starInactive}>⭐</span>
            ))}
          </div>
          <div className={styles.winButtons}>
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
      <div className={styles.scoreBoard}>
        <span className={styles.scoreItem}>
          {language === 'zh' ? `第 ${round}/${TOTAL_ROUNDS} 局` : `Round ${round}/${TOTAL_ROUNDS}`}
        </span>
        <span className={styles.scoreWins}>
          {language === 'zh' ? `胜 ${wins}` : `W:${wins}`}
        </span>
        <span className={styles.scoreLosses}>
          {language === 'zh' ? `负 ${losses}` : `L:${losses}`}
        </span>
      </div>

      {/* Battle display */}
      <div className={styles.battleArea}>
        <div className={styles.battleSide}>
          <span className={styles.battleLabel}>{language === 'zh' ? '你' : 'You'}</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={playerChoice ?? 'empty'}
              className={styles.battleEmoji}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {playerChoice ? choiceEmoji(playerChoice) : '❓'}
            </motion.span>
          </AnimatePresence>
        </div>

        <span className={styles.vsText}>VS</span>

        <div className={styles.battleSide}>
          <span className={styles.battleLabel}>{language === 'zh' ? '电脑' : 'AI'}</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={aiChoice ?? 'empty'}
              className={styles.battleEmoji}
              initial={{ scale: 0, rotate: 30 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {aiChoice ? choiceEmoji(aiChoice) : '❓'}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* Round result */}
      <AnimatePresence>
        {roundResult && (
          <motion.div
            className={`${styles.roundResult} ${roundResult === 'win' ? styles.resultWin : roundResult === 'lose' ? styles.resultLose : styles.resultDraw}`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
          >
            {resultLabel(roundResult)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Choice buttons */}
      <div className={styles.choiceButtons}>
        {CHOICES.map((c) => (
          <button
            key={c.key}
            className={`${styles.choiceButton} ${helpHint === c.key ? styles.choiceHint : ''}`}
            onClick={() => handleChoice(c.key)}
            disabled={showResult}
          >
            <span className={styles.choiceEmoji}>{c.emoji}</span>
            <span className={styles.choiceLabel}>
              {language === 'zh' ? c.labelZh : c.labelEn}
            </span>
          </button>
        ))}
      </div>

      {helpHint && (
        <motion.div
          className={styles.helpHintText}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          💡 {language === 'zh' ? '试试这个！' : 'Try this one!'}
        </motion.div>
      )}

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || showResult}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={handleConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

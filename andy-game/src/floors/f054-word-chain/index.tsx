import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import styles from './index.module.css';

const FLOOR_NUM = 54;
const TOTAL_ROUNDS = 3;

interface ChainStep {
  word: string;     // the correct word for this step
  options: string[]; // 3 options including the correct word (first is always correct, shuffled at runtime)
}

interface ChainData {
  steps: ChainStep[]; // 4-5 steps in each chain
}

// Predefined word chains for Chinese word game (词语接龙)
// Each chain: the first word is the starter, each subsequent word starts with the last character of the previous
const WORD_CHAINS: ChainData[] = [
  {
    steps: [
      { word: '苹果', options: ['果树', '果皮', '果汁'] },
      { word: '果树', options: ['树叶', '树干', '树苗'] },
      { word: '树叶', options: ['叶子', '叶脉', '叶绿'] },
      { word: '叶子', options: ['子孙', '子弹', '子女'] },
    ],
  },
  {
    steps: [
      { word: '太阳', options: ['阳光', '阳台', '阳历'] },
      { word: '阳光', options: ['光明', '光芒', '光泽'] },
      { word: '光明', options: ['明天', '明亮', '明月'] },
      { word: '明天', options: ['天空', '天文', '天气'] },
    ],
  },
  {
    steps: [
      { word: '花园', options: ['园林', '园丁', '园区'] },
      { word: '园林', options: ['林子', '森林', '林木'] },
      { word: '林子', options: ['子弹', '子女', '子夜'] },
      { word: '子弹', options: ['蛋糕', '蛋白', '蛋壳'] },
      { word: '蛋糕', options: ['糕点', '高兴', '高飞'] },
    ],
  },
  {
    steps: [
      { word: '蓝天', options: ['天空', '天地', '天才'] },
      { word: '天空', options: ['空气', '空白', '空间'] },
      { word: '空气', options: ['气象', '气体', '气质'] },
      { word: '气象', options: ['象牙', '想象', '象棋'] },
    ],
  },
  {
    steps: [
      { word: '白云', options: ['云朵', '云彩', '云层'] },
      { word: '云朵', options: ['躲避', '多云', '朵花'] },
      { word: '躲避', options: ['避雨', '避免', '避风'] },
      { word: '避雨', options: ['雨伞', '雨衣', '雨点'] },
    ],
  },
  {
    steps: [
      { word: '大海', options: ['海水', '海外', '海风'] },
      { word: '海水', options: ['水果', '水流', '水滴'] },
      { word: '水果', options: ['果树', '果然', '果皮'] },
      { word: '果树', options: ['树叶', '树干', '树苗'] },
    ],
  },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRounds(): ChainData[] {
  const indices = shuffle(Array.from({ length: WORD_CHAINS.length }, (_, i) => i));
  const selected = indices.slice(0, TOTAL_ROUNDS);
  return selected.map((idx) => {
    const chain = WORD_CHAINS[idx];
    // Shuffle options for each step
    return {
      steps: chain.steps.map((step) => ({
        word: step.word,
        options: shuffle(step.options),
      })),
    };
  });
}

type Phase = 'show' | 'choose' | 'feedback' | 'roundEnd' | 'result';

export default function WordChain({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [rounds] = useState<ChainData[]>(() => pickRounds());
  const [round, setRound] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('show');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [chainsCompleted, setChainsCompleted] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [helpRevealed, setHelpRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const currentChain = rounds[round];
  const currentStep = currentChain.steps[stepIdx];
  // The word that the player needs to match: last character of the previous word (or the starter for step 0)
  const prevWord = stepIdx === 0 ? currentChain.steps[0].word : currentChain.steps[stepIdx - 1].word;
  const targetChar = stepIdx === 0 ? '' : prevWord[prevWord.length - 1];

  // Auto-transition from show to choose
  useEffect(() => {
    if (phase !== 'show') return;
    timerRef.current = setTimeout(() => {
      setPhase('choose');
    }, 800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, round, stepIdx]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSelect = useCallback((opt: string) => {
    if (phase !== 'choose' || selectedOption !== null) return;

    setSelectedOption(opt);
    const isCorrect = opt === currentStep.word;

    if (isCorrect) {
      playSound('win');
    } else {
      playSound('error');
    }

    setPhase('feedback');

    timerRef.current = setTimeout(() => {
      if (isCorrect) {
        // Move to next step or next round
        if (stepIdx + 1 >= currentChain.steps.length) {
          // Chain completed!
          setChainsCompleted((c) => c + 1);
          if (round + 1 >= TOTAL_ROUNDS) {
            setGameOver(true);
          } else {
            setRound((r) => r + 1);
            setStepIdx(0);
            setPhase('show');
            setSelectedOption(null);
            setHelpRevealed(false);
          }
        } else {
          setStepIdx((s) => s + 1);
          setPhase('show');
          setSelectedOption(null);
          setHelpRevealed(false);
        }
      } else {
        // Wrong answer: this round ends
        if (round + 1 >= TOTAL_ROUNDS) {
          setGameOver(true);
        } else {
          setRound((r) => r + 1);
          setStepIdx(0);
          setPhase('show');
          setSelectedOption(null);
          setHelpRevealed(false);
        }
      }
    }, 1200);
  }, [phase, selectedOption, currentStep, stepIdx, currentChain, round]);

  const handleHelp = useCallback(() => {
    if (helpRemaining <= 0 || phase !== 'choose' || helpRevealed || selectedOption !== null) return;
    // Eliminate one wrong option
    setHelpRevealed(true);
    onHelpUsed();
  }, [helpRemaining, phase, helpRevealed, selectedOption, onHelpUsed]);

  const getStars = useCallback((): number => {
    if (chainsCompleted >= 3) return 3;
    if (chainsCompleted >= 2) return 2;
    return 1;
  }, [chainsCompleted]);

  const handleWin = () => {
    const stars = getStars();
    const reward = getFloorMeta(FLOOR_NUM).reward;
    if (stars < 3) {
      onConcede();
    } else {
      onComplete(stars, reward);
    }
    onExit();
  };

  // Build the displayed chain so far for current round
  const displayChain = () => {
    const words: { word: string; status: 'given' | 'completed' | 'active' | 'pending' | 'wrong' }[] = [];
    // The first word (starter) is always shown
    words.push({ word: currentChain.steps[0].word, status: 'given' });

    for (let i = 1; i < currentChain.steps.length; i++) {
      if (i < stepIdx) {
        words.push({ word: currentChain.steps[i].word, status: 'completed' });
      } else if (i === stepIdx) {
        if (phase === 'feedback' && selectedOption !== currentStep.word) {
          words.push({ word: selectedOption || '??', status: 'wrong' });
        } else {
          words.push({ word: '??', status: 'active' });
        }
      } else {
        words.push({ word: '??', status: 'pending' });
      }
    }
    return words;
  };

  if (gameOver) {
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
            <span className={styles.winEmoji}>🔗</span>
            <h2 className={styles.winText}>
              {language === 'zh'
                ? stars >= 3 ? '太棒了！' : stars >= 2 ? '做得好！' : '继续加油！'
                : stars >= 3 ? 'Amazing!' : stars >= 2 ? 'Good job!' : 'Keep trying!'}
            </h2>
            <p className={styles.winSub}>
              {language === 'zh'
                ? `完成 ${chainsCompleted}/${TOTAL_ROUNDS} 条接龙`
                : `${chainsCompleted}/${TOTAL_ROUNDS} chains completed`}
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
                {stars >= 3
                  ? (language === 'zh' ? '⭐ 继续冒险' : '⭐ Continue')
                  : (language === 'zh' ? '🏠 返回大厅' : '🏠 Lobby')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const chainWords = displayChain();

  return (
    <div className={styles.container}>
      {/* Round info */}
      <div className={styles.gameInfo}>
        <span className={styles.roundInfo}>
          {language === 'zh'
            ? `第 ${round + 1}/${TOTAL_ROUNDS} 轮 | 完成 ${chainsCompleted} 条`
            : `Round ${round + 1}/${TOTAL_ROUNDS} | ${chainsCompleted} chains`}
        </span>
      </div>

      {/* Phase banner */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${round}-${stepIdx}-${phase}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className={`${styles.phaseBanner} ${phase === 'feedback' && selectedOption === currentStep.word ? styles.correctBanner : ''} ${phase === 'feedback' && selectedOption !== currentStep.word ? styles.wrongBanner : ''}`}
        >
          {stepIdx === 0
            ? (language === 'zh' ? '🎯 从这个词开始接龙！' : '🎯 Start the chain from this word!')
            : phase === 'feedback' && selectedOption === currentStep.word
              ? (language === 'zh' ? '✅ 接对了！' : '✅ Correct!')
              : phase === 'feedback' && selectedOption !== currentStep.word
                ? (language === 'zh' ? '❌ 接错了！' : '❌ Wrong!')
                : (language === 'zh' ? `🔍 用「${targetChar}」开头接龙！` : `🔍 Start with "${targetChar}"!`)
          }
        </motion.div>
      </AnimatePresence>

      {/* Chain display */}
      <div className={styles.chainArea}>
        <div className={styles.chainRow}>
          {chainWords.map((item, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {i > 0 && <span className={styles.chainArrow}>→</span>}
              <motion.span
                className={`${styles.chainWord} ${item.status === 'active' ? styles.active : ''} ${item.status === 'completed' ? styles.completed : ''} ${item.status === 'wrong' ? styles.wrong : ''}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: item.status === 'pending' ? 0.4 : 1 }}
                transition={{ delay: i * 0.05 }}
              >
                {item.word}
              </motion.span>
            </span>
          ))}
        </div>

        {/* Chain progress dots */}
        <div className={styles.chainProgress}>
          {currentChain.steps.map((_, i) => (
            <div
              key={i}
              className={`${styles.chainDot} ${i < stepIdx ? styles.done : ''} ${i === stepIdx ? styles.current : ''}`}
            />
          ))}
        </div>
      </div>

      {/* Options (only during choose phase) */}
      {phase !== 'show' && currentStep && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className={styles.optionsLabel}>
            {language === 'zh' ? '选择下一个词：' : 'Choose the next word:'}
          </p>
          <div className={styles.optionsRow}>
            {currentStep.options.map((opt, idx) => {
              const isCorrect = opt === currentStep.word;
              const isSelected = opt === selectedOption;
              let cls = styles.optionWord;
              if (phase === 'feedback') {
                if (isCorrect) cls = `${styles.optionWord} ${styles.correct}`;
                else if (isSelected) cls = `${styles.optionWord} ${styles.wrong}`;
              }
              const isHelpEliminated = helpRevealed && !isCorrect && !isSelected && phase === 'choose';

              return (
                <motion.button
                  key={idx}
                  className={cls}
                  onClick={() => handleSelect(opt)}
                  disabled={selectedOption !== null || isHelpEliminated}
                  whileTap={selectedOption === null && !isHelpEliminated ? { scale: 0.92 } : undefined}
                  style={isHelpEliminated ? { opacity: 0.3, pointerEvents: 'none' } : undefined}
                >
                  {opt}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Action buttons */}
      <div className={styles.actionButtons}>
        <button
          className={styles.helpButton}
          onClick={handleHelp}
          disabled={helpRemaining <= 0 || phase !== 'choose' || helpRevealed || selectedOption !== null}
        >
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={onConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

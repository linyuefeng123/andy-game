import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 60;

interface PairItem {
  left: string;
  right: string;
}

interface RoundData {
  pairs: PairItem[];
  labelZh: string;
  labelEn: string;
}

const ROUNDS: RoundData[] = [
  {
    labelZh: '动物叫声',
    labelEn: 'Animal Sounds',
    pairs: [
      { left: '🐶', right: '汪汪' },
      { left: '🐱', right: '喵喵' },
      { left: '🐮', right: '哞哞' },
      { left: '🐷', right: '哼哼' },
    ],
  },
  {
    labelZh: '国家首都',
    labelEn: 'Countries & Capitals',
    pairs: [
      { left: '中国', right: '北京' },
      { left: '美国', right: '华盛顿' },
      { left: '日本', right: '东京' },
      { left: '法国', right: '巴黎' },
    ],
  },
  {
    labelZh: '算术挑战',
    labelEn: 'Math Challenge',
    pairs: [
      { left: '3×4', right: '12' },
      { left: '15-7', right: '8' },
      { left: '6+9', right: '15' },
      { left: '20÷4', right: '5' },
    ],
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

interface MatchState {
  leftSelected: number | null;
  rightSelected: number | null;
  matched: Set<number>;
  mistakes: number;
}

export default function ConnectPairs({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [round, setRound] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [finished, setFinished] = useState(false);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [helpHint, setHelpHint] = useState<number | null>(null);

  const [rightOrder, setRightOrder] = useState<number[]>(() => {
    const indices = ROUNDS[0].pairs.map((_, i) => i);
    return shuffleArray(indices);
  });

  const [matchState, setMatchState] = useState<MatchState>({
    leftSelected: null,
    rightSelected: null,
    matched: new Set(),
    mistakes: 0,
  });

  const currentRound = ROUNDS[round];
  const leftItems = currentRound.pairs;
  const rightItems = rightOrder.map((i) => currentRound.pairs[i]);

  const allMatched = matchState.matched.size === currentRound.pairs.length;

  const advanceRound = useCallback(() => {
    setTotalMistakes((m) => m + matchState.mistakes);
    if (round < ROUNDS.length - 1) {
      const nextRound = round + 1;
      setRound(nextRound);
      const indices = ROUNDS[nextRound].pairs.map((_, i) => i);
      setRightOrder(shuffleArray(indices));
      setMatchState({
        leftSelected: null,
        rightSelected: null,
        matched: new Set(),
        mistakes: 0,
      });
      setFeedback(null);
      setHelpHint(null);
    } else {
      setFinished(true);
    }
  }, [round, matchState.mistakes]);

  // Check if all pairs matched in current round
  const handleLeftClick = useCallback(
    (idx: number) => {
      if (matchState.matched.has(idx) || feedback) return;
      setMatchState((prev) => ({ ...prev, leftSelected: idx, rightSelected: null }));
      setHelpHint(null);
    },
    [matchState.matched, feedback]
  );

  const handleRightClick = useCallback(
    (rightIdx: number) => {
      if (feedback) return;
      const originalIdx = rightOrder[rightIdx];
      if (matchState.matched.has(originalIdx)) return;

      if (matchState.leftSelected === null) {
        // No left selected yet, just highlight
        return;
      }

      // Check match
      if (originalIdx === matchState.leftSelected) {
        // Correct match
        const newMatched = new Set(matchState.matched);
        newMatched.add(originalIdx);
        setMatchState((prev) => ({
          ...prev,
          leftSelected: null,
          rightSelected: null,
          matched: newMatched,
        }));
        setFeedback('correct');
        setTimeout(() => {
          setFeedback(null);
          // Check if all matched in this round
          if (newMatched.size === currentRound.pairs.length) {
            setTimeout(advanceRound, 600);
          }
        }, 500);
      } else {
        // Wrong match
        setMatchState((prev) => ({
          ...prev,
          leftSelected: null,
          rightSelected: null,
          mistakes: prev.mistakes + 1,
        }));
        setFeedback('wrong');
        setTimeout(() => setFeedback(null), 600);
      }
    },
    [matchState, rightOrder, currentRound, advanceRound, feedback]
  );

  const handleHelp = () => {
    if (helpRemaining <= 0 || finished) return;
    // Find an unmatched pair and highlight the left item
    for (let i = 0; i < currentRound.pairs.length; i++) {
      if (!matchState.matched.has(i)) {
        setHelpHint(i);
        onHelpUsed();
        setTimeout(() => setHelpHint(null), 2500);
        return;
      }
    }
  };

  const getStars = useCallback((): number => {
    const total = totalMistakes + matchState.mistakes;
    if (total === 0) return 3;
    if (total <= 2) return 2;
    return 1;
  }, [totalMistakes, matchState.mistakes]);

  const handleWin = () => {
    const stars = getStars();
    onComplete(stars, getFloorMeta(FLOOR_NUM).reward);
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
          <div className={styles.introEmoji}>🔗</div>
          <h2 className={styles.introTitle}>
            {language === 'zh' ? '连线配对' : 'Connect Pairs'}
          </h2>
          <p className={styles.introDesc}>
            {language === 'zh'
              ? '左边和右边的内容有关系！先点左边一项，再点右边对应的答案来连线。'
              : 'Items on the left and right are related! Tap a left item, then tap its match on the right.'}
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
          <div className={styles.resultEmoji}>🔗</div>
          <h2 className={styles.resultTitle}>
            {language === 'zh' ? '配对完成！' : 'All Paired!'}
          </h2>
          <p className={styles.resultInfo}>
            {language === 'zh'
              ? `错误 ${totalMistakes + matchState.mistakes} 次`
              : `${totalMistakes + matchState.mistakes} mistakes`}
          </p>
          <div className={styles.starRow}>
            {[1, 2, 3].map((i) => (
              <span key={i} className={i <= stars ? styles.starActive : styles.starInactive}>
                ⭐
              </span>
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
          {language === 'zh'
            ? `第 ${round + 1}/${ROUNDS.length} 关 · ${currentRound.labelZh}`
            : `Round ${round + 1}/${ROUNDS.length} · ${currentRound.labelEn}`}
        </span>
        <span className={styles.scoreText}>
          {language === 'zh'
            ? `配对 ${matchState.matched.size}/${currentRound.pairs.length}`
            : `${matchState.matched.size}/${currentRound.pairs.length} pairs`}
        </span>
      </div>

      <div className={styles.boardWrapper}>
        <div className={styles.columnsContainer}>
          {/* Left column */}
          <div className={styles.column}>
            <div className={styles.columnHeader}>
              {language === 'zh' ? '题目' : 'Question'}
            </div>
            {leftItems.map((pair, idx) => {
              const isSelected = matchState.leftSelected === idx;
              const isMatched = matchState.matched.has(idx);
              const isHint = helpHint === idx;
              return (
                <motion.button
                  key={`l-${idx}`}
                  className={`${styles.pairItem} ${isSelected ? styles.itemSelected : ''} ${isMatched ? styles.itemMatched : ''} ${isHint ? styles.itemHint : ''}`}
                  onClick={() => handleLeftClick(idx)}
                  disabled={isMatched || !!feedback}
                  whileTap={{ scale: 0.95 }}
                  layout
                >
                  <span className={styles.itemContent}>{pair.left}</span>
                  {isMatched && <span className={styles.checkMark}>✓</span>}
                </motion.button>
              );
            })}
          </div>

          {/* Connector lines (visual) */}
          <div className={styles.connectorColumn}>
            {leftItems.map((_, idx) => {
              const isMatched = matchState.matched.has(idx);
              return (
                <div key={`c-${idx}`} className={styles.connectorSlot}>
                  {isMatched && (
                    <motion.div
                      className={styles.connectorLine}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Right column */}
          <div className={styles.column}>
            <div className={styles.columnHeader}>
              {language === 'zh' ? '答案' : 'Answer'}
            </div>
            {rightItems.map((pair, rightIdx) => {
              const originalIdx = rightOrder[rightIdx];
              const isMatched = matchState.matched.has(originalIdx);
              const isCorrectTarget =
                matchState.leftSelected !== null && originalIdx === matchState.leftSelected;
              return (
                <motion.button
                  key={`r-${rightIdx}`}
                  className={`${styles.pairItem} ${isCorrectTarget ? styles.itemCorrectTarget : ''} ${isMatched ? styles.itemMatched : ''}`}
                  onClick={() => handleRightClick(rightIdx)}
                  disabled={isMatched || matchState.leftSelected === null || !!feedback}
                  whileTap={{ scale: 0.95 }}
                  layout
                >
                  <span className={styles.itemContent}>{pair.right}</span>
                  {isMatched && <span className={styles.checkMark}>✓</span>}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={`${styles.feedback} ${feedback === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong}`}
          >
            {feedback === 'correct'
              ? language === 'zh' ? '配对正确！' : 'Correct!'
              : language === 'zh' ? '不对哦～' : 'Not quite!'}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.actionButtons}>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || finished}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={handleConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

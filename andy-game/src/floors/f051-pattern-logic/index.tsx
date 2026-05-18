import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import styles from './index.module.css';

const FLOOR_NUM = 51;
const TOTAL_ROUNDS = 5;

// Color cycle patterns for rounds 1-2
const COLOR_CYCLES: string[][] = [
  ['#e74c3c', '#3498db', '#2ecc71', '#e74c3c'], // red -> blue -> green -> red
  ['#f1c40f', '#e67e22', '#9b59b6', '#f1c40f'], // yellow -> orange -> purple -> yellow
  ['#1abc9c', '#e74c3c', '#3498db', '#1abc9c'], // teal -> red -> blue -> teal
  ['#e74c3c', '#f1c40f', '#2ecc71', '#e74c3c'], // red -> yellow -> green -> red
  ['#3498db', '#9b59b6', '#e74c3c', '#3498db'], // blue -> purple -> red -> blue
];

// Arrow rotation patterns for rounds 3-4 (rotation in degrees)
const ROTATION_CYCLES: number[][] = [
  [0, 90, 180, 270],   // turning clockwise 90 deg
  [0, 270, 180, 90],   // turning counter-clockwise 90 deg
  [0, 90, 180, 270],   // clockwise again
  [0, 180, 0, 180],    // flipping
];

// Combined: color index + rotation index
interface CombinedPattern {
  colors: string[];
  rotations: number[];
}

const COMBINED_PATTERNS: CombinedPattern[] = [
  { colors: ['#e74c3c', '#3498db', '#2ecc71'], rotations: [0, 90, 180] },     // next: green + 270
  { colors: ['#f1c40f', '#e67e22', '#9b59b6'], rotations: [270, 180, 90] },    // next: yellow + 0
];

type PatternType = 'color' | 'rotation' | 'combined';

interface PatternQuestion {
  type: PatternType;
  /** The 3 given items in the sequence */
  given: React.ReactNode[];
  /** The correct answer index (0-3) */
  correctIndex: number;
  /** The 4 option nodes */
  options: React.ReactNode[];
}

function buildQuestions(): PatternQuestion[] {
  const questions: PatternQuestion[] = [];

  // Round 1: Simple color sequence
  {
    const cycle = COLOR_CYCLES[0];
    const givenColors = [cycle[0], cycle[1], cycle[2]];
    const answerColor = cycle[3];
    const wrongColors = COLOR_CYCLES.slice(1, 4).map(c => c[3]).filter(c => c !== answerColor).slice(0, 2);
    // Ensure we have 3 wrong options
    while (wrongColors.length < 3) {
      const randColor = COLOR_CYCLES[Math.floor(Math.random() * COLOR_CYCLES.length)][3];
      if (randColor !== answerColor && !wrongColors.includes(randColor)) wrongColors.push(randColor);
    }
    const allOptions = [answerColor, ...wrongColors.slice(0, 3)];
    // Shuffle
    for (let i = allOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
    }
    const correctIdx = allOptions.indexOf(answerColor);
    questions.push({
      type: 'color',
      given: givenColors.map((c, i) => (
        <div key={i} className={styles.colorShape} style={{ backgroundColor: c }} />
      )),
      correctIndex: correctIdx,
      options: allOptions.map((c, i) => (
        <div key={i} className={styles.colorShape} style={{ backgroundColor: c }} />
      )),
    });
  }

  // Round 2: Another color sequence
  {
    const cycle = COLOR_CYCLES[1];
    const givenColors = [cycle[0], cycle[1], cycle[2]];
    const answerColor = cycle[3];
    const wrongColors = COLOR_CYCLES.filter(c => c[3] !== answerColor).map(c => c[3]).slice(0, 3);
    const allOptions = [answerColor, ...wrongColors.slice(0, 3)];
    for (let i = allOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
    }
    const correctIdx = allOptions.indexOf(answerColor);
    questions.push({
      type: 'color',
      given: givenColors.map((c, i) => (
        <div key={i} className={styles.colorShape} style={{ backgroundColor: c }} />
      )),
      correctIndex: correctIdx,
      options: allOptions.map((c, i) => (
        <div key={i} className={styles.colorShape} style={{ backgroundColor: c }} />
      )),
    });
  }

  // Rounds 3-4: Arrow rotation
  for (let r = 0; r < 2; r++) {
    const cycle = ROTATION_CYCLES[r];
    const givenRots = [cycle[0], cycle[1], cycle[2]];
    const answerRot = cycle[3];
    const allRots = [0, 90, 180, 270];
    const shuffled = [...allRots].sort(() => Math.random() - 0.5);
    const correctIdx = shuffled.indexOf(answerRot);
    questions.push({
      type: 'rotation',
      given: givenRots.map((deg, i) => (
        <span key={i} className={styles.rotArrow} style={{ transform: `rotate(${deg}deg)` }}>➜</span>
      )),
      correctIndex: correctIdx,
      options: shuffled.map((deg, i) => (
        <span key={i} className={styles.rotArrow} style={{ transform: `rotate(${deg}deg)` }}>➜</span>
      )),
    });
  }

  // Round 5: Combined pattern (color + rotation)
  {
    const pat = COMBINED_PATTERNS[0];
    const answerColor = pat.colors[0]; // cycles back
    const answerRot = 270; // 0 -> 90 -> 180 -> 270
    const wrongColors = ['#e67e22', '#9b59b6', '#f1c40f'];
    const allOpts: { color: string; rot: number }[] = [
      { color: answerColor, rot: answerRot },
      { color: wrongColors[0], rot: 90 },
      { color: wrongColors[1], rot: 180 },
      { color: wrongColors[2], rot: 0 },
    ];
    // Shuffle
    for (let i = allOpts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allOpts[i], allOpts[j]] = [allOpts[j], allOpts[i]];
    }
    const correctIdx = allOpts.findIndex(o => o.color === answerColor && o.rot === answerRot);
    questions.push({
      type: 'combined',
      given: pat.colors.map((c, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div className={styles.colorShape} style={{ backgroundColor: c, width: 36, height: 36 }} />
          <span className={styles.rotArrow} style={{ transform: `rotate(${pat.rotations[i]}deg)`, fontSize: 24 }}>➜</span>
        </div>
      )),
      correctIndex: correctIdx,
      options: allOpts.map((o, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div className={styles.colorShape} style={{ backgroundColor: o.color, width: 36, height: 36 }} />
          <span className={styles.rotArrow} style={{ transform: `rotate(${o.rot}deg)`, fontSize: 24 }}>➜</span>
        </div>
      )),
    });
  }

  return questions;
}

export default function PatternLogicGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [questions] = useState<PatternQuestion[]>(buildQuestions);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [finished, setFinished] = useState(false);
  const [eliminated, setEliminated] = useState<Set<number>>(new Set());

  const q = questions[currentQ];

  const handleSelect = useCallback((idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    setShowResult(true);

    if (idx === q.correctIndex) {
      playSound('win');
      setScore((s) => s + 1);
    } else {
      playSound('error');
    }

    setTimeout(() => {
      if (currentQ + 1 >= TOTAL_ROUNDS) {
        setFinished(true);
      } else {
        setCurrentQ((c) => c + 1);
        setSelected(null);
        setShowResult(false);
        setEliminated(new Set());
      }
    }, 1000);
  }, [selected, q, currentQ]);

  const getStars = () => {
    if (score >= 5) return 3;
    if (score >= 4) return 2;
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

  const handleHelp = () => {
    if (helpRemaining <= 0 || selected !== null) return;
    const wrongIndices = q.options
      .map((_, i) => i)
      .filter((i) => i !== q.correctIndex && !eliminated.has(i));
    const toRemove = wrongIndices.sort(() => Math.random() - 0.5).slice(0, 2);
    setEliminated((prev) => {
      const next = new Set(prev);
      toRemove.forEach((i) => next.add(i));
      return next;
    });
    onHelpUsed();
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
            <span className={styles.winEmoji}>🧠</span>
            <h2 className={styles.winText}>
              {language === 'zh'
                ? score >= 5 ? '满分！推理天才！' : score >= 4 ? '做得好！' : '继续加油！'
                : score >= 5 ? 'Perfect! Logic genius!' : score >= 4 ? 'Great job!' : 'Keep trying!'}
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

  const roundTypeLabel = q.type === 'color'
    ? (language === 'zh' ? '颜色规律' : 'Color Pattern')
    : q.type === 'rotation'
    ? (language === 'zh' ? '旋转规律' : 'Rotation Pattern')
    : (language === 'zh' ? '综合规律' : 'Combined Pattern');

  return (
    <div className={styles.container}>
      <div className={styles.progressRow}>
        {questions.map((_, i) => (
          <div
            key={i}
            className={`${styles.dot} ${i < currentQ ? styles.dotDone : i === currentQ ? styles.dotCurrent : ''}`}
          />
        ))}
      </div>

      <div className={styles.scoreBar}>
        <span className={styles.scoreLabel}>
          {language === 'zh' ? `得分: ${score}/${currentQ + (selected !== null ? 1 : 0)}` : `Score: ${score}/${currentQ + (selected !== null ? 1 : 0)}`}
        </span>
      </div>

      <span className={styles.roundLabel}>{roundTypeLabel}</span>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ}
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -60, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={styles.patternArea}
        >
          {q.given.map((node, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div className={`${styles.shapeBox} ${styles.shapeBoxGiven}`}>{node}</div>
              {i < q.given.length - 1 && <span className={styles.arrowBetween}>→</span>}
            </div>
          ))}
          <span className={styles.arrowBetween}>→</span>
          <div className={`${styles.shapeBox} ${styles.shapeBoxQuestion}`}>?</div>
        </motion.div>
      </AnimatePresence>

      <div className={styles.optionGrid}>
        {q.options.map((opt, idx) => {
          let cls = styles.option;
          if (eliminated.has(idx)) cls = styles.optionEliminated;
          else if (showResult) {
            if (idx === q.correctIndex) cls = styles.optionCorrect;
            else if (idx === selected) cls = styles.optionWrong;
          }
          return (
            <motion.button
              key={idx}
              className={cls}
              onClick={() => handleSelect(idx)}
              disabled={selected !== null || eliminated.has(idx)}
              whileTap={!eliminated.has(idx) ? { scale: 0.95 } : undefined}
            >
              {eliminated.has(idx) ? '❌' : opt}
            </motion.button>
          );
        })}
      </div>

      {showResult && selected !== null && selected === q.correctIndex && (
        <motion.div
          className={styles.celebration}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 10 }}
        >
          ✅
        </motion.div>
      )}

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

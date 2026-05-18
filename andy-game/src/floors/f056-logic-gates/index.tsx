import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS, getFloorMeta } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import styles from './index.module.css';

const FLOOR_NUM = 56;
const TOTAL_ROUNDS = 8;

type GateType = 'AND' | 'OR' | 'NOT';

interface Round {
  gate: GateType;
  inputA: number; // 0 or 1
  inputB: number; // 0 or 1 (unused for NOT)
  answer: number; // 0 or 1
}

function computeGate(gate: GateType, a: number, b: number): number {
  switch (gate) {
    case 'AND': return a === 1 && b === 1 ? 1 : 0;
    case 'OR': return a === 1 || b === 1 ? 1 : 0;
    case 'NOT': return a === 1 ? 0 : 1;
  }
}

function generateRounds(): Round[] {
  const rounds: Round[] = [];

  // Rounds 1-3: AND gates (easy)
  for (let i = 0; i < 3; i++) {
    const a = Math.random() < 0.5 ? 0 : 1;
    const b = Math.random() < 0.5 ? 0 : 1;
    rounds.push({ gate: 'AND', inputA: a, inputB: b, answer: computeGate('AND', a, b) });
  }

  // Rounds 4-6: OR gates (medium)
  for (let i = 0; i < 3; i++) {
    const a = Math.random() < 0.5 ? 0 : 1;
    const b = Math.random() < 0.5 ? 0 : 1;
    rounds.push({ gate: 'OR', inputA: a, inputB: b, answer: computeGate('OR', a, b) });
  }

  // Rounds 7-8: NOT gates (harder - only 1 input)
  for (let i = 0; i < 2; i++) {
    const a = Math.random() < 0.5 ? 0 : 1;
    rounds.push({ gate: 'NOT', inputA: a, inputB: 0, answer: computeGate('NOT', a, 0) });
  }

  return rounds;
}

function gateLabel(gate: GateType, language: string): string {
  if (gate === 'AND') return language === 'zh' ? '与门 AND' : 'AND Gate';
  if (gate === 'OR') return language === 'zh' ? '或门 OR' : 'OR Gate';
  return language === 'zh' ? '非门 NOT' : 'NOT Gate';
}

export default function LogicGatesGame({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [rounds] = useState<Round[]>(() => generateRounds());
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [finished, setFinished] = useState(false);

  const round = rounds[currentRound];

  const handleSelect = useCallback((value: number) => {
    if (selected !== null) return;
    setSelected(value);
    setShowResult(true);

    if (value === round.answer) {
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
      }
    }, 1200);
  }, [selected, round, currentRound]);

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
    // Hint: show a brief text explanation
    // For simplicity, just auto-select the correct answer
    setSelected(round.answer);
    setShowResult(true);
    playSound('win');
    setScore((s) => s + 1);
    onHelpUsed();

    setTimeout(() => {
      if (currentRound + 1 >= TOTAL_ROUNDS) {
        setFinished(true);
      } else {
        setCurrentRound((c) => c + 1);
        setSelected(null);
        setShowResult(false);
      }
    }, 1200);
  };

  const wireClass = (value: number) => value === 1 ? styles.wireHigh : styles.wireLow;

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
            <span className={styles.winEmoji}>⚙️</span>
            <h2 className={styles.winText}>
              {language === 'zh'
                ? score >= 8 ? '完美逻辑！' : score >= 6 ? '逻辑不错！' : '继续加油！'
                : score >= 8 ? 'Perfect logic!' : score >= 6 ? 'Good logic!' : 'Keep trying!'}
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

      {/* Circuit diagram */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentRound}
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -60, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={styles.circuitCard}
        >
          <div className={styles.gateLabel}>
            {gateLabel(round.gate, language)}
          </div>

          <div className={styles.circuit}>
            {round.gate === 'NOT' ? (
              /* NOT gate: single input */
              <div className={styles.wireRow}>
                <span className={styles.inputLabel}>IN: {round.inputA}</span>
                <span className={`${styles.wire} ${wireClass(round.inputA)}`} />
                <span className={styles.gateNotSymbol}>NOT</span>
                <span className={`${styles.wire} ${showResult ? wireClass(round.answer) : wireClass(0)}`} />
                <span className={styles.outputQuestion}>
                  {showResult ? round.answer : '?'}
                </span>
              </div>
            ) : (
              /* AND / OR gate: two inputs */
              <>
                <div className={styles.wireRow}>
                  <span className={styles.inputLabel}>A: {round.inputA}</span>
                  <span className={`${styles.wire} ${wireClass(round.inputA)}`} />
                </div>
                <div className={styles.wireRow}>
                  <span className={styles.gateSymbol}>{round.gate}</span>
                  <span className={`${styles.wire} ${showResult ? wireClass(round.answer) : wireClass(0)}`} />
                  <span className={styles.outputQuestion}>
                    {showResult ? round.answer : '?'}
                  </span>
                </div>
                <div className={styles.wireRow}>
                  <span className={styles.inputLabel}>B: {round.inputB}</span>
                  <span className={`${styles.wire} ${wireClass(round.inputB)}`} />
                </div>
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Instruction */}
      <p className={styles.instruction}>
        {round.gate === 'AND'
          ? (language === 'zh' ? 'AND门：两个输入都是1时，输出才是1' : 'AND: output is 1 only when both inputs are 1')
          : round.gate === 'OR'
            ? (language === 'zh' ? 'OR门：任意一个输入是1时，输出就是1' : 'OR: output is 1 when any input is 1')
            : (language === 'zh' ? 'NOT门：将输入取反，0变1，1变0' : 'NOT: flips the input, 0 becomes 1, 1 becomes 0')
        }
      </p>

      {/* Option buttons: 0 or 1 */}
      <div className={styles.optionGrid}>
        {[0, 1].map((value) => {
          let cls = styles.option;
          if (showResult) {
            if (value === round.answer) cls = styles.optionCorrect;
            else if (value === selected) cls = styles.optionWrong;
          }
          return (
            <motion.button
              key={value}
              className={cls}
              onClick={() => handleSelect(value)}
              disabled={selected !== null}
              whileTap={{ scale: 0.95 }}
            >
              {value}
            </motion.button>
          );
        })}
      </div>

      {/* Celebration */}
      {showResult && selected === round.answer && (
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

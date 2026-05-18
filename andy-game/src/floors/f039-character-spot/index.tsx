import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 39;

interface RoundConfig {
  normal: string;
  odd: string;
  gridSize: number;
}

const ROUNDS: RoundConfig[] = [
  { normal: '的', odd: '得', gridSize: 5 },
  { normal: '日', odd: '目', gridSize: 6 },
  { normal: '己', odd: '已', gridSize: 7 },
  { normal: '人', odd: '入', gridSize: 7 },
  { normal: '土', odd: '士', gridSize: 8 },
];

function generateBoard(config: RoundConfig): { cells: string[]; oddIndex: number } {
  const total = config.gridSize * config.gridSize;
  const oddIndex = Math.floor(Math.random() * total);
  const cells = Array.from({ length: total }, (_, i) =>
    i === oddIndex ? config.odd : config.normal
  );
  return { cells, oddIndex };
}

export default function CharacterSpot({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [round, setRound] = useState(0);
  const [board, setBoard] = useState(() => generateBoard(ROUNDS[0]));
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [correct, setCorrect] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [hintIdx, setHintIdx] = useState<number | null>(null);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [completedRounds, setCompletedRounds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const transitionRef = useRef<ReturnType<typeof setTimeout>>();

  // Update timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 200);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transitionRef.current) clearTimeout(transitionRef.current);
    };
  }, []);

  const handleCellClick = useCallback((idx: number) => {
    if (gameOver || selectedIdx !== null || hintIdx !== null) return;

    setSelectedIdx(idx);

    if (idx === board.oddIndex) {
      setCorrect(true);
      const newCompleted = completedRounds + 1;
      setCompletedRounds(newCompleted);

      if (newCompleted >= ROUNDS.length) {
        // All rounds done
        if (timerRef.current) clearInterval(timerRef.current);
        setGameOver(true);
      } else {
        // Advance to next round after brief delay
        transitionRef.current = setTimeout(() => {
          setRound(r => r + 1);
          setBoard(generateBoard(ROUNDS[round + 1]));
          setSelectedIdx(null);
          setCorrect(false);
          setWrong(false);
        }, 800);
      }
    } else {
      setWrong(true);
      transitionRef.current = setTimeout(() => {
        setSelectedIdx(null);
        setWrong(false);
      }, 600);
    }
  }, [gameOver, selectedIdx, hintIdx, board.oddIndex, completedRounds, round]);

  const handleHelp = () => {
    if (helpRemaining <= 0 || gameOver || hintIdx !== null || selectedIdx !== null) return;
    setHintIdx(board.oddIndex);
    onHelpUsed();
    setTimeout(() => {
      setHintIdx(null);
    }, 1200);
  };

  const getStars = useCallback((): number => {
    if (elapsed < 15) return 3;
    if (elapsed < 25) return 2;
    return 1;
  }, [elapsed]);

  const handleWin = () => {
    const stars = getStars();
    onComplete(stars, {
      emoji: '\u{1F441}\u{FE0F}',
      nameZh: '文字侦探',
      nameEn: 'Text Detective',
      descriptionZh: '找到了隐藏的字！',
      descriptionEn: 'Found the hidden character!',
    });
    onExit();
  };

  const config = ROUNDS[round];

  // Win screen
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
            <span className={styles.winEmoji}>{'🌟'}</span>
            <h2 className={styles.winText}>{language === 'zh' ? '你真棒！' : 'You win!'}</h2>
            <p className={styles.scoreInfo}>
              {language === 'zh' ? `用时 ${elapsed} 秒` : `${elapsed}s total`} | {'⭐'.repeat(stars)}
            </p>
            <div className={styles.winButtons}>
              <button className={styles.replayButton} onClick={onReplay}>
                🔄 {language === 'zh' ? '再玩一次！' : 'Play again!'}
              </button>
              <button className={styles.winButton} onClick={handleWin}>
                ⭐ {language === 'zh' ? '继续冒险' : 'Continue'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.gameInfo}>
        <span className={styles.turnInfo}>
          {language === 'zh'
            ? `🔍 第 ${round + 1}/${ROUNDS.length} 轮 — 找不同的字！`
            : `🔍 Round ${round + 1}/${ROUNDS.length} — Spot the odd one!`}
        </span>
        <br />
        <span className={styles.timerInfo}>
          ⏱ {elapsed}s
        </span>
      </div>

      <div className={styles.roundIndicator}>
        {ROUNDS.map((_, i) => (
          <div
            key={i}
            className={`${styles.roundDot} ${
              i < completedRounds ? styles.roundDotDone : i === round ? styles.roundDotCurrent : ''
            }`}
          />
        ))}
      </div>

      <div className={styles.pairLabel}>
        {language === 'zh'
          ? `从 "${config.normal}" 中找出 "${config.odd}"`
          : `Find "${config.odd}" among "${config.normal}"`}
      </div>

      <div className={styles.boardWrapper}>
        <motion.div
          key={round}
          className={styles.board}
          style={{ gridTemplateColumns: `repeat(${config.gridSize}, 1fr)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {board.cells.map((char, idx) => {
            let cellStyle = styles.cell;
            if (idx === selectedIdx && correct) cellStyle = `${styles.cell} ${styles.cellCorrect}`;
            else if (idx === selectedIdx && wrong) cellStyle = `${styles.cell} ${styles.cellWrong}`;
            else if (idx === hintIdx) cellStyle = `${styles.cell} ${styles.cellHint}`;

            return (
              <motion.button
                key={idx}
                className={cellStyle}
                onClick={() => handleCellClick(idx)}
                disabled={selectedIdx !== null || hintIdx !== null}
                whileTap={{ scale: 0.9 }}
              >
                {char}
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      <div className={styles.actionButtons}>
        <button
          className={styles.helpButton}
          onClick={handleHelp}
          disabled={helpRemaining <= 0 || gameOver || hintIdx !== null || selectedIdx !== null}
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

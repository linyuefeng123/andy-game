import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FloorProps } from '../_registry';
import { HELPER_CHARACTERS } from '../_registry';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

const FLOOR_NUM = 30;

// Idiom pool for the match game — each idiom has its 4 characters
const IDIOM_POOL = [
  { idiom: '一心一意', emoji: '1️⃣❤️1️⃣💭' },
  { idiom: '画龙点睛', emoji: '🐉✍️👁️' },
  { idiom: '守株待兔', emoji: '🌳🐰' },
  { idiom: '对牛弹琴', emoji: '🐂🎵' },
  { idiom: '井底之蛙', emoji: '🕳️🐸' },
  { idiom: '亡羊补牢', emoji: '🐑🏠' },
  { idiom: '画蛇添足', emoji: '🐍🦶' },
  { idiom: '坐井观天', emoji: '🕳️☁️' },
  { idiom: '掩耳盗铃', emoji: '👂🔔' },
  { idiom: '狐假虎威', emoji: '🦊🐯' },
  { idiom: '拔苗助长', emoji: '🌱📏' },
  { idiom: '塞翁失马', emoji: '👴🐴' },
  { idiom: '叶公好龙', emoji: '👴🐉' },
  { idiom: '盲人摸象', emoji: '😵🐘' },
  { idiom: '杯弓蛇影', emoji: '🍷🐍' },
  { idiom: '指鹿为马', emoji: '👆🦌' },
  { idiom: '胸有成竹', emoji: '🫁🎋' },
  { idiom: '鹤立鸡群', emoji: '🦢🐔' },
  { idiom: '虎头蛇尾', emoji: '🐯🐍' },
  { idiom: '九牛一毛', emoji: '9️⃣🐂1️⃣🧶' },
  { idiom: '画饼充饥', emoji: '🎨🫓😋' },
  { idiom: '自相矛盾', emoji: '⚔️🛡️' },
  { idiom: '刻舟求剑', emoji: '⛵🗡️' },
  { idiom: '杞人忧天', emoji: '😵☁️' },
];

interface GridChar {
  id: number;
  char: string;
  idiomIndex: number; // which target idiom this char belongs to
  charIndex: number;  // position within the idiom (0-3)
  eliminated: boolean;
}

function getDifficultyConfig(difficulty: 1 | 2 | 3) {
  if (difficulty === 1) return { idiomCount: 3, cols: 4 };
  if (difficulty === 2) return { idiomCount: 4, cols: 4 };
  return { idiomCount: 5, cols: 5 };
}

function initGame(difficulty: 1 | 2 | 3) {
  const { idiomCount, cols } = getDifficultyConfig(difficulty);

  // Pick random idioms
  const shuffledPool = [...IDIOM_POOL].sort(() => Math.random() - 0.5);
  const targets = shuffledPool.slice(0, idiomCount);

  // Create grid characters
  const chars: GridChar[] = [];
  let id = 0;
  targets.forEach((target, iIdx) => {
    const charsArr = [...target.idiom];
    charsArr.forEach((c, cIdx) => {
      chars.push({
        id: id++,
        char: c,
        idiomIndex: iIdx,
        charIndex: cIdx,
        eliminated: false,
      });
    });
  });

  // Shuffle grid positions
  const shuffled = [...chars].sort(() => Math.random() - 0.5);
  shuffled.forEach((c, i) => { c.id = i; });

  return { targets, chars: shuffled, cols };
}

export default function IdiomMatch({ onExit, onComplete, helperChar, helpRemaining, onHelpUsed, onConcede, onReplay }: FloorProps) {
  const difficulty = useGameStore.getState().getDifficultyLevel(FLOOR_NUM);
  const language = useGameStore((s) => s.language);
  const helper = HELPER_CHARACTERS[helperChar];

  const [gameData] = useState(() => initGame(difficulty));
  const [chars, setChars] = useState(gameData.chars);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [completedIdioms, setCompletedIdioms] = useState<Set<number>>(new Set());
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [shakeIds, setShakeIds] = useState<Set<number>>(new Set());
  const [hintCharId, setHintCharId] = useState<number | null>(null);
  const shakeTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => { if (shakeTimer.current) clearTimeout(shakeTimer.current); };
  }, []);

  // Check win condition
  useEffect(() => {
    if (completedIdioms.size === gameData.targets.length && !gameOver) {
      setGameOver(true);
    }
  }, [completedIdioms, gameData.targets.length, gameOver]);

  const handleCharClick = useCallback((id: number) => {
    if (gameOver) return;
    const char = chars.find(c => c.id === id);
    if (!char || char.eliminated) return;
    if (selectedIds.includes(id)) return;
    if (selectedIds.length >= 4) return;

    const newSelected = [...selectedIds, id];
    setSelectedIds(newSelected);

    // When 4 characters selected, check if they form a valid idiom
    if (newSelected.length === 4) {
      const selectedChars = newSelected.map(sid => chars.find(c => c.id === sid)!);
      const idiomIdx = selectedChars[0].idiomIndex;

      // Check if all 4 chars belong to the same idiom and are in order
      const allSameIdiom = selectedChars.every(c => c.idiomIndex === idiomIdx);
      const sortedByCharIndex = [...selectedChars].sort((a, b) => a.charIndex - b.charIndex);
      const isOrdered = sortedByCharIndex.every((c, i) => c.charIndex === i);
      const notAlreadyCompleted = !completedIdioms.has(idiomIdx);

      if (allSameIdiom && isOrdered && notAlreadyCompleted) {
        // Correct! Eliminate the characters
        setChars(prev => prev.map(c =>
          newSelected.includes(c.id) ? { ...c, eliminated: true } : c
        ));
        setCompletedIdioms(prev => new Set([...prev, idiomIdx]));
        setHintCharId(null);
      } else {
        // Wrong! Shake and reset
        setWrongAttempts(prev => prev + 1);
        setShakeIds(new Set(newSelected));
        shakeTimer.current = setTimeout(() => {
          setShakeIds(new Set());
          setSelectedIds([]);
        }, 500);
        return;
      }

      setSelectedIds([]);
    }
  }, [chars, selectedIds, completedIdioms, gameOver]);

  const handleClear = useCallback(() => {
    setSelectedIds([]);
    setHintCharId(null);
  }, []);

  const handleHelp = useCallback(() => {
    if (helpRemaining <= 0 || gameOver) return;

    // Find the first uncompleted idiom and highlight its first unselected char
    const nextIdiomIdx = gameData.targets.findIndex((_, i) => !completedIdioms.has(i));
    if (nextIdiomIdx === -1) return;

    // Find the first char of this idiom that isn't selected yet
    const idiomChars = chars.filter(c => c.idiomIndex === nextIdiomIdx && !c.eliminated);
    const unselectedChar = idiomChars.find(c => !selectedIds.includes(c.id));
    if (unselectedChar) {
      setHintCharId(unselectedChar.id);
      setTimeout(() => setHintCharId(null), 2000);
    }
    onHelpUsed();
  }, [helpRemaining, gameOver, gameData.targets, completedIdioms, chars, selectedIds, onHelpUsed]);

  const getStars = useCallback((): number => {
    if (wrongAttempts <= 1) return 3;
    if (wrongAttempts <= 3) return 2;
    return 1;
  }, [wrongAttempts]);

  const handleWin = () => {
    onComplete(getStars());
    onExit();
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
            <span className={styles.winEmoji}>{stars >= 2 ? '🌟' : '💪'}</span>
            <h2 className={styles.winText}>
              {language === 'zh'
                ? stars >= 3 ? '太棒了！' : stars >= 2 ? '做得好！' : '继续加油！'
                : stars >= 3 ? 'Amazing!' : stars >= 2 ? 'Good job!' : 'Keep trying!'}
            </h2>
            <p className={styles.scoreInfo}>
              {'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}
            </p>
            <div className={styles.winButtons}>
              <button className={styles.replayButton} onClick={onReplay}>
                🔄 {language === 'zh' ? '再玩一次！' : 'Play again!'}
              </button>
              <button className={styles.winButton} onClick={handleWin}>
                {language === 'zh' ? '⭐ 继续冒险' : '⭐ Continue'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Build the selection bar content
  const selectedChars = selectedIds.map(id => chars.find(c => c.id === id)!).filter(Boolean);
  const nextIncompleteIdiomIdx = gameData.targets.findIndex((_, i) => !completedIdioms.has(i));

  return (
    <div className={styles.container}>
      {/* Target idioms */}
      <div className={styles.targetArea}>
        {gameData.targets.map((target, i) => (
          <span
            key={i}
            className={`${styles.targetIdiom} ${completedIdioms.has(i) ? styles.completed : ''} ${i === nextIncompleteIdiomIdx ? styles.active : ''}`}
          >
            {target.emoji} {target.idiom}
          </span>
        ))}
      </div>

      {/* Selection bar */}
      <div className={styles.selectionBar}>
        {[0, 1, 2, 3].map(i => (
          selectedChars[i] ? (
            <span key={i} className={styles.selectedChar}>
              {selectedChars[i].char}
            </span>
          ) : (
            <span key={i} className={styles.slotPlaceholder}>_</span>
          )
        ))}
      </div>

      {/* Character grid */}
      <div className={styles.boardWrapper}>
        <div className={styles.board} style={{ gridTemplateColumns: `repeat(${gameData.cols}, 1fr)` }}>
          <AnimatePresence>
            {chars.map(c => (
              <motion.button
                key={c.id}
                className={`${styles.charCell} ${selectedIds.includes(c.id) ? styles.selected : ''} ${c.eliminated ? styles.eliminated : ''} ${hintCharId === c.id ? styles.hintHighlight : ''} ${shakeIds.has(c.id) ? styles.wrongShake : ''}`}
                onClick={() => handleCharClick(c.id)}
                disabled={c.eliminated || selectedIds.length >= 4 || shakeIds.size > 0}
                whileTap={!c.eliminated ? { scale: 0.92 } : undefined}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {c.char}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Info */}
      <div className={styles.gameInfo}>
        {language === 'zh'
          ? `完成 ${completedIdioms.size}/${gameData.targets.length} 个成语 | 错误 ${wrongAttempts} 次`
          : `${completedIdioms.size}/${gameData.targets.length} idioms | ${wrongAttempts} errors`}
      </div>

      {/* Action buttons */}
      <div className={styles.actionButtons}>
        <button className={styles.clearButton} onClick={handleClear} disabled={selectedIds.length === 0}>
          {language === 'zh' ? '清除' : 'Clear'}
        </button>
        <button className={styles.helpButton} onClick={handleHelp} disabled={helpRemaining <= 0 || gameOver}>
          {helper.emoji} 💡 {helpRemaining}
        </button>
        <button className={styles.skipLink} onClick={onConcede}>
          {language === 'zh' ? '跳过这局' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

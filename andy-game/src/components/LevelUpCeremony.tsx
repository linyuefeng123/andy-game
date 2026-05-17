import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, AP_THRESHOLDS } from '../store/useGameStore';
import styles from './LevelUpCeremony.module.css';

interface LevelUpCeremonyProps {
  onComplete: () => void;
}

const TITLES: Record<number, { zh: string; en: string }> = {
  30: { zh: '勇敢探索者 ⚡', en: 'Brave Explorer ⚡' },
  60: { zh: '聪明小达人 🌟', en: 'Smart Star 🌟' },
  100: { zh: '超级英雄 🦸', en: 'Super Hero 🦸' },
  150: { zh: '传奇冒险王 👑', en: 'Legend 👑' },
};

export default function LevelUpCeremony({ onComplete }: LevelUpCeremonyProps) {
  const language = useGameStore((s) => s.language);
  const adventurePoints = useGameStore((s) => s.adventurePoints);
  const shownAPThresholds = useGameStore((s) => s.shownAPThresholds);
  const markAPThresholdShown = useGameStore((s) => s.markAPThresholdShown);

  const [phase, setPhase] = useState<'flash' | 'jump' | 'announce' | 'done'>('flash');
  const [currentThreshold, setCurrentThreshold] = useState<number | null>(null);

  useEffect(() => {
    // Find the first threshold we've crossed but haven't shown yet
    const crossed = AP_THRESHOLDS.find(
      (t) => adventurePoints >= t && !shownAPThresholds.includes(t)
    );
    if (crossed) {
      setCurrentThreshold(crossed);
    } else {
      onComplete();
    }
  }, [adventurePoints, shownAPThresholds, onComplete]);

  useEffect(() => {
    if (currentThreshold === null) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase progression
    timers.push(setTimeout(() => setPhase('jump'), 500));
    timers.push(setTimeout(() => setPhase('announce'), 1500));
    timers.push(setTimeout(() => {
      markAPThresholdShown(currentThreshold);
      setPhase('done');
    }, 3500));

    return () => timers.forEach(clearTimeout);
  }, [currentThreshold, markAPThresholdShown]);

  useEffect(() => {
    if (phase === 'done') {
      onComplete();
    }
  }, [phase, onComplete]);

  if (currentThreshold === null) return null;

  const title = TITLES[currentThreshold];
  if (!title) return null;

  const handleTap = () => {
    if (currentThreshold !== null) {
      markAPThresholdShown(currentThreshold);
    }
    onComplete();
  };

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleTap}
      >
        {/* Flash effect */}
        {phase === 'flash' && (
          <motion.div
            className={styles.flash}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.5 }}
          />
        )}

        {/* Andy jumping */}
        {(phase === 'jump' || phase === 'announce') && (
          <motion.div
            className={styles.andyContainer}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <motion.div
              className={styles.andyEmoji}
              animate={{ y: [0, -20, 0] }}
              transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut' }}
            >
              🧒
            </motion.div>
          </motion.div>
        )}

        {/* Star rain */}
        {phase === 'announce' && (
          <div className={styles.starRain}>
            {Array.from({ length: 12 }, (_, i) => (
              <motion.span
                key={i}
                className={styles.starParticle}
                initial={{
                  x: Math.random() * 300 - 150,
                  y: -50,
                  opacity: 1,
                  scale: 1,
                }}
                animate={{
                  y: 300,
                  opacity: 0,
                  scale: 0.5,
                  rotate: Math.random() * 360,
                }}
                transition={{
                  duration: 1.5 + Math.random(),
                  delay: i * 0.1,
                  ease: 'easeIn',
                }}
              >
                ⭐
              </motion.span>
            ))}
          </div>
        )}

        {/* Title announcement */}
        {phase === 'announce' && (
          <motion.div
            className={styles.announcement}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 }}
          >
            <div className={styles.newTitle}>
              {language === 'zh' ? title.zh : title.en}
            </div>
            <div className={styles.pointsLabel}>
              ⚔️ {adventurePoints} {language === 'zh' ? '冒险积分' : 'AP'}
            </div>
          </motion.div>
        )}

        {/* Tap hint */}
        {phase === 'announce' && (
          <motion.div
            className={styles.tapHint}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            {language === 'zh' ? '点击继续' : 'Tap to continue'}
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

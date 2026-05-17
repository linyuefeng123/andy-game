import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { IMPLEMENTED_FLOORS } from '../floors/_registry';
import styles from './CompletionCeremony.module.css';

interface CompletionCeremonyProps {
  onComplete: () => void;
}

export default function CompletionCeremony({ onComplete }: CompletionCeremonyProps) {
  const language = useGameStore((s) => s.language);
  const completedFloors = useGameStore((s) => s.completedFloors);
  const completionCeremonyShown = useGameStore((s) => s.completionCeremonyShown);
  const markCompletionCeremonyShown = useGameStore((s) => s.markCompletionCeremonyShown);

  const [phase, setPhase] = useState<'fireworks' | 'title' | 'preview' | 'done'>('fireworks');

  // Check if all implemented floors have 3 stars
  const allThreeStars = IMPLEMENTED_FLOORS.every(
    (f) => completedFloors[f]?.stars >= 3
  );

  useEffect(() => {
    if (!allThreeStars || completionCeremonyShown) {
      onComplete();
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase('title'), 1500));
    timers.push(setTimeout(() => setPhase('preview'), 3000));
    timers.push(setTimeout(() => {
      markCompletionCeremonyShown();
      setPhase('done');
    }, 5500));

    return () => timers.forEach(clearTimeout);
  }, [allThreeStars, completionCeremonyShown, markCompletionCeremonyShown, onComplete]);

  useEffect(() => {
    if (phase === 'done') {
      onComplete();
    }
  }, [phase, onComplete]);

  if (!allThreeStars || completionCeremonyShown) return null;

  const handleTap = () => {
    markCompletionCeremonyShown();
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
        {/* Fireworks */}
        {(phase === 'fireworks' || phase === 'title' || phase === 'preview') && (
          <div className={styles.fireworksContainer}>
            {Array.from({ length: 20 }, (_, i) => (
              <motion.span
                key={i}
                className={styles.fireworkParticle}
                initial={{
                  x: 0,
                  y: 0,
                  opacity: 1,
                  scale: 1,
                }}
                animate={{
                  x: (Math.random() - 0.5) * 300,
                  y: (Math.random() - 0.5) * 300,
                  opacity: 0,
                  scale: 0.3,
                }}
                transition={{
                  duration: 1.5 + Math.random(),
                  delay: Math.random() * 2,
                  ease: 'easeOut',
                }}
              >
                {['✨', '🎆', '🎇', '🌟', '💫'][i % 5]}
              </motion.span>
            ))}
          </div>
        )}

        {/* Title announcement */}
        {(phase === 'title' || phase === 'preview') && (
          <motion.div
            className={styles.announcement}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <motion.div
              className={styles.goldenKey}
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              🗝️
            </motion.div>
            <h1 className={styles.titleText}>
              {language === 'zh' ? '房子主人' : 'House Master'}
            </h1>
            <p className={styles.subtitle}>
              {language === 'zh'
                ? '所有楼层满分通关！'
                : 'All floors cleared with perfect stars!'}
            </p>
          </motion.div>
        )}

        {/* Future floor preview */}
        {phase === 'preview' && (
          <motion.div
            className={styles.preview}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className={styles.previewText}>
              {language === 'zh'
                ? '更多楼层即将开放...'
                : 'More floors coming soon...'}
            </p>
            <div className={styles.previewFloors}>
              {IMPLEMENTED_FLOORS.length < 100 && (
                <span className={styles.futureFloor}>
                  {language === 'zh'
                    ? `🔓 ${100 - IMPLEMENTED_FLOORS.length} 层等待探索`
                    : `🔓 ${100 - IMPLEMENTED_FLOORS.length} floors to explore`}
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Tap hint */}
        {(phase === 'title' || phase === 'preview') && (
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

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import styles from './DailyRewardModal.module.css';

interface DailyRewardModalProps {
  onClose: () => void;
}

export default function DailyRewardModal({ onClose }: DailyRewardModalProps) {
  const language = useGameStore((s) => s.language);
  const claimDailyReward = useGameStore((s) => s.claimDailyReward);
  const streakDays = useGameStore((s) => s.streakDays);
  const [claimed, setClaimed] = useState(false);
  [streakDays]; // ensure we reference it for the display

  const handleClaim = () => {
    const result = claimDailyReward();
    if (result !== false) {
      setClaimed(true);
    }
  };

  // Calculate how many tickets the current streak would award
  const getTicketCount = (streak: number) => {
    if (streak >= 7) return 3;
    if (streak >= 3) return 2;
    return 1;
  };

  // Use the streak result from claim, or estimate based on current state
  const displayStreak = claimed ? streakDays : (streakDays > 0 ? streakDays + 1 : 1);
  const ticketsAwarded = getTicketCount(displayStreak);

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={claimed ? onClose : undefined}
      >
        <motion.div
          className={styles.modal}
          initial={{ scale: 0.5, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.5, opacity: 0, y: 50 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
        >
          {!claimed ? (
            <>
              <div className={styles.fireEmoji}>
                {'🔥'.repeat(Math.min(displayStreak, 7))}
              </div>
              <h2 className={styles.title}>
                {language === 'zh'
                  ? `欢迎回来！连续第${displayStreak}天！`
                  : `Welcome back! Day ${displayStreak} streak!`}
              </h2>
              <p className={styles.reward}>
                {language === 'zh'
                  ? `🎫 +${ticketsAwarded} 电梯票`
                  : `🎫 +${ticketsAwarded} Elevator Ticket${ticketsAwarded > 1 ? 's' : ''}`}
              </p>
              <motion.button
                className={styles.claimButton}
                onClick={handleClaim}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {language === 'zh' ? '领取！' : 'Claim!'}
              </motion.button>
            </>
          ) : (
            <>
              <motion.div
                className={styles.claimedEmoji}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                🎉
              </motion.div>
              <h2 className={styles.title}>
                {language === 'zh' ? '已领取！' : 'Claimed!'}
              </h2>
              <p className={styles.reward}>
                🎫 +{ticketsAwarded}
              </p>
              <motion.button
                className={styles.closeButton}
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {language === 'zh' ? '继续冒险！' : 'Continue!'}
              </motion.button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

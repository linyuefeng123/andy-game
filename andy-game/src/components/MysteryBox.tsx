import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, MAX_ELEVATOR_TICKETS } from '../store/useGameStore';
import styles from './MysteryBox.module.css';

interface MysteryBoxProps {
  onClose: () => void;
}

type PrizeType = 'stars' | 'ticket' | 'item';

interface Prize {
  type: PrizeType;
  value: number | string;
  emoji: string;
  labelZh: string;
  labelEn: string;
}

const POSSIBLE_PRIZES: Prize[] = [
  { type: 'stars', value: 1, emoji: '⭐', labelZh: '1颗星星', labelEn: '1 Star' },
  { type: 'stars', value: 2, emoji: '⭐', labelZh: '2颗星星', labelEn: '2 Stars' },
  { type: 'stars', value: 3, emoji: '⭐', labelZh: '3颗星星', labelEn: '3 Stars' },
  { type: 'ticket', value: 1, emoji: '🎫', labelZh: '1张电梯票', labelEn: '1 Elevator Ticket' },
  { type: 'item', value: 'andy_hat', emoji: '🎩', labelZh: 'Andy帽子', labelEn: 'Andy Hat' },
  { type: 'item', value: 'room_cat', emoji: '🐱', labelZh: '房间小猫', labelEn: 'Room Cat' },
];

function pickRandomPrize(): Prize {
  return POSSIBLE_PRIZES[Math.floor(Math.random() * POSSIBLE_PRIZES.length)];
}

export default function MysteryBox({ onClose }: MysteryBoxProps) {
  const language = useGameStore((s) => s.language);
  const grantMysteryPrize = useGameStore((s) => s.grantMysteryPrize);
  const [phase, setPhase] = useState<'closed' | 'shaking' | 'opening' | 'revealed'>('closed');
  const [prize, setPrize] = useState<Prize | null>(null);

  const handleOpen = useCallback(() => {
    if (phase !== 'closed') return;
    const selectedPrize = pickRandomPrize();
    setPrize(selectedPrize);
    setPhase('shaking');
  }, [phase]);

  useEffect(() => {
    if (phase === 'shaking') {
      const timer = setTimeout(() => setPhase('opening'), 2000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'opening' && prize) {
      // Grant the prize
      const store = useGameStore.getState();

      if (prize.type === 'stars') {
        useGameStore.setState({ totalStars: store.totalStars + (prize.value as number) });
      } else if (prize.type === 'ticket') {
        const newTickets = Math.min(store.elevatorTickets + (prize.value as number), MAX_ELEVATOR_TICKETS);
        useGameStore.setState({ elevatorTickets: newTickets });
      } else if (prize.type === 'item') {
        const itemId = prize.value as string;
        if (!store.purchasedItems.includes(itemId)) {
          useGameStore.setState({ purchasedItems: [...store.purchasedItems, itemId] });
        }
      }

      grantMysteryPrize(prize.labelZh);
      setPhase('revealed');
    }
  }, [phase, prize, grantMysteryPrize]);

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={phase === 'revealed' ? onClose : undefined}
      >
        <motion.div
          className={styles.modal}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
        >
          {phase === 'closed' && (
            <>
              <div className={styles.boxEmoji}>🎁</div>
              <h2 className={styles.title}>
                {language === 'zh' ? '神秘宝箱！' : 'Mystery Box!'}
              </h2>
              <motion.button
                className={styles.openButton}
                onClick={handleOpen}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {language === 'zh' ? '点击打开!' : 'Tap to open!'}
              </motion.button>
            </>
          )}

          {phase === 'shaking' && (
            <motion.div
              className={styles.shakingBox}
              animate={{
                x: [0, -8, 8, -6, 6, -4, 4, 0],
                rotate: [0, -3, 3, -2, 2, -1, 1, 0],
              }}
              transition={{
                repeat: Infinity,
                duration: 0.6,
                ease: 'easeInOut',
              }}
            >
              <span className={styles.boxEmojiLarge}>🎁</span>
            </motion.div>
          )}

          {phase === 'opening' && (
            <motion.div
              initial={{ scale: 1, rotate: 0 }}
              animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 0.5 }}
            >
              <span className={styles.boxEmojiLarge}>🎊</span>
            </motion.div>
          )}

          {phase === 'revealed' && prize && (
            <>
              <motion.div
                className={styles.prizeEmoji}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                {prize.emoji}
              </motion.div>
              <h2 className={styles.title}>
                {language === 'zh' ? prize.labelZh : prize.labelEn}
              </h2>
              <motion.button
                className={styles.closeButton}
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {language === 'zh' ? '太棒了！' : 'Awesome!'}
              </motion.button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

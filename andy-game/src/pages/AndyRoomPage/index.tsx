import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { getFloorMeta } from '../../floors/_floorMeta';
import type { FloorReward } from '../../store/useGameStore';
import styles from './index.module.css';

export default function AndyRoomPage() {
  const navigate = useNavigate();
  const language = useGameStore((s) => s.language);
  const completedFloors = useGameStore((s) => s.completedFloors);
  const collectedRewards = useGameStore((s) => s.collectedRewards);
  type RewardItem = FloorReward & { floorNumber: number };
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);

  // Build reward list with floor origin info
  const rewardItems: RewardItem[] = [];
  for (const [floorStr, progress] of Object.entries(completedFloors)) {
    if (progress.reward) {
      rewardItems.push({ ...progress.reward, floorNumber: Number(floorStr) });
    }
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/lobby')}>
          ← {language === 'zh' ? '返回' : 'Back'}
        </button>
        <h1 className={styles.title}>
          {language === 'zh' ? '🏠 Andy的小屋' : "🏠 Andy's Room"}
        </h1>
        <div className={styles.headerStats}>
          <span>{collectedRewards.length} {language === 'zh' ? '件' : 'items'}</span>
        </div>
      </div>

      {/* Room scene */}
      <div className={styles.room}>
        {/* Wall & floor */}
        <div className={styles.wall} />

        {/* Andy */}
        <motion.div
          className={styles.andy}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className={styles.andyEmoji}>🧒</span>
          <span className={styles.andyName}>
            {language === 'zh' ? 'Andy的小屋' : "Andy's Room"}
          </span>
        </motion.div>

        {/* Shelves */}
        {rewardItems.length > 0 ? (
          <div className={styles.shelves}>
            {/* Top shelf */}
            <div className={styles.shelf}>
              <div className={styles.shelfBoard} />
              <div className={styles.shelfItems}>
                {rewardItems.map((item, i) => (
                  <motion.button
                    key={`${item.floorNumber}-${item.emoji}`}
                    className={styles.shelfItem}
                    onClick={() => setSelectedReward(item)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, type: 'spring', stiffness: 200 }}
                    whileHover={{ scale: 1.15, y: -4 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className={styles.itemEmoji}>{item.emoji}</span>
                    <span className={styles.itemLabel}>
                      {language === 'zh' ? item.nameZh : item.nameEn}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.emptyRoom}>
            <span className={styles.emptyEmoji}>📦</span>
            <p className={styles.emptyText}>
              {language === 'zh'
                ? '小屋还是空的，去冒险赢回奖励吧！'
                : 'The room is empty. Go adventure for rewards!'}
            </p>
          </div>
        )}

        {/* Floor decoration */}
        <div className={styles.floorDecor}>
          {rewardItems.length >= 1 && <span className={styles.decorItem}>🕯️</span>}
          {rewardItems.length >= 3 && <span className={styles.decorItem}>🪴</span>}
          {rewardItems.length >= 5 && <span className={styles.decorItem}>🖼️</span>}
          {rewardItems.length >= 7 && <span className={styles.decorItem}>🐱</span>}
        </div>
      </div>

      {/* Reward detail modal */}
      <AnimatePresence>
        {selectedReward && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedReward(null)}
          >
            <motion.div
              className={styles.modalContent}
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className={styles.modalEmoji}>{selectedReward.emoji}</span>
              <h2 className={styles.modalName}>
                {language === 'zh' ? selectedReward.nameZh : selectedReward.nameEn}
              </h2>
              <p className={styles.modalDesc}>
                {language === 'zh' ? selectedReward.descriptionZh : selectedReward.descriptionEn}
              </p>
              <div className={styles.modalOrigin}>
                {language === 'zh'
                  ? `来自第${selectedReward.floorNumber}层`
                  : `From Floor ${selectedReward.floorNumber}`}
                {' — '}
                {language === 'zh'
                  ? getFloorMeta(selectedReward.floorNumber).nameZh
                  : getFloorMeta(selectedReward.floorNumber).nameEn}
              </div>
              <button
                className={styles.modalClose}
                onClick={() => setSelectedReward(null)}
              >
                {language === 'zh' ? '关闭' : 'Close'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

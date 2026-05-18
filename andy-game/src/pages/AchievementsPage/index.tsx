import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { ACHIEVEMENTS } from '../../utils/achievements';
import styles from './index.module.css';

const SHOP_ITEMS_MAP: Record<string, { emoji: string; nameZh: string; nameEn: string; cost: number }> = {
  andy_hat: { emoji: '🎩', nameZh: 'Andy帽子', nameEn: 'Andy Hat', cost: 5 },
  andy_glasses: { emoji: '🤓', nameZh: 'Andy眼镜', nameEn: 'Andy Glasses', cost: 8 },
  andy_cape: { emoji: '🦸', nameZh: 'Andy披风', nameEn: 'Andy Cape', cost: 15 },
};

export default function AchievementsPage() {
  const navigate = useNavigate();
  const language = useGameStore((s) => s.language);
  const completedFloors = useGameStore((s) => s.completedFloors);
  const unlockedFloors = useGameStore((s) => s.unlockedFloors);
  const collectedRewards = useGameStore((s) => s.collectedRewards);
  const totalStars = useGameStore((s) => s.totalStars);
  const unlockedAchievements = useGameStore((s) => s.unlockedAchievements);
  const purchasedItems = useGameStore((s) => s.purchasedItems);

  const completedCount = Object.keys(completedFloors).length;
  const totalFloors = 100;
  const progressPercent = Math.round((completedCount / totalFloors) * 100);

  // Merge purchased shop items into rewards list
  const shopRewards = purchasedItems
    .filter((id) => SHOP_ITEMS_MAP[id])
    .map((id) => {
      const item = SHOP_ITEMS_MAP[id];
      return {
        emoji: item.emoji,
        nameZh: item.nameZh,
        nameEn: item.nameEn,
        descriptionZh: `商店购买`,
        descriptionEn: `From Shop`,
      };
    });

  const allRewards = [...collectedRewards, ...shopRewards];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/lobby')}>
          {language === 'zh' ? '← 返回' : '← Back'}
        </button>
        <h1 className={styles.title}>
          {language === 'zh' ? '🏆 成就与奖励' : '🏆 Achievements'}
        </h1>
        <div className={styles.headerStats}>
          <span>⭐ {totalStars}</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryNumber}>{completedCount}</span>
          <span className={styles.summaryLabel}>
            {language === 'zh' ? '已通关楼层' : 'Floors Cleared'}
          </span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryNumber}>{unlockedFloors.length}</span>
          <span className={styles.summaryLabel}>
            {language === 'zh' ? '已解锁楼层' : 'Floors Unlocked'}
          </span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryNumber}>{allRewards.length}</span>
          <span className={styles.summaryLabel}>
            {language === 'zh' ? '收集奖励' : 'Rewards'}
          </span>
        </div>
      </div>

      {/* Floor progress bar */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {language === 'zh' ? '🏢 楼层进度' : '🏢 Floor Progress'}
        </h2>
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <motion.div
              className={styles.progressFill}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <div className={styles.progressInfo}>
            <span className={styles.progressPercent}>{progressPercent}%</span>
            <span className={styles.progressDetail}>
              {language === 'zh' ? `${completedCount}/${totalFloors} 楼层` : `${completedCount}/${totalFloors} floors`}
            </span>
          </div>
        </div>
      </div>

      {/* Achievement badges grid */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {language === 'zh' ? '🏅 成就徽章' : '🏅 Achievement Badges'}
        </h2>
        <div className={styles.badgeGrid}>
          {ACHIEVEMENTS.map((achievement, i) => {
            const isUnlocked = unlockedAchievements.includes(achievement.id);
            return (
              <motion.div
                key={achievement.id}
                className={`${styles.badgeCard} ${isUnlocked ? styles.badgeUnlocked : styles.badgeLocked}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
              >
                {isUnlocked ? (
                  <>
                    <motion.span
                      className={styles.badgeIcon}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    >
                      {achievement.icon}
                    </motion.span>
                    <span className={styles.badgeName}>
                      {language === 'zh' ? achievement.nameZh : achievement.nameEn}
                    </span>
                    <span className={styles.badgeDesc}>
                      {language === 'zh' ? achievement.descriptionZh : achievement.descriptionEn}
                    </span>
                  </>
                ) : (
                  <>
                    <span className={styles.badgeIconLocked}>🔒</span>
                    <span className={styles.badgeNameLocked}>???</span>
                    <span className={styles.badgeDesc}>
                      {language === 'zh' ? achievement.descriptionZh : achievement.descriptionEn}
                    </span>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* All rewards (floor rewards + shop purchases) */}
      {allRewards.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {language === 'zh' ? '🎁 获得的奖励' : '🎁 Collected Rewards'}
          </h2>
          <div className={styles.rewardGrid}>
            {allRewards.map((reward, i) => (
              <motion.div
                key={i}
                className={styles.rewardCard}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <span className={styles.rewardEmoji}>{reward.emoji}</span>
                <span className={styles.rewardName}>
                  {language === 'zh' ? reward.nameZh : reward.nameEn}
                </span>
                <span className={styles.rewardDesc}>
                  {language === 'zh' ? reward.descriptionZh : reward.descriptionEn}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

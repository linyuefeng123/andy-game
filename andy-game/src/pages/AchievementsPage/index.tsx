import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { getFloorMeta, isFloorImplemented } from '../../floors/_registry';
import { playSound } from '../../utils/audio';
import styles from './index.module.css';

export default function AchievementsPage() {
  const navigate = useNavigate();
  const language = useGameStore((s) => s.language);
  const completedFloors = useGameStore((s) => s.completedFloors);
  const unlockedFloors = useGameStore((s) => s.unlockedFloors);
  const collectedRewards = useGameStore((s) => s.collectedRewards);
  const totalStars = useGameStore((s) => s.totalStars);

  const completedCount = Object.keys(completedFloors).length;

  const handleFloorClick = (floorNum: number) => {
    const isUnlocked = unlockedFloors.includes(floorNum);
    const implemented = isFloorImplemented(floorNum);
    if (!isUnlocked || !implemented) return;
    playSound('click');
    navigate(`/floor/${floorNum}`);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/lobby')}>
          ← {language === 'zh' ? '返回' : 'Back'}
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
          <span className={styles.summaryNumber}>{collectedRewards.length}</span>
          <span className={styles.summaryLabel}>
            {language === 'zh' ? '收集奖励' : 'Rewards'}
          </span>
        </div>
      </div>

      {/* Reward collection */}
      {collectedRewards.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {language === 'zh' ? '🎁 获得的奖励' : '🎁 Collected Rewards'}
          </h2>
          <div className={styles.rewardGrid}>
            {collectedRewards.map((reward, i) => (
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

      {/* Floor list */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {language === 'zh' ? '🏠 楼层进度' : '🏠 Floor Progress'}
        </h2>
        <div className={styles.floorList}>
          {Array.from({ length: 9 }, (_, i) => i + 1).map((floorNum) => {
            const meta = getFloorMeta(floorNum);
            const progress = completedFloors[floorNum];
            const isUnlocked = unlockedFloors.includes(floorNum);
            const isCompleted = progress?.completed;
            const implemented = isFloorImplemented(floorNum);
            const canEnter = isUnlocked && implemented;

            return (
              <div
                key={floorNum}
                className={`${styles.floorRow} ${!isUnlocked ? styles.locked : ''} ${canEnter ? styles.clickable : ''}`}
                onClick={() => handleFloorClick(floorNum)}
              >
                <div className={styles.floorLeft}>
                  <span className={styles.floorNum}>{floorNum}F</span>
                  <span className={styles.floorName}>
                    {isUnlocked
                      ? language === 'zh' ? meta.nameZh : meta.nameEn
                      : '???'}
                  </span>
                </div>
                <div className={styles.floorRight}>
                  {!isUnlocked && <span className={styles.lockIcon}>🔒</span>}
                  {isUnlocked && !implemented && (
                    <span className={styles.statusBuild}>
                      {language === 'zh' ? '建造中' : 'WIP'}
                    </span>
                  )}
                  {canEnter && !isCompleted && (
                    <span className={styles.playButton}>
                      ▶ {language === 'zh' ? '进入' : 'Play'}
                    </span>
                  )}
                  {isCompleted && (
                    <>
                      <span className={styles.starDisplay}>
                        {'⭐'.repeat(progress.stars)}
                      </span>
                      <span className={styles.rewardBadge}>{meta.reward.emoji}</span>
                      <span className={styles.playAgain}>
                        ▶ {language === 'zh' ? '再玩' : 'Replay'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import AndyAvatar from '../../components/AndyAvatar';
import styles from './index.module.css';

export default function AndyPage() {
  const navigate = useNavigate();
  const language = useGameStore((s) => s.language);
  const playerName = useGameStore((s) => s.playerName);
  const adventurePoints = useGameStore((s) => s.adventurePoints);
  const totalStars = useGameStore((s) => s.totalStars);
  const completedFloors = useGameStore((s) => s.completedFloors);
  const collectedRewards = useGameStore((s) => s.collectedRewards);

  const completedCount = Object.keys(completedFloors).length;

  const getLabel = () => {
    if (adventurePoints >= 150) return language === 'zh' ? '传奇冒险王 👑' : 'Legend 👑';
    if (adventurePoints >= 100) return language === 'zh' ? '超级英雄 🦸' : 'Super Hero 🦸';
    if (adventurePoints >= 60) return language === 'zh' ? '聪明小达人 🌟' : 'Smart Star 🌟';
    if (adventurePoints >= 30) return language === 'zh' ? '勇敢探索者 ⚡' : 'Brave Explorer ⚡';
    return language === 'zh' ? '新手冒险家 🌱' : 'Novice Adventurer 🌱';
  };

  const getColor = () => {
    if (adventurePoints >= 150) return '#ffd93d';
    if (adventurePoints >= 100) return '#9b72cf';
    if (adventurePoints >= 60) return '#4d96ff';
    if (adventurePoints >= 30) return '#ffd93d';
    return '#6bcb77';
  };

  const label = getLabel();
  const color = getColor();
  const barWidth = Math.min(100, Math.max(0, (adventurePoints / 200) * 100));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/lobby')}>
          {language === 'zh' ? '🏠 返回' : '🏠 Back'}
        </button>
      </div>

      <motion.div
        className={styles.profileCard}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.avatarArea}>
          <AndyAvatar pose="wave" size={80} />
        </div>
        <h1 className={styles.playerName}>
          {language === 'zh' ? 'Andy100层房子大冒险' : 'Andy 100-Floor Adventure'}
        </h1>
        <p className={styles.playerTitle} style={{ color }}>{label}</p>
      </motion.div>

      <motion.div
        className={styles.iqSection}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <div className={styles.iqHeader}>
          <span className={styles.iqLabel}>
            {language === 'zh' ? '⚔️ 冒险积分' : '⚔️ Adventure Points'}
          </span>
          <span className={styles.iqValue} style={{ color }}>
            {adventurePoints}
          </span>
        </div>
        <div className={styles.iqBar}>
          <motion.div
            className={styles.iqBarFill}
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${barWidth}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <div className={styles.iqScale}>
          <span>0</span>
          <span>50</span>
          <span>100</span>
          <span>150</span>
          <span>200</span>
        </div>
      </motion.div>

      <motion.div
        className={styles.statsGrid}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className={styles.statCard}>
          <span className={styles.statEmoji}>⭐</span>
          <span className={styles.statValue}>{totalStars}</span>
          <span className={styles.statLabel}>
            {language === 'zh' ? '星星' : 'Stars'}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statEmoji}>🏠</span>
          <span className={styles.statValue}>{completedCount}</span>
          <span className={styles.statLabel}>
            {language === 'zh' ? '通关' : 'Cleared'}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statEmoji}>🎁</span>
          <span className={styles.statValue}>{collectedRewards.length}</span>
          <span className={styles.statLabel}>
            {language === 'zh' ? '收藏' : 'Rewards'}
          </span>
        </div>
      </motion.div>

      <motion.div
        className={styles.rulesCard}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.45 }}
      >
        <h3 className={styles.rulesTitle}>
          {language === 'zh' ? '📋 冒险规则' : '📋 Adventure Rules'}
        </h3>
        <ul className={styles.rulesList}>
          <li>
            <span className={styles.ruleIcon}>⭐</span>
            {language === 'zh' ? '通关游戏 → 冒险积分 +星数' : 'Clear game → Adventure Points +stars'}
          </li>
          <li>
            <span className={styles.ruleIcon}>🎫</span>
            {language === 'zh' ? '通关还能获得电梯车票！' : 'Clear floors to earn elevator tickets!'}
          </li>
          <li>
            <span className={styles.ruleIcon}>💡</span>
            {language === 'zh' ? '使用帮助不影响积分' : "Using help doesn't affect points"}
          </li>
          <li>
            <span className={styles.ruleIcon}>🌱</span>
            {language === 'zh' ? '每次冒险都是进步！' : 'Every adventure is progress!'}
          </li>
        </ul>
      </motion.div>
    </div>
  );
}

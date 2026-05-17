import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import AndyAvatar from '../../components/AndyAvatar';
import styles from './index.module.css';

export default function AndyPage() {
  const navigate = useNavigate();
  const language = useGameStore((s) => s.language);
  const playerName = useGameStore((s) => s.playerName);
  const iq = useGameStore((s) => s.iq);
  const totalStars = useGameStore((s) => s.totalStars);
  const completedFloors = useGameStore((s) => s.completedFloors);
  const collectedRewards = useGameStore((s) => s.collectedRewards);

  const completedCount = Object.keys(completedFloors).length;

  const iqLevel = iq >= 150
    ? language === 'zh' ? '超级天才' : 'Super Genius'
    : iq >= 120
      ? language === 'zh' ? '天才' : 'Genius'
      : iq >= 100
        ? language === 'zh' ? '聪明' : 'Smart'
        : iq >= 80
          ? language === 'zh' ? '普通' : 'Normal'
          : iq >= 60
            ? language === 'zh' ? '需要努力' : 'Keep Trying'
            : language === 'zh' ? '加油哦' : 'You Can Do It!';

  const iqColor = iq >= 120 ? '#ffd93d' : iq >= 100 ? '#6bcb77' : iq >= 80 ? '#4d96ff' : '#ff6b6b';

  const iqBarWidth = Math.min(100, Math.max(0, (iq / 200) * 100));

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
        <h1 className={styles.playerName}>{playerName}</h1>
        <p className={styles.playerTitle}>{iqLevel}</p>
      </motion.div>

      <motion.div
        className={styles.iqSection}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <div className={styles.iqHeader}>
          <span className={styles.iqLabel}>
            {language === 'zh' ? '🧠 聪明值 IQ' : '🧠 IQ'}
          </span>
          <span className={styles.iqValue} style={{ color: iqColor }}>
            {iq}
          </span>
        </div>
        <div className={styles.iqBar}>
          <motion.div
            className={styles.iqBarFill}
            style={{ background: iqColor }}
            initial={{ width: 0 }}
            animate={{ width: `${iqBarWidth}%` }}
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
          {language === 'zh' ? '📋 IQ规则' : '📋 IQ Rules'}
        </h3>
        <ul className={styles.rulesList}>
          <li>
            <span className={styles.ruleIcon}>⭐</span>
            {language === 'zh' ? '通关游戏 → IQ +星数' : 'Clear game → IQ +stars'}
          </li>
          <li>
            <span className={styles.ruleIcon}>😊</span>
            {language === 'zh' ? '认输 → IQ -1' : 'Give up → IQ -1'}
          </li>
          <li>
            <span className={styles.ruleIcon}>🏆</span>
            {language === 'zh' ? '认赢 → IQ -2' : 'Claim win → IQ -2'}
          </li>
          <li>
            <span className={styles.ruleIcon}>💡</span>
            {language === 'zh' ? '使用帮助不影响IQ' : 'Using help doesn\'t affect IQ'}
          </li>
        </ul>
      </motion.div>
    </div>
  );
}

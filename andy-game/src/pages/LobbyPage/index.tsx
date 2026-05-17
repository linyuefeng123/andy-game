import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { useElevator } from '../../hooks/useElevator';
import { playSound } from '../../utils/audio';
import AndyAvatar from '../../components/AndyAvatar';
import styles from './index.module.css';

export default function LobbyPage() {
  const navigate = useNavigate();
  const playerName = useGameStore((s) => s.playerName);
  const language = useGameStore((s) => s.language);
  const totalStars = useGameStore((s) => s.totalStars);
  const completedFloors = useGameStore((s) => s.completedFloors);
  const unlockedFloors = useGameStore((s) => s.unlockedFloors);
  const collectedRewards = useGameStore((s) => s.collectedRewards);
  const iq = useGameStore((s) => s.iq);
  const { elevatorUsesRemaining, pressElevator, canUseElevator } = useElevator();

  const handleElevator = () => {
    if (!canUseElevator) return;
    playSound('ding');
    const floor = pressElevator();
    if (floor !== null) {
      navigate('/elevator', { state: { targetFloor: floor } });
    }
  };

  const completedCount = Object.keys(completedFloors).length;

  return (
    <div className={styles.container}>
      {/* Clouds background */}
      <div className={styles.clouds}>
        <div className={styles.cloud} style={{ top: '10%', animationDuration: '20s' }}>☁️</div>
        <div className={styles.cloud} style={{ top: '25%', animationDuration: '25s', animationDelay: '5s' }}>☁️</div>
        <div className={styles.cloud} style={{ top: '60%', animationDuration: '30s', animationDelay: '10s' }}>☁️</div>
      </div>

      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.playerInfo} onClick={() => navigate('/andy')} style={{ cursor: 'pointer' }}>
            <AndyAvatar pose="idle" size={40} />
            <span className={styles.playerName}>{playerName}</span>
            <span className={styles.iqBadge}>🧠 {iq}</span>
          </div>
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span>⭐</span>
              <span>{totalStars}</span>
            </div>
            <div className={styles.statItem}>
              <span>🏠</span>
              <span>{completedCount}/100</span>
            </div>
          </div>
        </div>

        {/* House visualization */}
        <motion.div
          className={styles.houseArea}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className={styles.houseEmoji}>🏰</div>
          <p className={styles.houseLabel}>
            {language === 'zh' ? '云端100层房子' : 'The Cloud House'}
          </p>
        </motion.div>

        {/* Elevator button */}
        <motion.button
          className={`${styles.elevatorButton} ${!canUseElevator ? styles.disabled : ''}`}
          onClick={handleElevator}
          disabled={!canUseElevator}
          whileHover={canUseElevator ? { scale: 1.05 } : undefined}
          whileTap={canUseElevator ? { scale: 0.95 } : undefined}
        >
          <span className={styles.elevatorIcon}>🛗</span>
          <span className={styles.elevatorText}>
            {canUseElevator
              ? language === 'zh'
                ? `按电梯 (${elevatorUsesRemaining}次)`
                : `Elevator (${elevatorUsesRemaining} left)`
              : language === 'zh'
                ? 'Andy今天已经累了，下次再来吧！'
                : "Andy is tired, come back next time!"}
          </span>
        </motion.button>

        {/* Bottom buttons */}
        <div className={styles.bottomButtons}>
          <button className={styles.andyButton} onClick={() => navigate('/andy')}>
            <span>🧒</span>
            <span>{language === 'zh' ? `Andy IQ:${iq}` : `Andy IQ:${iq}`}</span>
          </button>
          <button className={styles.achieveButton} onClick={() => navigate('/achievements')}>
            <span>🏆</span>
            <span>{language === 'zh' ? '成就' : 'Achieve'}</span>
          </button>
          <button className={styles.mapButton} onClick={() => navigate('/map')}>
            <span>🗺️</span>
            <span>{language === 'zh' ? '地图' : 'Map'}</span>
          </button>
          <button className={styles.roomButton} onClick={() => navigate('/room')}>
            <span>🏠</span>
            <span>{language === 'zh' ? `小屋 (${collectedRewards.length})` : `Room (${collectedRewards.length})`}</span>
          </button>
          <div className={styles.floorStatus}>
            <span>🔓 {unlockedFloors.length}/100</span>
          </div>
        </div>
      </div>
    </div>
  );
}

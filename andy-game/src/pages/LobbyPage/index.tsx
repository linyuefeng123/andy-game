import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore, AP_THRESHOLDS } from '../../store/useGameStore';
import { useElevator } from '../../hooks/useElevator';
import { playSound } from '../../utils/audio';
import AndyAvatar from '../../components/AndyAvatar';
import DailyRewardModal from '../../components/DailyRewardModal';
import LevelUpCeremony from '../../components/LevelUpCeremony';
import CompletionCeremony from '../../components/CompletionCeremony';
import MysteryBox from '../../components/MysteryBox';
import styles from './index.module.css';

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function LobbyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const playerName = useGameStore((s) => s.playerName);
  const language = useGameStore((s) => s.language);
  const totalStars = useGameStore((s) => s.totalStars);
  const completedFloors = useGameStore((s) => s.completedFloors);
  const unlockedFloors = useGameStore((s) => s.unlockedFloors);
  const collectedRewards = useGameStore((s) => s.collectedRewards);
  const adventurePoints = useGameStore((s) => s.adventurePoints);
  const lastPlayDate = useGameStore((s) => s.lastPlayDate);
  const { elevatorTickets, pressElevator, canUseElevator } = useElevator();

  const [showDailyReward, setShowDailyReward] = useState(false);
  const [showLevelUpCeremony, setShowLevelUpCeremony] = useState(false);
  const [showCompletionCeremony, setShowCompletionCeremony] = useState(false);
  const [showMysteryBox, setShowMysteryBox] = useState(false);
  const [mysteryBoxChecked, setMysteryBoxChecked] = useState(false);

  // Daily reward check on mount
  useEffect(() => {
    const today = getTodayISO();
    if (lastPlayDate !== today) {
      setShowDailyReward(true);
    }
  }, [lastPlayDate]);

  // Level up ceremony check - when adventurePoints crosses a threshold
  const shownAPThresholds = useGameStore((s) => s.shownAPThresholds);

  useEffect(() => {
    const hasNewThreshold = AP_THRESHOLDS.some(
      (t) => adventurePoints >= t && !shownAPThresholds.includes(t)
    );
    if (hasNewThreshold) {
      setShowLevelUpCeremony(true);
    }
  }, [adventurePoints, shownAPThresholds]);

  // Mystery box check after returning from a floor (10% chance)
  const locationState = location.state as { fromFloor?: boolean } | null;

  useEffect(() => {
    if (locationState?.fromFloor && !mysteryBoxChecked) {
      setMysteryBoxChecked(true);
      if (Math.random() < 0.1) {
        // Small delay so the page renders first
        const timer = setTimeout(() => setShowMysteryBox(true), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [locationState, mysteryBoxChecked]);

  const handleElevator = () => {
    if (!canUseElevator) return;
    playSound('ding');
    const floor = pressElevator();
    if (floor !== null) {
      navigate('/elevator', { state: { targetFloor: floor } });
    }
  };

  const handleDailyRewardClose = useCallback(() => {
    setShowDailyReward(false);
  }, []);

  const handleLevelUpComplete = useCallback(() => {
    setShowLevelUpCeremony(false);
  }, []);

  const handleCompletionComplete = useCallback(() => {
    setShowCompletionCeremony(false);
  }, []);

  const handleMysteryBoxClose = useCallback(() => {
    setShowMysteryBox(false);
  }, []);

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
            <span className={styles.iqBadge}>⚔️ {adventurePoints}</span>
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
                ? `按电梯 🎫${elevatorTickets}`
                : `Elevator 🎫${elevatorTickets}`
              : language === 'zh'
                ? '完成一层获得更多车票！'
                : 'Complete a floor for more tickets!'}
          </span>
        </motion.button>

        {/* Bottom buttons */}
        <div className={styles.bottomButtons}>
          <button className={styles.andyButton} onClick={() => navigate('/andy')}>
            <span>🧒</span>
            <span>{language === 'zh' ? `Andy ⚔️${adventurePoints}` : `Andy ⚔️${adventurePoints}`}</span>
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
          <button className={styles.shopButton} onClick={() => navigate('/shop')}>
            <span>🛒</span>
            <span>{language === 'zh' ? '商店' : 'Shop'}</span>
          </button>
          <div className={styles.floorStatus}>
            <span>🔓 {unlockedFloors.length}/100</span>
          </div>
        </div>
      </div>

      {/* Overlays */}
      {showDailyReward && <DailyRewardModal onClose={handleDailyRewardClose} />}
      {showLevelUpCeremony && <LevelUpCeremony onComplete={handleLevelUpComplete} />}
      {showCompletionCeremony && <CompletionCeremony onComplete={handleCompletionComplete} />}
      {showMysteryBox && <MysteryBox onClose={handleMysteryBoxClose} />}
    </div>
  );
}

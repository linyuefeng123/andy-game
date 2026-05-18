import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore, AP_THRESHOLDS } from '../../store/useGameStore';
import { useElevator } from '../../hooks/useElevator';
import { playSound, createBGMPlayer, type BGMPlayer } from '../../utils/audio';
import AndyAvatar from '../../components/AndyAvatar';
import styles from './index.module.css';

const DailyRewardModal = lazy(() => import('../../components/DailyRewardModal'));
const LevelUpCeremony = lazy(() => import('../../components/LevelUpCeremony'));
const CompletionCeremony = lazy(() => import('../../components/CompletionCeremony'));
const MysteryBox = lazy(() => import('../../components/MysteryBox'));

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function LobbyMusic() {
  const musicEnabled = useGameStore((s) => s.musicEnabled);
  const playerRef = useRef<BGMPlayer | null>(null);

  useEffect(() => {
    if (!playerRef.current) {
      playerRef.current = createBGMPlayer();
    }
    if (musicEnabled) {
      playerRef.current.start();
    } else {
      playerRef.current.stop();
    }
    return () => { playerRef.current?.stop(); };
  }, [musicEnabled]);

  // Handle browser autoplay policy: resume AudioContext on first user interaction
  useEffect(() => {
    if (!musicEnabled) return;
    const handleClick = () => {
      if (musicEnabled && playerRef.current) {
        playerRef.current.start();
      }
    };
    document.addEventListener('click', handleClick, { once: true });
    return () => document.removeEventListener('click', handleClick);
  }, [musicEnabled]);

  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  return null;
}

export default function LobbyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const language = useGameStore((s) => s.language);
  const adventurePoints = useGameStore((s) => s.adventurePoints);
  const lastPlayDate = useGameStore((s) => s.lastPlayDate);
  const { elevatorTickets, pressElevator, canUseElevator } = useElevator();
  const musicEnabled = useGameStore((s) => s.musicEnabled);
  const toggleMusic = useGameStore((s) => s.toggleMusic);

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
          <div className={styles.playerInfo}>
            <AndyAvatar pose="idle" size={40} />
            <span className={styles.playerName}>
              {language === 'zh' ? 'Andy100层房子大冒险' : 'Andy 100-Floor Adventure'}
            </span>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.musicButton} onClick={() => { toggleMusic(); playSound('click'); }}>
              {musicEnabled ? '🔊' : '🔇'}
            </button>
            <button className={styles.levelBadge} onClick={() => navigate('/andy')}>
              ⚔️ Lv.{Math.floor(adventurePoints / 30) + 1}
            </button>
            <button className={styles.shopIconButton} onClick={() => navigate('/shop')}>
              🛒
            </button>
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

        {/* Elevator shaft connecting house to button */}
        <motion.div
          className={styles.elevatorShaft}
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <svg width="36" height="56" viewBox="0 0 36 56" fill="none">
            <line x1="6" y1="0" x2="6" y2="56" stroke="#ffd93d" strokeWidth="2" opacity="0.4" />
            <line x1="30" y1="0" x2="30" y2="56" stroke="#ffd93d" strokeWidth="2" opacity="0.4" />
            <line x1="18" y1="0" x2="18" y2="18" stroke="#ffd93d" strokeWidth="1" opacity="0.25" />
            <rect x="8" y="16" width="20" height="14" rx="3" fill="#ffd93d" opacity="0.75">
              <animate attributeName="y" values="16;34;16" dur="3s" repeatCount="indefinite" />
            </rect>
            <line x1="18" y1="18" x2="18" y2="28" stroke="#2d2d44" strokeWidth="1" opacity="0.4">
              <animate attributeName="y1" values="18;36;18" dur="3s" repeatCount="indefinite" />
              <animate attributeName="y2" values="28;46;28" dur="3s" repeatCount="indefinite" />
            </line>
          </svg>
          <motion.div
            className={styles.elevatorDing}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🔔
          </motion.div>
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
          <button className={styles.achieveButton} onClick={() => navigate('/achievements')}>
            <span>🏆</span>
            <span>{language === 'zh' ? '成就' : 'Achieve'}</span>
          </button>
          <button className={styles.mapButton} onClick={() => navigate('/map')}>
            <span>🏢</span>
            <span>{language === 'zh' ? '楼层' : 'Floors'}</span>
          </button>
        </div>
      </div>

      {/* Overlays */}
      <Suspense>{showDailyReward && <DailyRewardModal onClose={handleDailyRewardClose} />}</Suspense>
      <Suspense>{showLevelUpCeremony && <LevelUpCeremony onComplete={handleLevelUpComplete} />}</Suspense>
      <Suspense>{showCompletionCeremony && <CompletionCeremony onComplete={handleCompletionComplete} />}</Suspense>
      <Suspense>{showMysteryBox && <MysteryBox onClose={handleMysteryBoxClose} />}</Suspense>
      <LobbyMusic />
    </div>
  );
}

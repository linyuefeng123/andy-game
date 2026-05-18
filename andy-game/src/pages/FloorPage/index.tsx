import { Suspense, useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import type { FloorReward } from '../../store/useGameStore';
import ErrorBoundary from '../../components/ErrorBoundary';
import { getFloorComponent, preloadFloorComponent, getFloorMeta, isFloorImplemented, randomHelper, type HelperCharacter } from '../../floors/_registry';
import styles from './index.module.css';

const MAX_HELP = 3;

export default function FloorPage() {
  const { floorId } = useParams<{ floorId: string }>();
  const navigate = useNavigate();
  const language = useGameStore((s) => s.language);
  const floorNumber = parseInt(floorId ?? '1', 10);
  const [phase, setPhase] = useState<'story' | 'transitioning' | 'game'>('story');
  const [replayKey, setReplayKey] = useState(0);
  const meta = getFloorMeta(floorNumber);

  const [helperChar] = useState<HelperCharacter>(randomHelper);
  const [helpRemaining, setHelpRemaining] = useState(MAX_HELP);

  // Preload floor component synchronously on first render
  const hasPreloaded = useRef(false);
  if (!hasPreloaded.current && isFloorImplemented(floorNumber)) {
    hasPreloaded.current = true;
    preloadFloorComponent(floorNumber);
  }

  useEffect(() => {
    if (isFloorImplemented(floorNumber)) {
      preloadFloorComponent(floorNumber);
    }
  }, [floorNumber]);

  const handleExit = () => {
    navigate('/lobby', { state: { fromFloor: true } });
  };

  const handleComplete = (stars: number, reward?: FloorReward) => {
    useGameStore.getState().completeFloor(floorNumber, stars, reward);
    useGameStore.getState().addAdventurePoints(stars);
  };

  const handleHelpUsed = () => {
    if (helpRemaining > 0) {
      setHelpRemaining((h) => h - 1);
    }
  };

  const handleConcede = () => {
    // Just exit, no penalty
  };

  const handleReplay = () => {
    setReplayKey((k) => k + 1);
    setHelpRemaining(MAX_HELP);
  };

  const handleEnterRoom = () => {
    if (phase !== 'story') return;
    setPhase('transitioning');
    setTimeout(() => setPhase('game'), 600);
  };

  if (!isFloorImplemented(floorNumber)) {
    return (
      <div className={styles.container}>
        <div className={styles.construction}>
          <span className={styles.constructionEmoji}>🏗️</span>
          <h2 className={styles.constructionTitle}>
            {language === 'zh' ? '这层还在建造中...' : 'This floor is under construction...'}
          </h2>
          <p className={styles.constructionText}>
            {language === 'zh'
              ? 'Andy正在帮忙建造，敬请期待！'
              : 'Andy is helping build it. Stay tuned!'}
          </p>
          <button className={styles.backButton} onClick={handleExit}>
            {language === 'zh' ? '🏠 回到大厅' : '🏠 Back to Lobby'}
          </button>
        </div>
      </div>
    );
  }

  const FloorComponent = getFloorComponent(floorNumber);
  const story = language === 'zh' ? meta.storyZh : meta.storyEn;
  const bgColor = meta.bgColor;
  const difficulty = useGameStore.getState().getDifficultyLevel(floorNumber);
  const difficultyLabel = difficulty === 1
    ? (language === 'zh' ? '⭐简单' : '⭐Easy')
    : difficulty === 2
      ? (language === 'zh' ? '⭐⭐中等' : '⭐⭐Medium')
      : (language === 'zh' ? '⭐⭐⭐困难' : '⭐⭐⭐Hard');

  return (
    <div className={styles.container} style={bgColor ? { background: `linear-gradient(180deg, ${bgColor}, var(--color-bg))` } : undefined}>
      {/* Hidden Suspense boundary to warm the lazy component */}
      {phase === 'story' && FloorComponent && (
        <div style={{ display: 'none' }} aria-hidden="true">
          <ErrorBoundary>
            <Suspense fallback={null}>
              <FloorComponent
                key={`preload-${replayKey}`}
                onExit={() => {}}
                onComplete={() => {}}
                helperChar={helperChar}
                helpRemaining={helpRemaining}
                onHelpUsed={() => {}}
                onConcede={() => {}}
                onReplay={() => {}}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      <AnimatePresence mode="wait">
        {phase !== 'game' ? (
          <motion.div
            key="story"
            className={styles.storyCard}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ duration: 0.4 }}
          >
            <div className={styles.storyFloorLabel}>{floorNumber}F</div>
            <h2 className={styles.storyTitle}>
              {language === 'zh' ? meta.nameZh : meta.nameEn}
            </h2>
            <p className={styles.storyText}>{story}</p>
            <button
              className={styles.storyButton}
              onClick={handleEnterRoom}
              disabled={phase === 'transitioning'}
            >
              {language === 'zh' ? '🚪 进入房间' : '🚪 Enter Room'}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="game"
            className={styles.gameWrapper}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div className={styles.floorHeader}>
              <button className={styles.backButton} onClick={handleExit}>
                {language === 'zh' ? '🏠 返回' : '🏠 Back'}
              </button>
              <div className={styles.floorTitle}>
                <span className={styles.floorNumber}>{floorNumber}F</span>
                <span className={styles.floorName}>
                  {language === 'zh' ? meta.nameZh : meta.nameEn}
                </span>
                <span className={styles.difficultyLabel}>{difficultyLabel}</span>
              </div>
              <button className={styles.skipButton} onClick={handleExit}>
                {language === 'zh' ? '⏭️ 跳过' : '⏭️ Skip'}
              </button>
            </div>

            <div className={styles.gameArea}>
              {FloorComponent && (
                <ErrorBoundary>
                  <Suspense fallback={
                    <div className={styles.loadingContainer}>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        style={{ fontSize: '32px' }}
                      >
                        🚪
                      </motion.div>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '12px' }}>
                        {language === 'zh' ? '加载中...' : 'Loading...'}
                      </p>
                    </div>
                  }>
                    <FloorComponent
                    key={replayKey}
                    onExit={handleExit}
                    onComplete={handleComplete}
                    helperChar={helperChar}
                    helpRemaining={helpRemaining}
                    onHelpUsed={handleHelpUsed}
                    onConcede={handleConcede}
                    onReplay={handleReplay}
                  />
                  </Suspense>
                </ErrorBoundary>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

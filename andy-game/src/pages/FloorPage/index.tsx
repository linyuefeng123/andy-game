import { Suspense, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import type { FloorReward } from '../../store/useGameStore';
import { getFloorComponent, getFloorMeta, isFloorImplemented, randomHelper, HELPER_CHARACTERS, type HelperCharacter } from '../../floors/_registry';
import styles from './index.module.css';

const MAX_HELP = 3;

export default function FloorPage() {
  const { floorId } = useParams<{ floorId: string }>();
  const navigate = useNavigate();
  const language = useGameStore((s) => s.language);
  const floorNumber = parseInt(floorId ?? '1', 10);
  const [showStory, setShowStory] = useState(true);
  const meta = getFloorMeta(floorNumber);

  const [helperChar] = useState<HelperCharacter>(randomHelper);
  const [helpRemaining, setHelpRemaining] = useState(MAX_HELP);

  const handleExit = () => {
    navigate('/lobby');
  };

  const handleComplete = (stars: number, reward?: FloorReward) => {
    useGameStore.getState().completeFloor(floorNumber, stars, reward);
    useGameStore.getState().adjustIq(stars);
  };

  const handleHelpUsed = () => {
    if (helpRemaining > 0) {
      setHelpRemaining((h) => h - 1);
    }
  };

  const handleConcede = () => {
    useGameStore.getState().adjustIq(-1);
  };

  const handleClaimWin = () => {
    useGameStore.getState().adjustIq(-2);
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
  const helper = HELPER_CHARACTERS[helperChar];

  if (showStory && story) {
    return (
      <div className={styles.container} style={bgColor ? { background: `linear-gradient(180deg, ${bgColor}, var(--color-bg))` } : undefined}>
        <motion.div
          className={styles.storyCard}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.storyFloorLabel}>{floorNumber}F</div>
          <h2 className={styles.storyTitle}>
            {language === 'zh' ? meta.nameZh : meta.nameEn}
          </h2>
          <p className={styles.storyText}>{story}</p>
          <div className={styles.helperPreview}>
            <span className={styles.helperEmoji}>{helper.emoji}</span>
            <span className={styles.helperName}>
              {language === 'zh' ? `${helper.nameZh}会帮助你！` : `${helper.nameEn} will help you!`}
            </span>
            <span className={styles.helpCount}>
              {language === 'zh' ? `可帮助 ${MAX_HELP} 次` : `${MAX_HELP} helps available`}
            </span>
          </div>
          <button
            className={styles.storyButton}
            onClick={() => setShowStory(false)}
          >
            {language === 'zh' ? '🚪 进入房间' : '🚪 Enter Room'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.container} style={bgColor ? { background: `linear-gradient(180deg, ${bgColor}, var(--color-bg))` } : undefined}>
      <div className={styles.floorHeader}>
        <button className={styles.backButton} onClick={handleExit}>
          {language === 'zh' ? '🏠 返回' : '🏠 Back'}
        </button>
        <div className={styles.floorTitle}>
          <span className={styles.floorNumber}>{floorNumber}F</span>
          <span className={styles.floorName}>
            {language === 'zh' ? meta.nameZh : meta.nameEn}
          </span>
        </div>
        <button className={styles.skipButton} onClick={handleExit}>
          {language === 'zh' ? '⏭️ 跳过' : '⏭️ Skip'}
        </button>
      </div>

      {/* Helper character bar */}
      <div className={styles.helperBar}>
        <span className={styles.helperEmoji}>{helper.emoji}</span>
        <span className={styles.helperName}>
          {language === 'zh' ? helper.nameZh : helper.nameEn}
        </span>
        <div className={styles.helpDots}>
          {[1, 2, 3].map((i) => (
            <span key={i} className={`${styles.helpDot} ${i <= helpRemaining ? styles.helpDotActive : ''}`}>
              💡
            </span>
          ))}
        </div>
      </div>

      <div className={styles.gameArea}>
        {FloorComponent && (
          <Suspense fallback={<div className={styles.loading}>...</div>}>
            <FloorComponent
              onExit={handleExit}
              onComplete={handleComplete}
              helperChar={helperChar}
              helpRemaining={helpRemaining}
              onHelpUsed={handleHelpUsed}
              onConcede={handleConcede}
              onClaimWin={handleClaimWin}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}

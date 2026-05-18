import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { getFloorMeta, IMPLEMENTED_FLOORS, preloadFloorComponent } from '../../floors/_registry';
import styles from './index.module.css';

const ALL_FLOORS = IMPLEMENTED_FLOORS;

const RANGE_TABS = [
  { labelZh: '1-20', labelEn: '1-20', min: 1, max: 20 },
  { labelZh: '21-40', labelEn: '21-40', min: 21, max: 40 },
  { labelZh: '41-60', labelEn: '41-60', min: 41, max: 60 },
];

export default function FloorMapPage() {
  const navigate = useNavigate();
  const language = useGameStore((s) => s.language);
  const completedFloors = useGameStore((s) => s.completedFloors);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const towerRef = useRef<HTMLDivElement>(null);
  const [showBackTop, setShowBackTop] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const filteredFloors = ALL_FLOORS.filter((f) => {
    const tab = RANGE_TABS[activeTab];
    return f >= tab.min && f <= tab.max;
  });

  // Show/hide back-to-top button based on scroll
  useEffect(() => {
    const el = towerRef.current;
    if (!el) return;
    const handleScroll = () => {
      setShowBackTop(el.scrollTop > 300);
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    towerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFloorClick = (floorNumber: number) => {
    navigate(`/floor/${floorNumber}`);
  };

  const handleFloorHover = useCallback((floorNumber: number) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      preloadFloorComponent(floorNumber);
    }, 150);
  }, []);

  const handleFloorLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((floorNumber: number) => {
    preloadFloorComponent(floorNumber);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/lobby')}>
          {language === 'zh' ? '← 返回' : '← Back'}
        </button>
        <h1 className={styles.title}>
          {language === 'zh' ? '🏰 楼层地图' : '🏰 Floor Map'}
        </h1>
        <div style={{ width: 60 }} />
      </div>

      {/* Floor range filter tabs */}
      <div className={styles.tabBar}>
        {RANGE_TABS.map((tab, i) => (
          <button
            key={i}
            className={`${styles.tab} ${activeTab === i ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {language === 'zh' ? tab.labelZh : tab.labelEn}
          </button>
        ))}
      </div>

      <div className={styles.tower} ref={towerRef}>
        {filteredFloors.map((floorNum) => {
          const meta = getFloorMeta(floorNum);
          const isCompleted = !!completedFloors[floorNum];
          const isImplemented = IMPLEMENTED_FLOORS.includes(floorNum);
          const stars = completedFloors[floorNum]?.stars ?? 0;

          return (
            <motion.div
              key={floorNum}
              className={styles.floorRow}
              onClick={() => handleFloorClick(floorNum)}
              onMouseEnter={() => handleFloorHover(floorNum)}
              onMouseLeave={handleFloorLeave}
              onTouchStart={() => handleTouchStart(floorNum)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              layout
            >
              <div className={styles.floorNumber}>
                {floorNum}F
              </div>

              <div className={styles.floorInfo}>
                <span className={styles.floorName}>
                  {language === 'zh' ? meta.nameZh : meta.nameEn}
                </span>
                {!isImplemented && (
                  <span className={styles.construction}>
                    {language === 'zh' ? '🏗️ 建造中' : '🏗️ Building'}
                  </span>
                )}
              </div>

              <div className={styles.floorStatus}>
                {isCompleted && (
                  <span className={styles.stars}>
                    {'⭐'.repeat(stars)}
                  </span>
                )}
                <span className={styles.categoryTag}>
                  {meta.category === 'education'
                    ? '📚'
                    : meta.category === 'board'
                      ? '♟️'
                      : '✨'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className={styles.legend}>
        <span>📚 {language === 'zh' ? '教育' : 'Edu'}</span>
        <span>♟️ {language === 'zh' ? '棋牌' : 'Board'}</span>
        <span>✨ {language === 'zh' ? '幻想' : 'Fantasy'}</span>
      </div>

      {/* Back to top button */}
      <AnimatePresence>
        {showBackTop && (
          <motion.button
            className={styles.backTop}
            onClick={scrollToTop}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            whileTap={{ scale: 0.9 }}
          >
            ⬆️
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

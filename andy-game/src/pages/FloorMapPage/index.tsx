import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { getFloorMeta, IMPLEMENTED_FLOORS } from '../../floors/_registry';
import styles from './index.module.css';

const ALL_FLOORS = IMPLEMENTED_FLOORS;

export default function FloorMapPage() {
  const navigate = useNavigate();
  const language = useGameStore((s) => s.language);
  const completedFloors = useGameStore((s) => s.completedFloors);

  const handleFloorClick = (floorNumber: number) => {
    navigate(`/floor/${floorNumber}`);
  };

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

      <div className={styles.tower}>
        {ALL_FLOORS.map((floorNum) => {
          const meta = getFloorMeta(floorNum);
          const isCompleted = !!completedFloors[floorNum];
          const isImplemented = IMPLEMENTED_FLOORS.includes(floorNum);
          const stars = completedFloors[floorNum]?.stars ?? 0;

          return (
            <motion.div
              key={floorNum}
              className={styles.floorRow}
              onClick={() => handleFloorClick(floorNum)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
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
    </div>
  );
}

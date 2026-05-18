import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import styles from './index.module.css';

export default function WelcomePage() {
  const navigate = useNavigate();
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const setLanguage = useGameStore((s) => s.setLanguage);
  const language = useGameStore((s) => s.language);
  const resetElevatorTickets = useGameStore((s) => s.resetElevatorTickets);

  const selectAndy = () => {
    playSound('click');
    setPlayerName('Andy100层房子大冒险');
    resetElevatorTickets();
    navigate('/lobby');
  };

  const toggleLanguage = () => {
    playSound('click');
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  return (
    <div className={styles.container}>
      {/* Stars background */}
      <div className={styles.stars}>
        {Array.from({ length: 30 }, (_, i) => (
          <div
            key={i}
            className={styles.star}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${1.5 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <motion.div
        className={styles.content}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <div className={styles.cloudHouse}>
          <span className={styles.houseEmoji}>🏰</span>
          <span className={styles.cloudEmoji}>☁️</span>
        </div>

        <h1 className={styles.title}>
          {language === 'zh' ? '100层房子的故事' : 'The 100-Floor House'}
        </h1>
        <p className={styles.subtitle}>
          {language === 'zh'
            ? 'Andy100层房子大冒险'
            : "Andy's 100-Floor Adventure"}
        </p>

        <motion.button
          className={styles.selectButton}
          onClick={selectAndy}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className={styles.characterIcon}>🧒</span>
          <span className={styles.characterName}>
            {language === 'zh' ? 'Andy100层房子大冒险' : 'Andy 100-Floor Adventure'}
          </span>
          <span className={styles.selectText}>
            {language === 'zh' ? '选择角色' : 'Select Character'}
          </span>
        </motion.button>

        <button className={styles.langButton} onClick={toggleLanguage}>
          {language === 'zh' ? '🇬🇧 English' : '🇨🇳 中文'}
        </button>
      </motion.div>
    </div>
  );
}

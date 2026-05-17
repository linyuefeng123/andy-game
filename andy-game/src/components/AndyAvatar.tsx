import { motion } from 'framer-motion';
import styles from './AndyAvatar.module.css';

type AndyPose = 'idle' | 'wave' | 'jump' | 'sleep' | 'walk';

interface AndyAvatarProps {
  pose?: AndyPose;
  size?: number;
  className?: string;
}

export default function AndyAvatar({ pose = 'idle', size = 64, className }: AndyAvatarProps) {
  const poseClass = styles[pose] || styles.idle;

  return (
    <motion.div
      className={`${styles.avatar} ${poseClass} ${className || ''}`}
      style={{ width: size, height: size }}
      animate={pose === 'jump' ? { y: [0, -12, 0] } : undefined}
      transition={pose === 'jump' ? { repeat: Infinity, duration: 0.8, ease: 'easeInOut' } : undefined}
    >
      <div className={styles.body}>
        <div className={styles.head}>
          <div className={styles.hair} />
          <div className={styles.eyes}>
            <div className={`${styles.eye} ${pose === 'sleep' ? styles.eyeClosed : ''}`} />
            <div className={`${styles.eye} ${pose === 'sleep' ? styles.eyeClosed : ''}`} />
          </div>
          <div className={styles.mouth} />
        </div>
        <div className={styles.shirt} />
      </div>
      {pose === 'wave' && (
        <motion.div
          className={styles.arm}
          animate={{ rotate: [0, 30, 0] }}
          transition={{ repeat: Infinity, duration: 0.6 }}
        />
      )}
      {pose === 'sleep' && (
        <motion.div
          className={styles.zzz}
          animate={{ y: [-5, -15], opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          Zzz
        </motion.div>
      )}
    </motion.div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { playSound } from '../../utils/audio';
import styles from './index.module.css';

type ElevatorState = 'closing' | 'moving' | 'opening' | 'arrived';

export default function ElevatorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const targetFloor = (location.state as { targetFloor?: number })?.targetFloor ?? 1;
  const language = useGameStore((s) => s.language);
  const visitFloor = useGameStore((s) => s.visitFloor);

  const [state, setState] = useState<ElevatorState>('closing');
  const [displayNumber, setDisplayNumber] = useState(1);

  useEffect(() => {
    playSound('ding');

    // Closing doors
    const closeTimer = setTimeout(() => {
      setState('moving');
    }, 800);

    // Number spinning
    let spinCount = 0;
    const maxSpins = 15;
    const spinInterval = setInterval(() => {
      setDisplayNumber(Math.floor(Math.random() * 100) + 1);
      spinCount++;
      if (spinCount >= maxSpins) {
        clearInterval(spinInterval);
        setDisplayNumber(targetFloor);
        setState('opening');
      }
    }, 100);

    // Opening doors
    const openTimer = setTimeout(() => {
      setState('arrived');
    }, 2500);

    // Navigate to floor
    const navTimer = setTimeout(() => {
      visitFloor(targetFloor);
      navigate(`/floor/${targetFloor}`);
    }, 4000);

    return () => {
      clearTimeout(closeTimer);
      clearInterval(spinInterval);
      clearTimeout(openTimer);
      clearTimeout(navTimer);
    };
  }, [targetFloor, navigate, visitFloor]);

  return (
    <div className={styles.container}>
      <div className={styles.elevatorShaft}>
        {/* Floor display */}
        <div className={styles.floorDisplay}>
          <AnimatePresence mode="wait">
            <motion.span
              key={displayNumber}
              className={styles.floorNumber}
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ duration: 0.08 }}
            >
              {displayNumber}F
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Elevator doors */}
        <div className={styles.doorFrame}>
          <div
            className={`${styles.door} ${styles.doorLeft} ${
              state === 'closing' ? styles.closing : state === 'opening' || state === 'arrived' ? styles.open : ''
            }`}
          />
          <div
            className={`${styles.door} ${styles.doorRight} ${
              state === 'closing' ? styles.closing : state === 'opening' || state === 'arrived' ? styles.open : ''
            }`}
          />
          <div className={styles.doorContent}>
            <span className={styles.andyInElevator}>🧒</span>
          </div>
        </div>

        {/* Status text */}
        <motion.p
          className={styles.statusText}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {state === 'closing' && (language === 'zh' ? '电梯关门中...' : 'Doors closing...')}
          {state === 'moving' && (language === 'zh' ? '电梯运行中...' : 'Moving...')}
          {state === 'opening' && (language === 'zh' ? '到达了！' : 'Arrived!')}
          {state === 'arrived' &&
            (language === 'zh'
              ? `欢迎来到第${targetFloor}层！`
              : `Welcome to Floor ${targetFloor}!`)}
        </motion.p>
      </div>
    </div>
  );
}

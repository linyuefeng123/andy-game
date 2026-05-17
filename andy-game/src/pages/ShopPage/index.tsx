import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import styles from './index.module.css';

interface ShopItem {
  id: string;
  emoji: string;
  nameZh: string;
  nameEn: string;
  cost: number;
  type: 'decoration' | 'consumable';
}

const SHOP_ITEMS: ShopItem[] = [
  { id: 'andy_hat', emoji: '🎩', nameZh: 'Andy帽子', nameEn: 'Andy Hat', cost: 5, type: 'decoration' },
  { id: 'andy_glasses', emoji: '🤓', nameZh: 'Andy眼镜', nameEn: 'Andy Glasses', cost: 8, type: 'decoration' },
  { id: 'andy_cape', emoji: '🦸', nameZh: 'Andy披风', nameEn: 'Andy Cape', cost: 15, type: 'decoration' },
  { id: 'elevator_ticket', emoji: '🎫', nameZh: '电梯票 x1', nameEn: 'Elevator Ticket x1', cost: 3, type: 'consumable' },
  { id: 'room_cat', emoji: '🐱', nameZh: '房间小猫', nameEn: 'Room Cat', cost: 10, type: 'decoration' },
  { id: 'room_candle', emoji: '🕯️', nameZh: '房间蜡烛', nameEn: 'Room Candle', cost: 10, type: 'decoration' },
];

export default function ShopPage() {
  const navigate = useNavigate();
  const language = useGameStore((s) => s.language);
  const totalStars = useGameStore((s) => s.totalStars);
  const purchasedItems = useGameStore((s) => s.purchasedItems);
  const spendStars = useGameStore((s) => s.spendStars);
  const elevatorTickets = useGameStore((s) => s.elevatorTickets);
  const addStars = useGameStore((s) => s.addStars);

  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);

  const handleBuy = (item: ShopItem) => {
    if (totalStars < item.cost) return;

    // For decoration items, check if already purchased
    if (item.type === 'decoration' && purchasedItems.includes(item.id)) {
      setPurchaseMessage(language === 'zh' ? '已经拥有了！' : 'Already owned!');
      setTimeout(() => setPurchaseMessage(null), 1500);
      return;
    }

    const success = spendStars(item.cost);
    if (!success) return;

    if (item.id === 'elevator_ticket') {
      // Grant an elevator ticket (up to max)
      const store = useGameStore.getState();
      const newTickets = Math.min(store.elevatorTickets + 1, 5);
      useGameStore.setState({ elevatorTickets: newTickets });
    } else {
      // Add to purchased items
      const store = useGameStore.getState();
      if (!store.purchasedItems.includes(item.id)) {
        useGameStore.setState({ purchasedItems: [...store.purchasedItems, item.id] });
      }
    }

    setPurchaseMessage(language === 'zh' ? `获得 ${item.emoji}！` : `Got ${item.emoji}!`);
    setTimeout(() => setPurchaseMessage(null), 2000);
  };

  // Suppress unused variable warnings
  void addStars;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/lobby')}>
          {language === 'zh' ? '← 返回' : '← Back'}
        </button>
        <h1 className={styles.title}>
          {language === 'zh' ? '🛒 商店' : '🛒 Shop'}
        </h1>
        <div className={styles.starCount}>
          ⭐ {totalStars}
        </div>
      </div>

      <AnimatePresence>
        {purchaseMessage && (
          <motion.div
            className={styles.purchaseMessage}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {purchaseMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.infoBar}>
        <span>🎫 {language === 'zh' ? `电梯票: ${elevatorTickets}` : `Tickets: ${elevatorTickets}`}</span>
      </div>

      <div className={styles.itemGrid}>
        {SHOP_ITEMS.map((item, i) => {
          const owned = item.type === 'decoration' && purchasedItems.includes(item.id);
          const canAfford = totalStars >= item.cost;

          return (
            <motion.div
              key={item.id}
              className={`${styles.itemCard} ${owned ? styles.owned : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <span className={styles.itemEmoji}>{item.emoji}</span>
              <span className={styles.itemName}>
                {language === 'zh' ? item.nameZh : item.nameEn}
              </span>
              <span className={styles.itemCost}>
                ⭐ {item.cost}
              </span>
              {owned ? (
                <span className={styles.ownedLabel}>
                  {language === 'zh' ? '已拥有' : 'Owned'}
                </span>
              ) : (
                <motion.button
                  className={`${styles.buyButton} ${!canAfford ? styles.cannotAfford : ''}`}
                  onClick={() => handleBuy(item)}
                  disabled={!canAfford}
                  whileHover={canAfford ? { scale: 1.05 } : undefined}
                  whileTap={canAfford ? { scale: 0.95 } : undefined}
                >
                  {canAfford
                    ? language === 'zh' ? '购买' : 'Buy'
                    : language === 'zh' ? '星星不够' : 'Not enough'}
                </motion.button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

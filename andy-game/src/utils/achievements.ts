export interface Achievement {
  id: string;
  nameZh: string;
  nameEn: string;
  descriptionZh: string;
  descriptionEn: string;
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_adventure',
    nameZh: '初次冒险 🌱',
    nameEn: 'First Adventure 🌱',
    descriptionZh: '完成第一个楼层',
    descriptionEn: 'Complete your first floor',
    icon: '🌱',
  },
  {
    id: 'explorer',
    nameZh: '探索者 🗺️',
    nameEn: 'Explorer 🗺️',
    descriptionZh: '通关5个不同的楼层',
    descriptionEn: 'Clear 5 different floors',
    icon: '🗺️',
  },
  {
    id: 'star_master',
    nameZh: '满分王 ⭐',
    nameEn: 'Star Master ⭐',
    descriptionZh: '在任意楼层获得3颗星',
    descriptionEn: 'Get 3 stars on any floor',
    icon: '⭐',
  },
  {
    id: 'collector',
    nameZh: '收藏家 💎',
    nameEn: 'Collector 💎',
    descriptionZh: '收集5个奖励',
    descriptionEn: 'Collect 5 rewards',
    icon: '💎',
  },
  {
    id: 'persistent',
    nameZh: '坚持不懈 💪',
    nameEn: 'Persistent 💪',
    descriptionZh: '玩同一个楼层3次',
    descriptionEn: 'Play the same floor 3 times',
    icon: '💪',
  },
  {
    id: 'night_owl',
    nameZh: '夜猫子 🌙',
    nameEn: 'Night Owl 🌙',
    descriptionZh: '在晚上8点后玩游戏',
    descriptionEn: 'Play after 8pm',
    icon: '🌙',
  },
];

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

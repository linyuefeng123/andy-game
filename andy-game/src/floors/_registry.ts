import { lazy, type ComponentType } from 'react';
import type { Suspense } from 'react';
import type { FloorReward } from '../store/useGameStore';

export type HelperCharacter = 'grandpa' | 'grandma' | 'mom';

export const HELPER_CHARACTERS: Record<HelperCharacter, { emoji: string; nameZh: string; nameEn: string }> = {
  grandpa: { emoji: '👴', nameZh: '爷爷', nameEn: 'Grandpa' },
  grandma: { emoji: '👵', nameZh: '奶奶', nameEn: 'Grandma' },
  mom: { emoji: '👩', nameZh: '妈妈', nameEn: 'Mom' },
};

export const HELPER_LIST: HelperCharacter[] = ['grandpa', 'grandma', 'mom'];

export function randomHelper(): HelperCharacter {
  return HELPER_LIST[Math.floor(Math.random() * HELPER_LIST.length)];
}

export interface FloorProps {
  onExit: () => void;
  onComplete: (stars: number, reward?: FloorReward) => void;
  helperChar: HelperCharacter;
  helpRemaining: number;
  onHelpUsed: () => void;
  /** Skip the current game (no penalty) */
  onConcede: () => void;
  onReplay: () => void;
}

export interface FloorMeta {
  nameZh: string;
  nameEn: string;
  category: 'board' | 'education' | 'fantasy';
  reward: FloorReward;
  storyZh?: string;
  storyEn?: string;
  bgColor?: string;
}

const floorModules: Record<number, () => Promise<{ default: ComponentType<FloorProps> }>> = {
  1: () => import('./f001-gomoku'),
  2: () => import('./f002-guess-number'),
  3: () => import('./f003-guess-color'),
  4: () => import('./f004-diamond-chess'),
  5: () => import('./f005-english-vocab'),
  6: () => import('./f006-pinyin'),
  7: () => import('./f007-jungle-chess'),
  8: () => import('./f008-idiom'),
  9: () => import('./f009-simple-cards'),
};

const floorMeta: Record<number, FloorMeta> = {
  1: {
    nameZh: '五子棋', nameEn: 'Gomoku', category: 'board',
    reward: { emoji: '♟️', nameZh: '智慧棋子', nameEn: 'Wisdom Piece', descriptionZh: '五子棋高手证明', descriptionEn: 'Gomoku master proof' },
    storyZh: 'Andy来到一间古老的棋室，棋盘上黑白分明，等你来下棋！',
    storyEn: 'Andy enters an ancient chess room, the board awaits!',
    bgColor: '#1a1a3e',
  },
  2: {
    nameZh: '猜数字', nameEn: 'Guess the Number', category: 'education',
    reward: { emoji: '🔢', nameZh: '数字之星', nameEn: 'Number Star', descriptionZh: '数字猜对了！', descriptionEn: 'Number guessing star' },
    storyZh: '这间房间的门上有一个神秘数字锁，Andy需要猜出密码！',
    storyEn: 'A mysterious number lock on the door—Andy must guess the code!',
    bgColor: '#0f3460',
  },
  3: {
    nameZh: '猜颜色', nameEn: 'Guess the Color', category: 'education',
    reward: { emoji: '🎨', nameZh: '彩虹画笔', nameEn: 'Rainbow Brush', descriptionZh: '颜色都认识了！', descriptionEn: 'Knows all colors!' },
    storyZh: '房间里挂满了彩色的画，来认识每一种颜色吧！',
    storyEn: 'The room is filled with colorful paintings—learn every color!',
    bgColor: '#2a1a4a',
  },
  4: {
    nameZh: '钻石棋', nameEn: 'Diamond Chess', category: 'fantasy',
    reward: { emoji: '💎', nameZh: '闪耀钻石', nameEn: 'Shining Diamond', descriptionZh: '钻石棋大师', descriptionEn: 'Diamond chess master' },
    storyZh: '钻石闪耀的奇幻棋盘，连成菱形就能获胜！',
    storyEn: 'A sparkling diamond board—connect a diamond shape to win!',
    bgColor: '#1a2a1a',
  },
  5: {
    nameZh: '英语词汇', nameEn: 'English Vocabulary', category: 'education',
    reward: { emoji: '📚', nameZh: '英语小达人', nameEn: 'English Star', descriptionZh: '英语学得真棒！', descriptionEn: 'Great at English!' },
    storyZh: '这间房间有一本魔法词典，翻开它学习英语单词！',
    storyEn: 'A magic dictionary in this room—open it to learn English words!',
    bgColor: '#1a3a2a',
  },
  6: {
    nameZh: '拼音游戏', nameEn: 'Pinyin Game', category: 'education',
    reward: { emoji: '🔤', nameZh: '拼音精灵', nameEn: 'Pinyin Fairy', descriptionZh: '拼音都学会了！', descriptionEn: 'Pinyin mastered!' },
    storyZh: '墙上写满了汉字，拼音精灵会帮助你认字！',
    storyEn: 'Chinese characters cover the walls—the pinyin fairy will help!',
    bgColor: '#2a2a1a',
  },
  7: {
    nameZh: '斗兽棋', nameEn: 'Jungle Chess', category: 'board',
    reward: { emoji: '🦁', nameZh: '丛林之王', nameEn: 'Jungle King', descriptionZh: '斗兽棋胜利者', descriptionEn: 'Jungle chess winner' },
    storyZh: '丛林里的动物们正在下棋！老鼠竟然能打败大象？',
    storyEn: 'The jungle animals are playing chess! A rat can beat an elephant?!',
    bgColor: '#1a3a1a',
  },
  8: {
    nameZh: '成语填空', nameEn: 'Idiom Fill-in', category: 'education',
    reward: { emoji: '📖', nameZh: '成语小书童', nameEn: 'Idiom Scholar', descriptionZh: '成语学得真多！', descriptionEn: 'Knows many idioms!' },
    storyZh: '书架上的成语书缺了字，帮Andy把字填回去！',
    storyEn: 'The idiom books on the shelf are missing characters—help Andy fill them in!',
    bgColor: '#3a2a1a',
  },
  9: {
    nameZh: '简化斗地主', nameEn: 'Simple Card Game', category: 'board',
    reward: { emoji: '🃏', nameZh: '纸牌高手', nameEn: 'Card Master', descriptionZh: '出牌好厉害！', descriptionEn: 'Great card player!' },
    storyZh: '这间房间有一张神奇的牌桌，来和AI比比谁先出完牌！',
    storyEn: 'A magical card table—race the AI to play all your cards!',
    bgColor: '#2a1a1a',
  },
};

export const IMPLEMENTED_FLOORS = Object.keys(floorModules).map(Number);

export function isFloorImplemented(floorNumber: number): boolean {
  return floorNumber in floorModules;
}

const lazyCache: Record<number, React.LazyExoticComponent<FloorProps>> = {};

export function getFloorComponent(floorNumber: number): ComponentType<FloorProps> | null {
  const loader = floorModules[floorNumber];
  if (!loader) return null;
  if (!lazyCache[floorNumber]) lazyCache[floorNumber] = lazy(loader);
  return lazyCache[floorNumber];
}

export function getFloorMeta(floorNumber: number): FloorMeta {
  return (
    floorMeta[floorNumber] ?? {
      nameZh: '神秘楼层',
      nameEn: 'Mystery Floor',
      category: 'fantasy',
    }
  );
}

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
  10: () => import('./f010-tic-tac-toe'),
  11: () => import('./f011-connect-four'),
  12: () => import('./f012-memory-match'),
  13: () => import('./f013-snake'),
  14: () => import('./f014-maze'),
  15: () => import('./f015-whack-a-mole'),
  16: () => import('./f016-breakout'),
  17: () => import('./f017-sudoku'),
  18: () => import('./f018-math-quiz'),
  19: () => import('./f019-word-scramble'),
  20: () => import('./f020-color-match'),
  21: () => import('./f021-flip-card'),
  22: () => import('./f022-piano'),
  23: () => import('./f023-drawing'),
  24: () => import('./f024-reaction'),
  25: () => import('./f025-sliding-puzzle'),
  26: () => import('./f026-rock-paper-scissors'),
  27: () => import('./f027-simon-says'),
  28: () => import('./f028-2048'),
  29: () => import('./f029-minesweeper'),
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
  10: {
    nameZh: '井字棋', nameEn: 'Tic-Tac-Toe', category: 'board',
    reward: { emoji: '⭕', nameZh: '圈叉大师', nameEn: 'XO Master', descriptionZh: '井字棋高手！', descriptionEn: 'Tic-tac-toe master!' },
    storyZh: '一个简单的棋盘，画圈还是画叉？三连就能赢！',
    storyEn: 'A simple grid—circle or cross? Three in a row wins!',
    bgColor: '#1a2a3a',
  },
  11: {
    nameZh: '四子棋', nameEn: 'Connect Four', category: 'board',
    reward: { emoji: '🔴', nameZh: '四子连珠', nameEn: 'Four Connect', descriptionZh: '四子棋赢了！', descriptionEn: 'Connect four winner!' },
    storyZh: '棋子从天而降，先连成四个就获胜！',
    storyEn: 'Pieces fall from above—connect four in a row to win!',
    bgColor: '#1a1a4a',
  },
  12: {
    nameZh: '记忆翻牌', nameEn: 'Memory Match', category: 'education',
    reward: { emoji: '🧠', nameZh: '记忆超人', nameEn: 'Memory Hero', descriptionZh: '记忆力真棒！', descriptionEn: 'Super memory!' },
    storyZh: '翻开卡片找到相同的配对，考验你的记忆力！',
    storyEn: 'Flip cards to find matching pairs—test your memory!',
    bgColor: '#2a1a3a',
  },
  13: {
    nameZh: '贪吃蛇', nameEn: 'Snake', category: 'fantasy',
    reward: { emoji: '🐍', nameZh: '贪吃蛇王', nameEn: 'Snake King', descriptionZh: '蛇越吃越长！', descriptionEn: 'The snake grows longer!' },
    storyZh: '一条小蛇在花园里找食物，越吃越长！',
    storyEn: 'A little snake searches the garden for food—it grows longer!',
    bgColor: '#0f3a1a',
  },
  14: {
    nameZh: '迷宫冒险', nameEn: 'Maze', category: 'fantasy',
    reward: { emoji: '🏰', nameZh: '迷宫勇士', nameEn: 'Maze Warrior', descriptionZh: '走出迷宫了！', descriptionEn: 'Escaped the maze!' },
    storyZh: 'Andy迷路了！帮他找到迷宫的出口！',
    storyEn: 'Andy is lost! Help him find the maze exit!',
    bgColor: '#1a2a2a',
  },
  15: {
    nameZh: '打地鼠', nameEn: 'Whack-a-Mole', category: 'fantasy',
    reward: { emoji: '🔨', nameZh: '打鼠高手', nameEn: 'Mole Whacker', descriptionZh: '地鼠全打中！', descriptionEn: 'Whacked all moles!' },
    storyZh: '地鼠从洞里探出头，快用锤子敲它！',
    storyEn: 'Moles pop out of holes—whack them with your hammer!',
    bgColor: '#2a2a0f',
  },
  16: {
    nameZh: '打砖块', nameEn: 'Breakout', category: 'fantasy',
    reward: { emoji: '🧱', nameZh: '砖块粉碎者', nameEn: 'Brick Breaker', descriptionZh: '砖块全消了！', descriptionEn: 'All bricks destroyed!' },
    storyZh: '用挡板弹球，把所有砖块都打碎！',
    storyEn: 'Bounce the ball with your paddle—destroy all bricks!',
    bgColor: '#2a0f1a',
  },
  17: {
    nameZh: '数独', nameEn: 'Sudoku', category: 'education',
    reward: { emoji: '🔢', nameZh: '数独达人', nameEn: 'Sudoku Solver', descriptionZh: '数独解开了！', descriptionEn: 'Sudoku solved!' },
    storyZh: '填入1-4的数字，每行每列都不能重复！',
    storyEn: 'Fill in 1-4 numbers—no repeats in any row or column!',
    bgColor: '#1a1a3a',
  },
  18: {
    nameZh: '数学大挑战', nameEn: 'Math Quiz', category: 'education',
    reward: { emoji: '➕', nameZh: '数学天才', nameEn: 'Math Genius', descriptionZh: '算术全对了！', descriptionEn: 'All math correct!' },
    storyZh: '算术题来了！加减乘除，你能答对几道？',
    storyEn: 'Math problems! Addition, subtraction—how many can you solve?',
    bgColor: '#0f2a3a',
  },
  19: {
    nameZh: '字母排序', nameEn: 'Word Scramble', category: 'education',
    reward: { emoji: '🔤', nameZh: '字母大师', nameEn: 'Word Master', descriptionZh: '单词全拼对！', descriptionEn: 'All words unscrambled!' },
    storyZh: '打乱的字母，帮它们排成正确的单词！',
    storyEn: 'Scrambled letters—arrange them into the correct word!',
    bgColor: '#1a3a1a',
  },
  20: {
    nameZh: '颜色匹配', nameEn: 'Color Match', category: 'education',
    reward: { emoji: '🎨', nameZh: '颜色专家', nameEn: 'Color Expert', descriptionZh: '颜色全对了！', descriptionEn: 'All colors matched!' },
    storyZh: '文字颜色和内容不一样！你选对了吗？',
    storyEn: 'The text color differs from the word—can you choose correctly?',
    bgColor: '#2a1a2a',
  },
  21: {
    nameZh: '翻牌配对', nameEn: 'Flip Card', category: 'education',
    reward: { emoji: '🃏', nameZh: '翻牌达人', nameEn: 'Card Flipper', descriptionZh: '配对全找到！', descriptionEn: 'All pairs found!' },
    storyZh: '翻牌找相同的emoji，越少次数越厉害！',
    storyEn: 'Flip cards to find matching emojis—fewer flips is better!',
    bgColor: '#1a2a1a',
  },
  22: {
    nameZh: '小小钢琴', nameEn: 'Mini Piano', category: 'fantasy',
    reward: { emoji: '🎹', nameZh: '音乐小天才', nameEn: 'Music Star', descriptionZh: '弹得真好听！', descriptionEn: 'Beautiful music!' },
    storyZh: '一架魔法钢琴，按琴键弹出动听的旋律！',
    storyEn: 'A magic piano—press the keys to play melodies!',
    bgColor: '#1a0f2a',
  },
  23: {
    nameZh: '涂鸦画板', nameEn: 'Drawing', category: 'fantasy',
    reward: { emoji: '🖌️', nameZh: '小画家', nameEn: 'Little Artist', descriptionZh: '画得真好看！', descriptionEn: 'Beautiful drawing!' },
    storyZh: '这间房间有一面魔法画布，画你想画的任何东西！',
    storyEn: 'A magic canvas in this room—draw anything you want!',
    bgColor: '#2a2a1a',
  },
  24: {
    nameZh: '反应测试', nameEn: 'Reaction Test', category: 'fantasy',
    reward: { emoji: '⚡', nameZh: '闪电反应', nameEn: 'Lightning Reflex', descriptionZh: '反应真快！', descriptionEn: 'Super fast reaction!' },
    storyZh: '灯变绿时立刻点击，看看你的反应有多快！',
    storyEn: 'Click when the light turns green—how fast are you?',
    bgColor: '#1a1a2a',
  },
  25: {
    nameZh: '滑块拼图', nameEn: 'Sliding Puzzle', category: 'fantasy',
    reward: { emoji: '🧩', nameZh: '拼图高手', nameEn: 'Puzzle Solver', descriptionZh: '拼图完成了！', descriptionEn: 'Puzzle complete!' },
    storyZh: '移动数字方块，把它们排成正确的顺序！',
    storyEn: 'Slide the number tiles into the correct order!',
    bgColor: '#2a1a0f',
  },
  26: {
    nameZh: '石头剪刀布', nameEn: 'Rock Paper Scissors', category: 'board',
    reward: { emoji: '✊', nameZh: '猜拳王', nameEn: 'RPS Champion', descriptionZh: '猜拳赢了！', descriptionEn: 'RPS winner!' },
    storyZh: '石头、剪刀、布！和AI比比谁的运气好！',
    storyEn: 'Rock, paper, scissors—test your luck against the AI!',
    bgColor: '#1a3a2a',
  },
  27: {
    nameZh: '西蒙说', nameEn: 'Simon Says', category: 'education',
    reward: { emoji: '🔔', nameZh: '记忆铃铛', nameEn: 'Bell Ringer', descriptionZh: '记忆真厉害！', descriptionEn: 'Amazing memory!' },
    storyZh: '跟着颜色闪烁的顺序点击，越来越长！',
    storyEn: 'Follow the flashing colors—the sequence gets longer!',
    bgColor: '#2a0f2a',
  },
  28: {
    nameZh: '2048', nameEn: '2048', category: 'board',
    reward: { emoji: '🏆', nameZh: '数字合并王', nameEn: 'Number Merger', descriptionZh: '合到2048了！', descriptionEn: 'Reached 2048!' },
    storyZh: '滑动数字方块，相同的数字会合并，目标2048！',
    storyEn: 'Slide number tiles—same numbers merge. Reach 2048!',
    bgColor: '#1a0f1a',
  },
  29: {
    nameZh: '扫雷', nameEn: 'Minesweeper', category: 'board',
    reward: { emoji: '💣', nameZh: '扫雷英雄', nameEn: 'Mine Sweeper', descriptionZh: '雷全排除了！', descriptionEn: 'All mines cleared!' },
    storyZh: '地面下藏着地雷，用数字线索找出安全的地方！',
    storyEn: 'Mines hide underground—use number clues to find safe spots!',
    bgColor: '#0f1a2a',
  },
};

export const IMPLEMENTED_FLOORS = Object.keys(floorModules).map(Number);

export function isFloorImplemented(floorNumber: number): boolean {
  return floorNumber in floorModules;
}

const lazyCache: Record<number, React.LazyExoticComponent<FloorProps>> = {};
const preloadCache: Record<number, Promise<{ default: ComponentType<FloorProps> }>> = {};

export function preloadFloorComponent(floorNumber: number): void {
  const loader = floorModules[floorNumber];
  if (loader && !preloadCache[floorNumber]) {
    preloadCache[floorNumber] = loader();
  }
}

export function getFloorComponent(floorNumber: number): ComponentType<FloorProps> | null {
  const loader = floorModules[floorNumber];
  if (!loader) return null;
  if (!lazyCache[floorNumber]) {
    const cachedPromise = preloadCache[floorNumber];
    if (cachedPromise) {
      lazyCache[floorNumber] = lazy(() => cachedPromise);
    } else {
      lazyCache[floorNumber] = lazy(loader);
    }
  }
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

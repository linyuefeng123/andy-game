import { useMemo } from 'react';
import EduGame from '../_shared/EduGame';
import type { FloorProps } from '../_registry';
import { useGameStore } from '../../store/useGameStore';

const CHARS = [
  // Original
  { char: '大', pinyin: 'dà' },
  { char: '小', pinyin: 'xiǎo' },
  { char: '人', pinyin: 'rén' },
  { char: '山', pinyin: 'shān' },
  { char: '水', pinyin: 'shuǐ' },
  { char: '火', pinyin: 'huǒ' },
  { char: '天', pinyin: 'tiān' },
  { char: '地', pinyin: 'dì' },
  { char: '日', pinyin: 'rì' },
  { char: '月', pinyin: 'yuè' },
  { char: '风', pinyin: 'fēng' },
  { char: '云', pinyin: 'yún' },
  { char: '花', pinyin: 'huā' },
  { char: '草', pinyin: 'cǎo' },
  { char: '木', pinyin: 'mù' },
  { char: '石', pinyin: 'shí' },
  { char: '马', pinyin: 'mǎ' },
  { char: '牛', pinyin: 'niú' },
  { char: '鱼', pinyin: 'yú' },
  { char: '鸟', pinyin: 'niǎo' },
  // Nature
  { char: '土', pinyin: 'tǔ' },
  { char: '田', pinyin: 'tián' },
  { char: '雨', pinyin: 'yǔ' },
  // People
  { char: '口', pinyin: 'kǒu' },
  { char: '手', pinyin: 'shǒu' },
  { char: '目', pinyin: 'mù' },
  { char: '耳', pinyin: 'ěr' },
  { char: '足', pinyin: 'zú' },
  { char: '头', pinyin: 'tóu' },
  { char: '心', pinyin: 'xīn' },
  { char: '牙', pinyin: 'yá' },
  { char: '毛', pinyin: 'máo' },
  // School
  { char: '书', pinyin: 'shū' },
  { char: '笔', pinyin: 'bǐ' },
  { char: '本', pinyin: 'běn' },
  { char: '学', pinyin: 'xué' },
  { char: '校', pinyin: 'xiào' },
  { char: '课', pinyin: 'kè' },
  { char: '字', pinyin: 'zì' },
  { char: '文', pinyin: 'wén' },
  { char: '纸', pinyin: 'zhǐ' },
  { char: '包', pinyin: 'bāo' },
  // Daily
  { char: '上', pinyin: 'shàng' },
  { char: '下', pinyin: 'xià' },
  { char: '左', pinyin: 'zuǒ' },
  { char: '右', pinyin: 'yòu' },
  { char: '前', pinyin: 'qián' },
  { char: '后', pinyin: 'hòu' },
  { char: '多', pinyin: 'duō' },
  { char: '少', pinyin: 'shǎo' },
  // Actions
  { char: '走', pinyin: 'zǒu' },
  { char: '跑', pinyin: 'pǎo' },
  { char: '看', pinyin: 'kàn' },
  { char: '听', pinyin: 'tīng' },
  { char: '说', pinyin: 'shuō' },
  { char: '吃', pinyin: 'chī' },
  { char: '喝', pinyin: 'hē' },
  { char: '睡', pinyin: 'shuì' },
  { char: '玩', pinyin: 'wán' },
  { char: '笑', pinyin: 'xiào' },
];

export default function PinyinGame(props: FloorProps) {
  const difficulty = useGameStore.getState().getDifficultyLevel(6);
  const optionCount = difficulty === 1 ? 3 : difficulty === 2 ? 4 : 5;

  const config = useMemo(() => ({
    titleZh: '拼音游戏',
    titleEn: 'Pinyin Game',
    floorNumber: 6,
    totalRounds: 8,
    questions: generateQuestions(optionCount),
  }), [optionCount]);

  return <EduGame {...props} config={config} />;
}

function generateQuestions(optionCount: number = 3) {
  const shuffled = [...CHARS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 8).map((item) => {
    const others = CHARS.filter((c) => c.pinyin !== item.pinyin)
      .sort(() => Math.random() - 0.5)
      .slice(0, optionCount - 1);
    const options = [...others.map((c) => c.pinyin), item.pinyin].sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(item.pinyin);

    return {
      question: item.char,
      questionSub: '这个字的拼音是什么？ / What is the pinyin?',
      options,
      correctIndex,
      hint: `拼音: ${item.pinyin}`,
    };
  });
}

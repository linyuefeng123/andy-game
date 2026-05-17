import { useMemo } from 'react';
import EduGame from '../_shared/EduGame';
import type { FloorProps } from '../_registry';

const CHARS = [
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
];

export default function PinyinGame(props: FloorProps) {
  const config = useMemo(() => ({
    titleZh: '拼音游戏',
    titleEn: 'Pinyin Game',
    floorNumber: 6,
    totalRounds: 8,
    questions: generateQuestions(),
  }), []);

  return <EduGame {...props} config={config} />;
}

function generateQuestions() {
  const shuffled = [...CHARS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 8).map((item) => {
    const others = CHARS.filter((c) => c.pinyin !== item.pinyin)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
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

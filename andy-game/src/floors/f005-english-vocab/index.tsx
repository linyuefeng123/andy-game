import { useMemo } from 'react';
import EduGame from '../_shared/EduGame';
import type { FloorProps } from '../_registry';
import { useGameStore } from '../../store/useGameStore';

const VOCAB = [
  // Original words
  { zh: '苹果', en: 'Apple', emoji: '🍎' },
  { zh: '香蕉', en: 'Banana', emoji: '🍌' },
  { zh: '猫', en: 'Cat', emoji: '🐱' },
  { zh: '狗', en: 'Dog', emoji: '🐶' },
  { zh: '太阳', en: 'Sun', emoji: '☀️' },
  { zh: '月亮', en: 'Moon', emoji: '🌙' },
  { zh: '星星', en: 'Star', emoji: '⭐' },
  { zh: '水', en: 'Water', emoji: '💧' },
  { zh: '书', en: 'Book', emoji: '📖' },
  { zh: '花', en: 'Flower', emoji: '🌸' },
  { zh: '鱼', en: 'Fish', emoji: '🐟' },
  { zh: '树', en: 'Tree', emoji: '🌳' },
  { zh: '鸟', en: 'Bird', emoji: '🐦' },
  { zh: '房子', en: 'House', emoji: '🏠' },
  { zh: '车', en: 'Car', emoji: '🚗' },
  { zh: '雨', en: 'Rain', emoji: '🌧️' },
  // Animals
  { zh: '兔子', en: 'Rabbit', emoji: '🐰' },
  { zh: '大象', en: 'Elephant', emoji: '🐘' },
  { zh: '狮子', en: 'Lion', emoji: '🦁' },
  { zh: '猴子', en: 'Monkey', emoji: '🐒' },
  { zh: '熊', en: 'Bear', emoji: '🐻' },
  { zh: '老虎', en: 'Tiger', emoji: '🐯' },
  // Body
  { zh: '头', en: 'Head', emoji: '😀' },
  { zh: '手', en: 'Hand', emoji: '✋' },
  { zh: '眼睛', en: 'Eye', emoji: '👁️' },
  { zh: '耳朵', en: 'Ear', emoji: '👂' },
  { zh: '鼻子', en: 'Nose', emoji: '👃' },
  { zh: '嘴巴', en: 'Mouth', emoji: '👄' },
  { zh: '脚', en: 'Foot', emoji: '🦶' },
  { zh: '手臂', en: 'Arm', emoji: '💪' },
  { zh: '腿', en: 'Leg', emoji: '🦵' },
  { zh: '头发', en: 'Hair', emoji: '💇' },
  // Food
  { zh: '米饭', en: 'Rice', emoji: '🍚' },
  { zh: '牛奶', en: 'Milk', emoji: '🥛' },
  { zh: '蛋糕', en: 'Cake', emoji: '🎂' },
  { zh: '面包', en: 'Bread', emoji: '🍞' },
  { zh: '鸡蛋', en: 'Egg', emoji: '🥚' },
  { zh: '果汁', en: 'Juice', emoji: '🧃' },
  { zh: '糖果', en: 'Candy', emoji: '🍬' },
  // Numbers
  { zh: '一', en: 'One', emoji: '1️⃣' },
  { zh: '二', en: 'Two', emoji: '2️⃣' },
  { zh: '三', en: 'Three', emoji: '3️⃣' },
  { zh: '四', en: 'Four', emoji: '4️⃣' },
  { zh: '五', en: 'Five', emoji: '5️⃣' },
  { zh: '六', en: 'Six', emoji: '6️⃣' },
  { zh: '七', en: 'Seven', emoji: '7️⃣' },
  { zh: '八', en: 'Eight', emoji: '8️⃣' },
  { zh: '九', en: 'Nine', emoji: '9️⃣' },
  { zh: '十', en: 'Ten', emoji: '🔟' },
  // Family
  { zh: '妈妈', en: 'Mom', emoji: '👩' },
  { zh: '爸爸', en: 'Dad', emoji: '👨' },
  { zh: '兄弟', en: 'Brother', emoji: '👦' },
  { zh: '姐妹', en: 'Sister', emoji: '👧' },
  { zh: '宝宝', en: 'Baby', emoji: '👶' },
  { zh: '奶奶', en: 'Grandma', emoji: '👵' },
  { zh: '爷爷', en: 'Grandpa', emoji: '👴' },
];

export default function EnglishVocabGame(props: FloorProps) {
  const difficulty = useGameStore.getState().getDifficultyLevel(5);
  const optionCount = difficulty === 1 ? 3 : difficulty === 2 ? 4 : 5;

  const config = useMemo(() => ({
    titleZh: '英语词汇',
    titleEn: 'English Vocabulary',
    floorNumber: 5,
    totalRounds: 8,
    questions: generateQuestions(optionCount),
  }), [optionCount]);

  return <EduGame {...props} config={config} />;
}

function generateQuestions(optionCount: number = 3) {
  const shuffled = [...VOCAB].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 8).map((word) => {
    const others = VOCAB.filter((v) => v.en !== word.en)
      .sort(() => Math.random() - 0.5)
      .slice(0, optionCount - 1);
    const options = [...others.map((c) => c.en), word.en].sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(word.en);

    return {
      question: `${word.emoji} ${word.zh}`,
      questionSub: '这个英语怎么说？ / How to say this in English?',
      options,
      correctIndex,
      hint: `答案: ${word.en}`,
    };
  });
}

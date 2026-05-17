import { useMemo } from 'react';
import EduGame from '../_shared/EduGame';
import type { FloorProps } from '../_registry';

const VOCAB = [
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
];

export default function EnglishVocabGame(props: FloorProps) {
  const config = useMemo(() => ({
    titleZh: '英语词汇',
    titleEn: 'English Vocabulary',
    floorNumber: 5,
    totalRounds: 8,
    questions: generateQuestions(),
  }), []);

  return <EduGame {...props} config={config} />;
}

function generateQuestions() {
  const shuffled = [...VOCAB].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 8).map((word) => {
    const others = VOCAB.filter((v) => v.en !== word.en)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
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

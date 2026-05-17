import { useMemo } from 'react';
import EduGame from '../_shared/EduGame';
import type { FloorProps } from '../_registry';

const COLORS = [
  { nameZh: '红色', nameEn: 'Red', hex: '#ff6b6b' },
  { nameZh: '橙色', nameEn: 'Orange', hex: '#ff9f43' },
  { nameZh: '黄色', nameEn: 'Yellow', hex: '#ffd93d' },
  { nameZh: '绿色', nameEn: 'Green', hex: '#6bcb77' },
  { nameZh: '蓝色', nameEn: 'Blue', hex: '#4d96ff' },
  { nameZh: '紫色', nameEn: 'Purple', hex: '#9b72cf' },
  { nameZh: '粉色', nameEn: 'Pink', hex: '#ffb4a2' },
  { nameZh: '白色', nameEn: 'White', hex: '#f0f0f0' },
  { nameZh: '黑色', nameEn: 'Black', hex: '#2d2d44' },
  { nameZh: '棕色', nameEn: 'Brown', hex: '#8B4513' },
];

export default function GuessColorGame(props: FloorProps) {
  const config = useMemo(() => ({
    titleZh: '猜颜色',
    titleEn: 'Guess the Color',
    floorNumber: 3,
    totalRounds: 8,
    questions: generateQuestions(),
  }), []);

  return <EduGame {...props} config={config} />;
}

function generateQuestions() {
  const shuffled = [...COLORS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 8).map((color) => {
    const others = COLORS.filter((c) => c.hex !== color.hex)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const options = [...others.map((c) => c.nameZh), color.nameZh].sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(color.nameZh);

    return {
      question: '',
      questionSub: '这是什么颜色？ / What color is this?',
      options,
      correctIndex,
      hint: `答案: ${color.nameZh} / ${color.nameEn}`,
      visualSlot: (
        <div
          style={{
            width: 'clamp(60px, 20vw, 80px)',
            height: 'clamp(60px, 20vw, 80px)',
            borderRadius: '50%',
            background: color.hex,
            border: '3px solid rgba(255,255,255,0.3)',
            boxShadow: `0 0 20px ${color.hex}60`,
            margin: '0 auto var(--space-sm)',
          }}
        />
      ),
    };
  });
}

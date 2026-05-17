import { useMemo } from 'react';
import EduGame from '../_shared/EduGame';
import type { FloorProps } from '../_registry';

const IDIOMS = [
  { idiom: '一心一意', blank: 2, options: ['二', '一', '三', '万'] },
  { idiom: '三心二意', blank: 1, options: ['二', '三', '四', '五'] },
  { idiom: '五彩缤纷', blank: 0, options: ['四', '五', '六', '七'] },
  { idiom: '画龙点睛', blank: 3, options: ['脚', '头', '手', '睛'] },
  { idiom: '守株待兔', blank: 0, options: ['守', '看', '望', '等'] },
  { idiom: '对牛弹琴', blank: 1, options: ['马', '牛', '羊', '猪'] },
  { idiom: '井底之蛙', blank: 3, options: ['鸟', '鱼', '虫', '蛙'] },
  { idiom: '亡羊补牢', blank: 1, options: ['牛', '羊', '马', '猪'] },
  { idiom: '画蛇添足', blank: 2, options: ['头', '手', '添', '加'] },
  { idiom: '自相矛盾', blank: 0, options: ['自', '互', '相', '对'] },
  { idiom: '坐井观天', blank: 0, options: ['坐', '站', '躺', '跑'] },
  { idiom: '掩耳盗铃', blank: 0, options: ['掩', '捂', '遮', '盖'] },
];

export default function IdiomGame(props: FloorProps) {
  const config = useMemo(() => ({
    titleZh: '成语填空',
    titleEn: 'Idiom Fill-in',
    floorNumber: 8,
    totalRounds: 6,
    questions: generateQuestions(),
  }), []);

  return <EduGame {...props} config={config} />;
}

function generateQuestions() {
  const shuffled = [...IDIOMS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 6).map((item) => {
    const chars = [...item.idiom];
    const display = chars.map((c, i) => (i === item.blank ? '___' : c)).join(' ');
    const correctAnswer = chars[item.blank];
    const correctIndex = item.options.indexOf(correctAnswer);

    return {
      question: display,
      questionSub: '请填入正确的字 / Fill in the correct character',
      options: item.options,
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
      hint: `答案: ${item.idiom}`,
    };
  });
}

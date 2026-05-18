import { useMemo } from 'react';
import EduGame from '../_shared/EduGame';
import type { FloorProps } from '../_registry';
import { useGameStore } from '../../store/useGameStore';

const IDIOMS = [
  { idiom: '一心一意', blank: 2, options: ['二', '一', '三', '万'], emoji: '1️⃣❤️1️⃣💭' },
  { idiom: '三心二意', blank: 1, options: ['心', '口', '手', '眼'], emoji: '3️⃣❤️2️⃣💭' },
  { idiom: '五彩缤纷', blank: 0, options: ['四', '五', '六', '七'], emoji: '5️⃣🌈✨' },
  { idiom: '画龙点睛', blank: 3, options: ['脚', '头', '手', '睛'], emoji: '🐉✍️👁️' },
  { idiom: '守株待兔', blank: 0, options: ['守', '看', '望', '等'], emoji: '🌳🐰' },
  { idiom: '对牛弹琴', blank: 1, options: ['马', '牛', '羊', '猪'], emoji: '🐂🎵' },
  { idiom: '井底之蛙', blank: 3, options: ['鸟', '鱼', '虫', '蛙'], emoji: '🕳️🐸' },
  { idiom: '亡羊补牢', blank: 1, options: ['牛', '羊', '马', '猪'], emoji: '🐑🏠' },
  { idiom: '画蛇添足', blank: 2, options: ['头', '手', '添', '加'], emoji: '🐍🦶' },
  { idiom: '自相矛盾', blank: 0, options: ['自', '互', '相', '对'], emoji: '⚔️🛡️' },
  { idiom: '坐井观天', blank: 0, options: ['坐', '站', '躺', '跑'], emoji: '🕳️☁️' },
  { idiom: '掩耳盗铃', blank: 0, options: ['掩', '捂', '遮', '盖'], emoji: '👂🔔' },
  // New idioms
  { idiom: '狐假虎威', blank: 0, options: ['狐', '狼', '狗', '猫'], emoji: '🦊🐯' },
  { idiom: '刻舟求剑', blank: 2, options: ['找', '寻', '求', '追'], emoji: '⛵🗡️' },
  { idiom: '拔苗助长', blank: 0, options: ['拔', '拉', '扯', '推'], emoji: '🌱📏' },
  { idiom: '杞人忧天', blank: 1, options: ['仙', '人', '民', '众'], emoji: '😵☁️' },
  { idiom: '塞翁失马', blank: 2, options: ['丢', '走', '失', '跑'], emoji: '👴🐴' },
  { idiom: '叶公好龙', blank: 2, options: ['怕', '爱', '好', '想'], emoji: '👴🐉' },
  { idiom: '鹬蚌相争', blank: 2, options: ['打', '斗', '争', '抢'], emoji: '🐦🐚' },
  { idiom: '盲人摸象', blank: 1, options: ['瞎', '人', '老', '盲'], emoji: '😵🐘' },
  { idiom: '班门弄斧', blank: 2, options: ['舞', '挥', '弄', '玩'], emoji: '🪓🏠' },
  { idiom: '杯弓蛇影', blank: 0, options: ['杯', '碗', '壶', '盆'], emoji: '🍷🐍' },
  { idiom: '曹冲称象', blank: 2, options: ['看', '量', '称', '算'], emoji: '👦🐘' },
  { idiom: '铁杵成针', blank: 0, options: ['铁', '铜', '钢', '金'], emoji: '🔧🪡' },
  { idiom: '指鹿为马', blank: 1, options: ['牛', '鹿', '羊', '猪'], emoji: '👆🦌' },
  { idiom: '胸有成竹', blank: 3, options: ['松', '梅', '竹', '菊'], emoji: '🫁🎋' },
  { idiom: '鹤立鸡群', blank: 0, options: ['鹤', '鹰', '雁', '鹭'], emoji: '🦢🐔' },
  { idiom: '虎头蛇尾', blank: 0, options: ['虎', '龙', '狮', '豹'], emoji: '🐯🐍' },
  { idiom: '九牛一毛', blank: 1, options: ['羊', '牛', '马', '猪'], emoji: '9️⃣🐂1️⃣🧶' },
  { idiom: '画饼充饥', blank: 0, options: ['画', '写', '看', '做'], emoji: '🎨🫓😋' },
];

export default function IdiomGame(props: FloorProps) {
  const difficulty = useGameStore.getState().getDifficultyLevel(8);
  const optionCount = difficulty === 1 ? 3 : difficulty === 2 ? 4 : 5;

  const config = useMemo(() => ({
    titleZh: '成语填空',
    titleEn: 'Idiom Fill-in',
    floorNumber: 8,
    totalRounds: 6,
    questions: generateQuestions(optionCount),
  }), [optionCount]);

  return <EduGame {...props} config={config} />;
}

function generateQuestions(optionCount: number = 3) {
  // Pool of extra distractor characters for harder difficulties
  const EXTRA_DISTRACTORS = ['高', '低', '快', '慢', '明', '暗', '冷', '热', '新', '旧', '长', '短', '远', '近', '重', '轻'];

  const shuffled = [...IDIOMS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 6).map((item) => {
    const chars = [...item.idiom];
    const display = chars.map((c, i) => (i === item.blank ? '___' : c)).join(' ');
    const correctAnswer = chars[item.blank];
    const correctIndex = item.options.indexOf(correctAnswer);

    // Build options based on difficulty
    let options: string[];
    let finalCorrectIndex: number;
    if (optionCount <= item.options.length) {
      // Take a subset of existing options (always include the correct one)
      const correctOpt = item.options[correctIndex >= 0 ? correctIndex : 0];
      const wrongOpts = item.options.filter((_, i) => i !== correctIndex).slice(0, optionCount - 1);
      options = [...wrongOpts, correctOpt].sort(() => Math.random() - 0.5);
      finalCorrectIndex = options.indexOf(correctOpt);
    } else {
      // Need more options than available - add extra distractors
      const correctOpt = item.options[correctIndex >= 0 ? correctIndex : 0];
      const wrongOpts = item.options.filter((_, i) => i !== correctIndex);
      const needed = optionCount - wrongOpts.length - 1;
      const extraDistractors = EXTRA_DISTRACTORS.filter((d) => d !== correctAnswer && !wrongOpts.includes(d))
        .sort(() => Math.random() - 0.5)
        .slice(0, needed);
      options = [...wrongOpts, ...extraDistractors, correctOpt].sort(() => Math.random() - 0.5);
      finalCorrectIndex = options.indexOf(correctOpt);
    }

    return {
      question: display,
      questionSub: '请填入正确的字 / Fill in the correct character',
      options,
      correctIndex: finalCorrectIndex >= 0 ? finalCorrectIndex : 0,
      hint: `答案: ${item.idiom}`,
      visualSlot: item.emoji ? (
        <div style={{ fontSize: 'clamp(28px, 8vw, 40px)', marginBottom: 'var(--space-sm)', textAlign: 'center' as const }}>
          {item.emoji}
        </div>
      ) : undefined,
    };
  });
}

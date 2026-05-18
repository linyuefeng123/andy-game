# Andy的100层房子 - 全面优化开发计划

> 生成时间：2026-05-17
> 状态：待确认

---

## 概述

经过架构师和游戏测评（6岁趣味性/成瘾性）双维度全面扫描，发现：
- **7个关键Bug**（含1个运行时崩溃）
- **15个架构问题**（代码重复、性能、错误处理）
- **16个游戏体验问题**（会话限制、惩罚机制、内容不足、缺少成瘾设计）

按影响优先级分6个阶段，共41项优化。总预估工时：20-29天。

---

## Phase 1: 关键Bug修复 (1-2天)

> 优先级最高，无设计决策，直接修复

### 1.1 f009缺少getFloorMeta导入 — 运行时崩溃
- **文件**: `src/floors/f009-simple-cards/index.tsx:4,190`
- **问题**: `getFloorMeta(9)`被调用但从未从`_registry`导入，赢牌时触发ReferenceError
- **修复**: 添加`import { getFloorMeta } from '../_registry';`
- **复杂度**: S

### 1.2 getFloorComponent每次渲染创建新lazy() — 游戏状态丢失
- **文件**: `src/floors/_registry.ts:122-126`, `src/pages/FloorPage/index.tsx:66`
- **问题**: `getFloorComponent()`每次调用都执行`lazy(loader)`，FloorPage每次re-render创建新组件类型，React卸载/重载整个游戏，丢失所有进度
- **修复**: 添加模块级缓存
```ts
const lazyCache: Record<number, React.LazyExoticComponent<FloorProps>> = {};
export function getFloorComponent(floorNumber: number) {
  if (!floorModules[floorNumber]) return null;
  if (!lazyCache[floorNumber]) lazyCache[floorNumber] = lazy(floorModules[floorNumber]);
  return lazyCache[floorNumber];
}
```
- **复杂度**: S

### 1.3 elevatorUsesRemaining被持久化 — 违背设计意图
- **文件**: `src/store/useGameStore.ts:129-140`
- **问题**: `elevatorUsesRemaining`在`partialize`中，持久化到localStorage。设计意图是每次新会话重置3次，但持久化导致隔天回来电梯次数仍为0
- **修复**: 从`partialize`返回对象中移除`elevatorUsesRemaining`，每次加载使用默认值3
- **复杂度**: S

### 1.4 PWA图标文件缺失 — 安装失败
- **文件**: `public/icon-192.png`, `public/icon-512.png`
- **问题**: `manifest.json`引用的图标文件不存在，PWA无法安装
- **修复**: 基于favicon.svg生成两个PNG图标放到public/
- **复杂度**: S

### 1.5 playSound不检查audioEnabled — 音效无视用户设置
- **文件**: `src/utils/audio.ts`
- **问题**: `playSound()`从未检查`useGameStore.getState().audioEnabled`，音效永远播放
- **修复**: 在`playSound`开头添加`if (!useGameStore.getState().audioEnabled) return;`
- **复杂度**: S

### 1.6 addStars在completeFloor外调用 — 双重渲染
- **文件**: `src/store/useGameStore.ts:105-110`
- **问题**: `completeFloor`先`set({...})`再`get().addStars(stars)`，产生两次状态更新和两次渲染
- **修复**: 将`totalStars: get().totalStars + stars`合并到同一个`set()`中，删除`get().addStars(stars)`
- **复杂度**: S

### 1.7 添加ErrorBoundary — 任何游戏崩溃导致白屏
- **文件**: 新建`src/components/ErrorBoundary.tsx`; 修改`src/app/App.tsx`
- **问题**: 全局无ErrorBoundary，任何楼层游戏报错会导致整个应用崩溃白屏
- **修复**: 创建友好的ErrorBoundary组件（"出了点问题"+"返回大厅"按钮），在App.tsx包裹Routes，在FloorPage包裹Suspense
- **复杂度**: M

---

## Phase 2: 架构改进 (3-5天)

### 2.1 提取BoardGameShell共享组件
- **文件**: 新建`src/floors/_shared/BoardGameShell.tsx`+`.module.css`; 修改f001/f004/f007/f009
- **问题**: 4个棋盘游戏重复相同的UI框架：状态栏、帮助/认输/认赢按钮、输赢覆盖层、Framer Motion弹簧动画。`handleConcede`/`handleClaimWin`在7个文件中复制粘贴
- **方案**: 提取BoardGameShell，接收`gameInfo`/`board`/`actionButtons`/`helperChar`/`winner`等props，统一渲染游戏外壳
- **复杂度**: L

### 2.2 清理setTimeout定时器
- **文件**: 所有楼层组件的helpHint/AI move setTimeout
  - f001:84 (helpHint), f001:47-61 (AI move)
  - f002:83 (helpHint)
  - f004:148 (helpHint), f004:100-119 (AI move)
  - f007:107 (helpHint), f007:66-79 (AI move)
  - f009:184 (helpHint), f009:78-108/132-152 (AI turn)
- **问题**: 用户中途退出楼层时，setTimeout回调在已卸载组件上设置state，造成内存泄漏
- **方案**: 创建`useTimeout` hook，自动在unmount时清理；或用useRef存储timer ID配合useEffect cleanup
- **复杂度**: M

### 2.3 添加404路由和导航守卫
- **文件**: `src/app/App.tsx`
- **问题**: 无catch-all路由，访问未定义URL显示空白；`/elevator`等页面无playerName守卫
- **修复**: 添加`<Route path="*" element={<Navigate to="/" replace />} />`; 为敏感路由添加playerName守卫
- **复杂度**: S

### 2.4 修复依赖问题
- **文件**: `package.json`
- **问题**: `howler`和`@types/howler`已安装但从未使用（约30KB死代码）；`vite`和`@vitejs/plugin-react`同时在dependencies和devDependencies中
- **修复**: 移除howler相关包；将vite和@vitejs/plugin-react移到仅devDependencies
- **复杂度**: S

### 2.5 修复CSS冲突
- **文件**: `src/styles/global.css:62-64`
- **问题**: 全局`button:active { transform: scale(0.95) }`与Framer Motion的`whileTap`冲突，导致按钮闪烁
- **修复**: 移除全局button:active规则，按需使用FM的whileTap或添加.btn-tap类
- **复杂度**: S

### 2.6 修复WelcomePage星星位置
- **文件**: `src/pages/WelcomePage/index.tsx:30-41`
- **问题**: `Math.random()`在渲染函数中直接调用，每次re-render星星位置变化，星星跳动
- **修复**: 提取为模块级常量或`useMemo(() => ..., [])`
- **复杂度**: S

### 2.7 修复biased洗牌算法
- **文件**: `EduGame.tsx:226-229`, f003/f005/f006/f008
- **问题**: `sort(() => Math.random() - 0.5)`产生不均匀分布。`cardAI.ts:38-44`已有正确的Fisher-Yates实现
- **修复**: 提取Fisher-Yates到`src/utils/shuffle.ts`，全局替换所有biased sort
- **复杂度**: S

### 2.8 棋盘组件响应式resize
- **文件**: `GomokuBoard.tsx:24`, `DiamondBoard.tsx:28`
- **问题**: 从`window.innerWidth`计算cellSize但不监听resize，旋转屏幕后棋盘大小不变
- **修复**: 添加resize事件监听，动态更新宽度state
- **复杂度**: M

### 2.9 添加React.memo优化
- **文件**: `GomokuBoard.tsx`, `DiamondBoard.tsx`
- **问题**: SVG棋盘组件在父组件每次状态变化时都重新渲染
- **修复**: 用`React.memo()`包裹导出
- **复杂度**: S

### 2.10 floorId空值检查
- **文件**: `src/pages/FloorPage/index.tsx:13`
- **问题**: `parseInt(floorId ?? '1', 10)`静默默认到楼层1，无效URL不会提示
- **修复**: 对无效floorId显示"建设中"页面（已有该UI）
- **复杂度**: S

### 2.11 改进Suspense fallback
- **文件**: `src/pages/FloorPage/index.tsx:139`
- **问题**: fallback只是"..."，在慢网络下用户以为应用崩溃
- **修复**: 替换为居中加载动画+Andy角色+"加载中..."
- **复杂度**: S

### 2.12 懒加载AudioContext并断开振荡器
- **文件**: `src/utils/audio.ts`
- **问题**: AudioContext在模块加载时创建（多数浏览器需要用户手势）; 振荡器用后不断开，长时间游玩造成内存压力
- **修复**: 改为懒创建（首次playSound时创建）；振荡器stop()后调用disconnect()
- **复杂度**: M

---

## Phase 3: 核心游戏循环重设计 (3-4天)

> 对6岁孩子体验影响最大的阶段

### 3.1 电梯系统重设计：移除3次硬限制
- **文件**: `useGameStore.ts`, `useElevator.ts`, `LobbyPage/index.tsx`, `ElevatorPage/index.tsx`
- **问题**: 3次电梯限制导致约10分钟就结束会话，且无任何方式获取更多次数，大厅显示"Andy今天已经累了，下次再来吧！"完全堵死继续游戏的路。这是最大的体验杀手。
- **方案**: 改为"电梯票"系统
  - 初始3张票，上限5张
  - 完成楼层+1票，3星完成+2票
  - 移除"Andy累了"死胡同，改为0票时灰色按钮+鼓励文字"完成一层获得更多车票！"
  - 从`partialize`移除票数（配合1.3，每次新会话重置）
- **复杂度**: M

### 3.2 每个游戏添加"再玩一次"按钮
- **文件**: 所有楼层输赢覆盖层, `BoardGameShell.tsx`, `EduGame.tsx`
- **问题**: 任何游戏结束后只有"返回大厅"，没有重玩选项，必须重新走大厅/电梯流程。对想反复玩喜欢的游戏的孩子极其沮丧。
- **方案**: 在所有游戏完成界面添加醒目的"🔄 再玩一次！"按钮
  - 不消耗电梯票（已经在该楼层）
  - BoardGameShell和EduGame统一添加
  - 通过key prop强制组件重新挂载实现重置
- **复杂度**: M

### 3.3 IQ系统重设计：改为正向激励的冒险值
- **文件**: `useGameStore.ts`, `AndyPage/index.tsx`
- **问题**: 当前IQ系统惩罚孩子——认输-1、认赢-2，AndyPage显示红色"需要努力"标签(iqColor='#ff6b6b')，6岁孩子会感到羞耻。认赢按钮用奖杯emoji但实际扣2分，是陷阱。
- **方案**:
  - 重命名IQ为"冒险值"（Adventure Points）
  - 移除所有负数调整，冒险值只增不减
  - 放弃=0冒险值（不扣分），完成=获得星星数作为冒险值
  - 标签全改为正面：
    - 0-30: "新手冒险家" 🌱
    - 30-60: "勇敢探索者" ⚡
    - 60-100: "聪明小达人" 🌟
    - 100-150: "超级英雄" 🦸
    - 150+: "传奇冒险王" 👑
  - 颜色只用绿色和金色，不用红色
- **复杂度**: M

### 3.4 移除"认输"和"认赢"按钮，改为"跳过"
- **文件**: `BoardGameShell.tsx`, `EduGame.tsx`, 所有楼层组件, `_registry.ts`(FloorProps)
- **问题**: "认赢"对6岁孩子是个陷阱按钮（扣2冒险值但用奖杯emoji诱导点击）；"认输"用笑脸emoji但惩罚。两个按钮在游戏中始终可见，诱惑孩子点击。
- **方案**:
  - 完全移除"认赢"按钮
  - "认输"改为"跳过这局"，移到底部小文字链接位置（不是大按钮）
  - 跳过不扣分，只是0星0冒险值
  - 从FloorProps移除`onConcede`和`onClaimWin`，简化接口
- **复杂度**: M

---

## Phase 4: 成瘾性与参与度机制 (5-7天)

> 让孩子"明天还想玩"的核心机制

### 4.1 每日登录奖励和连续天数
- **文件**: `useGameStore.ts`(添加lastPlayDate/streakDays/claimDailyReward), `LobbyPage/index.tsx`
- **方案**:
  - 每天首次打开弹庆祝弹窗"欢迎回来！连续第X天！"
  - 奖励电梯票（1天+1票，3天+2票，7天+3票）
  - 日历可视化显示打卡记录
- **复杂度**: M

### 4.2 星星商店
- **文件**: 新建`src/pages/ShopPage/`, `useGameStore.ts`(添加spendStars/purchasedItems)
- **问题**: 星星只累积不可消费，没有获得和使用货币的满足感，缺乏消费驱动
- **方案**: 新页面从大厅进入，可购买：
  - Andy头像配件（帽子5⭐、眼镜8⭐、披风15⭐）
  - 房间互动装饰（10-20⭐）
  - 电梯票（3⭐/张）
  - 购买项在AndyRoomPage和AndyAvatar展示
- **复杂度**: L

### 4.3 成就徽章系统
- **文件**: `useGameStore.ts`(添加achievements), `AchievementsPage/index.tsx`(重做), 新建`src/utils/achievements.ts`
- **问题**: 当前成就页只是楼层列表，没有里程碑徽章或惊喜解锁
- **方案**: 定义成就如：
  - "初次冒险" - 完成第一层
  - "探索者" - 游玩5个不同楼层
  - "满分王" - 任意楼层获得3星
  - "收藏家" - 获得5个奖励
  - "坚持不懈" - 同一楼玩3次
  - "全星通关" - 所有楼层3星
  - "夜猫子" - 晚8点后游玩（睡前故事主题！）
  - 解锁时有confetti动画和星星奖励
- **复杂度**: L

### 4.4 升级仪式
- **文件**: `LobbyPage/index.tsx`, 新建`src/components/LevelUpCeremony.tsx`
- **方案**: 冒险值跨越阈值时触发全屏庆祝——屏幕闪光、Andy跳跃、星星雨、新称号公告配fanfare音效。这是让进步"可感知"的关键。
- **复杂度**: M

### 4.5 100%通关仪式
- **文件**: `LobbyPage/index.tsx`, 新建`src/components/CompletionCeremony.tsx`
- **方案**: 所有已实现楼层3星完成时，Andy获得"房子主人"称号+金色钥匙+烟花动画+未来楼层预告
- **复杂度**: M

### 4.6 神秘宝箱（可变奖励）
- **文件**: `useGameStore.ts`, `LobbyPage/index.tsx`, 新建`src/components/MysteryBox.tsx`
- **方案**:
  - 完成楼层后10%概率发现神秘宝箱
  - "点击打开"动画 + 悬念延迟 → 随机奖品（额外星星/头像配件/房间装饰）
  - 创造**可变奖励计划**——这是游戏中最成瘾的模式（参考slot machine心理学）
- **复杂度**: M

---

## Phase 5: 内容与适龄化 (5-7天)

### 5.1 扩充内容池
- **文件**: f003(10→18色), f005(16→50+词), f006(20→60+字), f008(12→30个成语)
- **问题**: 内容池太小，2-3次游玩就看到重复题目，严重降低重玩价值
- **方案**:
  - 英语词汇: 增加动物/身体/食物/数字/家人类别
  - 拼音: 增加一年级常见字
  - 颜色: 增加灰色/金色/银色/浅蓝/深绿/珊瑚色等
  - 成语: 增加带emoji插图的简单成语
- **复杂度**: M

### 5.2 增加难度递进
- **文件**: 所有楼层index.tsx, `useGameStore.ts`(每楼层添加difficultyLevel)
- **问题**: 所有游戏每次玩法完全相同，无适应性，老手和新手玩的是同一个难度
- **方案**: 基于playCount调整：
  - 棋盘AI随机走子从40%（首次）递减到10%（5次+）
  - 教育游戏选项从3→4→5个
  - 猜数字范围1-50→1-100
  - 显示难度标签：⭐简单/⭐⭐中等/⭐⭐⭐困难
- **复杂度**: L

### 5.3 简化过于复杂的游戏
- **文件**: f002, f004, f008, f009
- **问题**:
  - 猜数字(f002): 需要键盘输入+二分查找思维，6岁不理解
  - 钻石棋(f004): "连成菱形"目标太抽象，6岁看不懂
  - 成语填空(f008): 6岁不懂成语含义
  - 简化斗地主(f009): 牌型规则太复杂
- **方案**:
  - f002: 改为可视化数字线+点击猜测，范围1-20起步，用温度计视觉隐喻
  - f004: 在棋盘上添加菱形目标虚线轮廓，添加动画教程箭头"把这颗移到这里！"
  - f008: 为每个成语添加emoji插图提供视觉线索（画龙点睛→🐉👁️✨）
  - f009: 简化为"比大小"模式（每次出一张牌，大的赢），类似War纸牌游戏
- **复杂度**: L

### 5.4 增大触摸目标
- **文件**: `GomokuBoard.tsx`, f007, f009
- **问题**: 五子棋和斗兽棋格子太小（约38px），6岁孩子精细运动技能尚在发展，Apple推荐最小44px
- **方案**: 五子棋9x9→7x7或cellSize上限提高到55px；斗兽棋确保每格≥44px
- **复杂度**: M

### 5.5 添加交互式教程
- **文件**: 新建`src/floors/_shared/TutorialOverlay.tsx`, 各楼层index.tsx
- **问题**: 游戏说明全是文字，识字不多的6岁孩子无法理解规则
- **方案**: 首次进入楼层时显示分步动画教程
  - 高亮游戏区域，动画箭头演示操作
  - "看爷爷下一局！"用动画演示走法
  - 无文字，纯视觉+emoji
  - 存储已看教程状态，老玩家跳过
- **复杂度**: L

---

## Phase 6: 打磨优化 (3-4天)

### 6.1 音效增强
- **文件**: `src/utils/audio.ts`, 新建`src/utils/sounds.ts`
- **方案**:
  - 添加新音效类型：pop(按钮)、whoosh(页面切换)、tada(成就)、coin(星星)
  - 使用musicEnabled播放简单背景音乐循环（Web Audio API生成，无文件依赖）
  - 根据游戏上下文调整音量
- **复杂度**: M

### 6.2 PWA完善
- **文件**: `public/sw.js`, `public/manifest.json`, `index.html`
- **修复**:
  - 预缓存关键JS/CSS资源（当前只缓存/和index.html）
  - manifest添加description和screenshots
  - index.html添加Apple touch icon
- **复杂度**: S

### 6.3 AI多样性改进
- **文件**: `jungleAI.ts`, `cardAI.ts`, `gomokuAI.ts`
- **问题**: 斗兽棋AI几乎确定性贪心；牌AI永远出最小牌，太可预测
- **方案**:
  - 斗兽棋: 增加随机策略选择（进攻型/防守型/调皮型），每局随机选一种
  - 牌AI: 增加出大牌概率和"虚张声势"pass概率
  - 五子棋: 随机率根据难度调整（配合5.2）
- **复杂度**: M

### 6.4 动画打磨
- **文件**: `LobbyPage/index.tsx`, `AndyRoomPage/index.tsx`
- **方案**:
  - 大厅添加浮动粒子效果（萤火虫/星星）
  - 房间装饰可交互（猫点击喵叫、蜡烛点击闪烁、植物点击生长）
  - 获得星星时添加星星雨效果
- **复杂度**: M

### 6.5 无障碍改进
- **文件**: 所有页面和组件
- **修复**:
  - 为图标按钮添加aria-label
  - 确保颜色对比度满足WCAG AA (4.5:1)
  - div交互元素添加role="button"和键盘处理
  - 焦点管理优化
- **复杂度**: M

---

## 实施顺序和依赖关系

```
Phase 1 (全部独立)
  → Phase 2 (2.1 BoardGameShell需先完成)
    → Phase 3 (3.3/3.4依赖2.1; 3.2依赖2.1)
      → Phase 4 (4.2依赖3.3; 4.3依赖3.3)
        → Phase 5 (5.2依赖3.3/3.4)
          → Phase 6 (独立，可随时开始)
```

**每个Phase内推荐顺序：**

| Phase | 推荐顺序 |
|-------|---------|
| Phase 1 | 1.2 → 1.1 → 1.6 → 1.3 → 1.5 → 1.4 → 1.7 |
| Phase 2 | 2.4 → 2.5 → 2.6 → 2.7 → 2.10 → 2.11 → 2.3 → 2.9 → 2.12 → 2.8 → 2.2 → 2.1 |
| Phase 3 | 3.3 → 3.4 → 3.1 → 3.2 |
| Phase 4 | 4.1 → 4.6 → 4.4 → 4.5 → 4.3 → 4.2 |
| Phase 5 | 5.1 → 5.4 → 5.3 → 5.2 → 5.5 |
| Phase 6 | 6.2 → 6.1 → 6.5 → 6.3 → 6.4 |

---

## 对6岁孩子趣味性影响排名

按"每实现小时的趣味回报"排序：

| 排名 | 优化项 | 理由 |
|------|--------|------|
| 1 | 3.2 再玩一次按钮 | 实现最简单，体验提升最大 |
| 2 | 3.1 电梯票重设计 | 消除会话死胡同，让游戏可以一直玩 |
| 3 | 3.3/3.4 冒险值+移除惩罚 | 消除羞耻感，添加正向激励循环 |
| 4 | 1.2 修复lazy() bug | 停止游戏随机重置，消除最大技术Bug |
| 5 | 4.6 神秘宝箱 | 可变奖励是最成瘾的游戏模式 |
| 6 | 5.1 扩充内容池 | 直接增加重玩价值 |
| 7 | 4.1 每日连续 | 创造"明天还想回来"的理由 |

---

## 总预估工时

| Phase | 任务数 | 预估工时 |
|-------|--------|---------|
| Phase 1: 关键Bug修复 | 7 | 1-2天 |
| Phase 2: 架构改进 | 12 | 3-5天 |
| Phase 3: 游戏循环重设计 | 4 | 3-4天 |
| Phase 4: 成瘾性机制 | 6 | 5-7天 |
| Phase 5: 内容与适龄化 | 5 | 5-7天 |
| Phase 6: 打磨优化 | 5 | 3-4天 |
| **总计** | **39** | **20-29天** |

---

## 验证方式

每个Phase完成后：
1. `npm run build` 确保无编译错误
2. `npm run dev` 本地运行，手动测试所有9个楼层游戏
3. 测试PWA安装流程（Chrome DevTools → Application → Manifest）
4. 测试移动端触摸交互（Chrome DevTools设备模拟）
5. 测试localStorage持久化（刷新页面后状态保留/电梯票重置）
6. Phase 3+完成后，邀请目标用户（6岁儿童）试玩并观察行为

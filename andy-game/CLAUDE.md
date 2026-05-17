# Andy的100层房子 - 项目指南

## 项目概述
React + TypeScript + Vite 儿童教育游戏，目标用户6岁。使用 zustand 状态管理、framer-motion 动画、CSS Modules 样式。

## 技术栈
- React 19 + TypeScript 6 + Vite 8
- zustand (状态持久化到 localStorage)
- framer-motion (动画)
- react-router-dom (路由)
- CSS Modules (样式，深蓝+金色主题)

## 开发命令
- `npm run dev` - 启动开发服务器
- `npm run build` - 生产构建
- `npx tsc --noEmit` - 类型检查

## 架构
- `src/app/App.tsx` - 路由配置
- `src/store/useGameStore.ts` - 全局状态（adventurePoints, elevatorTickets, purchasedItems, unlockedAchievements 等）
- `src/floors/_registry.ts` - 楼层注册、FloorProps 接口、lazy 加载
- `src/floors/f00X-*` - 各楼层游戏组件
- `src/floors/_shared/EduGame.tsx` - 教育游戏共享壳
- `src/pages/` - 页面组件（LobbyPage, FloorPage, ShopPage 等）
- `src/components/` - 共享组件（ErrorBoundary, DailyRewardModal, LevelUpCeremony, MysteryBox, CompletionCeremony）
- `src/utils/audio.ts` - Web Audio API 音效（懒创建 AudioContext，oscillator disconnect）
- `src/utils/achievements.ts` - 成就定义

## 部署前测试（必须通过）

每次上线部署前，必须执行以下测试检查：

### 1. 构建测试
```bash
npx tsc --noEmit && npx vite build
```
必须 0 错误通过。

### 2. 游戏功能冒烟测试
在浏览器中逐项验证：
- [ ] 欢迎页输入名字后进入大厅
- [ ] 大厅显示冒险值、电梯票、星星数
- [ ] 按电梯进入随机楼层
- [ ] f001 五子棋：可落子、AI回应、胜负判定
- [ ] f002 猜数字：可视化数字线、温度计提示
- [ ] f003 猜颜色：显示4-5个选项、正确/错误反馈
- [ ] f004 钻石棋：虚线菱形指引、可移动棋子
- [ ] f005 英语词汇：显示选项、正确/错误反馈
- [ ] f006 拼音：显示选项、正确/错误反馈
- [ ] f007 斗兽棋：可移动、AI回应、胜负判定
- [ ] f008 成语填空：emoji线索、显示选项
- [ ] f009 比大小：翻牌、判定大小、胜负
- [ ] 所有游戏：跳过按钮有效（无惩罚）
- [ ] 所有游戏：再玩一次按钮有效（不消耗电梯票）
- [ ] 完成楼层：获得星星+冒险值+电梯票
- [ ] 每日登录奖励弹窗
- [ ] 星星商店可购买
- [ ] 成就系统解锁
- [ ] 难度标签显示（⭐/⭐⭐/⭐⭐⭐）
- [ ] ErrorBoundary 不会白屏
- [ ] PWA manifest 加载正常

### 3. 移动端测试
在 iPad/手机上验证：
- [ ] 所有触摸目标 ≥ 44px
- [ ] 横向滚动正常
- [ ] 无水平溢出

## 关键设计决策
- **冒险值只增不减**：绝不惩罚孩子，放弃=0星（不扣分）
- **电梯票系统**：初始3张上限5张，完成楼层获票，每次新会话重置
- **难度递进**：基于 playCount 自动调整（选项数、AI随机率、范围）
- **elevatorTickets 不持久化**：每次新会话重置为3
- **lazy 组件缓存**：getFloorComponent 使用 lazyCache 避免游戏状态丢失

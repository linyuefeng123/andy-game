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
- `src/floors/_floorMeta.ts` - 楼层元数据（名称、类别、奖励、故事）
- `src/floors/f00X-*` - 各楼层游戏组件（31个已实现：1-30 + 31-60）
- `src/floors/_shared/EduGame.tsx` - 教育游戏共享壳
- `src/pages/` - 页面组件（LobbyPage, FloorPage, ShopPage 等）
- `src/components/` - 共享组件（ErrorBoundary, DailyRewardModal, LevelUpCeremony, MysteryBox, CompletionCeremony）
- `src/utils/audio.ts` - Web Audio API 音效（懒创建 AudioContext，oscillator disconnect，BGM播放器）
- `src/utils/achievements.ts` - 成就定义

## 部署前测试（必须通过）

每次上线部署前，必须执行以下测试检查：

### 1. 构建测试
```bash
npx tsc --noEmit && npx vite build
```
必须 0 错误通过。

## 部署历史与错误记录

### 2026-05-18 大厅重构 + 30层新游戏
- **修改**: 大厅底部只保留成就+楼层，商店移至右上角，标题改为Andy100层房子大冒险，删除小屋功能，成就页改用进度条，楼层进入去掉帮手角色
- **新增**: 30层新游戏（31-60），灵感来自最强大脑+经典益智+逻辑推理
- **部署错误**: `git push` 遇到代理问题 `Failed to connect to 127.0.0.1 port 7890`，需使用 `git -c http.proxy="" push` 绕过本地代理

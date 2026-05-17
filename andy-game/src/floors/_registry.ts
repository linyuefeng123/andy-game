import { lazy, type ComponentType } from 'react';
import type { FloorReward } from '../store/useGameStore';
import { type FloorMeta } from './_floorMeta';

export type { FloorMeta } from './_floorMeta';
export { floorMeta, getFloorMeta } from './_floorMeta';

export type HelperCharacter = 'grandpa' | 'grandma' | 'mom';

export const HELPER_CHARACTERS: Record<HelperCharacter, { emoji: string; nameZh: string; nameEn: string }> = {
  grandpa: { emoji: '👴', nameZh: '爷爷', nameEn: 'Grandpa' },
  grandma: { emoji: '👵', nameZh: '奶奶', nameEn: 'Grandma' },
  mom: { emoji: '👩', nameZh: '妈妈', nameEn: 'Mom' },
};

export const HELPER_LIST: HelperCharacter[] = ['grandpa', 'grandma', 'mom'];

export function randomHelper(): HelperCharacter {
  return HELPER_LIST[Math.floor(Math.random() * HELPER_LIST.length)];
}

export interface FloorProps {
  onExit: () => void;
  onComplete: (stars: number, reward?: FloorReward) => void;
  helperChar: HelperCharacter;
  helpRemaining: number;
  onHelpUsed: () => void;
  /** Skip the current game (no penalty) */
  onConcede: () => void;
  onReplay: () => void;
}

const floorModules: Record<number, () => Promise<{ default: ComponentType<FloorProps> }>> = {
  1: () => import('./f001-gomoku'),
  2: () => import('./f002-guess-number'),
  3: () => import('./f003-guess-color'),
  4: () => import('./f004-diamond-chess'),
  5: () => import('./f005-english-vocab'),
  6: () => import('./f006-pinyin'),
  7: () => import('./f007-jungle-chess'),
  8: () => import('./f008-idiom'),
  9: () => import('./f009-simple-cards'),
  10: () => import('./f010-tic-tac-toe'),
  11: () => import('./f011-connect-four'),
  12: () => import('./f012-memory-match'),
  13: () => import('./f013-snake'),
  14: () => import('./f014-maze'),
  15: () => import('./f015-whack-a-mole'),
  16: () => import('./f016-breakout'),
  17: () => import('./f017-sudoku'),
  18: () => import('./f018-math-quiz'),
  19: () => import('./f019-word-scramble'),
  20: () => import('./f020-color-match'),
  21: () => import('./f021-flip-card'),
  22: () => import('./f022-piano'),
  23: () => import('./f023-drawing'),
  24: () => import('./f024-reaction'),
  25: () => import('./f025-sliding-puzzle'),
  26: () => import('./f026-rock-paper-scissors'),
  27: () => import('./f027-simon-says'),
  28: () => import('./f028-2048'),
  29: () => import('./f029-minesweeper'),
};

export const IMPLEMENTED_FLOORS = Object.keys(floorModules).map(Number);

export function isFloorImplemented(floorNumber: number): boolean {
  return floorNumber in floorModules;
}

const lazyCache: Record<number, React.LazyExoticComponent<FloorProps>> = {};
const preloadCache: Record<number, Promise<{ default: ComponentType<FloorProps> }>> = {};

export function preloadFloorComponent(floorNumber: number): void {
  const loader = floorModules[floorNumber];
  if (loader && !preloadCache[floorNumber]) {
    preloadCache[floorNumber] = loader();
  }
}

export function getFloorComponent(floorNumber: number): ComponentType<FloorProps> | null {
  const loader = floorModules[floorNumber];
  if (!loader) return null;
  if (!lazyCache[floorNumber]) {
    const cachedPromise = preloadCache[floorNumber];
    if (cachedPromise) {
      lazyCache[floorNumber] = lazy(() => cachedPromise);
    } else {
      lazyCache[floorNumber] = lazy(loader);
    }
  }
  return lazyCache[floorNumber];
}

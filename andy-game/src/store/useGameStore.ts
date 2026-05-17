import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FloorProgress {
  floorNumber: number;
  completed: boolean;
  stars: number;
  bestScore?: number;
  playCount: number;
  reward?: FloorReward;
}

export interface FloorReward {
  emoji: string;
  nameZh: string;
  nameEn: string;
  descriptionZh: string;
  descriptionEn: string;
}

export interface GameState {
  playerName: string;
  language: 'zh' | 'en';
  elevatorUsesRemaining: number;
  visitedFloors: number[];
  completedFloors: Record<number, FloorProgress>;
  totalStars: number;
  unlockedFloors: number[];
  collectedRewards: FloorReward[];
  audioEnabled: boolean;
  musicEnabled: boolean;
  iq: number;

  setPlayerName: (name: string) => void;
  setLanguage: (lang: 'zh' | 'en') => void;
  useElevator: () => boolean;
  resetElevatorUses: () => void;
  visitFloor: (floorNumber: number) => void;
  completeFloor: (floorNumber: number, stars: number, reward?: FloorReward) => void;
  unlockFloor: (floorNumber: number) => void;
  addStars: (count: number) => void;
  toggleAudio: () => void;
  toggleMusic: () => void;
  adjustIq: (delta: number) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      playerName: '',
      language: 'zh',
      elevatorUsesRemaining: 3,
      visitedFloors: [],
      completedFloors: {},
      totalStars: 0,
      unlockedFloors: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      collectedRewards: [],
      audioEnabled: true,
      musicEnabled: false,
      iq: 100,

      setPlayerName: (name) => set({ playerName: name }),

      setLanguage: (lang) => set({ language: lang }),

      useElevator: () => {
        const remaining = get().elevatorUsesRemaining;
        if (remaining <= 0) return false;
        set({ elevatorUsesRemaining: remaining - 1 });
        return true;
      },

      resetElevatorUses: () => set({ elevatorUsesRemaining: 3 }),

      visitFloor: (floorNumber) => {
        const visited = get().visitedFloors;
        if (!visited.includes(floorNumber)) {
          set({ visitedFloors: [...visited, floorNumber] });
        }
      },

      completeFloor: (floorNumber, stars, reward) => {
        const existing = get().completedFloors[floorNumber];
        const progress: FloorProgress = {
          floorNumber,
          completed: true,
          stars: Math.max(stars, existing?.stars ?? 0),
          bestScore: existing?.bestScore,
          playCount: (existing?.playCount ?? 0) + 1,
          reward: reward ?? existing?.reward,
        };
        const newCompletedFloors = { ...get().completedFloors, [floorNumber]: progress };

        // Collect reward if new
        const newRewards = reward && !existing?.reward
          ? [...get().collectedRewards, reward]
          : get().collectedRewards;

        // Unlock next floor(s)
        const unlocked = get().unlockedFloors;
        const newUnlocked = floorNumber + 1 <= 100 && !unlocked.includes(floorNumber + 1)
          ? [...unlocked, floorNumber + 1]
          : unlocked;

        set({
          completedFloors: newCompletedFloors,
          collectedRewards: newRewards,
          unlockedFloors: newUnlocked,
        });
        get().addStars(stars);
      },

      unlockFloor: (floorNumber) => {
        const unlocked = get().unlockedFloors;
        if (!unlocked.includes(floorNumber)) {
          set({ unlockedFloors: [...unlocked, floorNumber] });
        }
      },

      addStars: (count) => set({ totalStars: get().totalStars + count }),

      toggleAudio: () => set({ audioEnabled: !get().audioEnabled }),
      toggleMusic: () => set({ musicEnabled: !get().musicEnabled }),

      adjustIq: (delta) => set({ iq: Math.max(0, get().iq + delta) }),
    }),
    {
      name: 'andy-100floors',
      partialize: (state) => ({
        playerName: state.playerName,
        language: state.language,
        visitedFloors: state.visitedFloors,
        completedFloors: state.completedFloors,
        totalStars: state.totalStars,
        unlockedFloors: state.unlockedFloors,
        collectedRewards: state.collectedRewards,
        audioEnabled: state.audioEnabled,
        musicEnabled: state.musicEnabled,
        iq: state.iq,
      }),
    }
  )
);

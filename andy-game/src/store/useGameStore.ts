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

export interface MysteryBoxEntry {
  date: string;
  prize: string;
}

export const MAX_ELEVATOR_TICKETS = 5;

export const AP_THRESHOLDS = [30, 60, 100, 150] as const;

export interface GameState {
  playerName: string;
  language: 'zh' | 'en';
  elevatorTickets: number;
  visitedFloors: number[];
  completedFloors: Record<number, FloorProgress>;
  totalStars: number;
  unlockedFloors: number[];
  collectedRewards: FloorReward[];
  audioEnabled: boolean;
  musicEnabled: boolean;
  adventurePoints: number;

  // Daily login
  lastPlayDate: string;
  streakDays: number;
  dailyRewardClaimed: boolean;

  // Shop
  purchasedItems: string[];

  // Achievements
  unlockedAchievements: string[];

  // Mystery box
  mysteryBoxHistory: MysteryBoxEntry[];

  // Level up ceremony tracking
  shownAPThresholds: number[];

  // Completion ceremony tracking
  completionCeremonyShown: boolean;

  setPlayerName: (name: string) => void;
  setLanguage: (lang: 'zh' | 'en') => void;
  useElevator: () => boolean;
  resetElevatorTickets: () => void;
  visitFloor: (floorNumber: number) => void;
  completeFloor: (floorNumber: number, stars: number, reward?: FloorReward) => void;
  unlockFloor: (floorNumber: number) => void;
  addStars: (count: number) => void;
  toggleAudio: () => void;
  toggleMusic: () => void;
  addAdventurePoints: (delta: number) => void;
  /** @deprecated Backward compat alias for addAdventurePoints */
  adjustIq: (delta: number) => void;

  // Daily login
  claimDailyReward: () => number | false;
  resetDailyFlag: () => void;

  // Shop
  spendStars: (count: number) => boolean;

  // Achievements
  checkAndUnlockAchievements: () => string[];

  // Mystery box
  grantMysteryPrize: (prize: string) => void;

  // Ceremonies
  markAPThresholdShown: (threshold: number) => void;
  markCompletionCeremonyShown: () => void;

  /** Get difficulty level based on play count: 1=easy(0-1), 2=medium(2-4), 3=hard(5+) */
  getDifficultyLevel: (floorNumber: number) => 1 | 2 | 3;
}

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      playerName: '',
      language: 'zh',
      elevatorTickets: 3,
      visitedFloors: [],
      completedFloors: {},
      totalStars: 0,
      unlockedFloors: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
      collectedRewards: [],
      audioEnabled: true,
      musicEnabled: false,
      adventurePoints: 0,

      // Daily login
      lastPlayDate: '',
      streakDays: 0,
      dailyRewardClaimed: false,

      // Shop
      purchasedItems: [],

      // Achievements
      unlockedAchievements: [],

      // Mystery box
      mysteryBoxHistory: [],

      // Ceremony tracking
      shownAPThresholds: [],
      completionCeremonyShown: false,

      setPlayerName: (name) => set({ playerName: name }),

      setLanguage: (lang) => set({ language: lang }),

      useElevator: () => {
        const remaining = get().elevatorTickets;
        if (remaining <= 0) return false;
        set({ elevatorTickets: remaining - 1 });
        return true;
      },

      resetElevatorTickets: () => set({ elevatorTickets: 3 }),

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
          totalStars: get().totalStars + stars,
          elevatorTickets: Math.min(MAX_ELEVATOR_TICKETS, get().elevatorTickets + (stars === 3 ? 2 : 1)),
        });

        // Check achievements after floor completion
        get().checkAndUnlockAchievements();
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

      addAdventurePoints: (delta) => {
        if (delta > 0) set({ adventurePoints: get().adventurePoints + delta });
      },

      /** @deprecated Backward compat alias for addAdventurePoints */
      adjustIq: (delta) => get().addAdventurePoints(delta),

      // Daily login
      claimDailyReward: () => {
        const today = getTodayISO();
        const { lastPlayDate, streakDays, elevatorTickets } = get();

        // Already claimed today
        if (lastPlayDate === today) return false;

        // Calculate streak
        const yesterday = getYesterdayISO();
        let newStreak: number;
        if (lastPlayDate === yesterday) {
          newStreak = streakDays + 1;
        } else {
          newStreak = 1;
        }

        // Award tickets based on streak
        let ticketsToAdd = 0;
        if (newStreak >= 7) ticketsToAdd = 3;
        else if (newStreak >= 3) ticketsToAdd = 2;
        else ticketsToAdd = 1;

        const newTickets = Math.min(elevatorTickets + ticketsToAdd, MAX_ELEVATOR_TICKETS);

        set({
          lastPlayDate: today,
          streakDays: newStreak,
          dailyRewardClaimed: true,
          elevatorTickets: newTickets,
        });

        return newStreak;
      },

      resetDailyFlag: () => {
        const today = getTodayISO();
        if (get().lastPlayDate !== today) {
          set({ dailyRewardClaimed: false });
        }
      },

      // Shop
      spendStars: (count) => {
        const { totalStars } = get();
        if (totalStars < count) return false;
        set({ totalStars: totalStars - count });
        return true;
      },

      // Achievements
      checkAndUnlockAchievements: () => {
        const state = get();
        const unlocked = state.unlockedAchievements;
        const newlyUnlocked: string[] = [];

        // first_adventure: complete first floor
        if (!unlocked.includes('first_adventure')) {
          const completedAny = Object.values(state.completedFloors).some((f) => f.completed);
          if (completedAny) newlyUnlocked.push('first_adventure');
        }

        // explorer: play 5 different floors
        if (!unlocked.includes('explorer')) {
          if (Object.keys(state.completedFloors).length >= 5) newlyUnlocked.push('explorer');
        }

        // star_master: get 3 stars on any floor
        if (!unlocked.includes('star_master')) {
          const has3Stars = Object.values(state.completedFloors).some((f) => f.stars >= 3);
          if (has3Stars) newlyUnlocked.push('star_master');
        }

        // collector: collect 5 rewards
        if (!unlocked.includes('collector')) {
          if (state.collectedRewards.length >= 5) newlyUnlocked.push('collector');
        }

        // persistent: play same floor 3 times
        if (!unlocked.includes('persistent')) {
          const has3Plays = Object.values(state.completedFloors).some((f) => f.playCount >= 3);
          if (has3Plays) newlyUnlocked.push('persistent');
        }

        // night_owl: play after 8pm
        if (!unlocked.includes('night_owl')) {
          const hour = new Date().getHours();
          if (hour >= 20) newlyUnlocked.push('night_owl');
        }

        if (newlyUnlocked.length > 0) {
          set({ unlockedAchievements: [...unlocked, ...newlyUnlocked] });
        }

        return newlyUnlocked;
      },

      // Mystery box
      grantMysteryPrize: (prize) => {
        const history = get().mysteryBoxHistory;
        set({
          mysteryBoxHistory: [...history, { date: getTodayISO(), prize }],
        });
      },

      // Ceremony tracking
      markAPThresholdShown: (threshold) => {
        const shown = get().shownAPThresholds;
        if (!shown.includes(threshold)) {
          set({ shownAPThresholds: [...shown, threshold] });
        }
      },

      markCompletionCeremonyShown: () => {
        set({ completionCeremonyShown: true });
      },

      getDifficultyLevel: (floorNumber: number): 1 | 2 | 3 => {
        const progress = get().completedFloors[floorNumber];
        const playCount = progress?.playCount ?? 0;
        if (playCount >= 5) return 3;
        if (playCount >= 2) return 2;
        return 1;
      },
    }),
    {
      name: 'andy-100floors',
      partialize: (state) => ({
        playerName: state.playerName,
        language: state.language,
        elevatorTickets: state.elevatorTickets,
        visitedFloors: state.visitedFloors,
        completedFloors: state.completedFloors,
        totalStars: state.totalStars,
        unlockedFloors: state.unlockedFloors,
        collectedRewards: state.collectedRewards,
        audioEnabled: state.audioEnabled,
        musicEnabled: state.musicEnabled,
        adventurePoints: state.adventurePoints,
        lastPlayDate: state.lastPlayDate,
        streakDays: state.streakDays,
        purchasedItems: state.purchasedItems,
        unlockedAchievements: state.unlockedAchievements,
        mysteryBoxHistory: state.mysteryBoxHistory,
        shownAPThresholds: state.shownAPThresholds,
        completionCeremonyShown: state.completionCeremonyShown,
      }),
    }
  )
);

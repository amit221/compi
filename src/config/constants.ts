// src/config/constants.ts

export const TICKS_PER_SPAWN_CHECK = 10;
export const SPAWN_PROBABILITY = 0.6;
export const MAX_NEARBY = 5;
export const CREATURE_LINGER_MS = 30 * 60 * 1000;  // 30 minutes
export const MAX_CATCH_ATTEMPTS = 3;

export const SESSION_GAP_MS = 15 * 60 * 1000;
export const TICK_PRUNE_COUNT = 500;

export const XP_PER_CATCH: Record<string, number> = {
  common: 10,
  uncommon: 25,
  rare: 50,
  epic: 100,
  legendary: 250,
};

export const XP_PER_LEVEL = 100;

export const SPAWN_WEIGHTS: Record<string, number> = {
  common: 0.45,
  uncommon: 0.25,
  rare: 0.15,
  epic: 0.10,
  legendary: 0.05,
};

export const PASSIVE_DRIP_INTERVAL = 25;
export const PASSIVE_DRIP_ITEMS: Array<{ itemId: string; count: number; weight: number }> = [
  { itemId: "bytetrap", count: 2, weight: 0.7 },
  { itemId: "netsnare", count: 1, weight: 0.25 },
  { itemId: "corelock", count: 1, weight: 0.05 },
];

export interface Milestone {
  id: string;
  description: string;
  condition: (profile: { totalCatches: number; currentStreak: number; totalTicks: number }) => boolean;
  reward: Array<{ itemId: string; count: number }>;
  oneTime: boolean;
}

export const MILESTONES: Milestone[] = [
  {
    id: "first_catch",
    description: "First catch!",
    condition: (p) => p.totalCatches >= 1,
    reward: [{ itemId: "bytetrap", count: 5 }],
    oneTime: true,
  },
  {
    id: "catch_10",
    description: "10 catches!",
    condition: (p) => p.totalCatches >= 10,
    reward: [{ itemId: "netsnare", count: 3 }, { itemId: "shard", count: 1 }],
    oneTime: true,
  },
  {
    id: "catch_50",
    description: "50 catches!",
    condition: (p) => p.totalCatches >= 50,
    reward: [{ itemId: "corelock", count: 2 }, { itemId: "prism", count: 1 }],
    oneTime: true,
  },
  {
    id: "streak_3",
    description: "3-day streak!",
    condition: (p) => p.currentStreak >= 3,
    reward: [{ itemId: "bytetrap", count: 3 }],
    oneTime: true,
  },
  {
    id: "streak_7",
    description: "7-day streak!",
    condition: (p) => p.currentStreak >= 7,
    reward: [{ itemId: "netsnare", count: 3 }, { itemId: "shard", count: 2 }],
    oneTime: true,
  },
  {
    id: "streak_30",
    description: "30-day streak!",
    condition: (p) => p.currentStreak >= 30,
    reward: [{ itemId: "corelock", count: 3 }, { itemId: "prism", count: 2 }],
    oneTime: true,
  },
];

export const SESSION_REWARD_ITEMS: Array<{ itemId: string; count: number; weight: number }> = [
  { itemId: "bytetrap", count: 3, weight: 0.6 },
  { itemId: "netsnare", count: 1, weight: 0.3 },
  { itemId: "shard", count: 1, weight: 0.1 },
];

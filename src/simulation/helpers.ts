import { GameState } from "../types";
import { loadConfig } from "../config/loader";

/**
 * Deterministic PRNG seeded by an integer counter.
 * Uses a sin-based hash — adequate for game simulation reproducibility.
 */
export function makeRng(seed: number): () => number {
  let counter = seed;
  return () => {
    counter++;
    const x = Math.sin(counter * 9301 + 49297) * 49297;
    return x - Math.floor(x);
  };
}

/**
 * Create a fresh default GameState for simulation runs.
 */
export function makeDefaultState(sessionPrefix = "sim"): GameState {
  const config = loadConfig();
  return {
    version: 5,
    profile: {
      level: 1,
      xp: 0,
      totalCatches: 0,
      totalMerges: 0,
      totalTicks: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: "",
      totalUpgrades: 0,
      totalQuests: 0,
    },
    collection: [],
    archive: [],
    energy: config.energy.startingEnergy,
    lastEnergyGainAt: 0,
    nearby: [],
    batch: null,
    lastSpawnAt: 0,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
    gold: config.economy.startingGold,
    discoveredSpecies: [],
    activeQuest: null,
    sessionUpgradeCount: 0,
    currentSessionId: `${sessionPrefix}-session-0`,
  };
}

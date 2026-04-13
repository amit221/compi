import { earnGold, spendGold, canAfford } from "../../src/engine/gold";
import { GameState } from "../../src/types";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 5,
    profile: { level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalUpgrades: 0, totalQuests: 0, totalTicks: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: "" },
    collection: [], archive: [], energy: 10, lastEnergyGainAt: Date.now(), nearby: [], batch: null, lastSpawnAt: 0, recentTicks: [], claimedMilestones: [], settings: { notificationLevel: "moderate" },
    gold: 50, discoveredSpecies: [], activeQuest: null, sessionUpgradeCount: 0, currentSessionId: "",
    ...overrides,
  };
}

describe("gold", () => {
  test("earnGold adds gold to state", () => {
    const state = makeState({ gold: 10 });
    earnGold(state, 25);
    expect(state.gold).toBe(35);
  });
  test("earnGold rejects negative amounts", () => {
    const state = makeState({ gold: 10 });
    expect(() => earnGold(state, -5)).toThrow();
  });
  test("spendGold deducts gold from state", () => {
    const state = makeState({ gold: 50 });
    spendGold(state, 30);
    expect(state.gold).toBe(20);
  });
  test("spendGold throws if insufficient gold", () => {
    const state = makeState({ gold: 5 });
    expect(() => spendGold(state, 10)).toThrow(/gold/i);
  });
  test("canAfford returns true/false", () => {
    const state = makeState({ gold: 15 });
    expect(canAfford(state, 15)).toBe(true);
    expect(canAfford(state, 16)).toBe(false);
    expect(canAfford(state, 0)).toBe(true);
  });
});

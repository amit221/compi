import { grantXp, getXpForNextLevel, getTraitRankCap } from "../../src/engine/progression";
import { GameState } from "../../src/types";

jest.mock("../../src/config/loader", () => ({
  loadConfig: () => ({
    leveling: {
      thresholds: [30, 50, 80, 120, 170, 240, 340, 480, 680, 960, 1350, 1900, 2700],
      traitRankCaps: [1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8],
      xpPerCatch: 10, xpPerUpgrade: 8, xpPerMerge: 25, xpPerQuest: 15, xpDiscoveryBonus: 20,
    },
  }),
}));

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 7,
    profile: { level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: "" },
    collection: [], energy: 10, lastEnergyGainAt: Date.now(), nearby: [], batch: null, lastSpawnAt: 0, recentTicks: [], claimedMilestones: [], settings: { notificationLevel: "moderate" },
    discoveredSpecies: [], currentSessionId: "",
    speciesProgress: {},
    personalSpecies: [],
    sessionBreedCount: 0,
    breedCooldowns: {},
    ...overrides,
  };
}

describe("getXpForNextLevel", () => {
  test("level 1 needs 30 XP", () => { expect(getXpForNextLevel(1)).toBe(30); });
  test("level 5 needs 170 XP", () => { expect(getXpForNextLevel(5)).toBe(170); });
  test("level 13 needs 2700 XP", () => { expect(getXpForNextLevel(13)).toBe(2700); });
  test("level beyond thresholds uses last", () => { expect(getXpForNextLevel(14)).toBe(2700); expect(getXpForNextLevel(20)).toBe(2700); });
});

describe("getTraitRankCap", () => {
  test("level 1 has cap 1", () => { expect(getTraitRankCap(1)).toBe(1); });
  test("level 7 has cap 4", () => { expect(getTraitRankCap(7)).toBe(4); });
  test("level 14 has cap 8", () => { expect(getTraitRankCap(14)).toBe(8); });
  test("level beyond caps uses last", () => { expect(getTraitRankCap(20)).toBe(8); });
});

describe("grantXp", () => {
  test("grants XP without level up", () => {
    const state = makeState();
    state.profile.xp = 0; state.profile.level = 1;
    const result = grantXp(state, 10);
    expect(result).toBeNull();
    expect(state.profile.xp).toBe(10);
  });
  test("level up when XP crosses threshold", () => {
    const state = makeState();
    state.profile.xp = 25; state.profile.level = 1;
    const result = grantXp(state, 10);
    expect(result).not.toBeNull();
    expect(result!.oldLevel).toBe(1);
    expect(result!.newLevel).toBe(2);
    expect(state.profile.level).toBe(2);
    expect(state.profile.xp).toBe(5); // 25+10=35, threshold=30, overflow=5
  });
  test("multi-level up with large XP grant", () => {
    const state = makeState();
    state.profile.xp = 0; state.profile.level = 1;
    const result = grantXp(state, 85); // 30+50=80 for level 3, overflow 5
    expect(result).not.toBeNull();
    expect(result!.oldLevel).toBe(1);
    expect(result!.newLevel).toBe(3);
    expect(state.profile.level).toBe(3);
    expect(state.profile.xp).toBe(5);
  });
});

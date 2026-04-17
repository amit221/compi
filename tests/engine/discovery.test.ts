import { recordDiscovery, isSpeciesDiscovered, getDiscoveryCount } from "../../src/engine/discovery";
import { GameState } from "../../src/types";

jest.mock("../../src/config/loader", () => ({
  loadConfig: () => ({
    leveling: {
      thresholds: [30, 50, 80, 120, 170, 240, 340, 480, 680, 960, 1350, 1900, 2700],
      traitRankCaps: [1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8],
      xpPerCatch: 10,
      xpPerUpgrade: 8,
      xpPerMerge: 25,
      xpPerQuest: 15,
      xpDiscoveryBonus: 20,
    },
  }),
}));

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 7,
    profile: {
      level: 1, xp: 0, totalCatches: 0, totalMerges: 0, 
      totalTicks: 0, currentStreak: 0, longestStreak: 0,
      lastActiveDate: "",
    },
    collection: [],
    energy: 10,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    lastSpawnAt: 0,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
    
    discoveredSpecies: [],
    
    
    currentSessionId: "",
    speciesProgress: {},
    personalSpecies: [],
    sessionBreedCount: 0,
    breedCooldowns: {},
    ...overrides,
  };
}

describe("discovery", () => {
  test("recordDiscovery adds new species and returns isNew=true with bonus XP", () => {
    const state = makeState();
    const result = recordDiscovery(state, "compi");
    expect(result.isNew).toBe(true);
    expect(result.speciesId).toBe("compi");
    expect(result.bonusXp).toBe(20);
    expect(result.totalDiscovered).toBe(1);
    expect(state.discoveredSpecies).toContain("compi");
  });

  test("recordDiscovery for already-discovered species returns isNew=false", () => {
    const state = makeState({ discoveredSpecies: ["compi"] });
    const result = recordDiscovery(state, "compi");
    expect(result.isNew).toBe(false);
    expect(result.bonusXp).toBe(0);
    expect(result.totalDiscovered).toBe(1);
  });

  test("multiple discoveries tracked", () => {
    const state = makeState();
    recordDiscovery(state, "compi");
    recordDiscovery(state, "flikk");
    recordDiscovery(state, "compi"); // duplicate
    expect(state.discoveredSpecies).toEqual(["compi", "flikk"]);
    expect(getDiscoveryCount(state)).toBe(2);
  });

  test("isSpeciesDiscovered works", () => {
    const state = makeState({ discoveredSpecies: ["compi", "flikk"] });
    expect(isSpeciesDiscovered(state, "compi")).toBe(true);
    expect(isSpeciesDiscovered(state, "jinx")).toBe(false);
  });
});

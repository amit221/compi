import { GameState, CreatureSlot, NearbyCreature, SlotId } from "../../src/types";

// Mock getTraitDefinition to return controlled spawn rates
const mockGetTraitDefinition = jest.fn();
const mockGetTraitRank = jest.fn();
const mockGetSpeciesById = jest.fn();
jest.mock("../../src/config/species", () => ({
  getTraitDefinition: (...args: any[]) => mockGetTraitDefinition(...args),
  getTraitRank: (...args: any[]) => mockGetTraitRank(...args),
  getSpeciesById: (...args: any[]) => mockGetSpeciesById(...args),
}));

// Mock loadConfig to return controlled balance values
jest.mock("../../src/config/loader", () => ({
  loadConfig: () => ({
    catching: {
      baseCatchRate: 0.90,
      minCatchRate: 0.15,
      maxCatchRate: 0.90,
      failPenaltyPerMiss: 0.10,
      maxTraitSpawnRate: 0.12,
      difficultyScale: 0.50,
      xpBase: 20,
      xpRarityMultiplier: 5,
    },
    energy: {
      gainIntervalMs: 1800000,
      maxEnergy: 30,
      startingEnergy: 5,
      sessionBonus: 1,
      baseMergeCost: 3,
      maxMergeCost: 8,
      rareThreashold: 0.05,
    },
  }),
}));

import { attemptCatch, calculateCatchRate, calculateXpEarned, calculateEnergyCost } from "../../src/engine/catch";

const SLOT_IDS: SlotId[] = ["eyes", "mouth", "body", "tail"];

/** Build slots with given variant IDs (default rarity 0) */
function makeSlots(variantIds: string[], rarities?: number[]): CreatureSlot[] {
  return variantIds.map((v, i) => ({
    slotId: SLOT_IDS[i % SLOT_IDS.length],
    variantId: v,
    color: "white" as const,
    rarity: rarities ? rarities[i] : 0,
  }));
}

/** Set up mock so getTraitDefinition returns specified spawn rates by variantId */
function setupTraitRates(rates: Record<string, number>): void {
  mockGetTraitDefinition.mockImplementation((_speciesId: string, variantId: string) => {
    if (variantId in rates) {
      return { id: variantId, name: variantId, art: "x", spawnRate: rates[variantId] };
    }
    return undefined;
  });
}

function setupTraitRanks(ranks: Record<string, number>): void {
  mockGetTraitRank.mockImplementation((_speciesId: string, _slotId: string, variantId: string) => {
    return ranks[variantId] ?? 0;
  });
}

function makeNearby(id: string, variantIds: string[], speciesId = "compi"): NearbyCreature {
  return { id, speciesId, name: "Glorp", slots: makeSlots(variantIds), spawnedAt: Date.now() };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 7,
    profile: { level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: "", },
    collection: [],
    energy: 10,
    lastEnergyGainAt: Date.now(),
    nearby: [makeNearby("c1", ["common1", "common2", "common3", "common4"])],
    batch: { attemptsRemaining: 3, failPenalty: 0, spawnedAt: Date.now() },
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

beforeEach(() => {
  mockGetTraitDefinition.mockReset();
  mockGetTraitRank.mockReset();
  mockGetSpeciesById.mockReset();
  // Default: compi has 19 traits per slot (maxRankInPool = 18)
  mockGetSpeciesById.mockReturnValue({
    id: "compi",
    traitPools: {
      eyes: new Array(19),
      mouth: new Array(19),
      body: new Array(19),
      tail: new Array(19),
    },
  });
  // Default: all traits are rank 0 (most common)
  mockGetTraitRank.mockReturnValue(0);
});

describe("calculateCatchRate", () => {
  test("all rarity-0 traits = 100% base (clamped to maxCatchRate 0.90)", () => {
    const slots = makeSlots(["c1", "c2", "c3", "c4"], [0, 0, 0, 0]);
    const rate = calculateCatchRate("compi", slots, 0);
    expect(rate).toBeCloseTo(0.90);
  });

  test("rarity-4 (blue) traits lower catch rate", () => {
    const slots = makeSlots(["r1", "r2", "r3", "r4"], [4, 4, 4, 4]);
    const rate = calculateCatchRate("compi", slots, 0);
    // Each: 1.0 - (4/7)*0.50 = 1.0 - 0.2857 = 0.7143
    expect(rate).toBeCloseTo(0.714, 2);
  });

  test("mixed rarities: average of per-trait chances", () => {
    const slots = makeSlots(["c1", "c2", "r1", "r2"], [0, 0, 4, 7]);
    const rate = calculateCatchRate("compi", slots, 0);
    // rarity 0: 1.0, rarity 0: 1.0, rarity 4: 0.714, rarity 7: 0.50
    // avg = (1.0 + 1.0 + 0.714 + 0.50) / 4 = 0.8036
    expect(rate).toBeCloseTo(0.804, 2);
  });

  test("fail penalty reduces rate", () => {
    const slots = makeSlots(["c1", "c2", "c3", "c4"], [0, 0, 0, 0]);
    expect(calculateCatchRate("compi", slots, 0.10)).toBeCloseTo(0.80);
  });

  test("rate clamped to minimum (0.15)", () => {
    const slots = makeSlots(["r1", "r2", "r3", "r4"], [7, 7, 7, 7]);
    const rate = calculateCatchRate("compi", slots, 0.5);
    expect(rate).toBe(0.15);
  });
});

describe("calculateXpEarned", () => {
  test("returns base XP regardless of trait rarity", () => {
    setupTraitRates({ c1: 0.12, c2: 0.10, c3: 0.08, c4: 0.06 });
    const slots = makeSlots(["c1", "c2", "c3", "c4"]);
    expect(calculateXpEarned("compi", slots)).toBe(20);
  });

  test("returns same base XP for rare traits", () => {
    setupTraitRates({ r1: 0.01, r2: 0.003, r3: 0.02, r4: 0.04 });
    const slots = makeSlots(["r1", "r2", "r3", "r4"]);
    expect(calculateXpEarned("compi", slots)).toBe(20);
  });
});

describe("calculateEnergyCost", () => {
  test("all rarity-0 traits cost 1 energy", () => {
    const slots = makeSlots(["c1", "c2", "c3", "c4"], [0, 0, 0, 0]);
    expect(calculateEnergyCost("compi", slots)).toBe(1);
  });

  test("mid-rarity traits cost more energy", () => {
    // avg rarity = 3.5 → 1 + floor((3.5/7)*4) = 1 + floor(2) = 3
    const slots = makeSlots(["r1", "r2", "r3", "r4"], [3, 3, 4, 4]);
    expect(calculateEnergyCost("compi", slots)).toBe(3);
  });

  test("max-rarity (7) traits cost 5 energy (capped)", () => {
    // avg rarity = 7 → 1 + floor((7/7)*4) = 1 + 4 = 5
    const slots = makeSlots(["r1", "r2", "r3", "r4"], [7, 7, 7, 7]);
    expect(calculateEnergyCost("compi", slots)).toBe(5);
  });

  test("mixed rarities average out", () => {
    // avg rarity = (0+0+3+4)/4 = 1.75 → 1 + floor((1.75/7)*4) = 1 + floor(1) = 2
    const slots = makeSlots(["c1", "c2", "r1", "r2"], [0, 0, 3, 4]);
    expect(calculateEnergyCost("compi", slots)).toBe(2);
  });
});

describe("attemptCatch", () => {
  beforeEach(() => {
    // Default: all common traits
    setupTraitRates({ common1: 0.12, common2: 0.12, common3: 0.12, common4: 0.12 });
  });

  test("success: spends energy, removes creature, adds to collection with speciesId and archived", () => {
    const state = makeState();
    const result = attemptCatch(state, 0, () => 0.1);
    expect(result.success).toBe(true);
    expect(result.energySpent).toBe(1);
    expect(state.energy).toBe(9);
    expect(state.nearby).toHaveLength(0);
    expect(state.collection).toHaveLength(1);
    expect(state.collection[0].generation).toBe(0);
    expect(state.collection[0].name).toBe("Glorp");
    expect(state.collection[0].speciesId).toBe("compi");
    expect(state.collection[0].archived).toBe(false);
    expect(state.batch!.attemptsRemaining).toBe(2);
  });

  test("failure: spends energy, keeps creature, increments fail penalty", () => {
    const state = makeState();
    const result = attemptCatch(state, 0, () => 0.99);
    expect(result.success).toBe(false);
    expect(result.energySpent).toBe(1);
    expect(state.energy).toBe(9);
    expect(state.nearby).toHaveLength(1);
    expect(state.batch!.attemptsRemaining).toBe(2);
    expect(state.batch!.failPenalty).toBeCloseTo(0.10);
  });

  test("throws if not enough energy", () => {
    const state = makeState({ energy: 0 });
    expect(() => attemptCatch(state, 0, () => 0.1)).toThrow(/energy/i);
  });

  test("throws if no batch active", () => {
    const state = makeState({ batch: null });
    expect(() => attemptCatch(state, 0, () => 0.1)).toThrow(/batch/i);
  });

  test("throws if no attempts remaining", () => {
    const state = makeState({
      batch: { attemptsRemaining: 0, failPenalty: 0, spawnedAt: Date.now() },
    });
    expect(() => attemptCatch(state, 0, () => 0.1)).toThrow(/attempt/i);
  });

  test("throws if invalid creature index", () => {
    const state = makeState();
    expect(() => attemptCatch(state, 5, () => 0.1)).toThrow();
  });

  test("escalating penalty affects subsequent catch attempts", () => {
    const state = makeState({
      nearby: [
        makeNearby("c1", ["common1", "common2", "common3", "common4"]),
        makeNearby("c2", ["common1", "common2", "common3", "common4"]),
      ],
    });
    attemptCatch(state, 0, () => 0.99); // fail — penalty becomes 0.10
    expect(state.batch!.failPenalty).toBeCloseTo(0.10);
    // Rate is now 0.90 - 0.10 = 0.80, roll 0.85 > 0.80 → fail
    const result = attemptCatch(state, 0, () => 0.85);
    expect(result.success).toBe(false);
  });

  test("xp earned on success and added to profile", () => {
    const state = makeState();
    const result = attemptCatch(state, 0, () => 0.1);
    expect(result.xpEarned).toBe(20); // all common = base XP only
    expect(state.profile.xp).toBe(20);
    expect(state.profile.totalCatches).toBe(1);
  });

  test("higher rarity creature costs more energy", () => {
    // avg rarity = (0+0+3+4)/4 = 1.75 → 1 + floor((1.75/7)*4) = 1 + 1 = 2
    const state = makeState({
      nearby: [{
        id: "c1", speciesId: "compi", name: "Glorp", spawnedAt: Date.now(),
        slots: makeSlots(["common1", "common2", "rare1", "rare2"], [0, 0, 3, 4]),
      }],
    });
    const result = attemptCatch(state, 0, () => 0.1);
    expect(result.success).toBe(true);
    expect(result.energySpent).toBe(2);
    expect(result.xpEarned).toBe(20); // XP stays flat
  });
});

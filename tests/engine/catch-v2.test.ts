import { attemptCatch, calculateCatchRate } from "../../src/engine/catch";
import { GameState, CreatureTrait, NearbyCreature } from "../../src/types";

function makeTraits(rarities: string[]): CreatureTrait[] {
  return rarities.map((r, i) => ({
    slotId: ["eyes", "mouth", "tail", "gills", "pattern", "aura"][i] as any,
    traitId: `test_${r}_${i}`,
    rarity: r as any,
    mergeModifier: { type: "stable" as const, value: 0.05 },
  }));
}

function makeNearby(id: string, rarities: string[]): NearbyCreature {
  return { id, traits: makeTraits(rarities), spawnedAt: Date.now() };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 2,
    profile: { level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: "" },
    collection: [],
    energy: 10,
    lastEnergyGainAt: Date.now(),
    nearby: [makeNearby("c1", ["common", "common", "common", "common", "common", "common"])],
    batch: { attemptsRemaining: 3, failPenalty: 0, spawnedAt: Date.now() },
    recentTicks: [],
    claimedMilestones: [],
    settings: { renderer: "simple", notificationLevel: "moderate" },
    ...overrides,
  };
}

describe("calculateCatchRate", () => {
  test("all common with 0 fail penalty = 80%", () => {
    const traits = makeTraits(["common", "common", "common", "common", "common", "common"]);
    expect(calculateCatchRate(traits, 0)).toBeCloseTo(0.80);
  });

  test("6 rare with 0 fail penalty = 56%", () => {
    const traits = makeTraits(["rare", "rare", "rare", "rare", "rare", "rare"]);
    expect(calculateCatchRate(traits, 0)).toBeCloseTo(0.56);
  });

  test("fail penalty reduces rate", () => {
    const traits = makeTraits(["common", "common", "common", "common", "common", "common"]);
    expect(calculateCatchRate(traits, 0.1)).toBeCloseTo(0.70);
    expect(calculateCatchRate(traits, 0.2)).toBeCloseTo(0.60);
  });

  test("floor at 5%", () => {
    const traits = makeTraits(["void", "void", "void", "void", "void", "void"]);
    expect(calculateCatchRate(traits, 0.5)).toBe(0.05);
  });
});

describe("attemptCatch", () => {
  test("success: spends energy, removes creature, adds to collection", () => {
    const state = makeState();
    const result = attemptCatch(state, 0, () => 0.1);
    expect(result.success).toBe(true);
    expect(result.energySpent).toBe(1);
    expect(state.energy).toBe(9);
    expect(state.nearby).toHaveLength(0);
    expect(state.collection).toHaveLength(1);
    expect(state.collection[0].generation).toBe(0);
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

  test("escalating penalty affects subsequent catches", () => {
    const state = makeState({
      nearby: [
        makeNearby("c1", ["common", "common", "common", "common", "common", "common"]),
        makeNearby("c2", ["common", "common", "common", "common", "common", "common"]),
      ],
    });
    attemptCatch(state, 0, () => 0.99); // fail
    expect(state.batch!.failPenalty).toBeCloseTo(0.10);
    const result = attemptCatch(state, 0, () => 0.75);
    // Rate was 80% - 10% penalty = 70%, roll 0.75 > 0.70 → fail
    expect(result.success).toBe(false);
  });

  test("xp earned on success", () => {
    const state = makeState();
    const result = attemptCatch(state, 0, () => 0.1);
    expect(result.xpEarned).toBeGreaterThan(0);
    expect(state.profile.xp).toBe(result.xpEarned);
  });
});

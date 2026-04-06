import { attemptCatch, calculateCatchRate, calculateXpEarned } from "../../src/engine/catch";
import { GameState, CreatureSlot, NearbyCreature } from "../../src/types";

function makeSlots(rarities: string[]): CreatureSlot[] {
  const slotIds = ["eyes", "mouth", "body", "tail"] as const;
  return rarities.map((r, i) => ({
    slotId: slotIds[i % slotIds.length],
    variantId: `test_${r}_${i}`,
    rarity: r as any,
  }));
}

function makeNearby(id: string, rarities: string[]): NearbyCreature {
  return { id, name: "Glorp", slots: makeSlots(rarities), spawnedAt: Date.now() };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 3,
    profile: { level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: "" },
    collection: [],
    energy: 10,
    lastEnergyGainAt: Date.now(),
    nearby: [makeNearby("c1", ["common", "common", "common", "common"])],
    batch: { attemptsRemaining: 3, failPenalty: 0, spawnedAt: Date.now() },
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
    ...overrides,
  };
}

describe("calculateCatchRate", () => {
  test("all common with 0 fail penalty = 80%", () => {
    const slots = makeSlots(["common", "common", "common", "common"]);
    expect(calculateCatchRate(slots, 0)).toBeCloseTo(0.80);
  });

  test("all mythic has lower catch rate than common", () => {
    const common = makeSlots(["common", "common", "common", "common"]);
    const mythic = makeSlots(["mythic", "mythic", "mythic", "mythic"]);
    expect(calculateCatchRate(mythic, 0)).toBeLessThan(calculateCatchRate(common, 0));
  });

  test("fail penalty reduces rate", () => {
    const slots = makeSlots(["common", "common", "common", "common"]);
    expect(calculateCatchRate(slots, 0.1)).toBeCloseTo(0.70);
    expect(calculateCatchRate(slots, 0.2)).toBeCloseTo(0.60);
  });

  test("floor at 5%", () => {
    const slots = makeSlots(["mythic", "mythic", "mythic", "mythic"]);
    expect(calculateCatchRate(slots, 0.9)).toBe(0.05);
  });

  test("ceiling at 95%", () => {
    const slots = makeSlots(["common", "common", "common", "common"]);
    expect(calculateCatchRate(slots, -1)).toBe(0.95);
  });
});

describe("calculateXpEarned", () => {
  test("common slots yield 10 xp", () => {
    const slots = makeSlots(["common", "common", "common", "common"]);
    expect(calculateXpEarned(slots)).toBe(10);
  });

  test("mythic slots yield 500 xp", () => {
    const slots = makeSlots(["mythic", "mythic", "mythic", "mythic"]);
    expect(calculateXpEarned(slots)).toBe(500);
  });
});

describe("attemptCatch", () => {
  test("success: spends energy, removes creature, adds to collection with name", () => {
    const state = makeState();
    const result = attemptCatch(state, 0, () => 0.1);
    expect(result.success).toBe(true);
    expect(result.energySpent).toBe(1);
    expect(state.energy).toBe(9);
    expect(state.nearby).toHaveLength(0);
    expect(state.collection).toHaveLength(1);
    expect(state.collection[0].generation).toBe(0);
    expect(state.collection[0].name).toBe("Glorp");
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
        makeNearby("c1", ["common", "common", "common", "common"]),
        makeNearby("c2", ["common", "common", "common", "common"]),
      ],
    });
    attemptCatch(state, 0, () => 0.99); // fail — penalty becomes 0.10
    expect(state.batch!.failPenalty).toBeCloseTo(0.10);
    // Rate is now 80% - 10% = 70%, roll 0.75 > 0.70 → fail
    const result = attemptCatch(state, 0, () => 0.75);
    expect(result.success).toBe(false);
  });

  test("xp earned on success and added to profile", () => {
    const state = makeState();
    const result = attemptCatch(state, 0, () => 0.1);
    expect(result.xpEarned).toBeGreaterThan(0);
    expect(state.profile.xp).toBe(result.xpEarned);
    expect(state.profile.totalCatches).toBe(1);
  });
});

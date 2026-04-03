import { attemptCatch } from "../../src/engine/catch";
import { GameState, NearbyCreature } from "../../src/types";
import { getCreatureMap } from "../../src/config/creatures";
import { getItemMap } from "../../src/config/items";

const creatures = getCreatureMap();
const items = getItemMap();

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    profile: {
      level: 1, xp: 0, totalCatches: 0, totalTicks: 0,
      currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-04-01",
    },
    collection: [],
    inventory: { bytetrap: 5, netsnare: 2 },
    nearby: [
      { creatureId: "mousebyte", spawnedAt: Date.now(), failedAttempts: 0, maxAttempts: 3 },
    ],
    recentTicks: [],
    claimedMilestones: [],
    settings: { renderer: "simple", notificationLevel: "moderate" },
    ...overrides,
  };
}

describe("attemptCatch", () => {
  test("succeeds when rng is below catch rate", () => {
    const state = makeState();
    const result = attemptCatch(state, 0, "bytetrap", creatures, items, () => 0.1);
    expect(result.success).toBe(true);
    expect(result.creature.id).toBe("mousebyte");
    expect(result.fragmentsEarned).toBe(1);
    expect(result.fled).toBe(false);
    expect(state.nearby).toHaveLength(0);
    expect(state.collection).toHaveLength(1);
    expect(state.collection[0].creatureId).toBe("mousebyte");
    expect(state.collection[0].fragments).toBe(1);
    expect(state.inventory["bytetrap"]).toBe(4);
    expect(state.profile.xp).toBeGreaterThan(0);
    expect(state.profile.totalCatches).toBe(1);
  });

  test("fails when rng is above catch rate", () => {
    const state = makeState();
    const result = attemptCatch(state, 0, "bytetrap", creatures, items, () => 0.99);
    expect(result.success).toBe(false);
    expect(result.fled).toBe(false);
    expect(state.nearby).toHaveLength(1);
    expect(state.nearby[0].failedAttempts).toBe(1);
    expect(state.inventory["bytetrap"]).toBe(4);
  });

  test("creature flees after max attempts", () => {
    const state = makeState();
    state.nearby[0].failedAttempts = 2;
    const result = attemptCatch(state, 0, "bytetrap", creatures, items, () => 0.99);
    expect(result.success).toBe(false);
    expect(result.fled).toBe(true);
    expect(state.nearby).toHaveLength(0);
  });

  test("uses item multiplier", () => {
    const state = makeState();
    const result = attemptCatch(state, 0, "netsnare", creatures, items, () => 0.9);
    expect(result.success).toBe(true);
    expect(state.inventory["netsnare"]).toBe(1);
  });

  test("throws for invalid index", () => {
    const state = makeState();
    expect(() => attemptCatch(state, 5, "bytetrap", creatures, items)).toThrow("Invalid creature index");
  });

  test("throws for missing item", () => {
    const state = makeState();
    state.inventory = {};
    expect(() => attemptCatch(state, 0, "bytetrap", creatures, items)).toThrow("No bytetrap in inventory");
  });

  test("adds fragments to existing collection entry on duplicate catch", () => {
    const state = makeState();
    state.collection.push({
      creatureId: "mousebyte", fragments: 3, totalCaught: 3,
      firstCaughtAt: 1000, evolved: false,
    });
    const result = attemptCatch(state, 0, "bytetrap", creatures, items, () => 0.1);
    expect(result.success).toBe(true);
    expect(state.collection).toHaveLength(1);
    expect(state.collection[0].fragments).toBe(4);
    expect(state.collection[0].totalCaught).toBe(4);
    expect(result.totalFragments).toBe(4);
  });
});

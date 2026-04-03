import { evolveCreature } from "../../src/engine/evolution";
import { GameState } from "../../src/types";
import { getCreatureMap } from "../../src/config/creatures";

const creatures = getCreatureMap();

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    profile: {
      level: 1, xp: 0, totalCatches: 0, totalTicks: 0,
      currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-04-01",
    },
    collection: [],
    inventory: { shard: 2, prism: 1 },
    nearby: [],
    recentTicks: [],
    claimedMilestones: [],
    settings: { renderer: "simple", notificationLevel: "moderate" },
    ...overrides,
  };
}

describe("evolveCreature", () => {
  test("evolves when fragments and catalyst are sufficient", () => {
    const state = makeState({
      collection: [
        { creatureId: "mousebyte", fragments: 6, totalCaught: 6, firstCaughtAt: 1000, evolved: false },
      ],
    });
    const result = evolveCreature(state, "mousebyte", creatures);
    expect(result.success).toBe(true);
    expect(result.from.id).toBe("mousebyte");
    expect(result.to.id).toBe("circuitmouse");
    expect(result.fragmentsSpent).toBe(5);
    expect(state.collection[0].evolved).toBe(true);
    expect(state.collection[0].fragments).toBe(1);
  });

  test("fails when not enough fragments", () => {
    const state = makeState({
      collection: [
        { creatureId: "mousebyte", fragments: 3, totalCaught: 3, firstCaughtAt: 1000, evolved: false },
      ],
    });
    expect(() => evolveCreature(state, "mousebyte", creatures)).toThrow("Not enough fragments");
  });

  test("fails when already evolved", () => {
    const state = makeState({
      collection: [
        { creatureId: "mousebyte", fragments: 10, totalCaught: 10, firstCaughtAt: 1000, evolved: true },
      ],
    });
    expect(() => evolveCreature(state, "mousebyte", creatures)).toThrow("Already evolved");
  });

  test("fails when creature has no evolution", () => {
    const state = makeState({
      collection: [
        { creatureId: "leviathrex", fragments: 10, totalCaught: 10, firstCaughtAt: 1000, evolved: false },
      ],
    });
    expect(() => evolveCreature(state, "leviathrex", creatures)).toThrow("Cannot evolve");
  });

  test("fails when creature not in collection", () => {
    const state = makeState();
    expect(() => evolveCreature(state, "mousebyte", creatures)).toThrow("not in collection");
  });

  test("consumes catalyst item when required", () => {
    const state = makeState({
      collection: [
        { creatureId: "hawktrace", fragments: 12, totalCaught: 12, firstCaughtAt: 1000, evolved: false },
      ],
    });
    const result = evolveCreature(state, "hawktrace", creatures);
    expect(result.success).toBe(true);
    expect(result.catalystUsed).toBe("shard");
    expect(state.inventory["shard"]).toBe(1);
  });

  test("fails when catalyst is missing", () => {
    const state = makeState({
      collection: [
        { creatureId: "hawktrace", fragments: 12, totalCaught: 12, firstCaughtAt: 1000, evolved: false },
      ],
      inventory: {},
    });
    expect(() => evolveCreature(state, "hawktrace", creatures)).toThrow("Missing catalyst");
  });
});

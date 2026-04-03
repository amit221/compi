import { GameEngine } from "../../src/engine/game-engine";
import { GameState } from "../../src/types";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    profile: {
      level: 1, xp: 0, totalCatches: 0, totalTicks: 9,
      currentStreak: 1, longestStreak: 1, lastActiveDate: "2026-04-03",
    },
    collection: [],
    inventory: { bytetrap: 5 },
    nearby: [],
    recentTicks: [],
    claimedMilestones: [],
    settings: { renderer: "simple", notificationLevel: "moderate" },
    ...overrides,
  };
}

describe("GameEngine", () => {
  test("processTick increments ticks and may spawn", () => {
    const state = makeState();
    const engine = new GameEngine(state);
    const result = engine.processTick({ timestamp: Date.now() }, () => 0.01);
    expect(state.profile.totalTicks).toBe(10);
    expect(result.notifications).toBeDefined();
  });

  test("scan returns nearby creatures", () => {
    const now = Date.now();
    const state = makeState({
      nearby: [
        { creatureId: "glitchlet", spawnedAt: now, failedAttempts: 0, maxAttempts: 3 },
        { creatureId: "nullbyte", spawnedAt: now, failedAttempts: 0, maxAttempts: 3 },
      ],
    });
    const engine = new GameEngine(state);
    const result = engine.scan();
    expect(result.nearby).toHaveLength(2);
    expect(result.nearby[0].creature.id).toBe("glitchlet");
    expect(result.nearby[1].creature.id).toBe("nullbyte");
  });

  test("catch uses engine and returns result", () => {
    const now = Date.now();
    const state = makeState({
      nearby: [
        { creatureId: "glitchlet", spawnedAt: now, failedAttempts: 0, maxAttempts: 3 },
      ],
    });
    const engine = new GameEngine(state);
    const result = engine.catch(0, "bytetrap", () => 0.1);
    expect(result.success).toBe(true);
  });

  test("evolve delegates to evolution engine", () => {
    const state = makeState({
      collection: [
        { creatureId: "glitchlet", fragments: 6, totalCaught: 6, firstCaughtAt: 1000, evolved: false },
      ],
    });
    const engine = new GameEngine(state);
    const result = engine.evolve("glitchlet");
    expect(result.success).toBe(true);
    expect(result.to.id).toBe("glitchform");
  });

  test("status returns player profile summary", () => {
    const state = makeState();
    const engine = new GameEngine(state);
    const result = engine.status();
    expect(result.profile.level).toBe(1);
    expect(result.totalCreatures).toBeGreaterThan(0);
  });
});

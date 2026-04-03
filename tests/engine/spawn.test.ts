import {
  shouldCheckSpawn,
  rollSpawn,
  pickCreature,
  processSpawns,
  cleanupDespawned,
} from "../../src/engine/spawn";
import { GameState, NearbyCreature, CreatureDefinition } from "../../src/types";
import { CREATURES, getSpawnableCreatures } from "../../src/config/creatures";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    profile: {
      level: 1, xp: 0, totalCatches: 0, totalTicks: 0,
      currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-04-01",
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

describe("shouldCheckSpawn", () => {
  test("returns true when totalTicks is multiple of TICKS_PER_SPAWN_CHECK", () => {
    expect(shouldCheckSpawn(10)).toBe(true);
    expect(shouldCheckSpawn(20)).toBe(true);
  });
  test("returns false otherwise", () => {
    expect(shouldCheckSpawn(7)).toBe(false);
    expect(shouldCheckSpawn(0)).toBe(false);
  });
});

describe("rollSpawn", () => {
  test("returns true when roll is below probability", () => {
    expect(rollSpawn(() => 0.1)).toBe(true);
  });
  test("returns false when roll is above probability", () => {
    expect(rollSpawn(() => 0.99)).toBe(false);
  });
});

describe("pickCreature", () => {
  test("returns a spawnable creature", () => {
    const creature = pickCreature(14, 100, () => 0.1);
    expect(creature).toBeDefined();
    expect(creature!.baseCatchRate).toBeGreaterThan(0);
  });
  test("respects time-of-day filter", () => {
    for (let i = 0; i < 50; i++) {
      const creature = pickCreature(23, 1000, Math.random);
      if (creature && creature.spawnCondition.timeOfDay) {
        expect(creature.spawnCondition.timeOfDay).toContain("night");
      }
    }
  });
  test("respects minTotalTicks", () => {
    for (let i = 0; i < 50; i++) {
      const creature = pickCreature(14, 10, Math.random);
      if (creature) {
        expect(creature.id).not.toBe("phantomcursor");
      }
    }
  });
});

describe("cleanupDespawned", () => {
  test("removes creatures past their linger window", () => {
    const now = Date.now();
    const state = makeState({
      nearby: [
        { creatureId: "glitchlet", spawnedAt: now - 2000000, failedAttempts: 0, maxAttempts: 3 },
        { creatureId: "nullbyte", spawnedAt: now - 1000, failedAttempts: 0, maxAttempts: 3 },
      ],
    });
    const despawned = cleanupDespawned(state, now);
    expect(despawned).toEqual(["glitchlet"]);
    expect(state.nearby).toHaveLength(1);
    expect(state.nearby[0].creatureId).toBe("nullbyte");
  });
});

describe("processSpawns", () => {
  test("does not exceed MAX_NEARBY", () => {
    const now = Date.now();
    const state = makeState({
      nearby: Array.from({ length: 5 }, (_, i) => ({
        creatureId: `creature_${i}`,
        spawnedAt: now,
        failedAttempts: 0,
        maxAttempts: 3,
      })),
      profile: {
        level: 1, xp: 0, totalCatches: 0, totalTicks: 10,
        currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-04-01",
      },
    });
    const spawned = processSpawns(state, now, () => 0.01);
    expect(spawned).toHaveLength(0);
    expect(state.nearby.length).toBeLessThanOrEqual(5);
  });
});

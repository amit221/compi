// tests/engine/archive.test.ts
import { archiveCreature, releaseCreature, isCollectionFull } from "../../src/engine/archive";
import { GameState, CollectionCreature, MAX_COLLECTION_SIZE } from "../../src/types";

function makeCreature(id: string, archived = false): CollectionCreature {
  return {
    id,
    speciesId: "species_test",
    name: `Creature_${id}`,
    slots: [],
    caughtAt: Date.now(),
    generation: 0,
    archived,
  };
}

function makeState(
  collection: CollectionCreature[] = [],
  archive: CollectionCreature[] = []
): GameState {
  return {
    version: 4,
    profile: {
      level: 1,
      xp: 0,
      totalCatches: 0,
      totalMerges: 0,
      totalTicks: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: "",
    },
    collection,
    archive,
    energy: 10,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
  };
}

describe("archiveCreature", () => {
  test("moves creature from collection to archive", () => {
    const creature = makeCreature("a");
    const state = makeState([creature]);

    archiveCreature(state, "a");

    expect(state.collection).toHaveLength(0);
    expect(state.archive).toHaveLength(1);
    expect(state.archive[0].id).toBe("a");
  });

  test("sets archived=true on the creature", () => {
    const creature = makeCreature("a");
    const state = makeState([creature]);

    const result = archiveCreature(state, "a");

    expect(result.creature.archived).toBe(true);
    expect(state.archive[0].archived).toBe(true);
  });

  test("throws if creature not found in collection", () => {
    const state = makeState([makeCreature("a")]);

    expect(() => archiveCreature(state, "missing")).toThrow(/not found/i);
  });

  test("throws if creature is already archived", () => {
    const creature = makeCreature("a", true);
    const state = makeState([creature]);

    expect(() => archiveCreature(state, "a")).toThrow(/already archived/i);
  });
});

describe("releaseCreature", () => {
  test("removes creature from collection permanently", () => {
    const creature = makeCreature("a");
    const state = makeState([creature]);

    releaseCreature(state, "a");

    expect(state.collection).toHaveLength(0);
    expect(state.archive).toHaveLength(0);
  });

  test("throws if creature not found in collection", () => {
    const state = makeState([makeCreature("a")]);

    expect(() => releaseCreature(state, "missing")).toThrow(/not found/i);
  });
});

describe("isCollectionFull", () => {
  test("returns false when collection is under 15", () => {
    const creatures = Array.from({ length: 14 }, (_, i) => makeCreature(`c${i}`));
    const state = makeState(creatures);

    expect(isCollectionFull(state)).toBe(false);
  });

  test("returns true when collection is at 15", () => {
    const creatures = Array.from({ length: 15 }, (_, i) => makeCreature(`c${i}`));
    const state = makeState(creatures);

    expect(isCollectionFull(state)).toBe(true);
  });
});

describe("MAX_COLLECTION_SIZE", () => {
  test("is 15", () => {
    expect(MAX_COLLECTION_SIZE).toBe(15);
  });
});

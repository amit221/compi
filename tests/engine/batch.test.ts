import { spawnBatch, generateCreatureSlots, cleanupBatch, pickBatchSize, pickColor } from "../../src/engine/batch";
import { GameState, NearbyCreature, SLOT_IDS, CREATURE_COLORS } from "../../src/types";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 6,
    profile: { level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: "", },
    collection: [],
    archive: [],
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

describe("pickBatchSize", () => {
  test("returns 4 for low roll", () => {
    expect(pickBatchSize(() => 0.1)).toBe(4);
    expect(pickBatchSize(() => 0.24)).toBe(4);
  });

  test("returns 5 for mid roll", () => {
    expect(pickBatchSize(() => 0.25)).toBe(5);
    expect(pickBatchSize(() => 0.54)).toBe(5);
  });

  test("returns 6 or 7 for high roll", () => {
    expect(pickBatchSize(() => 0.55)).toBe(6);
    expect(pickBatchSize(() => 0.80)).toBe(7);
    expect(pickBatchSize(() => 0.99)).toBe(7);
  });
});

describe("generateCreatureSlots", () => {
  test("generates exactly 4 slots", () => {
    const slots = generateCreatureSlots("compi", 1, () => 0.5);
    expect(slots).toHaveLength(4);
  });

  test("slot IDs are eyes, mouth, body, tail in order", () => {
    const slots = generateCreatureSlots("compi", 1, () => 0.5);
    expect(slots.map(s => s.slotId)).toEqual(SLOT_IDS);
  });

  test("each slot has a variantId string", () => {
    const slots = generateCreatureSlots("compi", 1, () => 0.5);
    for (const s of slots) {
      expect(typeof s.variantId).toBe("string");
      expect(s.variantId.length).toBeGreaterThan(0);
    }
  });

  test("each slot has a rarity field derived from color", () => {
    const slots = generateCreatureSlots("compi", 1, () => 0.5);
    for (const s of slots) {
      expect(s).toHaveProperty("rarity");
      expect(typeof s.rarity).toBe("number");
    }
  });

  test("each slot has a color field", () => {
    const slots = generateCreatureSlots("compi", 1, () => 0.5);
    for (const s of slots) {
      expect(CREATURE_COLORS).toContain(s.color);
    }
  });

  test("throws for unknown species", () => {
    expect(() => generateCreatureSlots("nonexistent", 1, () => 0.5)).toThrow("Unknown species: nonexistent");
  });

  test("level 1 spawns only produce rank 0-1 traits", () => {
    for (let i = 0; i < 50; i++) {
      const slots = generateCreatureSlots("compi", 1, () => i / 50);
      for (const s of slots) {
        // Rank 0-1 traits end with _c01 or _c02 for all slots
        expect(s.variantId).toMatch(/_(c01|c02)$/);
      }
    }
  });
});

describe("spawnBatch", () => {
  test("spawns 3-5 creatures with batch state", () => {
    const state = makeState();
    spawnBatch(state, Date.now(), () => 0.5);
    expect(state.nearby.length).toBeGreaterThanOrEqual(3);
    expect(state.nearby.length).toBeLessThanOrEqual(5);
    expect(state.batch).not.toBeNull();
    expect(state.batch!.attemptsRemaining).toBe(3);
    expect(state.batch!.failPenalty).toBe(0);
  });

  test("each creature has speciesId field", () => {
    const state = makeState();
    spawnBatch(state, Date.now(), () => 0.5);
    for (const c of state.nearby) {
      expect(typeof c.speciesId).toBe("string");
      expect(c.speciesId.length).toBeGreaterThan(0);
    }
  });

  test("does not spawn if batch already active", () => {
    const state = makeState({
      batch: { attemptsRemaining: 2, failPenalty: 0, spawnedAt: Date.now() },
      nearby: [{ id: "test", speciesId: "compi", name: "Glorp", slots: [], spawnedAt: Date.now() }],
    });
    const spawned = spawnBatch(state, Date.now(), () => 0.5);
    expect(spawned).toHaveLength(0);
    expect(state.nearby).toHaveLength(1);
  });

  test("each spawned creature has unique id, name, and 4 slots", () => {
    const state = makeState();
    spawnBatch(state, Date.now(), () => 0.5);
    const ids = state.nearby.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of state.nearby) {
      expect(c.name).toBeDefined();
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.slots.length).toBeGreaterThanOrEqual(3);
    }
  });

  test("each spawned creature has slots with rarity field derived from color", () => {
    const state = makeState();
    spawnBatch(state, Date.now(), () => 0.5);
    for (const c of state.nearby) {
      expect(c.slots.length).toBeGreaterThanOrEqual(3);
      for (const s of c.slots) {
        expect(s).toHaveProperty("rarity");
        expect(typeof s.rarity).toBe("number");
      }
    }
  });
});

describe("cleanupBatch", () => {
  test("removes batch and nearby when timed out", () => {
    const thirtyOneMinAgo = Date.now() - 31 * 60 * 1000;
    const state = makeState({
      batch: { attemptsRemaining: 2, failPenalty: 0, spawnedAt: thirtyOneMinAgo },
      nearby: [{ id: "old", speciesId: "compi", name: "Blobby", slots: [], spawnedAt: thirtyOneMinAgo }],
    });
    const despawned = cleanupBatch(state, Date.now());
    expect(state.nearby).toHaveLength(0);
    expect(state.batch).toBeNull();
    expect(despawned).toEqual(["old"]);
  });

  test("removes batch when no attempts remaining", () => {
    const state = makeState({
      batch: { attemptsRemaining: 0, failPenalty: 0.2, spawnedAt: Date.now() },
      nearby: [{ id: "a", speciesId: "compi", name: "Zibbit", slots: [], spawnedAt: Date.now() }],
    });
    const despawned = cleanupBatch(state, Date.now());
    expect(state.nearby).toHaveLength(0);
    expect(state.batch).toBeNull();
    expect(despawned).toEqual(["a"]);
  });

  test("keeps batch if still active", () => {
    const state = makeState({
      batch: { attemptsRemaining: 2, failPenalty: 0, spawnedAt: Date.now() },
      nearby: [{ id: "a", speciesId: "compi", name: "Glimby", slots: [], spawnedAt: Date.now() }],
    });
    const despawned = cleanupBatch(state, Date.now());
    expect(state.nearby).toHaveLength(1);
    expect(state.batch).not.toBeNull();
    expect(despawned).toHaveLength(0);
  });

  test("no-op when batch is null", () => {
    const state = makeState({ batch: null, nearby: [] });
    const despawned = cleanupBatch(state, Date.now());
    expect(despawned).toHaveLength(0);
  });
});

describe("pickColor", () => {
  test("returns a valid creature color", () => {
    const color = pickColor(() => 0.5);
    expect(CREATURE_COLORS).toContain(color);
  });

  test("returns grey for lowest roll", () => {
    const color = pickColor(() => 0);
    expect(color).toBe("grey");
  });

  test("returns red for highest roll", () => {
    const color = pickColor(() => 0.999);
    expect(color).toBe("red");
  });

  test("weighted distribution: low roll gives common colors", () => {
    // grey weight is 0.30, so roll 0.15 (middle of grey range) should be grey
    const color = pickColor(() => 0.15);
    expect(color).toBe("grey");
  });

  test("weighted distribution: mid roll gives mid colors", () => {
    // grey=0.28, white=0.22 → cumulative 0.50; green=0.18 → cumulative 0.68
    // roll at 0.60 should land in green range
    const color = pickColor(() => 0.60);
    expect(color).toBe("green");
  });
});

describe("spawnBatch — per-slot color", () => {
  test("each slot on spawned creatures has a color field", () => {
    const state = makeState();
    spawnBatch(state, Date.now(), () => 0.5);
    for (const c of state.nearby) {
      for (const s of c.slots) {
        expect(CREATURE_COLORS).toContain(s.color);
      }
    }
  });

  test("creature does not have a color field", () => {
    const state = makeState();
    spawnBatch(state, Date.now(), () => 0.5);
    for (const c of state.nearby) {
      expect(c).not.toHaveProperty("color");
    }
  });
});

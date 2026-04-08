import { GameEngine } from "../../src/engine/game-engine";
import { GameState, CollectionCreature, SLOT_IDS } from "../../src/types";

// Deterministic counter-based RNG
function makeRng(seed: number = 0): () => number {
  let counter = seed;
  return () => {
    counter++;
    // Simple LCG-style deterministic sequence in [0, 1)
    const x = Math.sin(counter * 9301 + 49297) * 49297;
    return x - Math.floor(x);
  };
}

// Helper to create a fresh v4 state
function freshState(): GameState {
  return {
    version: 4,
    profile: {
      level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0,
      currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-01-01",
    },
    collection: [],
    archive: [],
    energy: 30,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
  };
}

// Helper to make a creature for placing directly in collection
function makeCreature(id: string, speciesId: string, traits: Record<string, string>): CollectionCreature {
  return {
    id,
    speciesId,
    color: "white",
    name: `Test ${id}`,
    slots: SLOT_IDS.map(slotId => ({
      slotId,
      variantId: traits[slotId],
    })),
    caughtAt: Date.now(),
    generation: 0,
    archived: false,
  };
}

describe("gameplay loop integration", () => {
  test("full loop: scan -> catch -> catch another -> breed -> archive", () => {
    const state = freshState();
    const engine = new GameEngine(state);
    const rng = makeRng(42);

    // 1. Scan — should auto-spawn creatures
    const scanResult = engine.scan(rng);
    expect(scanResult.nearby.length).toBeGreaterThanOrEqual(3);
    expect(scanResult.nearby[0].creature.speciesId).toBeDefined();

    // 2. Catch the first creature (rng < 0.90 base catch rate — very likely)
    // Use a rigged rng that returns low values to guarantee catch
    const alwaysCatchRng = () => 0.01;
    const catch1 = engine.catch(0, alwaysCatchRng);
    expect(catch1.success).toBe(true);
    expect(state.collection).toHaveLength(1);
    const creature1Id = state.collection[0].id;
    const creature1Species = state.collection[0].speciesId;

    // 3. We need a second creature of the same species for breeding.
    //    Force a new scan and catch another creature of the same species.
    //    Clear batch to force new spawn.
    state.batch = null;
    state.nearby = [];
    const scan2 = engine.scan(rng);
    expect(scan2.nearby.length).toBeGreaterThanOrEqual(3);

    // Find a creature of the same species in nearby
    const sameSpeciesIdx = state.nearby.findIndex(c => c.speciesId === creature1Species);
    // If there's no match (unlikely with only 1 species), use index 0 anyway
    const catchIdx = sameSpeciesIdx >= 0 ? sameSpeciesIdx : 0;
    const catch2 = engine.catch(catchIdx, alwaysCatchRng);
    expect(catch2.success).toBe(true);
    expect(state.collection).toHaveLength(2);
    const creature2Id = state.collection[1].id;

    // 4. Breed the two creatures
    const preview = engine.breedPreview(creature1Id, creature2Id);
    expect(preview.slotInheritance).toHaveLength(4);
    expect(preview.energyCost).toBeGreaterThanOrEqual(3);

    const breedResult = engine.breedExecute(creature1Id, creature2Id, rng);
    expect(breedResult.child).toBeDefined();
    expect(breedResult.child.generation).toBe(1);
    expect(breedResult.child.speciesId).toBe(creature1Species);
    // Parents consumed, child added
    expect(state.collection).toHaveLength(1);
    expect(state.collection[0].id).toBe(breedResult.child.id);

    // 5. Archive the child
    const archiveResult = engine.archive(breedResult.child.id);
    expect(archiveResult.creature.archived).toBe(true);
    expect(state.collection).toHaveLength(0);
    expect(state.archive).toHaveLength(1);
  });

  test("collection cap enforcement: cannot catch at cap of 15", () => {
    const state = freshState();
    const engine = new GameEngine(state);
    const rng = makeRng(100);

    // Fill collection to 15
    for (let i = 0; i < 15; i++) {
      state.collection.push(
        makeCreature(`cap-${i}`, "compi", {
          eyes: "eye_c01", mouth: "mth_c01", body: "bod_c01", tail: "tal_c01",
        })
      );
    }

    // Ensure there are creatures nearby
    engine.scan(rng);
    expect(state.nearby.length).toBeGreaterThanOrEqual(3);

    // Trying to catch should throw
    expect(() => engine.catch(0, () => 0.01)).toThrow(
      "Collection is full (15 creatures)"
    );
  });

  test("archive frees slot: can catch again after archiving", () => {
    const state = freshState();
    const engine = new GameEngine(state);
    const rng = makeRng(200);

    // Fill collection to 15
    for (let i = 0; i < 15; i++) {
      state.collection.push(
        makeCreature(`arc-${i}`, "compi", {
          eyes: "eye_c01", mouth: "mth_c01", body: "bod_c01", tail: "tal_c01",
        })
      );
    }

    // Archive one creature to free a slot
    engine.archive("arc-0");
    expect(state.collection).toHaveLength(14);
    expect(state.archive).toHaveLength(1);

    // Ensure there are creatures nearby
    engine.scan(rng);

    // Now catch should work
    const result = engine.catch(0, () => 0.01);
    expect(result.success).toBe(true);
    expect(state.collection).toHaveLength(15);
  });

  test("breed produces child with inherited traits from parents", () => {
    const state = freshState();
    state.energy = 30;
    const engine = new GameEngine(state);

    // Create two parents with different traits
    const parentA = makeCreature("pA", "compi", {
      eyes: "eye_c01", mouth: "mth_c01", body: "bod_c01", tail: "tal_c01",
    });
    const parentB = makeCreature("pB", "compi", {
      eyes: "eye_c02", mouth: "mth_c02", body: "bod_c02", tail: "tal_c02",
    });
    state.collection.push(parentA, parentB);

    const rng = makeRng(300);
    const result = engine.breedExecute("pA", "pB", rng);

    // Child should exist with 4 slots
    expect(result.child.slots).toHaveLength(4);

    // Each child slot's variant must come from one of the two parents
    for (const slot of result.child.slots) {
      const parentASlot = parentA.slots.find(s => s.slotId === slot.slotId)!;
      const parentBSlot = parentB.slots.find(s => s.slotId === slot.slotId)!;
      expect([parentASlot.variantId, parentBSlot.variantId]).toContain(slot.variantId);
    }

    // Verify inheritedFrom record
    for (const slotId of SLOT_IDS) {
      expect(["A", "B"]).toContain(result.inheritedFrom[slotId]);
    }
  });

  test("cross-species breeding throws", () => {
    const state = freshState();
    const engine = new GameEngine(state);

    // Create two creatures of different species (fake second species)
    const creatureA = makeCreature("xA", "compi", {
      eyes: "eye_c01", mouth: "mth_c01", body: "bod_c01", tail: "tal_c01",
    });
    const creatureB: CollectionCreature = {
      ...makeCreature("xB", "other_species", {
        eyes: "eye_c01", mouth: "mth_c01", body: "bod_c01", tail: "tal_c01",
      }),
    };
    state.collection.push(creatureA, creatureB);

    expect(() => engine.breedExecute("xA", "xB", makeRng())).toThrow(
      "Cannot breed different species"
    );
  });
});

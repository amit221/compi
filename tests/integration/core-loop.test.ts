import { GameEngine } from "../../src/engine/game-engine";
import { GameState, CollectionCreature, SLOT_IDS } from "../../src/types";

// Deterministic counter-based RNG
function makeRng(seed: number = 0): () => number {
  let counter = seed;
  return () => {
    counter++;
    const x = Math.sin(counter * 9301 + 49297) * 49297;
    return x - Math.floor(x);
  };
}

function freshState(): GameState {
  return {
    version: 7,
    profile: {
      level: 1,
      xp: 0,
      totalCatches: 0,
      totalMerges: 0,
      totalTicks: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: "2026-01-01",
    },
    collection: [],
    energy: 20,
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
  };
}

function makeCreatureRanked(
  id: string,
  speciesId: string,
  ranks: number[]
): CollectionCreature {
  return {
    id,
    speciesId,
    name: `Test ${id}`,
    slots: SLOT_IDS.map((slotId, i) => ({
      slotId,
      variantId: `trait_${slotId}_r${ranks[i] ?? 0}`,
      color: "white" as const,
      rarity: 0,
    })),
    caughtAt: Date.now(),
    generation: 0,
    archived: false,
  };
}

function makeCompiCreature(id: string, variantSuffix: "01" | "02"): CollectionCreature {
  return {
    id,
    speciesId: "compi",
    name: `Compi ${id}`,
    slots: [
      { slotId: "eyes", variantId: `eye_c${variantSuffix}`, color: "white" as const, rarity: 0 },
      { slotId: "mouth", variantId: `mth_c${variantSuffix}`, color: "white" as const, rarity: 0 },
      { slotId: "body", variantId: `bod_c${variantSuffix}`, color: "white" as const, rarity: 0 },
      { slotId: "tail", variantId: `tal_c${variantSuffix}`, color: "white" as const, rarity: 0 },
    ],
    caughtAt: Date.now(),
    generation: 0,
    archived: false,
  };
}

describe("core loop integration", () => {
  // ---------------------------------------------------------------------------
  // Test 1: Session start grants energy bonus
  // ---------------------------------------------------------------------------
  test("session start: processTick with new sessionId grants +3 energy bonus", () => {
    const state = freshState();
    state.energy = 10;
    const engine = new GameEngine(state);
    const rng = makeRng(50);

    engine.processTick(
      { timestamp: Date.now(), sessionId: "session-abc", eventType: "SessionStart" },
      rng
    );

    expect(state.energy).toBeGreaterThanOrEqual(13);
    expect(state.currentSessionId).toBe("session-abc");

    const energyAfterFirst = state.energy;
    engine.processTick(
      { timestamp: Date.now(), sessionId: "session-abc", eventType: "PostToolUse" },
      rng
    );
    expect(state.energy - energyAfterFirst).toBeLessThanOrEqual(1);
  });

  // ---------------------------------------------------------------------------
  // Test 2: Scan & catch — XP granted, discovery tracked
  // ---------------------------------------------------------------------------
  test("scan and catch: XP granted, discovery tracked", () => {
    const state = freshState();
    const engine = new GameEngine(state);
    const rng = makeRng(42);

    const scanResult = engine.scan(rng);
    expect(scanResult.nearby.length).toBe(1);

    const xpBefore = state.profile.xp;
    const discoveredBefore = state.discoveredSpecies.length;

    const catchResult = engine.catch(0, () => 0.01);
    expect(catchResult.success).toBe(true);
    expect(state.collection).toHaveLength(1);

    expect(state.profile.xp + state.profile.level * 0).toBeGreaterThan(xpBefore);
    expect(state.profile.totalCatches).toBe(1);

    expect(state.discoveredSpecies.length).toBeGreaterThan(discoveredBefore);
    const caughtSpecies = state.collection[0].speciesId;
    expect(state.discoveredSpecies).toContain(caughtSpecies);

    state.batch = null;
    state.nearby = [];
    engine.scan(rng);

    const discoveredAfterFirstCatch = state.discoveredSpecies.length;
    const catchResult2 = engine.catch(0, () => 0.01);
    expect(catchResult2.success).toBe(true);
    expect(state.discoveredSpecies.length).toBeGreaterThanOrEqual(discoveredAfterFirstCatch);
  });

  // ---------------------------------------------------------------------------
  // Test 3: Breed — child created, parents removed
  // ---------------------------------------------------------------------------
  test("breed: child created, parents removed", () => {
    const state = freshState();
    state.energy = 30;
    const engine = new GameEngine(state);

    const parentA = makeCompiCreature("mA", "01");
    const parentB = makeCompiCreature("mB", "02");
    state.collection.push(parentA, parentB);

    const rng = makeRng(100);
    const result = engine.breedExecute("mA", "mB", rng);

    expect(result.child).toBeDefined();
    expect(result.child.generation).toBe(1);
    expect(result.child.speciesId).toBe("compi");

    // Parents survive, child added — collection grows from 2 to 3
    expect(state.collection).toHaveLength(3);
    expect(state.collection.find(c => c.id === result.child.id)).toBeDefined();
    expect(state.profile.totalMerges).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Test 4: status() returns correct fields
  // ---------------------------------------------------------------------------
  test("status includes discoveredCount and speciesProgress", () => {
    const state = freshState();
    state.discoveredSpecies = ["compi", "flikk"];
    state.speciesProgress = { compi: [true, false] };
    const engine = new GameEngine(state);

    const status = engine.status();
    expect(status.discoveredCount).toBe(2);
    expect(status.speciesProgress).toEqual({ compi: [true, false] });
  });
});

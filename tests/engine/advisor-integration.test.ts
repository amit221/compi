/**
 * Integration tests for the advisor system.
 * Each test covers a realistic game scenario and verifies the advisor
 * produces the expected mode and suggestions.
 */
import {
  getAdvisorMode,
  getSuggestedActions,
  buildAdvisorContext,
} from "../../src/engine/advisor";
import {
  GameState,
  CollectionCreature,
  SlotId,
  SLOT_IDS,
  CatchResult,
  NearbyCreature,
} from "../../src/types";

jest.mock("../../src/config/loader", () => ({
  loadConfig: () => ({
    leveling: {
      thresholds: [30, 50, 80, 120, 170, 240, 340, 480, 680, 960, 1350, 1900, 2700],
      traitRankCaps: [1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8],
      xpPerCatch: 10,
      xpPerUpgrade: 8,
      xpPerMerge: 25,
      xpPerQuest: 15,
      xpDiscoveryBonus: 20,
    },
    upgrade: {
      costs: [3, 5, 9, 15, 24, 38, 55],
      maxRank: 7,
      sessionCap: 2,
    },
    quest: {
      maxTeamSize: 3,
      lockDurationSessions: 2,
      rewardMultiplier: 0.6,
      rewardFloor: 10,
      xpReward: 15,
    },
    mergeGold: {
      baseCost: 10,
      rankMultiplier: 5,
      downgradeChance: 0.3,
    },
    energy: {
      maxEnergy: 30,
      baseMergeCost: 1,
      maxMergeCost: 3,
      rareThreashold: 0.05,
      gainIntervalMs: 300000,
      startingEnergy: 30,
      sessionBonus: 3,
    },
    discovery: {
      speciesUnlockLevels: {},
    },
    batch: {
      spawnIntervalMs: 300000,
      batchLingerMs: 600000,
      sharedAttempts: 3,
      timeOfDay: {},
    },
    catching: {
      baseCatchRate: 0.95,
      minCatchRate: 0.4,
      maxCatchRate: 0.99,
      failPenaltyPerMiss: 0.05,
      maxTraitSpawnRate: 0.12,
      difficultyScale: 0.5,
      xpBase: 10,
      xpRarityMultiplier: 2,
    },
    colors: { grey: 30, white: 25, cyan: 15, magenta: 10, yellow: 5, red: 1 },
    breed: {
      inheritanceBase: 0.5,
      inheritanceRarityScale: 0.8,
      inheritanceMin: 0.45,
      inheritanceMax: 0.58,
      referenceSpawnRate: 0.12,
    },
    progression: { xpPerLevel: 100, sessionGapMs: 7200000, tickPruneCount: 1000 },
    rewards: { milestones: [] },
    messages: {},
    economy: { startingGold: 10 },
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCreature(
  id: string,
  speciesId: string,
  ranks: number[],
  overrides: Partial<CollectionCreature> = {}
): CollectionCreature {
  return {
    id,
    speciesId,
    name: `${speciesId.charAt(0).toUpperCase() + speciesId.slice(1)} ${id}`,
    slots: SLOT_IDS.map((slotId, i) => ({
      slotId,
      variantId: `trait_${slotId}_r${ranks[i] ?? 0}`,
      color: "white" as const,
    })),
    caughtAt: Date.now(),
    generation: 0,
    archived: false,
    ...overrides,
  };
}

function makeNearby(id: string, speciesId: string): NearbyCreature {
  return {
    id,
    speciesId,
    name: `Wild ${speciesId}`,
    slots: SLOT_IDS.map((slotId) => ({
      slotId,
      variantId: `trait_${slotId}_r1`,
      color: "white" as const,
    })),
    spawnedAt: Date.now(),
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 5,
    profile: {
      level: 3,
      xp: 40,
      totalCatches: 5,
      totalMerges: 1,
      totalUpgrades: 2,
      totalQuests: 0,
      totalTicks: 100,
      currentStreak: 2,
      longestStreak: 5,
      lastActiveDate: "2026-04-13",
    },
    collection: [],
    archive: [],
    energy: 15,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    lastSpawnAt: 0,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
    gold: 50,
    discoveredSpecies: ["compi", "flikk"],
    activeQuest: null,
    sessionUpgradeCount: 0,
    currentSessionId: "session-1",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Scenario 1: Mid-game merge opportunity
// State has 2 same-species creatures; advisor mode should trigger on catch
// ---------------------------------------------------------------------------

describe("Scenario 1: Mid-game merge opportunity", () => {
  const c1 = makeCreature("c1", "compi", [3, 3, 3, 3]);
  const c2 = makeCreature("c2", "compi", [2, 2, 2, 2]);
  // After catching a third compi the collection now has c1 + c2 (sameSpeciesCount >= 2)
  const state = makeState({ collection: [c1, c2], gold: 100 });

  const catchResult: CatchResult = {
    success: true,
    creature: makeNearby("n1", "compi"),
    energySpent: 1,
    fled: false,
    xpEarned: 10,
    attemptsRemaining: 1,
    failPenalty: 0,
  };

  test("getAdvisorMode returns advisor when merge is available after catch", () => {
    const mode = getAdvisorMode("catch", catchResult, state);
    expect(mode).toBe("advisor");
  });

  test("merge action appears in suggested actions", () => {
    const actions = getSuggestedActions("catch", catchResult, state);
    const mergeAction = actions.find((a) => a.type === "merge");
    expect(mergeAction).toBeDefined();
  });

  test("merge action has high priority (≤ 2)", () => {
    const actions = getSuggestedActions("catch", catchResult, state);
    const mergeAction = actions.find((a) => a.type === "merge");
    expect(mergeAction!.priority).toBeLessThanOrEqual(2);
  });

  test("buildAdvisorContext reflects the merge opportunity", () => {
    const ctx = buildAdvisorContext("catch", catchResult, state);
    expect(ctx.mode).toBe("advisor");
    const mergeAction = ctx.suggestedActions.find((a) => a.type === "merge");
    expect(mergeAction).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: New species discovery
// Catching a creature whose speciesId is not yet in discoveredSpecies
// ---------------------------------------------------------------------------

describe("Scenario 2: New species discovery", () => {
  // Only "compi" and "flikk" have been seen before; "glich" is brand-new
  const state = makeState({ discoveredSpecies: ["compi", "flikk"] });

  const catchResult: CatchResult = {
    success: true,
    creature: makeNearby("n1", "glich"),
    energySpent: 1,
    fled: false,
    xpEarned: 30, // includes discovery bonus
    attemptsRemaining: 2,
    failPenalty: 0,
  };

  test("getAdvisorMode returns advisor on new species discovery", () => {
    const mode = getAdvisorMode("catch", catchResult, state);
    expect(mode).toBe("advisor");
  });

  test("buildAdvisorContext mode is advisor for new species", () => {
    const ctx = buildAdvisorContext("catch", catchResult, state);
    expect(ctx.mode).toBe("advisor");
  });

  test("suggested actions include collection view (to see new discovery)", () => {
    const actions = getSuggestedActions("catch", catchResult, state);
    const collectionAction = actions.find((a) => a.type === "collection");
    expect(collectionAction).toBeDefined();
  });

  test("routine catch of known species does NOT trigger advisor", () => {
    const knownCatchResult: CatchResult = {
      success: true,
      creature: makeNearby("n2", "compi"),
      energySpent: 1,
      fled: false,
      xpEarned: 10,
      attemptsRemaining: 2,
      failPenalty: 0,
    };
    // No existing compis in collection, so no merge opportunity either
    const mode = getAdvisorMode("catch", knownCatchResult, state);
    expect(mode).toBe("autopilot");
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Low energy quest suggestion
// When energy ≤ 2, the advisor should trigger and suggest questing.
// Use max-rank creatures (rank 7) so no upgrades are viable, ensuring
// quest floats to the top of suggestions.
// ---------------------------------------------------------------------------

describe("Scenario 3: Low energy quest suggestion", () => {
  // Rank 7 = maxRank → no upgrades available; quest will be top suggestion
  const creature = makeCreature("c1", "flikk", [7, 7, 7, 7]);
  const state = makeState({ energy: 2, collection: [creature] });

  test("getAdvisorMode returns advisor when energy is 2", () => {
    const mode = getAdvisorMode("scan", {}, state);
    expect(mode).toBe("advisor");
  });

  test("getAdvisorMode returns advisor when energy is 1", () => {
    const lowState = makeState({ energy: 1, collection: [makeCreature("c1", "flikk", [7, 7, 7, 7])] });
    const mode = getAdvisorMode("catch", {}, lowState);
    expect(mode).toBe("advisor");
  });

  test("quest action appears in suggestions when energy is low", () => {
    const actions = getSuggestedActions("scan", {}, state);
    const questAction = actions.find((a) => a.type === "quest");
    expect(questAction).toBeDefined();
  });

  test("quest action has high priority when energy is low (≤ 2)", () => {
    const actions = getSuggestedActions("scan", {}, state);
    const questAction = actions.find((a) => a.type === "quest");
    // Low energy boosts quest priority to score=12 (vs 35 normally), so it should rank highly
    expect(questAction!.priority).toBeLessThanOrEqual(3);
  });

  test("buildAdvisorContext surfaces advisor mode with quest suggestion", () => {
    const ctx = buildAdvisorContext("scan", {}, state);
    expect(ctx.mode).toBe("advisor");
    const questAction = ctx.suggestedActions.find((a) => a.type === "quest");
    expect(questAction).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: Full collection
// 12 non-archived creatures (below MAX 15) is not full;
// but 15/15 triggers advisor + release suggestion
// ---------------------------------------------------------------------------

describe("Scenario 4: Full collection (15/15)", () => {
  const creatures = Array.from({ length: 15 }, (_, i) =>
    makeCreature(`c${i}`, i % 2 === 0 ? "compi" : "flikk", [1, 1, 1, 1])
  );
  const state = makeState({ collection: creatures, gold: 100 });

  test("getAdvisorMode returns advisor when collection is full", () => {
    const mode = getAdvisorMode("catch", {}, state);
    expect(mode).toBe("advisor");
  });

  test("release action appears in suggested actions", () => {
    const actions = getSuggestedActions("catch", {}, state);
    const releaseAction = actions.find((a) => a.type === "release");
    expect(releaseAction).toBeDefined();
  });

  test("release action has highest priority (1) when collection is full", () => {
    const actions = getSuggestedActions("catch", {}, state);
    const releaseAction = actions.find((a) => a.type === "release");
    expect(releaseAction!.priority).toBe(1);
  });

  test("buildAdvisorContext mode is advisor for full collection", () => {
    const ctx = buildAdvisorContext("catch", {}, state);
    expect(ctx.mode).toBe("advisor");
    expect(ctx.progress.collectionSize).toBe(15);
    expect(ctx.progress.collectionMax).toBe(15);
  });

  test("collection not full (12/15) does NOT trigger advisor from fullness alone", () => {
    const partialCreatures = Array.from({ length: 12 }, (_, i) =>
      makeCreature(`c${i}`, "compi", [1, 1, 1, 1])
    );
    const partialState = makeState({ collection: partialCreatures, energy: 10 });
    // energy=10 so low-energy rule won't fire either
    const mode = getAdvisorMode("scan", {}, partialState);
    expect(mode).toBe("autopilot");
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: Max 5 actions cap
// State with many viable options — result must never exceed 5 items
// ---------------------------------------------------------------------------

describe("Scenario 5: Max 5 actions cap", () => {
  // 6 creatures: 3 compi (merge pair available) + 3 flikk (merge pair available)
  // All with upgradeable traits and enough gold → many upgrade options
  const creatures = Array.from({ length: 6 }, (_, i) =>
    makeCreature(`c${i}`, i < 3 ? "compi" : "flikk", [2, 2, 2, 2])
  );

  const state = makeState({
    collection: creatures,
    nearby: [makeNearby("n1", "compi"), makeNearby("n2", "flikk")],
    batch: { attemptsRemaining: 3, failPenalty: 0, spawnedAt: Date.now() },
    gold: 500,
    energy: 20,
    sessionUpgradeCount: 0,
  });

  test("getSuggestedActions returns at most 5 actions even with many options", () => {
    const actions = getSuggestedActions("scan", {}, state);
    expect(actions.length).toBeLessThanOrEqual(5);
  });

  test("actions are numbered 1..N with no gaps", () => {
    const actions = getSuggestedActions("scan", {}, state);
    actions.forEach((action, idx) => {
      expect(action.priority).toBe(idx + 1);
    });
  });

  test("collection view is always the last action", () => {
    const actions = getSuggestedActions("scan", {}, state);
    const last = actions[actions.length - 1];
    expect(last.type).toBe("collection");
  });

  test("buildAdvisorContext also caps at 5 actions", () => {
    const ctx = buildAdvisorContext("scan", {}, state);
    expect(ctx.suggestedActions.length).toBeLessThanOrEqual(5);
  });

  test("cap still applies after a merge action (post-merge is always advisor)", () => {
    // Two compis in collection triggers merge suggestion
    const mergeState = makeState({
      collection: creatures,
      gold: 500,
      energy: 20,
      sessionUpgradeCount: 0,
    });
    const actions = getSuggestedActions("merge", {}, mergeState);
    expect(actions.length).toBeLessThanOrEqual(5);
  });
});

import {
  getProgressInfo,
  getViableActions,
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
      xpPerMerge: 25,
      xpDiscoveryBonus: 20,
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
      minCatchRate: 0.40,
      maxCatchRate: 0.99,
      failPenaltyPerMiss: 0.05,
      maxTraitSpawnRate: 0.12,
      difficultyScale: 0.50,
      xpBase: 10,
      xpRarityMultiplier: 2,
    },
    colors: { grey: 30, white: 25, cyan: 15, magenta: 10, yellow: 5, red: 1 },
    breed: {
      inheritanceBase: 0.50,
      inheritanceRarityScale: 0.80,
      inheritanceMin: 0.45,
      inheritanceMax: 0.58,
      referenceSpawnRate: 0.12,
      downgradeChance: 0.30,
    },
    progression: { xpPerLevel: 100, sessionGapMs: 7200000, tickPruneCount: 1000 },
    rewards: { milestones: [] },
    messages: {},
  }),
}));

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
    version: 6,
    profile: {
      level: 3,
      xp: 40,
      totalCatches: 5,
      totalMerges: 1,
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
    discoveredSpecies: ["compi", "flikk"],
    currentSessionId: "session-1",
    speciesProgress: {},
    personalSpecies: [],
    sessionBreedCount: 0,
    breedCooldowns: {},
    ...overrides,
  };
}

describe("getProgressInfo", () => {
  test("returns basic progress data", () => {
    const state = makeState();
    const progress = getProgressInfo(state);
    expect(progress.level).toBe(3);
    expect(progress.xp).toBe(40);
    expect(progress.xpToNextLevel).toBe(80);
    expect(progress.xpPercent).toBe(50);
    expect(progress.discoveredCount).toBe(2);
    expect(progress.collectionSize).toBe(0);
    expect(progress.collectionMax).toBe(15);
  });

  test("identifies best trait", () => {
    const c1 = makeCreature("c1", "compi", [3, 2, 6, 1]);
    const state = makeState({ collection: [c1] });
    const progress = getProgressInfo(state);
    expect(progress.bestTrait).not.toBeNull();
    expect(progress.bestTrait!.slot).toBe("body");
    expect(progress.bestTrait!.rank).toBe(6);
  });

  test("returns null bestTrait for empty collection", () => {
    const state = makeState();
    const progress = getProgressInfo(state);
    expect(progress.bestTrait).toBeNull();
  });
});

describe("getViableActions", () => {
  test("includes catch actions when nearby creatures exist", () => {
    const state = makeState({
      nearby: [makeNearby("n1", "compi"), makeNearby("n2", "flikk")],
      batch: { attemptsRemaining: 2, failPenalty: 0, spawnedAt: Date.now() },
    });
    const actions = getViableActions(state);
    const catchActions = actions.filter((a) => a.type === "catch");
    expect(catchActions).toHaveLength(2);
    expect(catchActions[0].cost.energy).toBe(1);
  });

  test("no catch actions when no nearby creatures", () => {
    const state = makeState({ nearby: [] });
    const actions = getViableActions(state);
    const catchActions = actions.filter((a) => a.type === "catch");
    expect(catchActions).toHaveLength(0);
  });

  test("includes breed action when same-species pair exists", () => {
    const c1 = makeCreature("c1", "compi", [3, 3, 3, 3]);
    const c2 = makeCreature("c2", "compi", [2, 2, 2, 2]);
    const state = makeState({ collection: [c1, c2] });
    const actions = getViableActions(state);
    const breedActions = actions.filter((a) => a.type === "breed");
    expect(breedActions.length).toBeGreaterThanOrEqual(1);
  });

  test("no breed action for single-species creature", () => {
    const c1 = makeCreature("c1", "compi", [3, 3, 3, 3]);
    const c2 = makeCreature("c2", "flikk", [2, 2, 2, 2]);
    const state = makeState({ collection: [c1, c2] });
    const actions = getViableActions(state);
    const breedActions = actions.filter((a) => a.type === "breed");
    expect(breedActions).toHaveLength(0);
  });

  test("includes scan action when no nearby creatures", () => {
    const state = makeState({ nearby: [] });
    const actions = getViableActions(state);
    const scanActions = actions.filter((a) => a.type === "scan");
    expect(scanActions).toHaveLength(1);
  });

  test("includes release action when collection is full", () => {
    const creatures = Array.from({ length: 15 }, (_, i) =>
      makeCreature(`c${i}`, "compi", [1, 1, 1, 1])
    );
    const state = makeState({ collection: creatures });
    const actions = getViableActions(state);
    const releaseActions = actions.filter((a) => a.type === "release");
    expect(releaseActions.length).toBeGreaterThanOrEqual(1);
  });

  test("always includes collection action", () => {
    const state = makeState();
    const actions = getViableActions(state);
    const collectionActions = actions.filter((a) => a.type === "collection");
    expect(collectionActions).toHaveLength(1);
  });
});

describe("getAdvisorMode", () => {
  test("autopilot for routine catch with no breed available", () => {
    const c1 = makeCreature("c1", "flikk", [1, 1, 1, 1]);
    const state = makeState({ collection: [c1] });
    const catchResult: CatchResult = {
      success: true,
      creature: makeNearby("n1", "compi"),
      energySpent: 1,
      fled: false,
      xpEarned: 10,
      attemptsRemaining: 2,
      failPenalty: 0,
    };
    const mode = getAdvisorMode("catch", catchResult, state);
    expect(mode).toBe("autopilot");
  });

  test("advisor for catch when breed available", () => {
    // Two compis in collection -- breed is possible
    const c1 = makeCreature("c1", "compi", [3, 3, 3, 3]);
    const c2 = makeCreature("c2", "compi", [2, 2, 2, 2]);
    const state = makeState({ collection: [c1, c2] });
    const catchResult: CatchResult = {
      success: true,
      creature: makeNearby("n1", "compi"),
      energySpent: 1,
      fled: false,
      xpEarned: 10,
      attemptsRemaining: 1,
      failPenalty: 0,
    };
    const mode = getAdvisorMode("catch", catchResult, state);
    expect(mode).toBe("advisor");
  });

  test("advisor for new species discovery", () => {
    // Catch result for a species not in discoveredSpecies
    const state = makeState({ discoveredSpecies: ["compi"] });
    const catchResult: CatchResult = {
      success: true,
      creature: makeNearby("n1", "glich"),
      energySpent: 1,
      fled: false,
      xpEarned: 10,
      attemptsRemaining: 2,
      failPenalty: 0,
    };
    const mode = getAdvisorMode("catch", catchResult, state);
    expect(mode).toBe("advisor");
  });

  test("advisor when only one energy left", () => {
    const state = makeState({ energy: 1, nearby: [makeNearby("n1", "compi")] });
    const mode = getAdvisorMode("scan", {}, state);
    expect(mode).toBe("advisor");
  });

  test("advisor after breed", () => {
    const state = makeState();
    const mode = getAdvisorMode("breed", {}, state);
    expect(mode).toBe("advisor");
  });
});

describe("getSuggestedActions", () => {
  test("returns max 5 actions", () => {
    const creatures = Array.from({ length: 6 }, (_, i) =>
      makeCreature(`c${i}`, i < 3 ? "compi" : "flikk", [2, 2, 2, 2])
    );
    const state = makeState({
      collection: creatures,
      nearby: [makeNearby("n1", "compi")],
      batch: { attemptsRemaining: 2, failPenalty: 0, spawnedAt: Date.now() },
    });
    const suggested = getSuggestedActions("scan", {}, state);
    expect(suggested.length).toBeLessThanOrEqual(5);
  });

  test("highest priority action has priority 1", () => {
    const c1 = makeCreature("c1", "compi", [3, 3, 3, 3]);
    const state = makeState({
      collection: [c1],
      nearby: [makeNearby("n1", "compi")],
      batch: { attemptsRemaining: 2, failPenalty: 0, spawnedAt: Date.now() },
    });
    const suggested = getSuggestedActions("scan", {}, state);
    expect(suggested[0].priority).toBe(1);
  });

  test("post-catch with breed available prioritizes breed", () => {
    const c1 = makeCreature("c1", "compi", [4, 4, 4, 4]);
    const c2 = makeCreature("c2", "compi", [3, 3, 3, 3]);
    const state = makeState({ collection: [c1, c2] });
    const catchResult: CatchResult = {
      success: true,
      creature: makeNearby("n1", "compi"),
      energySpent: 1,
      fled: false,
      xpEarned: 10,
      attemptsRemaining: 1,
      failPenalty: 0,
    };
    const suggested = getSuggestedActions("catch", catchResult, state);
    // Breed should be high priority since same species exists
    const breedAction = suggested.find((a) => a.type === "breed");
    expect(breedAction).toBeDefined();
    expect(breedAction!.priority).toBeLessThanOrEqual(2);
  });

  test("collection view is always last option", () => {
    const state = makeState({
      nearby: [makeNearby("n1", "compi")],
      batch: { attemptsRemaining: 2, failPenalty: 0, spawnedAt: Date.now() },
    });
    const suggested = getSuggestedActions("scan", {}, state);
    const lastAction = suggested[suggested.length - 1];
    expect(lastAction.type).toBe("collection");
  });
});

describe("buildAdvisorContext", () => {
  test("returns complete context with mode, actions, and progress", () => {
    const c1 = makeCreature("c1", "compi", [3, 3, 3, 3]);
    const state = makeState({
      collection: [c1],
      nearby: [makeNearby("n1", "flikk")],
      batch: { attemptsRemaining: 2, failPenalty: 0, spawnedAt: Date.now() },
    });
    const context = buildAdvisorContext("scan", {}, state);
    expect(context.mode).toBeDefined();
    expect(context.suggestedActions.length).toBeGreaterThan(0);
    expect(context.suggestedActions.length).toBeLessThanOrEqual(5);
    expect(context.progress.level).toBe(3);
  });
});

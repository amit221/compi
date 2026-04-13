import { startQuest, checkQuest, calculateQuestReward } from "../../src/engine/quest";
import { GameState, CollectionCreature, SlotId, SLOT_IDS } from "../../src/types";

jest.mock("../../src/config/loader", () => ({
  loadConfig: () => ({
    quest: {
      maxTeamSize: 3,
      lockDurationSessions: 2,
      rewardMultiplier: 0.6,
      rewardFloor: 10,
      xpReward: 15,
    },
    leveling: {
      thresholds: [30, 50, 80, 120, 170, 240, 340, 480, 680, 960, 1350, 1900, 2700],
      traitRankCaps: [1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8],
      xpPerCatch: 10,
      xpPerUpgrade: 8,
      xpPerMerge: 25,
      xpPerQuest: 15,
      xpDiscoveryBonus: 20,
    },
  }),
}));

function makeCreature(id: string, traitRanks: number[]): CollectionCreature {
  return {
    id,
    speciesId: "compi",
    name: `Creature ${id}`,
    slots: SLOT_IDS.map((slotId, i) => ({
      slotId,
      variantId: `trait_${slotId}_r${traitRanks[i] ?? 0}`,
      color: "white" as const,
    })),
    caughtAt: Date.now(),
    generation: 0,
    archived: false,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 5,
    profile: {
      level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalUpgrades: 0,
      totalQuests: 0, totalTicks: 0, currentStreak: 0, longestStreak: 0,
      lastActiveDate: "",
    },
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
    gold: 10,
    discoveredSpecies: [],
    activeQuest: null,
    sessionUpgradeCount: 0,
    currentSessionId: "session-1",
    ...overrides,
  };
}

describe("calculateQuestReward", () => {
  test("low power team gets floor reward (10g)", () => {
    expect(calculateQuestReward(5)).toBe(10);
  });

  test("medium power team gets proportional reward", () => {
    // floor(20 * 0.6) = 12
    expect(calculateQuestReward(20)).toBe(12);
  });

  test("high power team gets proportional reward", () => {
    // floor(60 * 0.6) = 36
    expect(calculateQuestReward(60)).toBe(36);
  });
});

describe("startQuest", () => {
  test("starts a quest locking creatures", () => {
    const c1 = makeCreature("c1", [3, 3, 3, 3]);
    const c2 = makeCreature("c2", [2, 2, 2, 2]);
    const state = makeState({ collection: [c1, c2] });
    const result = startQuest(state, ["c1", "c2"]);
    expect(result.quest.creatureIds).toEqual(["c1", "c2"]);
    expect(result.quest.sessionsRemaining).toBe(2);
    // Team power: sum of all ranks = (3*4) + (2*4) = 20
    expect(result.quest.teamPower).toBe(20);
    expect(state.activeQuest).not.toBeNull();
    expect(result.creaturesLocked).toEqual(["c1", "c2"]);
  });

  test("throws if already on a quest", () => {
    const state = makeState({
      activeQuest: {
        id: "q1",
        creatureIds: ["x"],
        startedAtSession: 0,
        sessionsRemaining: 1,
        teamPower: 5,
      },
    });
    expect(() => startQuest(state, ["c1"])).toThrow(/already/i);
  });

  test("throws if creature not found", () => {
    const state = makeState();
    expect(() => startQuest(state, ["nonexistent"])).toThrow(/not found/i);
  });

  test("throws if too many creatures", () => {
    const creatures = [
      makeCreature("c1", [1, 1, 1, 1]),
      makeCreature("c2", [1, 1, 1, 1]),
      makeCreature("c3", [1, 1, 1, 1]),
      makeCreature("c4", [1, 1, 1, 1]),
    ];
    const state = makeState({ collection: creatures });
    expect(() => startQuest(state, ["c1", "c2", "c3", "c4"])).toThrow(/team size/i);
  });

  test("throws if creature is archived", () => {
    const c1 = makeCreature("c1", [1, 1, 1, 1]);
    c1.archived = true;
    const state = makeState({ collection: [c1] });
    expect(() => startQuest(state, ["c1"])).toThrow(/archived/i);
  });

  test("throws if no creatures specified", () => {
    const state = makeState();
    expect(() => startQuest(state, [])).toThrow(/at least/i);
  });
});

describe("checkQuest", () => {
  test("returns null if no active quest", () => {
    const state = makeState();
    const result = checkQuest(state);
    expect(result).toBeNull();
  });

  test("decrements sessions remaining without completing", () => {
    const c1 = makeCreature("c1", [3, 3, 3, 3]);
    const state = makeState({
      collection: [c1],
      activeQuest: {
        id: "q1",
        creatureIds: ["c1"],
        startedAtSession: 0,
        sessionsRemaining: 2,
        teamPower: 12,
      },
    });
    const result = checkQuest(state);
    expect(result).toBeNull();
    expect(state.activeQuest!.sessionsRemaining).toBe(1);
  });

  test("completes quest when sessions remaining reaches 0", () => {
    const c1 = makeCreature("c1", [3, 3, 3, 3]);
    const state = makeState({
      collection: [c1],
      activeQuest: {
        id: "q1",
        creatureIds: ["c1"],
        startedAtSession: 0,
        sessionsRemaining: 1,
        teamPower: 12,
      },
    });
    const result = checkQuest(state);
    expect(result).not.toBeNull();
    expect(result!.goldEarned).toBeGreaterThanOrEqual(10);
    expect(result!.xpEarned).toBe(15);
    expect(result!.creaturesReturned).toEqual(["c1"]);
    expect(state.activeQuest).toBeNull();
    expect(state.profile.totalQuests).toBe(1);
    expect(state.gold).toBeGreaterThan(10); // started with 10 + reward
  });
});

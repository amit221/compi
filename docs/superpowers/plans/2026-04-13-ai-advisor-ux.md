# AI Advisor & UX Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the hybrid AI advisor layer (Option C from spec): pure-logic advisor engine that computes viable actions, progress info, suggested actions, and mode selection -- then Claude provides the narrator voice via updated SKILL.md instructions. Every game interaction renders creature graphics, a status bar, narrator commentary, and a numbered action menu.

**Depends on:** Plan 1 (core-mechanics.md) must be complete. This plan references types and modules created there: `UpgradeResult`, `QuestStartResult`, `QuestCompleteResult`, `LevelUpResult`, `DiscoveryResult`, `ActiveQuest`, `gold`, `discoveredSpecies`, `activeQuest`, `sessionUpgradeCount`, `currentSessionId`, `performUpgrade`, `getUpgradeCost`, `startQuest`, `checkQuest`, `isOnQuest`, `calculateQuestReward`, `grantXp`, `getXpForNextLevel`, `getTraitRankCap`, `recordDiscovery`, `isSpeciesDiscovered`, `getDiscoveryCount`, `canAfford`, `processSessionEnergyBonus`.

**Architecture:** The advisor engine (`src/engine/advisor.ts`) is a pure-function module following the existing pattern -- takes `GameState` + context, returns structured data, no I/O. The renderer gets new methods for the enhanced status bar and action menus. SKILL.md files get narrator instructions so Claude wraps engine output with personality. MCP tools return advisor context as structured JSON alongside rendered ANSI.

**Tech Stack:** TypeScript, Jest (ts-jest), MCP SDK (`@modelcontextprotocol/sdk`), Zod schemas.

**Spec:** `docs/superpowers/specs/2026-04-13-ai-advisor-ux-design.md`

---

## File Structure

**Create:**
- `src/engine/advisor.ts` -- viable actions, progress info, suggested actions, mode selection
- `tests/engine/advisor.test.ts` -- full TDD coverage for advisor logic
- `tests/engine/advisor-integration.test.ts` -- integration test with real game state scenarios

**Modify:**
- `src/types.ts` -- add `SuggestedAction`, `ProgressInfo`, `AdvisorMode`, `AdvisorContext`, `ActionMenuEntry`
- `src/renderers/simple-text.ts` -- add `renderStatusBar`, `renderActionMenu`, `renderProgressPanel`, enhanced `renderScan`, enhanced `renderCatch`
- `src/engine/game-engine.ts` -- add `getAdvisorContext` method
- `src/mcp-tools.ts` -- return advisor context alongside tool results
- `src/cli.ts` -- display advisor output in CLI mode
- `src/index.ts` -- export advisor module
- `skills/scan/SKILL.md` -- add narrator voice instructions
- `skills/catch/SKILL.md` -- add narrator voice + suggested actions
- `skills/collection/SKILL.md` -- add narrator commentary
- `skills/breed/SKILL.md` -- add narrator voice for merge decisions
- `skills/status/SKILL.md` -- add progress panel instructions
- `skills/upgrade/SKILL.md` (created by Plan 1) -- add narrator voice
- `skills/quest/SKILL.md` (created by Plan 1) -- add narrator voice
- `skills/list/SKILL.md` -- add `/upgrade` and `/quest` commands

---

## Task 1: Advisor Types

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add advisor types to `src/types.ts`**

Add after the `DiscoveryResult` interface (added by Plan 1):

```ts
// --- Advisor ---

export type AdvisorMode = "autopilot" | "advisor";

export interface SuggestedAction {
  type: "catch" | "upgrade" | "merge" | "quest" | "scan" | "release" | "collection";
  label: string;
  cost: { gold?: number; energy?: number };
  priority: number;
  reasoning: string;
  target?: {
    creatureIndex?: number;
    nearbyIndex?: number;
    slotId?: SlotId;
    partnerIndex?: number;
  };
}

export interface ProgressInfo {
  level: number;
  xp: number;
  xpToNextLevel: number;
  xpPercent: number;
  nextSpeciesUnlock: { species: string; level: number } | null;
  bestTrait: { creatureName: string; slot: SlotId; rank: number; tierName: string } | null;
  nearestTierThreshold: {
    creatureName: string;
    slot: SlotId;
    currentRank: number;
    targetRank: number;
    method: "upgrade" | "merge";
  } | null;
  teamPower: number;
  nextPowerMilestone: number;
  collectionSize: number;
  collectionMax: number;
  gold: number;
  discoveredCount: number;
  totalSpecies: number;
}

export interface AdvisorContext {
  mode: AdvisorMode;
  suggestedActions: SuggestedAction[];
  progress: ProgressInfo;
}

export interface ActionMenuEntry {
  number: number;
  label: string;
  cost?: string;
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): add SuggestedAction, ProgressInfo, AdvisorContext, and ActionMenuEntry types"
```

---

## Task 2: Progress Info Calculator

**Files:**
- Create: `src/engine/advisor.ts`
- Create: `tests/engine/advisor.test.ts`

- [ ] **Step 1: Write failing test for `getProgressInfo`**

Create `tests/engine/advisor.test.ts`:

```ts
import {
  getProgressInfo,
  getViableActions,
  getAdvisorMode,
  getSuggestedActions,
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
      downgradeChance: 0.30,
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
    },
    progression: { xpPerLevel: 100, sessionGapMs: 7200000, tickPruneCount: 1000 },
    rewards: { milestones: [] },
    messages: {},
    economy: { startingGold: 10 },
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

describe("getProgressInfo", () => {
  test("returns basic progress data", () => {
    const state = makeState();
    const progress = getProgressInfo(state);
    expect(progress.level).toBe(3);
    expect(progress.xp).toBe(40);
    expect(progress.xpToNextLevel).toBe(80);
    expect(progress.xpPercent).toBe(50);
    expect(progress.gold).toBe(50);
    expect(progress.discoveredCount).toBe(2);
    expect(progress.collectionSize).toBe(0);
    expect(progress.collectionMax).toBe(15);
  });

  test("calculates team power from trait ranks", () => {
    const c1 = makeCreature("c1", "compi", [3, 2, 4, 1]);
    const c2 = makeCreature("c2", "flikk", [2, 2, 2, 2]);
    const state = makeState({ collection: [c1, c2] });
    const progress = getProgressInfo(state);
    // c1: 3+2+4+1=10, c2: 2+2+2+2=8, total=18
    expect(progress.teamPower).toBe(18);
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

  test("calculates nearest tier threshold", () => {
    // Trait at rank 3 -- tier boundaries are at rank 4 (uncommon->uncommon high)
    const c1 = makeCreature("c1", "compi", [3, 1, 1, 1]);
    const state = makeState({ collection: [c1], gold: 50 });
    const progress = getProgressInfo(state);
    expect(progress.nearestTierThreshold).not.toBeNull();
    expect(progress.nearestTierThreshold!.currentRank).toBe(3);
    // Next tier boundary is at rank 4
    expect(progress.nearestTierThreshold!.targetRank).toBe(4);
    expect(progress.nearestTierThreshold!.method).toBe("upgrade");
  });

  test("calculates next power milestone", () => {
    const c1 = makeCreature("c1", "compi", [3, 3, 3, 3]);
    const state = makeState({ collection: [c1] });
    const progress = getProgressInfo(state);
    // Team power = 12, next milestone should be 25
    expect(progress.teamPower).toBe(12);
    expect(progress.nextPowerMilestone).toBe(25);
  });
});
```

- [ ] **Step 2: Verify test fails**

Run: `npx jest tests/engine/advisor.test.ts`
Expected: fails (module not found).

- [ ] **Step 3: Implement `getProgressInfo` in `src/engine/advisor.ts`**

Create `src/engine/advisor.ts`:

```ts
import {
  GameState,
  ProgressInfo,
  SuggestedAction,
  AdvisorMode,
  AdvisorContext,
  SlotId,
  SLOT_IDS,
  CollectionCreature,
  CatchResult,
  BreedResult,
  UpgradeResult,
  QuestCompleteResult,
} from "../types";
import { loadConfig } from "../config/loader";
import { getXpForNextLevel } from "./progression";
import { MAX_COLLECTION_SIZE } from "../types";

/**
 * Rarity tier boundaries by rank. Matches the spec:
 *   0-1: common (grey/white)
 *   2-3: uncommon (green/cyan)
 *   4-5: rare (blue/magenta)
 *   6-7: epic/legendary (yellow/red)
 */
const TIER_BOUNDARIES = [0, 2, 4, 6];
const TIER_NAMES = ["common", "uncommon", "rare", "epic"];

/** Power milestones the advisor tracks. */
const POWER_MILESTONES = [25, 50, 100, 150, 200, 300, 500];

/**
 * Extract trait rank from a variantId with the `_rN` suffix convention.
 * Returns 0 if no rank suffix is found (species-based trait names).
 */
function extractRank(variantId: string): number {
  const m = variantId.match(/_r(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * Get the tier name for a given rank.
 */
function getTierName(rank: number): string {
  for (let i = TIER_BOUNDARIES.length - 1; i >= 0; i--) {
    if (rank >= TIER_BOUNDARIES[i]) return TIER_NAMES[i];
  }
  return "common";
}

/**
 * Get the next tier boundary above the given rank.
 * Returns null if already at the highest tier.
 */
function getNextTierBoundary(rank: number): number | null {
  for (const boundary of TIER_BOUNDARIES) {
    if (boundary > rank) return boundary;
  }
  return null;
}

/**
 * Calculate total team power: sum of all trait ranks across non-archived,
 * non-questing collection creatures.
 */
function calculateTeamPower(state: GameState): number {
  let total = 0;
  const questCreatureIds = state.activeQuest?.creatureIds ?? [];
  for (const creature of state.collection) {
    if (creature.archived) continue;
    if (questCreatureIds.includes(creature.id)) continue;
    for (const slot of creature.slots) {
      total += extractRank(slot.variantId);
    }
  }
  return total;
}

/**
 * Compute progress info from the current game state.
 * Pure function -- reads state, returns structured data.
 */
export function getProgressInfo(state: GameState): ProgressInfo {
  const config = loadConfig();
  const xpToNextLevel = getXpForNextLevel(state.profile.level);
  const xpPercent = xpToNextLevel > 0 ? Math.round((state.profile.xp / xpToNextLevel) * 100) : 100;

  // Best trait across collection
  let bestTrait: ProgressInfo["bestTrait"] = null;
  let bestRank = -1;
  for (const creature of state.collection) {
    if (creature.archived) continue;
    for (const slot of creature.slots) {
      const rank = extractRank(slot.variantId);
      if (rank > bestRank) {
        bestRank = rank;
        bestTrait = {
          creatureName: creature.name,
          slot: slot.slotId,
          rank,
          tierName: getTierName(rank),
        };
      }
    }
  }

  // Nearest tier threshold: find the trait closest to a tier boundary that
  // can be reached via upgrade (1 rank away from a boundary).
  let nearestTierThreshold: ProgressInfo["nearestTierThreshold"] = null;
  let minDistance = Infinity;
  for (const creature of state.collection) {
    if (creature.archived) continue;
    for (const slot of creature.slots) {
      const rank = extractRank(slot.variantId);
      const nextBoundary = getNextTierBoundary(rank);
      if (nextBoundary !== null) {
        const distance = nextBoundary - rank;
        if (distance < minDistance) {
          minDistance = distance;
          nearestTierThreshold = {
            creatureName: creature.name,
            slot: slot.slotId,
            currentRank: rank,
            targetRank: nextBoundary,
            method: distance === 1 ? "upgrade" : "merge",
          };
        }
      }
    }
  }

  // Team power and next milestone
  const teamPower = calculateTeamPower(state);
  let nextPowerMilestone = POWER_MILESTONES[POWER_MILESTONES.length - 1];
  for (const milestone of POWER_MILESTONES) {
    if (milestone > teamPower) {
      nextPowerMilestone = milestone;
      break;
    }
  }

  // Next species unlock (from config discovery.speciesUnlockLevels)
  let nextSpeciesUnlock: ProgressInfo["nextSpeciesUnlock"] = null;
  const unlockLevels = config.discovery?.speciesUnlockLevels ?? {};
  let closestUnlockLevel = Infinity;
  for (const [species, unlockLevel] of Object.entries(unlockLevels)) {
    if (unlockLevel > state.profile.level && unlockLevel < closestUnlockLevel) {
      closestUnlockLevel = unlockLevel;
      nextSpeciesUnlock = { species, level: unlockLevel };
    }
  }

  // Total species count: discovered + those in unlock levels not yet discovered
  const allSpecies = new Set([
    ...state.discoveredSpecies,
    ...Object.keys(unlockLevels),
  ]);
  const totalSpecies = Math.max(allSpecies.size, state.discoveredSpecies.length);

  return {
    level: state.profile.level,
    xp: state.profile.xp,
    xpToNextLevel,
    xpPercent,
    nextSpeciesUnlock,
    bestTrait,
    nearestTierThreshold,
    teamPower,
    nextPowerMilestone,
    collectionSize: state.collection.filter((c) => !c.archived).length,
    collectionMax: MAX_COLLECTION_SIZE,
    gold: state.gold,
    discoveredCount: state.discoveredSpecies.length,
    totalSpecies,
  };
}
```

- [ ] **Step 4: Verify progress tests pass**

Run: `npx jest tests/engine/advisor.test.ts`
Expected: the `getProgressInfo` describe block passes (other tests not yet added).

- [ ] **Step 5: Commit**

```bash
git add src/engine/advisor.ts tests/engine/advisor.test.ts
git commit -m "feat(advisor): add getProgressInfo calculator with team power, tier tracking, and milestones"
```

---

## Task 3: Viable Actions Calculator

**Files:**
- Modify: `src/engine/advisor.ts`
- Modify: `tests/engine/advisor.test.ts`

- [ ] **Step 1: Write failing tests for `getViableActions`**

Add to `tests/engine/advisor.test.ts`:

```ts
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

  test("includes upgrade actions for non-max-rank traits", () => {
    const c1 = makeCreature("c1", "compi", [2, 5, 0, 7]);
    const state = makeState({ collection: [c1], gold: 100 });
    const actions = getViableActions(state);
    const upgradeActions = actions.filter((a) => a.type === "upgrade");
    // rank 2, 5, 0 can be upgraded; rank 7 is max
    expect(upgradeActions).toHaveLength(3);
  });

  test("no upgrade actions when session cap reached", () => {
    const c1 = makeCreature("c1", "compi", [2, 2, 2, 2]);
    const state = makeState({ collection: [c1], gold: 100, sessionUpgradeCount: 2 });
    const actions = getViableActions(state);
    const upgradeActions = actions.filter((a) => a.type === "upgrade");
    expect(upgradeActions).toHaveLength(0);
  });

  test("no upgrade actions when not enough gold", () => {
    const c1 = makeCreature("c1", "compi", [5, 5, 5, 5]);
    // rank 5 costs 38g to upgrade
    const state = makeState({ collection: [c1], gold: 10 });
    const actions = getViableActions(state);
    const upgradeActions = actions.filter((a) => a.type === "upgrade");
    expect(upgradeActions).toHaveLength(0);
  });

  test("includes merge action when same-species pair exists", () => {
    const c1 = makeCreature("c1", "compi", [3, 3, 3, 3]);
    const c2 = makeCreature("c2", "compi", [2, 2, 2, 2]);
    const state = makeState({ collection: [c1, c2], gold: 100 });
    const actions = getViableActions(state);
    const mergeActions = actions.filter((a) => a.type === "merge");
    expect(mergeActions.length).toBeGreaterThanOrEqual(1);
  });

  test("no merge action for single-species creature", () => {
    const c1 = makeCreature("c1", "compi", [3, 3, 3, 3]);
    const c2 = makeCreature("c2", "flikk", [2, 2, 2, 2]);
    const state = makeState({ collection: [c1, c2], gold: 100 });
    const actions = getViableActions(state);
    const mergeActions = actions.filter((a) => a.type === "merge");
    expect(mergeActions).toHaveLength(0);
  });

  test("includes quest action when creatures available and no active quest", () => {
    const c1 = makeCreature("c1", "compi", [3, 3, 3, 3]);
    const state = makeState({ collection: [c1] });
    const actions = getViableActions(state);
    const questActions = actions.filter((a) => a.type === "quest");
    expect(questActions).toHaveLength(1);
  });

  test("no quest action when quest already active", () => {
    const c1 = makeCreature("c1", "compi", [3, 3, 3, 3]);
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
    const actions = getViableActions(state);
    const questActions = actions.filter((a) => a.type === "quest");
    expect(questActions).toHaveLength(0);
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
```

- [ ] **Step 2: Verify test fails**

Run: `npx jest tests/engine/advisor.test.ts`
Expected: fails (getViableActions not implemented).

- [ ] **Step 3: Implement `getViableActions` in `src/engine/advisor.ts`**

Add to `src/engine/advisor.ts`:

```ts
/**
 * Calculate all viable actions the player can take right now.
 * Each action includes type, label, cost, and reasoning.
 * Pure function -- reads state, returns action list.
 */
export function getViableActions(state: GameState): SuggestedAction[] {
  const config = loadConfig();
  const actions: SuggestedAction[] = [];
  const questCreatureIds = state.activeQuest?.creatureIds ?? [];

  // --- Catch actions (one per nearby creature) ---
  if (state.nearby.length > 0 && state.batch && state.batch.attemptsRemaining > 0) {
    for (let i = 0; i < state.nearby.length; i++) {
      const creature = state.nearby[i];
      const energyCost = 1; // standard catch cost
      if (state.energy >= energyCost) {
        actions.push({
          type: "catch",
          label: `Catch ${creature.name} (#${i + 1})`,
          cost: { energy: energyCost },
          priority: 0, // will be ranked later
          reasoning: `Wild ${creature.speciesId} available`,
          target: { nearbyIndex: i },
        });
      }
    }
  }

  // --- Upgrade actions (one per upgradeable trait per creature) ---
  if (state.sessionUpgradeCount < config.upgrade.sessionCap) {
    for (let ci = 0; ci < state.collection.length; ci++) {
      const creature = state.collection[ci];
      if (creature.archived) continue;
      if (questCreatureIds.includes(creature.id)) continue;
      for (const slot of creature.slots) {
        const rank = extractRank(slot.variantId);
        if (rank >= config.upgrade.maxRank) continue;
        const cost = config.upgrade.costs[rank];
        if (state.gold < cost) continue;
        const nextBoundary = getNextTierBoundary(rank);
        const nearTier = nextBoundary !== null && nextBoundary - rank === 1;
        actions.push({
          type: "upgrade",
          label: `Upgrade ${creature.name}'s ${slot.slotId} (rank ${rank} -> ${rank + 1})`,
          cost: { gold: cost },
          priority: 0,
          reasoning: nearTier
            ? `Pushes ${slot.slotId} into ${getTierName(rank + 1)} tier`
            : `Increases ${slot.slotId} rank`,
          target: { creatureIndex: ci + 1, slotId: slot.slotId },
        });
      }
    }
  }

  // --- Merge actions (one per same-species pair) ---
  const speciesGroups: Record<string, number[]> = {};
  for (let ci = 0; ci < state.collection.length; ci++) {
    const creature = state.collection[ci];
    if (creature.archived) continue;
    if (questCreatureIds.includes(creature.id)) continue;
    if (!speciesGroups[creature.speciesId]) speciesGroups[creature.speciesId] = [];
    speciesGroups[creature.speciesId].push(ci);
  }
  for (const [speciesId, indexes] of Object.entries(speciesGroups)) {
    if (indexes.length < 2) continue;
    // Suggest the best pair: highest power + second highest
    const sorted = [...indexes].sort((a, b) => {
      const powerA = state.collection[a].slots.reduce((s, sl) => s + extractRank(sl.variantId), 0);
      const powerB = state.collection[b].slots.reduce((s, sl) => s + extractRank(sl.variantId), 0);
      return powerB - powerA;
    });
    const ai = sorted[0];
    const bi = sorted[1];
    const avgRank =
      state.collection[ai].slots.reduce((s, sl) => s + extractRank(sl.variantId), 0) / 4;
    const goldCost = config.mergeGold.baseCost + Math.floor(avgRank * config.mergeGold.rankMultiplier);
    if (state.gold >= goldCost && state.energy >= config.energy.baseMergeCost) {
      actions.push({
        type: "merge",
        label: `Merge ${state.collection[ai].name} + ${state.collection[bi].name}`,
        cost: { gold: goldCost, energy: config.energy.baseMergeCost },
        priority: 0,
        reasoning: `${indexes.length} ${speciesId} available for merge`,
        target: { creatureIndex: ai + 1, partnerIndex: bi + 1 },
      });
    }
  }

  // --- Quest action ---
  if (!state.activeQuest) {
    const availableCreatures = state.collection.filter(
      (c) => !c.archived && !questCreatureIds.includes(c.id)
    );
    if (availableCreatures.length > 0) {
      const teamSize = Math.min(availableCreatures.length, config.quest.maxTeamSize);
      actions.push({
        type: "quest",
        label: `Send ${teamSize} creature${teamSize > 1 ? "s" : ""} on a quest`,
        cost: {},
        priority: 0,
        reasoning: "Earn gold while you wait",
      });
    }
  }

  // --- Scan action ---
  if (state.nearby.length === 0 || !state.batch) {
    actions.push({
      type: "scan",
      label: "Scan for new creatures",
      cost: {},
      priority: 0,
      reasoning: state.nearby.length === 0
        ? "No creatures nearby -- scan to find some"
        : "Check for new spawns",
    });
  }

  // --- Release action (when collection full) ---
  if (state.collection.filter((c) => !c.archived).length >= MAX_COLLECTION_SIZE) {
    actions.push({
      type: "release",
      label: "Release or archive a creature to make room",
      cost: {},
      priority: 0,
      reasoning: "Collection is full (15/15)",
    });
  }

  // --- Collection view (always available) ---
  actions.push({
    type: "collection",
    label: "View collection",
    cost: {},
    priority: 0,
    reasoning: "Review your creatures",
  });

  return actions;
}
```

- [ ] **Step 4: Verify tests pass**

Run: `npx jest tests/engine/advisor.test.ts`
Expected: all `getViableActions` tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/advisor.ts tests/engine/advisor.test.ts
git commit -m "feat(advisor): add getViableActions calculator with catch, upgrade, merge, quest, scan actions"
```

---

## Task 4: Mode Selection and Suggested Actions Ranking

**Files:**
- Modify: `src/engine/advisor.ts`
- Modify: `tests/engine/advisor.test.ts`

- [ ] **Step 1: Write failing tests for `getAdvisorMode` and `getSuggestedActions`**

Add to `tests/engine/advisor.test.ts`:

```ts
describe("getAdvisorMode", () => {
  test("autopilot for routine catch with no merge available", () => {
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

  test("advisor for catch when merge available", () => {
    // Two compis in collection -- merge is possible
    const c1 = makeCreature("c1", "compi", [3, 3, 3, 3]);
    const c2 = makeCreature("c2", "compi", [2, 2, 2, 2]);
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
    const mode = getAdvisorMode("catch", catchResult, state);
    expect(mode).toBe("advisor");
  });

  test("advisor for upgrade near tier threshold", () => {
    const c1 = makeCreature("c1", "compi", [3, 1, 1, 1]);
    const state = makeState({ collection: [c1], gold: 50 });
    const upgradeResult: UpgradeResult = {
      creatureId: "c1",
      slotId: "eyes",
      fromRank: 2,
      toRank: 3,
      goldCost: 9,
    };
    const mode = getAdvisorMode("upgrade", upgradeResult, state);
    expect(mode).toBe("advisor");
  });

  test("autopilot for quest return", () => {
    const state = makeState();
    const questResult: QuestCompleteResult = {
      questId: "q1",
      goldEarned: 30,
      xpEarned: 15,
      creaturesReturned: ["c1"],
    };
    const mode = getAdvisorMode("quest_complete", questResult, state);
    expect(mode).toBe("autopilot");
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
});

describe("getSuggestedActions", () => {
  test("returns max 5 actions", () => {
    // Create a state with many options
    const creatures = Array.from({ length: 6 }, (_, i) =>
      makeCreature(`c${i}`, i < 3 ? "compi" : "flikk", [2, 2, 2, 2])
    );
    const state = makeState({
      collection: creatures,
      nearby: [makeNearby("n1", "compi")],
      batch: { attemptsRemaining: 2, failPenalty: 0, spawnedAt: Date.now() },
      gold: 200,
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
      gold: 50,
    });
    const suggested = getSuggestedActions("scan", {}, state);
    expect(suggested[0].priority).toBe(1);
  });

  test("post-catch with merge available prioritizes merge", () => {
    const c1 = makeCreature("c1", "compi", [4, 4, 4, 4]);
    const c2 = makeCreature("c2", "compi", [3, 3, 3, 3]);
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
    const suggested = getSuggestedActions("catch", catchResult, state);
    // Merge should be high priority since same species exists
    const mergeAction = suggested.find((a) => a.type === "merge");
    expect(mergeAction).toBeDefined();
    expect(mergeAction!.priority).toBeLessThanOrEqual(2);
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
```

- [ ] **Step 2: Verify tests fail**

Run: `npx jest tests/engine/advisor.test.ts`
Expected: fails (getAdvisorMode, getSuggestedActions not implemented).

- [ ] **Step 3: Implement `getAdvisorMode` in `src/engine/advisor.ts`**

Add to `src/engine/advisor.ts`:

```ts
/**
 * Determine whether this moment calls for auto-pilot (just show result)
 * or advisor mode (present options with analysis).
 *
 * Trigger matrix from spec:
 * - ADVISOR: merge available, near tier threshold, new species, low energy with options,
 *   expensive action, level up, collection full
 * - AUTOPILOT: quest return, routine catch (no merge), only one viable action
 */
export function getAdvisorMode(
  action: string,
  result: unknown,
  state: GameState
): AdvisorMode {
  const config = loadConfig();

  // Quest return is always autopilot
  if (action === "quest_complete") return "autopilot";

  // New species discovery triggers advisor
  if (action === "catch") {
    const catchResult = result as CatchResult;
    if (catchResult.success) {
      const speciesId = catchResult.creature.speciesId;
      // If the species was just discovered (not in the list before this catch),
      // we check if there's only one of this species in the collection
      const sameSpeciesCount = state.collection.filter(
        (c) => c.speciesId === speciesId && !c.archived
      ).length;

      // New species: the catch just added it, so count == 1 means first of its kind
      if (sameSpeciesCount === 1 && !state.discoveredSpecies.includes(speciesId)) {
        return "advisor";
      }

      // Species just caught was not previously discovered
      // (discoveredSpecies is updated before advisor runs, so check if count matches)
      if (!state.discoveredSpecies.includes(speciesId)) {
        return "advisor";
      }

      // Merge available: 2+ of same species
      if (sameSpeciesCount >= 2) return "advisor";
    }
  }

  // Post-upgrade: check if near another tier threshold
  if (action === "upgrade") {
    const upgradeResult = result as UpgradeResult;
    const creature = state.collection.find((c) => c.id === upgradeResult.creatureId);
    if (creature) {
      for (const slot of creature.slots) {
        const rank = extractRank(slot.variantId);
        const nextBoundary = getNextTierBoundary(rank);
        if (nextBoundary !== null && nextBoundary - rank === 1) return "advisor";
      }
    }
  }

  // Post-merge is always advisor (significant moment)
  if (action === "merge" || action === "breed") return "advisor";

  // Low energy with options
  if (state.energy <= 2) {
    const viable = getViableActions(state);
    if (viable.filter((a) => a.type !== "collection" && a.type !== "scan").length > 1) {
      return "advisor";
    }
  }

  // Collection full
  if (state.collection.filter((c) => !c.archived).length >= MAX_COLLECTION_SIZE) {
    return "advisor";
  }

  // Level up (detected via result type)
  if (action === "level_up") return "advisor";

  // Default: autopilot
  return "autopilot";
}

/**
 * Rank and filter suggested actions for the current moment.
 * Returns max 5 actions, sorted by priority (1 = highest).
 * The recommended action (advisor's pick) is always priority 1.
 * Collection view is always the last option.
 */
export function getSuggestedActions(
  action: string,
  result: unknown,
  state: GameState
): SuggestedAction[] {
  const viable = getViableActions(state);
  if (viable.length === 0) return [];

  // Score each action based on context
  for (const a of viable) {
    a.priority = scoreAction(a, action, result, state);
  }

  // Sort by priority score (lower = better)
  viable.sort((a, b) => a.priority - b.priority);

  // Ensure collection is always last (unless it's the only action)
  const collectionAction = viable.find((a) => a.type === "collection");
  const nonCollection = viable.filter((a) => a.type !== "collection");

  // Take top 4 non-collection actions + collection as #5
  const top = nonCollection.slice(0, 4);
  if (collectionAction) top.push(collectionAction);

  // Reassign priorities 1..N
  top.forEach((a, i) => {
    a.priority = i + 1;
  });

  return top;
}

/**
 * Score an action based on current context. Lower score = higher priority.
 */
function scoreAction(
  action: SuggestedAction,
  lastAction: string,
  lastResult: unknown,
  state: GameState
): number {
  let score = 50; // base score

  // Merge is high priority when available (big impact)
  if (action.type === "merge") score = 10;

  // Upgrade near tier boundary is very valuable
  if (action.type === "upgrade") {
    score = 30;
    // Check if this upgrade pushes to a new tier
    if (action.target?.slotId) {
      const creature = state.collection[(action.target.creatureIndex ?? 1) - 1];
      if (creature) {
        const slot = creature.slots.find((s) => s.slotId === action.target!.slotId);
        if (slot) {
          const rank = extractRank(slot.variantId);
          const nextBoundary = getNextTierBoundary(rank);
          if (nextBoundary !== null && nextBoundary - rank === 1) score = 8;
        }
      }
    }
  }

  // After scan, catching is the natural next step
  if (action.type === "catch" && lastAction === "scan") score = 5;

  // After catch, more catches if batch remains
  if (action.type === "catch" && lastAction === "catch") score = 15;

  // Quest is good when energy is low (passive income)
  if (action.type === "quest") {
    score = 35;
    if (state.energy <= 3) score = 12;
  }

  // Scan when nothing else to do
  if (action.type === "scan") score = 40;

  // Release is urgent when collection full
  if (action.type === "release") score = 3;

  // Collection view is always last
  if (action.type === "collection") score = 100;

  return score;
}
```

- [ ] **Step 4: Verify tests pass**

Run: `npx jest tests/engine/advisor.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/advisor.ts tests/engine/advisor.test.ts
git commit -m "feat(advisor): add getAdvisorMode trigger matrix and getSuggestedActions with priority ranking"
```

---

## Task 5: Advisor Context Builder

**Files:**
- Modify: `src/engine/advisor.ts`
- Modify: `src/engine/game-engine.ts`
- Modify: `tests/engine/advisor.test.ts`

- [ ] **Step 1: Write failing test for `buildAdvisorContext`**

Add to `tests/engine/advisor.test.ts`:

```ts
describe("buildAdvisorContext", () => {
  test("returns complete context with mode, actions, and progress", () => {
    const c1 = makeCreature("c1", "compi", [3, 3, 3, 3]);
    const state = makeState({
      collection: [c1],
      nearby: [makeNearby("n1", "flikk")],
      batch: { attemptsRemaining: 2, failPenalty: 0, spawnedAt: Date.now() },
      gold: 50,
    });
    const context = buildAdvisorContext("scan", {}, state);
    expect(context.mode).toBeDefined();
    expect(context.suggestedActions.length).toBeGreaterThan(0);
    expect(context.suggestedActions.length).toBeLessThanOrEqual(5);
    expect(context.progress.level).toBe(3);
    expect(context.progress.gold).toBe(50);
  });
});
```

Import `buildAdvisorContext` at the top of the test file.

- [ ] **Step 2: Verify test fails**

Run: `npx jest tests/engine/advisor.test.ts`
Expected: fails (buildAdvisorContext not exported).

- [ ] **Step 3: Implement `buildAdvisorContext` in `src/engine/advisor.ts`**

Add to `src/engine/advisor.ts`:

```ts
/**
 * Build the full advisor context for a given game moment.
 * This is the primary entry point -- composes mode, actions, and progress.
 */
export function buildAdvisorContext(
  action: string,
  result: unknown,
  state: GameState
): AdvisorContext {
  return {
    mode: getAdvisorMode(action, result, state),
    suggestedActions: getSuggestedActions(action, result, state),
    progress: getProgressInfo(state),
  };
}
```

- [ ] **Step 4: Add `getAdvisorContext` to `GameEngine`**

In `src/engine/game-engine.ts`, add import:

```ts
import { buildAdvisorContext } from "./advisor";
```

Add import for `AdvisorContext`:

```ts
import { ..., AdvisorContext } from "../types";
```

Add method:

```ts
getAdvisorContext(action: string, result: unknown): AdvisorContext {
  return buildAdvisorContext(action, result, this.state);
}
```

- [ ] **Step 5: Export from `src/index.ts`**

Add:

```ts
export {
  buildAdvisorContext,
  getProgressInfo,
  getViableActions,
  getAdvisorMode,
  getSuggestedActions,
} from "./engine/advisor";
```

- [ ] **Step 6: Build and test**

Run: `npm run build`
Expected: succeeds.

Run: `npx jest tests/engine/advisor.test.ts`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/engine/advisor.ts src/engine/game-engine.ts src/index.ts tests/engine/advisor.test.ts
git commit -m "feat(advisor): add buildAdvisorContext entry point and wire into GameEngine"
```

---

## Task 6: Renderer -- Status Bar and Action Menu

**Files:**
- Modify: `src/types.ts` (Renderer interface)
- Modify: `src/renderers/simple-text.ts`

- [ ] **Step 1: Add new render method signatures to Renderer interface**

In `src/types.ts`, add to the `Renderer` interface:

```ts
export interface Renderer {
  // ... existing methods ...
  renderStatusBar(progress: ProgressInfo): string;
  renderActionMenu(actions: SuggestedAction[]): string;
  renderProgressPanel(progress: ProgressInfo): string;
}
```

- [ ] **Step 2: Implement `renderStatusBar` in `SimpleTextRenderer`**

Add to `src/renderers/simple-text.ts`. First, add imports for the new types:

```ts
import {
  // ... existing imports ...
  ProgressInfo,
  SuggestedAction,
  ActionMenuEntry,
} from "../types";
```

Then add the method:

```ts
renderStatusBar(progress: ProgressInfo): string {
  const energyFilled = Math.min(10, Math.round((progress.collectionSize / progress.collectionMax) * 10));

  // XP bar
  const xpFilled = Math.min(10, Math.round((progress.xpPercent / 100) * 10));
  const xpBar = `${GREEN}${"█".repeat(xpFilled)}${"░".repeat(10 - xpFilled)}${RESET}`;

  const parts: string[] = [];
  parts.push(`${ENERGY_ICON} ${progress.collectionSize}/${progress.collectionMax}`);
  parts.push(`${YELLOW}💰${RESET} ${progress.gold}g`);
  parts.push(`📦 ${progress.collectionSize}/${progress.collectionMax}`);
  parts.push(`⭐ Lv ${progress.level} (${progress.xp}/${progress.xpToNextLevel} XP)`);

  return `  ${parts.join("    ")}`;
}
```

- [ ] **Step 3: Implement `renderActionMenu` in `SimpleTextRenderer`**

```ts
renderActionMenu(actions: SuggestedAction[]): string {
  if (actions.length === 0) return "";

  const lines: string[] = [];
  lines.push(divider());

  for (const action of actions) {
    const costParts: string[] = [];
    if (action.cost.gold) costParts.push(`${action.cost.gold}g`);
    if (action.cost.energy) costParts.push(`${action.cost.energy}${ENERGY_ICON}`);
    const costStr = costParts.length > 0 ? ` ${DIM}(${costParts.join(" + ")})${RESET}` : "";

    lines.push(`  ${WHITE}[${action.priority}]${RESET} ${action.label}${costStr}`);
  }

  lines.push(divider());
  return lines.join("\n");
}
```

- [ ] **Step 4: Implement `renderProgressPanel` in `SimpleTextRenderer`**

```ts
renderProgressPanel(progress: ProgressInfo): string {
  const lines: string[] = [];

  lines.push(`  ${BOLD}PROGRESS${RESET}`);

  // XP to next level
  const xpFilled = Math.min(10, Math.round((progress.xpPercent / 100) * 10));
  const xpBar = `${GREEN}${"█".repeat(xpFilled)}${"░".repeat(10 - xpFilled)}${RESET}`;
  lines.push(`  ├─ Next level: ${progress.xp}/${progress.xpToNextLevel} XP (${progress.xpPercent}%)  ${xpBar}`);

  // Best trait
  if (progress.bestTrait) {
    const bt = progress.bestTrait;
    lines.push(`  ├─ Best trait: ${bt.creatureName}'s ${bt.slot} rank ${bt.rank} (${bt.tierName})`);
  }

  // Nearest tier threshold
  if (progress.nearestTierThreshold) {
    const nt = progress.nearestTierThreshold;
    lines.push(`  ├─ Near tier: ${nt.creatureName}'s ${nt.slot} rank ${nt.currentRank} -> ${nt.targetRank} via ${nt.method}`);
  }

  // Species discovered
  lines.push(`  ├─ Species: ${progress.discoveredCount} discovered`);

  // Team power
  lines.push(`  └─ Team power: ${progress.teamPower} -> ${progress.nextPowerMilestone} milestone (+${progress.nextPowerMilestone - progress.teamPower} needed)`);

  return lines.join("\n");
}
```

- [ ] **Step 5: Build to verify**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/renderers/simple-text.ts
git commit -m "feat(renderer): add renderStatusBar, renderActionMenu, and renderProgressPanel methods"
```

---

## Task 7: MCP Tools -- Return Advisor Context

**Files:**
- Modify: `src/mcp-tools.ts`

The key change: each MCP tool now returns both the rendered display output AND a structured `advisorContext` JSON block. Claude uses the advisor context to add narrator commentary and present the action menu.

- [ ] **Step 1: Add helper to build advisor-enriched responses**

In `src/mcp-tools.ts`, add import at the top:

```ts
import { buildAdvisorContext } from "./engine/advisor";
```

Add a helper function after `makeText`:

```ts
function makeAdvisorText(
  content: string,
  engine: GameEngine,
  action: string,
  result: unknown,
  options: RegisterToolsOptions
) {
  const renderer = new SimpleTextRenderer();
  const advisorContext = buildAdvisorContext(action, result, engine.getState());
  const statusBar = renderer.renderStatusBar(advisorContext.progress);
  const menu = renderer.renderActionMenu(advisorContext.suggestedActions);

  const fullContent = `${statusBar}\n\n${content}\n\n${menu}`;

  const base = makeText(fullContent, options);

  // Add advisor context as a separate text block so Claude can read it
  const advisorJson = JSON.stringify(advisorContext, null, 2);
  base.content.push({
    type: "text" as const,
    text: `\n<advisor_context>\n${advisorJson}\n</advisor_context>`,
  });

  return base;
}
```

- [ ] **Step 2: Update `scan` tool to use advisor response**

Replace the scan tool handler body:

```ts
addTool(server, "scan", "Show nearby creatures that can be caught", z.object({}), async () => {
  const { stateManager, engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const result = engine.scan();
  stateManager.save(engine.getState());
  return makeAdvisorText(renderer.renderScan(result), engine, "scan", result, options);
}, meta);
```

- [ ] **Step 3: Update `catch` tool to use advisor response**

Replace the catch tool handler body:

```ts
addTool(server, "catch", "Attempt to catch a nearby creature", z.object({
  index: z.number().describe("1-indexed creature number from scan list"),
}), async ({ index }: { index: number }) => {
  const { stateManager, engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const result = engine.catch(index - 1);
  stateManager.save(engine.getState());
  return makeAdvisorText(renderer.renderCatch(result), engine, "catch", result, options);
}, meta);
```

- [ ] **Step 4: Update `breed` tool to use advisor response**

Replace the breed tool handler body:

```ts
addTool(server, "breed", "Breed two creatures from your collection (uses /collection indexes)", z.object({
  indexA: z.number().optional().describe("1-indexed position of first parent in /collection"),
  indexB: z.number().optional().describe("1-indexed position of second parent in /collection"),
  confirm: z.boolean().optional().describe("Set to true to execute the breed after previewing"),
}), async ({ indexA, indexB, confirm }: { indexA?: number; indexB?: number; confirm?: boolean }) => {
  const { stateManager, engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const result = runBreedCommand(engine, renderer, { indexA, indexB, confirm });
  if (result.mutated) stateManager.save(engine.getState());
  const actionType = confirm ? "merge" : "breed_preview";
  return makeAdvisorText(result.output, engine, actionType, {}, options);
}, meta);
```

- [ ] **Step 5: Update `collection` tool to use advisor response**

```ts
addTool(server, "collection", "Browse caught creatures", z.object({}), async () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  return makeAdvisorText(
    renderer.renderCollection(engine.getState().collection),
    engine, "collection", {},
    options
  );
}, meta);
```

- [ ] **Step 6: Update `status` tool to include progress panel**

```ts
addTool(server, "status", "View player profile and game stats", z.object({}), async () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const result = engine.status();
  const advisorContext = buildAdvisorContext("status", result, engine.getState());
  const progressPanel = renderer.renderProgressPanel(advisorContext.progress);
  const statusText = renderer.renderStatus(result);
  return makeAdvisorText(`${statusText}\n\n${progressPanel}`, engine, "status", result, options);
}, meta);
```

- [ ] **Step 7: Update `upgrade` tool (created by Plan 1) to use advisor response**

```ts
addTool(server, "upgrade", "Upgrade a creature's trait rank (costs gold)", z.object({
  creatureIndex: z.number().describe("1-indexed position in /collection"),
  slot: z.string().describe("Slot to upgrade: eyes, mouth, body, or tail"),
}), async ({ creatureIndex, slot }: { creatureIndex: number; slot: string }) => {
  const { stateManager, engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const collection = engine.getState().collection;
  if (creatureIndex < 1 || creatureIndex > collection.length) {
    throw new Error(`No creature at index ${creatureIndex}. You have ${collection.length} creatures.`);
  }
  const creatureId = collection[creatureIndex - 1].id;
  const result = engine.upgrade(creatureId, slot as any);
  stateManager.save(engine.getState());
  const rendered = renderer.renderUpgradeResult(result);
  return makeAdvisorText(rendered, engine, "upgrade", result, options);
}, meta);
```

- [ ] **Step 8: Update `quest_start` and `quest_check` tools (created by Plan 1) to use advisor response**

```ts
addTool(server, "quest_start", "Send creatures on a quest to earn gold", z.object({
  creatureIndexes: z.array(z.number()).describe("1-indexed positions of creatures to send (1-3)"),
}), async ({ creatureIndexes }: { creatureIndexes: number[] }) => {
  const { stateManager, engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const collection = engine.getState().collection;
  const creatureIds = creatureIndexes.map(idx => {
    if (idx < 1 || idx > collection.length) {
      throw new Error(`No creature at index ${idx}. You have ${collection.length} creatures.`);
    }
    return collection[idx - 1].id;
  });
  const result = engine.questStart(creatureIds);
  stateManager.save(engine.getState());
  const rendered = renderer.renderQuestStart(result);
  return makeAdvisorText(rendered, engine, "quest_start", result, options);
}, meta);

addTool(server, "quest_check", "Check quest progress or collect rewards", z.object({}), async () => {
  const { stateManager, engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const result = engine.questCheck();
  stateManager.save(engine.getState());
  if (result) {
    const rendered = renderer.renderQuestComplete(result);
    return makeAdvisorText(rendered, engine, "quest_complete", result, options);
  }
  const quest = engine.getState().activeQuest;
  if (quest) {
    const rendered = renderer.renderQuestStatus(quest);
    return makeAdvisorText(rendered, engine, "quest_status", {}, options);
  }
  return makeAdvisorText("No active quest. Use /quest to send creatures on a quest.", engine, "quest_status", {}, options);
}, meta);
```

- [ ] **Step 9: Build to verify**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 10: Commit**

```bash
git add src/mcp-tools.ts
git commit -m "feat(mcp): return advisor context (mode, suggested actions, progress) with all tool responses"
```

---

## Task 8: SKILL.md Narrator Instructions

This is the heart of the hybrid approach: SKILL.md files teach Claude how to narrate game output using the `<advisor_context>` block returned by MCP tools.

**Files:**
- Modify: `skills/scan/SKILL.md`
- Modify: `skills/catch/SKILL.md`
- Modify: `skills/collection/SKILL.md`
- Modify: `skills/breed/SKILL.md`
- Modify: `skills/status/SKILL.md`
- Modify: `skills/upgrade/SKILL.md` (created by Plan 1)
- Modify: `skills/quest/SKILL.md` (created by Plan 1)

- [ ] **Step 1: Update `skills/scan/SKILL.md`**

Replace contents:

```markdown
---
name: scan
model: claude-sonnet-4-20250514
description: Show nearby creatures that can be caught
---

1. Call the `mcp__plugin_compi_compi__scan` tool to scan for nearby creatures.
2. Then run this Bash command to display the result with colors:
   ```
   _t="$(node -p "require('os').tmpdir()")" && cat "$_t/compi_display.txt" && rm -f "$_t/compi_display.txt"
   ```

After both steps, read the `<advisor_context>` block from the MCP response. Use it to narrate the scan result in 2-3 sentences with the voice of an enthusiastic game narrator. Follow these rules:

**Narrator voice rules:**
- Name creatures and traits specifically ("that Flikk at star-41 with a Shade body")
- Explain WHY a creature is interesting (trait rarity, merge potential, power score)
- Be punchy -- 2-3 sentences max, never verbose
- Match excitement to the moment -- rare spawns get hype, common batches get a quick nod

**Action menu:**
After your narrator text, list the `suggestedActions` from the advisor context as a numbered menu. Format:
```
[1] Label (cost)
[2] Label (cost)
```

The player can respond with a number or natural language. If they pick a number, execute the corresponding action.

Do NOT just say "Press Ctrl+O" -- always provide narrator commentary about the creatures visible.
```

- [ ] **Step 2: Update `skills/catch/SKILL.md`**

Replace contents:

```markdown
---
name: catch
model: claude-sonnet-4-20250514
description: Attempt to catch a nearby creature
---

Parse the argument for which creature number (1-indexed) from the scan list.

Usage: `/catch [number]`

1. Call the `mcp__plugin_compi_compi__catch` tool with the parsed `index` (number).
2. Then run this Bash command to display the result with colors:
   ```
   _t="$(node -p "require('os').tmpdir()")" && cat "$_t/compi_display.txt" && rm -f "$_t/compi_display.txt"
   ```

After both steps, read the `<advisor_context>` block from the MCP response. Use it to narrate the catch result.

**If caught:**
- Name the creature and call out its best trait by name and rarity
- If `mode` is `"advisor"`, explain the decision: merge option, upgrade path, or new species discovery
- If `mode` is `"autopilot"`, keep it brief: "Nice grab. [trait] is solid."

**If escaped or fled:**
- Brief reaction. "Slippery one!" or "Gone. That [trait] would have been nice."

**Action menu:**
List the `suggestedActions` as a numbered menu with costs inline. The advisor's recommendation is always [1].

**New species discovery (check if advisor mode mentions it):**
If the `<advisor_context>` indicates a new species, give it the full hype treatment: "A species you've never seen! [species name] -- known for [traits]. Definitely a keeper."

The player can respond with a number or natural language to take the next action.
```

- [ ] **Step 3: Update `skills/collection/SKILL.md`**

Replace contents:

```markdown
---
name: collection
model: claude-sonnet-4-20250514
description: Browse your caught creatures and their traits
---

1. Call the `mcp__plugin_compi_compi__collection` tool to browse caught creatures.
2. Then run this Bash command to display the result with colors:
   ```
   _t="$(node -p "require('os').tmpdir()")" && cat "$_t/compi_display.txt" && rm -f "$_t/compi_display.txt"
   ```

After both steps, read the `<advisor_context>` block from the MCP response. Provide a brief narrator summary of the collection state:

- Call out your strongest creature by name and power score
- Mention any merge opportunities ("Two Compis -- merge material")
- Note if collection is nearly full or has room
- If a trait is near a tier threshold, mention it

**Action menu:**
List the `suggestedActions` as a numbered menu. Include upgrade, merge, quest, and scan options as available.

Keep narrator text to 2-3 sentences. Be specific about creature and trait names.
```

- [ ] **Step 4: Update `skills/breed/SKILL.md`**

Replace contents:

```markdown
---
name: breed
model: claude-sonnet-4-20250514
description: Breed two creatures from your collection (picks via /collection index)
---

Parse the arguments. The command supports three shapes:

- `/breed` (no args) -- show the breed table (all breedable creatures grouped by species)
- `/breed N M` (two numbers) -- preview mode, preview breeding creatures at indexes N and M
- `/breed N M --confirm` -- execute mode, execute the breed

Single-number `/breed N` is no longer supported; users pick two numbers directly from the table.

Flow:

1. If no positional numbers were given, call `mcp__plugin_compi_compi__breed` with **no arguments**.
2. If two positional numbers `N` and `M` were given:
   - Without `--confirm`: call the tool with `indexA: N`, `indexB: M`.
   - With `--confirm`: call the tool with `indexA: N`, `indexB: M`, `confirm: true`.
3. If only one positional number was given, call the tool with `indexA: N` (the tool will return a helpful error).

After the tool call, run this Bash command to display the output with colors:

```
_t="$(node -p "require('os').tmpdir()")" && cat "$_t/compi_display.txt" && rm -f "$_t/compi_display.txt"
```

Then read the `<advisor_context>` block and narrate based on mode:

**List mode (no args):**
Brief overview: "You have N breedable pairs. The [species] pair looks strongest -- [trait] could push into [tier] territory."

**Preview mode:**
Analyze the merge: "This is a [strong/risky/safe] merge. [Best trait] has [X]% inheritance -- almost guaranteed. The random +1 could push [trait] into [tier]. Only risk is the 30% downgrade hitting [other trait]."

**Execute mode (--confirm):**
Full excitement for the result. Call out what was inherited, any upgrades or downgrades. "Jackpot! [trait] upgraded to rank [N] -- that's [tier] territory!" or "Solid merge. No surprises -- [trait] inherited cleanly."

**Error mode:** Report the error message as-is.

**Action menu:**
Always show the `suggestedActions` numbered menu after narrator text.
```

- [ ] **Step 5: Update `skills/status/SKILL.md`**

Replace contents:

```markdown
---
name: status
model: claude-sonnet-4-20250514
description: View your player profile and game stats
---

1. Call the `mcp__plugin_compi_compi__status` tool to view player stats.
2. Then run this Bash command to display it with colors:
   ```
   _t="$(node -p "require('os').tmpdir()")" && cat "$_t/compi_display.txt" && rm -f "$_t/compi_display.txt"
   ```

After both steps, read the `<advisor_context>` block. Provide a brief narrator summary:

- Progress toward next level ("Halfway to level [N] -- a few more catches will get you there")
- Gold status and what it can buy ("42g in the bank -- enough for two upgrades")
- Best trait milestone ("Your Crystal body is one rank from rare -- worth prioritizing")
- Active quest status if any

**Action menu:**
List the `suggestedActions` as a numbered menu.

Keep it to 2-3 sentences. Be specific and enthusiastic about progress.
```

- [ ] **Step 6: Update `skills/upgrade/SKILL.md` (created by Plan 1)**

Replace contents:

```markdown
---
name: upgrade
model: claude-sonnet-4-20250514
description: Upgrade a creature's trait rank (costs gold)
---

Parse the arguments:
- First argument: creature number from /collection (1-indexed)
- Second argument: slot name (eyes, mouth, body, tail)

Usage: `/upgrade 3 eyes`

1. Call the `mcp__plugin_compi_compi__upgrade` tool with `creatureIndex` and `slot`.
2. Then run this Bash command to display the result with colors:
   ```
   _t="$(node -p "require('os').tmpdir()")" && cat "$_t/compi_display.txt" && rm -f "$_t/compi_display.txt"
   ```

After both steps, read the `<advisor_context>` block and narrate the upgrade result.

**Narrator rules:**
- Name the trait specifically: "Ring Gaze eyes rank 3 -> 4"
- If it crossed a tier boundary, celebrate: "That's uncommon territory now!"
- If another trait is close to a boundary, mention it: "Body is one upgrade from rare too -- 15g"
- If session cap is reached, note it: "That's your upgrades for this session. Try a quest or merge."

**Action menu:**
List `suggestedActions` as a numbered menu with costs inline.
```

- [ ] **Step 7: Update `skills/quest/SKILL.md` (created by Plan 1)**

Replace contents:

```markdown
---
name: quest
model: claude-sonnet-4-20250514
description: Send creatures on a quest to earn gold
---

Parse the arguments:
- `/quest` -- view active quest status
- `/quest start N [M] [O]` -- send creatures at collection indexes N, M, O on a quest
- `/quest check` -- check quest progress or collect rewards

Flow:
1. **View:** Call `mcp__plugin_compi_compi__quest_check` with no args.
2. **Start:** Parse the creature indexes, call `mcp__plugin_compi_compi__quest_start` with `creatureIndexes: [N, M, O]`.
3. **Check:** Call `mcp__plugin_compi_compi__quest_check`.

After the tool call, run this Bash command to display the output with colors:
```
_t="$(node -p "require('os').tmpdir()")" && cat "$_t/compi_display.txt" && rm -f "$_t/compi_display.txt"
```

Then read the `<advisor_context>` block and narrate:

**Quest start:**
"Strong squad. That [best trait] is carrying the power score. [estimated reward]g should fund [N] upgrades when they're back."

**Quest in progress:**
"Team's still out. [N] sessions remaining. Power score [X] -- should bring back around [Y]g."

**Quest complete:**
"Nice haul! [gold]g in the pocket. Your [creature name] earned its keep -- that [trait] carried the power score." Then suggest what to spend gold on.

**Action menu:**
List `suggestedActions` as a numbered menu.
```

- [ ] **Step 8: Update `skills/list/SKILL.md` to include new commands**

Add the upgrade and quest commands to the list:

After `| /compi:breed |`:

```
| `/compi:upgrade` | Upgrade a creature's trait rank (costs gold) |
| `/compi:quest` | Send creatures on a quest to earn gold |
```

- [ ] **Step 9: Commit**

```bash
git add skills/
git commit -m "feat(skills): add narrator voice instructions and advisor context integration to all SKILL.md files"
```

---

## Task 9: CLI Advisor Output

**Files:**
- Modify: `src/cli.ts`

- [ ] **Step 1: Add advisor output to CLI commands**

In `src/cli.ts`, add import:

```ts
import { buildAdvisorContext } from "./engine/advisor";
```

Add a helper function after the `save()` function:

```ts
function printAdvisor(engine: GameEngine, renderer: SimpleTextRenderer, action: string, result: unknown): void {
  if (jsonMode) return; // advisor context is included in JSON output
  const context = buildAdvisorContext(action, result, engine.getState());
  const statusBar = renderer.renderStatusBar(context.progress);
  const menu = renderer.renderActionMenu(context.suggestedActions);
  console.log(statusBar);
  console.log(menu);
}
```

- [ ] **Step 2: Add advisor output to scan command**

In the `scan` case, after `output(result, renderer.renderScan(result));`, add:

```ts
printAdvisor(engine, renderer, "scan", result);
```

- [ ] **Step 3: Add advisor output to catch command**

In the `catch` case, after `output(result, renderer.renderCatch(result));`, add:

```ts
printAdvisor(engine, renderer, "catch", result);
```

- [ ] **Step 4: Add advisor output to breed command**

In the `breed` / `merge` case, after the confirm and preview outputs, add `printAdvisor` calls:

```ts
if (confirm) {
  const result = engine.breedExecute(parentAId, parentBId);
  save();
  output(result, renderer.renderBreedResult(result));
  printAdvisor(engine, renderer, "merge", result);
} else {
  const preview = engine.breedPreview(parentAId, parentBId);
  output(preview, renderer.renderBreedPreview(preview));
  printAdvisor(engine, renderer, "breed_preview", preview);
}
```

- [ ] **Step 5: Add advisor output to upgrade and quest commands (from Plan 1)**

In the `upgrade` case, after the output line, add:

```ts
printAdvisor(engine, renderer, "upgrade", result);
```

In the `quest` case, after each output line, add the appropriate `printAdvisor` call.

- [ ] **Step 6: Build to verify**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/cli.ts
git commit -m "feat(cli): add advisor status bar and action menu to all CLI command outputs"
```

---

## Task 10: Advisor Integration Test

**Files:**
- Create: `tests/engine/advisor-integration.test.ts`

- [ ] **Step 1: Write integration test**

Create `tests/engine/advisor-integration.test.ts`:

```ts
import {
  buildAdvisorContext,
  getProgressInfo,
  getViableActions,
  getAdvisorMode,
  getSuggestedActions,
} from "../../src/engine/advisor";
import {
  GameState,
  CollectionCreature,
  SLOT_IDS,
  NearbyCreature,
  CatchResult,
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
    upgrade: { costs: [3, 5, 9, 15, 24, 38, 55], maxRank: 7, sessionCap: 2 },
    quest: {
      maxTeamSize: 3,
      lockDurationSessions: 2,
      rewardMultiplier: 0.6,
      rewardFloor: 10,
      xpReward: 15,
    },
    mergeGold: { baseCost: 10, rankMultiplier: 5, downgradeChance: 0.30 },
    energy: {
      maxEnergy: 30,
      baseMergeCost: 1,
      maxMergeCost: 3,
      rareThreashold: 0.05,
      gainIntervalMs: 300000,
      startingEnergy: 30,
      sessionBonus: 3,
    },
    discovery: { speciesUnlockLevels: {} },
    batch: { spawnIntervalMs: 300000, batchLingerMs: 600000, sharedAttempts: 3, timeOfDay: {} },
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
    },
    progression: { xpPerLevel: 100, sessionGapMs: 7200000, tickPruneCount: 1000 },
    rewards: { milestones: [] },
    messages: {},
    economy: { startingGold: 10 },
  }),
}));

function makeCreature(
  id: string,
  speciesId: string,
  ranks: number[]
): CollectionCreature {
  return {
    id,
    speciesId,
    name: `${speciesId} ${id}`,
    slots: SLOT_IDS.map((slotId, i) => ({
      slotId,
      variantId: `trait_${slotId}_r${ranks[i] ?? 0}`,
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
      level: 5, xp: 100, totalCatches: 20, totalMerges: 3, totalUpgrades: 8,
      totalQuests: 2, totalTicks: 500, currentStreak: 3, longestStreak: 7,
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
    gold: 80,
    discoveredSpecies: ["compi", "flikk", "glich"],
    activeQuest: null,
    sessionUpgradeCount: 0,
    currentSessionId: "session-1",
    ...overrides,
  };
}

describe("advisor integration scenarios", () => {
  test("scenario: mid-game with merge opportunity", () => {
    const c1 = makeCreature("c1", "compi", [5, 3, 4, 2]);
    const c2 = makeCreature("c2", "compi", [3, 4, 2, 5]);
    const c3 = makeCreature("c3", "flikk", [2, 2, 2, 6]);
    const state = makeState({ collection: [c1, c2, c3], gold: 80 });

    const context = buildAdvisorContext("collection", {}, state);

    // Should identify merge opportunity
    const mergeAction = context.suggestedActions.find((a) => a.type === "merge");
    expect(mergeAction).toBeDefined();

    // Progress should identify c3's tail rank 6 as best trait
    expect(context.progress.bestTrait).not.toBeNull();
    expect(context.progress.bestTrait!.rank).toBe(6);

    // Team power: c1(5+3+4+2=14) + c2(3+4+2+5=14) + c3(2+2+2+6=12) = 40
    expect(context.progress.teamPower).toBe(40);
  });

  test("scenario: post-catch triggers advisor for new species", () => {
    const state = makeState({ discoveredSpecies: ["compi", "flikk"] });
    const catchResult: CatchResult = {
      success: true,
      creature: {
        id: "n1",
        speciesId: "glich",
        name: "Wild glich",
        slots: SLOT_IDS.map((slotId) => ({
          slotId,
          variantId: `trait_${slotId}_r1`,
          color: "white" as const,
        })),
        spawnedAt: Date.now(),
      },
      energySpent: 1,
      fled: false,
      xpEarned: 10,
      attemptsRemaining: 2,
      failPenalty: 0,
    };

    const mode = getAdvisorMode("catch", catchResult, state);
    expect(mode).toBe("advisor");
  });

  test("scenario: low energy suggests quest", () => {
    const c1 = makeCreature("c1", "compi", [3, 3, 3, 3]);
    const state = makeState({ collection: [c1], energy: 1, gold: 50 });
    const context = buildAdvisorContext("catch", {}, state);
    const questAction = context.suggestedActions.find((a) => a.type === "quest");
    expect(questAction).toBeDefined();
  });

  test("scenario: full collection prioritizes release/merge", () => {
    const creatures = Array.from({ length: 15 }, (_, i) =>
      makeCreature(`c${i}`, i < 8 ? "compi" : "flikk", [2, 2, 2, 2])
    );
    const state = makeState({ collection: creatures, gold: 100 });
    const context = buildAdvisorContext("catch", {}, state);
    // Release or merge should be high priority
    const releaseOrMerge = context.suggestedActions.filter(
      (a) => a.type === "release" || a.type === "merge"
    );
    expect(releaseOrMerge.length).toBeGreaterThanOrEqual(1);
    // First action should be release or merge (collection is full)
    expect(["release", "merge"]).toContain(context.suggestedActions[0].type);
  });

  test("scenario: context always has max 5 suggested actions", () => {
    const creatures = Array.from({ length: 10 }, (_, i) =>
      makeCreature(`c${i}`, i < 5 ? "compi" : "flikk", [3, 3, 3, 3])
    );
    const state = makeState({
      collection: creatures,
      nearby: SLOT_IDS.map((_, i) => ({
        id: `n${i}`,
        speciesId: "compi",
        name: `Wild compi ${i}`,
        slots: SLOT_IDS.map((slotId) => ({
          slotId,
          variantId: `trait_${slotId}_r1`,
          color: "white" as const,
        })),
        spawnedAt: Date.now(),
      })),
      batch: { attemptsRemaining: 3, failPenalty: 0, spawnedAt: Date.now() },
      gold: 200,
    });
    const context = buildAdvisorContext("scan", {}, state);
    expect(context.suggestedActions.length).toBeLessThanOrEqual(5);
  });

  test("progress xpPercent is 0 at start of level", () => {
    const state = makeState();
    state.profile.xp = 0;
    const progress = getProgressInfo(state);
    expect(progress.xpPercent).toBe(0);
  });
});
```

- [ ] **Step 2: Run integration test**

Run: `npx jest tests/engine/advisor-integration.test.ts`
Expected: all tests pass.

- [ ] **Step 3: Run full test suite**

Run: `npx jest`
Expected: all tests pass.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add tests/engine/advisor-integration.test.ts
git commit -m "test: add advisor integration tests for mid-game scenarios, mode triggers, and edge cases"
```

---

## Task 11: Final Cleanup and Verification

**Files:**
- Verify all modified files compile
- Run full test suite
- Verify SKILL.md files are syntactically valid

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: succeeds with no errors.

- [ ] **Step 2: Full test suite**

Run: `npx jest`
Expected: all tests pass.

- [ ] **Step 3: Verify SKILL.md files have valid frontmatter**

Manually inspect that each SKILL.md has valid `---` frontmatter with `name`, `description`, and optionally `model` fields.

- [ ] **Step 4: Verify advisor context shows in MCP tool responses**

Run a quick manual test:

```bash
node scripts/tick-hook.js
node -e "
  const { loadEngine } = require('./scripts/mcp-server.js');
  // or test via CLI:
" 2>/dev/null || true
```

Or test via CLI:

```bash
node dist/cli.js scan --json | node -e "
  const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf-8'));
  console.log('Has advisor context:', !!data);
"
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final build verification for AI advisor & UX layer"
```

---

## Summary

### What this plan creates:

| Component | File | Purpose |
|---|---|---|
| Advisor types | `src/types.ts` | `SuggestedAction`, `ProgressInfo`, `AdvisorContext`, `ActionMenuEntry` |
| Advisor engine | `src/engine/advisor.ts` | `getProgressInfo`, `getViableActions`, `getAdvisorMode`, `getSuggestedActions`, `buildAdvisorContext` |
| Renderer methods | `src/renderers/simple-text.ts` | `renderStatusBar`, `renderActionMenu`, `renderProgressPanel` |
| MCP integration | `src/mcp-tools.ts` | All tools return `<advisor_context>` alongside ANSI display |
| CLI integration | `src/cli.ts` | Status bar + action menu printed after every command |
| Narrator skills | `skills/*/SKILL.md` | Claude reads advisor context and narrates with game personality |
| Tests | `tests/engine/advisor.test.ts` | Full TDD coverage for advisor logic |
| Integration tests | `tests/engine/advisor-integration.test.ts` | Scenario-based tests for advisor behavior |

### Task dependency graph:

```
Task 1 (types) ─────────────────────────────────────────────┐
                                                            │
Task 2 (progress info) ──── Task 3 (viable actions) ───┐   │
                                                       │   │
                            Task 4 (mode + ranking) ───┤   │
                                                       │   │
                            Task 5 (context builder) ──┤   │
                                                       │   │
Task 6 (renderer) ─────────────────────────────────────┤   │
                                                       │   │
Task 7 (MCP tools) ────────────────────────────────────┤   │
                                                       │   │
Task 8 (SKILL.md narrator) ───────────────────────────┤   │
                                                       │   │
Task 9 (CLI advisor) ──────────────────────────────────┤   │
                                                       │   │
Task 10 (integration tests) ───────────────────────────┘   │
                                                            │
Task 11 (final verification) ───────────────────────────────┘
```

Tasks 1-5 are sequential (each builds on the previous). Tasks 6-9 can be parallelized after Task 5. Task 10 depends on all prior tasks. Task 11 is the final gate.

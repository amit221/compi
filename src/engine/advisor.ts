import {
  GameState,
  ProgressInfo,
  SuggestedAction,
  AdvisorMode,
  AdvisorContext,
  SlotId,
  CollectionCreature,
  CatchResult,
  UpgradeResult,
  MAX_COLLECTION_SIZE,
} from "../types";
import { loadConfig } from "../config/loader";
import { getXpForNextLevel } from "./progression";

/**
 * Rarity tier boundaries by rank. Matches the spec:
 *   0-4:   Common
 *   5-8:   Uncommon
 *   9-11:  Rare
 *   12-14: Epic
 *   15-16: Legendary
 *   17-18: Mythic
 */
const TIER_BOUNDARIES = [0, 5, 9, 12, 15, 17];
const TIER_NAMES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

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
    const lvl = unlockLevel as number;
    if (lvl > state.profile.level && lvl < closestUnlockLevel) {
      closestUnlockLevel = lvl;
      nextSpeciesUnlock = { species, level: lvl };
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
          priority: 0,
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
  // Quest return is always autopilot
  if (action === "quest_complete") return "autopilot";

  // New species discovery triggers advisor
  if (action === "catch") {
    const catchResult = result as CatchResult;
    if (catchResult.success) {
      const speciesId = catchResult.creature.speciesId;

      // Species just caught was not previously discovered
      if (!state.discoveredSpecies.includes(speciesId)) {
        return "advisor";
      }

      // Merge available: 2+ of same species in collection
      const sameSpeciesCount = state.collection.filter(
        (c) => c.speciesId === speciesId && !c.archived
      ).length;
      if (sameSpeciesCount >= 2) return "advisor";
    }
  }

  // Post-upgrade: check if any trait is near a tier threshold
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

  // Low energy -- always surface advisor so player knows energy is scarce
  if (state.energy <= 2) {
    return "advisor";
  }

  // Collection full
  if (state.collection.filter((c) => !c.archived).length >= MAX_COLLECTION_SIZE) {
    return "advisor";
  }

  // Level up
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

  // Merge is top priority when available (combines creatures for power)
  if (action.type === "merge") score = 5;

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

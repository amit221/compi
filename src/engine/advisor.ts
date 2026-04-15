import {
  GameState,
  ProgressInfo,
  SuggestedAction,
  AdvisorMode,
  AdvisorContext,
  CollectionCreature,
  CatchResult,
  MAX_COLLECTION_SIZE,
} from "../types";
import { loadConfig } from "../config/loader";
import { getXpForNextLevel } from "./progression";
import { MAX_ENERGY } from "./energy";
import { extractRank, getTierName, getNextTierBoundary } from "./tiers";

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
    collectionSize: state.collection.filter((c) => !c.archived).length,
    collectionMax: MAX_COLLECTION_SIZE,
    energy: state.energy,
    energyMax: MAX_ENERGY,
    discoveredCount: state.discoveredSpecies.length,
    totalSpecies,
    speciesProgress: state.speciesProgress,
  };
}

/**
 * Calculate all viable actions the player can take right now.
 * Each action includes type, label, cost, and reasoning.
 * Pure function -- reads state, returns action list.
 */
export function getViableActions(state: GameState): SuggestedAction[] {
  const actions: SuggestedAction[] = [];

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

  // --- Breed actions (one per same-species pair) ---
  const speciesGroups: Record<string, number[]> = {};
  for (let ci = 0; ci < state.collection.length; ci++) {
    const creature = state.collection[ci];
    if (creature.archived) continue;
    if (!speciesGroups[creature.speciesId]) speciesGroups[creature.speciesId] = [];
    speciesGroups[creature.speciesId].push(ci);
  }
  for (const [speciesId, indexes] of Object.entries(speciesGroups)) {
    if (indexes.length < 2) continue;
    const sorted = [...indexes].sort((a, b) => {
      const powerA = state.collection[a].slots.reduce((s, sl) => s + extractRank(sl.variantId), 0);
      const powerB = state.collection[b].slots.reduce((s, sl) => s + extractRank(sl.variantId), 0);
      return powerB - powerA;
    });
    const ai = sorted[0];
    const bi = sorted[1];
    actions.push({
      type: "breed",
      label: `Breed ${state.collection[ai].name} + ${state.collection[bi].name}`,
      cost: {},
      priority: 0,
      reasoning: `${indexes.length} ${speciesId} available for breeding`,
      target: { creatureIndex: ai + 1, partnerIndex: bi + 1 },
    });
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
 */
export function getAdvisorMode(
  action: string,
  result: unknown,
  state: GameState
): AdvisorMode {
  // New species discovery triggers advisor
  if (action === "catch") {
    const catchResult = result as CatchResult;
    if (catchResult.success) {
      const speciesId = catchResult.creature.speciesId;

      // Species just caught was not previously discovered
      if (!state.discoveredSpecies.includes(speciesId)) {
        return "advisor";
      }

      // Breed available: 2+ non-archived creatures in collection (any species can breed)
      const breedableCount = state.collection.filter((c) => !c.archived).length;
      if (breedableCount >= 2) return "advisor";
    }
  }

  // Post-breed is always advisor (significant moment)
  if (action === "breed") return "advisor";

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
  _lastResult: unknown,
  state: GameState
): number {
  let score = 50; // base score

  // Breed is top priority when available
  if (action.type === "breed") score = 5;

  // After scan, catching is the natural next step
  if (action.type === "catch" && lastAction === "scan") score = 5;

  // After catch, more catches if batch remains
  if (action.type === "catch" && lastAction === "catch") score = 15;

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

import {
  GameState,
  CompanionOverview,
  NearbyHighlight,
  UpgradeOpportunity,
  BreedablePair,
  SlotId,
} from "../types";
import { getProgressInfo, getSuggestedActions } from "./advisor";
import { calculateCatchRate, calculateEnergyCost } from "./catch";
import { calculateSlotScore } from "./rarity";
import { loadConfig } from "../config/loader";

function extractRank(variantId: string): number {
  const m = variantId.match(/_r(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

const TIER_BOUNDARIES = [0, 5, 9, 12, 15, 17];
const TIER_NAMES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

function getTierName(rank: number): string {
  for (let i = TIER_BOUNDARIES.length - 1; i >= 0; i--) {
    if (rank >= TIER_BOUNDARIES[i]) return TIER_NAMES[i];
  }
  return "common";
}

function getNextTierBoundary(rank: number): number | null {
  for (const boundary of TIER_BOUNDARIES) {
    if (boundary > rank) return boundary;
  }
  return null;
}

export function getCompanionOverview(state: GameState): CompanionOverview {
  const config = loadConfig();
  const progress = getProgressInfo(state);
  const suggestedActions = getSuggestedActions("companion", null, state);

  // --- Nearby highlights ---
  const nearbyHighlights: NearbyHighlight[] = state.nearby.map((creature, i) => {
    const totalRarity = creature.slots.reduce((sum, slot) => {
      return sum + calculateSlotScore(creature.speciesId, slot);
    }, 0);
    return {
      index: i + 1,
      name: creature.name,
      speciesId: creature.speciesId,
      isNewSpecies: !state.discoveredSpecies.includes(creature.speciesId),
      catchRate: calculateCatchRate(creature.speciesId, creature.slots, state.batch?.failPenalty ?? 0),
      energyCost: calculateEnergyCost(creature.speciesId, creature.slots),
      totalRarity,
    };
  });

  // --- Breedable pairs ---
  const breedablePairs: BreedablePair[] = [];
  const questCreatureIds = state.activeQuest?.creatureIds ?? [];
  const speciesGroups: Record<string, number[]> = {};
  for (let i = 0; i < state.collection.length; i++) {
    const c = state.collection[i];
    if (c.archived || questCreatureIds.includes(c.id)) continue;
    if (!speciesGroups[c.speciesId]) speciesGroups[c.speciesId] = [];
    speciesGroups[c.speciesId].push(i);
  }
  for (const [speciesId, indexes] of Object.entries(speciesGroups)) {
    if (indexes.length < 2) continue;
    const a = indexes[0];
    const b = indexes[1];
    breedablePairs.push({
      indexA: a + 1,
      nameA: state.collection[a].name,
      indexB: b + 1,
      nameB: state.collection[b].name,
      speciesId,
    });
  }

  // --- Upgrade opportunities ---
  const upgradeOpportunities: UpgradeOpportunity[] = [];
  if (state.sessionUpgradeCount < config.upgrade.sessionCap) {
    for (const creature of state.collection) {
      if (creature.archived || questCreatureIds.includes(creature.id)) continue;
      for (const slot of creature.slots) {
        const rank = extractRank(slot.variantId);
        if (rank >= config.upgrade.maxRank) continue;
        const cost = config.upgrade.costs[rank];
        if (cost === undefined || state.gold < cost) continue;
        const nextBoundary = getNextTierBoundary(rank);
        const nearTier = nextBoundary !== null && nextBoundary - rank === 1;
        upgradeOpportunities.push({
          creatureId: creature.id,
          creatureName: creature.name,
          slotId: slot.slotId as SlotId,
          currentRank: rank,
          goldCost: cost,
          nearTier,
          tierName: getTierName(rank),
        });
      }
    }
  }
  upgradeOpportunities.sort((a, b) => {
    if (a.nearTier !== b.nearTier) return a.nearTier ? -1 : 1;
    return a.goldCost - b.goldCost;
  });

  // --- Quest status ---
  const availableCreatures = state.collection.filter(
    (c) => !c.archived && !questCreatureIds.includes(c.id)
  );
  let questStatus: CompanionOverview["questStatus"];
  if (state.activeQuest) {
    questStatus = state.activeQuest.sessionsRemaining <= 0 ? "complete" : "in_progress";
  } else if (availableCreatures.length > 0) {
    questStatus = "available";
  } else {
    questStatus = "no_creatures";
  }

  return {
    progress,
    nearbyHighlights,
    breedablePairs,
    upgradeOpportunities: upgradeOpportunities.slice(0, 5),
    questStatus,
    questSessionsRemaining: state.activeQuest?.sessionsRemaining ?? null,
    suggestedActions,
  };
}

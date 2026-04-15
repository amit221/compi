// src/engine/breed.ts — breeding system (replaces sacrifice merge)

import {
  GameState,
  CollectionCreature,
  CreatureSlot,
  SlotId,
  SLOT_IDS,
  SlotInheritance,
  BreedPreview,
  BreedResult,
  TraitDefinition,
  BreedableEntry,
  BreedablePartner,
  BreedPartnersView,
  BreedTable,
  BreedTableSpecies,
  BreedTableRow,
} from "../types";
import { loadConfig } from "../config/loader";
import { getSpeciesById, getTraitDefinition } from "../config/species";
import { grantXp } from "./progression";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Extract rank from a variant id (e.g. "eye_c01_r3" → 3, "eye_c01" → 0).
 */
function extractRank(variantId: string): number {
  const m = variantId.match(/_r(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * Get the rarity tier name for a given spawnRate.
 * Tiers are sorted descending by minSpawnRate in config.
 */
function getRarityTier(spawnRate: number): string {
  const tiers = loadConfig().breed.rarityTiers;
  for (const tier of tiers) {
    if (spawnRate >= tier.minSpawnRate) {
      return tier.name;
    }
  }
  return tiers[tiers.length - 1].name;
}

/**
 * Calculate rank-based inheritance probability for one slot.
 * Higher-rank trait gets 60-85% chance. Equal ranks get 50/50.
 * Returns { chanceA, chanceB } where chanceA + chanceB = 1.
 *
 * Optional synergyBoost (0-1 fraction of max synergy bonus) adds
 * to the higher-rank trait's advantage.
 */
export function calculateInheritance(
  speciesId: string,
  variantIdA: string,
  variantIdB: string,
  synergyBoost: number = 0
): { chanceA: number; chanceB: number } {
  // If both parents have the same variant, it's 100% that variant
  if (variantIdA === variantIdB) {
    return { chanceA: 1, chanceB: 0 };
  }

  const traitA = getTraitDefinition(speciesId, variantIdA);
  const traitB = getTraitDefinition(speciesId, variantIdB);

  if (!traitA || !traitB) {
    throw new Error(
      `Trait not found: ${!traitA ? variantIdA : variantIdB} for species ${speciesId}`
    );
  }

  const cfg = loadConfig().breed;
  const rankA = extractRank(variantIdA);
  const rankB = extractRank(variantIdB);
  const rankDiff = Math.abs(rankA - rankB);

  // Base advantage from rank difference, capped at maxAdvantage
  const rankAdvantage = Math.min(rankDiff * cfg.rankDiffScale, cfg.maxAdvantage);
  // Synergy adds up to synergyBonus on top
  const synergy = synergyBoost * cfg.synergyBonus;
  // Total advantage for the higher-rank trait
  const totalAdvantage = Math.min(rankAdvantage + synergy, cfg.maxAdvantage);

  if (rankA > rankB) {
    return { chanceA: cfg.baseChance + totalAdvantage, chanceB: cfg.baseChance - totalAdvantage };
  } else if (rankB > rankA) {
    return { chanceA: cfg.baseChance - totalAdvantage, chanceB: cfg.baseChance + totalAdvantage };
  } else {
    // Same rank — apply synergy to trait A by default (arbitrary tiebreak)
    if (synergy > 0) {
      return { chanceA: cfg.baseChance + synergy, chanceB: cfg.baseChance - synergy };
    }
    return { chanceA: 0.5, chanceB: 0.5 };
  }
}

/**
 * Calculate the energy cost for a breed operation.
 * Base cost + 1 per trait with spawnRate below the rare threshold, capped at max.
 */
function calculateBreedCost(
  speciesId: string,
  parentA: CollectionCreature,
  parentB: CollectionCreature
): number {
  const energyCfg = loadConfig().energy;
  const base = energyCfg.baseMergeCost;
  const max = energyCfg.maxMergeCost;
  const threshold = energyCfg.rareThreashold;

  let rareCount = 0;
  for (const parent of [parentA, parentB]) {
    for (const slot of parent.slots) {
      const trait = getTraitDefinition(speciesId, slot.variantId);
      if (trait && trait.spawnRate < threshold) {
        rareCount++;
      }
    }
  }

  return Math.min(base + rareCount, max);
}

/**
 * Validate that two creatures can breed.
 * Throws descriptive errors on failure.
 */
function validateBreedPair(
  state: GameState,
  parentAId: string,
  parentBId: string
): { parentA: CollectionCreature; parentB: CollectionCreature } {
  if (parentAId === parentBId) {
    throw new Error("Cannot breed a creature with itself.");
  }

  const parentA = state.collection.find((c) => c.id === parentAId);
  const parentB = state.collection.find((c) => c.id === parentBId);

  if (!parentA) throw new Error(`Creature not found: ${parentAId}`);
  if (!parentB) throw new Error(`Creature not found: ${parentBId}`);

  if (parentA.archived) throw new Error(`Creature is archived: ${parentAId}`);
  if (parentB.archived) throw new Error(`Creature is archived: ${parentBId}`);

  if (parentA.speciesId !== parentB.speciesId) {
    throw new Error(
      `Cannot breed different species: ${parentA.speciesId} and ${parentB.speciesId}`
    );
  }

  return { parentA, parentB };
}

/**
 * Calculate synergy boost for a given slot based on how many OTHER slots
 * have both parents sharing the same rarity tier.
 * Returns a 0-1 fraction (0 = no synergy, 1 = all other slots match).
 */
function calculateSynergyBoost(
  speciesId: string,
  currentSlotId: SlotId,
  parentA: CollectionCreature,
  parentB: CollectionCreature,
  speciesSlots: SlotId[]
): number {
  const otherSlots = speciesSlots.filter((s) => s !== currentSlotId);
  if (otherSlots.length === 0) return 0;

  let matches = 0;
  for (const slotId of otherSlots) {
    const slotA = parentA.slots.find((s) => s.slotId === slotId);
    const slotB = parentB.slots.find((s) => s.slotId === slotId);
    if (!slotA || !slotB) continue;

    const traitA = getTraitDefinition(speciesId, slotA.variantId);
    const traitB = getTraitDefinition(speciesId, slotB.variantId);
    if (!traitA || !traitB) continue;

    if (getRarityTier(traitA.spawnRate) === getRarityTier(traitB.spawnRate)) {
      matches++;
    }
  }

  return matches / otherSlots.length;
}

/**
 * Build slot inheritance data for all slots.
 */
function buildSlotInheritance(
  speciesId: string,
  parentA: CollectionCreature,
  parentB: CollectionCreature
): SlotInheritance[] {
  const species = getSpeciesById(speciesId);
  const speciesSlots = species
    ? (Object.keys(species.traitPools) as SlotId[])
    : SLOT_IDS;

  return speciesSlots.map((slotId) => {
    const slotA = parentA.slots.find((s) => s.slotId === slotId);
    const slotB = parentB.slots.find((s) => s.slotId === slotId);

    if (!slotA || !slotB) {
      throw new Error(`Missing slot ${slotId} on parent`);
    }

    const traitA = getTraitDefinition(speciesId, slotA.variantId);
    const traitB = getTraitDefinition(speciesId, slotB.variantId);

    if (!traitA || !traitB) {
      throw new Error(
        `Trait definition not found for slot ${slotId}`
      );
    }

    const synergyBoost = calculateSynergyBoost(
      speciesId,
      slotId,
      parentA,
      parentB,
      speciesSlots
    );

    const { chanceA, chanceB } = calculateInheritance(
      speciesId,
      slotA.variantId,
      slotB.variantId,
      synergyBoost
    );

    return {
      slotId,
      parentAVariant: traitA,
      parentBVariant: traitB,
      parentAChance: chanceA,
      parentBChance: chanceB,
    };
  });
}

/**
 * Preview a breed: returns inheritance odds and energy cost without mutating state.
 */
export function previewBreed(
  state: GameState,
  parentAId: string,
  parentBId: string
): BreedPreview {
  const { parentA, parentB } = validateBreedPair(state, parentAId, parentBId);
  const speciesId = parentA.speciesId;
  const slotInheritance = buildSlotInheritance(speciesId, parentA, parentB);
  const energyCost = calculateBreedCost(speciesId, parentA, parentB);
  const parentAIndex = state.collection.indexOf(parentA) + 1;
  const parentBIndex = state.collection.indexOf(parentB) + 1;

  return { parentA, parentB, parentAIndex, parentBIndex, slotInheritance, energyCost };
}

/**
 * Execute a breed:
 * 1. Validate parents
 * 2. Check energy
 * 3. Resolve each slot via weighted random
 * 4. Build child creature
 * 5. Remove both parents, add child, spend energy
 */
export function executeBreed(
  state: GameState,
  parentAId: string,
  parentBId: string,
  rng: () => number = Math.random
): BreedResult {
  const { parentA, parentB } = validateBreedPair(state, parentAId, parentBId);
  const speciesId = parentA.speciesId;
  const slotInheritance = buildSlotInheritance(speciesId, parentA, parentB);
  const energyCost = calculateBreedCost(speciesId, parentA, parentB);

  if (state.energy < energyCost) {
    throw new Error(
      `Not enough energy: have ${state.energy}, need ${energyCost}`
    );
  }

  // Resolve each slot
  const childSlots: CreatureSlot[] = [];
  const inheritedFrom: Record<string, "A" | "B"> = {};

  for (const si of slotInheritance) {
    const roll = rng();
    const fromA = roll < si.parentAChance;
    const chosenVariant = fromA ? si.parentAVariant : si.parentBVariant;
    const parentSlot = fromA
      ? parentA.slots.find((s) => s.slotId === si.slotId)!
      : parentB.slots.find((s) => s.slotId === si.slotId)!;

    childSlots.push({
      slotId: si.slotId,
      variantId: chosenVariant.id,
      color: parentSlot.color,
    });
    inheritedFrom[si.slotId] = fromA ? "A" : "B";
  }

  const config = loadConfig();

  // --- Guaranteed +1 upgrade to one random trait ---
  const upgradeIndex = Math.floor(rng() * childSlots.length);
  const upgradeSlot = childSlots[upgradeIndex];
  const upgradeRankMatch = upgradeSlot.variantId.match(/_r(\d+)$/);
  if (upgradeRankMatch) {
    const currentRank = parseInt(upgradeRankMatch[1], 10);
    upgradeSlot.variantId = upgradeSlot.variantId.replace(
      /_r\d+$/,
      `_r${currentRank + 1}`
    );
  }

  // --- 30% chance to downgrade one other random trait ---
  if (rng() < config.breed.downgradeChance && childSlots.length > 1) {
    // Pick a different slot than the one just upgraded
    const otherIndices = childSlots
      .map((_, i) => i)
      .filter((i) => i !== upgradeIndex);
    const pick = Math.floor(rng() * otherIndices.length);
    const downgradeIndex = otherIndices[pick];
    const downgradeSlot = childSlots[downgradeIndex];
    const downgradeRankMatch = downgradeSlot.variantId.match(/_r(\d+)$/);
    if (downgradeRankMatch) {
      const currentRank = parseInt(downgradeRankMatch[1], 10);
      if (currentRank > 0) {
        downgradeSlot.variantId = downgradeSlot.variantId.replace(
          /_r\d+$/,
          `_r${currentRank - 1}`
        );
      }
    }
  }

  // Build child
  const child: CollectionCreature = {
    id: generateId(),
    speciesId,
    name: parentA.name,
    slots: childSlots,
    caughtAt: Date.now(),
    generation:
      Math.max(parentA.generation, parentB.generation) + 1,
    mergedFrom: [parentAId, parentBId],
    archived: false,
  };

  // Mutate state
  state.collection = state.collection.filter(
    (c) => c.id !== parentAId && c.id !== parentBId
  );
  state.collection.push(child);
  state.energy -= energyCost;
  state.profile.totalMerges += 1;
  grantXp(state, config.leveling.xpPerMerge);

  return {
    child,
    parentA,
    parentB,
    inheritedFrom: inheritedFrom as Record<SlotId, "A" | "B">,
    isCrossSpecies: false,
    upgrades: [],
  };
}

/**
 * List creatures from the collection that have at least one valid breeding partner
 * (same species, both non-archived, not themselves). Each entry uses a 1-indexed
 * position matching the creature's raw position in `state.collection`.
 */
export function listBreedable(state: GameState): BreedableEntry[] {
  const entries: BreedableEntry[] = [];

  for (let i = 0; i < state.collection.length; i++) {
    const creature = state.collection[i];
    if (creature.archived) continue;

    let partnerCount = 0;
    for (let j = 0; j < state.collection.length; j++) {
      if (i === j) continue;
      const candidate = state.collection[j];
      if (candidate.archived) continue;
      if (candidate.speciesId !== creature.speciesId) continue;
      partnerCount++;
    }

    if (partnerCount > 0) {
      entries.push({
        creatureIndex: i + 1,
        creature,
        partnerCount,
      });
    }
  }

  return entries;
}

/**
 * For a creature at the given 1-indexed collection position, return it and
 * its list of compatible (same-species, non-archived, non-self) partners with
 * each partner's 1-indexed collection position and the energy cost to breed.
 *
 * Throws on out-of-range or archived selection.
 */
export function listPartnersFor(
  state: GameState,
  creatureIndex: number
): BreedPartnersView {
  if (creatureIndex < 1 || creatureIndex > state.collection.length) {
    throw new Error(
      `No creature at index ${creatureIndex}. You have ${state.collection.length} creatures.`
    );
  }

  const creature = state.collection[creatureIndex - 1];
  if (creature.archived) {
    throw new Error(
      `Creature at index ${creatureIndex} is archived and cannot breed.`
    );
  }

  const partners: BreedablePartner[] = [];
  for (let j = 0; j < state.collection.length; j++) {
    if (j === creatureIndex - 1) continue;
    const candidate = state.collection[j];
    if (candidate.archived) continue;
    if (candidate.speciesId !== creature.speciesId) continue;

    // Reuse previewBreed just for the energy cost. This also validates the pair.
    const preview = previewBreed(state, creature.id, candidate.id);
    partners.push({
      partnerIndex: j + 1,
      creature: candidate,
      energyCost: preview.energyCost,
    });
  }

  return { creatureIndex, creature, partners };
}

/**
 * Build the data for the /breed top-level view: creatures grouped by species,
 * only including species with >= 2 non-archived members. Each species entry
 * carries a "silhouette" (the slots of the first non-archived creature of that
 * species) which the renderer draws in a single neutral grey to the left of
 * the table.
 */
export function buildBreedTable(state: GameState): BreedTable {
  // Preserve first-encountered species order
  const speciesOrder: string[] = [];
  const bySpecies = new Map<string, BreedTableRow[]>();
  const silhouetteBy = new Map<string, CreatureSlot[]>();

  for (let i = 0; i < state.collection.length; i++) {
    const creature = state.collection[i];
    if (creature.archived) continue;

    if (!bySpecies.has(creature.speciesId)) {
      bySpecies.set(creature.speciesId, []);
      speciesOrder.push(creature.speciesId);
      silhouetteBy.set(creature.speciesId, creature.slots);
    }
    bySpecies.get(creature.speciesId)!.push({
      creatureIndex: i + 1,
      creature,
    });
  }

  const species: BreedTableSpecies[] = [];
  for (const speciesId of speciesOrder) {
    const rows = bySpecies.get(speciesId)!;
    if (rows.length < 2) continue;
    species.push({
      speciesId,
      silhouette: silhouetteBy.get(speciesId)!,
      rows,
    });
  }

  return { species };
}

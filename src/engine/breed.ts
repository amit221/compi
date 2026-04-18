// src/engine/breed.ts — breeding system (overhaul: parents survive, rarity upgrades, cross-species)

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
  RARITY_COLORS,
} from "../types";
import { loadConfig } from "../config/loader";
import { getSpeciesById, getTraitDefinition } from "../config/species";
import { loadCreatureName } from "../config/traits";
import { spendEnergy } from "./energy";
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
 * Base cost (from config.breed.baseCost, fallback 3) + 1 per trait slot where
 * rarity >= 1 (uncommon or higher), across both parents (8 slots total).
 * Capped at config.breed.maxBreedCost (default 11).
 */
export function calculateBreedCost(
  parentA: CollectionCreature,
  parentB: CollectionCreature
): number {
  const cfg = loadConfig().breed;
  const base = cfg.baseCost ?? 3;
  const max = cfg.maxBreedCost ?? 11;

  let uncommonCount = 0;
  for (const parent of [parentA, parentB]) {
    for (const slot of parent.slots) {
      const rarity = slot.rarity ?? 0;
      if (rarity >= 1) {
        uncommonCount++;
      }
    }
  }

  return Math.min(base + uncommonCount, max);
}

/**
 * Resolve a single trait slot for a child.
 * - Same variantId: child gets that variant; upgrade chance depends on whether parents share rarity.
 * - Different variantId: 50/50 pick (rng < 0.5 = slotA); upgrade chance depends on species match.
 * Rarity is capped at maxRarity. Color is set from RARITY_COLORS[rarity].
 */
function resolveSlot(
  slotA: CreatureSlot,
  slotB: CreatureSlot,
  sameSpecies: boolean,
  rng: () => number,
  maxRarity: number
): { slot: CreatureSlot; upgraded: boolean; from: "A" | "B" } {
  const cfg = loadConfig().breed;
  const rarityA = slotA.rarity ?? 0;
  const rarityB = slotB.rarity ?? 0;

  let chosenVariantId: string;
  let baseRarity: number;
  let from: "A" | "B";
  let upgradeChance: number;

  if (slotA.variantId === slotB.variantId) {
    // Same variant — child gets it, chance of rarity upgrade
    chosenVariantId = slotA.variantId;
    baseRarity = Math.max(rarityA, rarityB);
    from = "A"; // same variant, attribute to A
    const sameRarity = rarityA === rarityB;
    upgradeChance = sameRarity
      ? cfg.sameTraitUpgradeChance ?? 0.35
      : cfg.sameTraitHigherParentUpgradeChance ?? 0.15;
  } else {
    // Different variant — 50/50 pick
    const pickA = rng() < 0.5;
    from = pickA ? "A" : "B";
    const chosenSlot = pickA ? slotA : slotB;
    chosenVariantId = chosenSlot.variantId;
    baseRarity = chosenSlot.rarity ?? 0;
    upgradeChance = sameSpecies
      ? cfg.diffTraitSameSpeciesUpgradeChance ?? 0.10
      : cfg.diffTraitCrossSpeciesUpgradeChance ?? 0.05;
  }

  // Roll for rarity upgrade
  const upgraded = baseRarity < maxRarity && rng() < upgradeChance;
  const finalRarity = upgraded ? Math.min(baseRarity + 1, maxRarity) : baseRarity;
  const color = RARITY_COLORS[finalRarity] ?? "grey";

  return {
    slot: {
      slotId: slotA.slotId,
      variantId: chosenVariantId,
      color,
      rarity: finalRarity,
    },
    upgraded,
    from,
  };
}

/**
 * Build a cooldown key for a pair (order-independent).
 */
function cooldownKey(idA: string, idB: string): string {
  return [idA, idB].sort().join(":");
}

/**
 * Update species progress array for a creature.
 * Ensures state.speciesProgress[creature.speciesId] exists as array of 8 booleans.
 * For each slot, marks progress[rarity] = true.
 */
export function updateSpeciesProgress(state: GameState, creature: CollectionCreature): void {
  const sid = creature.speciesId;
  if (!state.speciesProgress[sid]) {
    state.speciesProgress[sid] = new Array(8).fill(false);
  }
  for (const slot of creature.slots) {
    const rarity = slot.rarity ?? 0;
    if (rarity >= 0 && rarity < state.speciesProgress[sid].length) {
      state.speciesProgress[sid][rarity] = true;
    }
  }
}

/**
 * Execute a breed:
 * 1. Validate parents (not self, not archived, session limit, cooldown, energy, collection space)
 * 2. Calculate and spend energy
 * 3. Resolve each slot independently via resolveSlot
 * 4. Build child creature (parents survive)
 * 5. Push child to collection, increment counters, set cooldown
 * 6. Grant XP (more for hybrid)
 */
export function executeBreed(
  state: GameState,
  parentAId: string,
  parentBId: string,
  rng: () => number = Math.random
): BreedResult {
  if (parentAId === parentBId) {
    throw new Error("Cannot breed a creature with itself.");
  }

  const parentA = state.collection.find((c) => c.id === parentAId && !c.archived);
  const parentB = state.collection.find((c) => c.id === parentBId && !c.archived);

  if (!parentA) throw new Error(`Creature not found: ${parentAId}`);
  if (!parentB) throw new Error(`Creature not found: ${parentBId}`);

  const config = loadConfig();
  const maxBreedsPerSession = config.breed.maxBreedsPerSession ?? 3;

  if (state.sessionBreedCount >= maxBreedsPerSession) {
    throw new Error(
      `Session breed limit reached (${maxBreedsPerSession} per session).`
    );
  }

  const pairKey = cooldownKey(parentAId, parentBId);
  const cooldownUntil = state.breedCooldowns[pairKey] ?? 0;
  const now = Date.now();
  if (now < cooldownUntil) {
    const remaining = Math.ceil((cooldownUntil - now) / 60000);
    throw new Error(
      `This pair is on cooldown for ${remaining} more minute(s).`
    );
  }

  const energyCost = calculateBreedCost(parentA, parentB);
  if (state.energy < energyCost) {
    throw new Error(
      `Not enough energy: have ${state.energy}, need ${energyCost}`
    );
  }

  const isCrossSpecies = parentA.speciesId !== parentB.speciesId;

  // Get max rarity cap from leveling config
  const rarityBreedCaps = config.leveling.rarityBreedCaps ?? config.leveling.traitRankCaps;
  const levelIndex = Math.min(state.profile.level - 1, rarityBreedCaps.length - 1);
  const maxRarity = rarityBreedCaps[levelIndex] ?? 7;

  // Determine which slots to resolve (union of slots from both parents)
  const slotIds: SlotId[] = [];
  const speciesA = getSpeciesById(parentA.speciesId);
  const poolKeys = speciesA ? Object.keys(speciesA.traitPools) as SlotId[] : [];
  if (poolKeys.length > 0) {
    slotIds.push(...poolKeys);
  } else {
    // Hybrid species have empty traitPools — use all standard slots
    slotIds.push(...SLOT_IDS);
  }

  const childSlots: CreatureSlot[] = [];
  const inheritedFrom: Record<string, "A" | "B"> = {};
  const upgrades: { slotId: SlotId; fromRarity: number; toRarity: number }[] = [];

  for (const slotId of slotIds) {
    const slotA = parentA.slots.find((s) => s.slotId === slotId);
    const slotB = parentB.slots.find((s) => s.slotId === slotId);

    if (!slotA || !slotB) {
      // If one parent is missing this slot (cross-species), skip or use available slot
      const available = slotA ?? slotB;
      if (available) {
        childSlots.push({ ...available });
        inheritedFrom[slotId] = slotA ? "A" : "B";
      }
      continue;
    }

    const beforeRarity = Math.max(slotA.rarity ?? 0, slotB.rarity ?? 0);
    const resolved = resolveSlot(slotA, slotB, !isCrossSpecies, rng, maxRarity);
    childSlots.push(resolved.slot);
    inheritedFrom[slotId] = resolved.from;

    if (resolved.upgraded) {
      upgrades.push({
        slotId,
        fromRarity: beforeRarity,
        toRarity: resolved.slot.rarity ?? 0,
      });
    }
  }

  // Determine child speciesId
  const childSpeciesId = isCrossSpecies
    ? `hybrid_${parentA.speciesId}_${parentB.speciesId}`
    : parentA.speciesId;

  // Build child
  const child: CollectionCreature = {
    id: generateId(),
    speciesId: childSpeciesId,
    name: loadCreatureName(rng),
    slots: childSlots,
    caughtAt: now,
    generation: Math.max(parentA.generation, parentB.generation) + 1,
    mergedFrom: [parentAId, parentBId],
    archived: false,
  };

  // If cross-species, auto-register a placeholder hybrid species (if not already registered)
  if (isCrossSpecies && !state.personalSpecies.find(s => s.id === childSpeciesId)) {
    const parentASpecies = getSpeciesById(parentA.speciesId);
    const parentBSpecies = getSpeciesById(parentB.speciesId);
    const templateSpecies = parentASpecies || parentBSpecies;
    state.personalSpecies.push({
      id: childSpeciesId,
      name: `${(parentASpecies?.name ?? parentA.speciesId)}${(parentBSpecies?.name ?? parentB.speciesId)}`,
      description: `A hybrid of ${parentA.speciesId} and ${parentB.speciesId}`,
      spawnWeight: 0,
      art: templateSpecies?.art ?? ["  ???"],
      zones: templateSpecies?.zones,
      traitPools: {},
    });
  }

  // Mutate state — parents survive
  state.collection.push(child);
  spendEnergy(state, energyCost);
  state.sessionBreedCount += 1;
  state.breedCooldowns[pairKey] = now + (config.breed.cooldownMs ?? 3600000);
  state.profile.totalMerges += 1;

  // Grant XP
  const xp = isCrossSpecies
    ? (config.leveling.xpPerHybrid ?? config.leveling.xpPerMerge)
    : config.leveling.xpPerMerge;
  grantXp(state, xp);

  // Update species progress
  updateSpeciesProgress(state, child);

  return {
    child,
    parentA,
    parentB,
    inheritedFrom: inheritedFrom as Record<SlotId, "A" | "B">,
    isCrossSpecies,
    upgrades,
  };
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
 * Build slot inheritance data for all slots (used by previewBreed).
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

  return speciesSlots.map((slotId): SlotInheritance | null => {
    const slotA = parentA.slots.find((s) => s.slotId === slotId);
    const slotB = parentB.slots.find((s) => s.slotId === slotId);

    if (!slotA || !slotB) {
      // Skip slots that one parent doesn't have (e.g., whiski has no body slot)
      return null;
    }

    // Use each parent's own species for trait lookup (cross-species safe)
    const traitA = getTraitDefinition(parentA.speciesId, slotA.variantId);
    const traitB = getTraitDefinition(parentB.speciesId, slotB.variantId);

    if (!traitA || !traitB) {
      // Fallback for cross-species or missing traits
      const fallbackTrait: TraitDefinition = { id: "unknown", name: "Unknown", art: "?", spawnRate: 0.5 };
      return {
        slotId,
        parentAVariant: traitA || fallbackTrait,
        parentBVariant: traitB || fallbackTrait,
        parentAChance: 0.5,
        parentBChance: 0.5,
      };
    }

    const isCrossSpecies = parentA.speciesId !== parentB.speciesId;
    let chanceA: number, chanceB: number;

    if (isCrossSpecies) {
      // Cross-species: simple 50/50, no synergy
      chanceA = 0.5;
      chanceB = 0.5;
    } else {
      const synergyBoost = calculateSynergyBoost(
        speciesId,
        slotId,
        parentA,
        parentB,
        speciesSlots
      );
      const result = calculateInheritance(
        speciesId,
        slotA.variantId,
        slotB.variantId,
        synergyBoost
      );
      chanceA = result.chanceA;
      chanceB = result.chanceB;
    }

    return {
      slotId,
      parentAVariant: traitA,
      parentBVariant: traitB,
      parentAChance: chanceA,
      parentBChance: chanceB,
    };
  }).filter((x): x is SlotInheritance => x !== null);
}

/**
 * Preview a breed: returns inheritance odds and energy cost without mutating state.
 * Any creature can breed with any creature (cross-species creates hybrids).
 */
export function previewBreed(
  state: GameState,
  parentAId: string,
  parentBId: string
): BreedPreview {
  if (parentAId === parentBId) {
    throw new Error("Cannot breed a creature with itself.");
  }

  const parentA = state.collection.find((c) => c.id === parentAId);
  const parentB = state.collection.find((c) => c.id === parentBId);

  if (!parentA) throw new Error(`Creature not found: ${parentAId}`);
  if (!parentB) throw new Error(`Creature not found: ${parentBId}`);

  if (parentA.archived) throw new Error(`Creature is archived: ${parentAId}`);
  if (parentB.archived) throw new Error(`Creature is archived: ${parentBId}`);

  const speciesId = parentA.speciesId;
  const slotInheritance = buildSlotInheritance(speciesId, parentA, parentB);
  const energyCost = calculateBreedCost(parentA, parentB);
  const parentAIndex = state.collection.indexOf(parentA) + 1;
  const parentBIndex = state.collection.indexOf(parentB) + 1;

  return { parentA, parentB, parentAIndex, parentBIndex, slotInheritance, energyCost };
}

/**
 * List ALL non-archived creatures that have at least one other non-archived creature
 * to breed with (any species — cross-species breeding is allowed).
 * Each entry uses a 1-indexed position matching the creature's raw position in
 * `state.collection`.
 */
export function listBreedable(state: GameState): BreedableEntry[] {
  const nonArchivedIndices: number[] = [];
  for (let i = 0; i < state.collection.length; i++) {
    if (!state.collection[i].archived) {
      nonArchivedIndices.push(i);
    }
  }

  const entries: BreedableEntry[] = [];
  for (const i of nonArchivedIndices) {
    const creature = state.collection[i];
    // Partner count = all other non-archived creatures
    const partnerCount = nonArchivedIndices.length - 1;
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
 * its list of compatible (non-archived, non-self) partners with each partner's
 * 1-indexed collection position and the energy cost to breed.
 * Cross-species partners are included. Cooldown status is reflected in energyCost
 * (cooldown is noted but does not change energyCost display).
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

  const now = Date.now();
  const partners: BreedablePartner[] = [];
  for (let j = 0; j < state.collection.length; j++) {
    if (j === creatureIndex - 1) continue;
    const candidate = state.collection[j];
    if (candidate.archived) continue;

    const energyCost = calculateBreedCost(creature, candidate);
    partners.push({
      partnerIndex: j + 1,
      creature: candidate,
      energyCost,
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

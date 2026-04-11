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
} from "../types";
import { loadConfig } from "../config/loader";
import { getSpeciesById, getTraitDefinition } from "../config/species";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Calculate the raw inheritance pass chance for a trait based on its spawn rate.
 * Rarer traits (lower spawn rate) get a slightly higher chance.
 */
function traitPassChance(spawnRate: number): number {
  const cfg = loadConfig().breed;
  const raw =
    cfg.inheritanceBase +
    (cfg.referenceSpawnRate - spawnRate) * cfg.inheritanceRarityScale;
  return Math.max(cfg.inheritanceMin, Math.min(cfg.inheritanceMax, raw));
}

/**
 * Calculate normalized inheritance probabilities for one slot.
 * Returns { chanceA, chanceB } where chanceA + chanceB = 1.
 */
export function calculateInheritance(
  speciesId: string,
  variantIdA: string,
  variantIdB: string
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

  const rawA = traitPassChance(traitA.spawnRate);
  const rawB = traitPassChance(traitB.spawnRate);
  const total = rawA + rawB;

  return {
    chanceA: rawA / total,
    chanceB: rawB / total,
  };
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
 * Build slot inheritance data for all 4 slots.
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

    const { chanceA, chanceB } = calculateInheritance(
      speciesId,
      slotA.variantId,
      slotB.variantId
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

  return {
    child,
    parentA,
    parentB,
    inheritedFrom: inheritedFrom as Record<SlotId, "A" | "B">,
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

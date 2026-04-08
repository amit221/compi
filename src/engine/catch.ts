import { GameState, NearbyCreature, CatchResult, CreatureSlot, CollectionCreature } from "../types";
import { getTraitDefinition } from "../config/species";
import { loadConfig } from "../config/loader";
import { spendEnergy } from "./energy";

/**
 * Calculate the catch rate based on the rarest trait's spawn rate across all slots.
 *
 * Formula:
 *   rarest_trait = min(spawn_rate) across all slots
 *   catch_rate = baseCatchRate - (difficultyScale * (1 - rarest_trait / maxTraitSpawnRate)) - failPenalty
 *   clamped to [minCatchRate, maxCatchRate]
 */
export function calculateCatchRate(speciesId: string, slots: CreatureSlot[], failPenalty: number): number {
  const config = loadConfig();
  const { baseCatchRate, minCatchRate, maxCatchRate, maxTraitSpawnRate, difficultyScale } = config.catching;

  // Find rarest trait spawn rate
  let rarestRate = maxTraitSpawnRate;
  for (const slot of slots) {
    const trait = getTraitDefinition(speciesId, slot.variantId);
    if (trait && trait.spawnRate < rarestRate) {
      rarestRate = trait.spawnRate;
    }
  }

  const rate = baseCatchRate - (difficultyScale * (1 - rarestRate / maxTraitSpawnRate)) - failPenalty;
  return Math.max(minCatchRate, Math.min(maxCatchRate, rate));
}

/**
 * Calculate XP earned from catching a creature.
 * Base XP + bonus per rare trait (spawn rate < 0.05).
 */
export function calculateXpEarned(speciesId: string, slots: CreatureSlot[]): number {
  const config = loadConfig();
  let rareCount = 0;
  for (const slot of slots) {
    const trait = getTraitDefinition(speciesId, slot.variantId);
    if (trait && trait.spawnRate < 0.05) rareCount++;
  }
  return config.catching.xpBase + rareCount * config.catching.xpRarityMultiplier;
}

/**
 * Calculate energy cost to attempt catching a creature.
 * 1 + count of rare traits (spawn rate < 0.05), capped at 5.
 */
export function calculateEnergyCost(speciesId: string, slots: CreatureSlot[]): number {
  let rareCount = 0;
  for (const slot of slots) {
    const trait = getTraitDefinition(speciesId, slot.variantId);
    if (trait && trait.spawnRate < 0.05) rareCount++;
  }
  return Math.min(1 + rareCount, 5);
}

/**
 * Attempt to catch a nearby creature.
 *
 * Throws if: no active batch, no attempts remaining, invalid index, insufficient energy.
 *
 * On success: removes creature from nearby, adds to collection (generation=0, archived=false), grants XP.
 * On failure: increments failPenalty.
 * Always: spends energy, decrements attemptsRemaining.
 */
export function attemptCatch(
  state: GameState,
  nearbyIndex: number,
  rng: () => number = Math.random
): CatchResult {
  const config = loadConfig();

  if (!state.batch) {
    throw new Error("No active batch");
  }

  if (state.batch.attemptsRemaining <= 0) {
    throw new Error("No attempts remaining");
  }

  if (nearbyIndex < 0 || nearbyIndex >= state.nearby.length) {
    throw new Error("Invalid creature index");
  }

  const nearby = state.nearby[nearbyIndex];
  const energyCost = calculateEnergyCost(nearby.speciesId, nearby.slots);

  if (state.energy < energyCost) {
    throw new Error(`Not enough energy: have ${state.energy}, need ${energyCost}`);
  }

  spendEnergy(state, energyCost);
  state.batch.attemptsRemaining--;

  const catchRate = calculateCatchRate(nearby.speciesId, nearby.slots, state.batch.failPenalty);
  const roll = rng();
  const success = roll < catchRate;

  let xpEarned = 0;

  if (success) {
    state.nearby.splice(nearbyIndex, 1);
    xpEarned = calculateXpEarned(nearby.speciesId, nearby.slots);

    const collectionCreature: CollectionCreature = {
      id: nearby.id,
      speciesId: nearby.speciesId,
      name: nearby.name,
      slots: nearby.slots,
      caughtAt: Date.now(),
      generation: 0,
      archived: false,
    };
    state.collection.push(collectionCreature);

    state.profile.xp += xpEarned;
    state.profile.totalCatches++;
  } else {
    state.batch.failPenalty += config.catching.failPenaltyPerMiss;
  }

  return {
    success,
    creature: nearby,
    energySpent: energyCost,
    fled: false,
    xpEarned,
    attemptsRemaining: state.batch.attemptsRemaining,
    failPenalty: state.batch.failPenalty,
  };
}

import { GameState, NearbyCreature, CatchResult, CreatureSlot, CollectionCreature } from "../types";
import { getTraitDefinition, getTraitRank, getSpeciesById } from "../config/species";
import { loadConfig } from "../config/loader";
import { spendEnergy } from "./energy";

/**
 * Calculate catch rate using rank-based formula.
 *
 * Per-trait: traitCatchChance = 1.0 - (traitRank / maxRankInPool) * 0.50
 * Final: average of all per-trait chances - failPenalty, clamped to [min, max]
 */
export function calculateCatchRate(speciesId: string, slots: CreatureSlot[], failPenalty: number): number {
  const config = loadConfig();
  const { minCatchRate, maxCatchRate } = config.catching;
  const species = getSpeciesById(speciesId);

  let totalChance = 0;
  for (const slot of slots) {
    const rank = getTraitRank(speciesId, slot.slotId, slot.variantId);
    const poolSize = species?.traitPools[slot.slotId]?.length ?? 1;
    const maxRankInPool = Math.max(poolSize - 1, 1);
    const traitChance = 1.0 - (Math.max(rank, 0) / maxRankInPool) * 0.50;
    totalChance += traitChance;
  }

  const avgChance = slots.length > 0 ? totalChance / slots.length : 1.0;
  const cappedAvg = Math.min(avgChance, maxCatchRate);
  const rate = cappedAvg - failPenalty;
  return Math.max(minCatchRate, Math.min(maxCatchRate, rate));
}

/**
 * XP earned from catching: flat base from config.
 */
export function calculateXpEarned(_speciesId: string, _slots: CreatureSlot[]): number {
  const config = loadConfig();
  return config.catching.xpBase;
}

/**
 * Energy cost per catch attempt: flat 1.
 */
export function calculateEnergyCost(_speciesId: string, _slots: CreatureSlot[]): number {
  return 1;
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

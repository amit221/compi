import { GameState, NearbyCreature, CatchResult, CreatureSlot, CollectionCreature } from "../types";
import { loadConfig } from "../config/loader";
import { spendEnergy } from "./energy";
import { updateSpeciesProgress } from "./breed";

/**
 * Calculate catch rate using rarity-based formula.
 *
 * Per-trait: traitCatchChance = 1.0 - (rarity / 7) * difficultyScale
 * Final: average of all per-trait chances - failPenalty, clamped to [min, max]
 */
export function calculateCatchRate(speciesId: string, slots: CreatureSlot[], failPenalty: number): number {
  const config = loadConfig();
  const { minCatchRate, maxCatchRate, difficultyScale } = config.catching;

  let totalChance = 0;
  for (const slot of slots) {
    const rarity = slot.rarity ?? 0;
    const traitChance = 1.0 - (rarity / 7) * difficultyScale;
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
 * Energy cost per catch attempt: scales with average rarity.
 * Formula: 1 + floor((avgRarity / 7) * 4), clamped to [1, 5].
 * Rarity 0 creatures cost 1, max-rarity creatures cost 5.
 */
export function calculateEnergyCost(speciesId: string, slots: CreatureSlot[]): number {
  if (slots.length === 0) return 1;

  let totalRarity = 0;
  for (const slot of slots) {
    totalRarity += slot.rarity ?? 0;
  }

  const avgRarity = totalRarity / slots.length;
  return Math.max(1, Math.min(1 + Math.floor((avgRarity / 7) * 4), 5));
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
    updateSpeciesProgress(state, collectionCreature);

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

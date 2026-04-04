import { GameState, NearbyCreature, CatchResult, CreatureTrait, CollectionCreature, Rarity } from "../types";
import { RARITY_CATCH_PENALTY } from "../config/traits";
import { calculateEnergyCost, spendEnergy } from "./energy";

// Constants
export const BASE_CATCH_RATE = 0.80;
export const MIN_CATCH_RATE = 0.05;
export const MAX_CATCH_RATE = 0.95;
export const FAIL_PENALTY_PER_MISS = 0.10;

export const XP_PER_RARITY: Record<Rarity, number> = {
  common: 10,
  uncommon: 25,
  rare: 50,
  epic: 100,
  legendary: 250,
  mythic: 500,
  ancient: 1000,
  void: 2000,
};

/**
 * Calculate the catch rate based on creature traits and current fail penalty.
 *
 * Formula:
 * - Start with BASE_CATCH_RATE (80%)
 * - Subtract per-trait penalty based on rarity
 * - Subtract fail penalty from escalating attempts
 * - Clamp to [MIN_CATCH_RATE, MAX_CATCH_RATE]
 */
export function calculateCatchRate(traits: CreatureTrait[], failPenalty: number): number {
  // Sum rarity penalties
  const rarityPenalty = traits.reduce((sum, trait) => {
    return sum + RARITY_CATCH_PENALTY[trait.rarity];
  }, 0);

  // Calculate effective rate
  let rate = BASE_CATCH_RATE - rarityPenalty - failPenalty;

  // Clamp to valid range
  return Math.max(MIN_CATCH_RATE, Math.min(MAX_CATCH_RATE, rate));
}

/**
 * Calculate XP earned from catching a creature.
 * XP is the average of XP_PER_RARITY across all 6 traits, rounded.
 */
function calculateXpEarned(traits: CreatureTrait[]): number {
  const total = traits.reduce((sum, trait) => sum + XP_PER_RARITY[trait.rarity], 0);
  return Math.round(total / traits.length);
}

/**
 * Attempt to catch a nearby creature.
 *
 * Throws if:
 * - No active batch
 * - No attempts remaining
 * - Invalid creature index
 * - Insufficient energy
 *
 * On success:
 * - Removes creature from nearby
 * - Adds to collection as generation=0
 * - Grants XP
 * - Increments totalCatches
 * - Checks for level up
 *
 * On failure:
 * - Increments failPenalty by FAIL_PENALTY_PER_MISS
 * - Creature remains nearby
 *
 * Always:
 * - Spends energy
 * - Decrements attemptsRemaining
 */
export function attemptCatch(
  state: GameState,
  nearbyIndex: number,
  rng: () => number = Math.random
): CatchResult {
  // Validate batch
  if (!state.batch) {
    throw new Error("No active batch");
  }

  if (state.batch.attemptsRemaining <= 0) {
    throw new Error("No attempts remaining");
  }

  // Validate index
  if (nearbyIndex < 0 || nearbyIndex >= state.nearby.length) {
    throw new Error("Invalid creature index");
  }

  const nearby = state.nearby[nearbyIndex];

  // Calculate energy cost
  const energyCost = calculateEnergyCost(nearby.traits);

  // Validate energy
  if (state.energy < energyCost) {
    throw new Error(`Not enough energy: have ${state.energy}, need ${energyCost}`);
  }

  // Spend energy
  spendEnergy(state, energyCost);

  // Decrement attempts
  state.batch.attemptsRemaining--;

  // Calculate catch rate and attempt
  const catchRate = calculateCatchRate(nearby.traits, state.batch.failPenalty);
  const roll = rng();
  const success = roll < catchRate;

  let xpEarned = 0;

  if (success) {
    // Remove from nearby
    state.nearby.splice(nearbyIndex, 1);

    // Calculate XP
    xpEarned = calculateXpEarned(nearby.traits);

    // Add to collection as generation 0
    const collectionCreature: CollectionCreature = {
      id: nearby.id,
      traits: nearby.traits,
      caughtAt: Date.now(),
      generation: 0,
    };
    state.collection.push(collectionCreature);

    // Update profile
    state.profile.xp += xpEarned;
    state.profile.totalCatches++;
  } else {
    // Increment fail penalty for next attempt
    state.batch.failPenalty += FAIL_PENALTY_PER_MISS;
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

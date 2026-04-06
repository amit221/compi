import { GameState, NearbyCreature, CatchResult, CreatureSlot, CollectionCreature, Rarity, RARITY_ORDER } from "../types";
import {
  BASE_CATCH_RATE,
  MIN_CATCH_RATE,
  MAX_CATCH_RATE,
  FAIL_PENALTY_PER_MISS,
  RARITY_CATCH_PENALTY,
  XP_PER_RARITY,
} from "../config/constants";
import { calculateEnergyCost, spendEnergy } from "./energy";

/**
 * Calculate the catch rate based on a creature's 4 slots and current fail penalty.
 *
 * Formula:
 * - Compute average rarity index across all slots
 * - Look up penalty for that average rarity
 * - rate = BASE_CATCH_RATE - rarityPenalty - failPenalty
 * - Clamp to [MIN_CATCH_RATE, MAX_CATCH_RATE]
 */
export function calculateCatchRate(slots: CreatureSlot[], failPenalty: number): number {
  if (slots.length === 0) {
    return Math.max(MIN_CATCH_RATE, Math.min(MAX_CATCH_RATE, BASE_CATCH_RATE - failPenalty));
  }

  const totalIndex = slots.reduce((sum, s) => sum + RARITY_ORDER.indexOf(s.rarity), 0);
  const avgIndex = Math.round(totalIndex / slots.length);
  const avgRarity: Rarity = RARITY_ORDER[Math.min(avgIndex, RARITY_ORDER.length - 1)];
  const rarityPenalty = RARITY_CATCH_PENALTY[avgRarity] ?? 0;

  const rate = BASE_CATCH_RATE - rarityPenalty - failPenalty;
  return Math.max(MIN_CATCH_RATE, Math.min(MAX_CATCH_RATE, rate));
}

/**
 * Calculate XP earned from catching a creature.
 * Uses average rarity to look up XP_PER_RARITY.
 */
export function calculateXpEarned(slots: CreatureSlot[]): number {
  if (slots.length === 0) return XP_PER_RARITY["common"] ?? 10;

  const totalIndex = slots.reduce((sum, s) => sum + RARITY_ORDER.indexOf(s.rarity), 0);
  const avgIndex = Math.round(totalIndex / slots.length);
  const avgRarity: Rarity = RARITY_ORDER[Math.min(avgIndex, RARITY_ORDER.length - 1)];

  return XP_PER_RARITY[avgRarity] ?? 10;
}

/**
 * Attempt to catch a nearby creature.
 *
 * Throws if: no active batch, no attempts remaining, invalid index, insufficient energy.
 *
 * On success: removes creature from nearby, adds to collection (generation=0), grants XP.
 * On failure: increments failPenalty.
 * Always: spends energy, decrements attemptsRemaining.
 */
export function attemptCatch(
  state: GameState,
  nearbyIndex: number,
  rng: () => number = Math.random
): CatchResult {
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
  const energyCost = calculateEnergyCost(nearby.slots);

  if (state.energy < energyCost) {
    throw new Error(`Not enough energy: have ${state.energy}, need ${energyCost}`);
  }

  spendEnergy(state, energyCost);
  state.batch.attemptsRemaining--;

  const catchRate = calculateCatchRate(nearby.slots, state.batch.failPenalty);
  const roll = rng();
  const success = roll < catchRate;

  let xpEarned = 0;

  if (success) {
    state.nearby.splice(nearbyIndex, 1);
    xpEarned = calculateXpEarned(nearby.slots);

    const collectionCreature: CollectionCreature = {
      id: nearby.id,
      name: nearby.name,
      slots: nearby.slots,
      caughtAt: Date.now(),
      generation: 0,
    };
    state.collection.push(collectionCreature);

    state.profile.xp += xpEarned;
    state.profile.totalCatches++;
  } else {
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

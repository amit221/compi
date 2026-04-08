// src/engine/batch.ts — Multi-species creature spawning

import { GameState, NearbyCreature, CreatureSlot, CreatureColor, SLOT_IDS, SlotId } from "../types";
import { pickSpecies, pickTraitForSlot, getSpeciesById } from "../config/species";
import { loadCreatureName } from "../config/traits";
import { loadConfig } from "../config/loader";
import { BATCH_LINGER_MS, SHARED_ATTEMPTS } from "../config/constants";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function pickColor(rng: () => number): CreatureColor {
  const config = loadConfig();
  const weights = config.colors;
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [color, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return color as CreatureColor;
  }
  return entries[entries.length - 1][0] as CreatureColor;
}

export function pickBatchSize(rng: () => number): number {
  const roll = rng();
  if (roll < 0.4) return 3;
  if (roll < 0.8) return 4;
  return 5;
}

export function generateCreatureSlots(speciesId: string, rng: () => number): CreatureSlot[] {
  const species = getSpeciesById(speciesId);
  if (!species) throw new Error(`Unknown species: ${speciesId}`);

  return SLOT_IDS.map((slotId: SlotId) => {
    const trait = pickTraitForSlot(species, slotId, rng);
    return { slotId, variantId: trait.id };
  });
}

/**
 * Spawn a batch of 3-5 creatures. No-op if a batch is already active.
 */
export function spawnBatch(state: GameState, now: number, rng: () => number): NearbyCreature[] {
  if (state.batch !== null && state.batch.attemptsRemaining > 0) {
    return [];
  }

  const batchSize = pickBatchSize(rng);
  const spawned: NearbyCreature[] = [];

  for (let i = 0; i < batchSize; i++) {
    const species = pickSpecies(rng);
    const creature: NearbyCreature = {
      id: generateId(),
      speciesId: species.id,
      color: pickColor(rng),
      name: loadCreatureName(rng),
      slots: generateCreatureSlots(species.id, rng),
      spawnedAt: now,
    };
    spawned.push(creature);
  }

  state.nearby = spawned;
  state.batch = {
    attemptsRemaining: SHARED_ATTEMPTS,
    failPenalty: 0,
    spawnedAt: now,
  };

  return spawned;
}

/**
 * Clean up batch and nearby creatures when:
 * - Batch timed out (>30min)
 * - No attempts remaining
 */
export function cleanupBatch(state: GameState, now: number): string[] {
  if (state.batch === null) {
    return [];
  }

  const elapsed = now - state.batch.spawnedAt;
  const timedOut = elapsed > BATCH_LINGER_MS;
  const noAttemptsLeft = state.batch.attemptsRemaining === 0;

  if (timedOut || noAttemptsLeft) {
    const despawnedIds = state.nearby.map((c) => c.id);
    state.nearby = [];
    state.batch = null;
    return despawnedIds;
  }

  return [];
}

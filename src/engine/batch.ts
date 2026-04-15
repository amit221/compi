// src/engine/batch.ts — Multi-species creature spawning

import { GameState, NearbyCreature, CreatureSlot, CreatureColor, SlotId } from "../types";
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

const RARITY_FROM_COLOR: Record<string, number> = { grey: 0, white: 1, green: 2, cyan: 3, blue: 4, magenta: 5, yellow: 6, red: 7 };

export function generateCreatureSlots(speciesId: string, playerLevel: number, rng: () => number): CreatureSlot[] {
  const species = getSpeciesById(speciesId);
  if (!species) throw new Error(`Unknown species: ${speciesId}`);

  const speciesSlots = Object.keys(species.traitPools) as SlotId[];
  return speciesSlots.map((slotId: SlotId) => {
    const trait = pickTraitForSlot(species, slotId, playerLevel, rng);
    const color = pickColor(rng);
    const rarity = RARITY_FROM_COLOR[color] ?? 0;
    return { slotId, variantId: trait.id, color, rarity };
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
      name: loadCreatureName(rng),
      slots: generateCreatureSlots(species.id, state.profile.level, rng),
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

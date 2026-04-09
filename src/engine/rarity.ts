// src/engine/rarity.ts
import { CreatureSlot, CreatureColor, SlotId } from "../types";
import { getSpeciesById } from "../config/species";
import { loadConfig } from "../config/loader";

/**
 * Ranks a trait's spawnRate within all traits for that species+slot.
 * Pool is sorted by spawnRate descending (most common first).
 * index 0 → score 1 (most common), last index → score 100 (rarest).
 * Formula: (index / (poolSize - 1)) * 99 + 1
 * Returns 50 for single-trait pools or unknown species/slot/variant.
 */
export function calculateTraitRarityScore(
  speciesId: string,
  slotId: SlotId,
  variantId: string
): number {
  const species = getSpeciesById(speciesId);
  if (!species) return 50;

  const pool = species.traitPools[slotId];
  if (!pool || pool.length === 0) return 50;
  if (pool.length === 1) return 50;

  // Sort descending by spawnRate (most common first → index 0)
  const sorted = [...pool].sort((a, b) => b.spawnRate - a.spawnRate);

  const index = sorted.findIndex((t) => t.id === variantId);
  if (index === -1) return 50;

  return (index / (sorted.length - 1)) * 99 + 1;
}

/**
 * Ranks a color's weight among all colors from balance.json.
 * Sorted by weight descending. Same formula as trait score.
 */
export function calculateColorRarityScore(color: CreatureColor): number {
  const config = loadConfig();
  const colorMap = config.colors;

  const entries = Object.entries(colorMap).sort((a, b) => b[1] - a[1]);
  if (entries.length <= 1) return 50;

  const index = entries.findIndex(([name]) => name === color);
  if (index === -1) return 50;

  return (index / (entries.length - 1)) * 99 + 1;
}

/**
 * Combined slot score: 80% trait rarity + 20% color rarity.
 */
export function calculateSlotScore(speciesId: string, slot: CreatureSlot): number {
  const traitScore = calculateTraitRarityScore(speciesId, slot.slotId, slot.variantId);
  const colorScore = calculateColorRarityScore(slot.color);
  return 0.8 * traitScore + 0.2 * colorScore;
}

/**
 * Average of all slot scores, rounded to nearest integer.
 * Returns 50 for empty slots.
 */
export function calculateCreatureScore(speciesId: string, slots: CreatureSlot[]): number {
  if (slots.length === 0) return 50;
  const total = slots.reduce((sum, slot) => sum + calculateSlotScore(speciesId, slot), 0);
  return Math.round(total / slots.length);
}

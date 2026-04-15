import { RARITY_NAMES } from "../types";

export interface SpeciesIndexEntry {
  speciesId: string;
  tiers: boolean[];
  discovered: number;
  total: number;
  isHybrid: boolean;
}

export function getSpeciesIndex(progress: Record<string, boolean[]>): SpeciesIndexEntry[] {
  return Object.entries(progress)
    .map(([speciesId, tiers]) => ({
      speciesId,
      tiers: tiers.length === 8 ? tiers : Array(8).fill(false).map((_, i) => tiers[i] ?? false),
      discovered: tiers.filter(Boolean).length,
      total: 8,
      isHybrid: speciesId.startsWith("hybrid_"),
    }))
    .sort((a, b) => {
      if (a.isHybrid !== b.isHybrid) return a.isHybrid ? 1 : -1;
      return a.speciesId.localeCompare(b.speciesId);
    });
}

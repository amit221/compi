/**
 * Shared tier/rank utilities used by advisor and companion modules.
 */

/**
 * Rarity tier boundaries by rank:
 *   0-4:   Common
 *   5-8:   Uncommon
 *   9-11:  Rare
 *   12-14: Epic
 *   15-16: Legendary
 *   17-18: Mythic
 */
export const TIER_BOUNDARIES = [0, 5, 9, 12, 15, 17];
export const TIER_NAMES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

/**
 * Extract trait rank from a variantId with the `_rN` suffix convention.
 * Returns 0 if no rank suffix is found (species-based trait names).
 */
export function extractRank(variantId: string): number {
  const m = variantId.match(/_r(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * Get the tier name for a given rank.
 */
export function getTierName(rank: number): string {
  for (let i = TIER_BOUNDARIES.length - 1; i >= 0; i--) {
    if (rank >= TIER_BOUNDARIES[i]) return TIER_NAMES[i];
  }
  return "common";
}

/**
 * Get the next tier boundary above the given rank.
 * Returns null if already at the highest tier.
 */
export function getNextTierBoundary(rank: number): number | null {
  for (const boundary of TIER_BOUNDARIES) {
    if (boundary > rank) return boundary;
  }
  return null;
}

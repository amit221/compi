import { RARITY_ICONS, CATCH_RATE_ICONS } from "../types";
import type { Rarity } from "../types";
import { MAX_CATCH_ATTEMPTS } from "./constants";

export function getRarityIcon(rarity: Rarity): string {
  return RARITY_ICONS[rarity] || "☆";
}

export function getCatchRateIcon(catchRate: number): string {
  if (catchRate >= 0.8) return CATCH_RATE_ICONS.veryEasy;
  if (catchRate >= 0.6) return CATCH_RATE_ICONS.easy;
  if (catchRate >= 0.4) return CATCH_RATE_ICONS.medium;
  if (catchRate >= 0.2) return CATCH_RATE_ICONS.hard;
  return CATCH_RATE_ICONS.veryHard;
}

export function getAttemptsIcon(attemptsRemaining: number, maxAttempts: number = MAX_CATCH_ATTEMPTS): string {
  const filled = "●".repeat(attemptsRemaining);
  const empty = "○".repeat(maxAttempts - attemptsRemaining);
  return filled + empty;
}

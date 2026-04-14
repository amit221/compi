import { GameState, SlotId, UpgradeResult } from "../types";
import { loadConfig } from "../config/loader";
import { spendGold } from "./gold";
import { grantXp } from "./progression";

/**
 * Get the gold cost to upgrade a trait from the given rank to rank+1.
 * Throws if the rank is already at or above the max.
 */
export function getUpgradeCost(currentRank: number): number {
  const config = loadConfig();
  if (currentRank >= config.upgrade.maxRank) {
    throw new Error(`Trait is already at max rank (${config.upgrade.maxRank})`);
  }
  return config.upgrade.costs[currentRank];
}

/**
 * Upgrade a specific trait on a creature.
 * - Finds the creature in collection
 * - Validates: not archived, slot exists, not at max rank, enough gold, session cap not reached
 * - Deducts gold, increments rank, increments session upgrade count
 * - Grants XP via progression module
 * - Returns UpgradeResult
 *
 * The trait "rank" is encoded in the variantId as the numeric suffix after `_r`.
 * The upgrade increments this rank. For example, `trait_eyes_r2` becomes `trait_eyes_r3`.
 */
export function performUpgrade(
  state: GameState,
  creatureId: string,
  slotId: SlotId
): UpgradeResult {
  const config = loadConfig();

  // Session cap check
  if (state.sessionUpgradeCount >= config.upgrade.sessionCap) {
    throw new Error(
      `Session upgrade cap reached (${config.upgrade.sessionCap} per session)`
    );
  }

  // Find creature
  const creature = state.collection.find((c) => c.id === creatureId);
  if (!creature) {
    throw new Error(`Creature not found: ${creatureId}`);
  }
  if (creature.archived) {
    throw new Error(`Creature is archived: ${creatureId}`);
  }

  // Find slot
  const slot = creature.slots.find((s) => s.slotId === slotId);
  if (!slot) {
    throw new Error(`Slot not found on creature: ${slotId}`);
  }

  // Parse current rank from variantId
  const rankMatch = slot.variantId.match(/_r(\d+)$/);
  const currentRank = rankMatch ? parseInt(rankMatch[1], 10) : 0;

  if (currentRank >= config.upgrade.maxRank) {
    throw new Error(
      `Trait ${slotId} is already at max rank (${config.upgrade.maxRank})`
    );
  }

  // Cost check and deduction
  const cost = config.upgrade.costs[currentRank];
  spendGold(state, cost);

  // Perform the upgrade
  const newRank = currentRank + 1;
  slot.variantId = slot.variantId.replace(/_r\d+$/, `_r${newRank}`);

  // Track upgrade
  state.sessionUpgradeCount++;
  state.profile.totalUpgrades++;

  // Grant XP
  grantXp(state, config.leveling.xpPerUpgrade);

  return {
    creatureId,
    creatureName: creature.name,
    speciesId: creature.speciesId,
    slots: creature.slots,
    slotId,
    fromRank: currentRank,
    toRank: newRank,
    goldCost: cost,
  };
}

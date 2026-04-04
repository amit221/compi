import {
  GameState,
  CatchResult,
  CreatureDefinition,
  ItemDefinition,
} from "../types";
import {
  XP_PER_CATCH,
  XP_PER_LEVEL,
  MAX_CATCH_RATE,
  BONUS_ITEM_DROP_CHANCE,
  BONUS_ITEM_ID,
  FRAGMENTS_PER_CATCH,
} from "../config/constants";
import { getItemMap } from "../config/items";

export function attemptCatch(
  state: GameState,
  nearbyIndex: number,
  itemId: string,
  creatures: Map<string, CreatureDefinition>,
  items: Map<string, ItemDefinition>,
  rng: () => number = Math.random
): CatchResult {
  if (nearbyIndex < 0 || nearbyIndex >= state.nearby.length) {
    throw new Error("Invalid creature index");
  }

  const itemCount = state.inventory[itemId] || 0;
  if (itemCount <= 0) {
    throw new Error(`No ${itemId} in inventory`);
  }

  const nearby = state.nearby[nearbyIndex];
  const creature = creatures.get(nearby.creatureId);
  if (!creature) {
    throw new Error(`Unknown creature: ${nearby.creatureId}`);
  }

  const item = items.get(itemId);
  if (!item) {
    throw new Error(`Unknown item: ${itemId}`);
  }

  // Consume item
  state.inventory[itemId] = itemCount - 1;

  // Calculate effective catch rate
  const multiplier = item.catchMultiplier || 1;
  const effectiveRate = Math.min(creature.baseCatchRate * multiplier, MAX_CATCH_RATE);

  const roll = rng();
  const success = roll < effectiveRate;

  if (success) {
    state.nearby.splice(nearbyIndex, 1);

    let entry = state.collection.find((c) => c.creatureId === creature.id);
    if (entry) {
      entry.fragments += FRAGMENTS_PER_CATCH;
      entry.totalCaught++;
    } else {
      entry = {
        creatureId: creature.id,
        fragments: FRAGMENTS_PER_CATCH,
        totalCaught: 1,
        firstCaughtAt: Date.now(),
        evolved: false,
      };
      state.collection.push(entry);
    }

    const xp = XP_PER_CATCH[creature.rarity] || 10;
    state.profile.xp += xp;
    state.profile.totalCatches++;

    while (state.profile.xp >= state.profile.level * XP_PER_LEVEL) {
      state.profile.xp -= state.profile.level * XP_PER_LEVEL;
      state.profile.level++;
    }

    const evolutionReady = creature.evolution
      ? entry.fragments >= creature.evolution.fragmentCost
      : false;

    // 10% chance of bonus item drop
    let bonusItem: { item: ItemDefinition; count: number } | undefined;
    if (rng() < BONUS_ITEM_DROP_CHANCE) {
      const allItems = getItemMap();
      const bonus = allItems.get(BONUS_ITEM_ID);
      if (bonus) {
        bonusItem = { item: bonus, count: 1 };
        state.inventory[BONUS_ITEM_ID] = (state.inventory[BONUS_ITEM_ID] || 0) + 1;
      }
    }

    return {
      success: true,
      creature,
      itemUsed: item,
      fragmentsEarned: FRAGMENTS_PER_CATCH,
      totalFragments: entry.fragments,
      xpEarned: xp,
      bonusItem,
      fled: false,
      evolutionReady,
    };
  }

  nearby.failedAttempts++;
  const fled = nearby.failedAttempts >= nearby.maxAttempts;
  if (fled) {
    state.nearby.splice(nearbyIndex, 1);
  }

  return {
    success: false,
    creature,
    itemUsed: item,
    fragmentsEarned: 0,
    totalFragments: state.collection.find((c) => c.creatureId === creature.id)?.fragments || 0,
    xpEarned: 0,
    fled,
    evolutionReady: false,
  };
}

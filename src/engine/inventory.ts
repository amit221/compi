import { GameState, ItemDefinition } from "../types";
import { getItemMap } from "../config/items";
import {
  PASSIVE_DRIP_INTERVAL,
  PASSIVE_DRIP_ITEMS,
  SESSION_REWARD_ITEMS,
  MILESTONES,
} from "../config/constants";

const itemMap = getItemMap();

function weightedPick(
  options: Array<{ itemId: string; count: number; weight: number }>,
  rng: () => number
): { itemId: string; count: number } {
  const totalWeight = options.reduce((s, o) => s + o.weight, 0);
  let roll = rng() * totalWeight;
  for (const opt of options) {
    roll -= opt.weight;
    if (roll <= 0) return { itemId: opt.itemId, count: opt.count };
  }
  return options[options.length - 1];
}

function addItem(
  state: GameState,
  itemId: string,
  count: number
): { item: ItemDefinition; count: number } | null {
  const item = itemMap.get(itemId);
  if (!item) return null;
  state.inventory[itemId] = (state.inventory[itemId] || 0) + count;
  return { item, count };
}

export function processPassiveDrip(
  state: GameState,
  rng: () => number = Math.random
): Array<{ item: ItemDefinition; count: number }> {
  const results: Array<{ item: ItemDefinition; count: number }> = [];

  if (state.profile.totalTicks <= 0) return results;
  if (state.profile.totalTicks % PASSIVE_DRIP_INTERVAL !== 0) return results;

  const pick = weightedPick(PASSIVE_DRIP_ITEMS, rng);
  const added = addItem(state, pick.itemId, pick.count);
  if (added) results.push(added);

  return results;
}

export function processSessionReward(
  state: GameState,
  rng: () => number = Math.random
): Array<{ item: ItemDefinition; count: number }> {
  const results: Array<{ item: ItemDefinition; count: number }> = [];

  const pick = weightedPick(SESSION_REWARD_ITEMS, rng);
  const added = addItem(state, pick.itemId, pick.count);
  if (added) results.push(added);

  return results;
}

export function checkMilestones(
  state: GameState,
  claimedMilestones: string[]
): Array<{ item: ItemDefinition; count: number }> {
  const results: Array<{ item: ItemDefinition; count: number }> = [];

  for (const milestone of MILESTONES) {
    if (claimedMilestones.includes(milestone.id)) continue;
    if (!milestone.condition(state.profile)) continue;

    claimedMilestones.push(milestone.id);
    for (const reward of milestone.reward) {
      const added = addItem(state, reward.itemId, reward.count);
      if (added) results.push(added);
    }
  }

  return results;
}

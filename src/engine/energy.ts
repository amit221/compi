import { GameState, CreatureTrait } from "../types";
import { RARITY_ENERGY_VALUE } from "../config/traits";

const ENERGY_GAIN_INTERVAL_MS = 30 * 60 * 1000;
const MAX_ENERGY = 30;

export function calculateEnergyCost(traits: CreatureTrait[]): number {
  const sum = traits.reduce((s, t) => s + RARITY_ENERGY_VALUE[t.rarity], 0);
  return 1 + sum;
}

export function processEnergyGain(state: GameState, now: number): number {
  const elapsed = now - state.lastEnergyGainAt;
  const intervals = Math.floor(elapsed / ENERGY_GAIN_INTERVAL_MS);
  if (intervals <= 0) return 0;
  const maxGain = MAX_ENERGY - state.energy;
  const gained = Math.min(intervals, maxGain);
  state.energy += gained;
  state.lastEnergyGainAt += intervals * ENERGY_GAIN_INTERVAL_MS;
  return gained;
}

export function spendEnergy(state: GameState, amount: number): void {
  if (state.energy < amount) {
    throw new Error(`Not enough energy: have ${state.energy}, need ${amount}`);
  }
  state.energy -= amount;
}

export function canAfford(currentEnergy: number, cost: number): boolean {
  return currentEnergy >= cost;
}

export { MAX_ENERGY, ENERGY_GAIN_INTERVAL_MS };

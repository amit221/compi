import { GameState } from "../types";
import { loadConfig } from "../config/loader";

const config = loadConfig();
const ENERGY_GAIN_INTERVAL_MS = config.energy.gainIntervalMs;
const MAX_ENERGY = config.energy.maxEnergy;

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

export { MAX_ENERGY, ENERGY_GAIN_INTERVAL_MS };

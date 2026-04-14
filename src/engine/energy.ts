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

export const SESSION_ENERGY_BONUS = config.energy.sessionBonus;

/**
 * Grant session-based energy bonus when a new session starts.
 * Tracks session ID to avoid double-granting.
 * Returns the amount of energy gained.
 */
export function processSessionEnergyBonus(state: GameState, sessionId: string): number {
  if (!sessionId || state.currentSessionId === sessionId) {
    return 0;
  }

  state.currentSessionId = sessionId;
  state.sessionUpgradeCount = 0; // Reset session upgrade count on new session

  const maxGain = MAX_ENERGY - state.energy;
  const gained = Math.min(SESSION_ENERGY_BONUS, maxGain);
  state.energy += gained;
  return gained;
}

export { MAX_ENERGY, ENERGY_GAIN_INTERVAL_MS };

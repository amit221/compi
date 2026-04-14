import { GameState } from "../types";
import { loadConfig } from "../config/loader";

let _config: ReturnType<typeof loadConfig> | null = null;
function getConfig() {
  if (!_config) _config = loadConfig();
  return _config;
}

export function processEnergyGain(state: GameState, now: number): number {
  const config = getConfig();
  const elapsed = now - state.lastEnergyGainAt;
  const intervals = Math.floor(elapsed / config.energy.gainIntervalMs);
  if (intervals <= 0) return 0;
  const maxGain = config.energy.maxEnergy - state.energy;
  const gained = Math.min(intervals, maxGain);
  state.energy += gained;
  state.lastEnergyGainAt += intervals * config.energy.gainIntervalMs;
  return gained;
}

export function spendEnergy(state: GameState, amount: number): void {
  if (state.energy < amount) {
    throw new Error(`Not enough energy: have ${state.energy}, need ${amount}`);
  }
  state.energy -= amount;
}

/**
 * Grant session-based energy bonus when a new session starts.
 * Tracks session ID to avoid double-granting.
 * Returns the amount of energy gained.
 */
export function processSessionEnergyBonus(state: GameState, sessionId: string): number {
  const config = getConfig();
  if (!sessionId || state.currentSessionId === sessionId) {
    return 0;
  }

  state.currentSessionId = sessionId;
  state.sessionUpgradeCount = 0; // Reset session upgrade count on new session

  const maxGain = config.energy.maxEnergy - state.energy;
  const gained = Math.min(config.energy.sessionBonus, maxGain);
  state.energy += gained;
  return gained;
}

export const MAX_ENERGY = getConfig().energy.maxEnergy;
export const ENERGY_GAIN_INTERVAL_MS = getConfig().energy.gainIntervalMs;
export const SESSION_ENERGY_BONUS = getConfig().energy.sessionBonus;

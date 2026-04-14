import { GameState } from "../types";

export type StrategyName = "random" | "greedy" | "passive";

export type ActionType =
  | "scan"
  | "catch"
  | "breed"
  | "upgrade"
  | "quest_start"
  | "quest_check"
  | "archive"
  | "release"
  | "idle";

export interface SimAction {
  tick: number;
  type: ActionType;
  detail: string;
  success: boolean;
}

export interface Violation {
  tick: number;
  action: ActionType;
  invariant: string;
  detail: string;
  seed: number;
  stateSnapshot: Partial<GameState>;
}

export interface SimulationResult {
  seed: number;
  strategy: StrategyName;
  ticks: number;
  actions: SimAction[];
  violations: Violation[];
  finalState: GameState;
}

export interface SimulationConfig {
  runs: number;
  seed: number;
  ticksPerGame: number;
  strategy: StrategyName;
}

export const DEFAULT_CONFIG: SimulationConfig = {
  runs: 1000,
  seed: 42,
  ticksPerGame: 200,
  strategy: "random",
};

export interface BalanceStats {
  goldAtLevel: Map<number, number[]>;
  ticksToLevel: Map<number, number[]>;
  catchRateByTier: Map<string, { attempts: number; successes: number }>;
  energyDepleted: number;
  collectionFullCount: number;
  speciesDiscoveryTicks: number[];
  xpSources: { catches: number; upgrades: number; quests: number; discoveries: number };
  questRewards: number[];
  breedGenerations: number[];
  upgradeRankReached: Map<number, number>;
}

export function createEmptyBalanceStats(): BalanceStats {
  return {
    goldAtLevel: new Map(),
    ticksToLevel: new Map(),
    catchRateByTier: new Map(),
    energyDepleted: 0,
    collectionFullCount: 0,
    speciesDiscoveryTicks: [],
    xpSources: { catches: 0, upgrades: 0, quests: 0, discoveries: 0 },
    questRewards: [],
    breedGenerations: [],
    upgradeRankReached: new Map(),
  };
}

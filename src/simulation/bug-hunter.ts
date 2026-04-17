import { GameState, MAX_COLLECTION_SIZE } from "../types";
import { loadConfig } from "../config/loader";
import { GameSimulator } from "./game-simulator";
import { Violation, StrategyName, SimulationResult } from "./types";

export interface BugHunterConfig {
  runs: number;
  seed: number;
  ticksPerGame: number;
}

export interface BugHunterReport {
  totalRuns: number;
  violations: Violation[];
  durationMs: number;
}

const STRATEGIES: StrategyName[] = ["random", "greedy", "passive"];

export function checkInvariants(result: SimulationResult): Violation[] {
  const violations: Violation[] = [];
  const state = result.finalState;
  const config = loadConfig();

  function addViolation(invariant: string, detail: string): void {
    violations.push({
      tick: -1,
      action: "idle",
      invariant,
      detail,
      seed: result.seed,
      stateSnapshot: {
        energy: state.energy,
        collection: state.collection,
        profile: state.profile,
        nearby: state.nearby,
        batch: state.batch,
      },
    });
  }

  // Energy: never negative
  if (state.energy < 0) {
    addViolation("energy_negative", `energy=${state.energy}`);
  }

  // Energy: never exceeds maxEnergy
  if (state.energy > config.energy.maxEnergy) {
    addViolation(
      "energy_exceeds_max",
      `energy=${state.energy} max=${config.energy.maxEnergy}`
    );
  }

  // Collection: active (non-archived) count never exceeds MAX_COLLECTION_SIZE
  const activeCreatures = state.collection.filter((c) => !c.archived);
  if (activeCreatures.length > MAX_COLLECTION_SIZE) {
    addViolation(
      "collection_exceeds_max",
      `activeCount=${activeCreatures.length} max=${MAX_COLLECTION_SIZE}`
    );
  }

  // No duplicate creature IDs in collection
  const collectionIds = state.collection.map((c) => c.id);
  const uniqueCollectionIds = new Set(collectionIds);
  if (uniqueCollectionIds.size !== collectionIds.length) {
    addViolation(
      "collection_duplicate_ids",
      `collectionCount=${collectionIds.length} uniqueCount=${uniqueCollectionIds.size}`
    );
  }

  // No archived creatures in the collection array (archived should be in archive array)
  const archivedInCollection = state.collection.filter((c) => c.archived);
  if (archivedInCollection.length > 0) {
    addViolation(
      "archived_in_collection",
      `archivedInCollection=${archivedInCollection.map((c) => c.id).join(",")}`
    );
  }

  // Level never below 1
  if (state.profile.level < 1) {
    addViolation("level_below_1", `level=${state.profile.level}`);
  }

  // XP never negative
  if (state.profile.xp < 0) {
    addViolation("xp_negative", `xp=${state.profile.xp}`);
  }

  // Nearby array never exceeds 5
  if (state.nearby.length > 5) {
    addViolation("nearby_exceeds_5", `nearbyCount=${state.nearby.length}`);
  }

  // Batch attempts never negative
  if (state.batch !== null && state.batch.attemptsRemaining < 0) {
    addViolation(
      "batch_attempts_negative",
      `attemptsRemaining=${state.batch.attemptsRemaining}`
    );
  }

  return violations;
}

export class BugHunter {
  constructor(private readonly config: BugHunterConfig) {}

  run(): BugHunterReport {
    const startTime = Date.now();
    const allViolations: Violation[] = [];
    let totalRuns = 0;

    for (const strategy of STRATEGIES) {
      const simulator = new GameSimulator({
        runs: this.config.runs,
        seed: this.config.seed,
        ticksPerGame: this.config.ticksPerGame,
        strategy,
      });

      const results = simulator.runAll();
      totalRuns += results.length;

      for (const result of results) {
        const violations = checkInvariants(result);
        allViolations.push(...violations);
      }
    }

    return {
      totalRuns,
      violations: allViolations,
      durationMs: Date.now() - startTime,
    };
  }
}

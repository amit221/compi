import { GameSimulator } from "./game-simulator";
import { BalanceStats, createEmptyBalanceStats, SimulationResult } from "./types";

export interface BalanceAnalyzerConfig {
  runs: number;
  seed: number;
  ticksPerGame: number;
}

export interface BalanceReport {
  totalRuns: number;
  stats: BalanceStats;
  highlights: string[];
  durationMs: number;
}

export class BalanceAnalyzer {
  constructor(private readonly config: BalanceAnalyzerConfig) {}

  run(): BalanceReport {
    const startMs = Date.now();

    const simulator = new GameSimulator({
      runs: this.config.runs,
      seed: this.config.seed,
      ticksPerGame: this.config.ticksPerGame,
      strategy: "random",
    });

    const results = simulator.runAll();
    const stats = this.collectStats(results);
    const highlights = this.generateHighlights(stats, results.length);
    const durationMs = Date.now() - startMs;

    return {
      totalRuns: results.length,
      stats,
      highlights,
      durationMs,
    };
  }

  collectStats(results: SimulationResult[]): BalanceStats {
    const stats = createEmptyBalanceStats();

    for (const result of results) {
      const state = result.finalState;

      // collectionFullCount: count of runs where collection hit 15
      if (state.collection.length >= 15) {
        stats.collectionFullCount++;
      }

      // speciesDiscoveryTicks: push discoveredSpecies.length per result
      stats.speciesDiscoveryTicks.push(state.discoveredSpecies.length);

      // Initialize "all" tier for catchRateByTier if not present
      if (!stats.catchRateByTier.has("all")) {
        stats.catchRateByTier.set("all", { attempts: 0, successes: 0 });
      }

      // Iterate over actions to collect xpSources, catchRateByTier, breedGenerations
      for (const action of result.actions) {
        if (action.type === "catch") {
          const tier = stats.catchRateByTier.get("all")!;
          tier.attempts++;
          if (action.success) {
            tier.successes++;
            stats.xpSources.catches++;
          }
        }

      }

      // breedGenerations: push creature.generation for creatures with generation > 0
      for (const creature of state.collection) {
        if (creature.generation > 0) {
          stats.breedGenerations.push(creature.generation);
        }
      }

      // upgradeRankReached from creature slot variantIds
      for (const creature of state.collection) {
        for (const slot of creature.slots) {
          const rankMatch = slot.variantId.match(/_r(\d+)$/);
          if (rankMatch) {
            const rank = parseInt(rankMatch[1], 10);
            stats.upgradeRankReached.set(rank, (stats.upgradeRankReached.get(rank) ?? 0) + 1);
          }
        }
      }
    }

    return stats;
  }

  generateHighlights(stats: BalanceStats, totalRuns: number): string[] {
    const highlights: string[] = [];

    // Overall catch rate percentage
    const catchData = stats.catchRateByTier.get("all");
    if (catchData && catchData.attempts > 0) {
      const catchRate = ((catchData.successes / catchData.attempts) * 100).toFixed(1);
      highlights.push(`Overall catch rate: ${catchRate}% (${catchData.successes}/${catchData.attempts})`);
    } else {
      highlights.push("Overall catch rate: N/A (no catch attempts)");
    }

    // Collection full frequency percentage
    const collectionFullPct = totalRuns > 0
      ? ((stats.collectionFullCount / totalRuns) * 100).toFixed(1)
      : "0.0";
    highlights.push(`Collection full in ${collectionFullPct}% of runs (${stats.collectionFullCount}/${totalRuns})`);

    // Average species discovered
    const avgSpecies =
      stats.speciesDiscoveryTicks.length > 0
        ? (
            stats.speciesDiscoveryTicks.reduce((a, b) => a + b, 0) /
            stats.speciesDiscoveryTicks.length
          ).toFixed(1)
        : "0.0";
    highlights.push(`Average species discovered: ${avgSpecies}`);

    // Max breed generation reached
    const maxGen =
      stats.breedGenerations.length > 0 ? Math.max(...stats.breedGenerations) : 0;
    highlights.push(`Max breed generation reached: ${maxGen}`);

    // Highest upgrade rank reached
    const allRanks = Array.from(stats.upgradeRankReached.keys());
    const maxRank = allRanks.length > 0 ? Math.max(...allRanks) : 0;
    highlights.push(`Highest upgrade rank reached: ${maxRank}`);

    return highlights;
  }
}

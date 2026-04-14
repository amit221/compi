import {
  DEFAULT_CONFIG,
  createEmptyBalanceStats,
  BalanceStats,
} from "../../src/simulation/types";

describe("simulation types", () => {
  test("DEFAULT_CONFIG has expected defaults", () => {
    expect(DEFAULT_CONFIG.runs).toBe(1000);
    expect(DEFAULT_CONFIG.seed).toBe(42);
    expect(DEFAULT_CONFIG.ticksPerGame).toBe(200);
    expect(DEFAULT_CONFIG.strategy).toBe("random");
  });

  test("createEmptyBalanceStats returns zeroed stats", () => {
    const stats = createEmptyBalanceStats();
    expect(stats.energyDepleted).toBe(0);
    expect(stats.collectionFullCount).toBe(0);
    expect(stats.goldAtLevel.size).toBe(0);
    expect(stats.xpSources.catches).toBe(0);
  });
});

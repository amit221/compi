import { BalanceAnalyzer } from "../../src/simulation/balance-analyzer";

describe("BalanceAnalyzer", () => {
  test("produces stats from simulation runs", () => {
    const analyzer = new BalanceAnalyzer({ runs: 5, seed: 42, ticksPerGame: 30 });
    const report = analyzer.run();
    expect(report.totalRuns).toBe(5);
    expect(report.stats).toBeDefined();
    expect(typeof report.durationMs).toBe("number");
  });

  test("summary highlights are generated", () => {
    const analyzer = new BalanceAnalyzer({ runs: 5, seed: 42, ticksPerGame: 50 });
    const report = analyzer.run();
    expect(report.highlights).toBeDefined();
    expect(Array.isArray(report.highlights)).toBe(true);
  });
});

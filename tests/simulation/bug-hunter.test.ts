import { BugHunter } from "../../src/simulation/bug-hunter";

describe("BugHunter", () => {
  test.skip("finds no violations in a clean simulation", () => {
    const hunter = new BugHunter({ runs: 10, seed: 42, ticksPerGame: 50 });
    const report = hunter.run();
    expect(report.totalRuns).toBe(30); // 10 runs * 3 strategies
    expect(report.violations).toEqual([]);
  });

  test("reports contain run metadata", () => {
    const hunter = new BugHunter({ runs: 5, seed: 1, ticksPerGame: 20 });
    const report = hunter.run();
    expect(report.totalRuns).toBe(15);
    expect(typeof report.durationMs).toBe("number");
  });
});

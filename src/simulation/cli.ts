import { execSync } from "child_process";
import { BugHunter } from "./bug-hunter";
import { BalanceAnalyzer } from "./balance-analyzer";
import { McpSmokeTester } from "./mcp-smoke";
import {
  getAllScenarios,
  getScenario,
  ScenarioId,
} from "./scenarios";
import {
  formatBugReport,
  formatBalanceReport,
  formatSmokeReport,
  writeJsonReport,
} from "./report";

function parseArgs(argv: string[]): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)=(.+)$/);
    if (match) {
      const key = match[1];
      const raw = match[2];
      const num = Number(raw);
      result[key] = isNaN(num) ? raw : num;
    }
  }
  return result;
}

function printUsage(): void {
  console.log(`
Usage: ts-node src/simulation/cli.ts <command> [flags]

Commands:
  bugs      Run BugHunter to check game invariants
  balance   Run BalanceAnalyzer to check game balance
  smoke     Run McpSmokeTester to verify MCP tool responses
  ux        Run UX scenarios interactively via claude -p
  all       Run bugs, balance, and smoke (not ux)

Flags:
  --runs=N       Number of simulation runs (default: 1000 for bugs/balance, 10 for smoke)
  --seed=N       RNG seed (default: 42)
  --ticks=N      Ticks per run (default: 200, for bugs/balance)
  --scenario=ID  UX scenario ID (default: "all", for ux command)
`);
}

async function runBugs(
  runs: number,
  seed: number,
  ticks: number
): Promise<void> {
  console.log(`Running BugHunter: ${runs} runs, seed=${seed}, ticks=${ticks}`);
  const hunter = new BugHunter({ runs, seed, ticksPerGame: ticks });
  const report = await hunter.run();
  console.log(formatBugReport(report));
  const filePath = writeJsonReport("bugs", report);
  console.log(`\nReport written to: ${filePath}`);
}

async function runBalance(
  runs: number,
  seed: number,
  ticks: number
): Promise<void> {
  console.log(
    `Running BalanceAnalyzer: ${runs} runs, seed=${seed}, ticks=${ticks}`
  );
  const analyzer = new BalanceAnalyzer({ runs, seed, ticksPerGame: ticks });
  const report = await analyzer.run();
  console.log(formatBalanceReport(report));
  const filePath = writeJsonReport("balance", report);
  console.log(`\nReport written to: ${filePath}`);
}

async function runSmoke(runs: number, seed: number): Promise<void> {
  console.log(`Running McpSmokeTester: ${runs} runs, seed=${seed}`);
  const tester = new McpSmokeTester({ runs, seed });
  const report = await tester.run();
  console.log(formatSmokeReport(report));
  const filePath = writeJsonReport("smoke", report);
  console.log(`\nReport written to: ${filePath}`);
}

function runUx(scenarioId: string): void {
  const scenarios =
    scenarioId === "all"
      ? getAllScenarios()
      : (() => {
          const s = getScenario(scenarioId as ScenarioId);
          return s ? [s] : [];
        })();

  if (scenarios.length === 0) {
    console.error(`No scenario found for id: ${scenarioId}`);
    process.exit(1);
  }

  for (const scenario of scenarios) {
    console.log(`\n=== UX Scenario: ${scenario.name} ===`);
    console.log(`Description: ${scenario.description}`);
    console.log(`Launching claude session...`);

    const escaped = scenario.prompt.replace(/"/g, '\\"');
    try {
      execSync(`claude -p "${escaped}"`, {
        stdio: "inherit",
        timeout: 5 * 60 * 1000,
      });
    } catch (err) {
      console.error(
        `Scenario "${scenario.name}" failed:`,
        err instanceof Error ? err.message : err
      );
    }
  }
}

async function main(): Promise<void> {
  const [, , command, ...rest] = process.argv;
  const flags = parseArgs(rest);

  const seed = typeof flags["seed"] === "number" ? flags["seed"] : 42;
  const ticks = typeof flags["ticks"] === "number" ? flags["ticks"] : 200;
  const scenarioId =
    typeof flags["scenario"] === "string" ? flags["scenario"] : "all";

  switch (command) {
    case "bugs": {
      const runs = typeof flags["runs"] === "number" ? flags["runs"] : 1000;
      await runBugs(runs, seed, ticks);
      break;
    }
    case "balance": {
      const runs = typeof flags["runs"] === "number" ? flags["runs"] : 1000;
      await runBalance(runs, seed, ticks);
      break;
    }
    case "smoke": {
      const runs = typeof flags["runs"] === "number" ? flags["runs"] : 10;
      await runSmoke(runs, seed);
      break;
    }
    case "ux": {
      runUx(scenarioId);
      break;
    }
    case "all": {
      const runs = typeof flags["runs"] === "number" ? flags["runs"] : 1000;
      const smokeRuns = typeof flags["runs"] === "number" ? flags["runs"] : 10;
      await runBugs(runs, seed, ticks);
      await runBalance(runs, seed, ticks);
      await runSmoke(smokeRuns, seed);
      console.log(
        "\nNote: UX scenarios not included in 'all'. Run 'ux' separately."
      );
      break;
    }
    default: {
      printUsage();
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

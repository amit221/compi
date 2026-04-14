import { SlotId } from "../types";
import { GameEngine } from "../engine/game-engine";
import { loadConfig } from "../config/loader";
import { makeRng, makeDefaultState } from "./helpers";

// --- Types ---

export interface McpSmokeConfig {
  runs: number;
  seed: number;
}

export interface ToolTestResult {
  tool: string;
  success: boolean;
  error?: string;
  isEdgeCase: boolean;
}

export interface McpSmokeReport {
  totalRuns: number;
  toolResults: ToolTestResult[];
  durationMs: number;
}

// --- Helper: wrap a call in try/catch, returning a ToolTestResult ---

function testTool(
  tool: string,
  isEdgeCase: boolean,
  fn: () => void
): ToolTestResult {
  try {
    fn();
    return { tool, success: true, isEdgeCase };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isEdgeCase) {
      // Edge cases: success = clean error (no messy crash indicators)
      const isMessy =
        msg.includes("Cannot read") ||
        msg.includes("undefined") ||
        msg.includes("TypeError");
      return { tool, success: !isMessy, error: msg, isEdgeCase };
    }
    return { tool, success: false, error: msg, isEdgeCase };
  }
}

// --- McpSmokeTester ---

export class McpSmokeTester {
  constructor(private readonly config: McpSmokeConfig) {}

  run(): McpSmokeReport {
    const start = Date.now();
    const allResults: ToolTestResult[] = [];

    const rng = makeRng(this.config.seed);

    for (let i = 0; i < this.config.runs; i++) {
      const results = this.runOne(rng);
      allResults.push(...results);
    }

    return {
      totalRuns: this.config.runs,
      toolResults: allResults,
      durationMs: Date.now() - start,
    };
  }

  private runOne(rng: () => number): ToolTestResult[] {
    const results: ToolTestResult[] = [];
    const state = makeDefaultState("smoke");
    const engine = new GameEngine(state);
    const config = loadConfig();
    const spawnInterval = config.batch.spawnIntervalMs;

    // --- Normal operations ---

    // status
    results.push(
      testTool("status", false, () => {
        engine.status();
      })
    );

    // energy
    results.push(
      testTool("energy", false, () => {
        engine.getGold();
      })
    );

    // scan — first process a tick to trigger spawns, then scan
    results.push(
      testTool("scan", false, () => {
        engine.processTick({ timestamp: spawnInterval * 2, sessionId: "smoke" }, rng);
        engine.scan(rng);
      })
    );

    // catch — only if creatures are nearby
    results.push(
      testTool("catch", false, () => {
        if (state.nearby.length > 0) {
          engine.catch(0, rng);
        }
      })
    );

    // Build up a collection over ticks 3..19
    for (let tick = 3; tick <= 19; tick++) {
      const now = tick * spawnInterval;
      try {
        engine.processTick({ timestamp: now, sessionId: `smoke-tick-${tick}` }, rng);
      } catch {
        // ignore tick errors during collection build
      }
      if (state.nearby.length > 0 && state.collection.length < 15) {
        try {
          engine.catch(0, rng);
        } catch {
          // ignore catch errors during collection build
        }
      }
    }

    // upgrade — if collection has creatures and gold >= 3
    results.push(
      testTool("upgrade", false, () => {
        const creature = state.collection.find((c) => !c.archived);
        if (creature && state.gold >= 3) {
          const slot = creature.slots[0];
          if (slot) {
            engine.upgrade(creature.id, slot.slotId);
          }
        }
      })
    );

    // quest_start — if collection >= 1 and no active quest
    results.push(
      testTool("quest_start", false, () => {
        const active = state.collection.filter((c) => !c.archived);
        if (active.length >= 1 && !state.activeQuest) {
          engine.questStart([active[0].id]);
        }
      })
    );

    // archive — if collection > 1, archive last (skip if quest-locked)
    results.push(
      testTool("archive", false, () => {
        const active = state.collection.filter((c) => !c.archived);
        if (active.length > 1) {
          const target = active[active.length - 1];
          const isQuestLocked =
            state.activeQuest &&
            state.activeQuest.creatureIds.includes(target.id);
          if (!isQuestLocked) {
            engine.archive(target.id);
          }
        }
      })
    );

    // --- Edge cases ---

    // catch index 999 (out of range)
    results.push(
      testTool("catch", true, () => {
        engine.catch(999, rng);
      })
    );

    // catch index -1
    results.push(
      testTool("catch", true, () => {
        engine.catch(-1, rng);
      })
    );

    // upgrade with nonexistent id
    results.push(
      testTool("upgrade", true, () => {
        engine.upgrade("nonexistent", "eyes" as SlotId);
      })
    );

    // upgrade with invalid slot
    results.push(
      testTool("upgrade", true, () => {
        const creature = state.collection.find((c) => !c.archived);
        if (creature) {
          engine.upgrade(creature.id, "invalid" as SlotId);
        } else {
          // If no creature, try with nonexistent anyway
          engine.upgrade("nonexistent", "invalid" as SlotId);
        }
      })
    );

    // quest_start with empty array
    results.push(
      testTool("quest_start", true, () => {
        engine.questStart([]);
      })
    );

    // archive with nonexistent id
    results.push(
      testTool("archive", true, () => {
        engine.archive("nonexistent-id");
      })
    );

    // release with nonexistent id
    results.push(
      testTool("release", true, () => {
        engine.release("nonexistent-id");
      })
    );

    return results;
  }
}

// scripts/smoke-breed.ts
// Manual smoke test for the new /breed UX. Builds an in-memory GameState
// with a few compi creatures and walks through every mode of runBreedCommand,
// printing the ANSI-rendered output to stdout so you can visually verify
// the flow a user will see.
//
// Run with:  npx ts-node scripts/smoke-breed.ts

import { GameEngine } from "../src/engine/game-engine";
import { SimpleTextRenderer } from "../src/renderers/simple-text";
import { runBreedCommand } from "../src/mcp-tools";
import {
  GameState,
  CollectionCreature,
  CreatureSlot,
  SlotId,
  SLOT_IDS,
} from "../src/types";

function makeSlot(slotId: SlotId, variantId: string): CreatureSlot {
  return { slotId, variantId, color: "white" };
}

function makeCreature(
  id: string,
  speciesId: string,
  name: string,
  generation = 1
): CollectionCreature {
  const variants = ["eye_c01", "mth_c01", "bod_c01", "tal_c01"];
  return {
    id,
    speciesId,
    name,
    slots: SLOT_IDS.map((s, i) => makeSlot(s, variants[i])),
    caughtAt: Date.now(),
    generation,
    archived: false,
  };
}

const state: GameState = {
  version: 4,
  profile: {
    level: 1,
    xp: 0,
    totalCatches: 3,
    totalMerges: 0,
    totalTicks: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: "",
  },
  collection: [
    makeCreature("a", "compi", "Bolt", 1),
    makeCreature("b", "compi", "Spark", 2),
    makeCreature("c", "compi", "Zap", 1),
    makeCreature("d", "flikk", "Ember", 1),
  ],
  archive: [],
  energy: 50,
  lastEnergyGainAt: Date.now(),
  nearby: [],
  batch: null,
  lastSpawnAt: 0,
  recentTicks: [],
  claimedMilestones: [],
  settings: { notificationLevel: "moderate" },
};

const engine = new GameEngine(state);
const renderer = new SimpleTextRenderer();

function section(title: string) {
  console.log("\n" + "=".repeat(70));
  console.log("  " + title);
  console.log("=".repeat(70) + "\n");
}

section("/collection  (numbered, this branch's change)");
console.log(renderer.renderCollection(engine.getState().collection));

section("/breed  (list mode, no args)");
console.log(runBreedCommand(engine, renderer, {}).output);

section("/breed 1  (partner mode: show partners for #1 Bolt)");
console.log(runBreedCommand(engine, renderer, { indexA: 1 }).output);

section("/breed 4  (partner mode: #4 Ember is a flikk, has no compi partners)");
console.log(runBreedCommand(engine, renderer, { indexA: 4 }).output);

section("/breed 1 2  (preview mode: Bolt + Spark)");
console.log(runBreedCommand(engine, renderer, { indexA: 1, indexB: 2 }).output);

section("/breed 1 4  (species mismatch error)");
try {
  console.log(runBreedCommand(engine, renderer, { indexA: 1, indexB: 4 }).output);
} catch (e) {
  console.log("  ERROR: " + (e as Error).message);
}

section("/breed 99  (out-of-range error)");
try {
  console.log(runBreedCommand(engine, renderer, { indexA: 99 }).output);
} catch (e) {
  console.log("  ERROR: " + (e as Error).message);
}

section("/breed 1 2 --confirm  (execute)");
const execResult = runBreedCommand(engine, renderer, {
  indexA: 1,
  indexB: 2,
  confirm: true,
});
console.log(execResult.output);
console.log("\n  mutated: " + execResult.mutated);

section("/collection  (after breeding: parents gone, child added)");
console.log(renderer.renderCollection(engine.getState().collection));

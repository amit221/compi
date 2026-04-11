// tests/mcp-tools/breed-tool.test.ts — unit tests for the `breed` MCP command handler

import { runBreedCommand } from "../../src/mcp-tools";
import { GameEngine } from "../../src/engine/game-engine";
import { SimpleTextRenderer } from "../../src/renderers/simple-text";
import {
  GameState,
  CollectionCreature,
  CreatureSlot,
  SlotId,
  SLOT_IDS,
} from "../../src/types";

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

function makeSlot(slotId: SlotId, variantId: string): CreatureSlot {
  return { slotId, variantId, color: "white" };
}

function makeCreature(
  id: string,
  speciesId: string,
  name: string,
  variants: [string, string, string, string],
  overrides?: Partial<CollectionCreature>
): CollectionCreature {
  return {
    id,
    speciesId,
    name,
    slots: SLOT_IDS.map((slotId, i) => makeSlot(slotId, variants[i])),
    caughtAt: Date.now(),
    generation: 0,
    archived: false,
    ...overrides,
  };
}

function makeState(collection: CollectionCreature[], energy = 30): GameState {
  return {
    version: 4,
    profile: {
      level: 1,
      xp: 0,
      totalCatches: 0,
      totalMerges: 0,
      totalTicks: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: "",
    },
    collection,
    archive: [],
    energy,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    lastSpawnAt: 0,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
  };
}

const V: [string, string, string, string] = [
  "eye_c01",
  "mth_c01",
  "bod_c01",
  "tal_c01",
];

function makeEngine(collection: CollectionCreature[], energy = 30) {
  return new GameEngine(makeState(collection, energy));
}

describe("runBreedCommand — list mode (table)", () => {
  const renderer = new SimpleTextRenderer();

  it("renders the breed table when no indexes are supplied", () => {
    const engine = makeEngine([
      makeCreature("a", "compi", "Bolt", V),
      makeCreature("b", "compi", "Spark", V),
    ]);
    const result = runBreedCommand(engine, renderer, {});
    expect(result.mutated).toBe(false);
    const out = stripAnsi(result.output);
    expect(out).toMatch(/BREED/);
    expect(out).toMatch(/compi/);
    expect(out).toMatch(/Bolt/);
    expect(out).toMatch(/Spark/);
  });

  it("returns the empty-state message when nothing is breedable", () => {
    const engine = makeEngine([makeCreature("a", "compi", "Lonely", V)]);
    const result = runBreedCommand(engine, renderer, {});
    expect(result.mutated).toBe(false);
    expect(stripAnsi(result.output)).toMatch(/No breedable pairs/i);
  });
});

describe("runBreedCommand — one-arg error", () => {
  const renderer = new SimpleTextRenderer();

  it("throws a helpful error when only indexA is supplied", () => {
    const engine = makeEngine([
      makeCreature("a", "compi", "Bolt", V),
      makeCreature("b", "compi", "Spark", V),
    ]);
    expect(() => runBreedCommand(engine, renderer, { indexA: 1 })).toThrow(
      /Pick two creatures/i
    );
  });

  it("throws a helpful error when only indexB is supplied", () => {
    const engine = makeEngine([
      makeCreature("a", "compi", "Bolt", V),
      makeCreature("b", "compi", "Spark", V),
    ]);
    expect(() => runBreedCommand(engine, renderer, { indexB: 2 })).toThrow(
      /indexA is required/i
    );
  });
});

describe("runBreedCommand — preview mode", () => {
  const renderer = new SimpleTextRenderer();

  it("returns a preview and does NOT mutate state when both indexes are supplied without confirm", () => {
    const engine = makeEngine([
      makeCreature("a", "compi", "Bolt", V),
      makeCreature("b", "compi", "Spark", V),
    ]);
    const before = engine.getState().collection.length;
    const result = runBreedCommand(engine, renderer, { indexA: 1, indexB: 2 });
    expect(result.mutated).toBe(false);
    expect(engine.getState().collection.length).toBe(before);
    const out = stripAnsi(result.output);
    expect(out).toMatch(/Breed/);
    expect(out).toMatch(/#1 Bolt/);
    expect(out).toMatch(/#2 Spark/);
    expect(out).toMatch(/--confirm/);
  });

  it("throws with clear error when indexA is out of range", () => {
    const engine = makeEngine([
      makeCreature("a", "compi", "Bolt", V),
      makeCreature("b", "compi", "Spark", V),
    ]);
    expect(() =>
      runBreedCommand(engine, renderer, { indexA: 99, indexB: 2 })
    ).toThrow(/No creature at index 99/);
  });

  it("throws with clear error when indexB is out of range", () => {
    const engine = makeEngine([
      makeCreature("a", "compi", "Bolt", V),
      makeCreature("b", "compi", "Spark", V),
    ]);
    expect(() =>
      runBreedCommand(engine, renderer, { indexA: 1, indexB: 99 })
    ).toThrow(/No creature at index 99/);
  });
});

describe("runBreedCommand — execute mode", () => {
  const renderer = new SimpleTextRenderer();

  it("executes the breed, mutates state, and returns mutated=true with confirm=true", () => {
    const engine = makeEngine(
      [
        makeCreature("a", "compi", "Bolt", V),
        makeCreature("b", "compi", "Spark", V),
      ],
      30
    );
    const beforeEnergy = engine.getState().energy;
    const beforeCount = engine.getState().collection.length;

    const result = runBreedCommand(engine, renderer, {
      indexA: 1,
      indexB: 2,
      confirm: true,
    });

    expect(result.mutated).toBe(true);
    expect(stripAnsi(result.output)).toMatch(/BREED SUCCESS/);
    expect(engine.getState().collection.length).toBe(beforeCount - 1);
    expect(engine.getState().energy).toBeLessThan(beforeEnergy);
  });
});

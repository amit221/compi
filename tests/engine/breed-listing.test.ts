// tests/engine/breed-listing.test.ts — listBreedable & listPartnersFor tests

import { listBreedable, listPartnersFor } from "../../src/engine/breed";
import {
  GameState,
  CollectionCreature,
  CreatureSlot,
  SlotId,
  SLOT_IDS,
} from "../../src/types";

function makeSlot(slotId: SlotId, variantId: string): CreatureSlot {
  return { slotId, variantId, color: "white" };
}

function makeCreature(
  id: string,
  speciesId: string,
  variants: [string, string, string, string],
  overrides?: Partial<CollectionCreature>
): CollectionCreature {
  return {
    id,
    speciesId,
    name: `Creature_${id}`,
    slots: SLOT_IDS.map((slotId, i) => makeSlot(slotId, variants[i])),
    caughtAt: Date.now(),
    generation: 0,
    archived: false,
    ...overrides,
  };
}

function makeState(collection: CollectionCreature[], energy = 20): GameState {
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

// Common variants
const C_EYES = "eye_c01";
const C_MOUTH = "mth_c01";
const C_BODY = "bod_c01";
const C_TAIL = "tal_c01";

describe("listBreedable", () => {
  it("returns empty array for empty collection", () => {
    const state = makeState([]);
    expect(listBreedable(state)).toEqual([]);
  });

  it("returns empty array when no same-species pairs exist", () => {
    const state = makeState([
      makeCreature("a", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("b", "flamecub", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    expect(listBreedable(state)).toEqual([]);
  });

  it("returns both creatures of a single same-species pair with partnerCount=1", () => {
    const state = makeState([
      makeCreature("a", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("b", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    const result = listBreedable(state);
    expect(result).toHaveLength(2);
    expect(result[0].creatureIndex).toBe(1);
    expect(result[0].creature.id).toBe("a");
    expect(result[0].partnerCount).toBe(1);
    expect(result[1].creatureIndex).toBe(2);
    expect(result[1].creature.id).toBe("b");
    expect(result[1].partnerCount).toBe(1);
  });

  it("counts multiple partners correctly", () => {
    const state = makeState([
      makeCreature("a", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("b", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("c", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("d", "flamecub", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    const result = listBreedable(state);
    // a, b, c each have 2 partners; d is alone
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.creature.id).sort()).toEqual(["a", "b", "c"]);
    for (const entry of result) {
      expect(entry.partnerCount).toBe(2);
    }
  });

  it("excludes archived creatures from both own listing and partner count", () => {
    const state = makeState([
      makeCreature("a", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("b", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL], {
        archived: true,
      }),
      makeCreature("c", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    const result = listBreedable(state);
    // a has 1 partner (c, not b), b is archived so excluded, c has 1 partner (a)
    expect(result.map((e) => e.creature.id).sort()).toEqual(["a", "c"]);
    expect(result.every((e) => e.partnerCount === 1)).toBe(true);
  });

  it("preserves 1-indexed creatureIndex matching collection order including archived gaps", () => {
    const state = makeState([
      makeCreature("x", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("y", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL], {
        archived: true,
      }),
      makeCreature("z", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    const result = listBreedable(state);
    // indexes should match raw array positions (1, 3), skipping archived #2
    expect(result.find((e) => e.creature.id === "x")?.creatureIndex).toBe(1);
    expect(result.find((e) => e.creature.id === "z")?.creatureIndex).toBe(3);
  });
});

describe("listPartnersFor", () => {
  it("returns the selected creature and its compatible partners with energy cost", () => {
    const state = makeState([
      makeCreature("a", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("b", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("c", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    const view = listPartnersFor(state, 1);
    expect(view.creatureIndex).toBe(1);
    expect(view.creature.id).toBe("a");
    expect(view.partners).toHaveLength(2);
    expect(view.partners.map((p) => p.creature.id).sort()).toEqual(["b", "c"]);
    expect(view.partners[0].partnerIndex).toBeGreaterThan(0);
    expect(view.partners[0].energyCost).toBeGreaterThan(0);
  });

  it("excludes the selected creature itself", () => {
    const state = makeState([
      makeCreature("a", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("b", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    const view = listPartnersFor(state, 1);
    expect(view.partners.every((p) => p.creature.id !== "a")).toBe(true);
  });

  it("excludes archived partners", () => {
    const state = makeState([
      makeCreature("a", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("b", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL], {
        archived: true,
      }),
      makeCreature("c", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    const view = listPartnersFor(state, 1);
    expect(view.partners).toHaveLength(1);
    expect(view.partners[0].creature.id).toBe("c");
    expect(view.partners[0].partnerIndex).toBe(3);
  });

  it("excludes different-species creatures", () => {
    const state = makeState([
      makeCreature("a", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("b", "flikk", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    const view = listPartnersFor(state, 1);
    expect(view.partners).toHaveLength(0);
  });

  it("throws when index is out of range (too high)", () => {
    const state = makeState([
      makeCreature("a", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    expect(() => listPartnersFor(state, 5)).toThrow(/index/i);
  });

  it("throws when index is out of range (zero or negative)", () => {
    const state = makeState([
      makeCreature("a", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    expect(() => listPartnersFor(state, 0)).toThrow(/index/i);
  });

  it("throws when the selected creature is archived", () => {
    const state = makeState([
      makeCreature("a", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL], {
        archived: true,
      }),
      makeCreature("b", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    expect(() => listPartnersFor(state, 1)).toThrow(/archived/i);
  });
});

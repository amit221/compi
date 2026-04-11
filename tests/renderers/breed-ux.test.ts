// tests/renderers/breed-ux.test.ts — renderer tests for breed UX redesign

import { SimpleTextRenderer } from "../../src/renderers/simple-text";
import {
  CollectionCreature,
  CreatureSlot,
  SlotId,
  SLOT_IDS,
  BreedableEntry,
  BreedPartnersView,
} from "../../src/types";

// Strip ANSI codes to make string assertions readable.
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
  variants: [string, string, string, string]
): CollectionCreature {
  return {
    id,
    speciesId,
    name,
    slots: SLOT_IDS.map((slotId, i) => makeSlot(slotId, variants[i])),
    caughtAt: Date.now(),
    generation: 0,
    archived: false,
  };
}

const V: [string, string, string, string] = [
  "eye_c01",
  "mth_c01",
  "bod_c01",
  "tal_c01",
];

describe("renderCollection numbering", () => {
  it("prefixes each creature row with a 1-indexed number", () => {
    const renderer = new SimpleTextRenderer();
    const collection = [
      makeCreature("a", "compi", "Bolt", V),
      makeCreature("b", "compi", "Ember", V),
    ];
    const out = stripAnsi(renderer.renderCollection(collection));
    expect(out).toMatch(/\b1\.\s+Bolt\b/);
    expect(out).toMatch(/\b2\.\s+Ember\b/);
  });
});

describe("renderBreedableList", () => {
  it("lists each breedable creature with its index and partner count", () => {
    const renderer = new SimpleTextRenderer();
    const entries: BreedableEntry[] = [
      {
        creatureIndex: 1,
        creature: makeCreature("a", "compi", "Bolt", V),
        partnerCount: 2,
      },
      {
        creatureIndex: 3,
        creature: makeCreature("c", "compi", "Spark", V),
        partnerCount: 2,
      },
    ];
    const out = stripAnsi(renderer.renderBreedableList(entries));
    expect(out).toMatch(/\b1\.\s+Bolt\b/);
    expect(out).toMatch(/2 partners/);
    expect(out).toMatch(/\b3\.\s+Spark\b/);
  });

  it("shows an empty-state message when nothing is breedable", () => {
    const renderer = new SimpleTextRenderer();
    const out = stripAnsi(renderer.renderBreedableList([]));
    expect(out).toMatch(/No breedable pairs/i);
  });
});

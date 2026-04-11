// tests/renderers/breed-ux.test.ts — renderer tests for breed UX polish

import { SimpleTextRenderer } from "../../src/renderers/simple-text";
import {
  CollectionCreature,
  CreatureSlot,
  SlotId,
  SLOT_IDS,
  BreedTable,
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

describe("renderBreedTable", () => {
  it("returns an empty-state message when no species has 2+ members", () => {
    const renderer = new SimpleTextRenderer();
    const out = stripAnsi(renderer.renderBreedTable({ species: [] }));
    expect(out).toMatch(/No breedable pairs/i);
  });

  it("prints a species section with bold header and column labels", () => {
    const renderer = new SimpleTextRenderer();
    const table: BreedTable = {
      species: [
        {
          speciesId: "compi",
          silhouette: makeCreature("sil", "compi", "_", V).slots,
          rows: [
            { creatureIndex: 1, creature: makeCreature("a", "compi", "Bolt", V) },
            { creatureIndex: 2, creature: makeCreature("b", "compi", "Spark", V) },
          ],
        },
      ],
    };
    const out = stripAnsi(renderer.renderBreedTable(table));
    expect(out).toMatch(/compi/);
    expect(out).toMatch(/NAME/);
    expect(out).toMatch(/EYES/);
    expect(out).toMatch(/MOUTH/);
    expect(out).toMatch(/BODY/);
    expect(out).toMatch(/TAIL/);
  });

  it("includes each creature's number, name, level, and trait names", () => {
    const renderer = new SimpleTextRenderer();
    const table: BreedTable = {
      species: [
        {
          speciesId: "compi",
          silhouette: makeCreature("sil", "compi", "_", V).slots,
          rows: [
            {
              creatureIndex: 3,
              creature: {
                ...makeCreature("a", "compi", "Bolt", V),
                generation: 2,
              },
            },
            {
              creatureIndex: 7,
              creature: {
                ...makeCreature("b", "compi", "Spark", V),
                generation: 1,
              },
            },
          ],
        },
      ],
    };
    const out = stripAnsi(renderer.renderBreedTable(table));
    expect(out).toMatch(/\b3\b.*Bolt/);
    expect(out).toMatch(/\b7\b.*Spark/);
    expect(out).toMatch(/Pebble/);
  });

  it("shows a trait rarity score in brackets next to each trait name", () => {
    const renderer = new SimpleTextRenderer();
    const table: BreedTable = {
      species: [
        {
          speciesId: "compi",
          silhouette: makeCreature("sil", "compi", "_", V).slots,
          rows: [
            { creatureIndex: 1, creature: makeCreature("a", "compi", "Bolt", V) },
          ],
        },
      ],
    };
    const out = stripAnsi(renderer.renderBreedTable(table));
    expect(out).toMatch(/\[\d+\]/);
  });

  it("prints a section per species", () => {
    const renderer = new SimpleTextRenderer();
    const table: BreedTable = {
      species: [
        {
          speciesId: "compi",
          silhouette: makeCreature("sil", "compi", "_", V).slots,
          rows: [
            { creatureIndex: 1, creature: makeCreature("a", "compi", "Bolt", V) },
            { creatureIndex: 2, creature: makeCreature("b", "compi", "Spark", V) },
          ],
        },
        {
          speciesId: "flikk",
          silhouette: makeCreature("sil2", "flikk", "_", V).slots,
          rows: [
            { creatureIndex: 3, creature: makeCreature("c", "flikk", "Ember", V) },
            { creatureIndex: 4, creature: makeCreature("d", "flikk", "Blaze", V) },
          ],
        },
      ],
    };
    const out = stripAnsi(renderer.renderBreedTable(table));
    expect(out).toMatch(/compi/);
    expect(out).toMatch(/flikk/);
    expect(out).toMatch(/Bolt/);
    expect(out).toMatch(/Ember/);
  });
});

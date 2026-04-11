# Breed UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current `/breed` (list mode) and `/breed N` (partner mode) output with per-species mini-tables that show each trait's individual rarity score next to a grey species silhouette on the left, and drop the "best pair" recommendation. Enrich `/breed N M` inheritance rows with the trait names and scores of both candidate variants.

**Architecture:** Add one new pure engine helper (`buildBreedTable`) that chunks the collection by species, and one new renderer method (`renderBreedTable`). Delete the now-unused `renderBreedableList`, `renderBreedPartners`, and the `/breed N` one-arg tool path. Tiny edit to `renderBreedPreview` to include `[score]` on each parent's trait in the inheritance block.

**Tech Stack:** TypeScript, Jest (ts-jest), MCP SDK, Zod.

**Spec:** `docs/superpowers/specs/2026-04-11-breed-ux-polish-design.md`

---

## File Structure

**Modify:**
- `src/types.ts` — add `BreedTable`, `BreedTableSpecies`, `BreedTableRow`; remove `renderBreedableList` and `renderBreedPartners` signatures from the `Renderer` interface, add `renderBreedTable`.
- `src/engine/breed.ts` — add `buildBreedTable(state)`. Keep `listBreedable` and `listPartnersFor` exported (they are still valid primitives), but they are no longer called by the live flow.
- `src/engine/game-engine.ts` — add `buildBreedTable()` wrapper method. Drop the now-unused `listBreedable()` / `listBreedPartners()` wrappers.
- `src/renderers/simple-text.ts` — add `renderBreedTable`; delete `renderBreedableList` and `renderBreedPartners`; update `renderBreedPreview` inheritance rows; import the grey color constant if not already present.
- `src/mcp-tools.ts` — `runBreedCommand`: replace list-mode body to use `buildBreedTable` + `renderBreedTable`; replace partner-mode body with a helpful error; remove the branch entirely and let the preview/execute code handle the two-index case.
- `skills/breed/SKILL.md` — drop the `/breed N` (one-number) mode instructions.
- `cursor-skills/breed/SKILL.md` — parallel update.
- `tests/engine/breed-listing.test.ts` — add `buildBreedTable` tests.
- `tests/renderers/breed-ux.test.ts` — delete `renderBreedableList` and `renderBreedPartners` tests; add `renderBreedTable` tests.
- `tests/mcp-tools/breed-tool.test.ts` — delete partner-mode tests; add one-arg-error test; update list-mode tests to expect the new table output.
- `tests/renderers/simple-text.test.ts` — update `renderBreedPreview` assertion if it checks the inheritance row text.

**Unchanged but referenced:**
- `previewBreed` / `executeBreed` engine signatures — no change.
- `tests/engine/breed.test.ts` — existing preview/execute tests stay untouched.
- `src/cli.ts` — out of scope.

---

## Task 1: Add `BreedTable` types and update the `Renderer` interface

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add new result types**

Locate the existing `BreedPartnersView` interface (near line 190 in the Engine Results section). Insert the following three interfaces immediately after it:

```ts
export interface BreedTableRow {
  /** 1-indexed position in state.collection */
  creatureIndex: number;
  creature: CollectionCreature;
}

export interface BreedTableSpecies {
  speciesId: string;
  /**
   * Slots of the first non-archived creature of this species in collection order.
   * The renderer draws these as a single grey "species silhouette" to the left
   * of the table — the slots are not associated with any specific row.
   */
  silhouette: CreatureSlot[];
  rows: BreedTableRow[];
}

export interface BreedTable {
  /** One entry per species that has >= 2 non-archived creatures. */
  species: BreedTableSpecies[];
}
```

- [ ] **Step 2: Update the `Renderer` interface**

Locate the `Renderer` interface (near line 285). Replace the current two breed-view signatures:

```ts
  renderBreedableList(entries: BreedableEntry[]): string;
  renderBreedPartners(view: BreedPartnersView): string;
```

with:

```ts
  renderBreedTable(table: BreedTable): string;
```

- [ ] **Step 3: Build to confirm no compile errors**

Run: `npm run build`
Expected: FAILS with errors in `src/renderers/simple-text.ts` (the class still declares the old methods) and `src/mcp-tools.ts` (the handler still calls them). **This is expected** — we fix them in later tasks. Do NOT commit Task 1 alone; we need Task 1 + Task 2 committed together so the tree stays green. Skip commit here.

- [ ] **Step 4: Hold off on commit**

No commit. Types are bundled with Task 2's engine helper in a single commit at the end of Task 2.

---

## Task 2: Implement `buildBreedTable` engine helper (TDD)

**Files:**
- Test: `tests/engine/breed-listing.test.ts` (append)
- Modify: `src/engine/breed.ts`

- [ ] **Step 1: Append failing tests to `tests/engine/breed-listing.test.ts`**

At the bottom of the file (after the `listPartnersFor` describe block), append:

```ts
import { buildBreedTable } from "../../src/engine/breed";

describe("buildBreedTable", () => {
  it("returns empty species array for empty collection", () => {
    const state = makeState([]);
    expect(buildBreedTable(state)).toEqual({ species: [] });
  });

  it("returns empty species array when no species has 2+ members", () => {
    const state = makeState([
      makeCreature("a", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("b", "flikk", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    expect(buildBreedTable(state).species).toEqual([]);
  });

  it("groups creatures by species and only includes species with >= 2 members", () => {
    const state = makeState([
      makeCreature("a", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("b", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("c", "flikk", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    const table = buildBreedTable(state);
    expect(table.species).toHaveLength(1);
    expect(table.species[0].speciesId).toBe("compi");
    expect(table.species[0].rows).toHaveLength(2);
    expect(table.species[0].rows[0].creatureIndex).toBe(1);
    expect(table.species[0].rows[1].creatureIndex).toBe(2);
  });

  it("silhouette is the slots of the first non-archived creature of the species", () => {
    const state = makeState([
      makeCreature("a", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL], {
        archived: true,
      }),
      makeCreature("b", "compi", ["eye_r01", C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("c", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    const table = buildBreedTable(state);
    expect(table.species).toHaveLength(1);
    // silhouette comes from creature "b" (first non-archived), not "a" (archived)
    const eyesVariant = table.species[0].silhouette.find(
      (s) => s.slotId === "eyes"
    )?.variantId;
    expect(eyesVariant).toBe("eye_r01");
  });

  it("excludes archived creatures from rows and the >= 2 count", () => {
    const state = makeState([
      makeCreature("a", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("b", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL], {
        archived: true,
      }),
      makeCreature("c", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    const table = buildBreedTable(state);
    expect(table.species).toHaveLength(1);
    expect(table.species[0].rows).toHaveLength(2);
    expect(table.species[0].rows.map((r) => r.creature.id)).toEqual(["a", "c"]);
  });

  it("preserves creatureIndex as the original 1-indexed collection position", () => {
    const state = makeState([
      makeCreature("x", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("y", "flikk", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("z", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    const table = buildBreedTable(state);
    const compi = table.species.find((s) => s.speciesId === "compi");
    expect(compi?.rows.map((r) => r.creatureIndex)).toEqual([1, 3]);
  });

  it("species are returned in first-encountered order", () => {
    const state = makeState([
      makeCreature("a", "flikk", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("b", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("c", "flikk", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("d", "compi", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    const table = buildBreedTable(state);
    expect(table.species.map((s) => s.speciesId)).toEqual(["flikk", "compi"]);
  });
});
```

Note: the test file's existing `makeCreature` helper uses string literals like `"compi"` / `"flikk"` — these are valid species. The existing helpers `makeState`, `makeCreature`, `makeSlot`, `C_EYES`, etc. are already defined near the top of the file. Do not redefine them.

- [ ] **Step 2: Run tests to verify failure**

Run: `npx jest tests/engine/breed-listing.test.ts -t buildBreedTable`
Expected: FAIL — `buildBreedTable` is not exported yet.

- [ ] **Step 3: Implement `buildBreedTable` in `src/engine/breed.ts`**

Add `BreedTable`, `BreedTableSpecies`, `BreedTableRow` to the imports at the top of `src/engine/breed.ts`. The updated import block:

```ts
import {
  GameState,
  CollectionCreature,
  CreatureSlot,
  SlotId,
  SLOT_IDS,
  SlotInheritance,
  BreedPreview,
  BreedResult,
  TraitDefinition,
  BreedableEntry,
  BreedablePartner,
  BreedPartnersView,
  BreedTable,
  BreedTableSpecies,
  BreedTableRow,
} from "../types";
```

Append at the end of `src/engine/breed.ts`:

```ts
/**
 * Build the data for the /breed top-level view: creatures grouped by species,
 * only including species with >= 2 non-archived members. Each species entry
 * carries a "silhouette" (the slots of the first non-archived creature of that
 * species) which the renderer draws in a single neutral grey to the left of
 * the table.
 */
export function buildBreedTable(state: GameState): BreedTable {
  // Preserve first-encountered species order
  const speciesOrder: string[] = [];
  const bySpecies = new Map<string, BreedTableRow[]>();
  const silhouetteBy = new Map<string, CreatureSlot[]>();

  for (let i = 0; i < state.collection.length; i++) {
    const creature = state.collection[i];
    if (creature.archived) continue;

    if (!bySpecies.has(creature.speciesId)) {
      bySpecies.set(creature.speciesId, []);
      speciesOrder.push(creature.speciesId);
      silhouetteBy.set(creature.speciesId, creature.slots);
    }
    bySpecies.get(creature.speciesId)!.push({
      creatureIndex: i + 1,
      creature,
    });
  }

  const species: BreedTableSpecies[] = [];
  for (const speciesId of speciesOrder) {
    const rows = bySpecies.get(speciesId)!;
    if (rows.length < 2) continue; // needs at least 2 for a breedable pair
    species.push({
      speciesId,
      silhouette: silhouetteBy.get(speciesId)!,
      rows,
    });
  }

  return { species };
}
```

- [ ] **Step 4: Run tests — they should pass**

Run: `npx jest tests/engine/breed-listing.test.ts -t buildBreedTable`
Expected: PASS (7 tests).

- [ ] **Step 5: Run full engine suite for regression**

Run: `npx jest tests/engine/`
Expected: all pass, including existing `breed.test.ts` and `breed-listing.test.ts`.

- [ ] **Step 6: Commit types + engine helper together**

```bash
git add src/types.ts src/engine/breed.ts tests/engine/breed-listing.test.ts
git commit -m "feat(engine): add buildBreedTable helper + BreedTable types"
```

Note: `src/renderers/simple-text.ts` still references the removed interface methods at this point, so `npm run build` will still fail. That's fixed in Task 3.

---

## Task 3: Add `renderBreedTable` and remove the old two breed-view methods

**Files:**
- Modify: `src/renderers/simple-text.ts`
- Test: `tests/renderers/breed-ux.test.ts` (rewrite)

- [ ] **Step 1: Rewrite the test file**

Replace the entire contents of `tests/renderers/breed-ux.test.ts` with:

```ts
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
    // Each row shows trait names — using a known compi variant
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
    // Score is a 1-100 integer in square brackets next to the trait name
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
```

- [ ] **Step 2: Run tests — they should fail**

Run: `npx jest tests/renderers/breed-ux.test.ts`
Expected: FAIL — `renderBreedTable` does not exist on `SimpleTextRenderer` yet.

- [ ] **Step 3: Update imports in `src/renderers/simple-text.ts`**

Replace the current types import block at the top with:

```ts
import {
  Renderer,
  ScanResult,
  CatchResult,
  BreedPreview,
  BreedResult,
  StatusResult,
  Notification,
  CollectionCreature,
  CreatureSlot,
  SlotId,
  BreedTable,
  BreedTableSpecies,
} from "../types";
```

(`BreedableEntry`, `BreedablePartner`, `BreedPartnersView` are removed from the imports — they are no longer used.)

- [ ] **Step 4: Delete `renderBreedableList` and `renderBreedPartners`**

Locate the `renderBreedableList(entries: BreedableEntry[]): string { ... }` method. Delete it in full.

Locate the `renderBreedPartners(view: BreedPartnersView): string { ... }` method. Delete it in full.

- [ ] **Step 5: Add a grey silhouette helper and `renderBreedTable`**

At the top of the file near the existing ANSI constants, confirm that a neutral grey color exists. If `COLOR_ANSI.grey` is `"\x1b[90m"` (already is), use that. No new constant needed.

Add a private helper for grey silhouette art, **above** the `SimpleTextRenderer` class (alongside the existing `renderCreatureLines` helper):

```ts
/**
 * Render a creature's slots as art lines overridden to a single neutral grey,
 * regardless of per-slot rarity. Used as a species "silhouette" next to the
 * breed table. The slot art itself still comes from the species template.
 */
function renderGreySilhouette(slots: CreatureSlot[], speciesId: string): string[] {
  const slotArt: Record<string, string> = {};
  for (const s of slots) {
    const trait = getTraitDefinition(speciesId, s.variantId);
    slotArt[s.slotId] = trait?.art ?? "???";
  }

  const species = getSpeciesById(speciesId);
  const GREY = COLOR_ANSI.grey;

  if (species?.art) {
    return species.art.map((line) => {
      let result = line;
      const replacements: [string, string][] = [
        ["EE", slotArt["eyes"] ?? ""],
        ["MM", slotArt["mouth"] ?? ""],
        ["BB", slotArt["body"] ?? ""],
        ["TT", slotArt["tail"] ?? ""],
      ];
      for (const [placeholder, art] of replacements) {
        result = result.replace(placeholder, art);
      }
      return GREY + result + RESET;
    });
  }

  // Fallback: use the same shape as the non-species path in renderCreatureLines
  const eyesArt = slotArt["eyes"] ?? "o.o";
  const mouthArt = slotArt["mouth"] ?? " - ";
  const bodyArt = slotArt["body"] ?? " ░░ ";
  const tailArt = slotArt["tail"] ?? "~";
  return [
    `      ${GREY}${eyesArt}${RESET}`,
    `     ${GREY}(${mouthArt})${RESET}`,
    `    ${GREY}╱${bodyArt}╲${RESET}`,
    `      ${GREY}${tailArt}${RESET}`,
  ];
}
```

Add the `renderBreedTable` method to the `SimpleTextRenderer` class (insert after `renderBreedResult`):

```ts
  renderBreedTable(table: BreedTable): string {
    if (table.species.length === 0) {
      return "  No breedable pairs yet — you need 2+ creatures of the same species.\n  Use /scan and /catch to find more.";
    }

    const lines: string[] = [];
    lines.push(
      `  ${DIM}${"═".repeat(74)}${RESET}`
    );
    lines.push(
      `  ${BOLD}BREED${RESET}   ${DIM}${table.species.reduce(
        (n, s) => n + s.rows.length,
        0
      )} creatures, ${table.species.length} species${RESET}`
    );
    lines.push(`  ${DIM}${"═".repeat(74)}${RESET}`);
    lines.push("");

    for (const s of table.species) {
      this.appendBreedSpeciesSection(lines, s);
      lines.push("");
    }

    lines.push(`  ${DIM}${"─".repeat(74)}${RESET}`);
    lines.push(
      `  ${DIM}Run /breed N M to preview a pair  ·  add --confirm to execute${RESET}`
    );
    lines.push(`  ${DIM}${"─".repeat(74)}${RESET}`);

    return lines.join("\n");
  }

  private appendBreedSpeciesSection(
    lines: string[],
    species: BreedTableSpecies
  ): void {
    lines.push(
      `  ${BOLD}${species.speciesId}${RESET}  ${DIM}${species.rows.length} creatures${RESET}`
    );
    lines.push(`  ${DIM}${"─".repeat(74)}${RESET}`);

    const header =
      `  ${DIM}  #    NAME       LV    ` +
      `EYES             MOUTH            BODY             TAIL${RESET}`;
    const rule =
      `  ${DIM}  ───  ─────────  ──    ` +
      `──────────────   ──────────────   ──────────────   ──────────────${RESET}`;

    const silhouette = renderGreySilhouette(species.silhouette, species.speciesId);
    // Build row text lines (one per creature) then interleave with silhouette
    const rowTexts: string[] = [header, rule];
    for (const row of species.rows) {
      rowTexts.push(this.breedRowLine(row, species.speciesId));
    }

    // Place silhouette to the left of the body rows. Total lines = max(silhouette, rowTexts)
    const total = Math.max(silhouette.length, rowTexts.length);
    for (let i = 0; i < total; i++) {
      const sil = silhouette[i] ?? "".padEnd(0);
      const txt = rowTexts[i] ?? "";
      // Silhouette is ~13 visible chars wide; pad to ART_PAD for alignment
      lines.push(this.padSilhouette(sil) + " " + txt);
    }
  }

  private padSilhouette(silhouetteLine: string): string {
    // Strip ANSI to measure, then pad so the combined line aligns
    const visible = silhouetteLine.replace(/\x1b\[[0-9;]*m/g, "");
    const target = 14;
    const pad = Math.max(0, target - stringWidth(visible));
    return "  " + silhouetteLine + " ".repeat(pad);
  }

  private breedRowLine(row: BreedTableRow, speciesId: string): string {
    const { creatureIndex, creature } = row;
    const num = String(creatureIndex).padStart(3);
    const nameCell = creature.name.padEnd(9);
    const lv = String(creature.generation).padStart(2);

    const order: SlotId[] = ["eyes", "mouth", "body", "tail"];
    const cells: string[] = [];
    for (const slotId of order) {
      const slot = creature.slots.find((s) => s.slotId === slotId);
      if (!slot) {
        cells.push(`${DIM}—${RESET}`.padEnd(16));
        continue;
      }
      const variant = getTraitDefinition(speciesId, slot.variantId);
      const traitName = variant?.name ?? slot.variantId;
      const score = Math.round(
        calculateTraitRarityScore(speciesId, slot.slotId, slot.variantId)
      );
      const color = calculateRarityColor(score);
      const label = `${traitName} [${score}]`;
      const visibleLen = stringWidth(label);
      const pad = Math.max(0, 14 - visibleLen);
      cells.push(`${color}${label}${RESET}` + " ".repeat(pad));
    }

    return `  ${num}  ${BOLD}${nameCell}${RESET}  ${lv}   ` + cells.join("   ");
  }
```

Note: `BreedTableRow` needs to be added to the imports (it is referenced by `breedRowLine`). Update the import block from Step 3:

```ts
import {
  Renderer,
  ScanResult,
  CatchResult,
  BreedPreview,
  BreedResult,
  StatusResult,
  Notification,
  CollectionCreature,
  CreatureSlot,
  SlotId,
  BreedTable,
  BreedTableSpecies,
  BreedTableRow,
} from "../types";
```

- [ ] **Step 6: Build to confirm the renderer compiles**

Run: `npm run build`
Expected: STILL FAILS because `src/mcp-tools.ts` still calls the deleted `renderBreedableList`/`renderBreedPartners`. That's Task 5. For now we only need the renderer file itself to have no type errors. You can test this with:

Run: `npx tsc --noEmit src/renderers/simple-text.ts 2>&1 | head -20`

Expected: no output from `src/renderers/simple-text.ts` itself. Errors from other files (`src/mcp-tools.ts`) are expected.

- [ ] **Step 7: Run the renderer tests**

Run: `npx jest tests/renderers/breed-ux.test.ts`
Expected: PASS (all new `renderBreedTable` tests + the existing `renderCollection numbering` test from the previous branch).

- [ ] **Step 8: Hold off on commit**

No commit yet. We bundle Task 3 + Task 4 + Task 5 into a single green commit so the tree never ships with a broken build.

---

## Task 4: Update `renderBreedPreview` inheritance rows with trait score labels

**Files:**
- Modify: `src/renderers/simple-text.ts`
- Test: `tests/renderers/simple-text.test.ts`

- [ ] **Step 1: Locate the current `renderBreedPreview` inheritance block**

In `src/renderers/simple-text.ts`, inside `renderBreedPreview`, find:

```ts
    lines.push(`  ${BOLD}Inheritance odds:${RESET}`);
    for (const si of slotInheritance) {
      const slotLabel = si.slotId.padEnd(5);
      const pctA = `${Math.round(si.parentAChance * 100)}%`;
      const pctB = `${Math.round(si.parentBChance * 100)}%`;
      lines.push(`    ${WHITE}${slotLabel}${RESET}  ${DIM}A:${RESET} ${pctA}  ${DIM}B:${RESET} ${pctB}`);
    }
```

- [ ] **Step 2: Replace with score-labeled format**

Replace that block with:

```ts
    lines.push(`  ${BOLD}Inheritance odds:${RESET}`);
    for (const si of slotInheritance) {
      const slotLabel = si.slotId.padEnd(5);
      const pctA = `${Math.round(si.parentAChance * 100)}%`;
      const pctB = `${Math.round(si.parentBChance * 100)}%`;
      const scoreA = Math.round(
        calculateTraitRarityScore(parentA.speciesId, si.slotId, si.parentAVariant.id)
      );
      const scoreB = Math.round(
        calculateTraitRarityScore(parentB.speciesId, si.slotId, si.parentBVariant.id)
      );
      const colorA = calculateRarityColor(scoreA);
      const colorB = calculateRarityColor(scoreB);
      lines.push(
        `    ${WHITE}${slotLabel}${RESET}  ${DIM}A:${RESET} ${colorA}${si.parentAVariant.name} [${scoreA}]${RESET} ${pctA}  ${DIM}B:${RESET} ${colorB}${si.parentBVariant.name} [${scoreB}]${RESET} ${pctB}`
      );
    }
```

- [ ] **Step 3: Check / update existing `renderBreedPreview` tests**

Run: `npx jest tests/renderers/simple-text.test.ts -t renderBreedPreview 2>&1 | tail -40`

If any assertion checks the exact inheritance row string (`"A: 42%"` etc.) and fails, relax or update it to match the new format. Prefer `toContain`-style assertions over exact equality. The common fix is to change tests that look like:

```ts
expect(out).toContain("A: 42%");
```

to match the new format by either removing the exact check or changing to:

```ts
expect(out).toMatch(/A:.*42%/);
```

Do not add new assertions — just keep the existing ones green.

- [ ] **Step 4: Build — should still fail only in mcp-tools.ts**

Run: `npx tsc --noEmit 2>&1 | grep -v mcp-tools | head -20`
Expected: no errors outside `mcp-tools.ts`.

- [ ] **Step 5: Hold off on commit**

Still bundled with Task 5.

---

## Task 5: Rewrite `runBreedCommand` in `src/mcp-tools.ts`

**Files:**
- Modify: `src/mcp-tools.ts`
- Modify: `src/engine/game-engine.ts`
- Test: `tests/mcp-tools/breed-tool.test.ts`

- [ ] **Step 1: Add `buildBreedTable()` wrapper on `GameEngine`**

In `src/engine/game-engine.ts`, update the breed-related imports:

```ts
import { previewBreed, executeBreed, buildBreedTable } from "./breed";
```

(`listBreedable` and `listPartnersFor` are removed from this import line — they are no longer called by any GameEngine method. The module-level functions remain exported from `src/engine/breed.ts` for anyone who imports from the barrel.)

Also update the types import at the top to drop `BreedableEntry` and `BreedPartnersView` and add `BreedTable`:

```ts
import { GameState, Tick, TickResult, ScanResult, ScanEntry, CatchResult, BreedPreview, BreedResult, ArchiveResult, StatusResult, Notification, BreedTable } from "../types";
```

Delete the two wrapper methods `listBreedable()` and `listBreedPartners(creatureIndex: number)`. In their place, add:

```ts
  buildBreedTable(): BreedTable {
    return buildBreedTable(this.state);
  }
```

The method shadows the imported name; the unqualified `buildBreedTable(this.state)` call resolves to the module-level import (same pattern used in previous branches).

- [ ] **Step 2: Rewrite `runBreedCommand` in `src/mcp-tools.ts`**

Locate the existing `runBreedCommand` function. Replace its body with:

```ts
export function runBreedCommand(
  engine: GameEngine,
  renderer: SimpleTextRenderer,
  args: { indexA?: number; indexB?: number; confirm?: boolean }
): { output: string; mutated: boolean } {
  const { indexA, indexB, confirm } = args;
  const collection = engine.getState().collection;

  // List mode: no indexes → show the species-grouped breed table
  if (indexA === undefined && indexB === undefined) {
    return {
      output: renderer.renderBreedTable(engine.buildBreedTable()),
      mutated: false,
    };
  }

  // One-arg mode is no longer supported
  if (indexA !== undefined && indexB === undefined) {
    throw new Error(
      "Pick two creatures to breed. Run /breed to see all breedable creatures, or /breed N M to preview a pair."
    );
  }
  if (indexA === undefined && indexB !== undefined) {
    throw new Error(
      "indexA is required. Run /breed to see all breedable creatures, or /breed N M to preview a pair."
    );
  }

  // Preview / execute mode
  if (indexA === undefined || indexB === undefined) {
    // Truly unreachable — keeps TS happy
    throw new Error("Both indexA and indexB are required to preview or confirm a breed.");
  }
  if (indexA < 1 || indexA > collection.length) {
    throw new Error(
      `No creature at index ${indexA}. You have ${collection.length} creatures.`
    );
  }
  if (indexB < 1 || indexB > collection.length) {
    throw new Error(
      `No creature at index ${indexB}. You have ${collection.length} creatures.`
    );
  }
  const parentAId = collection[indexA - 1].id;
  const parentBId = collection[indexB - 1].id;

  if (confirm) {
    const result = engine.breedExecute(parentAId, parentBId);
    return { output: renderer.renderBreedResult(result), mutated: true };
  }
  const preview = engine.breedPreview(parentAId, parentBId);
  return { output: renderer.renderBreedPreview(preview), mutated: false };
}
```

- [ ] **Step 3: Rewrite the tool-layer test file**

Replace the entire contents of `tests/mcp-tools/breed-tool.test.ts` with:

```ts
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
```

- [ ] **Step 4: Run the full test suite**

Run: `npm run build && npx jest`
Expected: build succeeds, all tests pass.

- [ ] **Step 5: Single bundled commit for Tasks 3–5**

```bash
git add src/renderers/simple-text.ts src/engine/game-engine.ts src/mcp-tools.ts src/types.ts tests/renderers/breed-ux.test.ts tests/renderers/simple-text.test.ts tests/mcp-tools/breed-tool.test.ts
git commit -m "feat(breed): trait-score mini-table view, drop /breed N partner mode"
```

Include `src/types.ts` here too — it was touched in Task 1 but intentionally not committed alone.

Note: `buildBreedTable` from Task 2 was already committed separately (Task 2 Step 6). This commit completes the change by wiring the new view into the renderer and the MCP tool, and removing the now-dead `renderBreedableList` / `renderBreedPartners` paths.

---

## Task 6: Update `skills/breed/SKILL.md`

**Files:**
- Modify: `skills/breed/SKILL.md`

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `skills/breed/SKILL.md` with:

```markdown
---
name: breed
model: claude-haiku-4-5-20251001
description: Breed two creatures from your collection (picks via /collection index)
---

Parse the arguments. The command supports three shapes:

- `/breed` (no args) — show the breed table (all breedable creatures grouped by species)
- `/breed N M` (two numbers) — preview mode, preview breeding creatures at indexes N and M
- `/breed N M --confirm` — execute mode, execute the breed

Single-number `/breed N` is no longer supported; users pick two numbers directly from the table.

Flow:

1. If no positional numbers were given, call `mcp__plugin_compi_compi__breed` with **no arguments**.
2. If two positional numbers `N` and `M` were given:
   - Without `--confirm`: call the tool with `indexA: N`, `indexB: M`.
   - With `--confirm`: call the tool with `indexA: N`, `indexB: M`, `confirm: true`.
3. If only one positional number was given, call the tool with `indexA: N` (the tool will return a helpful error).

After the tool call, run this Bash command to display the output with colors:

```
cat "$LOCALAPPDATA/Temp/compi_display.txt" && rm -f "$LOCALAPPDATA/Temp/compi_display.txt"
```

Then respond based on which mode was used:

- List mode (no args): "Press Ctrl+O to expand the table above. Pick two creatures of the same species and run `/breed N M`."
- Preview mode: "Press Ctrl+O to expand the breed preview above. Run `/breed N M --confirm` to proceed."
- Execute mode: "Press Ctrl+O to expand the breed result above."
- Error mode: Report the error message as-is.

Do not describe the tool output in your own words.
```

- [ ] **Step 2: Commit**

```bash
git add skills/breed/SKILL.md
git commit -m "docs(skills): drop /breed N partner mode from /breed skill"
```

---

## Task 7: Update `cursor-skills/breed/SKILL.md`

**Files:**
- Modify: `cursor-skills/breed/SKILL.md`

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `cursor-skills/breed/SKILL.md` with:

```markdown
---
name: breed
description: Breed two creatures from your collection (picks via /collection index)
---

Parse the arguments. The command supports three shapes:

- `/breed` (no args) — show the breed table (all breedable creatures grouped by species)
- `/breed N M` (two numbers) — preview mode
- `/breed N M --confirm` — execute mode

Single-number `/breed N` is no longer supported; users pick two numbers directly from the table.

Flow:

1. If no positional numbers were given, call the compi `breed` MCP tool with **no arguments**.
2. If two numbers `N` and `M` were given:
   - Without `--confirm`: call with `indexA: N`, `indexB: M`.
   - With `--confirm`: call with `indexA: N`, `indexB: M`, `confirm: true`.
3. If only one positional number was given, call with `indexA: N` (the tool returns a helpful error).

The result is displayed in the visual panel above. Respond based on mode:

- List mode: "Breed table shown above. Run `/breed N M` to preview a pair."
- Preview mode: "Preview shown above. Proceed with `/breed N M --confirm`."
- Execute mode: One-line summary of the result.
- Error mode: Report the error message as-is.

Do NOT output the raw tool response.
```

- [ ] **Step 2: Commit**

```bash
git add cursor-skills/breed/SKILL.md
git commit -m "docs(cursor-skills): drop /breed N partner mode from /breed skill"
```

---

## Task 8: Final verification

**Files:** (none — read-only)

- [ ] **Step 1: Full build and test**

Run: `npm run build && npx jest`
Expected: build succeeds, all tests pass (should be ≥ 229 tests; the exact total depends on how tests were added/removed).

- [ ] **Step 2: Smoke test the new view**

If the smoke-test script still exists at `scripts/smoke-breed.ts`, run it and visually confirm the new output:

Run: `npx ts-node scripts/smoke-breed.ts 2>&1 | head -80`
Expected: the list-mode section shows "BREED" header, a `compi` species block with a grey silhouette on the left, a table with `# NAME LV EYES MOUTH BODY TAIL` columns, and trait cells like `Pebble [5]`.

If the smoke-test script is outdated (e.g. references the old `renderBreedableList`), that's fine — update the script to call `renderBreedTable` instead, or delete the script. **Do not let the smoke test block the task list.** It's informational.

- [ ] **Step 3: Check no stale references remain**

Run: `grep -r "renderBreedableList\|renderBreedPartners\|listBreedPartners" src/ 2>&1`
Expected: no matches. Both renderer methods should be fully removed, and the GameEngine `listBreedPartners` wrapper should also be gone.

(`listPartnersFor` in `src/engine/breed.ts` is allowed to remain as an exported but unused primitive.)

- [ ] **Step 4: No commit unless fixups were needed**

If steps 1–3 surfaced issues, fix them and commit. Otherwise, no commit.

---

## Self-Review Checklist

After executing the plan, confirm:

- [ ] `/breed` (no args) shows species-grouped mini-tables with grey silhouettes on the left
- [ ] Each table row shows trait names with `[score]` next to each
- [ ] Trait cells are colored by their individual rarity score
- [ ] No "best pair" recommendation and no success % shown at the top level
- [ ] `/breed N` (one number) returns a clear error, not a partner view
- [ ] `/breed N M` preview still works and now shows `Name [score]` for both parents in the inheritance rows
- [ ] `/breed N M --confirm` executes as before
- [ ] All 229+ tests pass
- [ ] `renderBreedableList` and `renderBreedPartners` are fully removed from the codebase
- [ ] Skill files no longer mention `/breed N` (one-arg form)

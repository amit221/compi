# Breed UX: Intuitive Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the opaque `/breed [parentAId] [parentBId]` flow with a progressive index-based menu so users can discover and pick breeding pairs without knowing internal IDs, matching the `/scan` + `/catch` ergonomic.

**Architecture:** Add two pure engine helpers (`listBreedable`, `listPartnersFor`) that derive breedable data from `GameState`. The existing `previewBreed` / `executeBreed` engine functions stay unchanged — the MCP tool layer resolves user-supplied 1-indexed collection indexes into internal IDs before calling them. Two new renderer methods display the list and partner views. The `/collection` renderer gains a leading 1-indexed number. A new `/breedable` slash command aliases `/breed` with no args for discoverability.

**Tech Stack:** TypeScript, Jest (ts-jest), MCP SDK (`@modelcontextprotocol/sdk`), Zod schemas.

**Spec:** `docs/superpowers/specs/2026-04-11-breed-ux-intuitive-design.md`

---

## File Structure

**Modify:**
- `src/types.ts` — add `BreedableEntry`, `BreedablePartner`, `BreedPartnersView` result types
- `src/engine/breed.ts` — add `listBreedable`, `listPartnersFor`
- `src/engine/game-engine.ts` — add `listBreedable()`, `listPartners(index)` methods
- `src/renderers/simple-text.ts` — add `renderBreedableList`, `renderBreedPartners`; add numeric prefix to `renderCollection`
- `src/mcp-tools.ts` — rewrite the `breed` tool with new index-based schema and three modes
- `src/index.ts` — export new engine helpers (if index barrel is used — check during Task 2)
- `skills/breed/SKILL.md` — rewrite to parse 0/1/2 positional numeric args
- `skills/list/SKILL.md` — update command table (also fixes the stale `/compi:merge` entry)
- `cursor-skills/breed/SKILL.md` — parallel rewrite for the Cursor plugin variant
- `cursor-skills/list/SKILL.md` — parallel command-table update

**Create:**
- `skills/breedable/SKILL.md` — alias command, forwards to `breed` tool with no args
- `cursor-skills/breedable/SKILL.md` — parallel alias for the Cursor plugin variant
- `tests/engine/breed-listing.test.ts` — unit tests for `listBreedable` and `listPartnersFor`
- `tests/renderers/breed-ux.test.ts` — renderer tests for new methods and collection numbering

**Unchanged but referenced:**
- `src/engine/breed.ts` `previewBreed` / `executeBreed` — signatures stay ID-based
- `tests/engine/breed.test.ts` — existing tests keep passing untouched
- `src/cli.ts` — keeps its existing `compi breed <aId> <bId>` ID-based interface; the CLI is a power-user entry point and out of scope for this UX redesign

---

## Task 1: Add new result types to `src/types.ts`

**Files:**
- Modify: `src/types.ts` (add new interfaces in the "Engine Results" section, around line 167)

- [ ] **Step 1: Add types after the `BreedResult` interface**

In `src/types.ts`, locate the `BreedResult` interface (around line 162-167) and add the following three new interfaces immediately after it (before the `ArchiveResult` interface):

```ts
export interface BreedableEntry {
  /** 1-indexed position in the collection array */
  creatureIndex: number;
  creature: CollectionCreature;
  /** Number of same-species, non-archived partners this creature has */
  partnerCount: number;
}

export interface BreedablePartner {
  /** 1-indexed position in the collection array */
  partnerIndex: number;
  creature: CollectionCreature;
  /** Energy cost to breed the selected creature with this partner */
  energyCost: number;
}

export interface BreedPartnersView {
  /** 1-indexed position of the selected creature */
  creatureIndex: number;
  creature: CollectionCreature;
  partners: BreedablePartner[];
}
```

- [ ] **Step 2: Build TypeScript to confirm no compile errors**

Run: `npm run build`
Expected: succeeds with no errors. The new types are not yet used anywhere, so this is purely a type-add.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): add BreedableEntry, BreedablePartner, BreedPartnersView"
```

---

## Task 2: Add `listBreedable` engine helper (TDD)

**Files:**
- Test: `tests/engine/breed-listing.test.ts` (create)
- Modify: `src/engine/breed.ts`

- [ ] **Step 1: Create the failing test file**

Create `tests/engine/breed-listing.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test — it should fail with import error**

Run: `npx jest tests/engine/breed-listing.test.ts`
Expected: FAIL with `Cannot find name 'listBreedable'` or import error — the function does not yet exist.

- [ ] **Step 3: Implement `listBreedable` in `src/engine/breed.ts`**

Add the following export at the end of `src/engine/breed.ts`:

```ts
import { BreedableEntry } from "../types";

/**
 * List creatures from the collection that have at least one valid breeding partner
 * (same species, both non-archived, not themselves). Each entry uses a 1-indexed
 * position matching the creature's raw position in `state.collection`.
 */
export function listBreedable(state: GameState): BreedableEntry[] {
  const entries: BreedableEntry[] = [];

  for (let i = 0; i < state.collection.length; i++) {
    const creature = state.collection[i];
    if (creature.archived) continue;

    let partnerCount = 0;
    for (let j = 0; j < state.collection.length; j++) {
      if (i === j) continue;
      const candidate = state.collection[j];
      if (candidate.archived) continue;
      if (candidate.speciesId !== creature.speciesId) continue;
      partnerCount++;
    }

    if (partnerCount > 0) {
      entries.push({
        creatureIndex: i + 1,
        creature,
        partnerCount,
      });
    }
  }

  return entries;
}
```

Note: `BreedableEntry` must be added to the existing imports at the top of `src/engine/breed.ts`. Update the first import block:

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
} from "../types";
```

(Remove the duplicate `import { BreedableEntry } from "../types";` if you added one at the bottom.)

- [ ] **Step 4: Run the `listBreedable` tests — they should pass**

Run: `npx jest tests/engine/breed-listing.test.ts -t listBreedable`
Expected: PASS (6 tests in the `listBreedable` describe block).

The `listPartnersFor` tests in the file will still fail because that import is unresolved. That's expected — we'll implement it in Task 3.

- [ ] **Step 5: Commit**

```bash
git add src/engine/breed.ts tests/engine/breed-listing.test.ts
git commit -m "feat(engine): add listBreedable helper"
```

---

## Task 3: Add `listPartnersFor` engine helper (TDD)

**Files:**
- Modify: `tests/engine/breed-listing.test.ts` (add describe block)
- Modify: `src/engine/breed.ts`

- [ ] **Step 1: Add failing tests for `listPartnersFor`**

Append the following describe block to the end of `tests/engine/breed-listing.test.ts`:

```ts
describe("listPartnersFor", () => {
  it("returns the selected creature and its compatible partners with energy cost", () => {
    const state = makeState([
      makeCreature("a", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("b", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("c", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
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
      makeCreature("a", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("b", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    const view = listPartnersFor(state, 1);
    expect(view.partners.every((p) => p.creature.id !== "a")).toBe(true);
  });

  it("excludes archived partners", () => {
    const state = makeState([
      makeCreature("a", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("b", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL], {
        archived: true,
      }),
      makeCreature("c", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    const view = listPartnersFor(state, 1);
    expect(view.partners).toHaveLength(1);
    expect(view.partners[0].creature.id).toBe("c");
    expect(view.partners[0].partnerIndex).toBe(3);
  });

  it("excludes different-species creatures", () => {
    const state = makeState([
      makeCreature("a", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
      makeCreature("b", "flamecub", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    const view = listPartnersFor(state, 1);
    expect(view.partners).toHaveLength(0);
  });

  it("throws when index is out of range (too high)", () => {
    const state = makeState([
      makeCreature("a", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    expect(() => listPartnersFor(state, 5)).toThrow(/index/i);
  });

  it("throws when index is out of range (zero or negative)", () => {
    const state = makeState([
      makeCreature("a", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    expect(() => listPartnersFor(state, 0)).toThrow(/index/i);
  });

  it("throws when the selected creature is archived", () => {
    const state = makeState([
      makeCreature("a", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL], {
        archived: true,
      }),
      makeCreature("b", "sparkmouse", [C_EYES, C_MOUTH, C_BODY, C_TAIL]),
    ]);
    expect(() => listPartnersFor(state, 1)).toThrow(/archived/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/engine/breed-listing.test.ts -t listPartnersFor`
Expected: FAIL — `listPartnersFor` is not exported.

- [ ] **Step 3: Implement `listPartnersFor` in `src/engine/breed.ts`**

Add `BreedPartnersView` and `BreedablePartner` to the imports at the top of `src/engine/breed.ts`:

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
} from "../types";
```

Append the function at the end of the file:

```ts
/**
 * For a creature at the given 1-indexed collection position, return it and
 * its list of compatible (same-species, non-archived, non-self) partners with
 * each partner's 1-indexed collection position and the energy cost to breed.
 *
 * Throws on out-of-range or archived selection.
 */
export function listPartnersFor(
  state: GameState,
  creatureIndex: number
): BreedPartnersView {
  if (creatureIndex < 1 || creatureIndex > state.collection.length) {
    throw new Error(
      `No creature at index ${creatureIndex}. You have ${state.collection.length} creatures.`
    );
  }

  const creature = state.collection[creatureIndex - 1];
  if (creature.archived) {
    throw new Error(
      `Creature at index ${creatureIndex} is archived and cannot breed.`
    );
  }

  const partners: BreedablePartner[] = [];
  for (let j = 0; j < state.collection.length; j++) {
    if (j === creatureIndex - 1) continue;
    const candidate = state.collection[j];
    if (candidate.archived) continue;
    if (candidate.speciesId !== creature.speciesId) continue;

    // Reuse previewBreed just for the energy cost. This also validates the pair.
    const preview = previewBreed(state, creature.id, candidate.id);
    partners.push({
      partnerIndex: j + 1,
      creature: candidate,
      energyCost: preview.energyCost,
    });
  }

  return { creatureIndex, creature, partners };
}
```

- [ ] **Step 4: Run all breed-listing tests — they should pass**

Run: `npx jest tests/engine/breed-listing.test.ts`
Expected: PASS (all tests in both describe blocks).

- [ ] **Step 5: Run the full engine test suite to confirm no regressions**

Run: `npx jest tests/engine/`
Expected: All engine tests pass, including the existing `tests/engine/breed.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/engine/breed.ts tests/engine/breed-listing.test.ts
git commit -m "feat(engine): add listPartnersFor helper"
```

---

## Task 4: Expose new helpers on `GameEngine`

**Files:**
- Modify: `src/engine/game-engine.ts`

- [ ] **Step 1: Update imports at top of `src/engine/game-engine.ts`**

Replace the first two import lines:

```ts
import { GameState, Tick, TickResult, ScanResult, ScanEntry, CatchResult, BreedPreview, BreedResult, ArchiveResult, StatusResult, Notification, BreedableEntry, BreedPartnersView } from "../types";
import { processNewTick } from "./ticks";
import { spawnBatch, cleanupBatch } from "./batch";
import { attemptCatch, calculateCatchRate, calculateEnergyCost } from "./catch";
import { processEnergyGain } from "./energy";
import { previewBreed, executeBreed, listBreedable, listPartnersFor } from "./breed";
```

- [ ] **Step 2: Add two new methods to the `GameEngine` class**

Insert after the existing `breedExecute` method (around line 70):

```ts
  listBreedable(): BreedableEntry[] {
    return listBreedable(this.state);
  }

  listBreedPartners(creatureIndex: number): BreedPartnersView {
    return listPartnersFor(this.state, creatureIndex);
  }
```

- [ ] **Step 3: Build and test**

Run: `npm run build && npx jest`
Expected: Build succeeds, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/engine/game-engine.ts
git commit -m "feat(engine): expose listBreedable and listBreedPartners on GameEngine"
```

---

## Task 5: Add collection numbering to `renderCollection`

**Files:**
- Test: `tests/renderers/breed-ux.test.ts` (create)
- Modify: `src/renderers/simple-text.ts`

- [ ] **Step 1: Create the failing renderer test**

Create `tests/renderers/breed-ux.test.ts`:

```ts
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
      makeCreature("a", "sparkmouse", "Bolt", V),
      makeCreature("b", "flamecub", "Ember", V),
    ];
    const out = stripAnsi(renderer.renderCollection(collection));
    expect(out).toMatch(/\b1\.\s+Bolt\b/);
    expect(out).toMatch(/\b2\.\s+Ember\b/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/renderers/breed-ux.test.ts`
Expected: FAIL — current `renderCollection` does not print numbered prefixes.

- [ ] **Step 3: Modify `renderCollection` in `src/renderers/simple-text.ts`**

Locate the `renderCollection` method (currently at line 349). Replace its body with the following:

```ts
  renderCollection(collection: CollectionCreature[]): string {
    const lines: string[] = [];

    if (collection.length === 0) {
      return "  No creatures in your collection yet. Use /scan to find some!";
    }

    lines.push(`  ${DIM}Your creatures (${collection.length})${RESET}`);
    lines.push("");

    collection.forEach((creature, i) => {
      const creatureScore = calculateCreatureScore(creature.speciesId, creature.slots);
      const num = `${i + 1}.`;
      lines.push(`  ${BOLD}${num}${RESET} ${BOLD}${creature.name}${RESET}  ${DIM}${creature.speciesId}${RESET}  Lv ${creature.generation}  ⭐ ${creatureScore}`);
      for (const line of renderCreatureSideBySide(creature.slots, creature.speciesId)) {
        lines.push(line);
      }
      lines.push("");
    });

    lines.push(divider());

    return lines.join("\n");
  }
```

- [ ] **Step 4: Run the test — it should pass**

Run: `npx jest tests/renderers/breed-ux.test.ts -t "renderCollection numbering"`
Expected: PASS.

- [ ] **Step 5: Run the full renderer test suite**

Run: `npx jest tests/renderers/`
Expected: All renderer tests pass (note: existing collection tests may need the new numbered format — if any fail, update their expected strings to match the new prefix and include the fix in this task's commit).

- [ ] **Step 6: Commit**

```bash
git add src/renderers/simple-text.ts tests/renderers/breed-ux.test.ts
git commit -m "feat(renderer): add 1-indexed numbering to collection display"
```

---

## Task 6: Add `renderBreedableList` renderer method

**Files:**
- Modify: `tests/renderers/breed-ux.test.ts` (add describe block)
- Modify: `src/renderers/simple-text.ts`
- Modify: `src/types.ts` (extend `Renderer` interface)

- [ ] **Step 1: Add failing test**

Append to `tests/renderers/breed-ux.test.ts`:

```ts
describe("renderBreedableList", () => {
  it("lists each breedable creature with its index and partner count", () => {
    const renderer = new SimpleTextRenderer();
    const entries: BreedableEntry[] = [
      {
        creatureIndex: 1,
        creature: makeCreature("a", "sparkmouse", "Bolt", V),
        partnerCount: 2,
      },
      {
        creatureIndex: 3,
        creature: makeCreature("c", "sparkmouse", "Spark", V),
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/renderers/breed-ux.test.ts -t renderBreedableList`
Expected: FAIL — `renderBreedableList` does not exist on `SimpleTextRenderer`.

- [ ] **Step 3: Add the method to `src/renderers/simple-text.ts`**

Add `BreedableEntry` and `BreedPartnersView` to the imports at the top of `src/renderers/simple-text.ts`:

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
  BreedableEntry,
  BreedablePartner,
  BreedPartnersView,
} from "../types";
```

Insert a new method inside the class, right after `renderBreedResult` (around line 347):

```ts
  renderBreedableList(entries: BreedableEntry[]): string {
    const lines: string[] = [];

    if (entries.length === 0) {
      return "  No breedable pairs yet — you need 2+ creatures of the same species.\n  Use /scan and /catch to find more.";
    }

    lines.push(`  ${DIM}Breedable creatures (${entries.length})${RESET}`);
    lines.push(`  ${DIM}Run /breed N to see partners for creature #N${RESET}`);
    lines.push("");

    for (const entry of entries) {
      const creature = entry.creature;
      const score = calculateCreatureScore(creature.speciesId, creature.slots);
      const num = `${entry.creatureIndex}.`;
      const partnerWord = entry.partnerCount === 1 ? "partner" : "partners";
      lines.push(
        `  ${BOLD}${num}${RESET} ${BOLD}${creature.name}${RESET}  ${DIM}${creature.speciesId}${RESET}  Lv ${creature.generation}  ⭐ ${score}  ${DIM}(${entry.partnerCount} ${partnerWord})${RESET}`
      );
    }

    lines.push("");
    lines.push(divider());
    return lines.join("\n");
  }
```

- [ ] **Step 4: Extend the `Renderer` interface in `src/types.ts`**

In `src/types.ts`, locate the `Renderer` interface (around line 255). Add these two method signatures (at the end of the interface, before the closing brace):

```ts
  renderBreedableList(entries: BreedableEntry[]): string;
  renderBreedPartners(view: BreedPartnersView): string;
```

(We'll implement `renderBreedPartners` in the next task, but adding both interface entries now keeps the type system consistent for Task 7.)

Since `renderBreedPartners` isn't implemented yet, the class will not compile. To keep this task self-contained, add a **temporary stub** at the bottom of `SimpleTextRenderer` to unblock the build:

```ts
  renderBreedPartners(_view: BreedPartnersView): string {
    return "  (not yet implemented)";
  }
```

This stub is replaced in Task 7.

- [ ] **Step 5: Run the test — it should pass**

Run: `npx jest tests/renderers/breed-ux.test.ts -t renderBreedableList`
Expected: PASS.

- [ ] **Step 6: Run build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/renderers/simple-text.ts src/types.ts tests/renderers/breed-ux.test.ts
git commit -m "feat(renderer): add renderBreedableList method"
```

---

## Task 7: Add `renderBreedPartners` renderer method

**Files:**
- Modify: `tests/renderers/breed-ux.test.ts` (add describe block)
- Modify: `src/renderers/simple-text.ts` (replace stub)

- [ ] **Step 1: Add failing test**

Append to `tests/renderers/breed-ux.test.ts`:

```ts
describe("renderBreedPartners", () => {
  it("shows the selected creature and its partners with index and cost", () => {
    const renderer = new SimpleTextRenderer();
    const view: BreedPartnersView = {
      creatureIndex: 3,
      creature: makeCreature("a", "sparkmouse", "Bolt", V),
      partners: [
        {
          partnerIndex: 7,
          creature: makeCreature("b", "sparkmouse", "Spark", V),
          energyCost: 4,
        },
        {
          partnerIndex: 12,
          creature: makeCreature("c", "sparkmouse", "Zap", V),
          energyCost: 5,
        },
      ],
    };
    const out = stripAnsi(renderer.renderBreedPartners(view));
    expect(out).toMatch(/#3/);
    expect(out).toMatch(/Bolt/);
    expect(out).toMatch(/\b7\.\s+Spark\b/);
    expect(out).toMatch(/cost 4/);
    expect(out).toMatch(/\b12\.\s+Zap\b/);
    expect(out).toMatch(/cost 5/);
  });

  it("shows an empty-state message when no partners", () => {
    const renderer = new SimpleTextRenderer();
    const view: BreedPartnersView = {
      creatureIndex: 1,
      creature: makeCreature("a", "sparkmouse", "Lonely", V),
      partners: [],
    };
    const out = stripAnsi(renderer.renderBreedPartners(view));
    expect(out).toMatch(/no same-species partners/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/renderers/breed-ux.test.ts -t renderBreedPartners`
Expected: FAIL — current stub returns a fixed string, tests expect specific content.

- [ ] **Step 3: Replace the stub in `SimpleTextRenderer`**

Replace the temporary `renderBreedPartners` stub in `src/renderers/simple-text.ts` with the real implementation:

```ts
  renderBreedPartners(view: BreedPartnersView): string {
    const lines: string[] = [];
    const { creatureIndex, creature, partners } = view;
    const score = calculateCreatureScore(creature.speciesId, creature.slots);

    lines.push(`  ${DIM}Selected:${RESET} ${BOLD}#${creatureIndex} ${creature.name}${RESET}  ${DIM}${creature.speciesId}${RESET}  Lv ${creature.generation}  ⭐ ${score}`);
    for (const line of renderCreatureSideBySide(creature.slots, creature.speciesId)) {
      lines.push(line);
    }
    lines.push("");

    if (partners.length === 0) {
      lines.push(`  ${DIM}${creature.name} has no same-species partners.${RESET}`);
      lines.push(`  ${DIM}Run /breed to see all breedable creatures.${RESET}`);
      lines.push(divider());
      return lines.join("\n");
    }

    lines.push(`  ${BOLD}Compatible partners (${partners.length}):${RESET}`);
    for (const p of partners) {
      const pScore = calculateCreatureScore(p.creature.speciesId, p.creature.slots);
      const num = `${p.partnerIndex}.`;
      lines.push(
        `    ${BOLD}${num}${RESET} ${BOLD}${p.creature.name}${RESET}  Lv ${p.creature.generation}  ⭐ ${pScore}  ${DIM}(cost ${p.energyCost})${RESET}${ENERGY_ICON}`
      );
    }
    lines.push("");
    lines.push(`  ${DIM}Run /breed ${creatureIndex} N to preview breeding with partner #N${RESET}`);
    lines.push(divider());
    return lines.join("\n");
  }
```

- [ ] **Step 4: Run test — should pass**

Run: `npx jest tests/renderers/breed-ux.test.ts -t renderBreedPartners`
Expected: PASS.

- [ ] **Step 5: Run full test suite**

Run: `npx jest`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/renderers/simple-text.ts tests/renderers/breed-ux.test.ts
git commit -m "feat(renderer): add renderBreedPartners method"
```

---

## Task 8: Rewrite the `breed` MCP tool with index-based schema

**Files:**
- Modify: `src/mcp-tools.ts`

- [ ] **Step 1: Replace the `breed` tool registration**

In `src/mcp-tools.ts`, locate the existing `breed` tool block (lines 109-124). Replace it with:

```ts
  addTool(server, "breed", "Breed two creatures from your collection (uses /collection indexes)", z.object({
    indexA: z.number().optional().describe("1-indexed position of first parent in /collection"),
    indexB: z.number().optional().describe("1-indexed position of second parent in /collection"),
    confirm: z.boolean().optional().describe("Set to true to execute the breed after previewing"),
  }), async ({ indexA, indexB, confirm }: { indexA?: number; indexB?: number; confirm?: boolean }) => {
    const { stateManager, engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const collection = engine.getState().collection;

    // List mode: no indexes → show all breedable creatures
    if (indexA === undefined && indexB === undefined) {
      const entries = engine.listBreedable();
      return text(renderer.renderBreedableList(entries));
    }

    // Partner mode: only indexA → show that creature and its partners
    if (indexA !== undefined && indexB === undefined) {
      const view = engine.listBreedPartners(indexA);
      return text(renderer.renderBreedPartners(view));
    }

    // Preview / execute mode: both indexes → resolve to IDs and call engine
    if (indexA === undefined || indexB === undefined) {
      // Unreachable given above branches, but keeps TS happy.
      throw new Error("Both indexA and indexB are required to preview or confirm a breed.");
    }
    if (indexA < 1 || indexA > collection.length) {
      throw new Error(`No creature at index ${indexA}. You have ${collection.length} creatures.`);
    }
    if (indexB < 1 || indexB > collection.length) {
      throw new Error(`No creature at index ${indexB}. You have ${collection.length} creatures.`);
    }
    const parentAId = collection[indexA - 1].id;
    const parentBId = collection[indexB - 1].id;

    if (confirm) {
      const result = engine.breedExecute(parentAId, parentBId);
      stateManager.save(engine.getState());
      return text(renderer.renderBreedResult(result));
    } else {
      const preview = engine.breedPreview(parentAId, parentBId);
      return text(renderer.renderBreedPreview(preview));
    }
  }, meta);
```

- [ ] **Step 2: Build the project**

Run: `npm run build`
Expected: succeeds, no type errors.

- [ ] **Step 3: Run full test suite**

Run: `npx jest`
Expected: all tests pass. (No existing tests reference `parentAId`/`parentBId` at tool level — verified during plan-writing; only the CLI in `src/cli.ts` still passes IDs directly, and it calls the unchanged engine methods.)

- [ ] **Step 4: Commit**

```bash
git add src/mcp-tools.ts
git commit -m "feat(mcp): rewrite breed tool with index-based three-mode schema"
```

---

## Task 9: Rewrite `skills/breed/SKILL.md` to parse variable arg shapes

**Files:**
- Modify: `skills/breed/SKILL.md`

- [ ] **Step 1: Replace the entire file content**

Replace all of `skills/breed/SKILL.md` with:

```markdown
---
name: breed
model: claude-haiku-4-5-20251001
description: Breed two creatures from your collection (picks via /collection index)
---

Parse the arguments. The command supports four shapes:

- `/breed` (no args) — list mode
- `/breed N` (one number) — partner mode, show partners for creature at /collection index N
- `/breed N M` (two numbers) — preview mode, preview breeding creatures at indexes N and M
- `/breed N M --confirm` — execute mode, execute the breed

Flow:

1. If no positional numbers were given, call `mcp__plugin_compi_compi__breed` with **no arguments**.
2. If exactly one positional number `N` was given, call `mcp__plugin_compi_compi__breed` with `indexA: N`.
3. If two positional numbers `N` and `M` were given:
   - Without `--confirm`: call the tool with `indexA: N`, `indexB: M` (no `confirm`).
   - With `--confirm`: call the tool with `indexA: N`, `indexB: M`, `confirm: true`.

After the tool call, run this Bash command to display the output with colors:

```
cat "$LOCALAPPDATA/Temp/compi_display.txt" && rm -f "$LOCALAPPDATA/Temp/compi_display.txt"
```

Then respond based on which mode was used:

- List mode: "Press Ctrl+O to expand the list above. Run `/breed N` to pick creature #N."
- Partner mode: "Press Ctrl+O to expand the partners above. Run `/breed N M` to preview breeding."
- Preview mode: "Press Ctrl+O to expand the breed preview above. Run `/breed N M --confirm` to proceed."
- Execute mode: "Press Ctrl+O to expand the breed result above."

Do not describe the tool output in your own words.
```

- [ ] **Step 2: Commit**

```bash
git add skills/breed/SKILL.md
git commit -m "feat(skills): rewrite /breed to parse index-based progressive args"
```

---

## Task 10: Create `skills/breedable/SKILL.md` alias

**Files:**
- Create: `skills/breedable/SKILL.md`

- [ ] **Step 1: Create the file**

Create `skills/breedable/SKILL.md` with the following content:

```markdown
---
name: breedable
model: claude-haiku-4-5-20251001
description: List creatures in your collection that have a valid breeding partner
---

This command takes no arguments. It lists all creatures in the user's collection that have at least one same-species partner to breed with.

1. Call `mcp__plugin_compi_compi__breed` with no arguments.
2. Run this Bash command to display the output with colors:

```
cat "$LOCALAPPDATA/Temp/compi_display.txt" && rm -f "$LOCALAPPDATA/Temp/compi_display.txt"
```

3. Respond: "Press Ctrl+O to expand the list above. Run `/breed N` to see partners for creature #N, or `/breed N M` to preview breeding."

Do not describe the tool output in your own words.
```

- [ ] **Step 2: Commit**

```bash
git add skills/breedable/SKILL.md
git commit -m "feat(skills): add /breedable alias for listing breedable creatures"
```

---

## Task 11: Update `skills/list/SKILL.md`

**Files:**
- Modify: `skills/list/SKILL.md`

- [ ] **Step 1: Replace the command table**

Replace the entire contents of `skills/list/SKILL.md` with:

```markdown
---
name: list
description: Show all available Compi slash commands
---

Display the following list of available Compi commands to the user:

| Command | Description |
|---------|-------------|
| `/compi:scan` | Show nearby creatures that can be caught |
| `/compi:catch` | Attempt to catch a nearby creature |
| `/compi:collection` | Browse your caught creatures and their traits |
| `/compi:breed` | Breed two creatures from your collection (index-based) |
| `/compi:breedable` | List creatures that have a valid breeding partner |
| `/compi:energy` | Show current energy level |
| `/compi:status` | View your player profile and game stats |
| `/compi:settings` | View or change game settings |
| `/compi:list` | Show this list of commands |
```

This also fixes the stale `/compi:merge` reference — merge was replaced by breed long ago.

- [ ] **Step 2: Commit**

```bash
git add skills/list/SKILL.md
git commit -m "docs(skills): update /list command table with breed and breedable"
```

---

## Task 11b: Mirror skill changes in `cursor-skills/`

**Files:**
- Modify: `cursor-skills/breed/SKILL.md`
- Create: `cursor-skills/breedable/SKILL.md`
- Modify: `cursor-skills/list/SKILL.md`

The project ships two parallel skill directories — `skills/` (Claude Code) and `cursor-skills/` (Cursor plugin). The Cursor flow uses a visual panel rather than the display-file `cat+rm` trick, so the skill prompts differ in wording but must stay in sync structurally.

- [ ] **Step 1: Rewrite `cursor-skills/breed/SKILL.md`**

Replace all of its contents with:

```markdown
---
name: breed
description: Breed two creatures from your collection (picks via /collection index)
---

Parse the arguments. The command supports four shapes:

- `/breed` (no args) — list mode
- `/breed N` (one number) — partner mode, show partners for creature at /collection index N
- `/breed N M` (two numbers) — preview mode
- `/breed N M --confirm` — execute mode

Flow:

1. If no positional numbers were given, call the compi `breed` MCP tool with **no arguments**.
2. If exactly one positional number `N` was given, call the tool with `indexA: N`.
3. If two numbers `N` and `M` were given:
   - Without `--confirm`: call with `indexA: N`, `indexB: M`.
   - With `--confirm`: call with `indexA: N`, `indexB: M`, `confirm: true`.

The result is displayed in the visual panel above. Respond based on mode:

- List mode: "List shown above. Run `/breed N` to pick creature #N."
- Partner mode: "Partners shown above. Run `/breed N M` to preview."
- Preview mode: "Preview shown above. Proceed with `/breed N M --confirm`."
- Execute mode: One-line summary of the result.

Do NOT output the raw tool response.
```

- [ ] **Step 2: Create `cursor-skills/breedable/SKILL.md`**

Create the file with:

```markdown
---
name: breedable
description: List creatures in your collection that have a valid breeding partner
---

This command takes no arguments.

1. Call the compi `breed` MCP tool with no arguments.
2. The result is displayed in the visual panel above.
3. Respond: "List shown above. Run `/breed N` to see partners for creature #N, or `/breed N M` to preview breeding."

Do NOT output the raw tool response.
```

- [ ] **Step 3: Update `cursor-skills/list/SKILL.md` command table**

Replace the contents with:

```markdown
---
name: list
description: Show all available Compi slash commands
---

Display the following list of available Compi commands to the user:

| Command | Description |
|---------|-------------|
| `/compi:scan` | Show nearby creatures that can be caught |
| `/compi:catch` | Attempt to catch a nearby creature |
| `/compi:collection` | Browse your caught creatures and their traits |
| `/compi:breed` | Breed two creatures from your collection (index-based) |
| `/compi:breedable` | List creatures that have a valid breeding partner |
| `/compi:archive` | View archive or archive a creature |
| `/compi:release` | Permanently release a creature |
| `/compi:energy` | Show current energy level |
| `/compi:status` | View your player profile and game stats |
| `/compi:settings` | View or change game settings |
| `/compi:list` | Show this list of commands |
```

- [ ] **Step 4: Commit**

```bash
git add cursor-skills/breed/SKILL.md cursor-skills/breedable/SKILL.md cursor-skills/list/SKILL.md
git commit -m "feat(cursor-skills): mirror breed/breedable UX updates"
```

---

## Task 12: Final verification — manual smoke test

**Files:** (none — read-only verification)

- [ ] **Step 1: Run the full build and test suite one more time**

Run: `npm run build && npx jest`
Expected: build succeeds, all tests pass.

- [ ] **Step 2: Run the CLI breed command against a populated state file (optional smoke test)**

If the CLI supports a breed subcommand, run a sanity check. Otherwise inspect `dist/` to confirm the compiled `mcp-tools.js` contains the new schema keys `indexA`/`indexB` and not the old `parentAId`/`parentBId`. Quick check:

Run: `grep -l "parentAId" dist/ 2>/dev/null || echo "clean"`
Expected: `clean` (no stale references to `parentAId` in compiled output under `dist/`).

- [ ] **Step 3: Confirm skill files are syntactically valid**

Verify the three touched skill files load without YAML frontmatter errors:

Run: `node -e "const fs=require('fs'); for (const f of ['skills/breed/SKILL.md','skills/breedable/SKILL.md','skills/list/SKILL.md','cursor-skills/breed/SKILL.md','cursor-skills/breedable/SKILL.md','cursor-skills/list/SKILL.md']) { const c = fs.readFileSync(f,'utf8'); if (!c.startsWith('---')) { console.error('Missing frontmatter:', f); process.exit(1); } } console.log('ok');"`
Expected: `ok`.

- [ ] **Step 4: Final commit only if any fixups were needed during verification**

If Step 1-3 surfaced issues, fix them and commit. Otherwise, this task produces no commit.

---

## Self-Review Checklist

After executing the plan, confirm:

- [ ] `/breed` with no args shows a numbered list of breedable creatures
- [ ] `/breed N` shows compatible partners with energy costs for creature #N
- [ ] `/breed N M` shows a preview and instructs to add `--confirm`
- [ ] `/breed N M --confirm` executes breeding as before
- [ ] `/breedable` works as an alias for `/breed` with no args
- [ ] `/collection` shows a 1-indexed number next to every creature
- [ ] `/compi:list` shows the new breed/breedable commands and no stale `/compi:merge`
- [ ] The old `parentAId`/`parentBId` arguments are gone from the tool schema
- [ ] `previewBreed` / `executeBreed` engine functions are unchanged (still accept IDs)
- [ ] All pre-existing tests in `tests/engine/breed.test.ts` still pass untouched

# New Species + Renderer Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 new species (Flikk, Monu, Jinx, Glich, Whiski) and fix the renderer to use per-species art templates instead of a hardcoded shape.

**Architecture:** The species config loader already auto-discovers JSON files in `config/species/`. The main work is: (1) update types to support variable slot counts (Whiski has 3 slots), (2) update the spawn/breed engines to use species-defined slots, (3) update the renderer to use species art templates with placeholder replacement, (4) create the 5 species JSON files.

**Tech Stack:** TypeScript, Jest (ts-jest), JSON config files

---

## File Map

**Modified:**
- `src/types.ts` — Make `traitPools` support species with fewer than 4 slots
- `src/engine/batch.ts` — Use species-defined slot keys instead of hardcoded `SLOT_IDS`
- `src/engine/breed.ts` — Handle variable slot counts in inheritance
- `src/renderers/simple-text.ts` — Use species art templates with placeholder replacement; switch trait lookup to species-aware function
- `tests/engine/batch.test.ts` — Add tests for 3-slot species spawning
- `tests/renderers/simple-text.test.ts` — Add tests for species-specific rendering
- `tests/engine/breed.test.ts` — Add tests for 3-slot breeding

**Created:**
- `config/species/flikk.json`
- `config/species/monu.json`
- `config/species/jinx.json`
- `config/species/glich.json`
- `config/species/whiski.json`

---

### Task 1: Update types for variable slot counts

**Files:**
- Modify: `src/types.ts:42` (SpeciesDefinition)

Currently `traitPools` is `Record<SlotId, TraitDefinition[]>` which requires all 4 slots. Whiski only has 3 (no body). Change to `Partial`.

- [ ] **Step 1: Write the failing test**

Create `tests/types/variable-slots.test.ts`:

```typescript
import { SpeciesDefinition, TraitDefinition } from "../../src/types";

describe("SpeciesDefinition variable slots", () => {
  test("species with 3 slots is valid SpeciesDefinition", () => {
    const species: SpeciesDefinition = {
      id: "test3",
      name: "Test3",
      description: "3-slot species",
      spawnWeight: 10,
      art: [" /\\_/\\", "( EE )", " > MM <", "  TT"],
      traitPools: {
        eyes: [{ id: "t_eye_01", name: "Test", art: "o.o", spawnRate: 1.0 }],
        mouth: [{ id: "t_mth_01", name: "Test", art: " ^ ", spawnRate: 1.0 }],
        tail: [{ id: "t_tal_01", name: "Test", art: "~~", spawnRate: 1.0 }],
      },
    };
    expect(species.traitPools.eyes).toHaveLength(1);
    expect(species.traitPools.body).toBeUndefined();
  });

  test("species with 4 slots is still valid", () => {
    const species: SpeciesDefinition = {
      id: "test4",
      name: "Test4",
      description: "4-slot species",
      spawnWeight: 10,
      art: ["  ~(EE)~", "    MM", "   BB", "   TT"],
      traitPools: {
        eyes: [{ id: "t_eye_01", name: "Test", art: "o.o", spawnRate: 1.0 }],
        mouth: [{ id: "t_mth_01", name: "Test", art: " ^ ", spawnRate: 1.0 }],
        body: [{ id: "t_bod_01", name: "Test", art: "░░", spawnRate: 1.0 }],
        tail: [{ id: "t_tal_01", name: "Test", art: "~~", spawnRate: 1.0 }],
      },
    };
    expect(Object.keys(species.traitPools)).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/types/variable-slots.test.ts -v`
Expected: TypeScript compile error — `traitPools` missing required `body` key.

- [ ] **Step 3: Update the type**

In `src/types.ts`, change:

```typescript
// Old:
export interface SpeciesDefinition {
  id: string;
  name: string;
  description: string;
  spawnWeight: number;
  art: string[]; // multi-line ASCII template
  traitPools: Record<SlotId, TraitDefinition[]>;
}

// New:
export interface SpeciesDefinition {
  id: string;
  name: string;
  description: string;
  spawnWeight: number;
  art: string[]; // multi-line ASCII template
  traitPools: Partial<Record<SlotId, TraitDefinition[]>>;
}
```

- [ ] **Step 4: Fix compile errors from Partial change**

The `Partial` change means `species.traitPools[slotId]` now returns `TraitDefinition[] | undefined`. Update callers:

In `src/config/species.ts:64-70`, `pickTraitForSlot` — already handles this correctly (checks `!traits || traits.length === 0`).

In `src/config/species.ts:18`, the `for...of` loop — already casts `Object.keys()`, which only iterates present keys. OK.

No changes needed in `species.ts` — the existing code already handles undefined gracefully.

- [ ] **Step 5: Run all tests**

Run: `npx jest --no-coverage`
Expected: All pass. The type change is backwards-compatible for 4-slot species.

- [ ] **Step 6: Commit**

```bash
git add src/types.ts tests/types/variable-slots.test.ts
git commit -m "feat: support species with variable slot counts in types"
```

---

### Task 2: Update batch spawn for variable slots

**Files:**
- Modify: `src/engine/batch.ts:33-42` (generateCreatureSlots)
- Modify: `tests/engine/batch.test.ts`

Currently `generateCreatureSlots` maps over `SLOT_IDS` (always 4). Change it to use the species' defined slots.

- [ ] **Step 1: Write the failing test**

Add to `tests/engine/batch.test.ts`:

```typescript
describe("generateCreatureSlots — variable slots", () => {
  test("generates slots matching species traitPools keys", () => {
    // Whiski only has eyes, mouth, tail — no body
    // This test will work once whiski.json exists, but for now we test with compi (4 slots)
    const slots = generateCreatureSlots("compi", () => 0.5);
    const slotIds = slots.map(s => s.slotId);
    expect(slotIds).toEqual(["eyes", "mouth", "body", "tail"]);
  });
});
```

- [ ] **Step 2: Update generateCreatureSlots**

In `src/engine/batch.ts`, change:

```typescript
// Old:
export function generateCreatureSlots(speciesId: string, rng: () => number): CreatureSlot[] {
  const species = getSpeciesById(speciesId);
  if (!species) throw new Error(`Unknown species: ${speciesId}`);

  return SLOT_IDS.map((slotId: SlotId) => {
    const trait = pickTraitForSlot(species, slotId, rng);
    const color = pickColor(rng);
    return { slotId, variantId: trait.id, color };
  });
}

// New:
export function generateCreatureSlots(speciesId: string, rng: () => number): CreatureSlot[] {
  const species = getSpeciesById(speciesId);
  if (!species) throw new Error(`Unknown species: ${speciesId}`);

  const speciesSlots = Object.keys(species.traitPools) as SlotId[];
  return speciesSlots.map((slotId: SlotId) => {
    const trait = pickTraitForSlot(species, slotId, rng);
    const color = pickColor(rng);
    return { slotId, variantId: trait.id, color };
  });
}
```

Remove the `SLOT_IDS` import if it's no longer used in this file.

- [ ] **Step 3: Run tests**

Run: `npx jest tests/engine/batch.test.ts -v`
Expected: All pass. Existing tests still work since compi has 4 slots.

- [ ] **Step 4: Update test assertion for variable slot count**

The existing test `"each spawned creature has unique id, name, and 4 slots"` (line 99) and `"each spawned creature has 4 slots without rarity field"` (line 111) hardcode `.toHaveLength(4)`. Update them to check for >= 3:

```typescript
// In "each spawned creature has unique id, name, and 4 slots" test:
expect(c.slots.length).toBeGreaterThanOrEqual(3);
expect(c.slots.length).toBeLessThanOrEqual(4);

// In "each spawned creature has 4 slots without rarity field" test:
expect(c.slots.length).toBeGreaterThanOrEqual(3);
expect(c.slots.length).toBeLessThanOrEqual(4);
```

- [ ] **Step 5: Run all tests**

Run: `npx jest --no-coverage`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add src/engine/batch.ts tests/engine/batch.test.ts
git commit -m "feat: spawn engine uses species-defined slots instead of hardcoded SLOT_IDS"
```

---

### Task 3: Update breed system for variable slots

**Files:**
- Modify: `src/engine/breed.ts:126-163` (buildSlotInheritance)
- Modify: `tests/engine/breed.test.ts`

Currently `buildSlotInheritance` iterates `SLOT_IDS` and throws if a slot is missing. Change to use the intersection of slots both parents actually have.

- [ ] **Step 1: Write the failing test**

Add to `tests/engine/breed.test.ts`:

```typescript
describe("breed — variable slots", () => {
  test("breed preview works with 3-slot species", () => {
    // Create parents with only eyes, mouth, tail (no body)
    const parentA = makeCollection("a", "Alpha", 1);
    parentA.slots = parentA.slots.filter(s => s.slotId !== "body");

    const parentB = makeCollection("b", "Beta", 1);
    parentB.slots = parentB.slots.filter(s => s.slotId !== "body");

    const state = makeState();
    state.collection = [parentA, parentB];

    const preview = previewBreed(state, "a", "b");
    expect(preview.slotInheritance).toHaveLength(3);
    expect(preview.slotInheritance.map(s => s.slotId)).toEqual(["eyes", "mouth", "tail"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/engine/breed.test.ts -v --testNamePattern="variable slots"`
Expected: FAIL — throws "Missing slot body on parent"

- [ ] **Step 3: Update buildSlotInheritance**

In `src/engine/breed.ts`, change:

```typescript
// Old:
function buildSlotInheritance(
  speciesId: string,
  parentA: CollectionCreature,
  parentB: CollectionCreature
): SlotInheritance[] {
  return SLOT_IDS.map((slotId) => {
    const slotA = parentA.slots.find((s) => s.slotId === slotId);
    const slotB = parentB.slots.find((s) => s.slotId === slotId);

    if (!slotA || !slotB) {
      throw new Error(`Missing slot ${slotId} on parent`);
    }
    // ...rest
  });
}

// New:
function buildSlotInheritance(
  speciesId: string,
  parentA: CollectionCreature,
  parentB: CollectionCreature
): SlotInheritance[] {
  const species = getSpeciesById(speciesId);
  const speciesSlots = species
    ? (Object.keys(species.traitPools) as SlotId[])
    : SLOT_IDS;

  return speciesSlots.map((slotId) => {
    const slotA = parentA.slots.find((s) => s.slotId === slotId);
    const slotB = parentB.slots.find((s) => s.slotId === slotId);

    if (!slotA || !slotB) {
      throw new Error(`Missing slot ${slotId} on parent`);
    }
    // ...rest unchanged
```

Also update `executeBreed` — the `inheritedFrom` record should only contain the species' slots. The existing code already builds it dynamically from `slotInheritance`, so no change needed there.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/engine/breed.test.ts -v`
Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/breed.ts tests/engine/breed.test.ts
git commit -m "feat: breed system handles species with variable slot counts"
```

---

### Task 4: Update renderer to use species art templates

**Files:**
- Modify: `src/renderers/simple-text.ts:49-64` (renderCreatureLines)
- Modify: `tests/renderers/simple-text.test.ts`

Two changes: (1) use species art template instead of hardcoded shape, (2) use `getTraitDefinition` from `species.ts` instead of `getVariantById` from `traits.ts` so new species' traits resolve correctly.

- [ ] **Step 1: Write the failing test**

Add to `tests/renderers/simple-text.test.ts`:

```typescript
describe("species-specific art", () => {
  test("renderScan uses species art template framing", () => {
    // Compi's art template is ["  ~(EE)~", "    MM", "   BB", "   TT"]
    // So rendered output should contain ~( and )~ framing from the template
    const result: ScanResult = {
      energy: 6,
      batch: null,
      nearby: [
        { index: 0, creature: makeNearby("c1", "Sparks"), catchRate: 0.55, energyCost: 3 },
      ],
    };
    const out = renderer.renderScan(result);
    // Should contain the species template framing characters
    expect(out).toContain("~(");
    expect(out).toContain(")~");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/renderers/simple-text.test.ts -v --testNamePattern="species-specific"`
Expected: FAIL — the current renderer uses hardcoded `( )` and `╱ ╲`, not `~( )~` from compi's art template.

- [ ] **Step 3: Update renderCreatureLines to accept speciesId**

In `src/renderers/simple-text.ts`, update the function signature and implementation:

```typescript
import { getSpeciesById, getTraitDefinition } from "../config/species";

function renderCreatureLines(slots: CreatureSlot[], speciesId?: string): string[] {
  const species = speciesId ? getSpeciesById(speciesId) : undefined;

  // Build slot-to-art map
  const slotArt: Record<string, string> = {};
  for (const s of slots) {
    const trait = speciesId
      ? getTraitDefinition(speciesId, s.variantId)
      : getVariantById(s.variantId);
    slotArt[s.slotId] = trait?.art ?? "???";
  }

  // Build slot-to-color map
  const slotColor: Record<string, string> = {};
  for (const s of slots) {
    slotColor[s.slotId] = COLOR_ANSI[s.color ?? "white"] || WHITE;
  }

  if (species?.art) {
    // Use species art template with placeholder replacement
    return species.art.map((line) => {
      let result = line;
      let coloredResult = line;
      const replacements: [string, string, string][] = [
        ["EE", slotArt["eyes"] ?? "", slotColor["eyes"] ?? WHITE],
        ["MM", slotArt["mouth"] ?? "", slotColor["mouth"] ?? WHITE],
        ["BB", slotArt["body"] ?? "", slotColor["body"] ?? WHITE],
        ["TT", slotArt["tail"] ?? "", slotColor["tail"] ?? WHITE],
      ];
      for (const [placeholder, art, color] of replacements) {
        if (result.includes(placeholder)) {
          result = result.replace(placeholder, art);
          coloredResult = coloredResult.replace(placeholder, `${color}${art}${RESET}`);
        }
      }
      return "      " + coloredResult;
    });
  }

  // Fallback: original hardcoded layout
  const eyesArt = slotArt["eyes"] ?? "o.o";
  const mouthArt = slotArt["mouth"] ?? " - ";
  const bodyArt = slotArt["body"] ?? " ░░ ";
  const tailArt = slotArt["tail"] ?? "~";

  const eyesC = slotColor["eyes"] ?? WHITE;
  const mouthC = slotColor["mouth"] ?? WHITE;
  const bodyC = slotColor["body"] ?? WHITE;
  const tailC = slotColor["tail"] ?? WHITE;

  const eyesLine = "      " + centerLine(eyesArt, `${eyesC}${eyesArt}${RESET}`);
  const mouthLine = "      " + centerLine(`(${mouthArt})`, `${mouthC}(${mouthArt})${RESET}`);
  const bodyLine = "      " + centerLine(`╱${bodyArt}╲`, `${bodyC}╱${bodyArt}╲${RESET}`);
  const tailLine = "      " + centerLine(tailArt, `${tailC}${tailArt}${RESET}`);

  return [eyesLine, mouthLine, bodyLine, tailLine];
}
```

- [ ] **Step 4: Update all call sites to pass speciesId**

Every function that calls `renderCreatureLines` needs to pass `speciesId`. These are:

`renderCreatureSideBySide` — add `speciesId` parameter, pass through:
```typescript
function renderCreatureSideBySide(slots: CreatureSlot[], speciesId?: string): string[] {
  const artLines = renderCreatureLines(slots, speciesId);
  // ...rest unchanged
```

`renderScan` — the creature has `c.speciesId`:
```typescript
for (const line of renderCreatureSideBySide(c.slots, c.speciesId)) {
```

`renderCatch` — same:
```typescript
for (const line of renderCreatureSideBySide(c.slots, c.speciesId)) {
```

`renderBreedPreview` — parents are `CollectionCreature` which has `speciesId`:
```typescript
for (const line of renderCreatureSideBySide(parentA.slots, parentA.speciesId)) {
// ...
for (const line of renderCreatureSideBySide(parentB.slots, parentB.speciesId)) {
```

`renderBreedResult` — child has `speciesId`:
```typescript
for (const line of renderCreatureSideBySide(child.slots, child.speciesId)) {
```

`renderCollection` — each creature has `speciesId`:
```typescript
for (const line of renderCreatureSideBySide(creature.slots, creature.speciesId)) {
```

`renderArchive` — same:
```typescript
for (const line of renderCreatureSideBySide(creature.slots, creature.speciesId)) {
```

- [ ] **Step 5: Run all tests**

Run: `npx jest --no-coverage`
Expected: All pass including the new species-specific art test.

- [ ] **Step 6: Commit**

```bash
git add src/renderers/simple-text.ts tests/renderers/simple-text.test.ts
git commit -m "feat: renderer uses per-species art templates with placeholder replacement"
```

---

### Task 5: Create Flikk species JSON

**Files:**
- Create: `config/species/flikk.json`

- [ ] **Step 1: Create the JSON file**

Create `config/species/flikk.json` with all 60 traits from the spec (`docs/superpowers/specs/2026-04-08-new-species-design.md`, Species 1: Flikk section).

Key fields:
```json
{
  "id": "flikk",
  "name": "Flikk",
  "description": "A twitchy, buzzing creature that seems to vibrate in place. Always mid-movement.",
  "spawnWeight": 11,
  "art": ["  \\ _ /", " ( EE )", " ( MM )", "  ~BB~", "   \\/"],
  "traitPools": {
    "eyes": [ ...16 traits from spec... ],
    "mouth": [ ...13 traits from spec... ],
    "body": [ ...17 traits from spec... ],
    "tail": [ ...14 traits from spec... ]
  }
}
```

Copy all trait IDs, names, art, and spawnRates exactly from the spec tables.

- [ ] **Step 2: Verify it loads**

Run: `npx jest tests/config/species.test.ts -v`
Expected: All pass — species loader auto-discovers the new JSON.

- [ ] **Step 3: Commit**

```bash
git add config/species/flikk.json
git commit -m "feat: add Flikk species — jittery creature with 60 traits"
```

---

### Task 6: Create Monu species JSON

**Files:**
- Create: `config/species/monu.json`

- [ ] **Step 1: Create the JSON file**

Create `config/species/monu.json` with all 53 traits from the spec (Species 2: Monu section).

Key fields:
```json
{
  "id": "monu",
  "name": "Monu",
  "description": "A slow, heavy presence. Feels like it has been sitting in the same spot for centuries.",
  "spawnWeight": 9,
  "art": [" ┌─────┐", " │EE│", " │ MM │", " │BB│", " └TT┘"],
  "traitPools": {
    "eyes": [ ...12 traits from spec... ],
    "mouth": [ ...11 traits from spec... ],
    "body": [ ...18 traits from spec... ],
    "tail": [ ...12 traits from spec... ]
  }
}
```

- [ ] **Step 2: Verify it loads**

Run: `npx jest tests/config/species.test.ts -v`
Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add config/species/monu.json
git commit -m "feat: add Monu species — ancient creature with 53 traits"
```

---

### Task 7: Create Jinx species JSON

**Files:**
- Create: `config/species/jinx.json`

- [ ] **Step 1: Create the JSON file**

Create `config/species/jinx.json` with all 60 traits from the spec (Species 3: Jinx section).

Key fields:
```json
{
  "id": "jinx",
  "name": "Jinx",
  "description": "A cheeky little trickster. Asymmetric on purpose — nothing lines up right.",
  "spawnWeight": 11,
  "art": ["    ~", "  /EE )", " ( MM /", "  \\BB )", "   TT~"],
  "traitPools": {
    "eyes": [ ...15 traits from spec... ],
    "mouth": [ ...17 traits from spec... ],
    "body": [ ...13 traits from spec... ],
    "tail": [ ...15 traits from spec... ]
  }
}
```

- [ ] **Step 2: Verify it loads**

Run: `npx jest tests/config/species.test.ts -v`
Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add config/species/jinx.json
git commit -m "feat: add Jinx species — mischievous creature with 60 traits"
```

---

### Task 8: Create Glich species JSON

**Files:**
- Create: `config/species/glich.json`

- [ ] **Step 1: Create the JSON file**

Create `config/species/glich.json` with all 68 traits from the spec (Species 4: Glich section).

Key fields:
```json
{
  "id": "glich",
  "name": "Glich",
  "description": "A rendering error that became sentient. Parts flicker, repeat, or seem corrupted.",
  "spawnWeight": 8,
  "art": [" ▐░░░▌", " ▐EE▌", " ▐ MM ▌", " ▐BB▌", "  TT"],
  "traitPools": {
    "eyes": [ ...18 traits from spec... ],
    "mouth": [ ...14 traits from spec... ],
    "body": [ ...19 traits from spec... ],
    "tail": [ ...17 traits from spec... ]
  }
}
```

- [ ] **Step 2: Verify it loads**

Run: `npx jest tests/config/species.test.ts -v`
Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add config/species/glich.json
git commit -m "feat: add Glich species — glitchy creature with 68 traits"
```

---

### Task 9: Create Whiski species JSON

**Files:**
- Create: `config/species/whiski.json`

- [ ] **Step 1: Create the JSON file**

Create `config/species/whiski.json` with all 50 traits from the spec (Species 5: Whiski section). Note: only 3 slots — no `body` key in `traitPools`.

Key fields:
```json
{
  "id": "whiski",
  "name": "Whiski",
  "description": "A rare, elusive cat. Quiet and always just out of reach.",
  "spawnWeight": 5,
  "art": [" /\\_/\\", "( EE )", " > MM <", "  TT"],
  "traitPools": {
    "eyes": [ ...17 traits from spec... ],
    "mouth": [ ...17 traits from spec... ],
    "tail": [ ...16 traits from spec... ]
  }
}
```

- [ ] **Step 2: Write a test for 3-slot species spawning**

Add to `tests/engine/batch.test.ts`:

```typescript
describe("generateCreatureSlots — whiski (3 slots)", () => {
  test("generates exactly 3 slots for whiski", () => {
    const slots = generateCreatureSlots("whiski", () => 0.5);
    expect(slots).toHaveLength(3);
    expect(slots.map(s => s.slotId)).toEqual(["eyes", "mouth", "tail"]);
  });

  test("whiski slots have no body", () => {
    const slots = generateCreatureSlots("whiski", () => 0.5);
    expect(slots.find(s => s.slotId === "body")).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx jest tests/engine/batch.test.ts -v`
Expected: All pass — the spawn engine already uses species-defined slots from Task 2.

- [ ] **Step 4: Commit**

```bash
git add config/species/whiski.json tests/engine/batch.test.ts
git commit -m "feat: add Whiski species — rare 3-slot cat with 50 traits"
```

---

### Task 10: Integration test — full spawn-render cycle

**Files:**
- Modify: `tests/integration/gameplay-loop.test.ts`

- [ ] **Step 1: Add integration test**

Add to `tests/integration/gameplay-loop.test.ts`:

```typescript
describe("multi-species spawn and render", () => {
  test("spawned creatures render without errors", () => {
    const state = makeState();
    // Spawn with fixed RNG that cycles through species
    let callCount = 0;
    const rng = () => {
      callCount++;
      return (callCount * 0.17) % 1; // deterministic pseudo-random
    };
    spawnBatch(state, Date.now(), rng);

    const renderer = new SimpleTextRenderer();
    const scanResult: ScanResult = {
      energy: state.energy,
      batch: state.batch,
      nearby: state.nearby.map((c, i) => ({
        index: i,
        creature: c,
        catchRate: 0.5,
        energyCost: 2,
      })),
    };

    // Should not throw
    const output = renderer.renderScan(scanResult);
    expect(output).toBeTruthy();
    expect(output.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run integration test**

Run: `npx jest tests/integration/gameplay-loop.test.ts -v`
Expected: All pass.

- [ ] **Step 3: Run full test suite**

Run: `npx jest --no-coverage`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add tests/integration/gameplay-loop.test.ts
git commit -m "test: add integration test for multi-species spawn and render"
```

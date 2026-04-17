# /play Card-Based UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all slash commands with a single `/play` command that presents randomized catch/breed cards.

**Architecture:** New `src/engine/cards.ts` module builds a pool of available actions, draws 1–3 cards randomly, and delegates execution to existing `catch.ts`/`breed.ts`. Single `play` MCP tool replaces all others. Renderer gets new card-layout methods. State migrates v6→v7 (remove archive, add currentHand).

**Tech Stack:** TypeScript, Jest (ts-jest), MCP SDK, ANSI rendering

**Spec:** `docs/superpowers/specs/2026-04-17-play-card-ux-design.md`

---

### Task 1: Add card types to types.ts

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add card-related interfaces to types.ts**

Add at the end of the file, before the `Renderer` interface:

```typescript
// --- Cards (v7) ---

export interface CardRef {
  id: string;
  type: "catch" | "breed";
  /** For catch cards: index into nearby[] */
  nearbyIndex?: number;
  /** For breed cards: indices into collection[] (0-based) */
  parentIndices?: [number, number];
}

export interface CatchCardData {
  nearbyIndex: number;
  creature: NearbyCreature;
  catchRate: number;
  energyCost: number;
}

export interface BreedCardData {
  parentA: { index: number; creature: CollectionCreature };
  parentB: { index: number; creature: CollectionCreature };
  upgradeChances: SlotUpgradeInfo[];
  energyCost: number;
}

export interface SlotUpgradeInfo {
  slotId: SlotId;
  match: boolean;
  upgradeChance: number;
}

export interface Card {
  id: string;
  type: "catch" | "breed";
  label: string;
  energyCost: number;
  data: CatchCardData | BreedCardData;
}

export interface DrawResult {
  cards: Card[];
  empty: boolean;
  noEnergy: boolean;
}

export interface PlayResult {
  action: "catch" | "breed";
  catchResult?: CatchResult;
  breedResult?: BreedResult;
  nextDraw: DrawResult;
}
```

- [ ] **Step 2: Add currentHand to GameState**

In the `GameState` interface, add after `breedCooldowns`:

```typescript
  /** v7: current drawn cards for /play, cleared after pick/skip */
  currentHand?: CardRef[];
```

- [ ] **Step 3: Remove archive-related types**

Remove `MAX_COLLECTION_SIZE` constant (line 55):

```typescript
// DELETE: export const MAX_COLLECTION_SIZE = 15;
```

Remove the `ArchiveResult` interface:

```typescript
// DELETE: export interface ArchiveResult {
//   creature: CollectionCreature;
// }
```

Remove `archiveCount` from `StatusResult`:

```typescript
export interface StatusResult {
  profile: PlayerProfile;
  collectionCount: number;
  // REMOVE: archiveCount: number;
  energy: number;
  nearbyCount: number;
  batchAttemptsRemaining: number;
  discoveredCount: number;
  speciesProgress: Record<string, boolean[]>;
}
```

Remove `renderArchive` from the `Renderer` interface:

```typescript
// In the Renderer interface, DELETE this line:
// renderArchive(archive: CollectionCreature[]): string;
```

- [ ] **Step 4: Add card render methods to Renderer interface**

Add to the `Renderer` interface:

```typescript
  renderCardDraw(draw: DrawResult, energy: number, maxEnergy: number, profile: PlayerProfile): string;
  renderPlayResult(result: PlayResult, energy: number, maxEnergy: number, profile: PlayerProfile): string;
```

- [ ] **Step 5: Update version constant**

Change version comment at top of file from `// src/types.ts — Compi v6` to `// src/types.ts — Compi v7`.

- [ ] **Step 6: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -50`
Expected: Errors from files that reference removed types — this is expected, we'll fix them in later tasks.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts
git commit -m "feat: add card types and remove archive types for v7 /play UX"
```

---

### Task 2: State migration v6→v7

**Files:**
- Modify: `src/state/state-manager.ts`
- Create: `tests/state/migration-v7.test.ts`

- [ ] **Step 1: Write migration test**

```typescript
// tests/state/migration-v7.test.ts
import { StateManager } from "../../src/state/state-manager";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("v6 → v7 migration", () => {
  const tmpDir = path.join(os.tmpdir(), "compi-test-migration-v7");
  const statePath = path.join(tmpDir, "state.json");

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    try { fs.unlinkSync(statePath); } catch {}
    try { fs.rmdirSync(tmpDir); } catch {}
  });

  it("migrates v6 state to v7: removes archive, adds currentHand", () => {
    const v6State = {
      version: 6,
      profile: { level: 3, xp: 50, totalCatches: 5, totalMerges: 1, totalTicks: 20, currentStreak: 2, longestStreak: 3, lastActiveDate: "2026-04-17" },
      collection: [{ id: "c1", speciesId: "compi", name: "Test", slots: [], caughtAt: 1000, generation: 0, archived: false }],
      archive: [{ id: "a1", speciesId: "compi", name: "Archived", slots: [], caughtAt: 500, generation: 0, archived: true }],
      energy: 20,
      lastEnergyGainAt: 1000,
      nearby: [],
      batch: null,
      lastSpawnAt: 0,
      recentTicks: [],
      claimedMilestones: [],
      settings: { notificationLevel: "moderate" },
      discoveredSpecies: ["compi"],
      currentSessionId: "s1",
      speciesProgress: { compi: [true, false, false, false, false, false, false, false] },
      personalSpecies: [],
      sessionBreedCount: 0,
      breedCooldowns: {},
    };
    fs.writeFileSync(statePath, JSON.stringify(v6State));

    const mgr = new StateManager(statePath);
    const state = mgr.load();

    expect(state.version).toBe(7);
    expect((state as any).archive).toBeUndefined();
    expect(state.currentHand).toBeUndefined();
    // archived creatures should be moved to collection with archived=false
    expect(state.collection).toHaveLength(2);
    expect(state.collection[1].archived).toBe(false);
  });

  it("loads fresh v7 state when no file exists", () => {
    const mgr = new StateManager(path.join(tmpDir, "nonexistent.json"));
    const state = mgr.load();
    expect(state.version).toBe(7);
    expect((state as any).archive).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/state/migration-v7.test.ts --no-cache`
Expected: FAIL — migration function doesn't exist yet.

- [ ] **Step 3: Implement v6→v7 migration**

In `src/state/state-manager.ts`, add after `migrateV5toV6`:

```typescript
function migrateV6toV7(raw: Record<string, unknown>): GameState {
  const state = raw as any;

  // Move archived creatures back to collection (un-archive them)
  if (Array.isArray(state.archive)) {
    for (const creature of state.archive) {
      creature.archived = false;
      state.collection.push(creature);
    }
  }
  delete state.archive;

  // currentHand is optional, starts undefined
  // (no need to set it — it's already not present)

  state.version = 7;
  return state as GameState;
}
```

Update `defaultState()`:
- Change `version: 6` to `version: 7`
- Remove the `archive: [],` line

Update `load()` method — add v6 migration case. After the `if (version === 5)` block:

```typescript
      if (version === 6) {
        logger.info("Migrating state from v6 to v7", { path: this.filePath });
        return migrateV6toV7(raw);
      }
      if (version !== 7) {
        logger.info("Incompatible state version, creating fresh state", { path: this.filePath });
        return defaultState();
      }
```

Change the `if (version !== 6)` check to `if (version !== 7)`.

In the v6 backfill section at the bottom of `load()`, update it for v7 — keep the same backfill logic but ensure it runs for v7 states.

Also chain the v5→v6→v7 migration: in the `version === 5` block, pipe through v7:

```typescript
      if (version === 5) {
        logger.info("Migrating state from v5 to v6", { path: this.filePath });
        const v6 = migrateV5toV6(raw);
        logger.info("Migrating state from v6 to v7", { path: this.filePath });
        return migrateV6toV7(v6 as unknown as Record<string, unknown>);
      }
```

Do the same for v3→v4→v5→v6→v7 and v4→v5→v6→v7.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/state/migration-v7.test.ts --no-cache`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/state/state-manager.ts tests/state/migration-v7.test.ts
git commit -m "feat: add v6→v7 state migration — remove archive, add currentHand"
```

---

### Task 3: Create cards engine module

**Files:**
- Create: `src/engine/cards.ts`
- Create: `tests/engine/cards.test.ts`

- [ ] **Step 1: Write tests for buildPool**

```typescript
// tests/engine/cards.test.ts
import { buildPool, drawCards, playCard } from "../../src/engine/cards";
import { GameState, NearbyCreature, CollectionCreature, CreatureSlot } from "../../src/types";

function makeSlot(slotId: "eyes" | "mouth" | "body" | "tail", rarity = 0): CreatureSlot {
  return { slotId, variantId: `${slotId}_default`, color: "grey", rarity };
}

function makeSlots(rarity = 0): CreatureSlot[] {
  return [makeSlot("eyes", rarity), makeSlot("mouth", rarity), makeSlot("body", rarity), makeSlot("tail", rarity)];
}

function makeNearby(id: string, speciesId = "compi"): NearbyCreature {
  return { id, speciesId, name: `Test ${id}`, slots: makeSlots(), spawnedAt: Date.now() };
}

function makeCollection(id: string, speciesId = "compi", rarity = 0): CollectionCreature {
  return { id, speciesId, name: `Coll ${id}`, slots: makeSlots(rarity), caughtAt: Date.now(), generation: 0, archived: false };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 7,
    profile: { level: 5, xp: 50, totalCatches: 5, totalMerges: 1, totalTicks: 20, currentStreak: 2, longestStreak: 3, lastActiveDate: "2026-04-17" },
    collection: [],
    energy: 20,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    lastSpawnAt: 0,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
    discoveredSpecies: [],
    currentSessionId: "s1",
    speciesProgress: {},
    personalSpecies: [],
    sessionBreedCount: 0,
    breedCooldowns: {},
    ...overrides,
  } as GameState;
}

describe("buildPool", () => {
  it("returns catch cards for nearby creatures", () => {
    const state = makeState({
      nearby: [makeNearby("n1"), makeNearby("n2")],
      batch: { attemptsRemaining: 3, failPenalty: 0, spawnedAt: Date.now() },
    });
    const pool = buildPool(state);
    expect(pool.filter(c => c.type === "catch")).toHaveLength(2);
  });

  it("returns breed cards for valid pairs", () => {
    const state = makeState({
      collection: [makeCollection("c1", "compi"), makeCollection("c2", "compi")],
    });
    const pool = buildPool(state);
    expect(pool.filter(c => c.type === "breed")).toHaveLength(1);
  });

  it("returns empty pool when nothing available", () => {
    const state = makeState();
    const pool = buildPool(state);
    expect(pool).toHaveLength(0);
  });

  it("excludes breed when session limit reached", () => {
    const state = makeState({
      collection: [makeCollection("c1", "compi"), makeCollection("c2", "compi")],
      sessionBreedCount: 3,
    });
    const pool = buildPool(state);
    expect(pool.filter(c => c.type === "breed")).toHaveLength(0);
  });
});

describe("drawCards", () => {
  it("draws up to 3 cards from pool", () => {
    const state = makeState({
      nearby: [makeNearby("n1"), makeNearby("n2"), makeNearby("n3"), makeNearby("n4")],
      batch: { attemptsRemaining: 3, failPenalty: 0, spawnedAt: Date.now() },
      energy: 10,
    });
    const result = drawCards(state, () => 0.5);
    expect(result.cards.length).toBeLessThanOrEqual(3);
    expect(result.cards.length).toBeGreaterThan(0);
    expect(result.empty).toBe(false);
    expect(result.noEnergy).toBe(false);
  });

  it("returns noEnergy when energy is 0", () => {
    const state = makeState({
      nearby: [makeNearby("n1")],
      batch: { attemptsRemaining: 3, failPenalty: 0, spawnedAt: Date.now() },
      energy: 0,
    });
    const result = drawCards(state, () => 0.5);
    expect(result.noEnergy).toBe(true);
    expect(result.cards).toHaveLength(0);
  });

  it("returns empty when no actions available", () => {
    const state = makeState({ energy: 10 });
    const result = drawCards(state, () => 0.5);
    expect(result.empty).toBe(true);
  });

  it("deducts 1 energy for the turn", () => {
    const state = makeState({
      nearby: [makeNearby("n1")],
      batch: { attemptsRemaining: 3, failPenalty: 0, spawnedAt: Date.now() },
      energy: 10,
    });
    drawCards(state, () => 0.5);
    expect(state.energy).toBe(9);
  });

  it("draws max 1 breed card", () => {
    const state = makeState({
      collection: [
        makeCollection("c1", "compi"), makeCollection("c2", "compi"),
        makeCollection("c3", "flikk"), makeCollection("c4", "flikk"),
      ],
      energy: 10,
    });
    const result = drawCards(state, () => 0.1); // low rng to prefer first items
    const breedCards = result.cards.filter(c => c.type === "breed");
    expect(breedCards.length).toBeLessThanOrEqual(1);
  });

  it("stores currentHand as CardRefs on state", () => {
    const state = makeState({
      nearby: [makeNearby("n1")],
      batch: { attemptsRemaining: 3, failPenalty: 0, spawnedAt: Date.now() },
      energy: 10,
    });
    drawCards(state, () => 0.5);
    expect(state.currentHand).toBeDefined();
    expect(state.currentHand!.length).toBeGreaterThan(0);
    expect(state.currentHand![0].type).toBe("catch");
    expect(state.currentHand![0].nearbyIndex).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/engine/cards.test.ts --no-cache`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement cards.ts**

```typescript
// src/engine/cards.ts
import {
  GameState, Card, CardRef, DrawResult, PlayResult,
  CatchCardData, BreedCardData, SlotUpgradeInfo,
  CatchResult, BreedResult, NearbyCreature, CollectionCreature, SlotId,
} from "../types";
import { calculateCatchRate, calculateEnergyCost, attemptCatch } from "./catch";
import { calculateBreedCost, executeBreed } from "./breed";
import { spendEnergy } from "./energy";
import { grantXp } from "./progression";
import { recordDiscovery } from "./discovery";
import { loadConfig } from "../config/loader";

const TURN_ENERGY_COST = 1;
const MAX_CARDS = 3;

/**
 * Build the pool of all available cards from current game state.
 */
export function buildPool(state: GameState): Card[] {
  const cards: Card[] = [];

  // Catch cards: one per nearby creature (if batch active)
  if (state.batch && state.batch.attemptsRemaining > 0) {
    for (let i = 0; i < state.nearby.length; i++) {
      const creature = state.nearby[i];
      const catchRate = calculateCatchRate(creature.speciesId, creature.slots, state.batch.failPenalty);
      const energyCost = calculateEnergyCost(creature.speciesId, creature.slots);
      cards.push({
        id: `catch-${i}`,
        type: "catch",
        label: `Catch ${creature.name}`,
        energyCost,
        data: { nearbyIndex: i, creature, catchRate, energyCost } as CatchCardData,
      });
    }
  }

  // Breed cards: one per valid pair
  const config = loadConfig();
  if (state.sessionBreedCount < config.breed.maxBreedsPerSession) {
    const nonArchived = state.collection.filter(c => !c.archived);
    const seen = new Set<string>();
    for (let i = 0; i < nonArchived.length; i++) {
      for (let j = i + 1; j < nonArchived.length; j++) {
        const a = nonArchived[i];
        const b = nonArchived[j];
        // Check cooldown
        const cooldownKey = [a.id, b.id].sort().join(":");
        if (seen.has(cooldownKey)) continue;
        seen.add(cooldownKey);
        const cooldownExpiry = state.breedCooldowns[cooldownKey];
        if (cooldownExpiry && cooldownExpiry > Date.now()) continue;

        const idxA = state.collection.indexOf(a);
        const idxB = state.collection.indexOf(b);
        const energyCost = calculateBreedCost(a, b);

        // Calculate upgrade chances per slot
        const upgradeChances: SlotUpgradeInfo[] = [];
        for (const slotId of ["eyes", "mouth", "body", "tail"] as SlotId[]) {
          const slotA = a.slots.find(s => s.slotId === slotId);
          const slotB = b.slots.find(s => s.slotId === slotId);
          if (slotA && slotB) {
            const match = slotA.variantId === slotB.variantId;
            let upgradeChance = 0;
            if (match && slotA.rarity === slotB.rarity) {
              upgradeChance = config.breed.sameTraitUpgradeChance;
            } else if (match) {
              upgradeChance = config.breed.sameTraitHigherParentUpgradeChance;
            } else if (a.speciesId === b.speciesId) {
              upgradeChance = config.breed.diffTraitSameSpeciesUpgradeChance;
            } else {
              upgradeChance = config.breed.diffTraitCrossSpeciesUpgradeChance;
            }
            upgradeChances.push({ slotId, match, upgradeChance });
          }
        }

        cards.push({
          id: `breed-${idxA}-${idxB}`,
          type: "breed",
          label: `Breed ${a.name} × ${b.name}`,
          energyCost,
          data: {
            parentA: { index: idxA, creature: a },
            parentB: { index: idxB, creature: b },
            upgradeChances,
            energyCost,
          } as BreedCardData,
        });
      }
    }
  }

  return cards;
}

/**
 * Draw up to 3 cards from the available pool.
 * Deducts 1 energy (turn cost). Max 1 breed card per draw.
 * If a breed card is drawn, it's the only card (big layout).
 */
export function drawCards(state: GameState, rng: () => number = Math.random): DrawResult {
  if (state.energy < TURN_ENERGY_COST) {
    state.currentHand = undefined;
    return { cards: [], empty: false, noEnergy: true };
  }

  const pool = buildPool(state);
  if (pool.length === 0) {
    state.currentHand = undefined;
    return { cards: [], empty: true, noEnergy: false };
  }

  // Deduct turn cost
  spendEnergy(state, TURN_ENERGY_COST);

  // Separate catch and breed pools
  const catchPool = pool.filter(c => c.type === "catch");
  const breedPool = pool.filter(c => c.type === "breed");

  const drawn: Card[] = [];

  // Decide if we draw a breed card (if available)
  // Breed probability: breedPool.length / pool.length
  const breedChance = breedPool.length / pool.length;
  if (breedPool.length > 0 && rng() < breedChance) {
    // Pick one random breed card — it's the only card this draw
    const idx = Math.floor(rng() * breedPool.length);
    drawn.push(breedPool[idx]);
  } else {
    // Draw up to MAX_CARDS catch cards
    const shuffled = [...catchPool].sort(() => rng() - 0.5);
    for (let i = 0; i < Math.min(MAX_CARDS, shuffled.length); i++) {
      drawn.push(shuffled[i]);
    }
  }

  // Store as lightweight CardRefs
  state.currentHand = drawn.map(card => ({
    id: card.id,
    type: card.type,
    nearbyIndex: card.type === "catch" ? (card.data as CatchCardData).nearbyIndex : undefined,
    parentIndices: card.type === "breed"
      ? [(card.data as BreedCardData).parentA.index, (card.data as BreedCardData).parentB.index] as [number, number]
      : undefined,
  }));

  return { cards: drawn, empty: false, noEnergy: false };
}

/**
 * Execute a card choice. Returns the action result + next draw (free, no energy).
 */
export function playCard(
  state: GameState,
  choiceIndex: number,
  rng: () => number = Math.random
): PlayResult {
  if (!state.currentHand || choiceIndex >= state.currentHand.length) {
    throw new Error("Invalid card choice. Pick a valid card from the current hand.");
  }

  const ref = state.currentHand[choiceIndex];
  state.currentHand = undefined;

  if (ref.type === "catch") {
    const nearbyIndex = ref.nearbyIndex!;
    const result = attemptCatch(state, nearbyIndex, rng);
    if (result.success) {
      const config = loadConfig();
      grantXp(state, config.leveling.xpPerCatch);
      const discovery = recordDiscovery(state, result.creature.speciesId);
      if (discovery.isNew) result.discovery = discovery;
    }

    // Free next draw (no energy cost)
    const nextDraw = drawCardsFree(state, rng);
    return { action: "catch", catchResult: result, nextDraw };
  }

  if (ref.type === "breed") {
    const [idxA, idxB] = ref.parentIndices!;
    const parentA = state.collection[idxA];
    const parentB = state.collection[idxB];
    const result = executeBreed(state, parentA.id, parentB.id, rng);

    const nextDraw = drawCardsFree(state, rng);
    return { action: "breed", breedResult: result, nextDraw };
  }

  throw new Error(`Unknown card type: ${ref.type}`);
}

/**
 * Skip the current hand and draw new cards (free — no energy cost).
 * Used after an action completes or when player passes on a breed.
 */
export function skipHand(state: GameState, rng: () => number = Math.random): DrawResult {
  state.currentHand = undefined;
  return drawCardsFree(state, rng);
}

/**
 * Draw cards without deducting energy. Used for auto-draw after action/pass.
 */
function drawCardsFree(state: GameState, rng: () => number): DrawResult {
  const pool = buildPool(state);
  if (pool.length === 0) {
    state.currentHand = undefined;
    return { cards: [], empty: true, noEnergy: false };
  }
  if (state.energy <= 0) {
    state.currentHand = undefined;
    return { cards: [], empty: false, noEnergy: true };
  }

  const catchPool = pool.filter(c => c.type === "catch");
  const breedPool = pool.filter(c => c.type === "breed");
  const drawn: Card[] = [];

  const breedChance = breedPool.length / pool.length;
  if (breedPool.length > 0 && rng() < breedChance) {
    const idx = Math.floor(rng() * breedPool.length);
    drawn.push(breedPool[idx]);
  } else {
    const shuffled = [...catchPool].sort(() => rng() - 0.5);
    for (let i = 0; i < Math.min(MAX_CARDS, shuffled.length); i++) {
      drawn.push(shuffled[i]);
    }
  }

  state.currentHand = drawn.map(card => ({
    id: card.id,
    type: card.type,
    nearbyIndex: card.type === "catch" ? (card.data as CatchCardData).nearbyIndex : undefined,
    parentIndices: card.type === "breed"
      ? [(card.data as BreedCardData).parentA.index, (card.data as BreedCardData).parentB.index] as [number, number]
      : undefined,
  }));

  return { cards: drawn, empty: false, noEnergy: false };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/engine/cards.test.ts --no-cache`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/cards.ts tests/engine/cards.test.ts
git commit -m "feat: add cards engine module — buildPool, drawCards, playCard"
```

---

### Task 4: Add card rendering to SimpleTextRenderer

**Files:**
- Modify: `src/renderers/simple-text.ts`
- Create: `tests/renderers/cards.test.ts`

- [ ] **Step 1: Write rendering tests**

```typescript
// tests/renderers/cards.test.ts
import { SimpleTextRenderer } from "../../src/renderers/simple-text";
import { DrawResult, Card, CatchCardData, BreedCardData, PlayerProfile } from "../../src/types";

function makeProfile(): PlayerProfile {
  return { level: 4, xp: 287, totalCatches: 10, totalMerges: 2, totalTicks: 50, currentStreak: 3, longestStreak: 5, lastActiveDate: "2026-04-17" };
}

function makeCatchCard(id: string, name: string, speciesId: string): Card {
  return {
    id,
    type: "catch",
    label: `Catch ${name}`,
    energyCost: 2,
    data: {
      nearbyIndex: 0,
      creature: {
        id: `n-${id}`,
        speciesId,
        name,
        slots: [
          { slotId: "eyes", variantId: "eyes_default", color: "green", rarity: 2 },
          { slotId: "mouth", variantId: "mouth_default", color: "grey", rarity: 0 },
          { slotId: "body", variantId: "body_default", color: "cyan", rarity: 3 },
          { slotId: "tail", variantId: "tail_default", color: "grey", rarity: 0 },
        ],
        spawnedAt: Date.now(),
      },
      catchRate: 0.78,
      energyCost: 2,
    } as CatchCardData,
  };
}

describe("card rendering", () => {
  const renderer = new SimpleTextRenderer();

  it("renderCardDraw produces output with card labels", () => {
    const draw: DrawResult = {
      cards: [makeCatchCard("1", "Flikk", "flikk"), makeCatchCard("2", "Pyrax", "pyrax")],
      empty: false,
      noEnergy: false,
    };
    const output = renderer.renderCardDraw(draw, 16, 30, makeProfile());
    expect(output).toContain("[A]");
    expect(output).toContain("[B]");
    expect(output).toContain("Flikk");
    expect(output).toContain("Pyrax");
    expect(output).toContain("78%");
    expect(output).toContain("Skip");
  });

  it("renderCardDraw shows empty state", () => {
    const draw: DrawResult = { cards: [], empty: true, noEnergy: false };
    const output = renderer.renderCardDraw(draw, 5, 30, makeProfile());
    expect(output).toContain("Nothing happening");
  });

  it("renderCardDraw shows no energy state", () => {
    const draw: DrawResult = { cards: [], empty: false, noEnergy: true };
    const output = renderer.renderCardDraw(draw, 0, 30, makeProfile());
    expect(output).toContain("energy");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/renderers/cards.test.ts --no-cache`
Expected: FAIL — methods don't exist.

- [ ] **Step 3: Implement card rendering in SimpleTextRenderer**

Add the following methods to the `SimpleTextRenderer` class in `src/renderers/simple-text.ts`. Add them after the existing render methods.

```typescript
  // --- Card rendering (v7 /play) ---

  private renderStatusHeader(energy: number, maxEnergy: number, profile: PlayerProfile): string {
    const { level, xp } = profile;
    const nextXp = require("../engine/progression").getXpForNextLevel(level);
    const filled = Math.min(10, Math.round((energy / maxEnergy) * 10));
    const bar = "█".repeat(filled) + "░".repeat(10 - filled);
    return `  ${ENERGY_ICON} ${GREEN}${bar}${RESET} ${energy}/${maxEnergy}  Lv.${level}  ${xp}/${nextXp} XP`;
  }

  renderCardDraw(draw: DrawResult, energy: number, maxEnergy: number, profile: PlayerProfile): string {
    const lines: string[] = [];
    lines.push(this.renderStatusHeader(energy, maxEnergy, profile));
    lines.push(divider());
    lines.push("");

    if (draw.noEnergy) {
      lines.push(`  ${DIM}Out of energy. Come back later!${RESET}`);
      lines.push(`  ${DIM}Energy recharges over time.${RESET}`);
      return lines.join("\n");
    }

    if (draw.empty) {
      lines.push(`  ${DIM}Nothing happening right now.${RESET}`);
      lines.push(`  ${DIM}New creatures spawn every 30 min. Energy recharges over time.${RESET}`);
      return lines.join("\n");
    }

    // Check if it's a breed card (big layout)
    if (draw.cards.length === 1 && draw.cards[0].type === "breed") {
      lines.push(this.renderBreedCardBig(draw.cards[0]));
      lines.push("");
      lines.push(`  ${DIM}Reply a or b${RESET}`);
      return lines.join("\n");
    }

    // Catch cards — side by side
    const cardLines = draw.cards.map((card, i) => {
      const letter = String.fromCharCode(65 + i); // A, B, C
      return this.renderCatchCardLines(card, letter);
    });

    // Merge side by side
    const maxHeight = Math.max(...cardLines.map(c => c.length));
    for (let row = 0; row < maxHeight; row++) {
      const parts = cardLines.map(c => c[row] || " ".repeat(22));
      lines.push("  " + parts.join(""));
    }

    lines.push("");
    lines.push(`  ${DIM}[S] Skip ${ENERGY_ICON}1              Reply ${draw.cards.map((_, i) => String.fromCharCode(97 + i)).join(", ")}, or s${RESET}`);
    return lines.join("\n");
  }

  renderPlayResult(result: PlayResult, energy: number, maxEnergy: number, profile: PlayerProfile): string {
    const lines: string[] = [];
    lines.push(this.renderStatusHeader(energy, maxEnergy, profile));
    lines.push(divider());
    lines.push("");

    // Render action result
    if (result.action === "catch" && result.catchResult) {
      const cr = result.catchResult;
      if (cr.success) {
        lines.push(`  ${GREEN}${BOLD}✦ CAUGHT! ✦${RESET}  ${cr.creature.name} added to collection`);
        let xpLine = `  ${DIM}+${cr.xpEarned} XP`;
        if (cr.discovery?.isNew) xpLine += `  ·  New species discovered! +${cr.discovery.bonusXp} XP`;
        lines.push(xpLine + RESET);
      } else if (cr.fled) {
        lines.push(`  ${RED}${BOLD}✦ FLED ✦${RESET}  ${cr.creature.name} is gone`);
      } else {
        lines.push(`  ${YELLOW}${BOLD}✦ ESCAPED ✦${RESET}  ${cr.creature.name} got away`);
        lines.push(`  ${DIM}${cr.attemptsRemaining} attempts remaining${RESET}`);
      }
    }

    if (result.action === "breed" && result.breedResult) {
      const br = result.breedResult;
      lines.push(`  ${GREEN}${BOLD}✦ BRED! ✦${RESET}  Baby ${br.child.name} born!`);
      for (const upgrade of br.upgrades) {
        const fromName = RARITY_NAMES[upgrade.fromRarity] ?? "Common";
        const toName = RARITY_NAMES[upgrade.toRarity] ?? "Uncommon";
        lines.push(`  ${YELLOW}${upgrade.slotId} upgraded: ${fromName} → ${toName}!${RESET}`);
      }
      if (br.isCrossSpecies) {
        lines.push(`  ${YELLOW}New hybrid species!${RESET}`);
      }
    }

    lines.push("");
    lines.push(divider());
    lines.push("");

    // Render next draw
    if (result.nextDraw.empty) {
      lines.push(`  ${DIM}No more actions available. Come back later!${RESET}`);
    } else if (result.nextDraw.noEnergy) {
      lines.push(`  ${DIM}Out of energy. Come back later!${RESET}`);
    } else {
      // Render the next cards inline
      const nextDrawOutput = this.renderCardDraw(result.nextDraw, energy, maxEnergy, profile);
      // Skip the status header (already shown above) — extract just the cards portion
      const cardsPortion = nextDrawOutput.split("\n").slice(3).join("\n"); // skip status + divider + blank
      lines.push(cardsPortion);
    }

    return lines.join("\n");
  }

  private renderCatchCardLines(card: Card, letter: string): string[] {
    const d = card.data as CatchCardData;
    const creature = d.creature;
    const W = 22; // total width including borders
    const IW = 20; // inner width

    const pad = (s: string, rawLen?: number) => {
      const len = rawLen ?? stringWidth(s);
      return s + " ".repeat(Math.max(0, IW - len));
    };

    const lines: string[] = [];
    const border = "+" + "-".repeat(IW) + "+";
    lines.push(border);
    lines.push("|" + pad(` ${YELLOW}[${letter}]${RESET} CATCH`, 11) + "|");
    lines.push("|" + " ".repeat(IW) + "|");

    // Creature art (4 lines)
    const artLines = renderCreatureLines(creature.slots, creature.speciesId);
    for (const artLine of artLines) {
      const stripped = artLine.replace(/\x1b\[[0-9;]*m/g, "");
      const artPad = Math.max(0, IW - stripped.length);
      lines.push("|" + artLine + " ".repeat(artPad) + "|");
    }

    lines.push("|" + " ".repeat(IW) + "|");

    // Species name
    lines.push("|" + pad(` ${BOLD}${creature.name}${RESET}`, 1 + creature.name.length) + "|");

    // 4 trait slots
    const order: ("eyes" | "mouth" | "body" | "tail")[] = ["eyes", "mouth", "body", "tail"];
    for (const slotId of order) {
      const slot = creature.slots.find(s => s.slotId === slotId);
      if (slot) {
        const rColor = rarityColor(slot.rarity);
        const rName = RARITY_NAMES[slot.rarity] ?? "Common";
        const label = `${rName} ${slotId.charAt(0).toUpperCase() + slotId.slice(1)}`;
        const display = ` ${rColor}■${RESET} ${label}`;
        lines.push("|" + pad(display, 2 + label.length) + "|");
      }
    }

    lines.push("|" + " ".repeat(IW) + "|");

    // Energy cost + catch rate
    const pct = Math.round(d.catchRate * 100);
    const costLine = ` ${ENERGY_ICON}${d.energyCost}  ${DIM}${pct}% catch${RESET}`;
    lines.push("|" + pad(costLine, 2 + String(d.energyCost).length + 2 + String(pct).length + 6) + "|");

    lines.push(border);
    return lines;
  }

  private renderBreedCardBig(card: Card): string {
    const d = card.data as BreedCardData;
    const a = d.parentA.creature;
    const b = d.parentB.creature;
    const W = 60;
    const IW = W - 2;

    const pad = (s: string, rawLen: number) => {
      return s + " ".repeat(Math.max(0, IW - rawLen));
    };

    const lines: string[] = [];
    const border = "+" + "-".repeat(IW) + "+";

    lines.push("  " + border);

    // Title
    const title = `♥  BREEDING MATCH  ♥`;
    const titlePad = Math.floor((IW - title.length) / 2);
    lines.push("  |" + " ".repeat(titlePad) + `${RED}${BOLD}${title}${RESET}` + " ".repeat(IW - titlePad - title.length) + "|");
    lines.push("  |" + " ".repeat(IW) + "|");

    // Parent art side by side
    const artA = renderCreatureLines(a.slots, a.speciesId);
    const artB = renderCreatureLines(b.slots, b.speciesId);
    const maxArt = Math.max(artA.length, artB.length);
    for (let i = 0; i < maxArt; i++) {
      const lineA = artA[i] || "";
      const lineB = artB[i] || "";
      const strippedA = lineA.replace(/\x1b\[[0-9;]*m/g, "");
      const strippedB = lineB.replace(/\x1b\[[0-9;]*m/g, "");
      const midGap = i === Math.floor(maxArt / 2) ? `${RED}♥${RESET}` : " ";
      const midGapLen = 1;
      const colWidth = Math.floor((IW - midGapLen) / 2);
      const padA = Math.max(0, colWidth - strippedA.length);
      const padB = Math.max(0, colWidth - strippedB.length);
      lines.push("  |" + lineA + " ".repeat(padA) + midGap + lineB + " ".repeat(padB) + "|");
    }

    // Parent names
    const nameA = a.name;
    const nameB = b.name;
    const colWidth = Math.floor((IW - 1) / 2);
    const namePadA = Math.max(0, colWidth - nameA.length - 3);
    const namePadB = Math.max(0, colWidth - nameB.length - 3);
    lines.push("  |" + `   ${BOLD}${nameA}${RESET}` + " ".repeat(namePadA) + " " + `   ${BOLD}${nameB}${RESET}` + " ".repeat(namePadB) + "|");

    lines.push("  |" + " ".repeat(IW) + "|");
    lines.push("  |  " + DIM + "-".repeat(IW - 4) + RESET + "  |");

    // Slot comparison
    for (const upgrade of d.upgradeChances) {
      const slotA = a.slots.find(s => s.slotId === upgrade.slotId);
      const slotB = b.slots.find(s => s.slotId === upgrade.slotId);
      if (slotA && slotB) {
        const rNameA = RARITY_NAMES[slotA.rarity] ?? "Common";
        const rNameB = RARITY_NAMES[slotB.rarity] ?? "Common";
        const slotLabel = upgrade.slotId.charAt(0).toUpperCase() + upgrade.slotId.slice(1);
        let line = `  ${rarityColor(slotA.rarity)}■${RESET} ${rNameA} ${slotLabel}  ×  ${rarityColor(slotB.rarity)}■${RESET} ${rNameB} ${slotLabel}`;
        let rawLen = 2 + 1 + 1 + rNameA.length + 1 + slotLabel.length + 5 + 1 + 1 + rNameB.length + 1 + slotLabel.length;
        if (upgrade.match && upgrade.upgradeChance > 0) {
          const pct = Math.round(upgrade.upgradeChance * 100);
          const upg = `  > ${pct}% upgrade!`;
          line += `${YELLOW}${BOLD}${upg}${RESET}`;
          rawLen += upg.length;
        }
        lines.push("  |" + line + " ".repeat(Math.max(0, IW - rawLen)) + "|");
      }
    }

    lines.push("  |" + " ".repeat(IW) + "|");

    // Actions
    const breedLabel = `[A] Breed ${ENERGY_ICON}${d.energyCost}`;
    const passLabel = `${DIM}[B] Pass${RESET}`;
    const actionLine = `     ${YELLOW}${breedLabel}${RESET}              ${passLabel}`;
    lines.push("  |" + pad(actionLine, IW) + "|");

    lines.push("  " + border);
    return lines.join("\n");
  }
```

Note: The `RARITY_NAMES` array is already imported at the top of the file. The `renderCreatureLines` function is already defined. Import `BreedCardData`, `CatchCardData`, `DrawResult`, `PlayResult`, `PlayerProfile` from types.

- [ ] **Step 4: Add missing imports to simple-text.ts**

At the top of the file, update the import from `../types` to include the new types:

```typescript
import {
  // ... existing imports ...
  DrawResult,
  PlayResult,
  Card,
  CatchCardData,
  BreedCardData,
  PlayerProfile,
} from "../types";
```

- [ ] **Step 5: Remove renderArchive method**

Delete the `renderArchive` method from the class (no longer needed).

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest tests/renderers/cards.test.ts --no-cache`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/renderers/simple-text.ts tests/renderers/cards.test.ts
git commit -m "feat: add card rendering methods to SimpleTextRenderer"
```

---

### Task 5: Create the play MCP tool

**Files:**
- Modify: `src/mcp-tools.ts`

- [ ] **Step 1: Remove old tools and add play tool**

Rewrite `src/mcp-tools.ts`. Keep `loadEngine`, `makeText`, `addTool`, and `RegisterToolsOptions`. Replace the body of `registerTools` to register only two tools:

1. **`play`** — the main game tool
2. **`register_hybrid`** — kept for cross-species breeding

The `play` tool implementation:

```typescript
  // --- play tool ---
  addTool(server, "play", "Play the game — draw cards or pick one", z.object({
    choice: z.enum(["a", "b", "c", "s"]).optional().describe("Pick a card (a/b/c) or skip (s). Omit for initial draw."),
  }), async (args) => {
    const { stateManager, engine } = loadEngine();
    const state = engine.getState();
    const renderer = new SimpleTextRenderer();

    // Process energy/spawns
    engine.processTick({ timestamp: Date.now(), sessionId: state.currentSessionId }, Math.random);

    let output: string;

    if (!args.choice) {
      // Initial draw
      const draw = drawCards(state, Math.random);
      output = renderer.renderCardDraw(draw, state.energy, MAX_ENERGY, state.profile);
    } else if (args.choice === "s") {
      // Skip — draw new cards (costs 1 energy since it's a new turn)
      const draw = drawCards(state, Math.random);
      output = renderer.renderCardDraw(draw, state.energy, MAX_ENERGY, state.profile);
    } else {
      // Pick a card: a=0, b=1, c=2
      const choiceIndex = args.choice.charCodeAt(0) - 97; // 'a'=0, 'b'=1, 'c'=2
      
      // Handle breed pass (choice "b" on a single breed card)
      if (state.currentHand?.length === 1 && state.currentHand[0].type === "breed" && args.choice === "b") {
        // Pass on breed — free next draw
        const draw = skipHand(state, Math.random);
        output = renderer.renderCardDraw(draw, state.energy, MAX_ENERGY, state.profile);
      } else {
        const result = playCard(state, choiceIndex, Math.random);
        output = renderer.renderPlayResult(result, state.energy, MAX_ENERGY, state.profile);
      }
    }

    stateManager.save(state);
    return makeText(output, options);
  }, options.appMeta);
```

Add imports at top:

```typescript
import { drawCards, playCard, skipHand } from "./engine/cards";
```

Remove imports of `getProgressInfo` from advisor and `getCompanionOverview` from companion.

Remove `appendAdvisorContext`, `prependStatusBar`, and `runBreedCommand` functions.

- [ ] **Step 2: Keep register_hybrid tool**

Keep the existing `register_hybrid` tool registration as-is — just copy it into the new `registerTools` body.

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: May have some errors from files still referencing old types — fix in next tasks.

- [ ] **Step 4: Commit**

```bash
git add src/mcp-tools.ts
git commit -m "feat: replace all MCP tools with single play tool"
```

---

### Task 6: Update game-engine.ts

**Files:**
- Modify: `src/engine/game-engine.ts`

- [ ] **Step 1: Remove archive/advisor references**

Remove imports of `archiveCreature`, `releaseCreature`, `isCollectionFull` from `./archive`.
Remove import of `buildAdvisorContext` from `./advisor`.

Remove these methods from the class:
- `archive()`
- `release()`
- `getAdvisorContext()`

Remove `isCollectionFull` check from the `catch()` method.

Remove `archiveCount` from the `status()` method return value.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/engine/game-engine.ts
git commit -m "refactor: remove archive/advisor from game engine"
```

---

### Task 7: Update barrel export and CLI

**Files:**
- Modify: `src/index.ts`
- Modify: `src/cli.ts`

- [ ] **Step 1: Update index.ts**

Remove exports for:
- `archiveCreature`, `releaseCreature`, `isCollectionFull` from `./engine/archive`
- `buildAdvisorContext`, `getProgressInfo`, `getViableActions`, `getAdvisorMode`, `getSuggestedActions` from `./engine/advisor`
- `getCompanionOverview` from `./engine/companion`

Add export:
```typescript
export { buildPool, drawCards, playCard, skipHand } from "./engine/cards";
```

- [ ] **Step 2: Update cli.ts**

Replace all subcommands with a single `play` command. The CLI should:
- Accept `play [choice]` where choice is a/b/c/s or omitted
- Load engine, process tick, call drawCards or playCard, save state, print output

Remove all other commands (scan, catch, collection, breed, archive, release, energy, status, settings, species).

- [ ] **Step 3: Run build**

Run: `npm run build 2>&1 | tail -20`
Expected: Should compile cleanly or with minimal remaining errors.

- [ ] **Step 4: Commit**

```bash
git add src/index.ts src/cli.ts
git commit -m "refactor: update barrel export and CLI for v7 play-only UX"
```

---

### Task 8: Rewrite play skill

**Files:**
- Modify: `skills/play/SKILL.md`

- [ ] **Step 1: Rewrite SKILL.md**

Replace the entire content of `skills/play/SKILL.md` with:

```markdown
---
name: play
description: "Play Compi — draw cards and catch or breed creatures"
---

# /play

You are running the Compi game. Use the `play` MCP tool to interact.

## How it works

1. Call `play` with no arguments to draw cards
2. Show the output verbatim to the player using `node scripts/cli.js play`
3. The player replies with a letter (a, b, c) to pick a card or (s) to skip
4. Call `play` with their choice: `play(choice: "a")`
5. Show the result verbatim
6. Repeat — the result includes the next set of cards

## Rules

- ALWAYS show game output by running the bash command: `node scripts/cli.js play [choice]`
- NEVER summarize, paraphrase, or reformat the game output
- NEVER add emoji
- Keep your commentary to 1 sentence max between turns
- If the player says a letter or "skip", pass it as the choice
- If the player wants to stop, just stop — no special command needed
```

- [ ] **Step 2: Commit**

```bash
git add skills/play/SKILL.md
git commit -m "feat: rewrite /play skill for card-based UX"
```

---

### Task 9: Remove old skills

**Files:**
- Delete: `skills/scan/`, `skills/catch/`, `skills/collection/`, `skills/breed/`, `skills/breedable/`, `skills/archive/`, `skills/energy/`, `skills/status/`, `skills/settings/`, `skills/species/`, `skills/create-species/`, `skills/list/`

- [ ] **Step 1: Remove all old skill directories**

```bash
rm -rf skills/scan skills/catch skills/collection skills/breed skills/breedable skills/archive skills/energy skills/status skills/settings skills/species skills/create-species skills/list
```

- [ ] **Step 2: Verify only play remains**

```bash
ls skills/
```
Expected: Only `play/` directory.

- [ ] **Step 3: Commit**

```bash
git add -A skills/
git commit -m "chore: remove old slash command skills — replaced by /play"
```

---

### Task 10: Remove old engine modules

**Files:**
- Delete: `src/engine/advisor.ts`, `src/engine/companion.ts`, `src/engine/archive.ts`

- [ ] **Step 1: Delete the files**

```bash
rm src/engine/advisor.ts src/engine/companion.ts src/engine/archive.ts
```

- [ ] **Step 2: Run build to check for remaining references**

Run: `npm run build 2>&1 | tail -30`

Fix any remaining import references to these deleted modules in other files.

- [ ] **Step 3: Commit**

```bash
git add -A src/engine/
git commit -m "chore: remove advisor, companion, archive engine modules"
```

---

### Task 11: Update tests

**Files:**
- Delete: `tests/engine/advisor.test.ts`, `tests/engine/advisor-integration.test.ts`, `tests/engine/companion.test.ts`, `tests/engine/archive.test.ts`
- Modify: `tests/integration/core-loop.test.ts`, `tests/integration/gameplay-loop.test.ts`

- [ ] **Step 1: Remove deleted module tests**

```bash
rm tests/engine/advisor.test.ts tests/engine/advisor-integration.test.ts tests/engine/companion.test.ts tests/engine/archive.test.ts
```

- [ ] **Step 2: Update integration tests**

Read the existing integration test files. Remove any test cases that reference archive, advisor, companion, or collection limit. Update remaining tests to work with v7 state (no `archive` field).

- [ ] **Step 3: Run full test suite**

Run: `npm test 2>&1 | tail -30`

Fix any remaining failures by updating test state fixtures to include v7 format (no `archive` field, `version: 7`).

- [ ] **Step 4: Commit**

```bash
git add -A tests/
git commit -m "test: update tests for v7 — remove archive/advisor tests, fix fixtures"
```

---

### Task 12: Update CLAUDE.md and build

**Files:**
- Modify: `CLAUDE.md`
- Modify: `src/mcp-server.ts` (if needed)

- [ ] **Step 1: Update CLAUDE.md**

Update the following sections:
- **Project Overview**: Change command list to just `/play`
- **Game Systems**: Remove archive/collection limit, add card system description
- **Removed Systems (v7)**: Add section listing what was removed in v6→v7
- **Architecture**: Update engine module list (remove advisor/companion/archive, add cards)
- **Version**: Update to v7

- [ ] **Step 2: Run full build**

Run: `npm run build:all 2>&1 | tail -20`
Expected: Clean build.

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for v7 card-based /play UX"
```

---

### Task 13: End-to-end smoke test

**Files:** None (manual testing)

- [ ] **Step 1: Test initial play**

Run: `node scripts/cli.js play`
Expected: Shows status bar + 1-3 cards (or empty state if no creatures).

- [ ] **Step 2: Test catch flow**

Run: `node scripts/cli.js play` → note a card letter → `node scripts/cli.js play a`
Expected: Catch result + next cards.

- [ ] **Step 3: Test skip**

Run: `node scripts/cli.js play s`
Expected: New cards drawn, 1 energy deducted.

- [ ] **Step 4: Test empty state**

Manually set energy to 0 in state.json, run `node scripts/cli.js play`
Expected: "Out of energy" message.

- [ ] **Step 5: Verify bundle**

Run: `npm run bundle && node scripts/cli.js play`
Expected: Bundled version works identically.

- [ ] **Step 6: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: end-to-end smoke test fixes"
```

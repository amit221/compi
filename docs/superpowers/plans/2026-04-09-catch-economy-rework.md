# Catch Economy Rework — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the attempts concept entirely — as long as the user has energy they can keep catching. Each catch/fail silently increases energy cost and decreases catch rate for remaining creatures. Energy regen changes to 1 per 25 minutes.

**Architecture:** Strip `attemptsRemaining` from `BatchState` and replace it with an internal `catchCount` counter (starts at 0, increments on every catch attempt). This counter is **never exposed to the user** — not in `CatchResult`, not in `StatusResult`, not in the renderer. The `calculateCatchRate` and `calculateEnergyCost` functions use `catchCount` to scale difficulty internally. Batch cleanup only checks timeout. Energy gain interval changes from 30min to 25min.

**Tech Stack:** TypeScript, Jest (ts-jest)

---

## Summary of Behavior Changes

| Aspect | Before | After |
|---|---|---|
| Attempts per batch | 3 shared, then batch despawns | **No limit** — catch as long as you have energy |
| Catch rate | Decreases only on miss (`failPenalty`) | Decreases on **every catch/fail** (hidden from user) |
| Energy cost | Fixed per creature (based on trait rarity) | Starts at base cost, **silently increases per catch/fail** |
| Energy regen | 1 per 30 minutes | 1 per 25 minutes |
| Batch despawn trigger | Timeout OR 0 attempts remaining | Timeout only |
| User-facing attempts info | Shows "X attempts remaining" | **Removed entirely** — user just sees energy cost |

### Formulas

**Catch rate** (internal, per catch/fail):
```
catchRate = baseCatchRate - difficultyScale * (1 - rarestRate / maxTraitSpawnRate) - (catchCount * catchPenaltyPerAttempt)
clamped to [minCatchRate, maxCatchRate]
```

**Energy cost** (shown to user via /scan, increases silently):
```
energyCost = baseCost + catchCount * costIncreasePerAttempt
clamped to [1, maxEnergyCost]
```

Where `baseCost` = the existing trait-rarity-based cost (1 + rare trait count, capped at 5).
`catchCount` is internal to `BatchState` — never shown to the user.

---

### Task 1: Update Balance Config and Types

**Files:**
- Modify: `config/balance.json`
- Modify: `src/types.ts:80-84` (BatchState), `src/types.ts:136-144` (CatchResult), `src/types.ts:172-179` (StatusResult), `src/types.ts:207-215` (BalanceConfig)
- Modify: `src/config/constants.ts`

- [ ] **Step 1: Update `config/balance.json`**

Remove `sharedAttempts` from `batch`. Add `catchPenaltyPerAttempt` and `costIncreasePerAttempt` and `maxEnergyCost` to `catching`. Change `energy.gainIntervalMs` from `1800000` to `1500000`.

```json
// batch section — remove "sharedAttempts": 3
"batch": {
  "spawnIntervalMs": 1800000,
  "batchLingerMs": 1800000,
  "timeOfDay": {
    "morning": [6, 12],
    "afternoon": [12, 17],
    "evening": [17, 21],
    "night": [21, 6]
  }
}

// catching section — add these three new fields:
"catching": {
  "baseCatchRate": 0.90,
  "minCatchRate": 0.15,
  "maxCatchRate": 0.90,
  "failPenaltyPerMiss": 0.10,
  "maxTraitSpawnRate": 0.12,
  "difficultyScale": 0.50,
  "catchPenaltyPerAttempt": 0.08,
  "costIncreasePerAttempt": 1,
  "maxEnergyCost": 8,
  "xpBase": 20,
  "xpRarityMultiplier": 5
}

// energy section — change gainIntervalMs:
"energy": {
  "gainIntervalMs": 1500000,
  ...rest stays the same
}
```

- [ ] **Step 2: Update `BatchState` in `src/types.ts`**

Replace `attemptsRemaining` with internal `catchCount`:

```typescript
export interface BatchState {
  catchCount: number;
  failPenalty: number;
  spawnedAt: number;
}
```

- [ ] **Step 3: Update `CatchResult` in `src/types.ts`**

Remove `attemptsRemaining` entirely. The user doesn't see attempt info — just cost and success/fail:

```typescript
export interface CatchResult {
  success: boolean;
  creature: NearbyCreature;
  energySpent: number;
  fled: boolean;
  xpEarned: number;
  failPenalty: number;
}
```

- [ ] **Step 4: Update `StatusResult` in `src/types.ts`**

Remove `batchAttemptsRemaining` entirely — no attempt info shown to user:

```typescript
export interface StatusResult {
  profile: PlayerProfile;
  collectionCount: number;
  archiveCount: number;
  energy: number;
  nearbyCount: number;
}
```

- [ ] **Step 5: Update `BalanceConfig` in `src/types.ts`**

Remove `sharedAttempts` from `batch`. Add three new fields to `catching`:

```typescript
// In BalanceConfig.batch — remove sharedAttempts
batch: {
  spawnIntervalMs: number;
  batchLingerMs: number;
  timeOfDay: Record<string, [number, number]>;
};

// In BalanceConfig.catching — add:
catching: {
  // ...existing fields...
  catchPenaltyPerAttempt: number;
  costIncreasePerAttempt: number;
  maxEnergyCost: number;
};
```

- [ ] **Step 6: Update `src/config/constants.ts`**

Remove the `SHARED_ATTEMPTS` export (no replacement needed — attempts are gone).

```typescript
// Delete this line:
export const SHARED_ATTEMPTS = config.batch.sharedAttempts;
```

- [ ] **Step 7: Run build to verify types compile**

Run: `npm run build`
Expected: Compile errors in files that still reference old fields (batch.ts, catch.ts, game-engine.ts, renderers, tests). This is expected — we fix those in subsequent tasks.

---

### Task 2: Update Batch Engine (spawn + cleanup)

**Files:**
- Modify: `src/engine/batch.ts`
- Modify: `tests/engine/batch.test.ts`

- [ ] **Step 1: Write/update failing tests in `tests/engine/batch.test.ts`**

Update `spawnBatch` test to check `catchCount: 0` instead of `attemptsRemaining: 3`. Remove the import of `SHARED_ATTEMPTS` if present. Update `cleanupBatch` tests to remove the "no attempts remaining" test case, since batches no longer despawn on attempts.

```typescript
// In "spawns 3-5 creatures with batch state" test:
expect(state.batch!.catchCount).toBe(0);
// Remove: expect(state.batch!.attemptsRemaining).toBe(3);

// In "does not spawn if batch already active" test — update fixture:
batch: { catchCount: 0, failPenalty: 0, spawnedAt: Date.now() },

// In cleanupBatch "removes batch and nearby when timed out" test — update fixture:
batch: { catchCount: 2, failPenalty: 0, spawnedAt: thirtyOneMinAgo },

// DELETE the "removes batch when no attempts remaining" test entirely.

// In "keeps batch if still active" test — update fixture:
batch: { catchCount: 1, failPenalty: 0, spawnedAt: Date.now() },
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/engine/batch.test.ts -v`
Expected: FAIL — `attemptsRemaining` still in source code.

- [ ] **Step 3: Update `src/engine/batch.ts`**

Remove `SHARED_ATTEMPTS` import. Change `spawnBatch` to initialize `catchCount: 0` instead of `attemptsRemaining: SHARED_ATTEMPTS`. Change the guard in `spawnBatch` from checking `attemptsRemaining > 0` to just checking `state.batch !== null` (an active batch blocks new spawns). Remove the `noAttemptsLeft` check from `cleanupBatch`.

```typescript
// Top: remove SHARED_ATTEMPTS from import
import { BATCH_LINGER_MS } from "../config/constants";

// spawnBatch — change guard:
if (state.batch !== null) {
  return [];
}

// spawnBatch — change batch initialization:
state.batch = {
  catchCount: 0,
  failPenalty: 0,
  spawnedAt: now,
};

// cleanupBatch — remove noAttemptsLeft logic:
export function cleanupBatch(state: GameState, now: number): string[] {
  if (state.batch === null) {
    return [];
  }
  const elapsed = now - state.batch.spawnedAt;
  if (elapsed > BATCH_LINGER_MS) {
    const despawnedIds = state.nearby.map((c) => c.id);
    state.nearby = [];
    state.batch = null;
    return despawnedIds;
  }
  return [];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/engine/batch.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/batch.ts tests/engine/batch.test.ts config/balance.json src/types.ts src/config/constants.ts
git commit -m "refactor: remove shared attempts from batch, add attemptCount tracking"
```

---

### Task 3: Update Catch Engine

**Files:**
- Modify: `src/engine/catch.ts`
- Modify: `tests/engine/catch-v2.test.ts`

- [ ] **Step 1: Update tests in `tests/engine/catch-v2.test.ts`**

All `makeState` calls that set `batch` need `catchCount` instead of `attemptsRemaining`. Delete the "throws if no attempts remaining" test (no limit exists). Add new tests for escalating cost and decreasing catch rate.

Key test changes:

```typescript
// In makeState default:
batch: { catchCount: 0, failPenalty: 0, spawnedAt: Date.now() },

// DELETE: "throws if no attempts remaining" test

// KEEP: "throws if no batch active" — still valid

// ADD new test: "each catch increments catchCount"
test("each catch increments catchCount", () => {
  const state = makeState();
  state.energy = 50;
  attemptCatch(state, 0, () => 0.01); // success
  expect(state.batch!.catchCount).toBe(1);
});

// ADD new test: "energy cost increases with catchCount"
test("energy cost increases with catchCount", () => {
  const cost0 = calculateEnergyCost("compi", state.nearby[0].slots, 0);
  const cost3 = calculateEnergyCost("compi", state.nearby[0].slots, 3);
  expect(cost3).toBeGreaterThan(cost0);
});

// ADD new test: "catch rate decreases with catchCount"
test("catch rate decreases with catchCount", () => {
  const rate0 = calculateCatchRate("compi", state.nearby[0].slots, 0, 0);
  const rate3 = calculateCatchRate("compi", state.nearby[0].slots, 0, 3);
  expect(rate3).toBeLessThan(rate0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/engine/catch-v2.test.ts -v`
Expected: FAIL — signature changes not yet implemented.

- [ ] **Step 3: Update `src/engine/catch.ts`**

Change `calculateCatchRate` to accept `catchCount` and apply `catchPenaltyPerAttempt`:

```typescript
export function calculateCatchRate(
  speciesId: string,
  slots: CreatureSlot[],
  failPenalty: number,
  catchCount: number
): number {
  const config = loadConfig();
  const { baseCatchRate, minCatchRate, maxCatchRate, maxTraitSpawnRate, difficultyScale, catchPenaltyPerAttempt } = config.catching;

  let rarestRate = maxTraitSpawnRate;
  for (const slot of slots) {
    const trait = getTraitDefinition(speciesId, slot.variantId);
    if (trait && trait.spawnRate < rarestRate) {
      rarestRate = trait.spawnRate;
    }
  }

  const rate = baseCatchRate
    - (difficultyScale * (1 - rarestRate / maxTraitSpawnRate))
    - failPenalty
    - (catchCount * catchPenaltyPerAttempt);
  return Math.max(minCatchRate, Math.min(maxCatchRate, rate));
}
```

Change `calculateEnergyCost` to accept `catchCount` and scale cost:

```typescript
export function calculateEnergyCost(
  speciesId: string,
  slots: CreatureSlot[],
  catchCount: number
): number {
  const config = loadConfig();
  let rareCount = 0;
  for (const slot of slots) {
    const trait = getTraitDefinition(speciesId, slot.variantId);
    if (trait && trait.spawnRate < 0.05) rareCount++;
  }
  const baseCost = Math.min(1 + rareCount, 5);
  return Math.min(baseCost + catchCount * config.catching.costIncreasePerAttempt, config.catching.maxEnergyCost);
}
```

Update `attemptCatch`:
- Remove `attemptsRemaining` check and decrement entirely.
- Increment `catchCount` instead.
- Pass `catchCount` to `calculateCatchRate` and `calculateEnergyCost`.
- Do NOT return any attempt/count info — user just sees energy spent and success/fail.

```typescript
export function attemptCatch(
  state: GameState,
  nearbyIndex: number,
  rng: () => number = Math.random
): CatchResult {
  const config = loadConfig();

  if (!state.batch) {
    throw new Error("No active batch");
  }

  if (nearbyIndex < 0 || nearbyIndex >= state.nearby.length) {
    throw new Error("Invalid creature index");
  }

  const nearby = state.nearby[nearbyIndex];
  const energyCost = calculateEnergyCost(nearby.speciesId, nearby.slots, state.batch.catchCount);

  if (state.energy < energyCost) {
    throw new Error(`Not enough energy: have ${state.energy}, need ${energyCost}`);
  }

  spendEnergy(state, energyCost);
  state.batch.catchCount++;

  const catchRate = calculateCatchRate(
    nearby.speciesId, nearby.slots,
    state.batch.failPenalty, state.batch.catchCount
  );
  const roll = rng();
  const success = roll < catchRate;

  let xpEarned = 0;

  if (success) {
    state.nearby.splice(nearbyIndex, 1);
    xpEarned = calculateXpEarned(nearby.speciesId, nearby.slots);

    const collectionCreature: CollectionCreature = {
      id: nearby.id,
      speciesId: nearby.speciesId,
      name: nearby.name,
      slots: nearby.slots,
      caughtAt: Date.now(),
      generation: 0,
      archived: false,
    };
    state.collection.push(collectionCreature);

    state.profile.xp += xpEarned;
    state.profile.totalCatches++;
  } else {
    state.batch.failPenalty += config.catching.failPenaltyPerMiss;
  }

  return {
    success,
    creature: nearby,
    energySpent: energyCost,
    fled: false,
    xpEarned,
    failPenalty: state.batch.failPenalty,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/engine/catch-v2.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/catch.ts tests/engine/catch-v2.test.ts
git commit -m "feat: escalating catch cost and decreasing catch rate per attempt"
```

---

### Task 4: Update Game Engine + Scan

**Files:**
- Modify: `src/engine/game-engine.ts`

- [ ] **Step 1: Update `game-engine.ts`**

In `scan()`, pass `state.batch?.catchCount ?? 0` to `calculateCatchRate` and `calculateEnergyCost`:

```typescript
scan(rng: () => number = Math.random): ScanResult {
  if (this.state.nearby.length === 0) {
    spawnBatch(this.state, Date.now(), rng);
  }
  const catchCount = this.state.batch?.catchCount ?? 0;
  const nearby: ScanEntry[] = this.state.nearby.map((creature, index) => ({
    index,
    creature,
    catchRate: calculateCatchRate(creature.speciesId, creature.slots, this.state.batch?.failPenalty ?? 0, catchCount),
    energyCost: calculateEnergyCost(creature.speciesId, creature.slots, catchCount),
  }));
  return { nearby, energy: this.state.energy, batch: this.state.batch };
}
```

In `status()`, remove `batchAttemptsRemaining` entirely:

```typescript
status(): StatusResult {
  return {
    profile: this.state.profile,
    collectionCount: this.state.collection.length,
    archiveCount: this.state.archive.length,
    energy: this.state.energy,
    nearbyCount: this.state.nearby.length,
  };
}
```

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: May still have renderer errors (Task 5), but engine should compile.

- [ ] **Step 3: Commit**

```bash
git add src/engine/game-engine.ts
git commit -m "refactor: game engine uses attemptCount for scan and status"
```

---

### Task 5: Update Renderer + Messages

**Files:**
- Modify: `src/renderers/simple-text.ts:250` (catch result line)
- Modify: `config/balance.json` (messages)
- Modify: `tests/renderers/simple-text.test.ts`

- [ ] **Step 1: Update renderer in `src/renderers/simple-text.ts`**

Remove the "attempts remaining" line entirely from catch failure output. Just show energy spent:

```typescript
// Replace line ~250 — remove the attempts remaining text:
lines.push(`  ${DIM}-${result.energySpent}${RESET}${ENERGY_ICON}`);
```

- [ ] **Step 2: Update `config/balance.json` messages**

Remove `escapedHint` from catch messages (no attempt info to show). Change `escapedMessage` to a simpler message:

```json
"escapedMessage": "{name} slipped away! Try again?",
```

Remove `"escapedHint": "{attempts} attempts remaining"` entirely.

- [ ] **Step 3: Update renderer tests in `tests/renderers/simple-text.test.ts`**

Remove `attemptsRemaining` from all `CatchResult` fixtures. Delete the "contains attempts remaining" test. Update any test that checks for attempt-related text.

```typescript
// All CatchResult fixtures: remove attemptsRemaining entirely
// e.g. remove: attemptsRemaining: 3

// DELETE: "contains attempts remaining" test

// Keep tests for energy spent, creature name, success/fail messages
```

- [ ] **Step 4: Run renderer tests**

Run: `npx jest tests/renderers/simple-text.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderers/simple-text.ts tests/renderers/simple-text.test.ts config/balance.json
git commit -m "feat: renderer shows attempt count instead of attempts remaining"
```

---

### Task 6: Update All Remaining Test Fixtures + Integration Test

**Files:**
- Modify: `tests/integration/gameplay-loop.test.ts`
- Modify: any test file still referencing `attemptsRemaining` in batch fixtures

- [ ] **Step 1: Update integration test**

In `tests/integration/gameplay-loop.test.ts`, the test manually sets `state.batch = null` to force respawn — this still works. No `attemptsRemaining` references should remain.

Search all test files for any remaining `attemptsRemaining` or `attemptCount` references and update them to `catchCount` (internal only) or remove (user-facing):

```bash
grep -rn "attemptsRemaining\|attemptCount\|batchAttemptsRemaining" tests/
```

Fix each one — batch fixtures use `catchCount`, result types no longer have attempt fields.

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass (except the pre-existing `ansi-to-html` failure).

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Clean compile.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: update all test fixtures for catch economy rework"
```

---

### Task 7: Verify Energy Regen Rate

**Files:**
- Modify: `tests/engine/energy.test.ts` (if existing test checks interval)

- [ ] **Step 1: Check energy test for interval assumption**

Read `tests/engine/energy.test.ts` and look for hardcoded `1800000` values. Update any to `1500000` (25 minutes).

- [ ] **Step 2: Run energy tests**

Run: `npx jest tests/engine/energy.test.ts -v`
Expected: PASS

- [ ] **Step 3: Final full test run**

Run: `npm test`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add tests/engine/energy.test.ts
git commit -m "test: update energy test for 25-minute regen interval"
```

# Config Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all hardcoded game balance values, creature/item definitions, and player-facing messages from TypeScript into a single `config/balance.json`, loaded by a new `src/config/loader.ts`.

**Architecture:** A JSON config file at the repo root holds all tunable data. A TypeScript loader reads, caches, and exports it with full typing. Existing config modules (`constants.ts`, `creatures.ts`, `items.ts`) become thin re-exports so no downstream imports change. The renderer and engine swap hardcoded strings for config lookups via a `formatMessage()` helper.

**Tech Stack:** TypeScript, Node.js `fs`/`path`, Jest + ts-jest

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `config/balance.json` | Create | All game data: spawning, catching, progression, rewards, creatures, items, messages |
| `src/config/loader.ts` | Create | Read + cache JSON, export typed `BalanceConfig`, `formatMessage()`, milestone condition builder |
| `src/types.ts` | Modify | Add `MilestoneCondition`, `MilestoneConfig`, `BalanceConfig` types |
| `src/config/constants.ts` | Rewrite | Thin re-exports from loader |
| `src/config/creatures.ts` | Rewrite | Re-export `CREATURES` from loader, keep helper functions |
| `src/config/items.ts` | Rewrite | Re-export `ITEMS` from loader, keep helper functions |
| `src/engine/catch.ts` | Modify | Import new constants (`BONUS_ITEM_DROP_CHANCE`, etc.) instead of hardcoded values |
| `src/engine/ticks.ts` | Modify | Import `TIME_OF_DAY_RANGES` instead of hardcoded hour ranges |
| `src/renderers/simple-text.ts` | Modify | Use `formatMessage()` + messages config instead of hardcoded strings |
| `src/engine/game-engine.ts` | Modify | Notification strings from messages config |
| `tests/config/loader.test.ts` | Create | Loader, milestone conditions, formatMessage tests |

---

### Task 1: Create `config/balance.json` — spawning, catching, progression, rewards sections

**Files:**
- Create: `config/balance.json`

- [ ] **Step 1: Create the JSON file with balance sections**

Create `config/balance.json` with the `spawning`, `catching`, `progression`, and `rewards` sections. Creatures, items, and messages will be added in later tasks.

```json
{
  "spawning": {
    "ticksPerSpawnCheck": 10,
    "spawnProbability": 0.6,
    "maxNearby": 10,
    "initialSpawnCount": 3,
    "creatureLingerMs": 1800000,
    "maxCatchAttempts": 3,
    "spawnWeights": {
      "common": 0.45,
      "uncommon": 0.25,
      "rare": 0.15,
      "epic": 0.10,
      "legendary": 0.05
    },
    "timeOfDay": {
      "morning": [6, 12],
      "afternoon": [12, 17],
      "evening": [17, 21],
      "night": [21, 6]
    }
  },
  "catching": {
    "maxCatchRate": 1.0,
    "bonusItemDropChance": 0.1,
    "bonusItemId": "bytetrap",
    "fragmentsPerCatch": 1,
    "xpPerCatch": {
      "common": 10,
      "uncommon": 25,
      "rare": 50,
      "epic": 100,
      "legendary": 250
    }
  },
  "progression": {
    "xpPerLevel": 100,
    "sessionGapMs": 900000,
    "tickPruneCount": 500
  },
  "rewards": {
    "passiveDripInterval": 25,
    "passiveDripItems": [
      { "itemId": "bytetrap", "count": 2, "weight": 0.7 },
      { "itemId": "netsnare", "count": 1, "weight": 0.25 },
      { "itemId": "corelock", "count": 1, "weight": 0.05 }
    ],
    "sessionRewardItems": [
      { "itemId": "bytetrap", "count": 3, "weight": 0.6 },
      { "itemId": "netsnare", "count": 1, "weight": 0.3 },
      { "itemId": "shard", "count": 1, "weight": 0.1 }
    ],
    "milestones": [
      {
        "id": "first_catch",
        "description": "First catch!",
        "condition": { "type": "totalCatches", "threshold": 1 },
        "reward": [{ "itemId": "bytetrap", "count": 5 }],
        "oneTime": true
      },
      {
        "id": "catch_10",
        "description": "10 catches!",
        "condition": { "type": "totalCatches", "threshold": 10 },
        "reward": [{ "itemId": "netsnare", "count": 3 }, { "itemId": "shard", "count": 1 }],
        "oneTime": true
      },
      {
        "id": "catch_50",
        "description": "50 catches!",
        "condition": { "type": "totalCatches", "threshold": 50 },
        "reward": [{ "itemId": "corelock", "count": 2 }, { "itemId": "prism", "count": 1 }],
        "oneTime": true
      },
      {
        "id": "streak_3",
        "description": "3-day streak!",
        "condition": { "type": "currentStreak", "threshold": 3 },
        "reward": [{ "itemId": "bytetrap", "count": 3 }],
        "oneTime": true
      },
      {
        "id": "streak_7",
        "description": "7-day streak!",
        "condition": { "type": "currentStreak", "threshold": 7 },
        "reward": [{ "itemId": "netsnare", "count": 3 }, { "itemId": "shard", "count": 2 }],
        "oneTime": true
      },
      {
        "id": "streak_30",
        "description": "30-day streak!",
        "condition": { "type": "currentStreak", "threshold": 30 },
        "reward": [{ "itemId": "corelock", "count": 3 }, { "itemId": "prism", "count": 2 }],
        "oneTime": true
      }
    ]
  },
  "creatures": [],
  "items": [],
  "messages": {}
}
```

Note: `creatures`, `items`, and `messages` are empty placeholders — they'll be populated in Tasks 2 and 3.

- [ ] **Step 2: Commit**

```bash
git add config/balance.json
git commit -m "feat: add config/balance.json with balance sections"
```

---

### Task 2: Add creatures and items to `config/balance.json`

**Files:**
- Modify: `config/balance.json`

- [ ] **Step 1: Populate the `creatures` array**

Replace the empty `"creatures": []` with all 30 creature definitions from `src/config/creatures.ts`. Each entry has this shape (copy all 30):

```json
{
  "id": "mousebyte",
  "name": "Mousebyte",
  "description": "A tiny field mouse that nests in warm circuit boards",
  "rarity": "common",
  "baseCatchRate": 0.8,
  "art": {
    "simple": ["⠰⡱⢀⠤⠤⡀⢎⠆", "  ⡇⠂⣐⢸  ", "  ⢈⠖⠲⡁  "],
    "rich": ["⠰⡱⢀⠤⠤⡀⢎⠆", "  ⡇⠂⣐⢸  ", "  ⢈⠖⠲⡁  "]
  },
  "spawnCondition": {},
  "evolution": { "targetId": "circuitmouse", "fragmentCost": 5 }
}
```

Copy every creature from `src/config/creatures.ts` lines 7-401 into JSON format. Evolved creatures without evolution (like `circuitmouse`) omit the `evolution` field. Creatures with `catalystItemId` include it: `"evolution": { "targetId": "raptornet", "fragmentCost": 10, "catalystItemId": "shard" }`.

- [ ] **Step 2: Populate the `items` array**

Replace the empty `"items": []` with all 5 item definitions from `src/config/items.ts`:

```json
[
  {
    "id": "bytetrap",
    "name": "ByteTrap",
    "description": "Basic capture device — gets the job done",
    "type": "capture",
    "catchMultiplier": 1.0
  },
  {
    "id": "netsnare",
    "name": "NetSnare",
    "description": "An improved trap with tighter data bindings",
    "type": "capture",
    "catchMultiplier": 1.5
  },
  {
    "id": "corelock",
    "name": "CoreLock",
    "description": "Military-grade containment — rarely fails",
    "type": "capture",
    "catchMultiplier": 2.0
  },
  {
    "id": "shard",
    "name": "Shard",
    "description": "A crystallized data fragment, needed for basic evolution",
    "type": "catalyst"
  },
  {
    "id": "prism",
    "name": "Prism",
    "description": "A prismatic memory core, needed for advanced evolution",
    "type": "catalyst"
  }
]
```

- [ ] **Step 3: Commit**

```bash
git add config/balance.json
git commit -m "feat: add creatures and items to balance.json"
```

---

### Task 3: Add messages to `config/balance.json`

**Files:**
- Modify: `config/balance.json`

- [ ] **Step 1: Populate the `messages` object**

Replace the empty `"messages": {}` with all player-facing strings from `src/renderers/simple-text.ts` and `src/engine/game-engine.ts`:

```json
{
  "scan": {
    "empty": "No signals detected — nothing nearby right now.",
    "header": "NEARBY SIGNALS — {count} detected",
    "catchItems": "Catch items: {count}",
    "footer": "Use /catch [number] to attempt capture"
  },
  "catch": {
    "successHeader": "*** CAUGHT! ***",
    "captured": "{name} captured with {item}",
    "xpGained": "+{xp} XP",
    "fragmentProgress": "Fragments: [{bar}] {count}/{cost}",
    "fragmentCount": "Fragment: {count}",
    "evolutionReady": "[Ready to evolve!]",
    "bonusItem": "Bonus: +{count}x {name}",
    "fledHeader": "* FLED! *",
    "fledMessage": "{name} slipped away for good.",
    "itemUsed": "The {item} was used.",
    "escapedHeader": "X ESCAPED",
    "escapedMessage": "{name} broke free!",
    "escapedHint": "Try again with another {item}"
  },
  "collection": {
    "empty": "Your collection is empty. Use /scan to find creatures nearby.",
    "header": "COLLECTION — {count} creatures",
    "evolved": "[EVOLVED]",
    "caught": "Caught: {count}x",
    "fragProgress": "Frags: [{bar}] {count}/{cost}"
  },
  "inventory": {
    "empty": "Inventory is empty. Complete tasks and catches to earn items.",
    "header": "INVENTORY",
    "captureSection": "CAPTURE DEVICES",
    "catalystSection": "EVOLUTION CATALYSTS"
  },
  "evolve": {
    "failed": "Evolution failed.",
    "successHeader": "[* EVOLUTION COMPLETE! *]",
    "transform": "{from} -> {to}",
    "catalystUsed": "(Used: {catalyst})"
  },
  "status": {
    "header": "STATUS",
    "level": "Level {level}",
    "xp": "XP: {bar} {xp}/{nextXp}",
    "catches": "Total catches: {count}",
    "collection": "Collection: {bar} {count}/{total}",
    "streak": "Streak: {streak} days (best: {best})",
    "nearby": "Nearby: {count} creatures",
    "ticks": "Total ticks: {count}"
  },
  "notifications": {
    "despawn": "{name} slipped away...",
    "rareSpawn": "Rare signal detected!",
    "normalSpawn": "Something flickering nearby...",
    "milestone": "Milestone reward! +{items}",
    "evolutionReady": "{name} has enough fragments to evolve!"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add config/balance.json
git commit -m "feat: add messages to balance.json"
```

---

### Task 4: Add config types to `src/types.ts`

**Files:**
- Modify: `src/types.ts`
- Test: `tests/config/loader.test.ts` (created in Task 5)

- [ ] **Step 1: Add the new types at the end of `src/types.ts`**

Add after the existing `Renderer` interface (after line 167):

```ts
// --- Config ---

export interface MilestoneCondition {
  type: "totalCatches" | "currentStreak" | "totalTicks";
  threshold: number;
}

export interface MilestoneConfig {
  id: string;
  description: string;
  condition: MilestoneCondition;
  reward: Array<{ itemId: string; count: number }>;
  oneTime: boolean;
}

export interface WeightedItem {
  itemId: string;
  count: number;
  weight: number;
}

export interface BalanceConfig {
  spawning: {
    ticksPerSpawnCheck: number;
    spawnProbability: number;
    maxNearby: number;
    initialSpawnCount: number;
    creatureLingerMs: number;
    maxCatchAttempts: number;
    spawnWeights: Record<string, number>;
    timeOfDay: Record<string, [number, number]>;
  };
  catching: {
    maxCatchRate: number;
    bonusItemDropChance: number;
    bonusItemId: string;
    fragmentsPerCatch: number;
    xpPerCatch: Record<string, number>;
  };
  progression: {
    xpPerLevel: number;
    sessionGapMs: number;
    tickPruneCount: number;
  };
  rewards: {
    passiveDripInterval: number;
    passiveDripItems: WeightedItem[];
    sessionRewardItems: WeightedItem[];
    milestones: MilestoneConfig[];
  };
  creatures: CreatureDefinition[];
  items: ItemDefinition[];
  messages: Record<string, Record<string, string>>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add BalanceConfig types to types.ts"
```

---

### Task 5: Create `src/config/loader.ts` with tests (TDD)

**Files:**
- Create: `tests/config/loader.test.ts`
- Create: `src/config/loader.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/config/loader.test.ts`:

```ts
import { loadConfig, formatMessage, buildMilestoneCondition } from "../../src/config/loader";
import { BalanceConfig } from "../../src/types";

describe("loadConfig", () => {
  let config: BalanceConfig;

  beforeAll(() => {
    config = loadConfig();
  });

  test("loads and returns a BalanceConfig object", () => {
    expect(config).toBeDefined();
    expect(config.spawning).toBeDefined();
    expect(config.catching).toBeDefined();
    expect(config.progression).toBeDefined();
    expect(config.rewards).toBeDefined();
    expect(config.creatures).toBeDefined();
    expect(config.items).toBeDefined();
    expect(config.messages).toBeDefined();
  });

  test("spawning section has correct values", () => {
    expect(config.spawning.ticksPerSpawnCheck).toBe(10);
    expect(config.spawning.spawnProbability).toBe(0.6);
    expect(config.spawning.maxNearby).toBe(10);
    expect(config.spawning.spawnWeights.common).toBe(0.45);
    expect(config.spawning.timeOfDay.morning).toEqual([6, 12]);
  });

  test("catching section has correct values", () => {
    expect(config.catching.maxCatchRate).toBe(1.0);
    expect(config.catching.bonusItemDropChance).toBe(0.1);
    expect(config.catching.bonusItemId).toBe("bytetrap");
    expect(config.catching.fragmentsPerCatch).toBe(1);
    expect(config.catching.xpPerCatch.legendary).toBe(250);
  });

  test("creatures array has 30 entries", () => {
    expect(config.creatures.length).toBe(30);
  });

  test("items array has 5 entries", () => {
    expect(config.items.length).toBe(5);
  });

  test("milestones have declarative conditions", () => {
    const firstCatch = config.rewards.milestones.find((m) => m.id === "first_catch");
    expect(firstCatch).toBeDefined();
    expect(firstCatch!.condition.type).toBe("totalCatches");
    expect(firstCatch!.condition.threshold).toBe(1);
  });

  test("messages sections exist", () => {
    expect(config.messages.scan).toBeDefined();
    expect(config.messages.catch).toBeDefined();
    expect(config.messages.notifications).toBeDefined();
    expect(config.messages.scan.empty).toBe("No signals detected — nothing nearby right now.");
  });

  test("returns cached instance on second call", () => {
    const config2 = loadConfig();
    expect(config2).toBe(config);
  });
});

describe("formatMessage", () => {
  test("replaces single placeholder", () => {
    expect(formatMessage("Hello {name}", { name: "World" })).toBe("Hello World");
  });

  test("replaces multiple placeholders", () => {
    expect(formatMessage("{a} and {b}", { a: "X", b: "Y" })).toBe("X and Y");
  });

  test("leaves unknown placeholders unchanged", () => {
    expect(formatMessage("Hello {name}", {})).toBe("Hello {name}");
  });

  test("handles numeric values", () => {
    expect(formatMessage("+{xp} XP", { xp: 50 })).toBe("+50 XP");
  });
});

describe("buildMilestoneCondition", () => {
  test("totalCatches condition", () => {
    const fn = buildMilestoneCondition({ type: "totalCatches", threshold: 10 });
    expect(fn({ totalCatches: 9, currentStreak: 0, totalTicks: 0 })).toBe(false);
    expect(fn({ totalCatches: 10, currentStreak: 0, totalTicks: 0 })).toBe(true);
    expect(fn({ totalCatches: 11, currentStreak: 0, totalTicks: 0 })).toBe(true);
  });

  test("currentStreak condition", () => {
    const fn = buildMilestoneCondition({ type: "currentStreak", threshold: 3 });
    expect(fn({ totalCatches: 0, currentStreak: 2, totalTicks: 0 })).toBe(false);
    expect(fn({ totalCatches: 0, currentStreak: 3, totalTicks: 0 })).toBe(true);
  });

  test("totalTicks condition", () => {
    const fn = buildMilestoneCondition({ type: "totalTicks", threshold: 500 });
    expect(fn({ totalCatches: 0, currentStreak: 0, totalTicks: 499 })).toBe(false);
    expect(fn({ totalCatches: 0, currentStreak: 0, totalTicks: 500 })).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/config/loader.test.ts`
Expected: FAIL — cannot resolve `../../src/config/loader`

- [ ] **Step 3: Write the loader implementation**

Create `src/config/loader.ts`:

```ts
import * as fs from "fs";
import * as path from "path";
import { BalanceConfig, MilestoneCondition } from "../types";

let cached: BalanceConfig | null = null;

export function loadConfig(): BalanceConfig {
  if (cached) return cached;

  const configPath = path.resolve(__dirname, "../../config/balance.json");
  const raw = fs.readFileSync(configPath, "utf-8");
  cached = JSON.parse(raw) as BalanceConfig;
  return cached;
}

export function formatMessage(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return key in vars ? String(vars[key]) : match;
  });
}

export function buildMilestoneCondition(
  condition: MilestoneCondition
): (profile: { totalCatches: number; currentStreak: number; totalTicks: number }) => boolean {
  return (profile) => {
    const value = profile[condition.type];
    return value >= condition.threshold;
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/config/loader.test.ts`
Expected: PASS (all tests green). Note: creatures/items/messages tests will fail until Tasks 2 and 3 are complete. If running tasks in order, all should pass.

- [ ] **Step 5: Commit**

```bash
git add src/config/loader.ts tests/config/loader.test.ts
git commit -m "feat: add config loader with tests"
```

---

### Task 6: Rewrite `src/config/constants.ts` to re-export from loader

**Files:**
- Rewrite: `src/config/constants.ts`

- [ ] **Step 1: Replace constants.ts with re-exports from loader**

Replace the entire contents of `src/config/constants.ts` with:

```ts
import { loadConfig, buildMilestoneCondition } from "./loader";
import { MilestoneCondition } from "../types";

const config = loadConfig();

// Spawning
export const TICKS_PER_SPAWN_CHECK = config.spawning.ticksPerSpawnCheck;
export const SPAWN_PROBABILITY = config.spawning.spawnProbability;
export const MAX_NEARBY = config.spawning.maxNearby;
export const INITIAL_SPAWN_COUNT = config.spawning.initialSpawnCount;
export const CREATURE_LINGER_MS = config.spawning.creatureLingerMs;
export const MAX_CATCH_ATTEMPTS = config.spawning.maxCatchAttempts;
export const SPAWN_WEIGHTS: Record<string, number> = config.spawning.spawnWeights;
export const TIME_OF_DAY_RANGES: Record<string, [number, number]> = config.spawning.timeOfDay;

// Catching
export const MAX_CATCH_RATE = config.catching.maxCatchRate;
export const BONUS_ITEM_DROP_CHANCE = config.catching.bonusItemDropChance;
export const BONUS_ITEM_ID = config.catching.bonusItemId;
export const FRAGMENTS_PER_CATCH = config.catching.fragmentsPerCatch;
export const XP_PER_CATCH: Record<string, number> = config.catching.xpPerCatch;

// Progression
export const XP_PER_LEVEL = config.progression.xpPerLevel;
export const SESSION_GAP_MS = config.progression.sessionGapMs;
export const TICK_PRUNE_COUNT = config.progression.tickPruneCount;

// Rewards
export const PASSIVE_DRIP_INTERVAL = config.rewards.passiveDripInterval;
export const PASSIVE_DRIP_ITEMS: Array<{ itemId: string; count: number; weight: number }> =
  config.rewards.passiveDripItems;
export const SESSION_REWARD_ITEMS: Array<{ itemId: string; count: number; weight: number }> =
  config.rewards.sessionRewardItems;

// Milestones — build condition functions from declarative JSON
export interface Milestone {
  id: string;
  description: string;
  condition: (profile: { totalCatches: number; currentStreak: number; totalTicks: number }) => boolean;
  reward: Array<{ itemId: string; count: number }>;
  oneTime: boolean;
}

export const MILESTONES: Milestone[] = config.rewards.milestones.map((m) => ({
  id: m.id,
  description: m.description,
  condition: buildMilestoneCondition(m.condition),
  reward: m.reward,
  oneTime: m.oneTime,
}));

// Messages
export const MESSAGES: Record<string, Record<string, string>> = config.messages;
```

- [ ] **Step 2: Run existing tests to verify nothing breaks**

Run: `npx jest`
Expected: All existing tests pass — same export names, same values.

- [ ] **Step 3: Commit**

```bash
git add src/config/constants.ts
git commit -m "refactor: constants.ts re-exports from balance.json via loader"
```

---

### Task 7: Rewrite `src/config/creatures.ts` to re-export from loader

**Files:**
- Rewrite: `src/config/creatures.ts`

- [ ] **Step 1: Replace creatures.ts with re-exports from loader**

Replace the entire contents of `src/config/creatures.ts` with:

```ts
import { CreatureDefinition } from "../types";
import { loadConfig } from "./loader";

const config = loadConfig();

export const CREATURES: CreatureDefinition[] = config.creatures;

export function getCreatureMap(): Map<string, CreatureDefinition> {
  const map = new Map<string, CreatureDefinition>();
  for (const c of CREATURES) {
    map.set(c.id, c);
  }
  return map;
}

export function getSpawnableCreatures(): CreatureDefinition[] {
  return CREATURES.filter((c) => c.baseCatchRate > 0);
}
```

- [ ] **Step 2: Run existing tests**

Run: `npx jest`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/config/creatures.ts
git commit -m "refactor: creatures.ts re-exports from balance.json via loader"
```

---

### Task 8: Rewrite `src/config/items.ts` to re-export from loader

**Files:**
- Rewrite: `src/config/items.ts`

- [ ] **Step 1: Replace items.ts with re-exports from loader**

Replace the entire contents of `src/config/items.ts` with:

```ts
import { ItemDefinition } from "../types";
import { loadConfig } from "./loader";

const config = loadConfig();

export const ITEMS: ItemDefinition[] = config.items;

export function getItemMap(): Map<string, ItemDefinition> {
  const map = new Map<string, ItemDefinition>();
  for (const item of ITEMS) {
    map.set(item.id, item);
  }
  return map;
}
```

- [ ] **Step 2: Run existing tests**

Run: `npx jest`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/config/items.ts
git commit -m "refactor: items.ts re-exports from balance.json via loader"
```

---

### Task 9: Update `src/engine/catch.ts` to use config constants

**Files:**
- Modify: `src/engine/catch.ts`

- [ ] **Step 1: Run existing catch tests to establish baseline**

Run: `npx jest tests/engine/catch.test.ts`
Expected: All pass.

- [ ] **Step 2: Update imports and replace hardcoded values**

In `src/engine/catch.ts`, change the import from:

```ts
import { XP_PER_CATCH, XP_PER_LEVEL, PASSIVE_DRIP_ITEMS } from "../config/constants";
```

to:

```ts
import {
  XP_PER_CATCH,
  XP_PER_LEVEL,
  MAX_CATCH_RATE,
  BONUS_ITEM_DROP_CHANCE,
  BONUS_ITEM_ID,
  FRAGMENTS_PER_CATCH,
} from "../config/constants";
```

Then replace the hardcoded values in the function body:

1. Line 43 — change `Math.min(creature.baseCatchRate * multiplier, 1)` to `Math.min(creature.baseCatchRate * multiplier, MAX_CATCH_RATE)`
2. Line 53 — change `fragments: 1` (the increment `entry.fragments++`) — this is already `++` (adding 1). Change to `entry.fragments += FRAGMENTS_PER_CATCH` and update the `fragmentsEarned` return value on line 94 from `1` to `FRAGMENTS_PER_CATCH`.
3. Line 81 — change `if (rng() < 0.1)` to `if (rng() < BONUS_ITEM_DROP_CHANCE)`
4. Lines 83-86 — change `allItems.get("bytetrap")` to `allItems.get(BONUS_ITEM_ID)` and change `state.inventory["bytetrap"]` to `state.inventory[BONUS_ITEM_ID]`

The full updated function body for the success path (lines 48-101) should be:

```ts
  if (success) {
    state.nearby.splice(nearbyIndex, 1);

    let entry = state.collection.find((c) => c.creatureId === creature.id);
    if (entry) {
      entry.fragments += FRAGMENTS_PER_CATCH;
      entry.totalCaught++;
    } else {
      entry = {
        creatureId: creature.id,
        fragments: FRAGMENTS_PER_CATCH,
        totalCaught: 1,
        firstCaughtAt: Date.now(),
        evolved: false,
      };
      state.collection.push(entry);
    }

    const xp = XP_PER_CATCH[creature.rarity] || 10;
    state.profile.xp += xp;
    state.profile.totalCatches++;

    while (state.profile.xp >= state.profile.level * XP_PER_LEVEL) {
      state.profile.xp -= state.profile.level * XP_PER_LEVEL;
      state.profile.level++;
    }

    const evolutionReady = creature.evolution
      ? entry.fragments >= creature.evolution.fragmentCost
      : false;

    // Bonus item drop
    let bonusItem: { item: ItemDefinition; count: number } | undefined;
    if (rng() < BONUS_ITEM_DROP_CHANCE) {
      const allItems = getItemMap();
      const bonus = allItems.get(BONUS_ITEM_ID);
      if (bonus) {
        bonusItem = { item: bonus, count: 1 };
        state.inventory[BONUS_ITEM_ID] = (state.inventory[BONUS_ITEM_ID] || 0) + 1;
      }
    }

    return {
      success: true,
      creature,
      itemUsed: item,
      fragmentsEarned: FRAGMENTS_PER_CATCH,
      totalFragments: entry.fragments,
      xpEarned: xp,
      bonusItem,
      fled: false,
      evolutionReady,
    };
  }
```

Also update the catch rate calculation (line 43):

```ts
  const effectiveRate = Math.min(creature.baseCatchRate * multiplier, MAX_CATCH_RATE);
```

- [ ] **Step 3: Run catch tests**

Run: `npx jest tests/engine/catch.test.ts`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add src/engine/catch.ts
git commit -m "refactor: catch.ts uses config constants instead of hardcoded values"
```

---

### Task 10: Update `src/engine/ticks.ts` to use config time-of-day ranges

**Files:**
- Modify: `src/engine/ticks.ts`

- [ ] **Step 1: Run existing ticks tests to establish baseline**

Run: `npx jest tests/engine/ticks.test.ts`
Expected: All pass.

- [ ] **Step 2: Update `getTimeOfDay` to use config ranges**

Change the import at the top of `src/engine/ticks.ts`:

```ts
import { GameState, Tick, TimeOfDay } from "../types";
import { TICK_PRUNE_COUNT, TIME_OF_DAY_RANGES } from "../config/constants";
```

Replace the `getTimeOfDay` function (lines 4-9):

```ts
export function getTimeOfDay(hour: number): TimeOfDay {
  for (const [period, [start, end]] of Object.entries(TIME_OF_DAY_RANGES)) {
    if (start < end) {
      // Normal range (e.g., morning: 6-12)
      if (hour >= start && hour < end) return period as TimeOfDay;
    } else {
      // Wrapping range (e.g., night: 21-6)
      if (hour >= start || hour < end) return period as TimeOfDay;
    }
  }
  return "night"; // fallback
}
```

- [ ] **Step 3: Run ticks tests**

Run: `npx jest tests/engine/ticks.test.ts`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add src/engine/ticks.ts
git commit -m "refactor: ticks.ts uses config time-of-day ranges"
```

---

### Task 11: Update `src/renderers/simple-text.ts` to use messages config

**Files:**
- Modify: `src/renderers/simple-text.ts`

- [ ] **Step 1: Run existing renderer tests to establish baseline**

Run: `npx jest tests/renderers/`
Expected: All pass.

- [ ] **Step 2: Add imports**

Add to the top of `src/renderers/simple-text.ts`:

```ts
import { MESSAGES } from "../config/constants";
import { formatMessage } from "../config/loader";
```

- [ ] **Step 3: Update `renderScan`**

Replace the hardcoded strings in `renderScan` (lines 40-58). Change:

```ts
  renderScan(result: ScanResult): string {
    if (result.nearby.length === 0) {
      return MESSAGES.scan.empty;
    }

    let out = formatMessage(MESSAGES.scan.header, { count: result.nearby.length }) + "\n";
    if (result.totalCatchItems !== undefined) {
      out += formatMessage(MESSAGES.scan.catchItems, { count: result.totalCatchItems }) + "\n";
    }
    out += "\n";

    for (let i = 0; i < result.nearby.length; i += 3) {
      const rowCreatures = result.nearby.slice(i, i + 3);
      const rows = this.formatCreatureRow(rowCreatures);
      out += rows + "\n";
    }

    out += MESSAGES.scan.footer;
    return out;
  }
```

- [ ] **Step 4: Update `renderCatch`**

Replace hardcoded strings in `renderCatch` (lines 128-173):

```ts
  renderCatch(result: CatchResult): string {
    const c = result.creature;
    const msg = MESSAGES.catch;

    if (result.success) {
      let out = `+==================================+\n`;
      out += padDouble(msg.successHeader) + "\n";
      out += `+==================================+\n`;
      out += padDouble(formatMessage(msg.captured, { name: c.name, item: result.itemUsed.name })) + "\n";
      out += `+==================================+\n`;
      out += padDouble(formatMessage(msg.xpGained, { xp: result.xpEarned })) + "\n";

      if (c.evolution) {
        const bar = Math.round((result.totalFragments / c.evolution.fragmentCost) * 10);
        out += padDouble(formatMessage(msg.fragmentProgress, {
          bar: " ".repeat(bar) + " ".repeat(10 - bar),
          count: result.totalFragments,
          cost: c.evolution.fragmentCost,
        })) + "\n";
      } else {
        out += padDouble(formatMessage(msg.fragmentCount, { count: result.totalFragments })) + "\n";
      }

      if (result.evolutionReady) {
        out += padDouble(msg.evolutionReady) + "\n";
      }
      if (result.bonusItem) {
        out += padDouble(formatMessage(msg.bonusItem, {
          count: result.bonusItem.count,
          name: result.bonusItem.item.name,
        })) + "\n";
      }
      out += `+==================================+`;
      return out;
    }

    if (result.fled) {
      let out = `+==================================+\n`;
      out += padDouble(msg.fledHeader) + "\n";
      out += `+==================================+\n`;
      out += padDouble(formatMessage(msg.fledMessage, { name: c.name })) + "\n";
      out += padDouble(formatMessage(msg.itemUsed, { item: result.itemUsed.name })) + "\n";
      out += `+==================================+`;
      return out;
    }

    let out = `+==================================+\n`;
    out += padDouble(msg.escapedHeader) + "\n";
    out += `+==================================+\n`;
    out += padDouble(formatMessage(msg.escapedMessage, { name: c.name })) + "\n";
    out += padDouble(formatMessage(msg.escapedHint, { item: result.itemUsed.name })) + "\n";
    out += `+==================================+`;
    return out;
  }
```

- [ ] **Step 5: Update `renderCollection`**

Replace hardcoded strings in `renderCollection` (lines 175-213):

```ts
  renderCollection(
    collection: CollectionEntry[],
    creatures: Map<string, CreatureDefinition>
  ): string {
    const msg = MESSAGES.collection;

    if (collection.length === 0) {
      return msg.empty;
    }

    let out = `+----------------------------------+\n`;
    out += pad(formatMessage(msg.header, { count: collection.length })) + "\n";
    out += `+----------------------------------+\n\n`;

    for (const entry of collection) {
      const c = creatures.get(entry.creatureId);
      if (!c) continue;

      const evolvedLabel = entry.evolved ? ` ${msg.evolved}` : "";
      const headerContent = `${c.name}${evolvedLabel}`;
      const dashes = Math.max(0, 32 - headerContent.length - 1);
      out += `+ ${headerContent}${" ".repeat(dashes)}+\n`;

      out += pad(stars(c.rarity)) + "\n";

      const art = c.art.simple.map((line) => "  " + line).join("\n");
      out += art + "\n";

      out += pad(formatMessage(msg.caught, { count: entry.totalCaught })) + "\n";
      if (c.evolution && !entry.evolved) {
        const bar = Math.round((entry.fragments / c.evolution.fragmentCost) * 10);
        out += pad(formatMessage(msg.fragProgress, {
          bar: " ".repeat(bar) + " ".repeat(10 - bar),
          count: entry.fragments,
          cost: c.evolution.fragmentCost,
        })) + "\n";
        if (entry.fragments >= c.evolution.fragmentCost) {
          out += pad(msg.evolutionReady || "[Ready to evolve!]") + "\n";
        }
      }
      out += `+----------------------------------+\n\n`;
    }

    return out.trimEnd();
  }
```

Note: The collection section reuses `catch.evolutionReady` for the "[Ready to evolve!]" message. Add a `"evolutionReady": "[Ready to evolve!]"` to the `collection` messages in balance.json, or reference it from `MESSAGES.catch.evolutionReady`. The simplest approach: add it to the collection messages section. Update `config/balance.json` to add `"evolutionReady": "[Ready to evolve!]"` inside `messages.collection`.

- [ ] **Step 6: Update `renderInventory`**

Replace hardcoded strings in `renderInventory` (lines 216-267):

```ts
  renderInventory(
    inventory: Record<string, number>,
    items: Map<string, ItemDefinition>
  ): string {
    const msg = MESSAGES.inventory;
    const entries = Object.entries(inventory).filter(([, count]) => count > 0);

    if (entries.length === 0) {
      return msg.empty;
    }

    const captureItems: typeof entries = [];
    const catalystItems: typeof entries = [];

    for (const [itemId, count] of entries) {
      const item = items.get(itemId);
      if (!item) continue;
      if (item.type === "capture") {
        captureItems.push([itemId, count]);
      } else {
        catalystItems.push([itemId, count]);
      }
    }

    let out = `+----------------------------------+\n`;
    out += pad(msg.header) + "\n";
    out += `+----------------------------------+\n\n`;

    if (captureItems.length > 0) {
      out += `${msg.captureSection}\n`;
      for (const [itemId, count] of captureItems) {
        const item = items.get(itemId);
        if (!item) continue;
        out += `  +- ${item.name} x${count}\n`;
        out += `     ${item.description}\n`;
      }
      out += "\n";
    }

    if (catalystItems.length > 0) {
      out += `${msg.catalystSection}\n`;
      for (const [itemId, count] of catalystItems) {
        const item = items.get(itemId);
        if (!item) continue;
        out += `  +- ${item.name} x${count}\n`;
        out += `     ${item.description}\n`;
      }
      out += "\n";
    }

    return out.trimEnd();
  }
```

- [ ] **Step 7: Update `renderEvolve`**

Replace hardcoded strings in `renderEvolve` (lines 269-288):

```ts
  renderEvolve(result: EvolveResult): string {
    const msg = MESSAGES.evolve;

    if (!result.success) {
      return msg.failed;
    }

    let out = `+==================================+\n`;
    out += padDouble(msg.successHeader) + "\n";
    out += `+==================================+\n`;
    out += padDouble(formatMessage(msg.transform, { from: result.from.name, to: result.to.name })) + "\n";
    out += `+==================================+\n`;
    const art = result.to.art.simple.map((line) => "  " + line).join("\n");
    out += art + "\n";
    out += padDouble("") + "\n";
    out += padDouble(result.to.description) + "\n";
    if (result.catalystUsed) {
      out += padDouble(formatMessage(msg.catalystUsed, { catalyst: result.catalystUsed })) + "\n";
    }
    out += `+==================================+`;
    return out;
  }
```

- [ ] **Step 8: Update `renderStatus`**

Replace hardcoded strings in `renderStatus` (lines 290-314):

```ts
  renderStatus(result: StatusResult): string {
    const p = result.profile;
    const msg = MESSAGES.status;

    let out = `+----------------------------------+\n`;
    out += pad(msg.header) + "\n";
    out += `+----------------------------------+\n`;
    out += pad(formatMessage(msg.level, { level: p.level })) + "\n";

    const nextLevelXP = p.level * 100;
    const xpPercent = (p.xp / nextLevelXP) * 100;
    const xpBar = Math.round(xpPercent / 10);
    out += pad(formatMessage(msg.xp, {
      bar: "#".repeat(xpBar) + "-".repeat(10 - xpBar),
      xp: p.xp,
      nextXp: nextLevelXP,
    })) + "\n";

    out += pad(formatMessage(msg.catches, { count: p.totalCatches })) + "\n";

    const collectionPercent = (result.collectionCount / result.totalCreatures) * 100;
    const collectionBar = Math.round(collectionPercent / 10);
    out += pad(formatMessage(msg.collection, {
      bar: "*".repeat(collectionBar) + "-".repeat(10 - collectionBar),
      count: result.collectionCount,
      total: result.totalCreatures,
    })) + "\n";

    out += pad(formatMessage(msg.streak, { streak: p.currentStreak, best: p.longestStreak })) + "\n";
    out += pad(formatMessage(msg.nearby, { count: result.nearbyCount })) + "\n";
    out += pad(formatMessage(msg.ticks, { count: p.totalTicks })) + "\n";
    out += `+----------------------------------+`;
    return out;
  }
```

- [ ] **Step 9: Add `evolutionReady` to collection messages in balance.json**

Add `"evolutionReady": "[Ready to evolve!]"` to `messages.collection` in `config/balance.json`.

- [ ] **Step 10: Run all renderer tests**

Run: `npx jest tests/renderers/`
Expected: All pass.

- [ ] **Step 11: Commit**

```bash
git add src/renderers/simple-text.ts config/balance.json
git commit -m "refactor: renderer uses messages from balance.json config"
```

---

### Task 12: Update `src/engine/game-engine.ts` to use messages config

**Files:**
- Modify: `src/engine/game-engine.ts`

- [ ] **Step 1: Run existing game-engine tests to establish baseline**

Run: `npx jest tests/engine/game-engine.test.ts`
Expected: All pass.

- [ ] **Step 2: Add imports and update notification strings**

Add to imports in `src/engine/game-engine.ts`:

```ts
import { MESSAGES } from "../config/constants";
import { formatMessage } from "../config/loader";
import { ITEMS } from "../config/items";
```

Update `scan()` method — replace the hardcoded catch item list (line 109):
```ts
    const catchItems = ["bytetrap", "netsnare", "corelock"];
```
with:
```ts
    const catchItems = ITEMS.filter((i) => i.type === "capture").map((i) => i.id);
```

Replace the notification string constructions in `processTick`:

Line 41 (despawn notification) — change:
```ts
        message: `${c?.name || id} slipped away...`,
```
to:
```ts
        message: formatMessage(MESSAGES.notifications.despawn, { name: c?.name || id }),
```

Lines 50-53 (spawn notification) — change:
```ts
        message: isRare
          ? "Rare signal detected!"
          : "Something flickering nearby...",
```
to:
```ts
        message: isRare
          ? MESSAGES.notifications.rareSpawn
          : MESSAGES.notifications.normalSpawn,
```

Line 68 (milestone notification) — change:
```ts
        message: `Milestone reward! +${itemNames}`,
```
to:
```ts
        message: formatMessage(MESSAGES.notifications.milestone, { items: itemNames }),
```

Line 90 (evolution ready notification) — change:
```ts
            message: `${creature.name} has enough fragments to evolve!`,
```
to:
```ts
            message: formatMessage(MESSAGES.notifications.evolutionReady, { name: creature.name }),
```

- [ ] **Step 3: Run game-engine tests**

Run: `npx jest tests/engine/game-engine.test.ts`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add src/engine/game-engine.ts
git commit -m "refactor: game-engine uses notification messages from config"
```

---

### Task 13: Run full test suite and verify build

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npx jest`
Expected: All tests pass.

- [ ] **Step 2: Run TypeScript build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Verify balance.json is valid**

Run: `node -e "const c = require('./config/balance.json'); console.log('creatures:', c.creatures.length, 'items:', c.items.length, 'message groups:', Object.keys(c.messages).length)"`
Expected: `creatures: 30 items: 5 message groups: 7`

- [ ] **Step 4: Final commit if any fixes were needed**

If any fixes were made during verification:
```bash
git add -A
git commit -m "fix: resolve issues found during verification"
```

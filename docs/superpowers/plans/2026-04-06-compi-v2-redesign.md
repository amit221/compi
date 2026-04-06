# Compi v2 Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Compi's creature system from 6-slot/8-rarity/modifier-based to 4-slot/6-rarity/per-slot-colored with sacrifice merge, rich Unicode, and dynamic alignment.

**Architecture:** Clean rewrite of types, config, engine (spawn, catch, merge), and renderer. The layered architecture stays: config → engine (pure functions) → renderer → MCP/CLI. State shape changes (version bump to 3). No backward compatibility — fresh start.

**Tech Stack:** TypeScript, Jest/ts-jest, `string-width` (new dep), `@modelcontextprotocol/sdk`, ANSI escape codes for color.

**Spec:** `docs/superpowers/specs/2026-04-06-compi-v2-redesign.md`

**Visual Reference:** `_preview_all_screens.js`, `_preview_aligned.js`, `_preview_unicode.js` — run with `node <file>` to see colored output.

---

## File Structure

### New/Rewritten Files
- `src/types.ts` — rewrite: 4 slots, 6 rarities, new creature shape, new merge result, remove merge modifiers
- `config/traits.json` — rewrite: 4 slots × 6 tiers, named variants with Unicode art, no merge modifiers
- `config/balance.json` — update: remove old merge section, add sacrifice merge config, trim xpPerRarity to 6 tiers
- `config/names.json` — new: creature name pool for generation
- `src/config/traits.ts` — rewrite: load new trait structure, lookup by slot+rarity
- `src/config/constants.ts` — update: remove old merge constants, add sacrifice merge constants
- `src/engine/batch.ts` — rewrite: generate 4-slot creatures with names
- `src/engine/catch.ts` — update: simplify catch rate to use overall creature rarity (avg of 4 slots)
- `src/engine/merge.ts` — rewrite: sacrifice merge with weighted slot targeting and grafting
- `src/engine/energy.ts` — update: simplify energy cost for 4 slots
- `src/renderers/simple-text.ts` — rewrite: per-slot ANSI coloring, dynamic alignment with string-width, all screen layouts per visual reference
- `src/state/state-manager.ts` — update: version 3 default state, no migration (fresh start)
- `src/mcp-server.ts` — update: merge tool takes targetId + foodId instead of parentAId + parentBId
- `src/cli.ts` — update: match new merge args
- `src/index.ts` — update: exports
- `skills/merge/SKILL.md` — update: new merge semantics (target + food)

### Test Files (rewritten)
- `tests/engine/batch.test.ts`
- `tests/engine/catch-v2.test.ts`
- `tests/engine/merge.test.ts`
- `tests/engine/energy.test.ts`
- `tests/renderers/simple-text.test.ts` — new
- `tests/config/traits.test.ts`

### Deleted
- `drawille` and `jimp` dependencies (unused in v2)
- Old merge modifier types, synergy types from types.ts

---

## Task 1: Install string-width and clean dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install string-width, remove unused deps**

```bash
npm install string-width@5.1.2
npm uninstall drawille jimp
```

Note: `string-width` v5+ is ESM-only. Since this project uses CommonJS (`tsc` to `dist/`), use v5.1.2 with dynamic import or use v4.2.3 which is already in the tree via jest. Check if it works:

```bash
node -e "const sw = require('string-width'); console.log(sw('hello'), sw('⊙_⊙'), sw('☄✧☄'))"
```

If v4 works from the jest dependency, we can use that directly. If not, install v4 explicitly:

```bash
npm install string-width@4.2.3
```

- [ ] **Step 2: Verify it works**

```bash
node -e "const sw = require('string-width'); console.log(sw('★w★'), sw('( ◇ )'), sw('╱ ▓▓ ╲'), sw('☄✧☄'))"
```

Expected: prints numeric widths (3, 5, 6, 5 or similar — exact values depend on char widths).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add string-width, remove unused drawille and jimp deps"
```

---

## Task 2: Rewrite types.ts

**Files:**
- Rewrite: `src/types.ts`

- [ ] **Step 1: Write the new types file**

Replace the entire contents of `src/types.ts` with:

```typescript
// src/types.ts — Compi v2

// --- Rarity (6 tiers) ---

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

export const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

export const RARITY_STARS: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  mythic: 6,
};

// --- Slots (4) ---

export type SlotId = "eyes" | "mouth" | "body" | "tail";

export const SLOT_IDS: SlotId[] = ["eyes", "mouth", "body", "tail"];

// --- Traits ---

export interface TraitVariant {
  id: string;
  name: string;
  art: string;
}

export interface CreatureSlot {
  slotId: SlotId;
  variantId: string;
  rarity: Rarity;
}

// --- Time ---

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

// --- Game State ---

export interface Tick {
  timestamp: number;
  sessionId?: string;
  eventType?: string;
}

export interface NearbyCreature {
  id: string;
  name: string;
  slots: CreatureSlot[];
  spawnedAt: number;
}

export interface CollectionCreature {
  id: string;
  name: string;
  slots: CreatureSlot[];
  caughtAt: number;
  generation: number;
  mergedFrom?: [string, string];
}

export interface BatchState {
  attemptsRemaining: number;
  failPenalty: number;
  spawnedAt: number;
}

export interface PlayerProfile {
  level: number;
  xp: number;
  totalCatches: number;
  totalMerges: number;
  totalTicks: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
}

export interface GameSettings {
  notificationLevel: "minimal" | "moderate" | "off";
}

export interface GameState {
  version: number;
  profile: PlayerProfile;
  collection: CollectionCreature[];
  energy: number;
  lastEnergyGainAt: number;
  nearby: NearbyCreature[];
  batch: BatchState | null;
  recentTicks: Tick[];
  claimedMilestones: string[];
  settings: GameSettings;
}

// --- Engine Results ---

export interface Notification {
  message: string;
  level: "minimal" | "moderate";
}

export interface ScanEntry {
  index: number;
  creature: NearbyCreature;
  catchRate: number;
  energyCost: number;
}

export interface ScanResult {
  nearby: ScanEntry[];
  energy: number;
  batch: BatchState | null;
}

export interface CatchResult {
  success: boolean;
  creature: NearbyCreature;
  energySpent: number;
  fled: boolean;
  xpEarned: number;
  attemptsRemaining: number;
  failPenalty: number;
}

export interface SlotUpgradeChance {
  slotId: SlotId;
  currentRarity: Rarity;
  nextRarity: Rarity;
  chance: number;
}

export interface MergePreview {
  target: CollectionCreature;
  food: CollectionCreature;
  slotChances: SlotUpgradeChance[];
}

export interface MergeResult {
  success: true;
  target: CollectionCreature;
  food: CollectionCreature;
  upgradedSlot: SlotId;
  previousRarity: Rarity;
  newRarity: Rarity;
  graftedVariantName: string;
}

export interface StatusResult {
  profile: PlayerProfile;
  collectionCount: number;
  energy: number;
  nearbyCount: number;
  batchAttemptsRemaining: number;
}

export interface TickResult {
  notifications: Notification[];
  spawned: boolean;
  energyGained: number;
  despawned: string[];
}

// --- Config Types ---

export interface MilestoneCondition {
  type: "totalCatches" | "currentStreak" | "totalTicks";
  threshold: number;
}

export interface MilestoneReward {
  energy?: number;
}

export interface MilestoneConfig {
  id: string;
  description: string;
  condition: MilestoneCondition;
  reward: MilestoneReward[];
  oneTime: boolean;
}

export interface BalanceConfig {
  batch: {
    ticksPerSpawnCheck: number;
    spawnProbability: number;
    batchLingerMs: number;
    sharedAttempts: number;
    timeOfDay: Record<string, [number, number]>;
  };
  catching: {
    baseCatchRate: number;
    minCatchRate: number;
    maxCatchRate: number;
    failPenaltyPerMiss: number;
    rarityPenalty: Record<string, number>;
    xpPerRarity: Record<string, number>;
  };
  energy: {
    gainIntervalMs: number;
    maxEnergy: number;
    startingEnergy: number;
    sessionBonus: number;
    costPerRarity: Record<string, number>;
  };
  merge: {
    slotWeightBase: number;
    slotWeightPerTier: number;
  };
  progression: {
    xpPerLevel: number;
    sessionGapMs: number;
    tickPruneCount: number;
  };
  rewards: {
    milestones: MilestoneConfig[];
  };
  messages: Record<string, Record<string, string>>;
}

// --- Renderer Interface ---

export interface Renderer {
  renderScan(result: ScanResult): string;
  renderCatch(result: CatchResult): string;
  renderMergePreview(preview: MergePreview): string;
  renderMergeResult(result: MergeResult): string;
  renderCollection(collection: CollectionCreature[]): string;
  renderEnergy(energy: number, maxEnergy: number): string;
  renderStatus(result: StatusResult): string;
  renderNotification(notification: Notification): string;
}
```

Key changes from v1:
- `TraitSlotId` → `SlotId` (4 slots: eyes, mouth, body, tail)
- `CreatureTrait` → `CreatureSlot` (no merge modifiers)
- `Rarity` trimmed to 6 tiers
- Creatures now have `name: string`
- `GameSettings` drops `renderer` field (only one renderer now)
- `MergeResult` redesigned for sacrifice merge (always succeeds, shows upgraded slot)
- New `MergePreview` type for showing odds before confirming
- New `SlotUpgradeChance` type
- `Renderer` interface has `renderMergePreview` + `renderMergeResult` instead of single `renderMerge`
- `BalanceConfig.catching` now has `rarityPenalty` (per overall rarity, not per trait)
- `BalanceConfig.energy` now has `costPerRarity`
- `BalanceConfig.merge` simplified to slot weight formula

- [ ] **Step 2: Verify TypeScript compiles (expect errors in other files — that's fine)**

```bash
npx tsc --noEmit src/types.ts
```

Expected: compiles clean (types.ts has no imports).

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: rewrite types for v2 — 4 slots, 6 rarities, sacrifice merge"
```

---

## Task 3: Rewrite config files

**Files:**
- Rewrite: `config/traits.json`
- Modify: `config/balance.json`
- Create: `config/names.json`

- [ ] **Step 1: Create the creature name pool**

Create `config/names.json`:

```json
{
  "names": [
    "Sparks", "Muddle", "Blinky", "Drift", "Fang", "Glint", "Wisp",
    "Chirp", "Flux", "Torque", "Vortex", "Shade", "Prism", "Lumina",
    "Aurion", "Solark", "Pyralis", "Nub", "Pebble", "Mote", "Ember",
    "Ripple", "Thorn", "Haze", "Flicker", "Rumble", "Sprout", "Frost",
    "Glimmer", "Sable", "Crux", "Nimbus", "Quill", "Dusk", "Zephyr",
    "Cobalt", "Onyx", "Ivory", "Opal", "Thistle", "Bramble", "Cinder",
    "Lotus", "Rune", "Echo", "Wren", "Pike", "Slate", "Basalt", "Coral"
  ]
}
```

- [ ] **Step 2: Rewrite config/traits.json**

Replace the entire file. Structure: `slots` array, each slot has `id`, and `variants` grouped by rarity. Each variant has `id`, `name`, `art`. No merge modifiers.

```json
{
  "raritySpawnWeights": {
    "common": 0.30,
    "uncommon": 0.25,
    "rare": 0.20,
    "epic": 0.13,
    "legendary": 0.08,
    "mythic": 0.04
  },
  "slots": [
    {
      "id": "eyes",
      "variants": {
        "common": [
          { "id": "eye_c01", "name": "Pebble Gaze", "art": "○.○" },
          { "id": "eye_c02", "name": "Dash Sight", "art": "-.–" },
          { "id": "eye_c03", "name": "Pip Vision", "art": "·.·" },
          { "id": "eye_c04", "name": "Round Look", "art": "O.O" },
          { "id": "eye_c05", "name": "Bead Eyes", "art": "°.°" }
        ],
        "uncommon": [
          { "id": "eye_u01", "name": "Half Moon", "art": "◐.◐" },
          { "id": "eye_u02", "name": "Crescent", "art": "◑_◑" },
          { "id": "eye_u03", "name": "Owl Sight", "art": "○w○" },
          { "id": "eye_u04", "name": "Slit Gaze", "art": ">.>" }
        ],
        "rare": [
          { "id": "eye_r01", "name": "Ring Gaze", "art": "◎.◎" },
          { "id": "eye_r02", "name": "Dot Sight", "art": "●_●" },
          { "id": "eye_r03", "name": "Core Eyes", "art": "◉w◉" }
        ],
        "epic": [
          { "id": "eye_e01", "name": "Gem Gaze", "art": "◆.◆" },
          { "id": "eye_e02", "name": "Star Dust", "art": "❖_❖" },
          { "id": "eye_e03", "name": "Spark Eyes", "art": "✦w✦" }
        ],
        "legendary": [
          { "id": "eye_l01", "name": "Star Sight", "art": "★w★" },
          { "id": "eye_l02", "name": "Moon Eyes", "art": "☆_☆" }
        ],
        "mythic": [
          { "id": "eye_m01", "name": "Void Gaze", "art": "⊙_⊙" },
          { "id": "eye_m02", "name": "Prism Eyes", "art": "◈_◈" }
        ]
      }
    },
    {
      "id": "mouth",
      "variants": {
        "common": [
          { "id": "mth_c01", "name": "Flat Line", "art": " - " },
          { "id": "mth_c02", "name": "Wave", "art": " ~ " },
          { "id": "mth_c03", "name": "Smile", "art": " ◡ " },
          { "id": "mth_c04", "name": "Dot", "art": " . " },
          { "id": "mth_c05", "name": "Underline", "art": " _ " }
        ],
        "uncommon": [
          { "id": "mth_u01", "name": "Circle", "art": " ∘ " },
          { "id": "mth_u02", "name": "Ripple", "art": " ~ " },
          { "id": "mth_u03", "name": "Curve", "art": " ◡ " },
          { "id": "mth_u04", "name": "Whisker", "art": " v " }
        ],
        "rare": [
          { "id": "mth_r01", "name": "Omega", "art": " ω " },
          { "id": "mth_r02", "name": "Swirl", "art": " ∿ " },
          { "id": "mth_r03", "name": "Triangle", "art": " △ " }
        ],
        "epic": [
          { "id": "mth_e01", "name": "Prism", "art": " ∇ " },
          { "id": "mth_e02", "name": "Void", "art": " ⊗ " },
          { "id": "mth_e03", "name": "Gem", "art": " ◇ " }
        ],
        "legendary": [
          { "id": "mth_l01", "name": "Diamond", "art": " ◇ " },
          { "id": "mth_l02", "name": "Spark", "art": " ✦ " }
        ],
        "mythic": [
          { "id": "mth_m01", "name": "Core", "art": " ⊗ " },
          { "id": "mth_m02", "name": "Nova", "art": " ✦ " }
        ]
      }
    },
    {
      "id": "body",
      "variants": {
        "common": [
          { "id": "bod_c01", "name": "Dots", "art": " ░░ " },
          { "id": "bod_c02", "name": "Light", "art": " ·· " },
          { "id": "bod_c03", "name": "Plain", "art": " -- " },
          { "id": "bod_c04", "name": "Thin", "art": " :: " },
          { "id": "bod_c05", "name": "Faint", "art": " ∙∙ " }
        ],
        "uncommon": [
          { "id": "bod_u01", "name": "Shade", "art": " ▒▒ " },
          { "id": "bod_u02", "name": "Mesh", "art": " ## " },
          { "id": "bod_u03", "name": "Grain", "art": " ░▒ " },
          { "id": "bod_u04", "name": "Cross", "art": " ++ " }
        ],
        "rare": [
          { "id": "bod_r01", "name": "Crystal", "art": " ▓▓ " },
          { "id": "bod_r02", "name": "Wave", "art": " ≈≈ " },
          { "id": "bod_r03", "name": "Pulse", "art": " ∿∿ " }
        ],
        "epic": [
          { "id": "bod_e01", "name": "Shell", "art": " ◆◆ " },
          { "id": "bod_e02", "name": "Core", "art": " ⊙⊙ " },
          { "id": "bod_e03", "name": "Facet", "art": " ◈◈ " }
        ],
        "legendary": [
          { "id": "bod_l01", "name": "Hex", "art": " ⬡⬡ " },
          { "id": "bod_l02", "name": "Star", "art": " ✦✦ " }
        ],
        "mythic": [
          { "id": "bod_m01", "name": "Prism", "art": " ◈◈ " },
          { "id": "bod_m02", "name": "Void", "art": " ⊙⊙ " }
        ]
      }
    },
    {
      "id": "tail",
      "variants": {
        "common": [
          { "id": "tal_c01", "name": "Curl", "art": "~~/"},
          { "id": "tal_c02", "name": "Swish", "art": "\\~\\" },
          { "id": "tal_c03", "name": "Stub", "art": "_v_" },
          { "id": "tal_c04", "name": "Droop", "art": "___" },
          { "id": "tal_c05", "name": "Flick", "art": "~/~" }
        ],
        "uncommon": [
          { "id": "tal_u01", "name": "Zigzag", "art": "⌇⌇" },
          { "id": "tal_u02", "name": "Drift", "art": "∿∿" },
          { "id": "tal_u03", "name": "Whirl", "art": "~~⌇" },
          { "id": "tal_u04", "name": "Wag", "art": "~⌇~" }
        ],
        "rare": [
          { "id": "tal_r01", "name": "Ripple", "art": "≋≋" },
          { "id": "tal_r02", "name": "Bolt", "art": "↯↯" },
          { "id": "tal_r03", "name": "Fork", "art": "\\⌇/" }
        ],
        "epic": [
          { "id": "tal_e01", "name": "Lightning", "art": "\\⚡/" },
          { "id": "tal_e02", "name": "Infinity", "art": "\\∞/" },
          { "id": "tal_e03", "name": "Shimmer", "art": "✧✧" }
        ],
        "legendary": [
          { "id": "tal_l01", "name": "Comet", "art": "☄☄" },
          { "id": "tal_l02", "name": "Glitter", "art": "\\✧/" }
        ],
        "mythic": [
          { "id": "tal_m01", "name": "Supernova", "art": "☄✧☄" },
          { "id": "tal_m02", "name": "Eternal", "art": "\\∞/" }
        ]
      }
    }
  ]
}
```

- [ ] **Step 3: Update config/balance.json**

Replace the entire file:

```json
{
  "batch": {
    "ticksPerSpawnCheck": 10,
    "spawnProbability": 0.6,
    "batchLingerMs": 1800000,
    "sharedAttempts": 3,
    "timeOfDay": {
      "morning": [6, 12],
      "afternoon": [12, 17],
      "evening": [17, 21],
      "night": [21, 6]
    }
  },
  "catching": {
    "baseCatchRate": 0.80,
    "minCatchRate": 0.05,
    "maxCatchRate": 0.95,
    "failPenaltyPerMiss": 0.10,
    "rarityPenalty": {
      "common": 0.00,
      "uncommon": 0.05,
      "rare": 0.10,
      "epic": 0.18,
      "legendary": 0.28,
      "mythic": 0.40
    },
    "xpPerRarity": {
      "common": 10,
      "uncommon": 25,
      "rare": 50,
      "epic": 100,
      "legendary": 250,
      "mythic": 500
    }
  },
  "energy": {
    "gainIntervalMs": 1800000,
    "maxEnergy": 30,
    "startingEnergy": 5,
    "sessionBonus": 1,
    "costPerRarity": {
      "common": 1,
      "uncommon": 1,
      "rare": 2,
      "epic": 3,
      "legendary": 4,
      "mythic": 5
    }
  },
  "merge": {
    "slotWeightBase": 1.0,
    "slotWeightPerTier": 2.5
  },
  "progression": {
    "xpPerLevel": 100,
    "sessionGapMs": 900000,
    "tickPruneCount": 500
  },
  "rewards": {
    "milestones": [
      {
        "id": "first_catch",
        "description": "First catch!",
        "condition": { "type": "totalCatches", "threshold": 1 },
        "reward": [{ "energy": 3 }],
        "oneTime": true
      },
      {
        "id": "catch_10",
        "description": "10 catches!",
        "condition": { "type": "totalCatches", "threshold": 10 },
        "reward": [{ "energy": 5 }],
        "oneTime": true
      },
      {
        "id": "catch_50",
        "description": "50 catches!",
        "condition": { "type": "totalCatches", "threshold": 50 },
        "reward": [{ "energy": 10 }],
        "oneTime": true
      },
      {
        "id": "streak_3",
        "description": "3-day streak!",
        "condition": { "type": "currentStreak", "threshold": 3 },
        "reward": [{ "energy": 3 }],
        "oneTime": true
      },
      {
        "id": "streak_7",
        "description": "7-day streak!",
        "condition": { "type": "currentStreak", "threshold": 7 },
        "reward": [{ "energy": 7 }],
        "oneTime": true
      },
      {
        "id": "streak_30",
        "description": "30-day streak!",
        "condition": { "type": "currentStreak", "threshold": 30 },
        "reward": [{ "energy": 15 }],
        "oneTime": true
      }
    ]
  },
  "messages": {
    "scan": {
      "empty": "No signals detected — nothing nearby right now.",
      "header": "NEARBY SIGNALS — {count} detected",
      "energy": "Energy: {energy}/{maxEnergy}",
      "footer": "Use /catch [number] to attempt capture"
    },
    "catch": {
      "successHeader": "✦ CAUGHT! ✦",
      "captured": "{name} joined your collection!",
      "xpGained": "+{xp} XP",
      "energySpent": "-{energy} Energy",
      "fledHeader": "✦ FLED ✦",
      "fledMessage": "{name} fled into the void!",
      "escapedHeader": "✦ ESCAPED ✦",
      "escapedMessage": "{name} slipped away!",
      "escapedHint": "{attempts} attempts remaining"
    },
    "collection": {
      "empty": "Your collection is empty. Use /scan to find creatures nearby.",
      "header": "Your creatures ({count})"
    },
    "merge": {
      "previewHeader": "Merge Preview",
      "confirmHint": "/merge confirm to proceed",
      "successHeader": "✦ MERGE SUCCESS ✦",
      "upgraded": "{name} — {slot} upgraded!",
      "consumed": "{name} was consumed."
    },
    "status": {
      "header": "Player Status",
      "level": "Level {level}",
      "xp": "XP: {bar} {xp}/{nextXp}",
      "catches": "Catches: {count}",
      "merges": "Merges: {count}",
      "collection": "Collection: {count} creatures",
      "streak": "Streak: {streak} days (best: {best})",
      "nearby": "Nearby: {count} creatures",
      "ticks": "Ticks: {count}",
      "energy": "Energy: {energy}/{maxEnergy}"
    },
    "notifications": {
      "despawn": "Creatures slipped away...",
      "rareSpawn": "Rare signal detected!",
      "normalSpawn": "Something flickering nearby...",
      "milestone": "Milestone reached! +{energy} energy"
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add config/traits.json config/balance.json config/names.json
git commit -m "feat: rewrite config for v2 — 4 slots, 6 tiers, creature names, sacrifice merge"
```

---

## Task 4: Rewrite config loaders

**Files:**
- Rewrite: `src/config/traits.ts`
- Modify: `src/config/constants.ts`
- Modify: `src/config/loader.ts`

- [ ] **Step 1: Write test for new trait loader**

Create `tests/config/traits.test.ts`:

```typescript
import { loadSlots, getVariantsBySlotAndRarity, getVariantById, getSlotForVariant, getRaritySpawnWeight, _resetTraitsCache } from "../../src/config/traits";

beforeEach(() => _resetTraitsCache());

describe("trait loader v2", () => {
  test("loadSlots returns 4 slots", () => {
    const slots = loadSlots();
    expect(slots).toHaveLength(4);
    expect(slots.map(s => s.id)).toEqual(["eyes", "mouth", "body", "tail"]);
  });

  test("getVariantsBySlotAndRarity returns variants", () => {
    const commonEyes = getVariantsBySlotAndRarity("eyes", "common");
    expect(commonEyes.length).toBeGreaterThanOrEqual(3);
    expect(commonEyes[0]).toHaveProperty("id");
    expect(commonEyes[0]).toHaveProperty("name");
    expect(commonEyes[0]).toHaveProperty("art");
  });

  test("getVariantById finds a known variant", () => {
    const v = getVariantById("eye_c01");
    expect(v).toBeDefined();
    expect(v!.name).toBe("Pebble Gaze");
  });

  test("getSlotForVariant returns correct slot", () => {
    expect(getSlotForVariant("eye_c01")).toBe("eyes");
    expect(getSlotForVariant("mth_c01")).toBe("mouth");
    expect(getSlotForVariant("bod_c01")).toBe("body");
    expect(getSlotForVariant("tal_c01")).toBe("tail");
  });

  test("getRaritySpawnWeight returns weights for 6 tiers", () => {
    expect(getRaritySpawnWeight("common")).toBeGreaterThan(0);
    expect(getRaritySpawnWeight("mythic")).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/config/traits.test.ts -v
```

Expected: FAIL — old trait loader doesn't export the new functions.

- [ ] **Step 3: Rewrite src/config/traits.ts**

```typescript
import * as fs from "fs";
import * as path from "path";
import { TraitVariant, SlotId, Rarity } from "../types";

interface SlotConfig {
  id: SlotId;
  variants: Record<Rarity, TraitVariant[]>;
}

interface TraitsConfig {
  raritySpawnWeights: Record<Rarity, number>;
  slots: Array<{
    id: SlotId;
    variants: Record<string, Array<{ id: string; name: string; art: string }>>;
  }>;
}

let _config: TraitsConfig | null = null;
let _slots: SlotConfig[] = [];
let _byId: Map<string, TraitVariant> = new Map();
let _slotForVariant: Map<string, SlotId> = new Map();

function ensureLoaded(): void {
  if (_config) return;
  const configPath = path.resolve(__dirname, "../../config/traits.json");
  _config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  _slots = [];
  _byId = new Map();
  _slotForVariant = new Map();

  for (const slotRaw of _config!.slots) {
    const variants: Record<string, TraitVariant[]> = {};
    for (const [rarity, variantList] of Object.entries(slotRaw.variants)) {
      variants[rarity] = variantList.map((v) => ({
        id: v.id,
        name: v.name,
        art: v.art,
      }));
      for (const v of variantList) {
        _byId.set(v.id, { id: v.id, name: v.name, art: v.art });
        _slotForVariant.set(v.id, slotRaw.id);
      }
    }
    _slots.push({ id: slotRaw.id, variants: variants as Record<Rarity, TraitVariant[]> });
  }
}

export function loadSlots(): SlotConfig[] {
  ensureLoaded();
  return _slots;
}

export function getVariantsBySlotAndRarity(slot: SlotId, rarity: Rarity): TraitVariant[] {
  ensureLoaded();
  const slotConfig = _slots.find((s) => s.id === slot);
  return slotConfig?.variants[rarity] ?? [];
}

export function getVariantById(id: string): TraitVariant | undefined {
  ensureLoaded();
  return _byId.get(id);
}

export function getSlotForVariant(id: string): SlotId | undefined {
  ensureLoaded();
  return _slotForVariant.get(id);
}

export function getRaritySpawnWeight(rarity: Rarity): number {
  ensureLoaded();
  return _config!.raritySpawnWeights[rarity];
}

export function loadCreatureName(rng: () => number): string {
  const namesPath = path.resolve(__dirname, "../../config/names.json");
  const data = JSON.parse(fs.readFileSync(namesPath, "utf-8"));
  const names: string[] = data.names;
  return names[Math.floor(rng() * names.length)];
}

export function _resetTraitsCache(): void {
  _config = null;
  _slots = [];
  _byId = new Map();
  _slotForVariant = new Map();
}
```

- [ ] **Step 4: Update src/config/constants.ts**

Remove all old merge constants. Remove old trait-specific exports. Keep batch, catching, energy, progression, milestones, messages:

```typescript
import { loadConfig, buildMilestoneCondition } from "./loader";

const config = loadConfig();

// Batch / Spawning
export const TICKS_PER_SPAWN_CHECK = config.batch.ticksPerSpawnCheck;
export const SPAWN_PROBABILITY = config.batch.spawnProbability;
export const BATCH_LINGER_MS = config.batch.batchLingerMs;
export const SHARED_ATTEMPTS = config.batch.sharedAttempts;
export const TIME_OF_DAY_RANGES: Record<string, [number, number]> = config.batch.timeOfDay;

// Catching
export const BASE_CATCH_RATE = config.catching.baseCatchRate;
export const MIN_CATCH_RATE = config.catching.minCatchRate;
export const MAX_CATCH_RATE = config.catching.maxCatchRate;
export const FAIL_PENALTY_PER_MISS = config.catching.failPenaltyPerMiss;
export const RARITY_CATCH_PENALTY: Record<string, number> = config.catching.rarityPenalty;
export const XP_PER_RARITY: Record<string, number> = config.catching.xpPerRarity;

// Energy
export const ENERGY_GAIN_INTERVAL_MS = config.energy.gainIntervalMs;
export const MAX_ENERGY = config.energy.maxEnergy;
export const STARTING_ENERGY = config.energy.startingEnergy;
export const SESSION_BONUS_ENERGY = config.energy.sessionBonus;
export const ENERGY_COST_PER_RARITY: Record<string, number> = config.energy.costPerRarity;

// Merge
export const SLOT_WEIGHT_BASE = config.merge.slotWeightBase;
export const SLOT_WEIGHT_PER_TIER = config.merge.slotWeightPerTier;

// Progression
export const XP_PER_LEVEL = config.progression.xpPerLevel;
export const SESSION_GAP_MS = config.progression.sessionGapMs;
export const TICK_PRUNE_COUNT = config.progression.tickPruneCount;

// Milestones
export interface Milestone {
  id: string;
  description: string;
  condition: (profile: { totalCatches: number; currentStreak: number; totalTicks: number }) => boolean;
  reward: Array<{ energy?: number }>;
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

- [ ] **Step 5: Run trait tests**

```bash
npx jest tests/config/traits.test.ts -v
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/config/traits.ts src/config/constants.ts config/traits.json config/balance.json config/names.json tests/config/traits.test.ts
git commit -m "feat: rewrite config layer for v2 — new trait loader, constants, name pool"
```

---

## Task 5: Rewrite state manager

**Files:**
- Modify: `src/state/state-manager.ts`
- Modify: `tests/state/state-manager.test.ts`

- [ ] **Step 1: Write test for v3 default state**

Update `tests/state/state-manager.test.ts` — ensure it tests that a fresh load creates version 3 state with the new shape:

```typescript
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { StateManager } from "../../src/state/state-manager";

describe("StateManager v3", () => {
  const tmpDir = path.join(os.tmpdir(), "compi-test-" + Date.now());
  const statePath = path.join(tmpDir, "state.json");

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("creates default v3 state when no file exists", () => {
    const sm = new StateManager(statePath);
    const state = sm.load();

    expect(state.version).toBe(3);
    expect(state.profile.level).toBe(1);
    expect(state.collection).toEqual([]);
    expect(state.nearby).toEqual([]);
    expect(state.settings).toEqual({ notificationLevel: "moderate" });
  });

  test("saves and loads state", () => {
    const sm = new StateManager(statePath);
    const state = sm.load();
    state.profile.totalCatches = 5;
    sm.save(state);

    const loaded = sm.load();
    expect(loaded.profile.totalCatches).toBe(5);
    expect(loaded.version).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/state/state-manager.test.ts -v
```

Expected: FAIL — still creates version 2 state.

- [ ] **Step 3: Update state-manager.ts**

Change `defaultState()` to version 3, remove `renderer` from settings, remove `migrateState` (no backward compat):

```typescript
import * as fs from "fs";
import * as path from "path";
import { GameState } from "../types";
import { logger } from "../logger";

function defaultState(): GameState {
  const today = new Date().toISOString().split("T")[0];
  return {
    version: 3,
    profile: {
      level: 1,
      xp: 0,
      totalCatches: 0,
      totalMerges: 0,
      totalTicks: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: today,
    },
    collection: [],
    energy: 5,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    recentTicks: [],
    claimedMilestones: [],
    settings: {
      notificationLevel: "moderate",
    },
  };
}

export class StateManager {
  constructor(private filePath: string) {}

  load(): GameState {
    try {
      const data = fs.readFileSync(this.filePath, "utf-8");
      const raw = JSON.parse(data) as Record<string, unknown>;
      if ((raw.version as number) !== 3) {
        logger.info("Incompatible state version, creating fresh state", { path: this.filePath });
        return defaultState();
      }
      return raw as unknown as GameState;
    } catch (err: unknown) {
      const errObj = err as Record<string, unknown>;
      const isNotFound = errObj && errObj.code === "ENOENT";
      if (isNotFound) {
        logger.info("No state file found, creating default state", { path: this.filePath });
      } else {
        logger.error("Failed to load state, resetting to default", {
          path: this.filePath,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      return defaultState();
    }
  }

  save(state: GameState): void {
    try {
      const dir = path.dirname(this.filePath);
      fs.mkdirSync(dir, { recursive: true });
      const tmp = this.filePath + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
      try {
        fs.renameSync(tmp, this.filePath);
      } catch {
        fs.writeFileSync(this.filePath, JSON.stringify(state, null, 2), "utf-8");
        try { fs.unlinkSync(tmp); } catch { /* ignore */ }
      }
    } catch (err: unknown) {
      logger.error("Failed to save state", {
        path: this.filePath,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest tests/state/state-manager.test.ts -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/state-manager.ts tests/state/state-manager.test.ts
git commit -m "feat: state manager v3 — fresh start, no migration"
```

---

## Task 6: Rewrite engine — batch (spawn) and energy

**Files:**
- Rewrite: `src/engine/batch.ts`
- Update: `src/engine/energy.ts`
- Rewrite: `tests/engine/batch.test.ts`
- Update: `tests/engine/energy.test.ts`

- [ ] **Step 1: Write batch spawn test**

```typescript
import { generateCreatureSlots, spawnBatch, cleanupBatch } from "../../src/engine/batch";
import { GameState, SLOT_IDS, RARITY_ORDER } from "../../src/types";
import { _resetTraitsCache } from "../../src/config/traits";

function makeState(): GameState {
  return {
    version: 3,
    profile: { level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-04-06" },
    collection: [],
    energy: 10,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
  };
}

beforeEach(() => _resetTraitsCache());

describe("batch v2", () => {
  test("generateCreatureSlots returns 4 slots", () => {
    let i = 0;
    const rng = () => [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1][i++] ?? 0.1;
    const slots = generateCreatureSlots(rng);
    expect(slots).toHaveLength(4);
    expect(slots.map(s => s.slotId)).toEqual(SLOT_IDS);
    for (const slot of slots) {
      expect(RARITY_ORDER).toContain(slot.rarity);
      expect(slot.variantId).toBeTruthy();
    }
  });

  test("spawnBatch creates creatures with names", () => {
    const state = makeState();
    let i = 0;
    const rng = () => [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1][i++] ?? 0.1;
    const spawned = spawnBatch(state, Date.now(), rng);
    expect(spawned.length).toBeGreaterThanOrEqual(2);
    for (const c of spawned) {
      expect(c.name).toBeTruthy();
      expect(c.slots).toHaveLength(4);
    }
    expect(state.batch).not.toBeNull();
    expect(state.nearby.length).toBe(spawned.length);
  });

  test("cleanupBatch removes expired batch", () => {
    const state = makeState();
    state.batch = { attemptsRemaining: 3, failPenalty: 0, spawnedAt: Date.now() - 31 * 60 * 1000 };
    state.nearby = [{ id: "x", name: "Test", slots: [], spawnedAt: 0 }];
    const despawned = cleanupBatch(state, Date.now());
    expect(despawned).toEqual(["x"]);
    expect(state.nearby).toEqual([]);
    expect(state.batch).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/engine/batch.test.ts -v
```

Expected: FAIL.

- [ ] **Step 3: Rewrite src/engine/batch.ts**

```typescript
import { GameState, NearbyCreature, CreatureSlot, SlotId, Rarity, SLOT_IDS, RARITY_ORDER } from "../types";
import { getVariantsBySlotAndRarity, getRaritySpawnWeight, loadCreatureName } from "../config/traits";

export const BATCH_LINGER_MS = 30 * 60 * 1000;
export const SHARED_ATTEMPTS = 3;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function pickRarity(rng: () => number): Rarity {
  let cumulative = 0;
  const roll = rng();
  for (const rarity of RARITY_ORDER) {
    cumulative += getRaritySpawnWeight(rarity);
    if (roll < cumulative) {
      return rarity;
    }
  }
  return RARITY_ORDER[RARITY_ORDER.length - 1];
}

function pickBatchSize(rng: () => number): number {
  const roll = rng();
  if (roll < 0.4) return 2;
  if (roll < 0.8) return 3;
  return 4;
}

export function generateCreatureSlots(rng: () => number): CreatureSlot[] {
  const slots: CreatureSlot[] = [];
  for (const slotId of SLOT_IDS) {
    const rarity = pickRarity(rng);
    const variants = getVariantsBySlotAndRarity(slotId, rarity);
    if (variants.length === 0) {
      const fallback = getVariantsBySlotAndRarity(slotId, "common");
      slots.push({ slotId, variantId: fallback[0]?.id ?? `${slotId}_fallback`, rarity: "common" });
    } else {
      const picked = variants[Math.floor(rng() * variants.length)];
      slots.push({ slotId, variantId: picked.id, rarity });
    }
  }
  return slots;
}

export function spawnBatch(state: GameState, now: number, rng: () => number): NearbyCreature[] {
  if (state.batch !== null && state.batch.attemptsRemaining > 0) {
    return [];
  }

  const batchSize = pickBatchSize(rng);
  const spawned: NearbyCreature[] = [];

  for (let i = 0; i < batchSize; i++) {
    const creature: NearbyCreature = {
      id: generateId(),
      name: loadCreatureName(rng),
      slots: generateCreatureSlots(rng),
      spawnedAt: now,
    };
    spawned.push(creature);
  }

  state.nearby = spawned;
  state.batch = {
    attemptsRemaining: SHARED_ATTEMPTS,
    failPenalty: 0,
    spawnedAt: now,
  };

  return spawned;
}

export function cleanupBatch(state: GameState, now: number): string[] {
  if (state.batch === null) return [];

  const elapsed = now - state.batch.spawnedAt;
  const timedOut = elapsed > BATCH_LINGER_MS;
  const noAttemptsLeft = state.batch.attemptsRemaining === 0;

  if (timedOut || noAttemptsLeft) {
    const despawnedIds = state.nearby.map((c) => c.id);
    state.nearby = [];
    state.batch = null;
    return despawnedIds;
  }

  return [];
}
```

- [ ] **Step 4: Update src/engine/energy.ts**

Simplify energy cost to use overall creature rarity (average of 4 slot rarities):

```typescript
import { GameState, CreatureSlot, Rarity, RARITY_ORDER } from "../types";
import { ENERGY_COST_PER_RARITY } from "../config/constants";

const ENERGY_GAIN_INTERVAL_MS = 30 * 60 * 1000;
const MAX_ENERGY = 30;

function averageRarity(slots: CreatureSlot[]): Rarity {
  if (slots.length === 0) return "common";
  const avg = slots.reduce((sum, s) => sum + RARITY_ORDER.indexOf(s.rarity), 0) / slots.length;
  return RARITY_ORDER[Math.round(avg)];
}

export function calculateEnergyCost(slots: CreatureSlot[]): number {
  const rarity = averageRarity(slots);
  return ENERGY_COST_PER_RARITY[rarity] ?? 1;
}

export function processEnergyGain(state: GameState, now: number): number {
  const elapsed = now - state.lastEnergyGainAt;
  const intervals = Math.floor(elapsed / ENERGY_GAIN_INTERVAL_MS);
  if (intervals <= 0) return 0;
  const maxGain = MAX_ENERGY - state.energy;
  const gained = Math.min(intervals, maxGain);
  state.energy += gained;
  state.lastEnergyGainAt += intervals * ENERGY_GAIN_INTERVAL_MS;
  return gained;
}

export function spendEnergy(state: GameState, amount: number): void {
  if (state.energy < amount) {
    throw new Error(`Not enough energy: have ${state.energy}, need ${amount}`);
  }
  state.energy -= amount;
}

export function canAfford(currentEnergy: number, cost: number): boolean {
  return currentEnergy >= cost;
}

export { MAX_ENERGY, ENERGY_GAIN_INTERVAL_MS };
```

- [ ] **Step 5: Update energy test**

Rewrite `tests/engine/energy.test.ts` to use `CreatureSlot[]` instead of `CreatureTrait[]`:

```typescript
import { calculateEnergyCost, processEnergyGain, spendEnergy } from "../../src/engine/energy";
import { GameState, CreatureSlot } from "../../src/types";

function makeSlots(rarity: string): CreatureSlot[] {
  return [
    { slotId: "eyes", variantId: "eye_c01", rarity: rarity as any },
    { slotId: "mouth", variantId: "mth_c01", rarity: rarity as any },
    { slotId: "body", variantId: "bod_c01", rarity: rarity as any },
    { slotId: "tail", variantId: "tal_c01", rarity: rarity as any },
  ];
}

describe("energy v2", () => {
  test("common creature costs 1 energy", () => {
    expect(calculateEnergyCost(makeSlots("common"))).toBe(1);
  });

  test("epic creature costs 3 energy", () => {
    expect(calculateEnergyCost(makeSlots("epic"))).toBe(3);
  });

  test("mythic creature costs 5 energy", () => {
    expect(calculateEnergyCost(makeSlots("mythic"))).toBe(5);
  });

  test("spendEnergy reduces state.energy", () => {
    const state = { energy: 10 } as GameState;
    spendEnergy(state, 3);
    expect(state.energy).toBe(7);
  });

  test("spendEnergy throws when insufficient", () => {
    const state = { energy: 1 } as GameState;
    expect(() => spendEnergy(state, 5)).toThrow("Not enough energy");
  });
});
```

- [ ] **Step 6: Run all tests in this task**

```bash
npx jest tests/engine/batch.test.ts tests/engine/energy.test.ts -v
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/engine/batch.ts src/engine/energy.ts tests/engine/batch.test.ts tests/engine/energy.test.ts
git commit -m "feat: rewrite batch spawn (4 slots, names) and simplify energy cost"
```

---

## Task 7: Rewrite engine — catch

**Files:**
- Rewrite: `src/engine/catch.ts`
- Rewrite: `tests/engine/catch-v2.test.ts`

- [ ] **Step 1: Write catch test**

```typescript
import { calculateCatchRate, calculateXpEarned, attemptCatch } from "../../src/engine/catch";
import { GameState, CreatureSlot } from "../../src/types";

function makeSlots(rarity: string): CreatureSlot[] {
  return [
    { slotId: "eyes", variantId: "eye_c01", rarity: rarity as any },
    { slotId: "mouth", variantId: "mth_c01", rarity: rarity as any },
    { slotId: "body", variantId: "bod_c01", rarity: rarity as any },
    { slotId: "tail", variantId: "tal_c01", rarity: rarity as any },
  ];
}

function makeState(): GameState {
  return {
    version: 3,
    profile: { level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-04-06" },
    collection: [],
    energy: 20,
    lastEnergyGainAt: Date.now(),
    nearby: [
      { id: "c1", name: "Sparks", slots: makeSlots("common"), spawnedAt: Date.now() },
      { id: "c2", name: "Lumina", slots: makeSlots("epic"), spawnedAt: Date.now() },
    ],
    batch: { attemptsRemaining: 3, failPenalty: 0, spawnedAt: Date.now() },
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
  };
}

describe("catch v2", () => {
  test("common creature has high catch rate", () => {
    const rate = calculateCatchRate(makeSlots("common"), 0);
    expect(rate).toBeGreaterThanOrEqual(0.75);
  });

  test("mythic creature has low catch rate", () => {
    const rate = calculateCatchRate(makeSlots("mythic"), 0);
    expect(rate).toBeLessThanOrEqual(0.45);
  });

  test("fail penalty reduces catch rate", () => {
    const base = calculateCatchRate(makeSlots("common"), 0);
    const penalized = calculateCatchRate(makeSlots("common"), 0.2);
    expect(penalized).toBeLessThan(base);
  });

  test("successful catch adds to collection", () => {
    const state = makeState();
    const result = attemptCatch(state, 0, () => 0.01); // low roll = success
    expect(result.success).toBe(true);
    expect(state.collection).toHaveLength(1);
    expect(state.collection[0].name).toBe("Sparks");
    expect(result.xpEarned).toBeGreaterThan(0);
  });

  test("failed catch keeps creature, increments penalty", () => {
    const state = makeState();
    const result = attemptCatch(state, 0, () => 0.99); // high roll = fail
    expect(result.success).toBe(false);
    expect(state.nearby).toHaveLength(2);
    expect(state.batch!.failPenalty).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/engine/catch-v2.test.ts -v
```

Expected: FAIL.

- [ ] **Step 3: Rewrite src/engine/catch.ts**

```typescript
import { GameState, CatchResult, CollectionCreature, CreatureSlot, Rarity, RARITY_ORDER } from "../types";
import { RARITY_CATCH_PENALTY, BASE_CATCH_RATE, MIN_CATCH_RATE, MAX_CATCH_RATE, FAIL_PENALTY_PER_MISS, XP_PER_RARITY } from "../config/constants";
import { calculateEnergyCost, spendEnergy } from "./energy";

function averageRarity(slots: CreatureSlot[]): Rarity {
  if (slots.length === 0) return "common";
  const avg = slots.reduce((sum, s) => sum + RARITY_ORDER.indexOf(s.rarity), 0) / slots.length;
  return RARITY_ORDER[Math.round(avg)];
}

export function calculateCatchRate(slots: CreatureSlot[], failPenalty: number): number {
  const rarity = averageRarity(slots);
  const penalty = RARITY_CATCH_PENALTY[rarity] ?? 0;
  const rate = BASE_CATCH_RATE - penalty - failPenalty;
  return Math.max(MIN_CATCH_RATE, Math.min(MAX_CATCH_RATE, rate));
}

export function calculateXpEarned(slots: CreatureSlot[]): number {
  const rarity = averageRarity(slots);
  return XP_PER_RARITY[rarity] ?? 10;
}

export function attemptCatch(
  state: GameState,
  nearbyIndex: number,
  rng: () => number = Math.random
): CatchResult {
  if (!state.batch) throw new Error("No active batch");
  if (state.batch.attemptsRemaining <= 0) throw new Error("No attempts remaining");
  if (nearbyIndex < 0 || nearbyIndex >= state.nearby.length) throw new Error("Invalid creature index");

  const nearby = state.nearby[nearbyIndex];
  const energyCost = calculateEnergyCost(nearby.slots);

  if (state.energy < energyCost) {
    throw new Error(`Not enough energy: have ${state.energy}, need ${energyCost}`);
  }

  spendEnergy(state, energyCost);
  state.batch.attemptsRemaining--;

  const catchRate = calculateCatchRate(nearby.slots, state.batch.failPenalty);
  const roll = rng();
  const success = roll < catchRate;

  let xpEarned = 0;

  if (success) {
    state.nearby.splice(nearbyIndex, 1);
    xpEarned = calculateXpEarned(nearby.slots);

    const collectionCreature: CollectionCreature = {
      id: nearby.id,
      name: nearby.name,
      slots: nearby.slots,
      caughtAt: Date.now(),
      generation: 0,
    };
    state.collection.push(collectionCreature);
    state.profile.xp += xpEarned;
    state.profile.totalCatches++;
  } else {
    state.batch.failPenalty += FAIL_PENALTY_PER_MISS;
  }

  return {
    success,
    creature: nearby,
    energySpent: energyCost,
    fled: false,
    xpEarned,
    attemptsRemaining: state.batch.attemptsRemaining,
    failPenalty: state.batch.failPenalty,
  };
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest tests/engine/catch-v2.test.ts -v
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/catch.ts tests/engine/catch-v2.test.ts
git commit -m "feat: rewrite catch for v2 — simplified rarity-based catch rate"
```

---

## Task 8: Rewrite engine — sacrifice merge

**Files:**
- Rewrite: `src/engine/merge.ts`
- Rewrite: `tests/engine/merge.test.ts`

- [ ] **Step 1: Write merge test**

```typescript
import { calculateSlotChances, executeMerge, previewMerge } from "../../src/engine/merge";
import { GameState, CollectionCreature, CreatureSlot, RARITY_ORDER } from "../../src/types";
import { _resetTraitsCache } from "../../src/config/traits";

function makeSlots(rarities: string[]): CreatureSlot[] {
  return [
    { slotId: "eyes", variantId: "eye_c01", rarity: rarities[0] as any },
    { slotId: "mouth", variantId: "mth_c01", rarity: rarities[1] as any },
    { slotId: "body", variantId: "bod_c01", rarity: rarities[2] as any },
    { slotId: "tail", variantId: "tal_c01", rarity: rarities[3] as any },
  ];
}

function makeCreature(id: string, name: string, rarities: string[]): CollectionCreature {
  return { id, name, slots: makeSlots(rarities), caughtAt: Date.now(), generation: 0 };
}

function makeState(creatures: CollectionCreature[]): GameState {
  return {
    version: 3,
    profile: { level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-04-06" },
    collection: creatures,
    energy: 20,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
  };
}

beforeEach(() => _resetTraitsCache());

describe("sacrifice merge v2", () => {
  test("calculateSlotChances weights rarer slots higher", () => {
    const target = makeCreature("t", "Target", ["legendary", "common", "rare", "epic"]);
    const chances = calculateSlotChances(target);
    const eyeChance = chances.find(c => c.slotId === "eyes")!.chance;
    const mouthChance = chances.find(c => c.slotId === "mouth")!.chance;
    expect(eyeChance).toBeGreaterThan(mouthChance);
  });

  test("mythic slots still get a chance (push beyond max is clamped)", () => {
    const target = makeCreature("t", "Target", ["mythic", "mythic", "mythic", "common"]);
    const chances = calculateSlotChances(target);
    // Mythic slots can't upgrade further — they should still appear but nextRarity = mythic
    const mythicSlot = chances.find(c => c.slotId === "eyes")!;
    expect(mythicSlot.currentRarity).toBe("mythic");
    expect(mythicSlot.nextRarity).toBe("mythic");
  });

  test("previewMerge returns target, food, and chances", () => {
    const target = makeCreature("t", "Target", ["rare", "common", "common", "common"]);
    const food = makeCreature("f", "Food", ["common", "common", "common", "common"]);
    const state = makeState([target, food]);
    const preview = previewMerge(state, "t", "f");
    expect(preview.target.id).toBe("t");
    expect(preview.food.id).toBe("f");
    expect(preview.slotChances).toHaveLength(4);
  });

  test("executeMerge upgrades one slot and removes food", () => {
    const target = makeCreature("t", "Target", ["common", "common", "common", "common"]);
    const food = makeCreature("f", "Food", ["common", "common", "common", "common"]);
    const state = makeState([target, food]);

    const result = executeMerge(state, "t", "f", () => 0.01);
    expect(result.success).toBe(true);
    expect(RARITY_ORDER.indexOf(result.newRarity)).toBeGreaterThan(RARITY_ORDER.indexOf(result.previousRarity));
    expect(state.collection).toHaveLength(1);
    expect(state.collection[0].id).toBe("t");
    expect(state.profile.totalMerges).toBe(1);
  });

  test("executeMerge throws if target equals food", () => {
    const c = makeCreature("t", "Target", ["common", "common", "common", "common"]);
    const state = makeState([c]);
    expect(() => executeMerge(state, "t", "t", Math.random)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/engine/merge.test.ts -v
```

Expected: FAIL.

- [ ] **Step 3: Rewrite src/engine/merge.ts**

```typescript
import { GameState, CollectionCreature, MergePreview, MergeResult, SlotUpgradeChance, SlotId, Rarity, RARITY_ORDER, SLOT_IDS } from "../types";
import { SLOT_WEIGHT_BASE, SLOT_WEIGHT_PER_TIER } from "../config/constants";
import { getVariantsBySlotAndRarity, getVariantById } from "../config/traits";

function rarityIndex(rarity: Rarity): number {
  return RARITY_ORDER.indexOf(rarity);
}

function nextRarity(rarity: Rarity): Rarity {
  const idx = rarityIndex(rarity);
  const next = Math.min(idx + 1, RARITY_ORDER.length - 1);
  return RARITY_ORDER[next];
}

export function calculateSlotChances(target: CollectionCreature): SlotUpgradeChance[] {
  const chances: SlotUpgradeChance[] = [];

  for (const slot of target.slots) {
    const tierIdx = rarityIndex(slot.rarity);
    const weight = SLOT_WEIGHT_BASE + tierIdx * SLOT_WEIGHT_PER_TIER;
    chances.push({
      slotId: slot.slotId,
      currentRarity: slot.rarity,
      nextRarity: nextRarity(slot.rarity),
      chance: weight,
    });
  }

  // Normalize to percentages
  const total = chances.reduce((sum, c) => sum + c.chance, 0);
  for (const c of chances) {
    c.chance = c.chance / total;
  }

  // Sort by chance descending (rarest first)
  chances.sort((a, b) => b.chance - a.chance);

  return chances;
}

export function previewMerge(state: GameState, targetId: string, foodId: string): MergePreview {
  if (targetId === foodId) throw new Error("Cannot merge a creature with itself.");

  const target = state.collection.find((c) => c.id === targetId);
  const food = state.collection.find((c) => c.id === foodId);
  if (!target) throw new Error(`Creature not found: ${targetId}`);
  if (!food) throw new Error(`Creature not found: ${foodId}`);

  return {
    target,
    food,
    slotChances: calculateSlotChances(target),
  };
}

export function executeMerge(
  state: GameState,
  targetId: string,
  foodId: string,
  rng: () => number
): MergeResult {
  if (targetId === foodId) throw new Error("Cannot merge a creature with itself.");

  const target = state.collection.find((c) => c.id === targetId);
  const food = state.collection.find((c) => c.id === foodId);
  if (!target) throw new Error(`Creature not found: ${targetId}`);
  if (!food) throw new Error(`Creature not found: ${foodId}`);

  const chances = calculateSlotChances(target);

  // Weighted random slot selection
  const roll = rng();
  let cumulative = 0;
  let selectedSlotId: SlotId = chances[0].slotId;
  for (const c of chances) {
    cumulative += c.chance;
    if (roll < cumulative) {
      selectedSlotId = c.slotId;
      break;
    }
  }

  // Find the slot on target and upgrade it
  const targetSlot = target.slots.find((s) => s.slotId === selectedSlotId)!;
  const previousRarity = targetSlot.rarity;
  const newRarity = nextRarity(previousRarity);

  // Graft: use food's variant appearance for this slot, but at new rarity
  // If food has a variant for this slot, use its art name at the new tier
  // Otherwise pick a random variant at the new tier
  const foodSlot = food.slots.find((s) => s.slotId === selectedSlotId);
  let graftedVariantId: string;
  let graftedVariantName: string;

  // Try to find a variant at the new rarity for this slot
  const newTierVariants = getVariantsBySlotAndRarity(selectedSlotId, newRarity);
  if (foodSlot && newTierVariants.length > 0) {
    // Pick a random variant from the new tier (grafting look inspiration from food)
    const picked = newTierVariants[Math.floor(rng() * newTierVariants.length)];
    graftedVariantId = picked.id;
    graftedVariantName = picked.name;
  } else if (newTierVariants.length > 0) {
    const picked = newTierVariants[Math.floor(rng() * newTierVariants.length)];
    graftedVariantId = picked.id;
    graftedVariantName = picked.name;
  } else {
    // Fallback — keep current variant
    graftedVariantId = targetSlot.variantId;
    graftedVariantName = getVariantById(targetSlot.variantId)?.name ?? "Unknown";
  }

  // Apply upgrade
  targetSlot.rarity = newRarity;
  targetSlot.variantId = graftedVariantId;

  // Update generation
  target.generation = Math.max(target.generation, food.generation) + 1;
  target.mergedFrom = [targetId, foodId];

  // Remove food from collection
  state.collection = state.collection.filter((c) => c.id !== foodId);
  state.profile.totalMerges++;

  return {
    success: true,
    target,
    food,
    upgradedSlot: selectedSlotId,
    previousRarity,
    newRarity,
    graftedVariantName,
  };
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest tests/engine/merge.test.ts -v
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/merge.ts tests/engine/merge.test.ts
git commit -m "feat: rewrite merge — sacrifice merge with weighted slot targeting and grafting"
```

---

## Task 9: Update game engine

**Files:**
- Modify: `src/engine/game-engine.ts`

- [ ] **Step 1: Update GameEngine to use new types and merge API**

```typescript
import { GameState, Tick, TickResult, ScanResult, ScanEntry, CatchResult, MergePreview, MergeResult, StatusResult, Notification } from "../types";
import { processNewTick } from "./ticks";
import { spawnBatch, cleanupBatch } from "./batch";
import { attemptCatch, calculateCatchRate } from "./catch";
import { calculateEnergyCost, processEnergyGain } from "./energy";
import { previewMerge, executeMerge } from "./merge";
import { TICKS_PER_SPAWN_CHECK, SPAWN_PROBABILITY } from "../config/constants";

export class GameEngine {
  private state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  processTick(tick: Tick, rng: () => number = Math.random): TickResult {
    const notifications: Notification[] = [];

    processNewTick(this.state, tick);

    const energyGained = processEnergyGain(this.state, tick.timestamp);

    const despawned = cleanupBatch(this.state, tick.timestamp);

    let spawned = false;
    if (!this.state.batch && this.state.profile.totalTicks % TICKS_PER_SPAWN_CHECK === 0) {
      if (rng() < SPAWN_PROBABILITY) {
        const creatures = spawnBatch(this.state, tick.timestamp, rng);
        if (creatures.length > 0) {
          spawned = true;
          notifications.push({ message: `${creatures.length} creatures appeared nearby!`, level: "moderate" });
        }
      }
    }

    return { notifications, spawned, energyGained, despawned };
  }

  scan(): ScanResult {
    const nearby: ScanEntry[] = this.state.nearby.map((creature, index) => ({
      index,
      creature,
      catchRate: calculateCatchRate(creature.slots, this.state.batch?.failPenalty ?? 0),
      energyCost: calculateEnergyCost(creature.slots),
    }));
    return { nearby, energy: this.state.energy, batch: this.state.batch };
  }

  catch(nearbyIndex: number, rng: () => number = Math.random): CatchResult {
    return attemptCatch(this.state, nearbyIndex, rng);
  }

  mergePreview(targetId: string, foodId: string): MergePreview {
    return previewMerge(this.state, targetId, foodId);
  }

  mergeExecute(targetId: string, foodId: string, rng: () => number = Math.random): MergeResult {
    return executeMerge(this.state, targetId, foodId, rng);
  }

  status(): StatusResult {
    return {
      profile: this.state.profile,
      collectionCount: this.state.collection.length,
      energy: this.state.energy,
      nearbyCount: this.state.nearby.length,
      batchAttemptsRemaining: this.state.batch?.attemptsRemaining ?? 0,
    };
  }

  getState(): GameState {
    return this.state;
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit src/engine/game-engine.ts
```

Expected: compiles (may still have errors in renderer/mcp — those come next).

- [ ] **Step 3: Commit**

```bash
git add src/engine/game-engine.ts
git commit -m "feat: update game engine — new merge API (preview + execute)"
```

---

## Task 10: Rewrite renderer with ANSI colors and dynamic alignment

**Files:**
- Rewrite: `src/renderers/simple-text.ts`
- Delete: `src/renderers/renderer.ts` (interface is in types.ts)

- [ ] **Step 1: Write renderer test**

Create `tests/renderers/simple-text.test.ts`:

```typescript
import { SimpleTextRenderer } from "../../src/renderers/simple-text";
import { ScanResult, CatchResult, MergePreview, MergeResult, StatusResult, CollectionCreature, CreatureSlot } from "../../src/types";

function makeSlots(rarity: string): CreatureSlot[] {
  return [
    { slotId: "eyes", variantId: "eye_c01", rarity: rarity as any },
    { slotId: "mouth", variantId: "mth_c01", rarity: rarity as any },
    { slotId: "body", variantId: "bod_c01", rarity: rarity as any },
    { slotId: "tail", variantId: "tal_c01", rarity: rarity as any },
  ];
}

describe("SimpleTextRenderer v2", () => {
  const renderer = new SimpleTextRenderer();

  test("renderScan produces colored output", () => {
    const result: ScanResult = {
      nearby: [{
        index: 0,
        creature: { id: "c1", name: "Sparks", slots: makeSlots("rare"), spawnedAt: Date.now() },
        catchRate: 0.65,
        energyCost: 2,
      }],
      energy: 8,
      batch: { attemptsRemaining: 3, failPenalty: 0, spawnedAt: Date.now() },
    };
    const output = renderer.renderScan(result);
    expect(output).toContain("Sparks");
    expect(output).toContain("\x1b["); // has ANSI codes
    expect(output).toContain("65%");
    expect(output).toContain("2E");
  });

  test("renderCatch success shows caught message", () => {
    const result: CatchResult = {
      success: true,
      creature: { id: "c1", name: "Sparks", slots: makeSlots("rare"), spawnedAt: Date.now() },
      energySpent: 2,
      fled: false,
      xpEarned: 50,
      attemptsRemaining: 2,
      failPenalty: 0,
    };
    const output = renderer.renderCatch(result);
    expect(output).toContain("CAUGHT");
    expect(output).toContain("Sparks");
  });

  test("renderCollection shows creatures with variant names", () => {
    const collection: CollectionCreature[] = [{
      id: "c1",
      name: "Sparks",
      slots: makeSlots("rare"),
      caughtAt: Date.now(),
      generation: 0,
    }];
    const output = renderer.renderCollection(collection);
    expect(output).toContain("Sparks");
    expect(output).toContain("\x1b["); // colored
  });

  test("renderMergePreview shows slot chances", () => {
    const preview: MergePreview = {
      target: { id: "t", name: "Target", slots: makeSlots("rare"), caughtAt: Date.now(), generation: 0 },
      food: { id: "f", name: "Food", slots: makeSlots("common"), caughtAt: Date.now(), generation: 0 },
      slotChances: [
        { slotId: "eyes", currentRarity: "rare", nextRarity: "epic", chance: 0.4 },
        { slotId: "mouth", currentRarity: "rare", nextRarity: "epic", chance: 0.3 },
        { slotId: "body", currentRarity: "rare", nextRarity: "epic", chance: 0.2 },
        { slotId: "tail", currentRarity: "rare", nextRarity: "epic", chance: 0.1 },
      ],
    };
    const output = renderer.renderMergePreview(preview);
    expect(output).toContain("Target");
    expect(output).toContain("Food");
    expect(output).toContain("eyes");
    expect(output).toContain("→");
  });

  test("renderMergeResult shows upgrade", () => {
    const result: MergeResult = {
      success: true,
      target: { id: "t", name: "Target", slots: makeSlots("epic"), caughtAt: Date.now(), generation: 1 },
      food: { id: "f", name: "Food", slots: makeSlots("common"), caughtAt: Date.now(), generation: 0 },
      upgradedSlot: "eyes",
      previousRarity: "rare",
      newRarity: "epic",
      graftedVariantName: "Gem Gaze",
    };
    const output = renderer.renderMergeResult(result);
    expect(output).toContain("MERGE SUCCESS");
    expect(output).toContain("eyes");
    expect(output).toContain("Gem Gaze");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest tests/renderers/simple-text.test.ts -v
```

Expected: FAIL.

- [ ] **Step 3: Rewrite src/renderers/simple-text.ts**

This is the largest file. See `_preview_all_screens.js` for the target output. Key implementation details:

```typescript
import stringWidth from "string-width";
import {
  Renderer, ScanResult, CatchResult, MergePreview, MergeResult, StatusResult,
  Notification, CollectionCreature, CreatureSlot, Rarity, SlotId,
} from "../types";
import { MAX_ENERGY } from "../engine/energy";
import { MESSAGES } from "../config/constants";
import { formatMessage } from "../config/loader";
import { getVariantById } from "../config/traits";

// --- ANSI color codes ---
const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  gray: "\x1b[90m",
  white: "\x1b[97m",
  cyan: "\x1b[36m",
  purple: "\x1b[35m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  green: "\x1b[32m",
};

const RARITY_COLOR: Record<Rarity, string> = {
  common: ANSI.gray,
  uncommon: ANSI.white,
  rare: ANSI.cyan,
  epic: ANSI.purple,
  legendary: ANSI.yellow,
  mythic: ANSI.red,
};

const CREATURE_WIDTH = 13;

function col(text: string, rarity: Rarity): string {
  return `${RARITY_COLOR[rarity]}${text}${ANSI.reset}`;
}

function centerLine(raw: string, colored: string): string {
  const w = stringWidth(raw);
  const left = Math.floor((CREATURE_WIDTH - w) / 2);
  return " ".repeat(Math.max(0, left)) + colored;
}

function getArt(slot: CreatureSlot): string {
  const variant = getVariantById(slot.variantId);
  return variant?.art ?? "???";
}

function renderCreatureArt(slots: CreatureSlot[]): string[] {
  const eyes = slots.find(s => s.slotId === "eyes")!;
  const mouth = slots.find(s => s.slotId === "mouth")!;
  const body = slots.find(s => s.slotId === "body")!;
  const tail = slots.find(s => s.slotId === "tail")!;

  const eyeArt = getArt(eyes);
  const mouthArt = getArt(mouth);
  const bodyArt = getArt(body);
  const tailArt = getArt(tail);

  const eyeRaw = eyeArt;
  const mouthRaw = `(${mouthArt})`;
  const bodyRaw = `╱${bodyArt}╲`;
  const tailRaw = tailArt;

  const eyeColored = col(eyeArt, eyes.rarity);
  const mouthColored = col("(", mouth.rarity) + col(mouthArt, mouth.rarity) + col(")", mouth.rarity);
  const bodyColored = col("╱", body.rarity) + col(bodyArt, body.rarity) + col("╲", body.rarity);
  const tailColored = col(tailArt, tail.rarity);

  return [
    centerLine(eyeRaw, eyeColored),
    centerLine(mouthRaw, mouthColored),
    centerLine(bodyRaw, bodyColored),
    centerLine(tailRaw, tailColored),
  ];
}

function energyBar(current: number, max: number): string {
  const filled = Math.min(10, Math.round((current / max) * 10));
  const bar = `${ANSI.green}${"█".repeat(filled)}${"░".repeat(10 - filled)}${ANSI.reset}`;
  return `${bar} ${current}/${max}`;
}

function chanceBar(chance: number, rarity: Rarity): string {
  const filled = Math.round(chance * 10);
  const color = RARITY_COLOR[rarity];
  return `${color}${"▸".repeat(filled)}${"░".repeat(10 - filled)}${ANSI.reset}`;
}

function divider(): string {
  return `  ${ANSI.dim}${"─".repeat(46)}${ANSI.reset}`;
}

function variantName(slot: CreatureSlot): string {
  const v = getVariantById(slot.variantId);
  return v?.name ?? slot.variantId;
}

export class SimpleTextRenderer implements Renderer {
  renderScan(result: ScanResult): string {
    if (result.nearby.length === 0) {
      return MESSAGES.scan.empty;
    }

    const lines: string[] = [];
    lines.push(`  Energy: ${energyBar(result.energy, MAX_ENERGY)}`);
    lines.push(`  ${ANSI.dim}${result.nearby.length} creatures nearby${ANSI.reset}`);
    lines.push("");

    for (const entry of result.nearby) {
      const c = entry.creature;
      const rate = Math.round(entry.catchRate * 100);
      lines.push(`  ${ANSI.dim}[${entry.index + 1}]${ANSI.reset} ${ANSI.bold}${c.name}${ANSI.reset}       Rate: ${rate}%  Cost: ${entry.energyCost}E`);
      const art = renderCreatureArt(c.slots);
      for (const line of art) {
        lines.push(`      ${line}`);
      }
      lines.push("");
    }

    lines.push(divider());
    lines.push(`  ${ANSI.dim}${MESSAGES.scan.footer}${ANSI.reset}`);
    return lines.join("\n");
  }

  renderCatch(result: CatchResult): string {
    const c = result.creature;
    const lines: string[] = [];

    if (result.success) {
      lines.push(`  ${ANSI.green}${ANSI.bold}${MESSAGES.catch.successHeader}${ANSI.reset}`);
      lines.push("");
      lines.push(`  ${ANSI.bold}${c.name}${ANSI.reset} joined your collection!`);
      const art = renderCreatureArt(c.slots);
      for (const line of art) lines.push(`      ${line}`);
      lines.push("");
      lines.push(`  ${ANSI.dim}+${result.xpEarned} XP   -${result.energySpent} Energy${ANSI.reset}`);
    } else if (result.fled) {
      lines.push(`  ${ANSI.red}${ANSI.bold}${MESSAGES.catch.fledHeader}${ANSI.reset}`);
      lines.push("");
      lines.push(`  ${ANSI.bold}${c.name}${ANSI.reset} fled into the void!`);
      lines.push(`  ${ANSI.dim}The creature is gone.${ANSI.reset}`);
      lines.push("");
      lines.push(`  ${ANSI.dim}-${result.energySpent} Energy${ANSI.reset}`);
    } else {
      lines.push(`  ${ANSI.yellow}${ANSI.bold}${MESSAGES.catch.escapedHeader}${ANSI.reset}`);
      lines.push("");
      lines.push(`  ${ANSI.bold}${c.name}${ANSI.reset} slipped away!`);
      const art = renderCreatureArt(c.slots);
      for (const line of art) lines.push(`      ${line}`);
      lines.push("");
      lines.push(`  ${ANSI.dim}-${result.energySpent} Energy   ${result.attemptsRemaining} attempts remaining${ANSI.reset}`);
    }

    lines.push("");
    lines.push(divider());
    return lines.join("\n");
  }

  renderMergePreview(preview: MergePreview): string {
    const lines: string[] = [];

    lines.push(`  Feed ${ANSI.bold}${preview.food.name}${ANSI.reset} ${ANSI.dim}(Lv ${preview.food.generation})${ANSI.reset} into ${ANSI.bold}${preview.target.name}${ANSI.reset} ${ANSI.dim}(Lv ${preview.target.generation})${ANSI.reset}?`);
    lines.push(`  ${ANSI.dim}${preview.food.name} will be consumed.${ANSI.reset}`);
    lines.push("");

    lines.push(`  ${ANSI.bold}Target: ${preview.target.name}${ANSI.reset}`);
    const targetArt = renderCreatureArt(preview.target.slots);
    for (const line of targetArt) lines.push(`      ${line}`);
    lines.push("");

    lines.push(`  ${ANSI.bold}Food: ${preview.food.name}${ANSI.reset}`);
    const foodArt = renderCreatureArt(preview.food.slots);
    for (const line of foodArt) lines.push(`      ${line}`);
    lines.push("");

    lines.push(`  ${ANSI.bold}Upgrade chances:${ANSI.reset}`);
    for (const sc of preview.slotChances) {
      const pct = Math.round(sc.chance * 100);
      const bar = chanceBar(sc.chance, sc.currentRarity);
      const padSlot = sc.slotId.padEnd(5);
      lines.push(`    ${col(padSlot, sc.currentRarity)}  ${bar} ${String(pct).padStart(2)}%  ${ANSI.dim}${sc.currentRarity} → ${sc.nextRarity}${ANSI.reset}`);
    }

    lines.push("");
    lines.push(divider());
    lines.push(`  ${ANSI.dim}${MESSAGES.merge.confirmHint}${ANSI.reset}`);
    return lines.join("\n");
  }

  renderMergeResult(result: MergeResult): string {
    const lines: string[] = [];

    lines.push(`  ${ANSI.green}${ANSI.bold}${MESSAGES.merge.successHeader}${ANSI.reset}`);
    lines.push("");
    lines.push(`  ${ANSI.bold}${result.target.name}${ANSI.reset} — ${result.upgradedSlot} upgraded!`);
    lines.push(`    ${col(result.previousRarity, result.previousRarity)} → ${col(result.newRarity, result.newRarity)}`);
    lines.push(`    ${ANSI.dim}→ ${result.graftedVariantName} (grafted)${ANSI.reset}`);
    lines.push("");

    const art = renderCreatureArt(result.target.slots);
    for (const line of art) lines.push(`      ${line}`);

    // Show variant names
    const names = result.target.slots.map(s => variantName(s));
    lines.push(`      ${ANSI.dim}${names.join("  ")}${ANSI.reset}`);
    lines.push("");
    lines.push(`  ${ANSI.dim}${result.food.name} was consumed.${ANSI.reset}`);
    lines.push("");
    lines.push(divider());
    return lines.join("\n");
  }

  renderCollection(collection: CollectionCreature[]): string {
    if (collection.length === 0) {
      return MESSAGES.collection.empty;
    }

    const lines: string[] = [];
    lines.push(`  ${ANSI.dim}Your creatures (${collection.length})${ANSI.reset}`);
    lines.push("");

    for (const creature of collection) {
      lines.push(`  ${ANSI.bold}${creature.name}${ANSI.reset}  Lv ${creature.generation}`);
      const art = renderCreatureArt(creature.slots);
      for (const line of art) lines.push(`      ${line}`);
      const names = creature.slots.map(s => variantName(s));
      lines.push(`      ${ANSI.dim}${names.join("  ")}${ANSI.reset}`);
      lines.push("");
    }

    lines.push(divider());
    return lines.join("\n");
  }

  renderEnergy(energy: number, maxEnergy: number): string {
    return `  Energy: ${energyBar(energy, maxEnergy)}`;
  }

  renderStatus(result: StatusResult): string {
    const p = result.profile;
    const nextLevelXP = p.level * 100;
    const xpFilled = Math.min(10, Math.round((p.xp / nextLevelXP) * 10));
    const xpBar = `${ANSI.green}${"█".repeat(xpFilled)}${"░".repeat(10 - xpFilled)}${ANSI.reset}`;

    const lines: string[] = [];
    lines.push(`  ${ANSI.bold}${MESSAGES.status.header}${ANSI.reset}`);
    lines.push("");
    lines.push(`  Level: ${p.level}`);
    lines.push(`  XP:     ${xpBar} ${p.xp}/${nextLevelXP}`);
    lines.push(`  Energy: ${energyBar(result.energy, MAX_ENERGY)}`);
    lines.push("");
    lines.push(`  Catches:    ${p.totalCatches}`);
    lines.push(`  Merges:     ${p.totalMerges}`);
    lines.push(`  Collection: ${result.collectionCount} creatures`);
    lines.push(`  Streak:     ${p.currentStreak} days ${ANSI.dim}(best: ${p.longestStreak})${ANSI.reset}`);
    lines.push(`  Nearby:     ${result.nearbyCount} creatures`);
    lines.push(`  Ticks:      ${p.totalTicks}`);
    lines.push("");
    lines.push(divider());
    return lines.join("\n");
  }

  renderNotification(notification: Notification): string {
    return notification.message;
  }
}
```

Note: `string-width` v4 uses CommonJS require. If using v4, change the import to:
```typescript
const stringWidth = require("string-width") as (str: string) => number;
```

Test which import style works and adjust accordingly.

- [ ] **Step 4: Delete src/renderers/renderer.ts if it exists**

The `Renderer` interface lives in `types.ts` now.

- [ ] **Step 5: Run renderer tests**

```bash
npx jest tests/renderers/simple-text.test.ts -v
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/renderers/simple-text.ts tests/renderers/simple-text.test.ts
git rm src/renderers/renderer.ts 2>/dev/null; true
git commit -m "feat: rewrite renderer — ANSI colors, per-slot coloring, dynamic alignment"
```

---

## Task 11: Update MCP server, CLI, and skills

**Files:**
- Modify: `src/mcp-server.ts`
- Modify: `src/cli.ts`
- Modify: `src/index.ts`
- Modify: `skills/merge/SKILL.md`
- Modify: `skills/settings/SKILL.md`

- [ ] **Step 1: Update MCP server**

Key changes:
- Merge tool becomes two operations: preview and execute
- Remove `renderer` from settings tool
- Update imports

```typescript
#!/usr/bin/env node
import * as path from "path";
import * as os from "os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { StateManager } from "./state/state-manager";
import { GameEngine } from "./engine/game-engine";
import { SimpleTextRenderer } from "./renderers/simple-text";
import { MAX_ENERGY } from "./engine/energy";

const statePath =
  process.env.COMPI_STATE_PATH ||
  path.join(os.homedir(), ".compi", "state.json");

function loadEngine() {
  const stateManager = new StateManager(statePath);
  const state = stateManager.load();
  const engine = new GameEngine(state);
  return { stateManager, engine };
}

function text(content: string) {
  return { content: [{ type: "text" as const, text: content }] };
}

const server = new McpServer({
  name: "compi",
  version: "0.2.0",
});

server.tool("scan", "Show nearby creatures that can be caught", {}, () => {
  const { stateManager, engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const result = engine.scan();
  stateManager.save(engine.getState());
  return text(renderer.renderScan(result));
});

server.tool(
  "catch",
  "Attempt to catch a nearby creature",
  { index: z.number().describe("1-indexed creature number from scan list") },
  ({ index }) => {
    const { stateManager, engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const result = engine.catch(index - 1);
    stateManager.save(engine.getState());
    return text(renderer.renderCatch(result));
  }
);

server.tool("collection", "Browse caught creatures", {}, () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  return text(renderer.renderCollection(engine.getState().collection));
});

server.tool(
  "merge",
  "Merge two creatures — feed one into another to upgrade a slot",
  {
    targetId: z.string().describe("ID of creature to upgrade (target)"),
    foodId: z.string().describe("ID of creature to consume (food)"),
    confirm: z.boolean().optional().describe("Set to true to execute the merge, omit for preview"),
  },
  ({ targetId, foodId, confirm }) => {
    const { stateManager, engine } = loadEngine();
    const renderer = new SimpleTextRenderer();

    if (confirm) {
      const result = engine.mergeExecute(targetId, foodId);
      stateManager.save(engine.getState());
      return text(renderer.renderMergeResult(result));
    }

    const preview = engine.mergePreview(targetId, foodId);
    return text(renderer.renderMergePreview(preview));
  }
);

server.tool("energy", "Show current energy level", {}, () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const state = engine.getState();
  return text(renderer.renderEnergy(state.energy, MAX_ENERGY));
});

server.tool("status", "View player profile and game stats", {}, () => {
  const { engine } = loadEngine();
  const renderer = new SimpleTextRenderer();
  const result = engine.status();
  return text(renderer.renderStatus(result));
});

server.tool(
  "settings",
  "View or change game settings",
  { key: z.string().optional().describe("Setting key: 'notifications'"), value: z.string().optional().describe("New value") },
  ({ key, value }) => {
    const { stateManager, engine } = loadEngine();
    const gameState = engine.getState();
    if (key && value) {
      if (key === "notifications") {
        gameState.settings.notificationLevel = value as "minimal" | "moderate" | "off";
      }
      stateManager.save(gameState);
      return text(`Settings updated: ${key} = ${value}`);
    }
    return text(`SETTINGS\n\nNotifications: ${gameState.settings.notificationLevel}`);
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

- [ ] **Step 2: Update src/cli.ts**

Update the merge command to use `targetId` and `foodId` instead of `parentAId` and `parentBId`. Update the merge subcommand to support preview and confirm flow. Also remove renderer setting from settings command.

The CLI changes mirror the MCP changes — the merge subcommand takes `--target` and `--food` args, with an optional `--confirm` flag.

- [ ] **Step 3: Update src/index.ts**

Update exports to match new module structure. Remove old trait exports, add new ones:

```typescript
export { GameEngine } from "./engine/game-engine";
export { StateManager } from "./state/state-manager";
export { SimpleTextRenderer } from "./renderers/simple-text";
export { loadSlots, getVariantById, getVariantsBySlotAndRarity, loadCreatureName } from "./config/traits";
export { loadConfig, formatMessage } from "./config/loader";
export { logger } from "./logger";
export * from "./types";
```

- [ ] **Step 4: Update skills/merge/SKILL.md**

```markdown
---
name: merge
model: claude-haiku-4-5-20251001
description: Merge two creatures from your collection
---

Parse the arguments for target and food creature IDs.

Usage: `/merge [targetId] [foodId]`

First call `mcp__compi__merge` with `targetId` and `foodId` (no `confirm`) to show the merge preview.

CRITICAL: Output the tool's text response AS-IS in a code block. Do NOT summarize, paraphrase, or reformat. The output contains colored ASCII art that must be preserved exactly.

After showing the preview, ask the user if they want to proceed. If yes, call `mcp__compi__merge` again with `targetId`, `foodId`, and `confirm: true`.
```

- [ ] **Step 5: Update skills/settings/SKILL.md**

Remove reference to renderer setting — only `notifications` remains.

- [ ] **Step 6: Build and verify**

```bash
npm run build
```

Expected: compiles cleanly.

- [ ] **Step 7: Commit**

```bash
git add src/mcp-server.ts src/cli.ts src/index.ts skills/merge/SKILL.md skills/settings/SKILL.md
git commit -m "feat: update MCP server, CLI, and skills for v2 merge API"
```

---

## Task 12: Run all tests and fix issues

**Files:**
- All test files

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Fix any failures. Common issues:
- Old imports referencing removed types (`CreatureTrait`, `TraitSlotId`, `MergeModifier`, etc.)
- Old test files that reference the 6-slot structure
- `string-width` import issues (ESM vs CJS)

- [ ] **Step 2: Run build**

```bash
npm run build
```

Fix any TypeScript errors.

- [ ] **Step 3: Manual smoke test**

```bash
node dist/cli.js scan
node dist/cli.js status
```

Verify colored output appears correctly.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: resolve all test and build issues for v2"
```

---

## Task 13: Clean up preview files and old code

**Files:**
- Delete: `_preview_*.js`, `_art.txt`, `_to_braille.js`, `_trait_preview.txt`

- [ ] **Step 1: Remove preview and temp files**

```bash
git rm _preview_art.js _preview_traits.js _to_braille.js 2>/dev/null; true
rm -f _preview_creatures.js _preview_mixed.js _preview_v3.js _preview_b_examples.js _preview_unicode.js _preview_aligned.js _preview_all_screens.js _preview_scan_v2.js
rm -f _art.txt _trait_preview.txt
```

Keep the preview files in the repo only if desired for reference. Otherwise clean them up.

- [ ] **Step 2: Verify no leftover old code**

Search for any remaining references to old types:

```bash
grep -r "TraitSlotId\|MergeModifier\|CreatureTrait\|mergeModifier\|volatile\|catalyst\|synergy\|ancient\|void" src/ --include="*.ts" -l
```

Expected: no results (or only false positives like string literals).

- [ ] **Step 3: Final build and test**

```bash
npm run build && npm test
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: clean up preview files and remove old v1 code"
```

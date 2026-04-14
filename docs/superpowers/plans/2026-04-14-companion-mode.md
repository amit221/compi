# Companion Mode (`/compi:play`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 12+ individual slash commands with a single `/compi:play` command that acts as an AI game companion — showing real game output, adding strategic insights, and guiding the player through a conversational loop.

**Architecture:** A new `companion` MCP tool aggregates game state into a single overview response (status + nearby summary + opportunities + suggestions). A new `/compi:play` skill prompt instructs Claude to act as an interactive companion that calls real MCP tools, displays real ANSI output, annotates with strategic insights, and loops until the player is done. No engine logic changes — just a new aggregation tool and a skill prompt.

**Tech Stack:** TypeScript (engine module + MCP tool), Markdown (SKILL.md prompt), Jest (tests)

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/engine/companion.ts` | Pure function that aggregates game state into a `CompanionOverview` |
| Create | `tests/engine/companion.test.ts` | Tests for companion overview generation |
| Modify | `src/types.ts` | Add `CompanionOverview` interface |
| Modify | `src/renderers/simple-text.ts` | Add `renderCompanionOverview()` method |
| Modify | `src/mcp-tools.ts` | Register `companion` MCP tool |
| Modify | `src/index.ts` | Export companion module |
| Create | `skills/play/SKILL.md` | The companion skill prompt |

---

### Task 1: Add `CompanionOverview` type

**Files:**
- Modify: `src/types.ts:170-224` (after `AdvisorContext`, before `ActionMenuEntry`)

- [ ] **Step 1: Add the CompanionOverview interface to types.ts**

Add after the `AdvisorContext` interface (line 217):

```typescript
// --- Companion Overview ---

export interface NearbyHighlight {
  index: number;
  name: string;
  speciesId: string;
  isNewSpecies: boolean;
  catchRate: number;
  energyCost: number;
  /** Total rarity score across all 4 slots (0-400 scale) */
  totalRarity: number;
}

export interface UpgradeOpportunity {
  creatureId: string;
  creatureName: string;
  slotId: SlotId;
  currentRank: number;
  goldCost: number;
  /** True if this upgrade pushes the trait into a new rarity tier */
  nearTier: boolean;
  tierName: string;
}

export interface BreedablePair {
  indexA: number;
  nameA: string;
  indexB: number;
  nameB: string;
  speciesId: string;
}

export interface CompanionOverview {
  progress: ProgressInfo;
  nearbyHighlights: NearbyHighlight[];
  breedablePairs: BreedablePair[];
  upgradeOpportunities: UpgradeOpportunity[];
  questStatus: "available" | "in_progress" | "complete" | "no_creatures";
  questSessionsRemaining: number | null;
  suggestedActions: SuggestedAction[];
}
```

- [ ] **Step 2: Add `renderCompanionOverview` to the Renderer interface**

In the `Renderer` interface in `src/types.ts` (around line 450), add:

```typescript
  renderCompanionOverview(overview: CompanionOverview): string;
```

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(companion): add CompanionOverview type and renderer interface"
```

---

### Task 2: Implement companion overview engine module

**Files:**
- Create: `src/engine/companion.ts`
- Test: `tests/engine/companion.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/engine/companion.test.ts`:

```typescript
import { getCompanionOverview } from "../../src/engine/companion";
import { GameState, CompanionOverview } from "../../src/types";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 5,
    profile: {
      level: 3,
      xp: 20,
      totalCatches: 5,
      totalMerges: 0,
      totalTicks: 50,
      currentStreak: 2,
      longestStreak: 3,
      lastActiveDate: "2026-04-14",
      totalUpgrades: 1,
      totalQuests: 0,
    },
    collection: [],
    archive: [],
    energy: 20,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    lastSpawnAt: 0,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
    gold: 10,
    discoveredSpecies: ["compi"],
    activeQuest: null,
    sessionUpgradeCount: 0,
    currentSessionId: "s1",
    ...overrides,
  };
}

describe("getCompanionOverview", () => {
  it("returns overview with empty collection", () => {
    const state = makeState();
    const overview = getCompanionOverview(state);
    expect(overview.progress).toBeDefined();
    expect(overview.progress.level).toBe(3);
    expect(overview.nearbyHighlights).toEqual([]);
    expect(overview.breedablePairs).toEqual([]);
    expect(overview.upgradeOpportunities).toEqual([]);
    expect(overview.questStatus).toBe("no_creatures");
    expect(overview.suggestedActions.length).toBeGreaterThan(0);
  });

  it("highlights nearby creatures with new species flag", () => {
    const state = makeState({
      nearby: [
        {
          id: "n1",
          speciesId: "compi",
          name: "Ziggy",
          slots: [
            { slotId: "eyes", variantId: "eye_c01", color: "grey" },
            { slotId: "mouth", variantId: "mth_c01", color: "grey" },
            { slotId: "body", variantId: "bod_c01", color: "grey" },
            { slotId: "tail", variantId: "tal_c01", color: "grey" },
          ],
          spawnedAt: Date.now(),
        },
        {
          id: "n2",
          speciesId: "flikk",
          name: "Buzzy",
          slots: [
            { slotId: "eyes", variantId: "flk_eye_01", color: "grey" },
            { slotId: "mouth", variantId: "flk_mth_01", color: "grey" },
            { slotId: "body", variantId: "flk_bod_01", color: "grey" },
            { slotId: "tail", variantId: "flk_tal_01", color: "grey" },
          ],
          spawnedAt: Date.now(),
        },
      ],
      batch: { attemptsRemaining: 3, failPenalty: 0, spawnedAt: Date.now() },
      discoveredSpecies: ["compi"],
    });

    const overview = getCompanionOverview(state);
    expect(overview.nearbyHighlights).toHaveLength(2);
    expect(overview.nearbyHighlights[0].isNewSpecies).toBe(false); // compi already discovered
    expect(overview.nearbyHighlights[1].isNewSpecies).toBe(true); // flikk is new
  });

  it("detects breedable pairs", () => {
    const state = makeState({
      collection: [
        {
          id: "c1", speciesId: "compi", name: "Alpha", archived: false,
          generation: 0, caughtAt: Date.now(),
          slots: [
            { slotId: "eyes", variantId: "eye_c01", color: "grey" },
            { slotId: "mouth", variantId: "mth_c01", color: "grey" },
            { slotId: "body", variantId: "bod_c01", color: "grey" },
            { slotId: "tail", variantId: "tal_c01", color: "grey" },
          ],
        },
        {
          id: "c2", speciesId: "compi", name: "Beta", archived: false,
          generation: 0, caughtAt: Date.now(),
          slots: [
            { slotId: "eyes", variantId: "eye_c02", color: "grey" },
            { slotId: "mouth", variantId: "mth_c02", color: "grey" },
            { slotId: "body", variantId: "bod_c02", color: "grey" },
            { slotId: "tail", variantId: "tal_c02", color: "grey" },
          ],
        },
      ],
    });

    const overview = getCompanionOverview(state);
    expect(overview.breedablePairs).toHaveLength(1);
    expect(overview.breedablePairs[0].speciesId).toBe("compi");
    expect(overview.questStatus).toBe("available");
  });

  it("reports quest in progress", () => {
    const state = makeState({
      activeQuest: {
        id: "q1",
        creatureIds: ["c1"],
        startedAtSession: 1,
        sessionsRemaining: 1,
        teamPower: 10,
      },
    });
    const overview = getCompanionOverview(state);
    expect(overview.questStatus).toBe("in_progress");
    expect(overview.questSessionsRemaining).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/engine/companion.test.ts -v`
Expected: FAIL — `Cannot find module '../../src/engine/companion'`

- [ ] **Step 3: Write the implementation**

Create `src/engine/companion.ts`:

```typescript
import {
  GameState,
  CompanionOverview,
  NearbyHighlight,
  UpgradeOpportunity,
  BreedablePair,
  SlotId,
} from "../types";
import { getProgressInfo, getViableActions, getSuggestedActions } from "./advisor";
import { calculateCatchRate, calculateEnergyCost } from "./catch";
import { calculateSlotScore } from "./rarity";
import { loadConfig } from "../config/loader";

/**
 * Extract trait rank from a variantId with the `_rN` suffix convention.
 */
function extractRank(variantId: string): number {
  const m = variantId.match(/_r(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

const TIER_BOUNDARIES = [0, 5, 9, 12, 15, 17];
const TIER_NAMES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

function getTierName(rank: number): string {
  for (let i = TIER_BOUNDARIES.length - 1; i >= 0; i--) {
    if (rank >= TIER_BOUNDARIES[i]) return TIER_NAMES[i];
  }
  return "common";
}

function getNextTierBoundary(rank: number): number | null {
  for (const boundary of TIER_BOUNDARIES) {
    if (boundary > rank) return boundary;
  }
  return null;
}

/**
 * Build a comprehensive overview of the current game state.
 * Pure function — reads state, returns structured data for the companion UI.
 */
export function getCompanionOverview(state: GameState): CompanionOverview {
  const config = loadConfig();
  const progress = getProgressInfo(state);
  const suggestedActions = getSuggestedActions("companion", null, state);

  // --- Nearby highlights ---
  const nearbyHighlights: NearbyHighlight[] = state.nearby.map((creature, i) => {
    const totalRarity = creature.slots.reduce((sum, slot) => {
      return sum + calculateSlotScore(creature.speciesId, slot.slotId, slot.variantId);
    }, 0);
    return {
      index: i + 1,
      name: creature.name,
      speciesId: creature.speciesId,
      isNewSpecies: !state.discoveredSpecies.includes(creature.speciesId),
      catchRate: calculateCatchRate(creature.speciesId, creature.slots, state.batch?.failPenalty ?? 0),
      energyCost: calculateEnergyCost(creature.speciesId, creature.slots),
      totalRarity,
    };
  });

  // --- Breedable pairs ---
  const breedablePairs: BreedablePair[] = [];
  const questCreatureIds = state.activeQuest?.creatureIds ?? [];
  const speciesGroups: Record<string, number[]> = {};
  for (let i = 0; i < state.collection.length; i++) {
    const c = state.collection[i];
    if (c.archived || questCreatureIds.includes(c.id)) continue;
    if (!speciesGroups[c.speciesId]) speciesGroups[c.speciesId] = [];
    speciesGroups[c.speciesId].push(i);
  }
  for (const [speciesId, indexes] of Object.entries(speciesGroups)) {
    if (indexes.length < 2) continue;
    // Report the best pair (first two by collection order)
    const a = indexes[0];
    const b = indexes[1];
    breedablePairs.push({
      indexA: a + 1,
      nameA: state.collection[a].name,
      indexB: b + 1,
      nameB: state.collection[b].name,
      speciesId,
    });
  }

  // --- Upgrade opportunities ---
  const upgradeOpportunities: UpgradeOpportunity[] = [];
  if (state.sessionUpgradeCount < config.upgrade.sessionCap) {
    for (const creature of state.collection) {
      if (creature.archived || questCreatureIds.includes(creature.id)) continue;
      for (const slot of creature.slots) {
        const rank = extractRank(slot.variantId);
        if (rank >= config.upgrade.maxRank) continue;
        const cost = config.upgrade.costs[rank];
        if (cost === undefined || state.gold < cost) continue;
        const nextBoundary = getNextTierBoundary(rank);
        const nearTier = nextBoundary !== null && nextBoundary - rank === 1;
        upgradeOpportunities.push({
          creatureId: creature.id,
          creatureName: creature.name,
          slotId: slot.slotId as SlotId,
          currentRank: rank,
          goldCost: cost,
          nearTier,
          tierName: getTierName(rank),
        });
      }
    }
  }
  // Sort: near-tier first, then by cost ascending
  upgradeOpportunities.sort((a, b) => {
    if (a.nearTier !== b.nearTier) return a.nearTier ? -1 : 1;
    return a.goldCost - b.goldCost;
  });

  // --- Quest status ---
  const availableCreatures = state.collection.filter(
    (c) => !c.archived && !questCreatureIds.includes(c.id)
  );
  let questStatus: CompanionOverview["questStatus"];
  if (state.activeQuest) {
    questStatus = state.activeQuest.sessionsRemaining <= 0 ? "complete" : "in_progress";
  } else if (availableCreatures.length > 0) {
    questStatus = "available";
  } else {
    questStatus = "no_creatures";
  }

  return {
    progress,
    nearbyHighlights,
    breedablePairs,
    upgradeOpportunities: upgradeOpportunities.slice(0, 5), // top 5
    questStatus,
    questSessionsRemaining: state.activeQuest?.sessionsRemaining ?? null,
    suggestedActions,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/engine/companion.test.ts -v`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/companion.ts tests/engine/companion.test.ts
git commit -m "feat(companion): add companion overview engine module with tests"
```

---

### Task 3: Add companion renderer

**Files:**
- Modify: `src/renderers/simple-text.ts`

- [ ] **Step 1: Add `renderCompanionOverview` method to SimpleTextRenderer**

Add this method to the `SimpleTextRenderer` class, after `renderProgressPanel` (around line 720):

```typescript
  renderCompanionOverview(overview: CompanionOverview): string {
    const lines: string[] = [];

    // Status bar at top
    lines.push(this.renderStatusBar(overview.progress));
    lines.push("");

    // --- Nearby section ---
    if (overview.nearbyHighlights.length > 0) {
      lines.push(`  ${BOLD}🔍 Nearby Creatures${RESET}`);
      for (const h of overview.nearbyHighlights) {
        const newBadge = h.isNewSpecies ? `  ${YELLOW}NEW${RESET}` : "";
        const rate = `${DIM}${Math.round(h.catchRate * 100)}%${RESET}`;
        const cost = `${h.energyCost}${YELLOW}⚡${RESET}`;
        lines.push(`  ${DIM}[${h.index}]${RESET} ${BOLD}${h.name}${RESET} ${DIM}(${h.speciesId})${RESET}  ${rate}  ${cost}${newBadge}`);
      }
      lines.push("");
    } else {
      lines.push(`  ${DIM}🔍 No creatures nearby — scan to find some${RESET}`);
      lines.push("");
    }

    // --- Breed section ---
    if (overview.breedablePairs.length > 0) {
      lines.push(`  ${BOLD}🥚 Breedable Pairs${RESET}`);
      for (const pair of overview.breedablePairs) {
        lines.push(`  ${pair.nameA} + ${pair.nameB} ${DIM}(${pair.speciesId})${RESET}`);
      }
      lines.push("");
    }

    // --- Upgrade section ---
    if (overview.upgradeOpportunities.length > 0) {
      const top = overview.upgradeOpportunities.slice(0, 3);
      lines.push(`  ${BOLD}⬆️  Upgrade Opportunities${RESET}`);
      for (const u of top) {
        const tierBadge = u.nearTier ? `  ${GREEN}→ tier up!${RESET}` : "";
        lines.push(`  ${u.creatureName}'s ${u.slotId} ${DIM}(rank ${u.currentRank}, ${u.goldCost}g)${RESET}${tierBadge}`);
      }
      lines.push("");
    }

    // --- Quest section ---
    if (overview.questStatus === "in_progress") {
      lines.push(`  ${BOLD}⚔️  Quest${RESET}  ${DIM}${overview.questSessionsRemaining} session(s) remaining${RESET}`);
      lines.push("");
    } else if (overview.questStatus === "complete") {
      lines.push(`  ${BOLD}⚔️  Quest Complete!${RESET}  ${GREEN}Check in to collect rewards${RESET}`);
      lines.push("");
    } else if (overview.questStatus === "available") {
      lines.push(`  ${DIM}⚔️  Quest available — send creatures for gold${RESET}`);
      lines.push("");
    }

    // --- Discovery ---
    lines.push(`  ${DIM}📖 Species: ${overview.progress.discoveredCount}/${overview.progress.totalSpecies} discovered${RESET}`);
    lines.push("");

    return lines.join("\n");
  }
```

- [ ] **Step 2: Add the import for `CompanionOverview` at the top of `simple-text.ts`**

Add `CompanionOverview` to the existing import from `"../types"` (line 1-22).

- [ ] **Step 3: Commit**

```bash
git add src/renderers/simple-text.ts
git commit -m "feat(companion): add renderCompanionOverview to SimpleTextRenderer"
```

---

### Task 4: Register companion MCP tool

**Files:**
- Modify: `src/mcp-tools.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Add companion import to mcp-tools.ts**

Add to the imports at the top of `src/mcp-tools.ts`:

```typescript
import { getCompanionOverview } from "./engine/companion";
```

- [ ] **Step 2: Register the companion tool**

Add inside `registerTools()`, after the last `addTool` call (before the closing `}`), around line 300:

```typescript
  addTool(server, "companion", "Get a full game overview with strategic insights for the companion AI", z.object({}), async () => {
    const { stateManager, engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const state = engine.getState();
    const overview = getCompanionOverview(state);
    stateManager.save(state);
    const rendered = renderer.renderCompanionOverview(overview);
    const json = JSON.stringify(overview, null, 2);
    const content = `${rendered}\n\n<companion_overview>\n${json}\n</companion_overview>`;
    return text(prependStatusBar(engine, renderer, content));
  }, meta);
```

- [ ] **Step 3: Add export to barrel**

In `src/index.ts`, add:

```typescript
export { getCompanionOverview } from "./engine/companion";
```

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add src/mcp-tools.ts src/index.ts
git commit -m "feat(companion): register companion MCP tool"
```

---

### Task 5: Create the `/compi:play` skill

**Files:**
- Create: `skills/play/SKILL.md`

- [ ] **Step 1: Create the skill directory and prompt**

Create `skills/play/SKILL.md`:

```markdown
---
name: play
description: Interactive game companion — your AI guide to Compi
---

You are the Compi game companion. You help the player enjoy the game through conversation — no commands to memorize, just talk to you.

## Starting a session

1. Call the `mcp__plugin_compi_compi__companion` tool to get the full game overview.
2. Run this Bash command to display the overview with colors:
   ```
   _t="$(node -p "require('os').tmpdir()")" && cat "$_t/compi_display.txt" && rm -f "$_t/compi_display.txt"
   ```
3. Read the `<companion_overview>` JSON block from the tool response.

## How to present the overview

After displaying the ANSI output, add your **strategic commentary** based on the JSON data:

- **Nearby creatures**: If any have `isNewSpecies: true`, call that out prominently ("A Pyrax just showed up — you've never caught one before! Discovery XP bonus if you grab it."). For each creature, mention one strategic angle: breed potential, rarity, team power boost, etc.
- **Breed pairs**: If pairs exist, explain what makes them interesting ("Ivory + Blaze could breed — Blaze has a rare Spark tail that might pass down").
- **Upgrades**: If near-tier upgrades exist, highlight them ("Drift's mouth is 1 rank from Uncommon tier — only 3g").
- **Quest**: If complete, urge collection. If available, suggest it for passive income.

Then ask: **"What would you like to do?"**

## Responding to the player

The player will respond in natural language. Map their intent to the right MCP tool:

| Player says | Action |
|-------------|--------|
| "scan", "what's around", "look" | Call `mcp__plugin_compi_compi__scan` |
| "catch 2", "grab the pyrax", "catch it" | Call `mcp__plugin_compi_compi__catch` with the index |
| "breed", "merge them" | Call `mcp__plugin_compi_compi__breed` (list, preview, or confirm) |
| "upgrade drift's mouth" | Call `mcp__plugin_compi_compi__upgrade` with creature ID + slot |
| "quest", "send them out" | Call `mcp__plugin_compi_compi__quest_start` |
| "check quest" | Call `mcp__plugin_compi_compi__quest_check` |
| "collection", "show my creatures" | Call `mcp__plugin_compi_compi__collection` |
| "status", "how am I doing" | Call `mcp__plugin_compi_compi__status` |
| "energy" | Call `mcp__plugin_compi_compi__energy` |
| "done", "bye", "exit" | End the session with a short farewell |

## After every action

1. Run the Bash command to display the ANSI output:
   ```
   _t="$(node -p "require('os').tmpdir()")" && cat "$_t/compi_display.txt" && rm -f "$_t/compi_display.txt"
   ```
2. Read any `<advisor_context>` or `<companion_overview>` JSON block from the tool response.
3. **Add strategic commentary** (2-3 sentences):
   - What just happened and why it matters
   - What this unlocks or changes (new breed pair? closer to tier up? energy getting low?)
   - Your recommendation for what to do next, with reasoning
4. Ask: **"What's next?"** (or a variation)
5. **Keep looping** — don't stop until the player says they're done.

## Rules

- **Always show real output**: Always run the Bash display command after every MCP tool call. The player should see the full ANSI-rendered game output, not a text summary.
- **Always add insights**: After every real output, add 2-3 sentences of strategic commentary. Reference specific creature names, trait names, rarity scores, and costs from the JSON data.
- **Don't hide options**: When showing nearby creatures, comment on ALL of them with insights, not just your top pick. Let the player choose.
- **Be conversational**: The player shouldn't feel like they're using a command-line tool. They're talking to a smart companion who knows the game.
- **Parse loosely**: "grab that rare one", "the second one", "yeah do it" — interpret intent generously.
- **Reference collection indexes**: When suggesting breeds or upgrades, include the collection index numbers so the player can confirm easily.
- **Keep it short**: 2-3 sentences of commentary max. The ANSI output is the main content.

## Personality

You're a knowledgeable companion, not a tutorial bot. You:
- Get excited about rare finds and new species
- Give honest strategic advice ("that upgrade is expensive for what you get — save for the tier-up instead")
- Remember what happened earlier in the session ("now that you caught that Pyrax, you've got a breed pair")
- Respect the player's choices even if suboptimal ("sure, let's catch the common one — sometimes you just like the vibe")
```

- [ ] **Step 2: Commit**

```bash
git add skills/play/SKILL.md
git commit -m "feat(companion): add /compi:play interactive companion skill"
```

---

### Task 6: Bundle and verify end-to-end

**Files:**
- No new files

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass (including new companion tests)

- [ ] **Step 2: Run the full build**

Run: `npm run build:all`
Expected: No errors. Bundles generated in `scripts/`.

- [ ] **Step 3: Verify the companion tool works**

Run: `node scripts/cli.js status`
Expected: Player status output (confirms the build is working)

- [ ] **Step 4: Commit final build**

```bash
git add -A
git commit -m "chore(companion): bundle with companion mode"
```

# /play — Card-Based UX Redesign

**Date:** 2026-04-17
**Status:** Approved
**Version:** v7

## Problem

The current UX has ~12 slash commands (`/scan`, `/catch`, `/collection`, `/breed`, `/archive`, `/energy`, `/status`, `/settings`, `/species`, `/create-species`, `/list`, `/breedable`). This works on web or mobile, but in a terminal where requests are slow, navigating between commands is tedious and unfun.

## Solution

Replace all commands with a single `/play` command that presents randomized cards. Each turn draws 1–3 cards from available actions. The player picks by typing a letter (`a`, `b`, `c`) or skips (`s`). After each pick, the result is shown and the next cards are auto-drawn. The game becomes a continuous card-based loop.

## Design Decisions

### Single Command
- `/play` is the **only** command. All other slash commands are removed.
- All MCP tools are replaced by a single `play` tool.

### Card Types

Only two card types exist:

| Card Type | When Available | Energy Cost | Layout |
|-----------|---------------|-------------|--------|
| **Catch** | Creatures in `nearby[]` | 1 (turn) + catch cost (1–5) | Small card |
| **Breed** | Valid breedable pair, breeds remaining in session | 1 (turn) + breed cost (3–11) | Big card (1 card fills the screen) |

**Max 1 breed card per draw.** If a breed is drawn, it always gets the big card layout — no compact/small breed cards. The draw is either all catches (up to 3) or 1 big breed card alone.

**Species creation:** Cross-species breeding creates hybrid species automatically (via `register_hybrid`). No separate create-species command.

No archive, release, collection view, status, or species cards. Info is shown in the always-visible status bar.

### Energy Model

- **Every turn costs 1 energy** — this is the base cost of drawing cards.
- **Actions add their own cost** on top (catch: 1–5 by rarity, breed: 3–11 by parent rarity).
- **Skip costs 1 energy** — same as any turn, just draws new cards.
- **After picking a card**, the next draw is **free** — it's part of the same session. Only explicit `/play` or skip costs the 1 energy turn fee.
- **Passing on a breed card is free** — you already paid 1 to see it. Pass just draws the next hand.
- **Info is free** — status bar (energy, level, XP, collection count) is always shown at the top, no card needed.

### Card Drawing

1. Build pool from all available catches + breeds.
2. If pool is empty → show "Nothing happening. Come back later!" with status bar.
3. If energy is 0 → show "Out of energy. Come back later!" with status bar.
4. Randomly draw up to 3 cards from the pool.
5. Deduct 1 energy (turn cost).

### Adaptive Layout

- **Up to 3 small cards** — when catches are drawn (side by side in terminal).
- **1 big card** — when a breed is drawn (spotlight layout with both parents, trait comparison, upgrade chances). Breed always takes the full screen alone.
- **1–2 cards** — when fewer catch options are available.

### Turn Flow

```
Player types /play
  → Deduct 1 energy (turn cost)
  → Draw up to 3 cards from available pool
  → Show status bar + cards
  → Player replies with a letter (a/b/c) or (s) to skip

Player picks a card:
  → Execute action (catch/breed), deduct action's energy cost
  → Show result (caught/fled/escaped, breed result)
  → Auto-draw next cards (free, no extra energy)
  → Player picks again...

Player picks skip (s):
  → Redraw new cards (turn cost already paid)

Player passes on breed card (b):
  → Draw next cards (free, no extra energy)

Loop ends when:
  → Player stops responding
  → Energy hits 0
  → Pool is empty (no creatures nearby, no breeds available)
```

### Interaction Model

All interaction is through Claude chat. The player types:
- `a`, `b`, or `c` to pick a card
- `s` to skip (redraw)

There are no taps, clicks, or UI buttons — this runs entirely in Claude Code's terminal.

## UI Specification

### Status Bar (always shown, free)

```
⚡ ████████░░ 16/30  Lv.4  287/340 XP  8 caught
──────────────────────────────────────────────────
```

### Catch Card (small, up to 3 side by side)

```
+--------------------+
| [A] CATCH          |
|                    |
|      o.o           |    ← creature art (4 lines,
|     ( v )          |      from species template)
|     /##\           |
|      ~~/           |
|                    |
| Flikk              |    ← species name
| # Elite Eyes       |    ← 4 trait slots with
| # Elite Mouth      |      rarity color + name
| # Rare Body        |
| # Epic Tail        |
|                    |
| ⚡3  78% catch     |    ← action cost + catch rate
+--------------------+
```

Each card is 22 characters wide (20 inner + 2 borders). Cards touch edge-to-edge when side by side (`||` between cards).

### Breed Card (big, 1 card fills the screen)

```
+----------------------------------------------------------+
|               <3  BREEDING MATCH  <3                     |
|                                                          |
|       o.o                       o.o                      |
|      ( v )         <3          ( v )                     |
|      /##\                      /##\                      |
|       ~~/                       ~~/                      |
|     Flikk #2                  Flikk #5                   |
|                                                          |
|  ------------------------------------------------------  |
|  # Epic Eyes    x  # Elite Eyes                          |
|  # Epic Mouth   x  # Elite Mouth                        |
|  # Epic Body    x  # Rare Body                          |
|  # Epic Tail    x  # Epic Tail   > 35% upgrade!         |
|                                                          |
|     [A] Breed ⚡6              [B] Pass                  |
+----------------------------------------------------------+
```

Shows both parents with art, all 4 slots compared, matching traits highlighted with upgrade chance.

### Result Banner (shown above next draw)

```
** CAUGHT! **  Flikk added to collection
+10 XP  ·  New species discovered! +20 XP
──────────────────────────────────────────
```

Or for breed:
```
** BRED! **  Baby Flikk born!
Tail upgraded: Epic → Legendary!
+25 XP
──────────────────────────────────────────
```

Or for failure:
```
** ESCAPED **  Pyrax got away
──────────────────────────────────────────
```

### Empty State

```
⚡ ██░░░░░░░░  3/30  Lv.4  297/340 XP  9 caught
──────────────────────────────────────────────────

Nothing happening right now.
New creatures spawn every 30 min. Energy recharges over time.
```

### Footer (after cards)

```
[S] Skip ⚡1              Reply a, b, c, or s
```

## Architecture

### New Module: `src/engine/cards.ts`

The card dealer. Sits between the `/play` command and existing engine modules.

```
/play skill
  → MCP tool: play(choice?)
    → cards.ts: drawCards(state, rng)
    → cards.ts: playCard(state, cardId, rng)
    → returns: { result?, nextCards, statusBar }
```

**Key functions:**

- `buildPool(state): Card[]` — scans state for available catches + breeds, returns card objects.
- `drawCards(state, rng): DrawResult` — calls buildPool, randomly picks up to 3, deducts 1 energy. Returns cards with layout info.
- `playCard(state, card, rng): PlayResult` — executes the card's action by delegating to `catch.ts` or `breed.ts`. Returns action result + auto-draws next cards.

**Card interface:**

```typescript
interface Card {
  id: string;                        // unique per draw
  type: "catch" | "breed";
  label: string;                     // "Catch Flikk" / "Breed Flikk #2 × #5"
  energyCost: number;                // action cost (on top of turn cost)
  data: CatchCardData | BreedCardData;
}

interface CatchCardData {
  creatureIndex: number;             // index into nearby[]
  creature: NearbyCreature;
  catchRate: number;
}

interface BreedCardData {
  parentA: { index: number; creature: CollectionCreature };
  parentB: { index: number; creature: CollectionCreature };
  upgradeChances: SlotUpgradeInfo[];
}

interface SlotUpgradeInfo {
  slotId: string;
  match: boolean;                    // same variant = upgrade possible
  upgradeChance: number;             // 0-1 probability
}

interface DrawResult {
  cards: Card[];
  statusBar: string;                 // rendered status bar
  empty: boolean;                    // true = nothing to do
  noEnergy: boolean;                 // true = out of energy
}

interface PlayResult {
  result: CatchResult | BreedResult;
  nextDraw: DrawResult;              // auto-drawn next cards
}
```

### Single MCP Tool: `play`

Replaces all existing MCP tools.

```typescript
{
  name: "play",
  description: "Play the game — draw cards or pick one",
  parameters: {
    choice: {
      type: "string",
      enum: ["a", "b", "c", "s"],
      description: "Pick a card (a/b/c) or skip (s). Omit for initial draw.",
      optional: true
    }
  }
}
```

- `play()` — initial draw or redraw after entering the game
- `play("a")` — pick card A, execute, return result + next draw
- `play("s")` — skip, redraw new cards

### Renderer Changes

Add to `SimpleTextRenderer`:

- `renderCards(drawResult: DrawResult): string` — renders status bar + card layout
- `renderCardResult(playResult: PlayResult): string` — renders result banner + next cards
- `renderCatchCard(card: CatchCardData): string[]` — small card lines
- `renderBreedCard(card: BreedCardData): string[]` — big breed card lines (always full-width)

Card width: 22 chars (20 inner + 2 borders). Cards side-by-side separated by `||`.

## Removals

### Slash Commands Removed
All skills under `skills/` except `play/` (rewritten):
- `scan`, `catch`, `collection`, `breed`, `breedable`, `archive`, `energy`, `status`, `settings`, `species`, `create-species`, `list`

### MCP Tools Removed
All player-facing tools in `mcp-tools.ts` replaced by single `play` tool:
- `scan`, `catch`, `collection`, `breed`, `archive`, `release`, `energy`, `status`, `species`, `companion`, `settings`

**Kept as internal tool:** `register_hybrid` — still needed when cross-species breeding creates a new hybrid species. Called automatically during breed execution, not player-facing.

### Engine Modules Removed
- `advisor.ts` — cards.ts replaces action suggestion
- `companion.ts` — no longer needed
- `archive.ts` — no archive system

### State Changes
- Remove `archive[]` from `GameState`
- Remove collection limit logic
- Keep everything else (nearby, batch, collection, energy, progression, species progress, breed cooldowns)

### Engine Modules Kept (unchanged)
- `catch.ts`, `breed.ts`, `energy.ts`, `batch.ts`, `progression.ts`, `discovery.ts`, `rarity.ts`, `tiers.ts`, `species-index.ts`, `game-engine.ts` (simplified)

### Card State Persistence

The current drawn hand must be stored in `GameState` so the `play` tool can validate choices across calls:

```typescript
interface GameState {
  // ... existing fields ...
  currentHand?: CardRef[];  // lightweight references, cleared after pick/skip
}

interface CardRef {
  id: string;
  type: "catch" | "breed";
  nearbyIndex?: number;     // for catch: index into nearby[]
  parentIndices?: [number, number];  // for breed: indices into collection[]
}
```

When `play()` is called without a choice, draw new cards and store them. When `play("a")` is called, look up the card from `currentHand`, execute it, then draw next hand.

## Migration

This is a v6 → v7 state migration:
- Remove `archive` array from state
- Remove any collection limit fields
- Add `currentHand` field (optional, starts empty)
- Bump version to 7

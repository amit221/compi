# Termomon

A terminal creature collection game inspired by CryptoKitties and Pokemon Go. Every creature is an axolotl with a unique combination of randomized traits — 300 traits across 6 slots creating over 15 billion possible combinations. Catch creatures, manage limited resources, and merge them for a chance at rarer traits.

The game runs passively in the background — hooks track your activity, creatures appear in batches, and you interact through slash commands. It never interrupts your workflow.

## The Game Loop

1. **Work normally** in your terminal / Claude Code
2. **Creatures spawn in batches** (2-4 at a time) based on your activity
3. **Spend Energy to catch** — rarer traits cost more energy
4. **Make tough choices** — 3 shared attempts per batch, escalating failure penalty
5. **Merge creatures** — sacrifice two for a chance at something better (or lose both)

## Trait System

Every creature has 6 trait slots, each with a random trait from 8 rarity tiers:

```
  /\_/\
 ( ★.★ )    Eyes: Star Gaze [rare]
  ( ⚡ )    Mouth: Bolt Scream [rare]
   ~✦~     Tail: Sparkle [legendary]
```

| Rarity | Traits/Slot | Spawn Rate |
|--------|-------------|------------|
| Common | 16 | 30% |
| Uncommon | 10 | 22% |
| Rare | 8 | 17% |
| Epic | 5 | 13% |
| Legendary | 4 | 8% |
| Mythic | 3 | 5% |
| Ancient | 2 | 3% |
| Void | 2 | 2% |

**50 traits per slot x 6 slots = 300 traits. 15.6 billion possible combinations.**

## Catching

- **Energy** is your single resource. Earn 1 every 30 minutes passively (max 30).
- **Cost** depends on trait rarity: all-common = 1E, mixed = 5-10E, all-rare = 13E+
- **Batches** spawn 2-4 creatures. You get **3 shared attempts** across the whole batch.
- **Escalating penalty**: each failed catch makes the next one 10% harder.

The tradeoff: spend your attempts on safe common catches (good merge fuel) or gamble on a rare creature that costs more energy and might fail?

## Merging

Sacrifice two creatures for a chance at producing one with better traits.

- **Both parents are consumed** regardless of outcome
- **Merge success rate** depends on trait modifiers:
  - **Stable** traits (most commons): boost success chance
  - **Volatile** traits (most rares): reduce success chance but increase mutation odds
  - **Catalyst** traits: bonus when paired with specific synergy partners
- **Mutation**: small chance each trait slot mutates up or down in rarity
- **Failure**: both creatures lost, nothing gained

A boring all-common creature is great merge fuel (+30% success). An all-rare trophy is nearly impossible to merge (-70% success). That's the game.

## Commands

| Slash Command | CLI | Description |
|---------------|-----|-------------|
| `/scan` | `termomon scan` | Show nearby batch with traits, catch rates, energy costs |
| `/catch [n]` | `termomon catch [n]` | Catch creature #N (costs energy + shared attempt) |
| `/merge [id1] [id2]` | `termomon merge [id1] [id2]` | Merge two creatures from collection |
| `/collection` | `termomon collection` | Your caught creatures with traits |
| `/energy` | `termomon energy` | Current energy level |
| `/status` | `termomon status` | Profile, stats, and progress |
| `/settings` | `termomon settings` | Configure game settings |

## Installation

### Claude Code Plugin

**From source (development):**

```bash
git clone https://github.com/amit221/termomon.git termomon
cd termomon
npm install
npm run build
claude --plugin-dir .
```

**Important:** `--plugin-dir` does **not** load hooks. To enable hooks during development (passive tick tracking and creature spawn notifications), add them manually to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      { "hooks": [{ "type": "command", "command": "node \"/path/to/termomon/scripts/tick-hook.js\"" }] }
    ],
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "node \"/path/to/termomon/scripts/tick-hook.js\"" }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "node \"/path/to/termomon/scripts/tick-hook.js\"" }] }
    ],
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "node \"/path/to/termomon/scripts/tick-hook.js\"" }] }
    ]
  }
}
```

Replace `/path/to/termomon` with the absolute path to your clone. When installed via a marketplace, hooks load automatically.

### Standalone CLI

```bash
git clone https://github.com/amit221/termomon.git termomon
cd termomon
npm install
npm run build
node dist/cli.js status
```

### npm (global)

```bash
npm install -g termomon
termomon status
```

## Data

Game state is saved to `~/.termomon/state.json`. Override with `TERMOMON_STATE_PATH` env var.

Existing v1 saves are automatically migrated to v2 (trait-based system). Old species collections are reset — you start fresh with the new system.

## Development

```bash
npm install
npm test            # Run 71 tests
npm run build       # Compile TypeScript
npm run test:watch  # Watch mode
```

## Architecture

```
Platform Adapters  (Claude Code hooks + skills)
       |
  Rendering Layer  (Simple Text, pluggable)
       |
    Game Engine    (Pure logic, no I/O)
       |
  Trait Config     (300 traits from traits.json)
       |
   Local State     (~/.termomon/state.json)
```

Engine modules are pure functions with injected RNG — fully testable and deterministic.

## Project Structure

```
config/
  balance.json            Game balance (batch, catch, energy, merge params)
  traits.json             300 trait definitions + synergy pairs
src/
  types.ts                All TypeScript types
  config/                 Trait loader, balance constants
  state/                  State persistence with v1→v2 migration
  engine/
    batch.ts              Batch spawning with trait generation
    catch.ts              Energy-based catching with escalating penalty
    energy.ts             Energy gain/spend/cost
    merge.ts              Merge with trait inheritance + mutation
    ticks.ts              Activity tracking, streaks
    game-engine.ts        Orchestrator
  renderers/              Display layer (simple text renderer)
  cli.ts                  CLI entry point
  mcp-server.ts           MCP server for Claude Code
skills/                   Slash command definitions
hooks/                    Hook event configuration
tests/                    71 tests across 7 suites
```

## License

MIT

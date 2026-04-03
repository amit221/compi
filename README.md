# Termomon

A terminal creature collection game inspired by Pokemon Go. Instead of traveling in the real world, your terminal activity spawns digital creatures you can catch, collect, and evolve.

The game runs passively in the background — hooks track your activity, creatures appear, and you interact through slash commands when you choose to. It never interrupts your workflow.

## Installation

### Option 1: npm (global CLI)

```bash
npm install -g termomon
termomon status
```

### Option 2: Claude Code Plugin

**From a marketplace:**

```bash
# Inside Claude Code:
/plugin marketplace add <owner>/<marketplace-repo>
/plugin install termomon
```

**From source (development):**

```bash
git clone <repo-url> termomon
cd termomon
npm install
npm run build

# Launch Claude Code with the plugin
claude --plugin-dir .
```

The `--plugin-dir .` flag loads the project root as a plugin. Hooks auto-track your activity and slash commands (`/scan`, `/catch`, etc.) become available.

To reload after changes: `/reload-plugins`

### Option 3: Standalone CLI from source

```bash
git clone <repo-url> termomon
cd termomon
npm install
npm run build
node dist/cli.js status
```

## How It Works

1. **You work normally** in your terminal / Claude Code
2. **Hooks fire silently** on your activity, accumulating "ticks"
3. **Creatures spawn** in the background based on your activity
4. **You check in when curious** — run `/scan` to see what's nearby, `/catch` to grab it

## Creatures

30 digital beings across 5 rarity tiers:

| Rarity | Stars | Spawn Rate | Examples |
|--------|-------|------------|---------|
| Common | * | ~45% | Glitchlet, Nullbyte, Blinkbit, Dustmote |
| Uncommon | ** | ~25% | Hexashade, Loopwyrm, Driftpixel, Staticling |
| Rare | *** | ~15% | Voidmoth, Flickerjack |
| Epic | **** | ~10% | Phantomcursor |
| Legendary | ***** | ~5% | Overflux |

Each creature has a base form and an evolved form. Catch duplicates to earn fragments, then evolve.

## Commands

In Claude Code, use slash commands. In standalone CLI, use `termomon <command>`.

| Slash Command | CLI | Description |
|---------------|-----|-------------|
| `/scan` | `termomon scan` | Show nearby creatures |
| `/catch [n]` | `termomon catch [n]` | Catch creature #N |
| `/collection` | `termomon collection` | Your caught creatures |
| `/inventory` | `termomon inventory` | Your items |
| `/evolve [id]` | `termomon evolve [id]` | Evolve a creature |
| `/status` | `termomon status` | Your profile and stats |
| `/settings` | `termomon settings` | Configure game settings |

Add `--json` to any CLI command for machine-readable output.

## Items

**Capture items** (used to catch creatures):
- **ByteTrap** — 1x catch rate, common drop
- **NetSnare** — 1.5x catch rate, uncommon
- **CoreLock** — 2x catch rate, rare

**Catalysts** (used for evolution):
- **Shard** — needed for rare evolutions
- **Prism** — needed for epic evolutions

Items come from passive activity drip, milestone rewards, and session completion.

## Data

Game state is saved to `~/.termomon/state.json`. Override with `TERMOMON_STATE_PATH` env var.

## Development

```bash
npm install
npm test            # Run 63 tests
npm run build       # Compile TypeScript
npm run test:watch  # Watch mode
```

## Architecture

```
Platform Adapters  (Claude Code hooks + skills)
       |
  Rendering Layer  (Simple Text for now, pluggable)
       |
    Game Engine    (Pure logic, no I/O)
       |
  Activity Tracker (Tick recording)
       |
   Local State     (~/.termomon/state.json)
```

The game engine is fully decoupled from rendering. Adding new renderers (rich terminal with animations, browser, dedicated terminal window) requires no engine changes.

## Project Structure

```
.claude-plugin/
  plugin.json             Claude Code plugin manifest
skills/                   Slash command skills (Claude Code)
hooks/
  hooks.json              Hook event configuration
scripts/
  tick-hook.js            Hook script for passive tick recording
src/
  types.ts                All TypeScript types
  config/                 Game data (creatures, items, balance constants)
  state/                  State persistence (JSON file)
  engine/                 Game logic (ticks, spawn, catch, evolve, inventory)
  renderers/              Display layer (simple text renderer)
  cli.ts                  CLI entry point
tests/                    63 tests covering all modules
```

## Publishing

### npm

```bash
npm login
npm publish
```

Users install with `npm install -g termomon`.

### Claude Code Marketplace

Create a marketplace repo with `.claude-plugin/marketplace.json`:

```json
{
  "name": "your-marketplace",
  "plugins": [
    {
      "name": "termomon",
      "source": {
        "source": "github",
        "repo": "<owner>/termomon"
      },
      "description": "Terminal creature collection game",
      "version": "0.1.0"
    }
  ]
}
```

Users add the marketplace and install:

```bash
/plugin marketplace add <owner>/<marketplace-repo>
/plugin install termomon
```

Or submit to the official marketplace at [claude.ai/settings/plugins/submit](https://claude.ai/settings/plugins/submit).

## License

MIT

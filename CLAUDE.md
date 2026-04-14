# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Compi is a terminal creature collection game (Pokemon Go-inspired) that runs as a Claude Code plugin, Cursor extension, or standalone CLI. Hooks track user activity as "ticks", creatures spawn passively, and players interact via slash commands:

`/scan`, `/catch`, `/collection`, `/breed`, `/breedable`, `/quest`, `/upgrade`, `/archive`, `/energy`, `/status`, `/settings`, `/create-species`, `/list`

Game state persists to `~/.compi/state.json` (override with `COMPI_STATE_PATH` env var). Current state version is v5.

## Commands

```bash
npm run build       # TypeScript type-check (tsc)
npm run build:all   # tsc + esbuild bundle
npm run bundle      # esbuild → scripts/ (bundled CLI + MCP servers)
npm test            # Run all tests (Jest with ts-jest)
npm run test:watch  # Watch mode
npm run dev         # tsc --watch
```

Run a single test file:
```bash
npx jest tests/engine/spawn.test.ts
```

## Architecture

The codebase follows a strict layered architecture — each layer depends only on the layer below it:

1. **Platform Adapters** — `hooks/hooks.json` fires `scripts/tick-hook.js` on Claude Code events (PostToolUse, UserPromptSubmit, Stop, SessionStart). `skills/` contains slash command definitions. Cursor support via `src/mcp-server-cursor.ts` with HTML rendering through MCP Apps iframes.
2. **Rendering Layer** — `src/renderers/` implements the `Renderer` interface: `SimpleTextRenderer` for CLI/Claude Code, `ansi-to-html.ts` for Cursor HTML output. Adding renderers requires no engine changes.
3. **Game Engine** — `src/engine/game-engine.ts` is the central orchestrator. It composes pure-logic modules:
   - `ticks.ts` — Time-based updates, streak tracking
   - `batch.ts` — Creature spawning with random species/colors/traits
   - `catch.ts` — Catch rate calculation and capture mechanics
   - `breed.ts` — Breeding system with trait inheritance
   - `quest.ts` — Quest lifecycle, team power, gold rewards
   - `upgrade.ts` — Trait rank upgrades using gold
   - `gold.ts` — Currency earn/spend
   - `energy.ts` — Energy regeneration and spending
   - `progression.ts` — XP, leveling, trait rank caps
   - `discovery.ts` — Species discovery tracking, XP bonuses
   - `advisor.ts` — Strategic gameplay suggestions and progress tracking
   - `rarity.ts` — Trait rarity scoring
   - `archive.ts` — Creature archival when collection limit reached
4. **State** — `src/state/state-manager.ts` handles JSON file persistence (includes v3→v4→v5 migrations).
5. **Config** — `src/config/` contains species definitions (`species.ts`), trait definitions (`traits.ts`), balance constants (`constants.ts`), and a config loader (`loader.ts`). Balance tuning lives in `config/balance.json`.

Key design rules:
- Engine modules are pure functions — they mutate the passed `GameState` object but perform no I/O, file access, or randomness (RNG is injected via `rng` parameter).
- All TypeScript types live in `src/types.ts` — this is the single source of truth for interfaces.
- `src/index.ts` is the public API barrel export.
- `src/cli.ts` is the standalone CLI entry point (uses yargs-style subcommands).
- `src/mcp-tools.ts` contains shared MCP tool registration used by both Claude Code and Cursor servers.

## Plugin Structure

- `.claude-plugin/plugin.json` — Plugin manifest for Claude Code (+ `marketplace.json` for listing)
- `hooks/hooks.json` — Hook event bindings (records ticks on user activity)
- `scripts/tick-hook.js` — Hook script that records a tick to game state
- `scripts/cli.js`, `scripts/mcp-server.js`, `scripts/mcp-server-cursor.js` — Bundled outputs
- `skills/` — Each subdirectory has a `SKILL.md` defining a slash command
- `scripts/cursor-install.sh` — Installation script for Cursor integration

## Game Systems

- **Economy**: Gold earned from quests (based on team power), spent on trait upgrades. Upgrade costs scale by rank: [3, 5, 9, 15, 24, 38, 55].
- **Breeding**: Two creatures combine traits to produce offspring with inherited genetics. `/breedable` shows valid pairs.
- **Quests**: Lock up to 3 creatures for 2 sessions, earn gold rewards. Power = sum of trait ranks.
- **Progression**: XP from catches (10), upgrades (8), quests (15), discoveries (20). Level-based species unlocks and trait rank caps.
- **Advisor**: Suggests next actions with priority/cost/reasoning. Modes: "autopilot" or "advisor".
- **Species**: 7 species defined in `config/species/` (compi, flikk, glich, jinx, monu, pyrax, whiski). New species can be created via `/create-species`.

## Testing

Tests mirror the `src/` structure under `tests/`. Jest uses `ts-jest` preset, test root is `tests/`, pattern is `**/*.test.ts`.

## Commit Messages

All commits MUST follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature (triggers minor version bump)
- `fix:` — bug fix (triggers patch version bump)
- `chore:`, `docs:`, `refactor:`, `test:`, `style:`, `ci:`, `build:`, `perf:` — no version bump
- Breaking changes: add `!` after the type (e.g. `feat!: ...`) or include `BREAKING CHANGE:` in the commit body (triggers major version bump)

Do **not** use `update:` or `enhance:` — these are not valid Conventional Commits and will be silently ignored by the release pipeline.

Releases are fully automated by `release-please` on push to master. See `docs/superpowers/specs/2026-04-11-release-pipeline-design.md` for the design and `.github/workflows/release.yml` for the workflow.

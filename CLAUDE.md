# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Compi is a terminal creature collection game (Pokemon Go-inspired) that runs as a Claude Code plugin, Cursor extension, or standalone CLI. Hooks track user activity as "ticks", creatures spawn passively, and players interact via a single command:

`/play`

The game presents randomized cards (catch or breed) each turn. Players pick a card by typing a letter (a/b/c) or skip (s). Each turn costs 1 energy; actions cost additional energy on top.

Game state persists to `~/.compi/state.json` (override with `COMPI_STATE_PATH` env var). Current state version is v7.

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
   - `batch.ts` — Creature spawning with random species/colors/traits (4-7 per batch)
   - `catch.ts` — Catch rate calculation and capture mechanics (uses slot.rarity)
   - `breed.ts` — Breeding system: parents survive, rarity upgrades, cross-species hybrids
   - `species-index.ts` — Species progress tracking (rarity tier discovery)
   - `energy.ts` — Energy regeneration and spending (only resource)
   - `progression.ts` — XP, leveling, rarity breeding caps by level
   - `discovery.ts` — Species discovery tracking, XP bonuses
   - `cards.ts` — Card-based UX: pool building, card drawing, card execution
   - `rarity.ts` — Trait rarity scoring
4. **State** — `src/state/state-manager.ts` handles JSON file persistence (includes v3→v4→v5→v6→v7 migrations).
5. **Config** — `src/config/` contains species definitions (`species.ts`), trait definitions (`traits.ts`), balance constants (`constants.ts`), and a config loader (`loader.ts`). Balance tuning lives in `config/balance.json`.

Key design rules:
- Engine modules are pure functions — they mutate the passed `GameState` object but perform no I/O, file access, or randomness (RNG is injected via `rng` parameter).
- All TypeScript types live in `src/types.ts` — this is the single source of truth for interfaces.
- `src/index.ts` is the public API barrel export.
- `src/cli.ts` is the standalone CLI entry point (single `play` command).
- `src/mcp-tools.ts` contains two MCP tools: `play` (the game) and `register_hybrid` (for cross-species breeding).

## Plugin Structure

- `.claude-plugin/plugin.json` — Plugin manifest for Claude Code (+ `marketplace.json` for listing)
- `hooks/hooks.json` — Hook event bindings (records ticks on user activity)
- `scripts/tick-hook.js` — Hook script that records a tick to game state
- `scripts/cli.js`, `scripts/mcp-server.js`, `scripts/mcp-server-cursor.js` — Bundled outputs
- `skills/` — Each subdirectory has a `SKILL.md` defining a slash command
- `scripts/cursor-install.sh` — Installation script for Cursor integration

## Game Systems

- **Rarity**: 8-color system — grey (Common), white (Uncommon), green (Rare), cyan (Superior), blue (Elite), magenta (Epic), yellow (Legendary), red (Mythic). Each trait has an independent rarity color. Color = how good, trait = what it looks like.
- **Breeding**: Any creature breeds with any creature. Parents survive (not consumed). Same trait in a slot = 35% chance to upgrade rarity. Cross-species = hybrid species born. Max 3 breeds per session with pair cooldown.
- **Hybrid Species**: Cross-species breeding creates new species. The AI generates name/art/description via `register_hybrid` tool. Hybrids can breed with parent species or other same hybrids.
- **Species Index**: `/species` tracks rarity tier discovery per species (8 tiers). Fill all tiers for mastery.
- **Progression**: XP from catches (10), breeds (25), hybrid creation (50), discoveries (20), tier discoveries (10). Leveling gates max breedable rarity (level 1-2 = Uncommon cap, level 13+ = Mythic).
- **Energy**: Only resource. Max 30, regenerates 1 per 30 min, +5 session bonus. Catching costs 1-5 (by rarity), breeding costs 3-11 (by parent rarity).
- **Card System (v7)**: `/play` draws 1-3 cards randomly from available actions. Catch cards show creature art, traits, cost, catch rate. Breed cards show both parents with slot comparison and upgrade chances. Every turn costs 1 energy base; actions add their own cost on top. Skip costs 1 energy.
- **Species**: 7 base species defined in `config/species/` (compi, flikk, glich, jinx, monu, pyrax, whiski). New species created through cross-species breeding.

## Removed Systems (v7)

The following were removed in the v6→v7 overhaul:
- **Multiple commands** — replaced by single `/play` card-based UX
- **Archive** — no collection limit, no archiving
- **Advisor/Companion** — card system replaces action suggestions
- **Scanning** — creatures appear as catch cards

## Removed Systems (v6)

The following were removed in the v5→v6 overhaul:
- **Gold** — no currency system
- **Quests** — breeding is the core loop
- **Upgrades** — trait improvement through breeding, not gold payments
- **Trait ranks** — `_rN` suffix system replaced by `slot.rarity` field (0-7)

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

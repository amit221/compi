# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Termomon is a terminal creature collection game (Pokemon Go-inspired) that runs as a Claude Code plugin or standalone CLI. Hooks track user activity as "ticks", creatures spawn passively, and players interact via slash commands (`/scan`, `/catch`, `/collection`, `/evolve`, `/status`, `/inventory`, `/settings`).

Game state persists to `~/.termomon/state.json` (override with `TERMOMON_STATE_PATH` env var).

## Commands

```bash
npm run build       # TypeScript → dist/ (tsc)
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

1. **Platform Adapters** — `hooks/hooks.json` fires `scripts/tick-hook.js` on Claude Code events (PostToolUse, UserPromptSubmit, Stop, SessionStart). `skills/` contains slash command definitions.
2. **Rendering Layer** — `src/renderers/` implements the `Renderer` interface. Currently only `SimpleTextRenderer`. Adding renderers requires no engine changes.
3. **Game Engine** — `src/engine/game-engine.ts` is the central orchestrator. It composes pure-logic modules: `ticks.ts`, `spawn.ts`, `catch.ts`, `evolution.ts`, `inventory.ts`. All engine functions take `GameState` + inputs and return results — no I/O.
4. **State** — `src/state/state-manager.ts` handles JSON file persistence.
5. **Config** — `src/config/` contains creature definitions, item definitions, and balance constants.

Key design rules:
- Engine modules are pure functions — they mutate the passed `GameState` object but perform no I/O, file access, or randomness (RNG is injected via `rng` parameter).
- All TypeScript types live in `src/types.ts` — this is the single source of truth for interfaces.
- `src/index.ts` is the public API barrel export.
- `src/cli.ts` is the standalone CLI entry point (uses yargs-style subcommands).

## Plugin Structure

- `.claude-plugin/plugin.json` — Plugin manifest for Claude Code
- `hooks/hooks.json` — Hook event bindings (records ticks on user activity)
- `scripts/tick-hook.js` — Hook script that records a tick to game state
- `skills/` — Each subdirectory has a `SKILL.md` defining a slash command

## Testing

Tests mirror the `src/` structure under `tests/`. Jest uses `ts-jest` preset, test root is `tests/`, pattern is `**/*.test.ts`.

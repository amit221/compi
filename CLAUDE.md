# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Compi is a terminal creature collection game (Pokemon Go-inspired) that runs as a Claude Code plugin or standalone CLI. Hooks track user activity as "ticks", creatures spawn passively, and players interact via slash commands (`/scan`, `/catch`, `/collection`, `/evolve`, `/status`, `/inventory`, `/settings`).

Game state persists to `~/.compi/state.json` (override with `COMPI_STATE_PATH` env var).

## Commands

```bash
npm run build       # TypeScript type-check (tsc)
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

## Commit Messages

All commits MUST follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature (triggers minor version bump)
- `fix:` — bug fix (triggers patch version bump)
- `chore:`, `docs:`, `refactor:`, `test:`, `style:`, `ci:`, `build:`, `perf:` — no version bump
- Breaking changes: add `!` after the type (e.g. `feat!: ...`) or include `BREAKING CHANGE:` in the commit body (triggers major version bump)

Do **not** use `update:` or `enhance:` — these are not valid Conventional Commits and will be silently ignored by the release pipeline.

Releases are fully automated by `release-please` on push to master. See `docs/superpowers/specs/2026-04-11-release-pipeline-design.md` for the design and `.github/workflows/release.yml` for the workflow.

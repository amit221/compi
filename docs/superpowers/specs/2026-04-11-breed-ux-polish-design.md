# Breed UX Polish: Trait-Score Table Design

**Date:** 2026-04-11
**Status:** Draft
**Supersedes parts of:** `2026-04-11-breed-ux-intuitive-design.md`

## Problem

After the first breed UX redesign shipped, user feedback identified three remaining issues:

1. **The list view is too bare.** `/breed` (list mode) prints names + partner counts but no trait detail. Users cannot compare creatures without running additional commands.
2. **The flow forces unnecessary steps.** `/breed N` (partner mode) is an extra screen between browsing and previewing. Users want fewer screens.
3. **The system recommends a "best pair".** Users want to decide *what to achieve* themselves — the system should surface data, not opinions.

A research-backed observation also applies: Nielsen Norman Group's work on comparison tables shows that compensatory decision-making breaks down past ~5–7 items. A flat list of 15 creatures is too many to compare at once, but **each species group is ≤5 creatures** — already inside the cognitive sweet spot. The redesign exploits this natural chunking.

## Goal

Replace the current `/breed` (list mode) and `/breed N` (partner mode) output with a **per-species mini-table** view that shows each creature's traits with individual rarity scores, visually anchored by a single species silhouette on the left. No recommendations, no "best pair", no success %. The user reads the table and decides.

The `/breed N M` preview screen stays rich — full art and per-slot inheritance odds — because that's where attribute-level detail belongs.

## Design

### 1. Top-level `/breed` output — species mini-tables

`/breed` (with no arguments) prints one section per species that has at least one breedable pair. Each section contains:

- A **species header** (bold species id, a count line, a horizontal divider).
- A **species silhouette** drawn on the left of the table. The silhouette is the art of one of the user's creatures of that species — specifically the first non-archived creature in the collection for that species — rendered in a single neutral grey (not rarity-coloured). It serves as a visual anchor for the species, not as a detail of any specific creature.
- A **mini-table** to the right of the silhouette. Columns: `#`, `NAME`, `LV`, `EYES`, `MOUTH`, `BODY`, `TAIL`. Rows: every non-archived creature of that species, listed in collection order with their 1-indexed `/collection` position in the `#` column.
- Each trait cell shows `Name [score]` where `score` is the 1–100 rarity score from `calculateTraitRarityScore`. The cell is colored by `calculateRarityColor` using the same 8-tier palette as `/collection`.

Example (colors noted in brackets for clarity):

```
  compi
  ────────────────────────────────────────────────────────────────────────

                   #    NAME      LV    EYES           MOUTH          BODY           TAIL
   [grey]○.○       ───  ────────  ──    ───────────    ───────────    ───────────    ───────────
   [grey](-)        1   Bolt       1    Pebble   [5]   Flat     [5]   Dots     [5]   Curl     [5]
   [grey]╱░░╲       2   Spark      2    Ring    [44]   Omega   [44]   Dots     [5]   Curl     [5]
   [grey]~~/        3   Zap        1    Starry  [72]   Flat     [5]   Gem     [72]   Wave    [72]
```

The silhouette is vertically centered against the table body (not the header). Exact vertical offset is a renderer choice.

### 2. What gets dropped

These stop existing in the top-level view:

- **No "best pair" highlight.** User decides.
- **No success percentage.** User decides by looking at the trait scores.
- **No partner-count column.** The species header already implies partner availability (if a creature appears in the table, it has at least one same-species partner).
- **No total top-pair ranking at the bottom.** Recommendations are gone.
- **No `/breed N` partner mode.** The one-argument form is removed from both the skill and the MCP tool. Only `/breed` (no args) and `/breed N M [--confirm]` (two args) remain.

### 3. Empty states

- **No breedable pairs at all** → same existing message: `"No breedable pairs yet — you need 2+ creatures of the same species. Use /scan and /catch to find more."`
- **Exactly one species has a single pair** → one section is still printed; there's no special-case text.

### 4. `/breed N M` preview screen changes

The existing `renderBreedPreview` is kept almost as-is, with two tiny updates:

- Each trait cell in the inheritance-odds table also shows the `[score]` of both candidate traits so users can see "rarer trait on the A side" at a glance. Current output only shows the percentage.
- The stale `/breed confirm to proceed` footer is already fixed (from the previous branch). No change needed.

Specifically, each inheritance row becomes:

```
    eyes    A: Starry [72] 42%    B: Prism [88] 58%
```

instead of the current:

```
    eyes   A: 42%  B: 58%
```

This is a minor edit to `renderBreedPreview` — it already receives `slotInheritance[]` which carries both variant definitions.

### 5. Skill file updates

- `skills/breed/SKILL.md` — drop the `/breed N` (one-number) branch from the instructions. Keep `/breed` and `/breed N M [--confirm]`.
- `skills/breedable/SKILL.md` — unchanged (it's still an alias for `/breed` with no args).
- `cursor-skills/breed/SKILL.md` — mirror the Claude Code update.

### 6. MCP tool updates

In `src/mcp-tools.ts`, `runBreedCommand` currently has a "partner mode" branch for `indexA !== undefined && indexB === undefined`. That branch is removed. The new mode matrix is:

- Neither index → **list mode** (new table output)
- Only `indexA` → **error**: "Pick two creatures. Run /breed alone to see all breedable creatures, or /breed N M to preview a pair."
- Both → **preview / execute** (unchanged except for the scored inheritance rows)

The `breed` tool schema drops `indexA?`-only semantics: the description still says both indexes are optional (to support no-args mode), but the handler explicitly rejects the one-arg case.

The tool-layer tests (`tests/mcp-tools/breed-tool.test.ts`) are updated:

- Remove the "partner mode" tests (was a valid path, now a validation error)
- Add a new "one-arg error" test
- Keep list / preview / execute tests

### 7. Engine changes

- `listPartnersFor` in `src/engine/breed.ts` becomes unused internally once the tool layer stops calling it. Keep the function (it's still exported, and future features may want it), but mark it as no-longer-called by the current flow — no dead-code deletion.

Wait — actually the skill may or may not still want it. If `/breed N` as a command is fully dropped, nothing calls `listPartnersFor`. Marking unused but keeping the export is defensible. Decision: **keep `listPartnersFor` exported**; it's a useful primitive even if the default UX doesn't use it.

- A new pure helper `buildBreedTable(state): BreedTable` in `src/engine/breed.ts` that returns the data needed to render the new top-level view. Shape:

```ts
interface BreedTableSpecies {
  speciesId: string;
  silhouette: CreatureSlot[]; // slots of the first non-archived creature of this species
  rows: Array<{
    creatureIndex: number;
    creature: CollectionCreature;
  }>;
}

interface BreedTable {
  species: BreedTableSpecies[]; // one entry per species with 2+ non-archived creatures
}
```

This helper is a thin wrapper around what `listBreedable` already does: group by species, collect all creatures of that species (not just those with `partnerCount > 0` — but since the species requires 2+ members for any to be breedable, that filter is equivalent to "species has ≥ 2 non-archived creatures").

### 8. Renderer changes

Two additions in `src/renderers/simple-text.ts`:

- New method `renderBreedTable(table: BreedTable): string` that produces the per-species mini-table output. Uses existing `calculateTraitRarityScore` / `calculateRarityColor` / species art template.
- Updated `renderBreedPreview` to include `[score]` next to each trait name in the inheritance rows.

The existing `renderBreedableList` and `renderBreedPartners` become **unused** by the live flow. Remove them (and their interface signatures) rather than leaving dead code. Their tests (`tests/renderers/breed-ux.test.ts`) are replaced by `renderBreedTable` tests.

### 9. Silhouette rendering

The species art template in `src/config/species/*.json` is a multi-line string with placeholders like `EE`, `MM`, `BB`, `TT` for the slots. To render a silhouette:

1. Pick the first non-archived creature of the species in collection order.
2. Use its slot art as the placeholder fills (so the silhouette is an actual recognizable creature from the user's collection, not a generic template).
3. Color the entire rendered silhouette with a single neutral grey ANSI code, overriding per-slot rarity colors.

This matches the user's phrasing: "pick one from the user and make it grey".

### 10. Width and layout

The silhouette is ~13 chars wide (matching the existing `ART_WIDTH`). The table to the right needs ~70 chars for 5 columns including traits with score brackets. Total width ~85–90 chars. This is wider than the existing 80-char default but terminal width is generally ≥80 today and the game already uses wider output in `/scan` and `/collection`.

If the user's terminal is narrower, the output line-wraps at the terminal boundary — acceptable given the target is a development-tool terminal (typically ≥100 cols wide).

## Scope

- No changes to engine breeding logic, inheritance odds, energy costs, creature/slot shape, or config.
- No changes to the `/breed N M --confirm` execute path.
- No changes to the Cursor plugin beyond the parallel skill update and the fact that both use the same `runBreedCommand`.

## Testing

- Unit tests for the new `buildBreedTable` in `tests/engine/breed-listing.test.ts`: empty collection, single-species collection, multi-species collection, archived exclusion, silhouette picking (first non-archived).
- Renderer tests in `tests/renderers/breed-ux.test.ts`: replace the existing `renderBreedableList` / `renderBreedPartners` tests with `renderBreedTable` tests covering trait scores, silhouette grey coloring, and correct section count.
- Tool-layer tests in `tests/mcp-tools/breed-tool.test.ts`: remove partner-mode tests, add one-arg-error test.
- Update the `renderBreedPreview` snapshot / assertion in `tests/renderers/simple-text.test.ts` if it checks the inheritance row text — the new output includes `[score]` next to each variant name.
- Regression: existing `tests/engine/breed.test.ts` stays untouched.

## Out of scope

- Sorting / filtering the mini-tables by trait score. (Future enhancement if asked for.)
- Showing a per-creature "best partner" hint inline. (User explicitly rejected this.)
- A tabular matrix of pair-quality (was Layout G in brainstorming — rejected).
- Redesigning the `/breed N M` preview beyond adding `[score]` labels.
- Animated transitions or interactive keyboard navigation (still a plain one-shot text renderer).

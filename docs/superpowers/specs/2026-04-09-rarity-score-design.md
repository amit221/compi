# Rarity Score Design

## Overview

Add a 1-100 rarity score to every creature that combines trait rarity and color rarity into a single readable number. Scores are shown per-slot and per-creature across all display surfaces (`/scan`, `/collection`, `/catch`).

## Score Formula

### Slot Score

Each slot on a creature has one combined score:

```
slotScore = 0.8 * traitRarityScore + 0.2 * colorRarityScore
```

**Trait rarity score (1-100):** Percentile rank of the trait's `spawnRate` within all traits for that species+slot. The rarest trait in the pool = 100, the most common = lowest score. Calculated by ranking the trait among all traits in that slot pool by ascending `spawnRate`.

Formula:
```
traitRarityScore = ((rank - 1) / (totalTraitsInSlot - 1)) * 99 + 1
```
Where `rank` = position when traits are sorted by spawnRate ascending (rarest = highest rank). If only 1 trait in pool, score = 50.

**Color rarity score (1-100):** Percentile rank of the color's spawn weight among all colors. Uses the same ranking approach against the `colors` weights in `balance.json`.

| Color   | Weight | Score |
|---------|--------|-------|
| red     | 0.04   | 100   |
| yellow  | 0.08   | 80    |
| magenta | 0.13   | 60    |
| cyan    | 0.20   | 40    |
| white   | 0.25   | 20    |
| grey    | 0.30   | 1     |

### Creature Score

Average of all slot scores, rounded to nearest integer:

```
creatureScore = round(avg(slotScores))
```

## Display

### Per-slot display

Each slot shows the trait name, art, color, and slot score in brackets:

```
  eyes:  Ghost ✧.✧  red    [98]
  mouth: Purr ~~~   grey   [2]
  tail:  Drift ~¬   cyan   [44]
```

### Per-creature display

Creature name followed by a star and the overall score:

```
Whiski "Muffin"  ⭐ 54
```

### Surfaces

- `/scan` — show creature score next to each nearby creature, slot scores on detail rows
- `/collection` — show creature score next to each caught creature, slot scores on detail rows
- `/catch` result — show creature score and slot scores when a catch succeeds

## Architecture

### New module: `src/engine/rarity.ts`

Pure function module (no I/O, follows engine layer conventions):

- `calculateSlotScore(speciesId: string, slot: CreatureSlot): number` — returns 1-100 slot score
- `calculateCreatureScore(speciesId: string, slots: CreatureSlot[]): number` — returns 1-100 creature score (average of slot scores)
- `calculateTraitRarityScore(speciesId: string, slotId: SlotId, variantId: string): number` — returns 1-100 trait percentile
- `calculateColorRarityScore(color: CreatureColor): number` — returns 1-100 color percentile

### Dependencies

- Reads trait pools from species config via `getSpeciesById()` to rank traits
- Reads color weights from `balance.json` via `loadConfig()` to rank colors
- No new config keys needed — uses existing `spawnRate` on traits and `colors` weights

### Renderer changes

Update `SimpleTextRenderer` to include scores in creature display output for scan, collection, and catch results.

### Export

Add `calculateCreatureScore` and `calculateSlotScore` to `src/index.ts` barrel export.

## Testing

- Unit tests for `rarity.ts` covering:
  - Trait with lowest spawnRate in pool gets score near 100
  - Trait with highest spawnRate gets score near 1
  - Red color = 100, grey = 1
  - Slot score applies 80/20 weighting correctly
  - Creature score averages slot scores correctly
  - Edge case: single-trait pool returns 50
- Renderer tests verify score appears in scan/collection/catch output

# Breeding System Overhaul — Design Spec

## Goal

Replace gold, quests, and upgrades with a breeding-focused game loop. Creatures breed to produce offspring with upgraded trait rarities and cross-species hybrids. Simple to start, deep over time.

## Reference

GENEX prototype (`Downloads/genex.html`) — the experience benchmark. The terminal implementation should match its scan→catch→breed→discover pacing and feel.

## What's Removed

| System | Files to Delete/Modify |
|--------|----------------------|
| Gold | `src/engine/gold.ts` (delete), remove `state.gold` from types |
| Quests | `src/engine/quest.ts` (delete), remove `state.activeQuest`, `profile.totalQuests` |
| Upgrades | `src/engine/upgrade.ts` (delete), remove `state.sessionUpgradeCount`, `profile.totalUpgrades` |
| Trait ranks | Remove `_rN` suffix system from variant IDs. A trait is just its ID + rarity color. |
| Skills | Delete `/upgrade` and `/quest` skills |

## What's Kept (Unchanged)

- Energy system (regen, session bonus, spending)
- Catch mechanics (scan, batch spawning, catch rate, fail penalty)
- Collection (15 max) + archive
- Progression/XP system (level, XP thresholds, level-up)
- Discovery tracking
- Species art frames and slot-based trait system
- `/scan`, `/catch`, `/collection`, `/archive`, `/energy`, `/status`, `/settings`, `/create-species`

## Core Loop

```
/scan   → see nearby creatures (species + traits with rarity colors)
/catch  → capture one (costs energy)
/breed  → pick two from collection → child appears
         same species: trait inheritance + rarity upgrade chance
         diff species: AI generates hybrid via /create-species
/collection → view your creatures
/species    → (new) track rarity tier progress per species
```

## Traits & Rarity

### Slot-Based Traits

Each creature has 4 slots: eyes, mouth, body, tail. Each slot has a trait drawn from the species' pool. This stays exactly as it is now.

### Color = Rarity (Per Trait)

Each trait has its own rarity, shown by its color. Same trait name can appear at any rarity. The trait is the WHAT, the color is the HOW GOOD.

| Color | Rarity | Catch Spawn Weight |
|-------|--------|-------------------|
| grey | Common | 50% |
| green | Uncommon | 28% |
| cyan | Rare | 14% |
| magenta | Epic | 6% |
| yellow | Legendary | 2% |

A creature's 4 traits each have independent rarity colors. Example:

```
   ·.·              Compi
  ( ω  )
  /░░░░\
   ~~/

  Pebble Gaze   Omega      Dots       Curl
    (cyan)     (magenta)   (grey)    (green)
```

This creature has a rare eyes, epic mouth, common body, uncommon tail.

### No More Trait Ranks

Current system: `eye_c01_r3` (trait + rank suffix). New system: `eye_c01` + separate rarity color. The rank suffix is removed entirely. Rarity is a separate field on the slot, not part of the variant ID.

### Creature Display Color

The creature's overall display color = the color of its highest-rarity trait. This creature would display as magenta (its epic mouth is the highest).

## Species

### The 7 Base Species Stay

Compi, Pyrax, Flikk, Glich, Jinx, Monu, Whiski — all keep their:
- ASCII art frames
- Slot zone mappings
- Trait pools (per slot)
- Spawn weights

Species-specific trait IDs (`flk_eye_01`, `pyr_bod_03`) stay as-is. Each species keeps its unique trait pool. No generic shared pool.

### Any Creature Breeds With Any Creature

No species restriction on breeding. Same-species pairs get a bonus (higher upgrade chance). Cross-species pairs create hybrids.

## Breeding

### Same-Species Breeding

Each slot resolves independently:

**Both parents have the same trait in a slot:**
- Child gets that trait
- Rarity upgrade chance: **35%** to go up one tier
- If either parent has higher rarity, child gets the higher rarity, **15%** chance to go up further
- Can't exceed Legendary

**Parents have different traits in a slot:**
- 50/50 which trait the child gets
- Child keeps that parent's rarity for that slot
- **10%** chance to upgrade rarity by one tier (same-species bonus)

### Cross-Species Breeding → Hybrid

When parents are different species:

1. Game calls `/create-species` in **breed mode** with parent context
2. AI generates:
   - New species name (AI-generated, not a portmanteau)
   - New ASCII art frame (blending both parents' aesthetics)
   - Trait pool = union of both parents' species trait pools
   - Description/flavor text
3. Child is born as the new hybrid species
4. Per-slot trait resolution works the same as same-species, except:
   - Upgrade chance is **20%** for matching traits (no same-species bonus)
   - **5%** for non-matching traits
5. New species is registered in state and appears in species index
6. Future breeds with this hybrid follow normal rules (it's now a full species)

### Breeding Rules

| Rule | Value |
|------|-------|
| Parents survive | Yes — not consumed |
| Cooldown | Same pair can't breed for 1 session |
| Max breeds per session | 3 |
| Energy cost | 3 base + 1 per uncommon+ trait across both parents (range 3-11) |
| Child generation | max(parentA.gen, parentB.gen) + 1 |
| XP earned | 25 per breed (same as now) |
| Cross-species XP bonus | +25 (50 total for hybrid creation) |

### `/create-species` Breed Mode

The existing skill gets a new mode. When invoked in breed mode, it receives:

```
Parent A: { species, art, traits with rarities }
Parent B: { species, art, traits with rarities }
Mode: "breed"
Instruction: "Create a hybrid species blending {speciesA} and {speciesB}. 
  Generate ASCII art (3-4 lines) that combines visual elements from both parents.
  Name the species. Write one line of description.
  The trait pool should combine both parents' trait pools."
```

The AI returns a species definition in the same JSON format as existing species files. This gets saved to `state.personalSpecies[]`.

### Manual Mode Stays

Players can still use `/create-species` manually to design species from scratch (current behavior). This is separate from breed mode.

## Species Index

New command: `/species` — shows discovery progress.

Per species, tracks which rarity tiers the player has seen on ANY trait of that species:

```
SPECIES INDEX

  Compi          3/5 tiers    ● ● ● ○ ○
                               C U R E L

  Pyrax          2/5 tiers    ● ● ○ ○ ○
                               C U R E L

  Felavian       1/5 tiers    ● ○ ○ ○ ○
  (Hybrid)                     C U R E L
```

A tier is "discovered" when the player has caught OR bred a creature of that species with at least one trait at that rarity level. This is cumulative — once discovered, it stays.

Implementation: `state.speciesProgress: Record<string, boolean[]>` — maps speciesId to array of 5 booleans (one per rarity tier).

## Energy Economy

| Parameter | Old | New | Reason |
|-----------|-----|-----|--------|
| maxEnergy | 30 | 30 | Keep |
| gainInterval | 30 min | 30 min | Keep |
| sessionBonus | 3 | 5 | Compensate for removed quest income |
| startEnergy | 10 | 15 | Better new player start |
| catchCost | 1-5 | 1-5 | Keep current formula |
| breedCost | 3-8 (old merge) | 3-11 | New formula: 3 + uncommon+ trait count |
| maxBreedsPerSession | N/A | 3 | New limit |

## XP Sources (Updated)

| Action | XP | Change |
|--------|-----|--------|
| Catch | 10 | Same |
| Breed (same species) | 25 | Same |
| Breed (cross species / hybrid) | 50 | New — bonus for hybrid creation |
| Discovery (new species) | 20 | Same — also applies to hybrids |
| Tier discovery (new rarity tier for a species) | 10 | New — per species progress |

Removed: xpPerUpgrade (8), xpPerQuest (15).

## State Migration (v5 → v6)

### New Fields

```typescript
// On GameState
speciesProgress: Record<string, boolean[]>  // speciesId → [com,unc,rar,epi,leg]
personalSpecies: SpeciesDefinition[]        // AI-generated hybrid species
sessionBreedCount: number                   // reset each session, max 3
breedCooldowns: Record<string, number>      // "idA+idB" → cooldown expiry timestamp

// On CreatureSlot
rarity: number  // 0-4 index into rarity table (replaces rank in variantId)
```

### Removed Fields

```typescript
// From GameState
gold: number
activeQuest: ActiveQuest | null
sessionUpgradeCount: number

// From PlayerProfile
totalUpgrades: number
totalQuests: number
```

### Changed Fields

```typescript
// CreatureSlot.variantId — strip _rN suffix if present
// e.g. "eye_c01_r3" → "eye_c01" (rank info moves to slot.rarity)
```

### Migration Logic

For existing creatures:
1. Extract rank from variantId suffix → map to rarity (rank 0-1 = common, 2-3 = uncommon, 4-5 = rare, 6 = epic, 7 = legendary)
2. Strip `_rN` suffix from variantId
3. Set `slot.rarity` from extracted rank
4. Initialize `speciesProgress` from existing collection (scan all creatures, mark discovered tiers)
5. Set `gold = undefined`, `activeQuest = undefined`
6. Set `sessionBreedCount = 0`, `breedCooldowns = {}`
7. Set `personalSpecies = []`

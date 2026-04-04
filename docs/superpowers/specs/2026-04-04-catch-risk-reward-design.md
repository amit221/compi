# Catch Risk/Reward Redesign

## Problem

The current catch system has no meaningful tradeoffs. Players always target the rarest creature, and failure has negligible cost (1 basic item). There is no strategy, risk/reward, or anticipation.

## Solution Overview

Replace the current species-based collection system with a **single-creature, trait-based system** inspired by CryptoKitties. Every creature is the same species (axolotl) but with randomized traits that determine its value. Add a **merge system** where players sacrifice two creatures for a chance at a better one — with the risk of losing both.

## Core Concepts

### Single Creature Type

All creatures are the same base species (axolotl, using cat placeholder art until final art is designed). Value comes entirely from **traits**, not species.

### Trait System

Every creature has **6 trait slots**. Each trait has a **rarity tier** and a **merge modifier**.

**Trait Slots:**
- Eyes (visual: changes eye characters in art)
- Mouth (visual: changes mouth character in art)
- Tail (visual: changes tail character in art)
- Gills (visual: changes gill characters on sides)
- Pattern (visual: body markings/decorations)
- Aura (visual: decorative frame around creature)

**Rarity Tiers (pyramid distribution):**

| Rarity | Traits per Slot | Spawn Weight |
|---|---|---|
| Common | 16 | 30% |
| Uncommon | 10 | 22% |
| Rare | 8 | 17% |
| Epic | 5 | 13% |
| Legendary | 4 | 8% |
| Mythic | 3 | 5% |
| Ancient | 2 | 3% |
| Void | 2 | 2% |
| **Total** | **50 per slot** | **100%** |

**6 slots × 50 traits = 300 total traits. 50⁶ ≈ 15.6 billion possible combinations.**

Full trait reference: `2026-04-04-catch-traits-reference.csv`.

**Sample Traits (full 300-trait reference in CSV):**

#### Eyes Slot (50 traits)
| Rarity | Sample Traits | Art Examples |
|---|---|---|
| Common (16) | Dot, Dash, Bead, Sleepy, Squint, Blink, Round, Oval, Pebble, Button, Seed, Grain, Simple, Plain, Basic, Soft | o.o  -.–  •.•  -.- |
| Uncommon (10) | Wide, Wink, Bright, Alert, Curious, Keen, Sharp, Gleam, Spark, Focus | ◉.◉  ◉.o  °.° |
| Rare (8) | Star, Cross, Diamond, Flame, Storm, Crystal, Prism, Flash | ★.★  ×.×  ◆.◆ |
| Epic (5) | Void, Glitch, Nebula, Eclipse, Phantom | ⊙.⊙  ⊘.⊘  ⊛.⊛ |
| Legendary (4) | Cosmos, Infinity, Singularity, Omega | ∞.∞  Ω.Ω |
| Mythic (3) | Timeless, Primordial, Eternal | ✧.✧  ☽.☾ |
| Ancient (2) | Genesis, Origin | ◈.◈  ❖.❖ |
| Void (2) | Null, Oblivion | ∅.∅  ⊬.⊬ |

#### Additional Slots (Mouth, Tail, Gills, Pattern, Aura)
Each follows the same 16/10/8/5/4/3/2/2 pyramid structure. Full definitions in `2026-04-04-catch-traits-reference.csv`.

**Merge Modifier Types:**
- **Stable**: +0.03 to +0.08 merge success. Decreases mutation chance by 0.02-0.04 per trait. Safe, predictable. Most common/uncommon traits.
- **Volatile**: -0.05 to -0.15 merge success. Increases mutation chance by 0.03-0.08 per trait. Risky but chaotic. Most epic+ traits.
- **Catalyst**: +0.05 to +0.15 merge success. Bonus increases further when paired with a specific synergy partner. Spread across all rarities.

**Modifier value ranges by rarity:**

| Rarity | Stable Range | Volatile Range | Catalyst Range |
|---|---|---|---|
| Common | +0.06 to +0.08 | n/a | +0.05 to +0.07 |
| Uncommon | +0.05 to +0.07 | -0.05 to -0.06 | +0.06 to +0.08 |
| Rare | +0.04 to +0.06 | -0.06 to -0.08 | +0.07 to +0.10 |
| Epic | +0.03 to +0.05 | -0.08 to -0.10 | +0.08 to +0.12 |
| Legendary | n/a | -0.10 to -0.12 | +0.10 to +0.13 |
| Mythic | n/a | -0.12 to -0.13 | +0.12 to +0.15 |
| Ancient | n/a | -0.13 to -0.15 | +0.13 to +0.15 |
| Void | n/a | -0.15 | +0.15 |

Note: With 12 traits total across 2 parents (6 slots each), modifier sums range from roughly +0.96 (all max stable) to -1.80 (all max volatile). Base merge rate of 0.50 means all-stable caps at 0.90 and all-volatile floors at 0.05.

**Catalyst Synergies:**
Synergy pairs are defined in the trait reference CSV. When both traits of a synergy pair are present across the two parents being merged, an additional bonus (+0.05 to +0.20) is applied to merge success rate. There are approximately 30 synergy pairs spread across all slots and rarities.

### Composable Art

The creature art template has swappable regions for each trait slot. Traits change the visual characters in their region. Example using cat placeholder:

```
 /\_/\       /\_/\       /\_/\
( o.o )     ( ◉.◉ )     ( ★.★ )
 ( w )       ( △ )       ( ⚡)
  ~~~         ~~~         ~✦~
```

Art design (final axolotl art with composable regions) is a separate task from the mechanics implementation.

## Catching

### Energy Resource

- **Single resource: Energy**
- Earn 1 Energy passively every 30 minutes
- Catching costs Energy based on the creature's trait rarity
- Cost formula: sum of trait rarity values (Common=0, Uncommon=1, Rare=2, Legendary=3) across all 6 slots, then add 1. Range: 1 energy (all common, 0+1) to 13 energy (all legendary, 12+1). Examples: all-common=1E, two uncommon+two common=3E, one rare+three common=3E, all-rare=9E

**Energy Cost Formula:**
```
energy_cost = 1 + sum(rarity_value for each of 6 trait slots)
  where: Common=0, Uncommon=1, Rare=2, Epic=3, Legendary=4, Mythic=5, Ancient=6, Void=7
```

**Energy Cost Table:**
| Traits (6 slots) | Rarity Sum | Energy Cost |
|---|---|---|
| 6× Common | 0 | **1** |
| 4C + 2U | 2 | **3** |
| 6× Uncommon | 6 | **7** |
| 3U + 3R | 9 | **10** |
| 6× Rare | 12 | **13** |
| 6× Epic | 18 | **19** |
| 6× Legendary | 24 | **25** |
| 6× Mythic | 30 | **31** |
| 6× Ancient | 36 | **37** |
| 6× Void | 42 | **43** |
| Typical mixed (3C+2U+1R) | 4 | **5** |
| Good mixed (2C+2U+1R+1E) | 7 | **8** |

**Energy Economy:**
| Parameter | Value |
|---|---|
| Gain rate | 1 per 30 minutes (passive) |
| Max cap | 30 |
| Starting energy | 5 |
| Session end bonus | +1 |
| 3-day streak bonus | +3 (one-time) |
| 7-day streak bonus | +5 (one-time) |
| 30-day streak bonus | +10 (one-time) |

Replaces the current multi-item system (ByteTrap, NetSnare, CoreLock).

### Batch Spawning

- Creatures spawn in **batches** of 2-4 (weighted: 2=40%, 3=40%, 4=20%)
- Each creature in a batch gets random traits rolled independently
- Batch frequency: approximately every 10 ticks (same as current spawn check interval)
- Batch timeout: 30 minutes (same as current creature linger)

### Shared Attempts

- Each batch has **3 shared attempts** — total across ALL creatures in the batch
- Each catch attempt uses 1 attempt from the pool
- You can retry the same creature (costs another shared attempt)
- When attempts run out or batch times out, all uncaught creatures flee

### Escalating Failure Penalty

- Each **failed** catch attempt in a batch increases the fail chance for subsequent attempts
- Penalty per failure: +10% added to fail chance (i.e., -10% to catch rate)
- Penalty resets when a new batch spawns
- This means: failing on a rare creature first makes catching the easy ones harder too

### Catch Rate Formula

```
BASE_CATCH_RATE = 0.80

trait_penalty = sum of per-trait penalties across 6 slots:
  Common    = 0.00
  Uncommon  = 0.02
  Rare      = 0.04
  Epic      = 0.06
  Legendary = 0.08
  Mythic    = 0.10
  Ancient   = 0.12
  Void      = 0.14

fail_penalty = failed_attempts_in_batch × 0.10

effective_rate = clamp(BASE_CATCH_RATE - trait_penalty - fail_penalty, 0.05, 0.95)
```

**Catch Rate Table (by trait combo and fail count):**

| Traits (6 slots) | Trait Penalty | 0 fails | 1 fail | 2 fails |
|---|---|---|---|---|
| 6× Common | 0.00 | **80%** | 70% | 60% |
| 4C + 2U | 0.04 | **76%** | 66% | 56% |
| 6× Uncommon | 0.12 | **68%** | 58% | 48% |
| 3U + 3R | 0.18 | **62%** | 52% | 42% |
| 6× Rare | 0.24 | **56%** | 46% | 36% |
| 6× Epic | 0.36 | **44%** | 34% | 24% |
| 6× Legendary | 0.48 | **32%** | 22% | 12% |
| 6× Mythic | 0.60 | **20%** | 10% | 5% (floor) |
| 6× Ancient | 0.72 | **8%** | 5% (floor) | 5% (floor) |
| 6× Void | 0.84 | **5%** (floor) | 5% | 5% |

### Example Scenario

```
Batch spawns: 3 creatures. You have 8 Energy, 3 Attempts.

#1: 6× Common traits                       → Cost: 1E, Rate: 80%
#2: 3C + 2U + 1R (mixed)                   → Cost: 5E, Rate: 70%
#3: 2U + 2R + 1E + 1L (stacked)            → Cost: 14E, Rate: 48%

Strategy A (safe merge fuel):
  Attempt 1: Catch #1 (1E, 80%) → success → 7E left, 2 attempts
  Attempt 2: Catch #2 (5E, 70%) → success → 2E left, 1 attempt
  Attempt 3: Can't afford #3 (14E). Done. Got 2 merge ingredients.

Strategy B (go big):
  Attempt 1: Try #3 (14E... can't afford!) → must catch cheaper ones first
  
Strategy C (balanced):
  Attempt 1: Catch #1 (1E, 80%) → success → 7E left, 2 attempts
  Attempt 2: Try #2 (5E, 70%) → miss → 2E left, 1 attempt, +10% penalty
  Attempt 3: Only 2E left. Can catch #1-type if new batch, or save for later.
```

## Merging

### Core Loop

- Player selects 2 creatures from their collection to merge
- **Both creatures are consumed** (removed from collection)
- Merge has a **chance to fail** — if it fails, both creatures are lost with no output
- If it succeeds, produces 1 new creature with traits derived from the parents

### Merge Success Rate Formula

```
BASE_MERGE_RATE = 0.50

modifier_sum = sum of merge_modifier_value for ALL 12 traits (6 per parent)
synergy_bonus = sum of catalyst synergy bonuses (if matching pairs found across parents)

effective_merge_rate = clamp(BASE_MERGE_RATE + modifier_sum + synergy_bonus, 0.05, 0.90)
```

**Merge Rate Table (common scenarios):**

| Parent A | Parent B | Modifier Sum | Synergy | Effective Rate |
|---|---|---|---|---|
| 4× stable (+0.10 each) | 4× stable (+0.10 each) | +0.80 | 0 | **90%** (cap) |
| 4× stable (+0.10) | 2× stable + 2× catalyst | ~+0.60 | +0.10-0.25 | **90%** (cap) |
| 4× stable (+0.10) | 4× volatile (-0.15) | -0.20 | 0 | **30%** |
| Mixed typical | Mixed typical | ~+0.00 | 0 | **50%** |
| 2× stable + 2× volatile | 2× stable + 2× volatile | -0.20 | 0 | **30%** |
| 4× volatile (-0.15) | 4× volatile (-0.15) | -1.20 | 0 | **5%** (floor) |

### Trait Inheritance Formula (per slot)

On a successful merge, each of the 6 trait slots is resolved independently:

```
Step 1: Calculate mutation chance for this slot
  BASE_MUTATION = 0.08
  volatile_count = number of volatile traits among the two parents' traits for this slot (0, 1, or 2)
  stable_count = number of stable traits among the two parents' traits for this slot (0, 1, or 2)
  
  mutation_chance = clamp(BASE_MUTATION + (volatile_count × 0.07) - (stable_count × 0.04), 0.01, 0.30)

Step 2: Roll for mutation
  if random() < mutation_chance:
    if random() < 0.75:  → mutation UP (output rarity = rarer parent + 1 tier)
      if random() < 0.25:  → DOUBLE mutation up (+2 tiers instead of +1)
    else:  → mutation DOWN (output rarity = rarer parent - 1 tier)
    Pick a random trait of the resulting rarity from this slot's variants

Step 3: If no mutation, inherit from a parent
  rarer_parent_weight = 0.55
  other_parent_weight = 0.30
  same_rarity_random  = 0.15  (pick random trait of same rarity tier — allows getting a DIFFERENT trait of same rarity)
  
  Roll weighted random → pick the winning parent's trait for this slot
```

**Mutation Chance by Context:**

| Slot Context | Volatile Count | Stable Count | Mutation Chance |
|---|---|---|---|
| Both parents stable | 0 | 2 | 0.08 - 0.08 = **1%** (floor) |
| One stable, one neutral | 0 | 1 | 0.08 - 0.04 = **4%** |
| Both neutral | 0 | 0 | **8%** (base) |
| One volatile, one neutral | 1 | 0 | 0.08 + 0.07 = **15%** |
| Both volatile | 2 | 0 | 0.08 + 0.14 = **22%** |
| One stable, one volatile | 1 | 1 | 0.08 + 0.07 - 0.04 = **11%** |

**Inheritance Examples:**

```
Example 1: Common + Common (both stable)
  Mutation chance: 1%
  99% of the time: Common trait (55% parent A, 30% parent B, 15% random common)
  0.75%: Uncommon (mutation up)
  0.19%: Rare (double mutation up)
  0.25%: stays Common (mutation down hits floor)

Example 2: Rare + Common (both volatile)
  Mutation chance: 22%
  78%: inherit → 55% Rare, 30% Common, 15% random same-tier
  16.5%: Legendary (mutation up from rare)
  4.1%: ??? (double mutation — off the charts, wrap to legendary)
  5.5%: Uncommon (mutation down from rare)

Example 3: Common + Common (both volatile)
  Mutation chance: 22%
  78%: Common trait
  16.5%: Uncommon (mutation up)
  4.1%: Rare (double mutation up!)
  1.4%: stays Common (mutation down hits floor)
  → The "lottery ticket" — two trash commons with volatile traits
    have a ~4% chance of producing a Rare
```

**Key properties of this system:**
- Two commons can produce a rare (~2-4% depending on volatility) — the "lottery ticket"
- Rarer inputs bias toward rarer outputs but never guarantee them
- Volatile traits are double-edged: worse merge success but wilder mutation outcomes
- Stable traits are predictable: better merge success but output stays close to input rarity
- Every merge is a surprise — you can learn tendencies but never memorize exact outcomes
- With 50 traits per slot × 6 slots, there are 50⁶ ≈ 15.6 billion possible trait combinations — impossible to memorize

### Volatile vs Stable Tradeoff in Merging

This creates a meta-game around creature value:

- **All-stable creature**: High merge success rate (+30%), low mutation. Great "safe" ingredient. Boring traits but reliable.
- **All-volatile creature**: Very low merge success rate (-70%), high mutation. Terrible merge ingredient but if it somehow succeeds, wild results. Better as a trophy/collector piece.
- **Mixed creatures**: The interesting middle ground — some stable traits for safety, some volatile for potential.

## What This Replaces

| Current System | New System |
|---|---|
| 16 named creature species | 1 creature type with trait combos |
| Fragment-based evolution | Merge system (sacrifice 2 for 1) |
| 3 capture item types | Single Energy resource |
| 3 attempts per creature | 3 shared attempts per batch |
| No fail penalty | Escalating fail chance per batch |
| 4 rarity tiers | 8 rarity tiers (pyramid distribution) |
| Species rarity determines value | Trait combo determines value (15.6B combos) |
| Deterministic evolution (collect N fragments) | Probabilistic merging with mutation |

## What Stays the Same

- Tick-based passive gameplay (activity → ticks → spawns)
- Slash command interface (/scan, /catch, /collection, /status)
- Session/streak tracking
- Notification system
- Renderer architecture (SimpleTextRenderer, future renderers)

## New Slash Commands

- `/merge <id1> <id2>` — Merge two creatures from collection. Shows probability preview, requires confirmation.
- Existing commands adapted:
  - `/scan` — Shows batch with traits, energy cost, shared attempts remaining
  - `/catch <index>` — Costs energy, uses shared attempt
  - `/collection` — Shows each creature with its traits and merge modifier summary
  - `/inventory` — Shows Energy count instead of multiple items
  - `/status` — Shows energy, merge count, rarest trait found, etc.

## State Changes

### New GameState Fields

- `energy: number` — Current energy count
- `lastEnergyGainAt: number` — Timestamp for passive energy drip
- `batchAttempts: number` — Shared attempts remaining for current batch
- `batchFailPenalty: number` — Accumulated fail penalty for current batch

### Modified: NearbyCreature

Add `traits` field — array of 6 trait objects, each with:
- `slotId: string` (eyes, mouth, tail, gills, pattern, aura)
- `traitId: string` (specific trait variant)
- `rarity: Rarity`
- `mergeModifier: { type: "stable" | "volatile" | "catalyst", value: number }`

### Modified: CollectionEntry

Replace fragment-based tracking with individual creature instances:
- Each caught creature is a unique entry with its own trait combo
- `traits` field (same structure as NearbyCreature)
- Remove `fragments`, `evolved` fields
- Add `mergedFrom?: [creatureId, creatureId]` — lineage tracking
- Add `generation: number` — 0 for wild-caught, increments on merge

### Removed

- Multiple item types (ByteTrap, NetSnare, CoreLock, Shard, Prism)
- Evolution system (fragments + catalyst)
- Species-based creature definitions
- Per-creature attempt tracking (replaced by shared batch attempts)

## Config Changes

### New: traits.json (or section in balance.json)

Defines all trait variants per slot:
```json
{
  "slots": {
    "eyes": {
      "variants": [
        { "id": "dot", "rarity": "common", "art": "o.o", "mergeModifier": { "type": "stable", "value": 0.10 } },
        { "id": "wide", "rarity": "uncommon", "art": "◉.◉", "mergeModifier": { "type": "catalyst", "value": 0.15 } },
        { "id": "star", "rarity": "rare", "art": "★.★", "mergeModifier": { "type": "volatile", "value": -0.15 } },
        { "id": "void", "rarity": "legendary", "art": "⊙.⊙", "mergeModifier": { "type": "volatile", "value": -0.20 } }
      ]
    }
  }
}
```

### Modified: balance constants

- Remove: catch item multipliers, fragment costs, evolution catalyst requirements, passive drip item weights
- Add: energy gain interval, energy costs per rarity, batch size weights, shared attempt count, escalating fail penalty, base merge rate, mutation rates, merge modifier cap/floor

## Scope & Phasing

This is a large redesign. Suggested phasing:

### Phase 1: Core Mechanics
- Trait system (types, slots, rarity, config)
- Energy resource (replaces items)
- Batch spawning with shared attempts
- Escalating fail penalty
- Modified /scan and /catch

### Phase 2: Merging
- Merge engine (success rate, trait inheritance, mutation)
- /merge command
- Collection rework (individual instances with traits)
- Modified /collection display

### Phase 3: Art
- Design final axolotl art template
- Composable art regions per trait slot
- Renderer updates

### Phase 4: Polish
- Catalyst trait synergies
- Balance tuning
- Migration from old state format

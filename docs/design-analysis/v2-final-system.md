# Compi V2 — Complete System Specification

## Overview

Compi is a terminal creature collection game where creatures have 4 trait slots (eyes, mouth, body, tail), each progressing through 8 rarity tiers from Common to Eternal. Progression is driven by a merge system where sacrificing "food" creatures upgrades a target creature's slots.

**Target timeline:** 30-45 effective days (strategic P50) to fully max one creature (all 4 slots at Eternal 7-star).

---

## Rarity Tiers

| Tier | Spawns Wild? | Stars to Complete | Jump Merges to Next |
|------|-------------|-------------------|---------------------|
| Common | Yes (30%) | 0 | 1 |
| Uncommon | Yes (25%) | 1 | 2 |
| Rare | Yes (20%) | 2 | 3 |
| Epic | Yes (13%) | 3 | 4 |
| Legendary | Yes (8%) | 4 | 5 |
| Mythic | Yes (4%) | 5 | 6 |
| Astral | No (merge-only) | 6 | 7 |
| Eternal | No (merge-only) | 7 | - |

**Total steps per slot:** 0+1+2+3+4+5+6+7 = 28 star upgrades + 7 cross-rarity jumps = 35 steps.
**Total steps for all 4 slots:** 140.

---

## Trait System

### Trait Counts Per Slot Per Rarity

| Rarity | Variants |
|--------|----------|
| Common | 5 |
| Uncommon | 4 |
| Rare | 3 |
| Epic | 3 |
| Legendary | 2 |
| Mythic | 2 |
| Astral | 2 |
| Eternal | 1 |

### Harmonic Signature System

Every trait has a 3-dimensional "harmonic signature" derived deterministically from its ID:
- **Frequency (f):** Oscillation rate [0, 1]
- **Amplitude (a):** Magnitude [0, 1]
- **Phase (p):** Offset [0, 1]

These are computed via a hash function on the trait ID string.

### Interaction Score Formula

The resonance between two traits' signatures determines merge bonus:

```
distance = euclidean_distance(sig1, sig2) / sqrt(3)    // normalized to [0, 1]
interaction = (1 + cos(4*pi*distance - pi)) / 2        // cosine wave, range [0, 1]
```

This creates a **wave pattern** where:
- Distance ~0.0: score ~0.0 (too similar, no resonance)
- Distance ~0.25: score ~1.0 (primary resonance peak)
- Distance ~0.50: score ~0.0 (anti-resonance)
- Distance ~0.75: score ~1.0 (secondary resonance peak)
- Distance ~1.0: score ~0.0 (no resonance)

**Key design properties:**
- Every trait has MULTIPLE good partners and multiple bad ones (gradient, not binary)
- Moderate difference is optimal (not too similar, not too different)
- Creates a continuous decision space without tags or elements
- Low-rarity food creatures with the right signature are strategically valuable

---

## Merge System

### Success Rate Formula

```
rate = min(1.0, base_rate + trait_bonus + pity_bonus)
```

Where:
- `base_rate` depends on rarity tier and whether it's a star upgrade or cross-rarity jump
- `trait_bonus = interaction_score * MAX_TRAIT_BONUS` (max 20%)
- `pity_bonus` kicks in after half the pity threshold, linearly ramping to guarantee success at the threshold

### Base Success Rates

| Rarity | Star Upgrade | Cross-Rarity Jump | Pity Threshold |
|--------|-------------|-------------------|----------------|
| Common | 95% | - | 2 |
| Uncommon | 90% | 92% (to uncommon) | 2 |
| Rare | 88% | 80% (to rare) | 3 |
| Epic | 85% | 65% (to epic) | 3 |
| Legendary | 82% | 52% (to legendary) | 4 |
| Mythic | 78% | 44% (to mythic) | 4 |
| Astral | 75% | 38% (to astral) | 5 |
| Eternal | 72% | 32% (to eternal) | 6 |

### Pity Timer

After `threshold / 2` consecutive failures, a linear bonus ramps up. At `threshold` failures, success is guaranteed (100%).

Example for Legendary jump (threshold = 4):
- Attempt 1: 52% base
- Attempt 2: 52% base
- Attempt 3: 52% + ~24% pity = 76%
- Attempt 4: guaranteed 100%

### Max Trait Bonus

Up to **+20%** added to base rate when food trait has optimal resonance with target trait. Strategic players achieve ~80% of this (16%), random players ~30% (6%).

---

## Food System

### Effective Catches Per Merge Attempt

Each merge attempt consumes one food creature. The "effective catch cost" accounts for the probability of catching a qualifying creature and stockpile/condensing mechanics:

| Target Rarity | Catches Per Merge | Rationale |
|---------------|------------------|-----------|
| Common | 1.2 | Any creature qualifies |
| Uncommon | 1.4 | 70% of catches qualify |
| Rare | 1.8 | 45% of catches qualify |
| Epic | 2.5 | 25% of catches qualify |
| Legendary | 3.5 | 12% of catches qualify |
| Mythic | 4.5 | 4% + stockpile reuse |
| Astral | 4.8 | Condensed from mythic stockpile |
| Eternal | 5.5 | Condensed from astral |

### Condensing Mechanic (Astral/Eternal Food)

Since Astral and Eternal creatures don't spawn wild, food for those tiers is created by condensing lower-rarity creatures:
- **Astral food:** Merge 2-3 Mythic creatures into one Astral-quality food creature
- **Eternal food:** Merge Astral-quality creatures further

Players accumulate a mythic stockpile from regular farming, so the effective cost per condensed food is moderate.

---

## Trait Tree

### Structure

When a slot upgrades to a new rarity, the old trait is replaced by one from the higher tier's pool. The food creature's trait INFLUENCES which new trait appears, but does not determine it:

| Target Count | Best Path | Second | Third | Fourth+ |
|-------------|-----------|--------|-------|---------|
| 1 variant | 100% | - | - | - |
| 2 variants | 65% | 35% | - | - |
| 3 variants | 55% | 30% | 15% | - |
| 4 variants | 50% | 25% | 15% | 10% |
| 5 variants | 45% | 25% | 15% | ~7.5% each |

"Best path" is determined by harmonic signature resonance between the current trait and each candidate in the next tier.

### New Traits (Astral & Eternal)

**Astral (2 per slot):**

| Slot | Trait 1 | Trait 2 |
|------|---------|---------|
| Eyes | Nebula Gaze | Singularity |
| Mouth | Resonance | Cascade |
| Body | Nebula | Lattice |
| Tail | Aurora | Vortex |

**Eternal (1 per slot - the ultimate):**

| Slot | Trait |
|------|-------|
| Eyes | Omniscience |
| Mouth | Genesis |
| Body | Cosmos |
| Tail | Infinity |

---

## Game Tempo

| Parameter | Value |
|-----------|-------|
| Active coding hours/day | 6 |
| Batch interval | 17 minutes |
| Catches per batch | ~2 |
| Raw catches per day | ~42 |
| Catch productivity | 65% |
| Productive catches per day | ~27 |
| Energy max | 30 |
| Energy regen | 1 per 30 min |

---

## Simulation Results (10,000 runs)

### Strategic Play (P50 = 44.0 days)

| Metric | Mean | P10 | P25 | P50 | P75 | P90 | P95 |
|--------|------|-----|-----|-----|-----|-----|-----|
| Catches | 1190 | 1131 | 1158 | 1189 | 1221 | 1251 | 1269 |
| Merges | 304 | - | - | 303 | - | - | - |
| Days | 44.1 | 41.9 | 42.9 | 44.0 | 45.2 | 46.3 | 47.0 |

### Random Play (P50 = 51.0 days)

| Metric | Mean | P10 | P25 | P50 | P75 | P90 | P95 |
|--------|------|-----|-----|-----|-----|-----|-----|
| Catches | 1377 | 1302 | 1336 | 1377 | 1416 | 1453 | 1475 |
| Merges | 349 | - | - | 349 | - | - | - |
| Days | 51.0 | 48.2 | 49.5 | 51.0 | 52.4 | 53.8 | 54.6 |

### Key Metrics

- **Strategic advantage:** 13.6% fewer catches
- **P95/P50 variance:** 1.07 (excellent, well under 2.0 target)
- **Strategic P50:** 44.0 days (within 30-45 target)
- **First slot complete (P50):** ~11 days
- **Half done (2 slots, P50):** ~23 days
- **Three-quarter (3 slots, P50):** ~34 days

### Tier Cost Breakdown (per slot, strategic sample)

| Tier | Catches | Cumulative |
|------|---------|------------|
| Common | 1 | 1 |
| Uncommon | 4 | 5 |
| Rare | 14 | 20 |
| Epic | 25 | 45 |
| Legendary | 53 | 97 |
| Mythic | 95 | 192 |
| Astral | 125 | 317 |
| Eternal | 39 | 355 |

---

## Tuning System

Sacrifice a Common creature to adjust merge parameters on the target creature:
- **Signature Shift:** Common creature's harmonic signature temporarily shifts the target's signature for the next merge, allowing players to "tune" their creature toward a desired resonance band
- **This gives Commons permanent value** — even at end-game, specific common creatures with the right signatures are worth hunting

---

## Design Principles Validated

1. **No tags/elements:** All interaction is mathematical (harmonic signatures)
2. **Gradient decisions:** Every trait has multiple good/bad food pairings on a continuum
3. **Commons have value:** Used as food for early tiers AND as tuning fuel at all tiers
4. **Rewarding every session:** ~27 catches/day means 1-2 meaningful merges per session even at high tiers
5. **Forward planning:** Trait tree creates hunting goals (find food with specific signatures)
6. **Low variance:** P95/P50 of 1.07 means bad luck barely extends the journey
7. **Strategic depth:** 13.6% advantage for informed play, meaningful but not punishing for casual play

# Final Recommendation: The Resonance Lattice (Approach G4)

## Summary

After testing 7 approaches (A through G4) with Monte Carlo simulations, the recommended system combines **Pulse matching**, **food slot rarity gating**, **multi-merge requirements**, **chain bonuses**, **pity timers**, and **tuning**. This creates a system where:

- Optimized play reaches full mythic in **~30 effective days**
- Random/casual play takes **~42 effective days**
- Early progress is fast (50% done in ~4 days)
- The last 25% is where depth and strategy emerge
- At least 6 distinct strategic decisions exist per session
- No degenerate strategy dominates
- Commons have real value (tuning + early food)

---

## Complete System Specification

### 1. Pulse Values (Visible Trait Property)

Each trait variant has a deterministic **Pulse** value from 0-9.

- Pulse is derived from a hash of the variant ID (deterministic, not random per creature)
- Pulse is VISIBLE on every creature display
- Pulse wraps around: distance between 0 and 9 is 1, not 9

Display example:
```
  Pebble Gaze[3] / Wave[7] / Shell[1] / Swish[5]
```

### 2. Sub-Tier System (3 Stars per Rarity)

Each of the 6 rarities has 3 star levels, creating 18 progression levels per slot.

```
common*1 -> common*2 -> common*3 -> uncommon*1 -> ... -> mythic*1 -> mythic*2 -> mythic*3
```

17 upgrade steps per slot, 68 total upgrade steps for all 4 slots.

### 3. Food Slot Rarity Gate

To attempt upgrading slot S on the target creature, the food creature must have slot S at a minimum rarity:

| Upgrading Within | Food Slot S Must Be >= | P(wild catch qualifies) |
|------------------|----------------------|------------------------|
| Common tier      | Common               | 100%                   |
| Uncommon tier    | Common               | 100%                   |
| Rare tier        | Uncommon             | 70%                    |
| Epic tier        | Rare                 | 45%                    |
| Legendary tier   | Epic                 | 25%                    |
| Mythic tier      | Legendary            | 12%                    |

For cross-rarity jumps (e.g., rare*3 -> epic*1), the food slot must be >= the current rarity.

**Why this works**: Higher tier merges naturally cost more because finding valid food is harder. The cost scales with the spawn weight distribution -- no artificial inflation needed.

### 4. Multi-Merge Requirement (Cross-Rarity Gates)

Within-rarity star upgrades require 1 successful merge. Cross-rarity jumps require MULTIPLE successful merges:

| Cross-Rarity Jump      | Required Successes |
|------------------------|--------------------|
| common*3 -> uncommon*1 | 1                  |
| uncommon*3 -> rare*1   | 2                  |
| rare*3 -> epic*1       | 3                  |
| epic*3 -> legendary*1  | 4                  |
| legendary*3 -> mythic*1| 5                  |

Successes are **cumulative** -- failures do NOT reset the count. Each success consumes a food creature.

**Why this works**: This is the primary depth multiplier. Getting legendary*3 -> mythic*1 needs 5 successful merges, each consuming a creature with a legendary+ slot. That alone requires finding ~42 catches worth of food creatures (5 / 0.12 = 42).

### 5. Merge Success Rate Formula

```
slot_diff = min(|target_pulse_S - food_pulse_S|, 10 - |...|)   // wrapping distance, 0-5
pulse_bonus = max(0, 1 - slot_diff / 5)                         // 0 to 1

harmony = 0
for each slot i in [0..3]:
    d = min(|target_pulse_i - food_pulse_i|, 10 - |...|)
    harmony += max(0, 1 - d / 5)
harmony /= 4                                                    // 0 to 1

chain_bonus = min(consecutive_successes * 0.05, 0.25)           // 0 to 0.25

effective_rate = base_rate * (0.4 + 0.4 * pulse_bonus + 0.2 * harmony) + chain_bonus
effective_rate = clamp(effective_rate, 0.05, 0.95)
```

**Breakdown of rate components**:
- 40% guaranteed (base * 0.4) -- merging always has a floor
- 40% from slot pulse match -- the primary optimization target
- 20% from overall harmony -- rewards creatures with matching pulse profiles
- Up to +25% from chain bonus -- rewards strategic sequencing

**Effect ranges**:
- Perfect match (pulse_bonus=1, harmony=1): `base * 1.0 + chain`
- Good match (pulse_bonus=0.8, harmony=0.5): `base * 0.82 + chain`
- Random (avg pulse_bonus=0.5, harmony=0.5): `base * 0.7 + chain`
- Bad match (pulse_bonus=0, harmony=0): `base * 0.4 + chain`

### 6. Base Success Rates

| Step                       | Base Rate | Pity Threshold |
|----------------------------|-----------|----------------|
| common*1 -> common*2       | 80%       | 3              |
| common*2 -> common*3       | 80%       | 3              |
| common*3 -> uncommon*1     | 65%       | 4              |
| uncommon*1 -> uncommon*2   | 76%       | 4              |
| uncommon*2 -> uncommon*3   | 76%       | 4              |
| uncommon*3 -> rare*1       | 57%       | 6              |
| rare*1 -> rare*2           | 72%       | 5              |
| rare*2 -> rare*3           | 72%       | 5              |
| rare*3 -> epic*1           | 49%       | 8              |
| epic*1 -> epic*2           | 68%       | 6              |
| epic*2 -> epic*3           | 68%       | 6              |
| epic*3 -> legendary*1      | 41%       | 10             |
| legendary*1 -> legendary*2 | 64%       | 7              |
| legendary*2 -> legendary*3 | 64%       | 7              |
| legendary*3 -> mythic*1    | 33%       | 12             |
| mythic*1 -> mythic*2       | 60%       | 8              |
| mythic*2 -> mythic*3       | 60%       | 8              |

### 7. Pity Timer

Each upgrade step tracks consecutive failures independently. After N failures (the pity threshold), the next attempt is guaranteed to succeed.

Pity counter resets to 0 after a guaranteed success.

**Why pity, not mastery**: Mastery (accumulating on failure) was explored in Approach C. Pity is simpler, communicates clearly to the player, and puts a hard cap on worst-case progression without changing the expected case significantly.

### 8. Chain Bonus

Each consecutive successful merge adds +5% to the next merge's effective rate, up to +25% (5 successes).

Chain resets to 0 on any failure.

**Strategic implication**: Players should "warm up" with easy merges (common/uncommon tier) before attempting hard cross-rarity jumps. But easy merges consume food creatures, so there's a trade-off.

### 9. Tuning (Common Creatures Have Value)

New command: `/tune <target> <food>`

- Food must be a creature with at least one common-tier slot
- Shifts one Pulse value on the target by +1 or -1 (player chooses slot and direction)
- Wraps around (0-1 = 9, 9+1 = 0)
- Consumes the food creature

**Why this matters**: If your target has Pulse [3,7,1,5] and you have a great food creature with Pulse [6,7,1,5], the eye slot mismatch (3 vs 6, distance=3) hurts the success rate. Tuning lets you spend a common creature to shift target eyes from 3 to 4, improving the match from distance-3 to distance-2. Over multiple tunes, you can align pulses optimally.

---

## Simulation Results

### Per-Slot Progression (10,000 Monte Carlo runs)

| Metric           | Random Play | Optimized Play |
|------------------|------------|----------------|
| Mean merges      | 65         | 61             |
| Mean catches     | 289        | 202            |
| P10 catches      | 203        | 150            |
| P25 catches      | 239        | 174            |
| P50 catches      | 283        | 200            |
| P75 catches      | 333        | 230            |
| P90 catches      | 385        | 258            |
| P95 catches      | 418        | 276            |

### Full Creature (All 4 Slots) Timeline

| Milestone | Random (eff. days) | Optimized (eff. days) |
|-----------|-------------------|-----------------------|
| 25%       | 1.0               | 1.7                   |
| 50%       | 2.9               | 4.1                   |
| 75%       | 13.4              | 12.1                  |
| 100%      | 42.4              | 29.5                  |

"Effective days" assumes 65% catch productivity (rest goes to exploring, working on other creatures, etc.) and 42 raw catches/day (6 hours active coding, batch every 17 min, ~2 catches per batch).

### Progression Curve Shape

The curve is **exponentially back-loaded**:
- First 50% takes ~3-4 days (satisfying early progress)
- Next 25% takes ~8-10 days (building investment)
- Final 25% takes ~17-18 days (the strategic challenge)

This is excellent for a passive game: new players see fast progress, experienced players have a deep optimization challenge.

---

## Strategic Decision Analysis

### Decision 1: Which Creature to Catch
Player sees 3-5 creatures per batch. Each has visible Pulse values. Decision factors:
- Pulse match for the slot currently being upgraded
- Overall harmony with target creature
- Rarity of the matching slot (valid food?)
- Whether it's a common useful for tuning

### Decision 2: Which Slot to Upgrade
4 slots compete for attention. Factors:
- Current tier of each slot (harder slots are more impactful)
- Available food creatures in collection
- Chain bonus state (do easy slot first to build chain?)

### Decision 3: When to Tune vs When to Merge
Tuning costs a common creature but improves future merge rates. Trade-off:
- Pulse diff of 3: tuning to 2 improves rate by ~8%
- Worth it if you expect 5+ merges at that tier (saves ~0.4 merges)
- Not worth it for a single merge attempt

### Decision 4: Chain Management
Build chain on easy merges before attempting hard ones? Risk:
- 3 easy merges to get +15% costs 3 food creatures
- +15% on a 33% base rate = 48% -- significant improvement
- But those 3 food creatures could have been saved for the hard merge's multi-merge requirement

### Decision 5: Creature Inventory Management
Limited collection space. Keep or merge now?
- A creature with legendary eyes and common everything else is valuable food for eye upgrades
- A creature with good pulse match for multiple slots is worth keeping
- Commons are worth keeping for tuning (not just merge fodder)

### Decision 6: Multi-Creature Strategy
Player can work on multiple creatures simultaneously:
- Focus on one creature (faster to max, higher immediate satisfaction)
- Spread effort (more diversity, hedge against bad RNG on one creature)
- "Feeder" creatures: level up a secondary creature to use as high-quality food later

### Degenerate Strategy Check
- "Always merge closest pulse match" -- ignores harmony, chain opportunity
- "Always tune first" -- wastes commons that could be food
- "Always build chain first" -- wastes food creatures on easy merges
- "Never catch commons" -- misses tuning value and easy chain-building
- "Focus only on one slot" -- leaves food with good other-slot matches unused
- **No single dominant strategy found.**

---

## Implementation Notes

### Type Changes Required
```typescript
// Add to CreatureSlot
pulse: number;  // 0-9, deterministic per variantId

// Add to CollectionCreature
stars: number;  // 1-3 per current rarity tier

// New tracking
mergeChain: number;       // consecutive successes
pityCounters: number[];   // per upgrade step, failures at current step
crossRaritySuccesses: number[];  // per cross-rarity gate, successes accumulated
```

### Pulse Assignment
```typescript
function getPulse(variantId: string): number {
    // Deterministic hash of variant ID to 0-9
    let hash = 0;
    for (const char of variantId) {
        hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    }
    return Math.abs(hash) % 10;
}
```

### Display Format
```
  [#1] Glimmer  ★★☆ rare
    ○w○[3]  ≈[7]  {shell}[1]  ~tail~[5]
    ^ eyes   ^ mouth  ^ body    ^ tail
```

### Balance Tuning Levers
If the system is too fast/slow, these knobs can be adjusted independently:
1. **Multi-merge counts** (1,2,3,4,5) -- most impactful on duration
2. **Pity thresholds** -- affects worst-case
3. **Base rates** -- affects average case
4. **Pulse formula weights** (0.4/0.4/0.2) -- affects optimization reward
5. **Chain bonus** (+5% per, max 25%) -- affects chain strategy value

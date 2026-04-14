# Core Game Loop Design

**Date:** 2026-04-13
**Status:** DRAFT -- numbers carried from validated 6-species config; sections marked [REVALIDATE] need Monte Carlo re-simulation with 50-100 species
**Supersedes:** `2026-04-13-engagement-loop-redesign.md` (catching, upgrading, merging, questing, energy, collection, leveling sections)

---

## Overview

This spec defines the core mechanics of Compi's game loop. The fundamental shift from the previous design: **50-100 species with 15 collection slots** means same-species pairs are rare. Merging becomes an exciting event, not routine progression. Discovery and upgrades are the primary loops.

```
Scan -> Catch -> Upgrade -> Quest -> (rare) Merge -> Repeat
         |                                  ^
         +---> Discover new species --------+
```

---

## 1. Catching

### Batch Spawning

| Parameter | Value |
|-----------|-------|
| Creatures per scan | 3 |
| Auto-respawn | Immediately after batch exhausted or all caught |
| Energy cost | 1 per attempt (success or fail) |

### Catch Rate Formula

Each creature has 3-4 trait slots. Catch difficulty scales with trait quality.

Per-trait chance:
```
traitCatchChance = 1.0 - (traitRank / maxRankInPool) * 0.50
```

Final rate:
```
catchRate = average(traitCatchChance for each slot)
```

| Trait Rank | Catch Chance |
|-----------|-------------|
| 0 | 100% |
| 1 | 94% |
| 3 | 83% |
| 5 | 72% |
| 7 | 61% |
| Max (pool-dependent) | 50% |

Effective average catch rate across all spawns: ~94% (most spawns are low-rank due to triangular distribution).

### Trait Rank Caps by Player Level

Spawned creatures have trait ranks capped by player level:

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 |
|-------|---|---|---|---|---|---|---|---|---|----|----|----|----|-----|
| Cap   | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 5 | 5 | 6  | 6  | 7  | 7  | 8   |

Trait ranks within the cap use a triangular distribution skewed toward rank 0.

**Change from current game:** No change to catching mechanics. The difference is purely in *which species* appear (see Section 9: Spawning).

---

## 2. Upgrading

Spend gold to improve individual traits, one rank at a time. Player chooses which trait to upgrade.

| From Rank | To Rank | Cost |
|-----------|---------|------|
| 0 | 1 | 3g |
| 1 | 2 | 5g |
| 2 | 3 | 9g |
| 3 | 4 | 15g |
| 4 | 5 | 24g |
| 5 | 6 | 38g |
| 6 | 7 | 55g |

- **Ceiling:** Rank 7. Merging is the only way past this.
- **Session cap:** Max 2 upgrades per session.
- **Total cost 0 to 7:** 149g per trait.

**With 50-100 species:** Upgrading becomes the primary progression mechanic. Since merge pairs are rare, players invest gold into upgrading their best creatures' traits. This makes each upgrade decision meaningful -- you're committing gold to a creature you may keep for a long time.

---

## 3. Merging [REVALIDATE]

Merge two **same-species** creatures. Both parents consumed, one child created.

### Merge Rules

1. Child takes the **best trait from either parent** per slot
2. One random trait upgrades +1 rank (guaranteed)
3. **30% chance** one other random trait downgrades -1 rank
4. Player sees a **preview with % chances** per slot before confirming

### Merge Cost

```
mergeCost = 10 + floor(childAvgRank * 5)
```

| Stage | Avg Trait Rank | Gold Cost | Energy Cost |
|-------|---------------|-----------|-------------|
| Early | 1 | 15g | 1 |
| Mid | 3 | 25g | 1 |
| Late | 7 | 45g | 1 |
| Endgame | 10 | 60g | 1 |
| Max | 15 | 85g | 1 |

### Impact of 50-100 Species

With 6 species and 15 slots, you averaged ~2-3 creatures per species -- merging was routine (~1.5 per session). With 50-100 species:

- **Expected same-species pairs in collection:** With 15 slots drawn from 50-100 species, the probability of having a mergeable pair at any given time is low. For N species with equal weights, P(at least one pair in 15 slots) follows the birthday problem: ~50% for 21 species, ~10% for 50 species.
- **Merge frequency estimate:** Roughly 1 merge per 5-15 sessions (down from 1.5 per session). [REVALIDATE with actual spawn weights]
- **Merging becomes a celebration**, not a routine action. When you get a same-species pair, it's exciting.
- **Strategic tension:** When you have a pair, do you merge immediately or wait to upgrade both parents first?

This is the key design insight: merging is now a **rare event** that breaks the upgrade-quest routine and creates memorable moments.

---

## 4. Quests

Send creatures on timed missions to earn gold.

| Parameter | Value |
|-----------|-------|
| Max team size | 3 creatures |
| Lock duration | 2 sessions |
| Gold reward | max(10g, floor(totalTeamPower * 0.6)) |

- **Team power** = sum of all trait ranks across all creatures on the quest
- Creatures are locked and unavailable during the quest
- Creates tension: send strong creatures for gold vs. keep them available for a potential merge

**With 50-100 species:** Questing becomes safer to do aggressively since you're less likely to need specific creatures for an imminent merge. Players can confidently send their best team without worrying about missing a merge window.

---

## 5. Energy

| Parameter | Value |
|-----------|-------|
| Maximum | 30 |
| Starting (new game) | 30 |
| Regen per session | +3 |
| Catch cost | 1 per attempt |
| Merge cost | 1 |

Energy is rarely the binding constraint. Gold and (now) merge-pair availability are the primary limiters.

**No change for 50-100 species.** Energy math stays the same since catch frequency is unchanged. Merge energy cost matters less since merges are rarer.

---

## 6. Collection

| Parameter | Value |
|-----------|-------|
| Max slots | 15 |

### Curation with 50-100 Species

With 6 species, 15 slots meant ~2-3 per species (merge fodder). With 50-100 species, 15 slots means **hard choices about what to keep**.

#### Release

- Permanently remove a creature from collection, freeing a slot
- No gold or resource return
- Required to make room for new catches when full

#### Archive

- Move a creature to a permanent archive (already implemented)
- Archived creatures do NOT count against collection slots
- Cannot be used for merging, questing, or upgrading
- Serves as a trophy case / pokedex proof

#### Collection Strategy

Players must decide:
- **Keep for merge potential:** Hold a species hoping to catch a second copy
- **Keep for questing power:** Retain high-power creatures for gold income
- **Release to discover:** Free slots to catch new species
- **Archive trophies:** Preserve favorites without wasting slots

The 15-slot limit with 50-100 species creates a **curation game**. Players can never collect everything simultaneously -- they must specialize and rotate.

---

## 7. Leveling

### XP Sources

| Action | XP |
|--------|-----|
| Catch | 10 |
| Upgrade | 8 |
| Merge | 25 |
| Quest complete | 15 |

### Level Thresholds

| Level Up | XP Required | Cumulative XP |
|----------|-------------|---------------|
| 1 -> 2 | 30 | 30 |
| 2 -> 3 | 50 | 80 |
| 3 -> 4 | 80 | 160 |
| 4 -> 5 | 120 | 280 |
| 5 -> 6 | 170 | 450 |
| 6 -> 7 | 240 | 690 |
| 7 -> 8 | 340 | 1,030 |
| 8 -> 9 | 480 | 1,510 |
| 9 -> 10 | 680 | 2,190 |
| 10 -> 11 | 960 | 3,150 |
| 11 -> 12 | 1,350 | 4,500 |
| 12 -> 13 | 1,900 | 6,400 |
| 13 -> 14 | 2,700 | 9,100 |

Formula: `xpForLevel(n) = floor(30 * 1.4^(n-1))`

### Level Benefits

1. **Higher trait rank caps on spawns** (see Section 1 table)
2. **New species unlock progressively** (see Section 8)
3. **Better starting traits** -- triangular distribution shifts slightly toward higher ranks at higher levels

**With 50-100 species:** Leveling becomes more exciting because each level can unlock new species to discover. The old 6-species game unlocked everything by level 10. Now, discovery continues through level 20+.

---

## 8. Species Discovery [NEW]

### Design

With 50-100 species, discovery is a core engagement mechanic. Players encounter new species over time, gated by level and spawn rarity.

### Species Rarity Tiers

Each species has an inherent rarity tier (separate from trait ranks):

| Species Rarity | Spawn Weight Range | Count (of ~75) | Unlock Level Range |
|---------------|-------------------|----------------|-------------------|
| Common | 8-12 | ~20 | 1-3 |
| Uncommon | 4-7 | ~25 | 3-7 |
| Rare | 2-3 | ~18 | 7-12 |
| Epic | 0.5-1.5 | ~10 | 12-18 |
| Legendary | 0.1-0.4 | ~5 | 18+ |

Total species target: 50-100 (starting at 75, expandable).

### Level-Gated Unlocks

Species are locked until the player reaches their unlock level. At each level, 3-8 new species become available in the spawn pool.

| Level Range | New Species Available | Cumulative Total |
|------------|----------------------|-----------------|
| 1-2 | 8 (mostly Common) | 8 |
| 3-4 | 8 (Common + Uncommon) | 16 |
| 5-6 | 8 (Uncommon) | 24 |
| 7-8 | 8 (Uncommon + Rare) | 32 |
| 9-10 | 8 (Rare) | 40 |
| 11-12 | 8 (Rare) | 48 |
| 13-14 | 7 (Rare + Epic) | 55 |
| 15-16 | 6 (Epic) | 61 |
| 17-18 | 6 (Epic) | 67 |
| 19-20 | 5 (Epic + Legendary) | 72 |
| 21+ | 3 (Legendary) | 75 |

### Discovery Tracking

Track in game state:
- `discoveredSpecies: string[]` -- species IDs the player has caught at least once
- Display: "Discovered: 23 / 75" on status screen
- First catch of a new species grants bonus XP: **20 XP** (double a normal catch)

### Discovery as Motivation

- Players at any level always have undiscovered species ahead of them
- Leveling up triggers "New species available!" notification
- The combination of level-gating and spawn weights means some species take many sessions to encounter even after unlocking -- creating "chase" targets

---

## 9. Spawning with 50-100 Species [REVALIDATE]

### Spawn Weight System

Each scan picks 3 creatures from the **unlocked** species pool. Species are selected by weighted random:

```
P(species) = species.spawnWeight / sum(all unlocked species weights)
```

### Rarity Distribution in Practice

At level 10 (40 species unlocked), approximate spawn rates per scan:

| Species Rarity | Weight Share | P(at least 1 in batch of 3) |
|---------------|-------------|----------------------------|
| Common (20 species, avg weight 10) | ~56% | ~91% |
| Uncommon (12 species, avg weight 5.5) | ~18% | ~46% |
| Rare (8 species, avg weight 2.5) | ~6% | ~16% |

At level 20 (72 species unlocked):

| Species Rarity | Weight Share | P(at least 1 in batch of 3) |
|---------------|-------------|----------------------------|
| Common (20 species, avg weight 10) | ~42% | ~81% |
| Uncommon (25 species, avg weight 5.5) | ~29% | ~64% |
| Rare (18 species, avg weight 2.5) | ~9% | ~25% |
| Epic (7 species, avg weight 1.0) | ~1.5% | ~4% |

### Duplicate Species in Batch

With 50+ species in the pool, the chance of getting two of the same species in one batch of 3 is very low (<2% for any common species, negligible for rarer ones). This reinforces that merge pairs come from accumulation over multiple sessions, not from a single lucky scan.

### No Biome/Time-of-Day Species Gating

All unlocked species can appear at any time. Time-of-day affects spawn *frequency* (existing mechanic) but not species availability. Keeping this simple avoids frustrating players who only play at certain times.

---

## Tier System (Trait Ranks)

Unchanged from previous spec. Trait tiers describe individual trait quality:

| Tier | Rank Range | Primary Path |
|------|-----------|-------------|
| Common | 0-4 | Catching + early upgrades |
| Uncommon | 5-8 | Upgrades (ceiling at 7) + first merges |
| Rare | 9-11 | Merging |
| Epic | 12-14 | Repeated merging |
| Legendary | 15-16 | Deep merging |
| Mythic | 17-18 | Extensive merging |

**With 50-100 species:** Reaching high tiers takes significantly longer because merge opportunities are rarer. Expected milestones will shift. [REVALIDATE]

---

## Summary of Changes from Current Game

| Mechanic | Current (6 species) | New (50-100 species) | Impact |
|----------|--------------------|--------------------|--------|
| Merging | ~1.5/session, routine | ~1 per 5-15 sessions, rare event | Merging becomes exciting, not routine |
| Upgrading | Secondary to merging | Primary progression | Gold investment decisions matter more |
| Collection (15 slots) | ~2-3 per species, merge fodder | Hard curation choices | Release/archive become core actions |
| Species unlock | 6 species by Lv10 | 75 species through Lv21+ | Discovery is a long-term motivator |
| Discovery | N/A | New mechanic with tracking | "Caught X/75" drives exploration |
| Quest risk | High (might miss merge) | Low (merge pairs are rare anyway) | Players quest more freely |
| Spawn pool | 6 species, high repeat rate | 50-100, high variety | Each scan shows different creatures |
| Progression ceiling | Mythic at ~377 sessions | Mythic takes longer [REVALIDATE] | Longer runway before content exhaustion |

---

## Items Requiring Re-Validation [REVALIDATE]

The existing balance simulation (1000 sessions x 500 runs) was done with 6 species. The following need re-simulation with 50-100 species:

1. **Merge frequency** -- How often do players actually get merge pairs? What's the distribution?
2. **Progression milestones** -- With fewer merges, how long to reach each trait tier?
3. **Gold economy** -- With fewer merge sinks, does gold accumulate? May need to adjust upgrade costs or add new sinks.
4. **Quest balance** -- With creatures less likely to be needed for merge, do players quest too aggressively? Does this flood gold?
5. **Energy balance** -- Is 20 max still right when merges are rare and catches are the main energy use?
6. **Collection slot pressure** -- How often are players at 12/12? Is release/archive frequency healthy?
7. **Dead spots** -- Do casual players hit dead spots with the new species mix?
8. **Discovery curve** -- At what rate do players encounter new species? Is it satisfying or frustratingly slow?

These are covered in **Spec 2: Economy & Balance Validation**.

---

## Out of Scope

- Economy numbers validation (Spec 2)
- AI advisor / UX / rendering (Spec 3)
- Individual species definitions (separate species design doc)
- Narrative / lore
- Multiplayer / trading

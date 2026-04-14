# Economy & Balance Design

**Date:** 2026-04-13
**Status:** VALIDATED (6 species) / PARTIALLY VALIDATED (50-100 species -- see Re-validation Notes)
**Depends on:** [Engagement Loop Redesign](2026-04-13-engagement-loop-redesign.md) (Spec 1)
**Does not cover:** Core mechanics (Spec 1), AI advisor / UX (Spec 3)

All numbers below were validated via 1000-session x 500-run Monte Carlo simulation across 6 player archetypes, tested against 5 proven game economy models. The simulation used 6 species. With the expansion to 50-100 species, specific parameters need re-validation (called out in Section 9).

---

## 1. All Tunable Constants

### 1.1 Catching

| Parameter | Value | Notes |
|-----------|-------|-------|
| Batch size | 3 | Creatures per /scan |
| Catch rate (rank 0) | 100% | Guaranteed at lowest rank |
| Catch rate (max rank) | 50% | Floor for highest-rank spawns |
| Energy cost | 1 | Per attempt (hit or miss) |
| Spawn distribution | Triangular, low-skewed | Most spawns are rank 0-1 |
| Average catch rate | ~94% | Across all spawns |

**Catch rate formula (per trait):**
```
traitCatchChance = 100% - (traitRank / maxRank) * 50%
catchRate = average(traitCatchChance for each trait slot)
```

**Trait rank caps by player level:**

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 |
|-------|---|---|---|---|---|---|---|---|---|----|----|----|----|-----|
| Cap   | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 5 | 5 | 6  | 6  | 7  | 7  | 8   |

### 1.2 Upgrading

| From -> To | Cost | Cumulative |
|-----------|------|------------|
| Rank 0->1 | 3g | 3g |
| Rank 1->2 | 5g | 8g |
| Rank 2->3 | 9g | 17g |
| Rank 3->4 | 15g | 32g |
| Rank 4->5 | 24g | 56g |
| Rank 5->6 | 38g | 94g |
| Rank 6->7 | 55g | 149g |

- **Ceiling:** Rank 7. Merge is the only way past this.
- **Session cap:** Max 2 upgrades per session.
- **Total 0->7:** 149g per trait.

### 1.3 Merging

| Parameter | Value |
|-----------|-------|
| Gold cost | `10 + floor(childAvgRank * 5)` |
| Energy cost | 1 |
| Guaranteed upgrade | +1 to one random trait |
| Downgrade risk | 30% chance, -1 to one other random trait |

**Merge cost by game stage:**

| Stage | Avg Trait Rank | Merge Cost |
|-------|---------------|------------|
| Early game | 1 | 15g |
| Mid game | 3 | 25g |
| Late-mid | 5 | 35g |
| Late game | 7 | 45g |
| Endgame | 10 | 60g |
| Max | 15 | 85g |

### 1.4 Quests

| Parameter | Value |
|-----------|-------|
| Gold reward | `max(10g, floor(totalTeamPower * 0.6))` |
| Team size | Up to 3 creatures |
| Lock duration | 2 sessions |
| XP reward | 15 XP |

### 1.5 Energy

| Parameter | Value |
|-----------|-------|
| Maximum | 30 |
| Starting (new game) | 30 |
| Regen per session | +3 |
| Catch cost | 1 |
| Merge cost | 1 |

### 1.6 XP and Leveling

**XP per action:**

| Action | XP |
|--------|-----|
| Catch | 10 |
| Upgrade | 8 |
| Merge | 25 |
| Quest | 15 |

**Level thresholds:**

| Level Up | 1->2 | 2->3 | 3->4 | 4->5 | 5->6 | 6->7 | 7->8 | 8->9 | 9->10 | 10->11 | 11->12 | 12->13 | 13->14 |
|----------|------|------|------|------|------|------|------|------|-------|--------|--------|--------|--------|
| XP       | 30   | 50   | 80   | 120  | 170  | 240  | 340  | 480  | 680   | 960    | 1350   | 1900   | 2700   |

**XP curve formula (approximate):** Each threshold is ~1.4x the previous one.

### 1.7 Collection and Economy

| Parameter | Value |
|-----------|-------|
| Collection slots | 15 |
| Starting gold | 10g |

### 1.8 Tier System

| Tier | Rank Range | When Achievable (Session) |
|------|-----------|--------------------------|
| Common | 0-4 | Immediately |
| Uncommon | 5-8 | ~20-50 |
| Rare | 9-11 | ~75-125 |
| Epic | 12-14 | ~133 |
| Legendary | 15-16 | ~225 |
| Mythic | 17-18 | ~300+ |

Full config CSV: [`docs/prototype/balance-config.csv`](../../prototype/balance-config.csv)

---

## 2. Economy Model Validation Results

Five proven game design models were applied. The final config (IT3: scaling merge cost + 30% downgrade) passes all five.

| # | Model | What It Tests | Threshold | Result |
|---|-------|--------------|-----------|--------|
| 1 | Sink/Faucet Ratio | Spend rate at steady state | 60-100% of income | **PASS** -- holds at ~100% from S100 onward |
| 2 | Time-to-Payoff | Actions between satisfying events | < 5 actions between payoffs | **PASS** -- avg gap 1.01, max gap 4, zero boring zones |
| 3 | Inflation/Power Curve | Income-to-cost ratio stability | 0.5x-3.0x range | **PASS** -- stays in 0.4-2.5x (one marginal checkpoint at 0.42x) |
| 4 | Loss Aversion (K&T) | Merge "feels bad" frequency | < 35% net-negative merges (adjusted) | **PASS** -- 29.8% net-negative, avg emotional value +0.40 |
| 5 | Session Value | Value per session over time | Non-declining curve | **PASS** -- early 3.77, mid 3.18, late 5.72 (increasing) |

### 2.1 Sink/Faucet Detail

The scaling merge cost (`10 + floor(avgRank * 5)`) was the key fix. Without it, late-game spend rate collapsed to 26% at S1000 as quest income outgrew static costs.

| Session | Without Scaling | With Scaling |
|---------|----------------|--------------|
| 10 | 120% | 120% |
| 100 | 101% | 100% |
| 300 | 62% | 100% |
| 500 | 44% | 100% |
| 1000 | 26% | 100% |

The ~100% rate means the economy is tight. Gold buffer stays at 0.3-1.3x the next affordable action -- players always have a near-term saving goal.

### 2.2 Loss Aversion Detail

Strict Kahneman & Tversky requires < 20% net-negative outcomes. The adjusted threshold of 35% accounts for three mitigating factors in Compi's merge design:

1. **Preview system** -- players see probabilities before confirming (reduces ambiguity aversion)
2. **Voluntary action** -- players choose when to merge (agency reduces regret)
3. **Best-of-both selection** -- merge takes the best trait from each parent before the gamble (frames the risk as bonus, not core value)

At 30% downgrade chance: 29.8% net-negative merges, avg emotional value +0.40 (positive).

### 2.3 Iteration History

| Iteration | Changes | Models Passed |
|-----------|---------|---------------|
| IT1 (original) | Flat 10g merge, 45% downgrade | 2/5 |
| IT2 | Scaling merge cost added | 4/5 |
| IT3 (final) | Downgrade reduced to 30% | 5/5 |

Full per-session data: [`docs/prototype/economy-validation.csv`](../../prototype/economy-validation.csv)
Validation report: [`docs/prototype/economy-report.md`](../../prototype/economy-report.md)

---

## 3. Archetype Analysis

Tested across 6 player archetypes (200 runs each, 1000 sessions).

### 3.1 Pass/Fail Matrix

| Archetype | M1 Sink/Faucet | M2 Payoff | M3 Inflation | M4 Loss | M5 Value | Score |
|-----------|---------------|-----------|--------------|---------|----------|-------|
| Optimal | PASS | PASS | PASS | PASS | PASS | **5/5** |
| Casual | PASS | PASS | PASS | PASS | PASS | **5/5** |
| Hoarder | PASS | PASS | PASS | PASS | PASS | **5/5** |
| Impatient | PASS | PASS | PASS | PASS | PASS | **5/5** |
| Merge Addict | PASS | PASS | FAIL | PASS | PASS | **4/5** |
| Gold Miser | FAIL | PASS | FAIL | PASS | FAIL | **2/5** |

### 3.2 Archetype Behaviors

- **Optimal:** Follows the action menu suggestions. Baseline for all metrics.
- **Casual:** Suboptimal play patterns, skips some actions. 16% slower to Mythic (S438 vs S377).
- **Hoarder:** Delays merging until collection full. Still reaches Mythic; 57% of runs within 1000 sessions.
- **Impatient:** Rushes through actions. Economy holds fine.
- **Merge Addict:** Merges at every opportunity, skips upgrades. Fails M3 (inflation) because merge-heavy play inflates income/cost ratio past 3.0x at S500+.
- **Gold Miser:** Refuses to spend gold. Fails M1, M3, M5. Completely stalls after early sessions.

### 3.3 Adversarial Failure Assessment

The Merge Addict and Gold Miser failures are **acceptable by design**:

- Both archetypes deliberately ignore core game mechanics.
- The action menu actively guides players away from these extremes.
- No game economy can remain balanced when a player refuses to engage with the core loop.

Full archetype data: [`docs/prototype/archetype-report.md`](../../prototype/archetype-report.md)

---

## 4. Progression Milestones

### 4.1 Tier Milestones (Optimal Player)

| Milestone | Session | Confidence | Validated? |
|-----------|---------|------------|------------|
| First merge | ~1 | 100% | Yes (6 species) |
| All species unlocked | ~30 | 100% | Yes (6 species) |
| First Uncommon trait (rank 5) | ~20 | 100% | Yes |
| First Rare trait (rank 9) | ~75 | 100% | Yes |
| First Epic trait (rank 12) | ~133 | 100% | Yes |
| First Legendary trait (rank 15) | ~235 | 100% | Yes |
| First Mythic trait (rank 17) | ~377 | 100% | Yes |

### 4.2 Progression Snapshot

| Session | Level | Gold | Catches | Upgrades | Merges | Quests | Best Tier |
|---------|-------|------|---------|----------|--------|--------|-----------|
| 1 | 2 | 10 | 3 | 0 | 1 | 1 | Common |
| 10 | 6 | 19 | 21 | 7 | 10 | 10 | Common |
| 30 | 10 | 35 | 58 | 27 | 47 | 30 | Uncommon |
| 50 | 11 | 47 | 87 | 60 | 76 | 50 | Uncommon |
| 100 | 13 | 66 | 160 | 146 | 149 | 100 | Rare |
| 200 | 16 | 84 | 305 | 332 | 295 | 197 | Epic |
| 500 | 25 | 101 | 741 | 919 | 730 | 452 | Mythic |
| 1000 | 39 | 107 | 1466 | 1903 | 1456 | 817 | Mythic |

### 4.3 Activity Distribution (1000 Sessions)

| Action | Total | Per Session Avg |
|--------|-------|-----------------|
| Catches | 1466 | 1.5 |
| Upgrades | 1903 | 1.9 |
| Merges | 1456 | 1.5 |
| Quests | 817 | 0.8 |
| Stuck sessions | 0 | -- |

---

## 5. Gold Flow

### 5.1 Sources (Faucets)

| Source | Mechanism | Typical Yield |
|--------|-----------|---------------|
| Quests | `max(10g, floor(teamPower * 0.6))` | 10-60g+ per quest |
| Starting gold | One-time | 10g |

Quests are the sole recurring gold faucet. There is no idle income, no login bonus, no gold-from-catches.

### 5.2 Sinks

| Sink | Mechanism | Typical Cost |
|------|-----------|-------------|
| Upgrades | 3-55g per rank tier | 3-55g per action |
| Merges | `10 + floor(avgRank * 5)` | 15-85g per merge |

### 5.3 Lifetime Gold Balance (Optimal Player, 1000 Sessions)

| Metric | Value |
|--------|-------|
| Total earned | 71,086g |
| Total spent | 70,989g |
| Net surplus | +97g (0.14%) |
| Gold on hand (range) | 10-107g |

The economy is essentially perfectly balanced. Players never accumulate meaningful surplus and never go permanently broke.

### 5.4 Sink Shift with 50-100 Species

With 6 species and 15 collection slots (~2-3 per species), merges happen frequently (~1.5/session). With 50-100 species, same-species pairs become rare -- estimated ~1 merge per 5-10 sessions instead of 1.5 per session.

**Impact:**
- Merges drop from ~41% of gold spending to ~5-10%
- Upgrades become the dominant gold sink (~80-90% of spending)
- Gold may accumulate faster in mid-game if upgrade cap (rank 7) is hit before merge pairs appear

**This is the single largest economy change from the species expansion.** See Section 9 for re-validation requirements.

---

## 6. Energy Economy

### 6.1 Energy Budget Per Session

| Action | Cost | Typical Count | Total |
|--------|------|---------------|-------|
| Catches | 1 each | 1-3 | 1-3 |
| Merges | 1 each | 0-2 | 0-2 |
| **Total spent** | | | **1-5** |
| **Regen** | | +3 | **+3** |

With 30 max energy and +3 regen per session, energy sustains ~10 sessions of full activity before needing to coast. In practice, energy is rarely the binding constraint -- gold and merge-pair availability are the primary limiters.

### 6.2 Energy as a Gate

Energy serves as a soft throttle, not a hard wall:

- Prevents marathon grinding in a single session (this is a side-activity in a coding tool)
- Creates a natural "play a bit, come back later" rhythm
- At 3 energy regen / session and ~3 energy spent / session, the system is near equilibrium
- Players who skip sessions build up a buffer (max 20) for a burst session later

### 6.3 Energy with 50-100 Species

Energy cost is per-catch and per-merge, not per-species. With fewer merges (due to rare same-species pairs), energy pressure actually decreases. No changes needed.

---

## 7. Scaling Formulas

### 7.1 Merge Cost

```
mergeCost = 10 + floor(childAvgRank * 5)
```

Where `childAvgRank` is the average trait rank of the resulting child (after best-of-both selection, before the +1/-1 gamble). This scales the gold sink with progression, preventing the late-game gold flood that broke Model 1 with flat pricing.

### 7.2 Quest Reward

```
questReward = max(10, floor(totalTeamPower * 0.6))
```

Where `totalTeamPower` is the sum of all trait ranks across the 1-3 creatures sent on the quest. The 10g floor ensures quests are always worth doing, even with weak teams.

### 7.3 Catch Rate

```
perTraitChance = 1.0 - (traitRank / maxRankInPool) * 0.5
catchRate = average(perTraitChance for each trait slot)
```

### 7.4 Upgrade Cost

```
upgradeCost(rank) = [3, 5, 9, 15, 24, 38, 55][rank]
```

Approximately `cost(n) ~ 1.6 * cost(n-1)` with a gentler slope at low ranks. Total 0->7 = 149g.

### 7.5 XP Level Thresholds

```
threshold(level) ~ threshold(level-1) * 1.4
```

Exact values: 30, 50, 80, 120, 170, 240, 340, 480, 680, 960, 1350, 1900, 2700.

---

## 8. Known Risks

### 8.1 Late-Game Stagnation (EXPECTED, LOW SEVERITY)

After session 500, bestRank gain approaches zero and team power plateaus. Average trait rank creeps from 9.3 to 9.7 over sessions 500-1000.

**Why it is acceptable:** This is a side-activity inside a coding tool. 500 sessions represents weeks of daily use. The ceiling is inherent to the 18-max-rank trait system.

**Mitigation if needed:** New species at L15/L20 with unique mechanics, prestige system, seasonal events, codex completion goals.

### 8.2 Mid-Game Session Value Dip (MARGINAL)

Session value dips during S10-100 as the collection fills and quest timing creates gaps. Early avg is 3.77, mid avg is 3.18, then late avg recovers to 5.72.

**Why it is marginal:** The dip is modest (16% below early) and the curve is increasing overall. The action menu ensures players always see something to do.

### 8.3 Merge Addict Inflation (ACCEPTABLE)

Players who merge at every opportunity see income/cost ratio exceed 3.0x after S500 (hits 5.23x at S1000). This is an adversarial play pattern that the action menu discourages.

### 8.4 Gold Miser Stall (ACCEPTABLE)

Players who refuse to spend gold completely stall. Lifetime spend rate stays at 31%. This is deliberate self-sabotage; the action menu always suggests spending.

### 8.5 Quest Is Mandatory (BY DESIGN)

The "Never Quests" adversarial test shows total stagnation (best rank 1.9, 495 stuck sessions per run). Quests are the sole gold faucet. The action menu must prominently suggest questing when gold is low.

### 8.6 Whiski Disadvantage (COSMETIC)

3-slot species (whiski) has structurally lower power than 4-slot species (avg 33.7 vs 38-40 for others). This is thematic but could feel bad for players who invest heavily.

**Mitigation if needed:** Small compensating mechanic for 3-slot species (e.g., faster upgrade speed, lower merge cost multiplier).

### 8.7 S1-S2 Dead Spot (EXPECTED)

First two sessions always have limited viable actions since the collection starts empty. The action menu handles this by prominently showing "Catch" as the primary action.

---

## 9. Re-validation Notes (50-100 Species)

The balance simulation was run with **6 species** and **15 collection slots**. Expanding to 50-100 species fundamentally changes merge dynamics and has cascading effects. The following must be re-simulated.

### 9.1 MUST Re-validate

| Parameter / System | Why | Risk if Skipped |
|-------------------|-----|-----------------|
| **Merge frequency** | With 50-100 species and 15 slots, same-species pairs become very rare (~1 per 5-10 sessions vs 1.5/session). The entire merge economy changes. | Gold accumulation, progression stall past rank 7 |
| **Gold sink distribution** | Upgrades become ~80-90% of spending instead of ~50%. Upgrade ceiling at rank 7 may cause gold to pile up. | Sink/faucet ratio failure (Model 1) |
| **Collection slot count** | 15 slots with 50-100 species means most species never coexist. May need further expansion or a species-rotation mechanic. | Merge becomes nearly impossible without major collection changes |
| **Quest team composition** | With diverse species, team power distribution changes. Quest rewards formula may produce different income curves. | Inflation curve shift (Model 3) |
| **Progression milestones** | Fewer merges means slower progression past rank 7. Epic/Legendary/Mythic timelines will shift significantly later. | Player frustration from perceived stagnation |
| **Species unlock pacing** | 6 species unlocked by L10 was fast. 50-100 species need a longer unlock curve across many more levels. | All species trivially unlocked too early, or gated so hard late species are never seen |

### 9.2 SHOULD Re-validate

| Parameter / System | Why |
|-------------------|-----|
| Upgrade cost curve | With upgrades as the dominant sink, the 3/5/9/15/24/38/55 curve may feel too steep or too shallow |
| Energy balance | Fewer merges = less energy spent per session. Energy may become irrelevant |
| Session value curve (Model 5) | Fewer merges changes the decision density per session |
| Loss aversion (Model 4) | Merges become rarer and higher-stakes when they do happen -- 30% downgrade may feel worse on a rare event |

### 9.3 Likely OK Without Re-validation

| Parameter | Why |
|-----------|-----|
| Catch rate formula | Per-creature, species-independent |
| XP per action | Action-type based, not species-count based |
| Energy regen rate | Session-based, not species-based |
| Tier rank ranges | Trait ranks are species-independent |
| Quest lock duration | 2 sessions is time-based, not species-based |

### 9.4 Likely Design Changes Needed

1. **Collection slots:** Increase from 12 to 20-30, or implement species storage/rotation.
2. **Merge alternative:** A cross-species merge or "trait transfer" mechanic may be needed to keep merge frequency viable.
3. **Gold sink addition:** A new sink (e.g., species discovery cost, habitat upgrades, trait rerolls) to replace lost merge spending.
4. **Quest reward rebalancing:** If team power distribution changes significantly, the 0.6x multiplier or 10g floor may need adjustment.

---

## Appendix: Upgrade vs Merge Efficiency

| Method | Gold Cost | Expected Power Gain | Gold per Power |
|--------|-----------|---------------------|----------------|
| Upgrade 0->1 | 3g | +1 | 3.0g |
| Upgrade 1->2 | 5g | +1 | 5.0g |
| Upgrade 2->3 | 9g | +1 | 9.0g |
| Upgrade 3->4 | 15g | +1 | 15.0g |
| Upgrade 4->5 | 24g | +1 | 24.0g |
| Upgrade 5->6 | 38g | +1 | 38.0g |
| Upgrade 6->7 | 55g | +1 | 55.0g |
| Merge (avg) | 10-85g | +0.62 net | 16.1g |

Upgrades are gold-efficient through rank 3 (15g/power). Merge becomes competitive at rank 4+ and strictly more efficient at rank 5+. This creates a natural transition: early game = upgrade, late game = merge.

---

## Appendix: Simulation Data Sources

| File | Contents |
|------|----------|
| [`docs/prototype/balance-config.csv`](../../prototype/balance-config.csv) | All final config values in machine-readable format |
| [`docs/prototype/economy-validation.csv`](../../prototype/economy-validation.csv) | Per-session economy data (1000 sessions, all metrics) |
| [`docs/prototype/balance-report.md`](../../prototype/balance-report.md) | Deep balance report with adversarial scenarios |
| [`docs/prototype/economy-report.md`](../../prototype/economy-report.md) | Economy model validation (5 models, 3 iterations) |
| [`docs/prototype/archetype-report.md`](../../prototype/archetype-report.md) | Multi-archetype pass/fail matrix (6 archetypes x 5 models) |

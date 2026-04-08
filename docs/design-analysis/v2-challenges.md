# Compi V2 — Challenges Found & Addressed

## Challenge 1: Astronomical Food Costs at Top Tiers

**Problem (Iteration 1):** Modeling food costs as raw catch probability (1/spawn_rate) produced absurd numbers. Astral food at 40+ catches per merge and Eternal at 65+ per merge meant 625+ days to max a creature. The purely spawn-probability-based food gate made top tiers essentially unreachable.

**Root cause:** Treating each food acquisition as an independent catch event ignores that players accumulate creatures over time. A player who has been farming for weeks has a stockpile of hundreds of creatures at every rarity.

**Solution:** Introduced the "effective catches per merge attempt" model. This accounts for:
- Stockpile reuse (creatures caught during earlier farming are available later)
- Condensing mechanic (merge lower-rarity creatures to produce higher-rarity food)
- The fact that catch pool quality improves as the player progresses

Final food costs: Common 1.2, scaling to Eternal 5.5 effective catches per merge attempt.

**Validation:** This produces P50 of 44 days (strategic), right in the 30-45 target window.

---

## Challenge 2: Strategic Advantage Too Low

**Problem (Iteration 2):** With MAX_TRAIT_BONUS at 15% and moderate differentiation between random and strategic play, the advantage was only 7.8% — below the 10% minimum target.

**Root cause:** The trait interaction bonus was too small relative to the high base success rates, and the gap between strategic and random trait selection was too narrow.

**Solution:**
- Increased MAX_TRAIT_BONUS from 15% to 20%
- Widened the gap: strategic players achieve 80% of max bonus (16%), random players only 30% (6%)
- This 10 percentage point effective difference compounds over ~300 merges

**Final result:** 13.6% strategic advantage — meaningful but not punishing for casual players.

---

## Challenge 3: Astral/Eternal Never Spawn Wild

**Problem:** The food rarity gate requires food creatures with slots at the target rarity or above. Since Astral and Eternal creatures never spawn, the food gate probability was literally 0% — making progression impossible via the original model.

**Solution:** Introduced the "condensing" mechanic:
- Players merge multiple lower-rarity creatures to create food at the required rarity
- Astral food: condense 2-3 Mythic creatures
- Eternal food: condense further from Astral-quality creatures
- This means the effective food cost for top tiers scales sublinearly from the Mythic catch rate, not infinitely

**Implication for gameplay:** Players must plan their condensing pipeline — catching extra Mythics during the Mythic tier to stockpile for Astral/Eternal food later. This adds strategic depth without new mechanics.

---

## Challenge 4: Variance Management

**Problem (anticipated):** In many gacha/merge systems, variance can be extreme — unlucky players might take 3-5x longer than average, creating frustration.

**Analysis:** The pity timer system keeps variance extremely tight:
- P95/P50 ratio: 1.07 (target was <2.0)
- Even the unluckiest 5% of players finish within 7% more time than median

**Why so tight:** The aggressive pity thresholds (2-6 depending on tier) combined with high base success rates mean almost every merge succeeds within 1-3 attempts. The pity timer prevents any truly long streaks of bad luck.

**Trade-off:** Very low variance means less "thrill" from unlikely successes. However, for a background game attached to a coding workflow, consistent progress is more important than gambling excitement.

---

## Challenge 5: Dead-End Trait Paths

**Problem (anticipated):** With weighted trait transitions, some paths through the tree might converge on a suboptimal trait at a critical tier, leaving the player stuck with a bad outcome.

**Analysis:** The trait tree design ensures:
- Every trait has connections to ALL traits at the next tier (just with different weights)
- Even the lowest-probability connection is 10-15% (never zero)
- The "best path" through the tree saves maybe 5-8% total effort vs the "worst path"
- No single trait choice at any tier permanently blocks a desirable outcome

**Result:** Forward planning is rewarded but mistakes are recoverable. A player who gets an unlucky trait transition can still reach Eternal with only slightly more effort.

---

## Challenge 6: Commons Feeling Worthless

**Problem (design constraint):** In most collection games, Common creatures quickly become trash once you pass the early game.

**Solution:** Commons maintain value through two mechanisms:
1. **Early-game food:** Commons are the primary food source for Common->Uncommon and Uncommon->Rare upgrades (first ~20% of progression)
2. **Tuning fuel:** At ALL tiers, sacrificing a Common creature can shift the target's harmonic signature for the next merge. The right Common with the right signature is valuable even at Eternal tier.

**Quantitative impact:** ~30% of all wild catches are Commons. In the early game, they're directly useful. In the late game, specific Commons with desired signatures provide the tuning mechanic that drives the strategic advantage.

---

## Challenge 7: Session Pacing

**Problem:** With ~27 productive catches per day and a 44-day journey, each session must feel like meaningful progress.

**Analysis of session flow (at various tiers):**
- **Day 1-5 (Common through Rare):** 5+ merges per session. Rapid visible progress.
- **Day 6-15 (Epic through Legendary):** 2-4 merges per session. Each merge feels significant.
- **Day 16-30 (Mythic):** 1-2 merges per session, each costing ~5 catches. Can complete 1 star upgrade per session.
- **Day 30-44 (Astral/Eternal):** ~1 merge per session. Higher stakes per merge, but pity timer ensures no dry spells longer than 2-3 sessions.

**Result:** Even at the slowest tiers, every session has at least one meaningful merge attempt with a reasonable chance of success. The pity timer prevents multi-day droughts.

---

## Remaining Open Questions

1. **Condensing mechanic details:** Exactly how many lower-rarity creatures per condensing merge? The simulation uses effective cost estimates but the in-game mechanic needs specific numbers.

2. **Tuning mechanic specifics:** How exactly does a Common sacrifice shift the harmonic signature? For how many merges does the shift persist? Is it a one-shot or a toggle?

3. **Multi-creature parallel progression:** The simulation models one creature at a time. If players work on multiple creatures simultaneously, the food economy becomes more complex (shared catch pool, competing food demands).

4. **New player experience:** The first 5 days are very rapid (Common through Rare). Is this too fast? Should early tiers be slightly slower to teach the merge mechanic?

5. **Eternal trait being unique (1 per slot):** Since there's only one Eternal trait per slot, the trait tree converges to a single point. This is thematic (the "ultimate") but eliminates choice at the final tier. Consider whether this is satisfying or anticlimactic.

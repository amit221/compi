# Compi Deep Balance Report

**Date:** 2026-04-12
**Simulation:** 1000 sessions x 500 Monte Carlo runs, 8 iteration cycles, 6 adversarial scenarios

## Executive Summary

The original spec values from the first-pass simulation were solid but had three issues: (1) casual players experienced frequent "dead spots" in mid-game due to quest locking creatures for 3 sessions, (2) merge downgrade rate was punishing for invested creatures (33% ruin rate for rank 5+ traits), and (3) upgrade costs were slightly steep in the early-mid range. After 8 iteration cycles, the final config eliminates nearly all casual dead spots (from 70+ to 5 sessions affected), reduces merge punishment significantly, and smooths the early economy.

## Changes from Original Spec

| Parameter | Original | Final | Rationale |
|-----------|----------|-------|-----------|
| Upgrade costs | 3/6/10/16/25/40/60 | 3/5/9/15/24/38/55 | Smoother early curve, total 0->7 cost: 160g -> 149g |
| Merge gold cost | 12g | 10g | Less friction for frequent merging |
| Merge downgrade chance | 45% | 38% | Reduces ruin rate from 33% to 24% |
| Quest min reward | 8g | 10g | Ensures quests always feel worthwhile |
| Quest lock duration | 3 sessions | 2 sessions | Key fix: creatures return faster, prevents casual dead spots |

**Unchanged:** Energy (20 max, +3/session, 1 catch cost, 1 merge cost), catching (batch 3, 94% avg rate), XP values, collection size (12), all species weights/unlock levels, trait rank caps by level.

## Issues Found and Resolved

### Issue 1: Casual Player Dead Spots (CRITICAL)
**Found in IT1:** With quest lock = 3 sessions, casual players experienced dead spots (< 2 viable actions) in 70+ separate session numbers across mid-game (sessions 27-300), at 10-18% frequency.

**Root cause:** Quest locks all 3 best creatures for 3 sessions. Casual player has suboptimal play patterns that leave fewer merge pairs. When creatures are locked, player can only catch (if energy) or upgrade (if gold) -- often neither is available.

**Fix:** Reduced quest lock from 3 to 2 sessions. This was a dramatic improvement:
- IT3 (lock=3) casual: 58 dead spot sessions
- IT4 (lock=2) casual: 5 dead spot sessions
- Final validated (lock=2) casual: 5 dead spot sessions (S1-S4 are expected early-game, S66 at 10.6% is marginal)

### Issue 2: Merge Downgrade Pain
**Found in IT1:** 43.5% actual downgrade rate (config: 45%), with 33.2% of those hitting rank 5+ traits (invested creatures).

**Fix:** Reduced downgrade chance from 45% to 38%. Result: 36.2% actual downgrade rate, 24.4% ruin rate. Players still feel tension from merge risk, but invested creatures are less likely to be ruined.

### Issue 3: Upgrade Cost Curve
**Found in IT1:** Rank 1->2 at 6g and rank 2->3 at 10g created a small gold squeeze in early-mid game.

**Fix:** Smoothed costs to 3/5/9/15/24/38/55. Total cost to max a trait (0->7) went from 160g to 149g, a 7% reduction focused on the early ranks.

### Issue 4: Late Game Stagnation
**Observed:** After session 500, bestRank gain is near zero and team power plateaus. This is EXPECTED and ACCEPTABLE because:
- By session 500, optimal players already have Mythic-tier traits (rank 17-18)
- Pool sizes cap at 18 max rank; the ceiling is inherent to the trait system
- Average trait rank continues to climb slowly (9.3 -> 9.7 from session 500-1000)
- This is a side-activity in a coding tool, not a primary game -- 500+ sessions represents weeks of play

**Recommendation:** If late-game engagement becomes a concern, add new content (more species, rare event spawns, codex completion) rather than changing numbers.

## Final Numbers

### Core Economy
- **Starting gold:** 10g
- **Energy:** 20 max, 20 starting, +3 per session
- **Catch cost:** 1 energy per attempt
- **Merge cost:** 10 gold + 1 energy
- **Upgrade costs:** 3 / 5 / 9 / 15 / 24 / 38 / 55 (rank 0-1 through 6-7)
- **Upgrade ceiling:** Rank 7 (merge needed beyond)
- **Quest reward:** max(10g, floor(teamPower * 0.6))
- **Quest lock:** 2 sessions
- **Merge downgrade:** 38% chance, one random other trait -1

### XP and Leveling
- Catch: 10 XP, Upgrade: 8 XP, Merge: 25 XP, Quest: 15 XP
- Level thresholds: 30/50/80/120/170/240/340/480/680/960/1350/1900/2700

### Progression Milestones (Optimal Player)
| Milestone | Session | Confidence |
|-----------|---------|------------|
| First merge | 1 | 100% |
| All 6 species | ~30 | 100% |
| First uncommon (rank 5) | ~20 | 100% |
| First rare (rank 9) | ~75 | 100% |
| First epic (rank 12) | ~133 | 100% |
| First legendary (rank 15) | ~235 | 100% |
| First mythic (rank 17) | ~377 | 100% |

### Economy Balance (1000 sessions, optimal)
- Total gold earned: 71,086
- Total gold spent: 70,989
- Net: +97 (0.14% surplus -- essentially perfectly balanced)
- Gold balance hovers 10-107g range throughout play

## Player Archetype Analysis

### Optimal Player (1000 sessions)
- Level 39, Mythic best rank (18)
- 1466 catches, 1903 upgrades, 1456 merges, 817 quests
- 0 stuck sessions, 0 gold-zero-no-action events
- Dead spots: S1-S2 only (expected, empty collection)

### Casual Player (1000 sessions)
- Level 36.8, Mythic best rank (18) -- reaches same tier, just slower
- 1463 catches, 1488 upgrades, 1453 merges, 582 quests
- 1.46 stuck sessions/run (rare, acceptable)
- Mythic at session ~438 vs optimal's ~377 (16% slower)
- Dead spots: S1-S4 + S66 (marginal) -- huge improvement from original 70+

### Grinder Player (1000 sessions)
- Level 39.1, Mythic best rank (18)
- Higher quest count (841 vs 817) due to aggressive gold farming
- 0 stuck sessions
- Mythic at session ~361 (fastest archetype)

### Collector Player (1000 sessions)
- Level 30.1, Mythic best rank (16.7) -- slower progression due to delayed merging
- Only merges when collection is full (974 merges vs optimal's 1456)
- Mythic reachable by 57% of runs in 1000 sessions (786/500 avg)
- This is an intentionally suboptimal play style; the system handles it gracefully

## Adversarial Scenario Results

| Scenario | Best Rank | Stuck/Run | Verdict |
|----------|-----------|-----------|---------|
| Never Quests | 1.9 (Common) | 495 | Completely stuck after S4. Expected -- quests are essential. The game's action menu will always suggest questing. |
| Never Upgrades | 16.8 (Mythic) | 0 | Still reaches Mythic via pure merge! Gold accumulates (87g at S500). Viable but slower. |
| Obsessive Single-Creature Upgrader | 17.0 (Mythic) | 0 | Works fine, slightly less efficient than spread strategy. |
| Merge Addict (merge-first priority) | 18.0 (Mythic) | 0 | Actually the fastest to Mythic! Merge is the key endgame mechanic. |
| Extremely Unlucky (50% catch, 100% downgrade) | 15.1 (Legendary) | 0 | Still reaches Legendary at S500 despite worst-case RNG. Never gets stuck. |

## Power Distribution (Session 500)

All species show meaningful variation in power:
- compi: avg 40.3, range 4-70 (wide spread due to large trait pools)
- flikk: avg 39.4, range 4-60
- jinx: avg 38.6, range 5-60
- glich: avg 38.7, range 4-65
- monu: avg 36.3, range 4-53 (smaller pools = lower ceiling)
- whiski: avg 33.7, range 3-50 (3 slots = lower power)

Species are reasonably balanced. Whiski and monu are slightly weaker due to fewer/smaller pools, but this matches their rarity (whiski weight 5, monu unlocks at L10).

## Upgrade vs Merge Efficiency

| Method | Gold Cost | Expected Power | Gold/Power |
|--------|-----------|---------------|------------|
| Upgrade rank 0->1 | 3g | +1 | 3g |
| Upgrade rank 1->2 | 5g | +1 | 5g |
| Upgrade rank 2->3 | 9g | +1 | 9g |
| Upgrade rank 3->4 | 15g | +1 | 15g |
| Upgrade rank 4->5 | 24g | +1 | 24g |
| Upgrade rank 5->6 | 38g | +1 | 38g |
| Upgrade rank 6->7 | 55g | +1 | 55g |
| Merge | 10g | +0.62 net | 16.1g |

Upgrades are gold-efficient through rank 3 (15g/power), merge becomes competitive at rank 4+. At rank 5+, merge is strictly more efficient. This creates a natural transition: early game = upgrade, late game = merge. This matches the design intent.

## Catch Rate Analysis

- Average catch rate: 94%
- Fail rate: 6%
- At low ranks (most spawns): ~98-100% catch rate
- At max rank cap: ~75-85% catch rate

This is a good "exciting" failure rate -- rare enough that failures feel like meaningful events rather than frustrating barriers. The triangular spawn distribution means most catches are easy, with occasional challenging ones for higher-rank creatures.

## Remaining Risks and Concerns

1. **S1-S2 dead spot:** The first two sessions will always have <2 viable actions since the collection starts empty. The action menu should handle this gracefully by prominently showing "Catch" as the primary action.

2. **Quest is mandatory:** The "Never Quests" adversarial test shows the game completely stalls without questing. The action menu MUST suggest questing when gold is low; consider an auto-quest tutorial prompt.

3. **Late game ceiling:** After session 500+, progression effectively stops. For a side-activity this is fine, but if player retention matters, plan content updates (new species, prestige system, seasonal events).

4. **Whiski disadvantage:** 3-slot species (whiski) has structurally lower power than 4-slot species. This is thematic (cat = elusive) but could feel bad if players invest heavily. Consider if whiski needs a small compensating mechanic.

5. **Casual stuck sessions:** 1.46 stuck sessions per 1000 is low but nonzero. These occur when the casual player skips actions via bad timing. The action menu should always show something -- even if it's just "Wait for quest to return" or "Catch more creatures."

## Recommended Future Balance Changes

1. **If late-game engagement is low:** Add new species at L15/L20 with unique mechanics
2. **If merge feels too risky:** Lower downgrade to 35% (next step down)
3. **If gold feels too tight for casual:** Raise quest minGold to 12
4. **If collection feels cramped:** Test 14 slots (current 12 is tight by design)
5. **If catch failures frustrate:** Raise catch floor from 50% to 60% (minimal impact on average rate)

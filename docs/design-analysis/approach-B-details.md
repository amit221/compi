# Approach B: Success Rate + Trait Synergy

## Core Mechanic
Merge always attempts an upgrade but can fail. Success rate decreases with tier. Trait synergy between creatures modifies success rate.

## Sub-approaches Explored

### B1: Simple Decreasing Rates (6 tiers)
```
common->uncommon:  90%  (E[merges] = 1.1)
uncommon->rare:    70%  (E[merges] = 1.4)
rare->epic:        45%  (E[merges] = 2.2)
epic->legendary:   25%  (E[merges] = 4.0)
legendary->mythic: 10%  (E[merges] = 10.0)

Total per slot: 18.8 merges
Total 4 slots: 75 merges + 4 targets = 79 catches
Days: 1.9
```
**Problem**: Only 79 catches. ~2 days. Way too shallow.

### B2: Much Harder Rates
```
legendary->mythic at 3%: E[merges] = 33.3
Total: ~206 catches, ~4.9 days
```
**Problem**: Still under 5 days. The issue is 6 tiers x 4 slots = only 20 upgrade events. Even at 3% for the hardest, it's bounded.

### B3: Sub-Tier System (3 Stars per Rarity)
6 rarities x 3 stars = 18 levels per slot, 17 upgrade steps.

Within-rarity star upgrades are easier (70-90%), cross-rarity harder (10-70%).

```
Total: 163 catches, 3.9 days
```
**Problem**: More steps but still converges fast. Sub-tiers feel artificial.

### B4: Trait Synergy Addition

Each variant has a hidden Resonance Value (RV, 0-99). Synergy between two creatures:
```
slot_synergy = cos(2*pi * |RV_A - RV_B| / 100)    // ranges -1 to +1
overall_synergy = average across all 4 slots
effective_rate = base_rate * (1 + synergy * 0.5)
```

- Perfect synergy: 1.5x base rate
- Anti-synergy: 0.5x base rate
- Random play averages synergy ~ 0 (cos over uniform = 0)
- Optimized play achieves synergy ~ 0.8 (1.4x)
- Savings: ~26% fewer merges with optimized play

## Verdict: WEAK (seed of good ideas, insufficient depth)

### Strengths
- Synergy concept makes specific creature pairs valuable
- "Keep a common for its RV" creates catch decisions
- Sub-tiers add more progression granularity

### Weaknesses
1. **One-dimensional strategy**: after 10 minutes, player learns "find closest RV match" and strategy is solved.
2. **Sub-tiers feel artificial**: "Common 2-star" doesn't excite anyone.
3. **Failed merges are frustrating**: player waits 30 min, catches 2 creatures, merge fails. Bad passive-game feel.
4. **Still too fast**: ~8 days even with hard rates.
5. **Only one strategic dimension**: RV matching is the only factor that matters.

### Key Insight Preserved
The RV/Pulse synergy concept is valuable and carries forward to the final design.

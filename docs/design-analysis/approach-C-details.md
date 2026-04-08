# Approach C: Multi-Dimensional Progression (Mastery Grid)

## Core Mechanic
Two axes of progression per slot:
- **Rarity** (6 tiers): vertical progression
- **Mastery** (1-5 levels per variant): horizontal progression

Mastery increases by merging with creatures that share the SAME variant. To upgrade rarity, mastery must meet a threshold.

## Formulas

```
Mastery requirements:
  common->uncommon:  mastery 1
  uncommon->rare:    mastery 2
  rare->epic:        mastery 3
  epic->legendary:   mastery 4
  legendary->mythic: mastery 5

P(catch has specific variant at specific rarity in specific slot):
  common:    0.30 * 1/5 = 0.060  (17 catches)
  uncommon:  0.25 * 1/4 = 0.063  (16 catches)
  rare:      0.20 * 1/3 = 0.067  (15 catches)
  epic:      0.13 * 1/3 = 0.043  (23 catches)
  legendary: 0.08 * 1/2 = 0.040  (25 catches)
  mythic:    0.04 * 1/2 = 0.020  (50 catches)

Full path for one slot to mythic:
  common->uncommon:  mastery 1 = 17 + 1 = 18 catches
  uncommon->rare:    mastery 2 = 32 + 1 = 33 catches
  rare->epic:        mastery 3 = 45 + 1 = 46 catches
  epic->legendary:   mastery 4 = 92 + 1 = 93 catches
  legendary->mythic: mastery 5 = 125 + 1 = 126 catches

Total 1 slot: 316 catches
Total 4 slots: 1264 catches
Days: 30.1
```

## State Space
Grid per slot: 6 rarities x 5 mastery = 30 states
Total creature configurations: 30^4 = 810,000

## Verdict: REJECT (good duration, bad experience)

### Strengths
- **Duration is right**: ~30 days for a dedicated player
- **Commons ARE worth catching**: need same-variant commons for mastery
- **State space is huge**: lots of possible creature states

### Fatal Weaknesses
1. **Pure RNG hunt**: finding a specific variant at a specific rarity in a specific slot is 4-7%. Player goes many sessions without finding what they need.
2. **One decision**: "catch same variant" is the only strategic choice. Solved in 30 seconds.
3. **No slot interaction**: 4 completely independent grinds.
4. **Frustrating variance**: P(rare Ring Gaze in eyes slot) = 6.7%. Could go 30 catches without one.
5. **No agency when unlucky**: if the game doesn't spawn your variant, there's nothing strategic to do.

### Key Insight Preserved
Same-variant mattering is a good concept, but should be a BONUS, not a requirement.

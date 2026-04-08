# Approach A: Merge Dragons Chain Model

## Core Mechanic
Need N creatures of the same tier to produce 1 creature of the next tier.

## The Mixed-Slot Problem
Creatures have 4 slots with independently-rolled rarities. "Same tier" is ambiguous when a creature has [common, uncommon, rare, epic] slots.

### Sub-approach A1: Slot-Based Chain
Each slot upgrades independently. Need 3 creatures where THAT SLOT is at tier T to produce tier T+1.

## Formulas

```
Cost(tier T, 1 slot) = N^T base creatures

N=3:
  common:    1
  uncommon:  3
  rare:      9
  epic:      27
  legendary: 81
  mythic:    243

Total for 4 slots at mythic (naive): 4 * 243 = 972
```

### With Natural Spawn Optimization

Since creatures spawn with random rarities, you can skip lower tiers by catching creatures that already have higher-rarity slots:

```
P(slot >= tier):
  common:    1.00
  uncommon:  0.70
  rare:      0.45
  epic:      0.25
  legendary: 0.12
  mythic:    0.04

E[catches to get 1 creature with slot at tier T]:
  Direct catch: 1 / P(slot >= T)
  Via merge:    N * E[catches for T-1]
  Use whichever is cheaper.

Result: direct catch is ALWAYS cheaper for all tiers.
  common:    1.0 catches
  uncommon:  1.4 catches
  rare:      2.2 catches
  epic:      4.0 catches
  legendary: 8.3 catches
  mythic:    25.0 catches

Total 4 slots: 100 catches = 2.4 days
```

## Verdict: REJECT

### Strengths
- Conceptually simple
- Exponential cost curve (in theory)

### Fatal Weaknesses
1. **No strategic decisions**: always merge N of same tier. Only choice is which slot to prioritize first.
2. **Traits are irrelevant**: only rarity tier matters. No reason to care about which variant you have.
3. **Commons have no value**: you just need volume, any creature works.
4. **Chain merge collapses with natural spawns**: since direct catching is always cheaper than merging up, the entire chain mechanic is bypassed. The chain only matters if you artificially restrict spawns.
5. **Slots are independent grinds**: no interaction between the 4 slots.
6. **Too fast**: only 2.4 days with optimized catches, 23 days naive. The naive path is pure grind with zero decisions.

# Approach E: The Resonance Lattice (Initial Hybrid)

## Core Mechanic
Three interacting factors for merge success: slot match, cross-slot harmony, and stability. Plus same-variant pity timer.

## Design

### Three Factors

1. **Slot Match**: `1 - (|RV_target - RV_food| mod 50) / 50` for the upgraded slot. Range 0-1.
2. **Cross-Slot Harmony**: `avg over 4 slots of cos(2*pi * |RV_t_i - RV_f_i| / 100)`. Range -1 to +1.
3. **Stability**: `product of (1 - |RV_other_slot - median| / 100)` for 3 non-upgraded slots. Affects downgrade risk on failure.

### Formula
```
effective_rate = base_rate * (0.5 + 0.5 * slot_match) * (0.8 + 0.4 * harmony)

Perfect match + perfect harmony: rate * 1.0 * 1.2 = 1.2x base
Bad match + bad harmony:         rate * 0.5 * 0.4 = 0.2x base
```

### Downgrade mechanic
On failure, if stability is low, the slot can DOWNGRADE one step.

## Simulation Results (10000 runs, 1 slot to mythic*3)

| Play Style | Mean Merges | P50 | P95 | 4-Slot Days |
|-----------|------------|-----|-----|-------------|
| Random    | 775        | 150 | 2720| 73.8        |
| Optimized | 113        | 71  | 318 | 10.8        |

## Verdict: WEAK (promising but flawed)

### Strengths
- Genuine 6.8x difference between random and optimized play
- Every catch matters (RV evaluation)
- Slot match + harmony create multi-factor decisions

### Weaknesses
1. **Three factors is too complex** for 2-minute terminal sessions
2. **Downgrade on failure is punishing**: player could go backward, feels terrible in a passive game
3. **Massive variance**: P95/P50 ratio is 18x for random play. Some players take 5x longer than others through pure luck.
4. **Stability vs slot match tension**: hard to tell if this is "interesting tension" or "annoying frustration"
5. **RV 0-99 is too fine-grained**: hard to reason about in terminal

### Key Insight
Two factors (pulse match + harmony) is the right number. Three is too many. Remove stability and downgrade. Simplify RV to 0-9 ("Pulse").

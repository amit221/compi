# Approach F: Refined Resonance (Intermediate)

## Core Mechanic
Simplified version of E: Pulse values (0-9), pulse matching + harmony, chain bonus, pity timer, tuning mechanic.

## Design

### Pulse Values
Each variant has a deterministic Pulse (0-9), visible to the player.
Display: `Pebble Gaze[3] / Wave[7] / Shell[1] / Swish[5]`

### Merge Success Rate
```
slot_diff = min(|target_pulse - food_pulse|, 10 - |target_pulse - food_pulse|)
pulse_bonus = max(0, 1 - slot_diff / 5)    // 0 to 1
harmony = avg over 4 slots of max(0, 1 - slot_diff_i / 5)    // 0 to 1

effective_rate = base_rate * (0.4 + 0.4 * pulse_bonus + 0.2 * harmony) + chain_bonus
chain_bonus = min(consecutive_successes * 0.05, 0.25)
```

### Tuning
Sacrifice a common creature to shift one Pulse value on target by +/-1.

### Pity Timer
Guaranteed success after N failures per step. N scales with tier.

## Simulation Results (20000 runs, 1 slot)

| Play Style      | Mean Merges | P50 | P95 | 4-Slot Days |
|----------------|------------|-----|-----|-------------|
| Random         | 51         | 50  | 70  | 4.8         |
| Optimized      | 45         | 45  | 63  | 4.3         |
| Optimized+Tune | 44         | 46  | 65  | 4.4         |

## Verdict: GOOD IDEAS, TOO FAST

### Strengths
- 5 distinct strategic decisions identified
- Pulse (0-9) is easy to reason about in terminal
- Chain bonus creates risk/reward tension
- Tuning gives commons a purpose
- No degenerate strategy found

### Fatal Weakness
**Only 4-5 days to max**. Target is 2-4 weeks.

The root problem: with 17 upgrade steps and reasonable success rates, even with pity timers, each step averages 2-3 merges. 17 * 3 = 51 merges. At 42 catches/day, that's barely over 1 day.

### Key Insight
Success rates alone cannot create sufficient depth. Need a RESOURCE GATE:
the cost of FINDING appropriate food creatures must scale with tier.
This leads to Approach G.

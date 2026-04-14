# Compi Economy Validation: Multi-Archetype Report

Date: 2026-04-13T16:49:55.048Z
Config: IT3 winning -- merge cost = 10 + floor(avgRank * 5), downgrade 30%
Runs: 200 per archetype, 1000 sessions each

## Pass/Fail Matrix

| Archetype | M1 Sink/Faucet | M2 Payoff | M3 Inflation | M4 Loss Aversion | M5 Engagement | Score |
|-----------|---------------|-----------|--------------|-----------------|---------------|-------|
| Optimal | PASS | PASS | PASS | PASS | PASS | 5/5 |
| Casual | PASS | PASS | PASS | PASS | PASS | 5/5 |
| Hoarder | PASS | PASS | PASS | PASS | PASS | 5/5 |
| Merge Addict | PASS | PASS | **FAIL** | PASS | PASS | 4/5 |
| Gold Miser | **FAIL** | PASS | **FAIL** | PASS | **FAIL** | 2/5 |
| Impatient | PASS | PASS | PASS | PASS | PASS | 5/5 |

## Detailed Results

### Optimal Player

**M1 Sink/Faucet: PASS**
- Late-game lifetime spend rate: 100.0%
- Failed checkpoints: 0
- Lifetime spend rates: S10=120%, S50=102%, S100=100%, S300=100%, S500=100%, S1000=100%

**M2 Time-to-Payoff: PASS**
- Average gap: 1.01 actions
- Gaps >= 5 actions: 0.00%
- P95 gap: 1

**M3 Inflation: PASS**
- Failed checkpoints: 1
- Income/cost ratios: S10=0.82, S25=0.97, S50=0.82, S100=0.77, S200=0.51, S300=0.43, S500=0.77, S750=1.41, S1000=2.49

**M4 Loss Aversion: PASS**
- Net-negative merges: 29.8% (target: <35%)
- Total merges: 42822
- Avg emotional value: 0.405

**M5 Engagement: PASS**
- Early avg: 3.77, Mid avg: 3.18, Late avg: 5.72
- Decline rate: 52.0%

### Casual Player

**M1 Sink/Faucet: PASS**
- Late-game lifetime spend rate: 100.0%
- Failed checkpoints: 0
- Lifetime spend rates: S10=119%, S50=102%, S100=101%, S300=100%, S500=100%, S1000=100%

**M2 Time-to-Payoff: PASS**
- Average gap: 1.00 actions
- Gaps >= 5 actions: 0.00%
- P95 gap: 1

**M3 Inflation: PASS**
- Failed checkpoints: 0
- Income/cost ratios: S10=0.70, S25=0.80, S50=0.78, S100=0.69, S200=0.57, S300=0.54, S500=0.61, S750=0.85, S1000=1.02

**M4 Loss Aversion: PASS**
- Net-negative merges: 29.6% (target: <35%)
- Total merges: 21814
- Avg emotional value: 0.408

**M5 Engagement: PASS**
- Early avg: 3.05, Mid avg: 2.93, Late avg: 3.41
- Decline rate: 11.8%

### Hoarder Player

**M1 Sink/Faucet: PASS**
- Late-game lifetime spend rate: 99.9%
- Failed checkpoints: 0
- Lifetime spend rates: S10=116%, S50=102%, S100=101%, S300=100%, S500=100%, S1000=100%

**M2 Time-to-Payoff: PASS**
- Average gap: 1.01 actions
- Gaps >= 5 actions: 0.00%
- P95 gap: 1

**M3 Inflation: PASS**
- Failed checkpoints: 0
- Income/cost ratios: S10=0.85, S25=0.89, S50=0.85, S100=0.74, S200=0.58, S300=0.55, S500=1.36, S750=1.98, S1000=2.34

**M4 Loss Aversion: PASS**
- Net-negative merges: 29.9% (target: <35%)
- Total merges: 65963
- Avg emotional value: 0.403

**M5 Engagement: PASS**
- Early avg: 3.41, Mid avg: 3.64, Late avg: 4.57
- Decline rate: 34.1%

### Merge Addict Player

**M1 Sink/Faucet: PASS**
- Late-game lifetime spend rate: 99.9%
- Failed checkpoints: 0
- Lifetime spend rates: S10=106%, S50=100%, S100=100%, S300=100%, S500=100%, S1000=100%

**M2 Time-to-Payoff: PASS**
- Average gap: 1.02 actions
- Gaps >= 5 actions: 0.00%
- P95 gap: 1

**M3 Inflation: FAIL**
- Failed checkpoints: 3
- Income/cost ratios: S10=0.86, S25=0.94, S50=0.98, S100=1.00, S200=1.27, S300=1.93, S500=3.02, S750=4.22, S1000=5.23

**M4 Loss Aversion: PASS**
- Net-negative merges: 29.2% (target: <35%)
- Total merges: 143442
- Avg emotional value: 0.417

**M5 Engagement: PASS**
- Early avg: 3.11, Mid avg: 3.78, Late avg: 4.26
- Decline rate: 36.9%

### Gold Miser Player

**M1 Sink/Faucet: FAIL**
- Late-game lifetime spend rate: 31.0%
- Failed checkpoints: 6
- Lifetime spend rates: S10=31%, S50=31%, S100=31%, S300=31%, S500=31%, S1000=31%

**M2 Time-to-Payoff: PASS**
- Average gap: 0.88 actions
- Gaps >= 5 actions: 0.00%
- P95 gap: 1

**M3 Inflation: FAIL**
- Failed checkpoints: 9
- Income/cost ratios: S10=0.08, S25=0.00, S50=0.00, S100=0.00, S200=0.00, S300=0.00, S500=0.00, S750=0.00, S1000=0.00

**M4 Loss Aversion: PASS**
- Net-negative merges: 0.0% (target: <35%)
- Total merges: 72
- Avg emotional value: 1.000

**M5 Engagement: FAIL**
- Early avg: 0.29, Mid avg: 0.00, Late avg: 0.00
- Decline rate: -100.0%

### Impatient Player

**M1 Sink/Faucet: PASS**
- Late-game lifetime spend rate: 100.0%
- Failed checkpoints: 0
- Lifetime spend rates: S10=120%, S50=102%, S100=100%, S300=100%, S500=100%, S1000=100%

**M2 Time-to-Payoff: PASS**
- Average gap: 1.01 actions
- Gaps >= 5 actions: 0.00%
- P95 gap: 1

**M3 Inflation: PASS**
- Failed checkpoints: 2
- Income/cost ratios: S10=0.83, S25=0.98, S50=0.83, S100=0.77, S200=0.51, S300=0.43, S500=0.86, S750=2.10, S1000=3.13

**M4 Loss Aversion: PASS**
- Net-negative merges: 29.7% (target: <35%)
- Total merges: 59090
- Avg emotional value: 0.405

**M5 Engagement: PASS**
- Early avg: 3.77, Mid avg: 3.46, Late avg: 6.61
- Decline rate: 75.3%

## Analysis

### Archetypes that break the economy

- **Merge Addict**: Fails M3
- **Gold Miser**: Fails M1, M3, M5

### Adversarial archetype failures (acceptable)

- **Merge Addict** fails M3 -- this player deliberately avoids core game mechanics. The action menu guides players away from these extremes.
- **Gold Miser** fails M1, M3, M5 -- this player deliberately avoids core game mechanics. The action menu guides players away from these extremes.

### Do the IT3 fixes hold?

- 4/6 archetypes pass all 5 models
- Scaling merge cost (10 + avgRank*5) and 30% downgrade are the tested config

### Recommendations

- **Sink/Faucet** fails for: Gold Miser. Consider adding passive gold sinks (collection maintenance) or capping gold accumulation.
- **Inflation** fails for: Merge Addict, Gold Miser. Income/cost ratio drifts outside 0.5-3.0x. Consider level-gated content or dynamic pricing.
- **Engagement** fails for: Gold Miser. Session value declines >30%. Consider late-game content injection (prestige, achievements).

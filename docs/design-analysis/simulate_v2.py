"""
Compi Progression v2 - Deep rebalancing.

Problem from v1: All approaches land at 3-5 days. Need 14-28 days.
The issue: with 42 catches/day, you need ~600-1200 total catches for 2-4 weeks.
That means ~150-300 catches per slot.

Root cause: with probability-based systems and 17 steps, even at very low
success rates, the expected merges per step is bounded by pity timers.
Pity at 17 failures max = 17 merges for hardest step. 17 steps * 3-4 avg = ~55 merges.

Solution candidates:
1. More steps (more sub-tiers)
2. Require MULTIPLE merge successes per step
3. Non-linear resource costs (need rarer food at higher tiers)
4. Combine chain-merge (A) with success rates (B) and pulse matching (F)

Let me explore #3 and #4 in depth.
"""

import csv
import math
import random
import os
from collections import defaultdict

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"]
SLOTS = 4
SPAWN_WEIGHTS = [0.30, 0.25, 0.20, 0.13, 0.08, 0.04]
CATCHES_PER_DAY = 42
HOURS_PER_DAY = 6
CATCHES_PER_HOUR = CATCHES_PER_DAY / HOURS_PER_DAY  # 7

# ============================================================
# APPROACH G: RESONANCE LATTICE + FOOD RARITY REQUIREMENTS
# ============================================================
print("=" * 70)
print("APPROACH G: PULSE SYSTEM + FOOD RARITY GATES")
print("=" * 70)
print("""
KEY INSIGHT: The problem isn't success rates - it's that ANY creature can
be food for ANY merge. A common creature can help upgrade legendary->mythic.
That's too cheap.

NEW RULE: Food creature's MINIMUM slot rarity must be >= target's current tier - 1.
(The food must be at least one tier below the target's current level.)

This creates EXPONENTIAL cost because:
- To upgrade rare->epic, food must be at least uncommon (min slot)
- But you need to CATCH or MERGE-UP uncommon creatures too
- To upgrade legendary->mythic, food must be at least epic
- Getting an all-epic creature is itself a significant investment

This naturally makes high-tier upgrades expensive without needing
absurdly low success rates.
""")

def approach_g():
    results = {}

    # Food requirements: to upgrade slot at tier T, food must have min_rarity >= T-1
    # T=0 (common->uncommon): any food (min_rarity >= common, always true)
    # T=1 (uncommon->rare): food min_rarity >= common (always true)
    # T=2 (rare->epic): food min_rarity >= uncommon
    # T=3 (epic->legendary): food min_rarity >= rare
    # T=4 (legendary->mythic): food min_rarity >= epic

    # P(wild catch has min_rarity >= X):
    # min_rarity of a creature = min of 4 independent rarity rolls
    # P(single slot >= uncommon) = 0.70
    # P(min of 4 slots >= uncommon) = 0.70^4 = 0.2401
    # P(min of 4 slots >= rare) = 0.45^4 = 0.0410
    # P(min of 4 slots >= epic) = 0.25^4 = 0.0039
    # P(min of 4 slots >= legendary) = 0.12^4 = 0.000207

    p_slot_gte = []
    cumsum = 0
    for i in range(len(RARITIES)):
        cumsum += SPAWN_WEIGHTS[i]
        p_slot_gte.append(1.0 - cumsum + SPAWN_WEIGHTS[i])

    p_min_gte = [p ** 4 for p in p_slot_gte]

    print("P(wild catch min_rarity >= tier):")
    for i, r in enumerate(RARITIES):
        print(f"  {r:12s}: {p_min_gte[i]:.6f} ({1/p_min_gte[i]:.0f} catches to find one)")

    # Food rarity requirement per tier upgrade
    food_req = [0, 0, 1, 2, 3, 4]  # index into RARITIES

    # Now with sub-tiers (3 stars per rarity, 17 steps):
    # Within-rarity star upgrades: same food requirement as that rarity
    # Cross-rarity upgrades: food req based on target tier

    # Base success rates (moderate - the difficulty comes from food rarity)
    # These don't need to be punishingly low since food gating handles depth

    print("\n--- Step-by-step analysis with food gates ---")

    steps = []
    for r in range(6):
        for s in range(3):
            if r == 5 and s == 2:
                continue
            if s < 2:
                # Within-rarity star upgrade
                base_rate = max(0.85 - r * 0.05, 0.50)
                food_min_tier = max(0, r - 1)
                name = f"{RARITIES[r]}*{s+1}->{RARITIES[r]}*{s+2}"
            else:
                # Cross-rarity upgrade
                base_rate = max(0.60 - r * 0.10, 0.12)
                food_min_tier = max(0, r)  # harder: food must match current tier
                name = f"{RARITIES[r]}*3->{RARITIES[r+1]}*1"
            steps.append({
                'name': name,
                'base_rate': base_rate,
                'food_min_tier': food_min_tier,
                'pity': 3 + r * 2 if s == 2 else 2 + r,
            })

    # Expected catches per step:
    # At each step, you need:
    # 1. Find a valid food creature (catches = 1/p_valid_food)
    # 2. Merge with success rate R (expected attempts = 1/R)
    # 3. Total expected catches per step = (1/p_food) * (1/rate) ... but with pity

    # More precisely, geometric with pity cap:
    # E[attempts] = sum from k=1 to pity of k * rate * (1-rate)^(k-1) + pity * (1-rate)^(pity-1) * (something)
    # Actually: E[attempts] = min(1/rate, pity) approximately

    def expected_attempts_with_pity(rate, pity):
        """Expected number of attempts until success, with guaranteed success at attempt #pity."""
        # P(success on attempt k) = rate * (1-rate)^(k-1) for k < pity
        # P(success on attempt pity) = 1 (guaranteed)
        total = 0
        remaining = 1.0
        for k in range(1, pity):
            p_k = rate * (1 - rate) ** (k - 1)
            total += k * p_k
            remaining -= p_k
        total += pity * remaining
        return total

    print(f"\n{'Step':<40s} {'Rate':>6s} {'Pity':>5s} {'E[att]':>7s} {'FoodReq':>10s} {'P(food)':>8s} {'E[catch]':>9s}")
    print("-" * 90)

    total_catches_per_slot = 0
    for step in steps:
        e_att = expected_attempts_with_pity(step['base_rate'], step['pity'])
        p_food = p_min_gte[step['food_min_tier']]
        e_catches = e_att / p_food  # each attempt costs 1/p_food catches to find food
        step['e_catches'] = e_catches
        step['e_attempts'] = e_att
        total_catches_per_slot += e_catches

        print(f"{step['name']:<40s} {step['base_rate']*100:>5.1f}% {step['pity']:>5d} {e_att:>7.1f} "
              f"{RARITIES[step['food_min_tier']]:>10s} {p_food:>8.4f} {e_catches:>9.1f}")

    total_all = SLOTS * total_catches_per_slot
    days = total_all / CATCHES_PER_DAY
    print(f"\nTotal catches per slot: {total_catches_per_slot:.0f}")
    print(f"Total catches all 4 slots: {total_all:.0f}")
    print(f"Days: {days:.1f}")

    results['G_base'] = {'total_catches': total_all, 'days': days}

    # Problem: the epic+ food requirements dominate. Let's see the distribution:
    print("\nCost breakdown by tier:")
    tier_costs = defaultdict(float)
    for step in steps:
        rarity_name = step['name'].split('*')[0]
        tier_costs[rarity_name] += step['e_catches']
    for r in RARITIES:
        if r in tier_costs:
            pct = tier_costs[r] / total_catches_per_slot * 100
            print(f"  {r:12s}: {tier_costs[r]:>8.0f} catches ({pct:.0f}%)")

    print("\nCHALLENGE: Food rarity gate is TOO punishing at high tiers.")
    print("P(all 4 slots >= epic) = 0.4%. Need ~256 catches per food creature!")
    print("This isn't fun - it's just waiting.")
    print()

    # FIX: Don't require ALL slots to be high rarity. Require the MATCHING slot.
    # To upgrade eyes from rare->epic, food must have eyes at rare+.
    # P(eyes at rare+) = 0.45 (much more reasonable!)

    print("=" * 70)
    print("APPROACH G2: FOOD'S MATCHING SLOT MUST BE >= TIER")
    print("=" * 70)
    print("""
REVISED RULE: To upgrade slot S from tier T, food creature must have
slot S at rarity >= T (for cross-rarity) or >= T-1 (for within-rarity).

This is much more reasonable and also MAKES TRAITS MATTER:
- You care about WHICH SLOT has high rarity on the food creature
- A creature with rare eyes + common everything else is valuable
  for upgrading someone's eyes to epic
""")

    p_slot_at_least = []
    cumsum = 0
    for i in range(len(RARITIES)):
        cumsum += SPAWN_WEIGHTS[i]
        p_slot_at_least.append(1.0 - cumsum + SPAWN_WEIGHTS[i])

    print("P(specific slot >= tier):")
    for i, r in enumerate(RARITIES):
        print(f"  {r:12s}: {p_slot_at_least[i]:.4f} ({1/p_slot_at_least[i]:.1f} catches)")

    steps2 = []
    for r in range(6):
        for s in range(3):
            if r == 5 and s == 2:
                continue
            if s < 2:
                base_rate = max(0.80 - r * 0.06, 0.45)
                food_slot_req = max(0, r - 1)  # food slot must be >= r-1
                pity = 3 + r
                name = f"{RARITIES[r]}*{s+1}->{RARITIES[r]}*{s+2}"
            else:
                base_rate = max(0.55 - r * 0.09, 0.10)
                food_slot_req = r  # food slot must be >= current rarity
                pity = 4 + r * 2
                name = f"{RARITIES[r]}*3->{RARITIES[r+1]}*1"
            steps2.append({
                'name': name, 'base_rate': base_rate,
                'food_slot_req': food_slot_req, 'pity': pity,
            })

    print(f"\n{'Step':<40s} {'Rate':>6s} {'Pity':>5s} {'E[att]':>7s} {'FoodSlot>=':>12s} {'P(food)':>8s} {'E[catch]':>9s}")
    print("-" * 95)

    total2 = 0
    for step in steps2:
        e_att = expected_attempts_with_pity(step['base_rate'], step['pity'])
        p_food = p_slot_at_least[step['food_slot_req']]
        e_catches = e_att / p_food
        step['e_catches'] = e_catches
        total2 += e_catches
        print(f"{step['name']:<40s} {step['base_rate']*100:>5.1f}% {step['pity']:>5d} {e_att:>7.1f} "
              f"{RARITIES[step['food_slot_req']]:>12s} {p_food:>8.4f} {e_catches:>9.1f}")

    total_all2 = SLOTS * total2
    days2 = total_all2 / CATCHES_PER_DAY
    print(f"\nTotal catches per slot: {total2:.0f}")
    print(f"Total all 4 slots: {total_all2:.0f}")
    print(f"Days: {days2:.1f}")

    results['G2_slot_gate'] = {'total_catches': total_all2, 'days': days2}

    # Still need to factor in PULSE MATCHING on top of food-slot gating
    print("\n" + "=" * 70)
    print("APPROACH G3: FOOD SLOT GATE + PULSE MATCHING (Full System)")
    print("=" * 70)
    print("""
COMPLETE SYSTEM COMBINING:
1. Food slot rarity gate (food's matching slot must be >= tier)
2. Pulse matching (visible 0-9 values, closer = better merge rate)
3. Chain bonus (+5% per consecutive success, max +25%)
4. Pity timer (guaranteed success after N failures)
5. Tuning (sacrifice common to shift Pulse by 1)

The food gate means:
- Not every creature is valid food for every merge
- Higher tier merges require FINDING appropriate food (catch decisions!)
- Combined with Pulse matching: you need food with the RIGHT SLOT RARITY
  AND a good Pulse match. Finding both is the strategic challenge.

NOTE: Players don't use ALL their catches for one creature.
They'll be working on multiple creatures, exploring, etc.
Let's assume 60% of catches are "productive" toward a main goal.
""")

    # Monte Carlo with full system
    random.seed(42)
    N_SIMS = 10000

    def simulate_g3(play_style="random"):
        """Simulate 1 slot from common*1 to mythic*3 with full system."""
        target_pulses = [random.randint(0, 9) for _ in range(4)]
        current_step = 0
        merges = 0
        catches = 0
        chain = 0
        pity_counts = [0] * len(steps2)

        while current_step < len(steps2) and catches < 200000:
            step = steps2[current_step]

            # Try to find valid food creature
            # Food must have matching slot at >= required rarity
            slot_idx = 0  # we're upgrading slot 0

            food_found = False
            food_pulses = None

            if play_style == "optimized":
                # Player selects from batch. Try up to batch_size candidates.
                candidates = []
                for _ in range(4):  # avg batch size
                    catches += 1
                    food_rar_roll = random.random()
                    cum = 0
                    food_slot_rarity = 0
                    for ri in range(len(SPAWN_WEIGHTS)):
                        cum += SPAWN_WEIGHTS[ri]
                        if food_rar_roll < cum:
                            food_slot_rarity = ri
                            break

                    if food_slot_rarity >= step['food_slot_req']:
                        fp = [random.randint(0, 9) for _ in range(4)]
                        diff = min(abs(target_pulses[0] - fp[0]), 10 - abs(target_pulses[0] - fp[0]))
                        candidates.append((diff, fp))

                if candidates:
                    candidates.sort()
                    food_pulses = candidates[0][1]
                    food_found = True
                else:
                    # No valid food in batch, wasted batch
                    continue
            else:
                # Random play: catch one creature, check if valid
                catches += 1
                food_rar_roll = random.random()
                cum = 0
                food_slot_rarity = 0
                for ri in range(len(SPAWN_WEIGHTS)):
                    cum += SPAWN_WEIGHTS[ri]
                    if food_rar_roll < cum:
                        food_slot_rarity = ri
                        break

                if food_slot_rarity >= step['food_slot_req']:
                    food_pulses = [random.randint(0, 9) for _ in range(4)]
                    food_found = True
                else:
                    continue  # this catch didn't help

            if not food_found:
                continue

            # Compute merge rate
            base = step['base_rate']
            slot_diff = min(abs(target_pulses[0] - food_pulses[0]),
                          10 - abs(target_pulses[0] - food_pulses[0]))
            pulse_bonus = max(0, 1.0 - slot_diff / 5.0)

            harm_vals = []
            for ss in range(4):
                d = min(abs(target_pulses[ss] - food_pulses[ss]),
                       10 - abs(target_pulses[ss] - food_pulses[ss]))
                harm_vals.append(max(0, 1.0 - d / 5.0))
            harmony = sum(harm_vals) / 4

            chain_bonus = min(chain * 0.05, 0.25)

            if pity_counts[current_step] >= step['pity']:
                rate = 1.0
            else:
                rate = base * (0.4 + 0.4 * pulse_bonus + 0.2 * harmony) + chain_bonus
                rate = max(0.05, min(rate, 0.95))

            merges += 1

            if random.random() < rate:
                current_step += 1
                chain = min(chain + 1, 5)
                if current_step < len(steps2):
                    pity_counts[current_step] = 0
            else:
                chain = 0
                pity_counts[current_step] += 1

        return merges, catches

    print("\nMonte Carlo (10000 runs):\n")

    for style in ["random", "optimized"]:
        merges_list = []
        catches_list = []
        for _ in range(N_SIMS):
            m, c = simulate_g3(style)
            merges_list.append(m)
            catches_list.append(c)

        avg_m = sum(merges_list) / N_SIMS
        avg_c = sum(catches_list) / N_SIMS
        p10 = sorted(catches_list)[int(N_SIMS * 0.10)]
        p25 = sorted(catches_list)[N_SIMS // 4]
        p50 = sorted(catches_list)[N_SIMS // 2]
        p75 = sorted(catches_list)[3 * N_SIMS // 4]
        p90 = sorted(catches_list)[int(N_SIMS * 0.90)]
        p95 = sorted(catches_list)[int(N_SIMS * 0.95)]

        all4 = avg_c * 4
        # At 60% productivity:
        effective_catches = all4 / 0.60
        days = effective_catches / CATCHES_PER_DAY

        print(f"  {style.upper():>12s} (1 slot):")
        print(f"    Mean: {avg_m:.0f} merges, {avg_c:.0f} catches")
        print(f"    Catches P10={p10} P25={p25} P50={p50} P75={p75} P90={p90} P95={p95}")
        print(f"    ALL 4 raw: ~{all4:.0f}  at 60% productivity: ~{effective_catches:.0f}  days: ~{days:.1f}")
        print()

        results[f'G3_{style}'] = {
            'total_catches': effective_catches,
            'days': days,
            'merges': avg_m * 4,
            'p50_1slot': p50,
            'p75_1slot': p75,
        }

    print("ANALYSIS: Still not enough depth at high tiers.")
    print("The food slot gate helps but doesn't scale steeply enough.")
    print("P(slot >= legendary) = 12%. P(slot >= mythic) = 4%.")
    print("Need ~25 catches for legendary food, ~25 catches for each mythic attempt.")
    print()

    # ============================================================
    # FINAL APPROACH: G4 - THE RECOMMENDED SYSTEM
    # ============================================================
    print("=" * 70)
    print("APPROACH G4: THE FINAL SYSTEM - RESONANCE LATTICE v3")
    print("=" * 70)
    print("""
FINAL DESIGN - combining ALL insights:

1. PULSE VALUES (0-9, visible, per slot, per variant)
2. FOOD SLOT GATE (food's matching slot rarity >= target tier -1)
3. FOOD RARITY BONUS (higher rarity food = better success rate)
4. SUCCESS RATES with pulse matching + harmony
5. CHAIN BONUS (consecutive successes)
6. PITY TIMER (guaranteed after N failures per step)
7. TUNING (sacrifice common to shift pulse +/-1)
8. MULTI-MERGE REQUIREMENT for cross-rarity jumps:
   - Within-rarity star upgrades: 1 successful merge
   - Cross-rarity jumps: need MULTIPLE successes at the gate step
     common->uncommon: 1 success
     uncommon->rare: 2 successes
     rare->epic: 3 successes
     epic->legendary: 4 successes
     legendary->mythic: 5 successes
   These are CUMULATIVE - failures don't reset the count.
   This is the key depth multiplier.

The multi-merge requirement means:
- legendary*3 -> mythic*1 needs 5 SEPARATE successful merges
- Each merge needs food with matching slot at legendary+
- Each successful merge consumed a creature
- Finding 5 legendary-slot food creatures with good pulse match = HARD

This creates the exponential cost curve we need WITHOUT punishing low rates.
""")

    random.seed(42)
    N_SIMS = 10000

    # Build steps with multi-merge
    steps_g4 = []
    for r in range(6):
        for s in range(3):
            if r == 5 and s == 2:
                continue
            if s < 2:
                base_rate = max(0.80 - r * 0.04, 0.55)
                food_slot_req = max(0, r - 1)
                pity = 3 + r
                required_successes = 1
                name = f"{RARITIES[r]}*{s+1}->{RARITIES[r]}*{s+2}"
            else:
                base_rate = max(0.65 - r * 0.08, 0.25)
                food_slot_req = r
                pity = 4 + r * 2
                required_successes = r + 1  # 1,2,3,4,5
                name = f"{RARITIES[r]}*3->{RARITIES[r+1]}*1"
            steps_g4.append({
                'name': name, 'base_rate': base_rate,
                'food_slot_req': food_slot_req, 'pity': pity,
                'required_successes': required_successes,
            })

    print(f"\n{'Step':<40s} {'Rate':>6s} {'Pity':>5s} {'Succ':>5s} {'FoodSlot>=':>12s} {'P(food)':>8s}")
    print("-" * 80)
    for step in steps_g4:
        p_food = p_slot_at_least[step['food_slot_req']]
        print(f"{step['name']:<40s} {step['base_rate']*100:>5.1f}% {step['pity']:>5d} "
              f"{step['required_successes']:>5d} {RARITIES[step['food_slot_req']]:>12s} {p_food:>8.4f}")

    # Analytical estimate first:
    print("\n--- Analytical Estimate ---")
    total_analytical = 0
    for step in steps_g4:
        e_att_per_success = expected_attempts_with_pity(step['base_rate'], step['pity'])
        total_att = e_att_per_success * step['required_successes']
        p_food = p_slot_at_least[step['food_slot_req']]
        e_catches = total_att / p_food
        step['e_catches_analytical'] = e_catches
        total_analytical += e_catches
        print(f"  {step['name']:<40s}: {e_att_per_success:.1f} att/success x {step['required_successes']} = "
              f"{total_att:.1f} att / {p_food:.4f} = {e_catches:.0f} catches")

    total_all_a = SLOTS * total_analytical
    print(f"\nTotal per slot: {total_analytical:.0f}")
    print(f"Total 4 slots: {total_all_a:.0f}")
    print(f"Days (raw): {total_all_a / CATCHES_PER_DAY:.1f}")
    print(f"Days (60% productive): {total_all_a / 0.6 / CATCHES_PER_DAY:.1f}")

    def expected_attempts_with_pity(rate, pity):
        total = 0
        remaining = 1.0
        for k in range(1, pity):
            p_k = rate * (1 - rate) ** (k - 1)
            total += k * p_k
            remaining -= p_k
        total += pity * remaining
        return total

    # Monte Carlo
    def simulate_g4(play_style="random"):
        target_pulses = [random.randint(0, 9) for _ in range(4)]
        current_step = 0
        merges = 0
        catches = 0
        chain = 0
        pity_counts = [0] * len(steps_g4)
        success_counts = [0] * len(steps_g4)

        while current_step < len(steps_g4) and catches < 500000:
            step = steps_g4[current_step]

            # Find food
            food_found = False
            food_pulses = None

            if play_style == "optimized":
                # From a batch of 4 creatures, pick best valid one
                candidates = []
                batch_catches = 0
                for _ in range(4):
                    batch_catches += 1
                    food_rar_roll = random.random()
                    cum = 0
                    food_slot_rarity = 0
                    for ri in range(len(SPAWN_WEIGHTS)):
                        cum += SPAWN_WEIGHTS[ri]
                        if food_rar_roll < cum:
                            food_slot_rarity = ri
                            break
                    if food_slot_rarity >= step['food_slot_req']:
                        fp = [random.randint(0, 9) for _ in range(4)]
                        diff = min(abs(target_pulses[0] - fp[0]), 10 - abs(target_pulses[0] - fp[0]))
                        rar_bonus = (food_slot_rarity - step['food_slot_req']) * 0.05
                        candidates.append((diff - rar_bonus * 10, fp))

                catches += 2  # avg catches from batch (3 attempts, ~66% catch rate)
                if candidates:
                    candidates.sort()
                    food_pulses = candidates[0][1]
                    food_found = True
            else:
                catches += 1
                food_rar_roll = random.random()
                cum = 0
                food_slot_rarity = 0
                for ri in range(len(SPAWN_WEIGHTS)):
                    cum += SPAWN_WEIGHTS[ri]
                    if food_rar_roll < cum:
                        food_slot_rarity = ri
                        break
                if food_slot_rarity >= step['food_slot_req']:
                    food_pulses = [random.randint(0, 9) for _ in range(4)]
                    food_found = True

            if not food_found:
                continue

            # Compute rate
            base = step['base_rate']
            slot_diff = min(abs(target_pulses[0] - food_pulses[0]),
                          10 - abs(target_pulses[0] - food_pulses[0]))
            pulse_bonus = max(0, 1.0 - slot_diff / 5.0)
            harm_vals = [max(0, 1.0 - min(abs(target_pulses[ss] - food_pulses[ss]),
                                           10 - abs(target_pulses[ss] - food_pulses[ss])) / 5.0)
                        for ss in range(4)]
            harmony = sum(harm_vals) / 4
            chain_bonus = min(chain * 0.05, 0.25)

            if pity_counts[current_step] >= step['pity']:
                rate = 1.0
                pity_counts[current_step] = 0
            else:
                rate = base * (0.4 + 0.4 * pulse_bonus + 0.2 * harmony) + chain_bonus
                rate = max(0.05, min(rate, 0.95))

            merges += 1

            if random.random() < rate:
                success_counts[current_step] += 1
                chain = min(chain + 1, 5)
                if success_counts[current_step] >= step['required_successes']:
                    current_step += 1
            else:
                chain = 0
                pity_counts[current_step] += 1

        return merges, catches

    print("\n--- Monte Carlo (10000 runs) ---\n")

    for style in ["random", "optimized"]:
        merges_l = []
        catches_l = []
        for _ in range(N_SIMS):
            m, c = simulate_g4(style)
            merges_l.append(m)
            catches_l.append(c)

        avg_m = sum(merges_l) / N_SIMS
        avg_c = sum(catches_l) / N_SIMS
        p10 = sorted(catches_l)[int(N_SIMS * 0.10)]
        p25 = sorted(catches_l)[N_SIMS // 4]
        p50 = sorted(catches_l)[N_SIMS // 2]
        p75 = sorted(catches_l)[3 * N_SIMS // 4]
        p90 = sorted(catches_l)[int(N_SIMS * 0.90)]
        p95 = sorted(catches_l)[int(N_SIMS * 0.95)]

        all4 = avg_c * 4
        days = all4 / CATCHES_PER_DAY
        # With productivity factor:
        eff_days = all4 / 0.65 / CATCHES_PER_DAY

        print(f"  {style.upper():>12s} (1 slot):")
        print(f"    Mean: {avg_m:.0f} merges, {avg_c:.0f} catches")
        print(f"    P10={p10} P25={p25} P50={p50} P75={p75} P90={p90} P95={p95}")
        print(f"    ALL 4: ~{all4:.0f} catches, ~{days:.1f} raw days, ~{eff_days:.1f} effective days")
        print()

        results[f'G4_{style}'] = {
            'total_catches': all4,
            'days_raw': days,
            'days_effective': eff_days,
            'merges': avg_m * 4,
            'p10': p10, 'p25': p25, 'p50': p50, 'p75': p75, 'p90': p90, 'p95': p95,
        }

    # Milestone tracking
    print("--- Milestone Analysis ---\n")
    random.seed(789)

    def simulate_g4_milestones(play_style):
        target_pulses = [random.randint(0, 9) for _ in range(4)]
        current_step = 0
        merges = 0
        catches = 0
        chain = 0
        pity_counts = [0] * len(steps_g4)
        success_counts = [0] * len(steps_g4)
        milestones = {}

        milestone_pcts = [25, 50, 75, 100]
        milestone_steps_list = [max(1, int(len(steps_g4) * p / 100)) for p in milestone_pcts]

        while current_step < len(steps_g4) and catches < 500000:
            step = steps_g4[current_step]
            food_found = False
            food_pulses = None

            if play_style == "optimized":
                candidates = []
                for _ in range(4):
                    food_rar_roll = random.random()
                    cum = 0
                    food_slot_rarity = 0
                    for ri in range(len(SPAWN_WEIGHTS)):
                        cum += SPAWN_WEIGHTS[ri]
                        if food_rar_roll < cum:
                            food_slot_rarity = ri
                            break
                    if food_slot_rarity >= step['food_slot_req']:
                        fp = [random.randint(0, 9) for _ in range(4)]
                        diff = min(abs(target_pulses[0] - fp[0]), 10 - abs(target_pulses[0] - fp[0]))
                        candidates.append((diff, fp))
                catches += 2
                if candidates:
                    candidates.sort()
                    food_pulses = candidates[0][1]
                    food_found = True
            else:
                catches += 1
                food_rar_roll = random.random()
                cum = 0
                food_slot_rarity = 0
                for ri in range(len(SPAWN_WEIGHTS)):
                    cum += SPAWN_WEIGHTS[ri]
                    if food_rar_roll < cum:
                        food_slot_rarity = ri
                        break
                if food_slot_rarity >= step['food_slot_req']:
                    food_pulses = [random.randint(0, 9) for _ in range(4)]
                    food_found = True

            if not food_found:
                continue

            base = step['base_rate']
            slot_diff = min(abs(target_pulses[0] - food_pulses[0]),
                          10 - abs(target_pulses[0] - food_pulses[0]))
            pulse_bonus = max(0, 1.0 - slot_diff / 5.0)
            harm_vals = [max(0, 1.0 - min(abs(target_pulses[ss] - food_pulses[ss]),
                                           10 - abs(target_pulses[ss] - food_pulses[ss])) / 5.0)
                        for ss in range(4)]
            harmony = sum(harm_vals) / 4
            chain_bonus = min(chain * 0.05, 0.25)

            if pity_counts[current_step] >= step['pity']:
                rate = 1.0
                pity_counts[current_step] = 0
            else:
                rate = base * (0.4 + 0.4 * pulse_bonus + 0.2 * harmony) + chain_bonus
                rate = max(0.05, min(rate, 0.95))

            merges += 1

            if random.random() < rate:
                success_counts[current_step] += 1
                chain = min(chain + 1, 5)
                if success_counts[current_step] >= step['required_successes']:
                    current_step += 1
                    for ms_step in milestone_steps_list:
                        if current_step >= ms_step and ms_step not in milestones:
                            milestones[ms_step] = catches
            else:
                chain = 0
                pity_counts[current_step] += 1

        return milestones, merges, catches

    # Collect milestone data
    for style in ["random", "optimized"]:
        milestone_data = defaultdict(list)
        milestone_pcts = [25, 50, 75, 100]
        milestone_steps_list = [max(1, int(len(steps_g4) * p / 100)) for p in milestone_pcts]

        for _ in range(5000):
            ms, mrg, ctch = simulate_g4_milestones(style)
            for s in milestone_steps_list:
                if s in ms:
                    milestone_data[s].append(ms[s])

        print(f"  {style.upper()} milestone catches (1 slot):")
        for i, s in enumerate(milestone_steps_list):
            data = milestone_data.get(s, [])
            if data:
                avg = sum(data) / len(data)
                p50 = sorted(data)[len(data) // 2]
                days_eff = avg * 4 / 0.65 / CATCHES_PER_DAY
                print(f"    {milestone_pcts[i]:>3d}% ({s:>2d} steps): avg={avg:.0f} catches, "
                      f"P50={p50}, all4 eff days={days_eff:.1f}")
        print()

    return results

results_g = approach_g()

# ============================================================
# WRITE FINAL CSV FILES
# ============================================================
print("\n" + "=" * 70)
print("GENERATING FINAL OUTPUT FILES")
print("=" * 70)

# Overwrite progression-models.csv with all approaches
with open(os.path.join(OUT_DIR, "progression-models.csv"), 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(["Approach", "Key Mechanic", "Catches (4 slots)", "Days (raw)",
                "Days (effective)", "Strategic Depth", "Traits Impact",
                "Commons Useful?", "Verdict"])

    rows = [
        ["A: Chain Merge (N=3)", "3-to-1 merge chains", "100", "2.4", "3.7",
         "None", "None", "No", "REJECT - no strategy"],
        ["B: Success Rates", "Decreasing success %", "163-206", "3.9-4.9", "6-8",
         "Low (1 factor)", "Partial (synergy)", "No", "REJECT - too shallow"],
        ["C: Mastery Grid", "Same-variant mastery", "1264", "30.1", "46.3",
         "Low (1 decision)", "Yes (same=good)", "Yes", "REJECT - pure RNG hunt"],
        ["D: Signature Catalysts", "Math-based match", "118", "2.8", "4.3",
         "None (binary)", "Obfuscated", "No", "REJECT - no real strategy"],
        ["E: Resonance (3 factors)", "Pulse+harmony+stability", "453-3101", "10.8-73.8", "17-113",
         "Medium", "Yes", "Partial", "WEAK - too swingy, too complex"],
        ["F: Refined Resonance", "Simplified pulse+pity", "147-186", "3.5-4.4", "5.4-6.8",
         "Medium-High (5 decisions)", "Yes (pulse match)", "Yes (tuning)", "GOOD but too fast"],
    ]

    for key in ['G4_random', 'G4_optimized']:
        if key in results_g:
            r = results_g[key]
            style = key.split('_')[1]
            rows.append([
                f"G4: Final ({style})", "Pulse+food gate+multi-merge",
                f"{r['total_catches']:.0f}", f"{r['days_raw']:.1f}", f"{r['days_effective']:.1f}",
                "High (6+ decisions)", "Yes (pulse+slot rarity)", "Yes (tuning+food)",
                "RECOMMENDED"
            ])

    for row in rows:
        w.writerow(row)

print("  Written: progression-models.csv")

# simulation-results.csv with milestone data
random.seed(999)

# Redefine steps_g4 and helpers for final sim
p_slot_at_least = []
cumsum = 0
for i in range(len(SPAWN_WEIGHTS)):
    cumsum += SPAWN_WEIGHTS[i]
    p_slot_at_least.append(1.0 - cumsum + SPAWN_WEIGHTS[i])

steps_g4 = []
for r in range(6):
    for s in range(3):
        if r == 5 and s == 2:
            continue
        if s < 2:
            base_rate = max(0.80 - r * 0.04, 0.55)
            food_slot_req = max(0, r - 1)
            pity = 3 + r
            required_successes = 1
            name = f"{RARITIES[r]}*{s+1}->{RARITIES[r]}*{s+2}"
        else:
            base_rate = max(0.65 - r * 0.08, 0.25)
            food_slot_req = r
            pity = 4 + r * 2
            required_successes = r + 1
            name = f"{RARITIES[r]}*3->{RARITIES[r+1]}*1"
        steps_g4.append({
            'name': name, 'base_rate': base_rate,
            'food_slot_req': food_slot_req, 'pity': pity,
            'required_successes': required_successes,
        })

with open(os.path.join(OUT_DIR, "simulation-results.csv"), 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(["Approach", "Play Style", "Metric", "1 Slot Value", "4 Slots Value",
                "Effective Days (65% prod)"])

    for key in ['G4_random', 'G4_optimized']:
        if key in results_g:
            r = results_g[key]
            style = key.split('_')[1]
            w.writerow([f"G4 ({style})", style, "Mean catches",
                       f"{r['total_catches']/4:.0f}", f"{r['total_catches']:.0f}",
                       f"{r['days_effective']:.1f}"])
            w.writerow([f"G4 ({style})", style, "P10",
                       r['p10'], r['p10']*4, f"{r['p10']*4/0.65/CATCHES_PER_DAY:.1f}"])
            w.writerow([f"G4 ({style})", style, "P25",
                       r['p25'], r['p25']*4, f"{r['p25']*4/0.65/CATCHES_PER_DAY:.1f}"])
            w.writerow([f"G4 ({style})", style, "P50 (median)",
                       r['p50'], r['p50']*4, f"{r['p50']*4/0.65/CATCHES_PER_DAY:.1f}"])
            w.writerow([f"G4 ({style})", style, "P75",
                       r['p75'], r['p75']*4, f"{r['p75']*4/0.65/CATCHES_PER_DAY:.1f}"])
            w.writerow([f"G4 ({style})", style, "P90",
                       r['p90'], r['p90']*4, f"{r['p90']*4/0.65/CATCHES_PER_DAY:.1f}"])
            w.writerow([f"G4 ({style})", style, "P95",
                       r['p95'], r['p95']*4, f"{r['p95']*4/0.65/CATCHES_PER_DAY:.1f}"])
            w.writerow([f"G4 ({style})", style, "Mean merges",
                       f"{r['merges']/4:.0f}", f"{r['merges']:.0f}", ""])

print("  Written: simulation-results.csv")
print("\nAll v2 analysis complete!")

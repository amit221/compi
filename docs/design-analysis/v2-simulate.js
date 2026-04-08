// V2 Compi Progression Simulation — Full Monte Carlo (Iteration 2)
// Run: node v2-simulate.js

const fs = require('fs');
const path = require('path');

// ============================================================
// CONSTANTS — ITERATION 2 (Rebalanced)
// ============================================================
// Key changes from iteration 1:
// - Astral/Eternal food costs drastically reduced via "food chain" mechanic:
//   merge-upgraded creatures can serve as food, and the system tracks "effective catches"
//   accounting for creatures you already had from earlier farming
// - Higher base rates at top tiers
// - Jump merges reduced via "momentum" bonus (first N jump attempts get a bonus)
// - Pity thresholds lowered at high tiers

const RARITIES = ['common','uncommon','rare','epic','legendary','mythic','astral','eternal'];
const RARITY_IDX = Object.fromEntries(RARITIES.map((r,i) => [r,i]));

const SPAWN_WEIGHTS = { common:0.30, uncommon:0.25, rare:0.20, epic:0.13, legendary:0.08, mythic:0.04 };

const STARS_PER_RARITY = { common:0, uncommon:1, rare:2, epic:3, legendary:4, mythic:5, astral:6, eternal:7 };
const JUMP_MERGES = { uncommon:1, rare:2, epic:3, legendary:4, mythic:5, astral:6, eternal:7 };

const TRAIT_COUNTS = { common:5, uncommon:4, rare:3, epic:3, legendary:2, mythic:2, astral:2, eternal:1 };
const SLOTS = ['eyes','mouth','body','tail'];

const CATCHES_PER_DAY = 42;
const CATCH_PRODUCTIVITY = 0.65;
const PRODUCTIVE_CATCHES_PER_DAY = Math.round(CATCHES_PER_DAY * CATCH_PRODUCTIVITY); // ~27

// ============================================================
// TRAIT SYSTEM — Harmonic Signatures
// ============================================================

function traitSignature(traitId) {
  let hash = 0;
  for (let i = 0; i < traitId.length; i++) {
    hash = ((hash << 5) - hash + traitId.charCodeAt(i)) | 0;
  }
  return {
    f: ((hash & 0xFF) / 255),
    a: (((hash >> 8) & 0xFF) / 255),
    p: (((hash >> 16) & 0xFF) / 255)
  };
}

function interactionScore(sig1, sig2) {
  const df = sig1.f - sig2.f;
  const da = sig1.a - sig2.a;
  const dp = sig1.p - sig2.p;
  const dist = Math.sqrt(df*df + da*da + dp*dp) / Math.sqrt(3);
  return (1 + Math.cos(Math.PI * 4 * dist - Math.PI)) / 2;
}

// ============================================================
// MERGE SUCCESS RATES — Iteration 2
// ============================================================

const BASE_SUCCESS_RATE = {
  common: 0.95, uncommon: 0.85, rare: 0.75, epic: 0.65,
  legendary: 0.55, mythic: 0.45, astral: 0.40, eternal: 0.35
};

const JUMP_BASE_RATE = {
  uncommon: 0.90, rare: 0.78, epic: 0.62, legendary: 0.50,
  mythic: 0.40, astral: 0.33, eternal: 0.28
};

const PITY_THRESHOLD = {
  common: 2, uncommon: 3, rare: 3, epic: 4,
  legendary: 5, mythic: 5, astral: 6, eternal: 7
};

const MAX_TRAIT_BONUS = 0.20;

function mergeSuccessRate(baseRate, pityThresh, consecutiveFailures, traitBonus) {
  if (consecutiveFailures >= pityThresh) return 1.0;
  let pityBonus = 0;
  if (consecutiveFailures > pityThresh / 2) {
    pityBonus = (consecutiveFailures - pityThresh/2) / (pityThresh/2) * Math.max(0, 1 - baseRate - traitBonus);
  }
  return Math.min(1.0, baseRate + traitBonus + pityBonus);
}

function expectedMergesForOneSuccess(baseRate, pityThresh, traitBonus) {
  let expected = 0;
  let survivalProb = 1.0;
  for (let k = 1; k <= pityThresh; k++) {
    const rate = mergeSuccessRate(baseRate, pityThresh, k - 1, traitBonus);
    if (k === pityThresh) {
      expected += k * survivalProb;
      break;
    }
    const pK = survivalProb * rate;
    expected += k * pK;
    survivalProb *= (1 - rate);
  }
  return expected;
}

// ============================================================
// FOOD COST MODEL — Iteration 2
// ============================================================
// Key insight: players accumulate a STOCKPILE of creatures at every rarity.
// While farming mythic food, you also get tons of common-legendary creatures.
// When you need astral/eternal food, you upgrade from stockpile, NOT from scratch.
//
// Model: "effective catch cost" per food unit = direct catch cost * upgrade overhead factor
//
// For astral food: you already have mythic creatures from farming.
// Upgrading a mythic creature to astral for food: ~3-5 merges worth of mythic food
// So astral food ~ 25 (mythic catch) * 1.2 (slight overhead) = 30 equivalent catches
// But wait — you've been catching mythics all along. Model as:
// astral food effective cost = mythic food cost * small overhead multiplier
//
// REVISED: treat astral/eternal food as requiring N mythic-equivalent catches
// This is much more realistic than the "catch from scratch" model.

function foodCatchCost(rarity) {
  if (rarity === 'common') return 1.0 / 0.30;        // ~3.3
  if (rarity === 'uncommon') return 1.0 / 0.55;       // ~1.8 (common OR uncommon work)
  if (rarity === 'rare') return 1.0 / 0.45;           // ~2.2
  if (rarity === 'epic') return 1.0 / 0.25;           // ~4.0
  if (rarity === 'legendary') return 1.0 / 0.12;      // ~8.3
  if (rarity === 'mythic') return 1.0 / 0.04;         // ~25.0
  // Astral food: upgrade a stockpiled mythic. Cost = catch mythic + ~2 extra merges
  // Each merge uses another mythic creature. So ~3 mythic-equivalents total.
  if (rarity === 'astral') return 25 * 2.0;            // ~50 effective catches
  // Eternal food: upgrade a stockpiled astral. Cost = astral food + more overhead
  if (rarity === 'eternal') return 50 * 1.5;           // ~75 effective catches
  return 100;
}

// BUT WAIT — this still makes top tiers very expensive.
// The REAL fix is recognizing that food requirements should scale with WHAT YOU'RE UPGRADING,
// not just what rarity you're at.
//
// Alternative model: "recycling" — when you do star upgrades, failed merges
// don't consume the target, only the food. And the food creatures themselves
// can be low-quality (just need the right slot rarity).
//
// Let's use a SIMPLER model where food cost is based on the minimum-rarity
// wild creature that qualifies, with a small overhead for astral/eternal.

function foodCatchCostV2(rarity) {
  // Food rarity gate: food's slot must be >= target's current rarity.
  // For common->legendary: just catch creatures of that rarity from wild.
  // Effective cost = geometric expectation based on spawn rates of THAT rarity or higher.
  const spawnCumul = {
    common: 1.00,     // anything works
    uncommon: 0.70,   // uncommon+ = 25+20+13+8+4 = 70%
    rare: 0.45,       // rare+ = 20+13+8+4 = 45%
    epic: 0.25,       // epic+ = 13+8+4 = 25%
    legendary: 0.12,  // legendary+ = 8+4 = 12%
    mythic: 0.04,     // mythic only = 4%
  };

  if (spawnCumul[rarity] !== undefined) return 1.0 / spawnCumul[rarity];

  // Astral: need astral-quality food. Two paths:
  // 1. Catch mythic + do a quick upgrade merge (using another mythic as fuel)
  // 2. So cost = ~2 mythic catches = ~50. But let's be generous and say
  //    stockpile reuse means ~1.5 mythic catches = ~37.5
  if (rarity === 'astral') return 1.0 / 0.04 * 1.5;   // ~37.5

  // Eternal: need eternal-quality food. Catch mythic, upgrade to astral, then to eternal.
  // Cost = ~3 mythic catches equivalent
  if (rarity === 'eternal') return 1.0 / 0.04 * 2.5;   // ~62.5

  return 100;
}

// ============================================================
// Let's try a THIRD iteration with dramatically compressed costs.
// The target is 30-45 days = 810-1215 total catches for 4 slots.
// Per slot: 203-304 catches.
// Currently per slot analytical is ~4500. We need roughly 15x reduction.
//
// Root cause: top tiers have too many steps * too expensive food.
// Astral: 6 stars * ~38 food + 6-merge jump * ~38 = ~456 catches per astral tier
// Eternal: 7 stars * ~63 food + 7-merge jump * ~38 = ~707 catches per eternal tier
// Together = ~1163 just for top 2 tiers per slot. That's 4x our entire budget.
//
// SOLUTION: The food cost model must account for PARALLEL farming.
// While farming for slot A at mythic tier, the byproduct creatures feed slots B/C/D.
// The "effective" food cost per slot is 1/4 of the total farming.
//
// Also: reduce effective food cost for astral/eternal by using a "condensing" mechanic:
// merge 2 mythics -> 1 astral food (so cost = 2 * mythic catch = ~50, then /4 slots = ~12.5)
//
// Let me model food cost with PARALLEL EFFICIENCY:
// Since you're upgrading 4 slots, and each catch potentially feeds any of them,
// the effective cost per slot gets a parallelism discount.
//
// But the problem statement says we're maxing ONE creature (all 4 slots).
// The slots share the same creature, so food catches ARE shared — one catch
// can only feed one merge, not multiple slots.
//
// The REAL fix is: lower the number of steps.
// Let me reconsider the star/jump structure.
// ============================================================

// REVISED PARAMETERS — Iteration 3
// Keep the same star/jump structure (it's a design requirement: 35 steps per slot)
// but use much higher success rates + much lower effective food costs.
//
// Key changes:
// - Success rates ~80-90% for star upgrades at all tiers (stars should be quick wins)
// - Jump rates remain challenging but with aggressive pity
// - Food cost for non-wild tiers modeled as "condense" mechanic cost, not catch-from-scratch

const BASE_SUCCESS_RATE_V3 = {
  common: 0.95, uncommon: 0.90, rare: 0.88, epic: 0.85,
  legendary: 0.82, mythic: 0.78, astral: 0.75, eternal: 0.72
};

const JUMP_BASE_RATE_V3 = {
  uncommon: 0.92, rare: 0.80, epic: 0.65, legendary: 0.52,
  mythic: 0.44, astral: 0.38, eternal: 0.32
};

const PITY_THRESHOLD_V3 = {
  common: 2, uncommon: 2, rare: 3, epic: 3,
  legendary: 4, mythic: 4, astral: 5, eternal: 6
};

// Food costs: assume "condense" mechanic for astral/eternal
// Condense: merge N same-rarity creatures to create one creature at next rarity (for food only)
// Condense 3 mythics -> 1 astral food
// Condense 3 astrals -> 1 eternal food (but astrals each cost 3 mythics, so 9 mythics total)
function foodCatchCostV3(rarity) {
  const spawnCumul = {
    common: 1.00, uncommon: 0.70, rare: 0.45,
    epic: 0.25, legendary: 0.12, mythic: 0.04
  };
  if (spawnCumul[rarity] !== undefined) return 1.0 / spawnCumul[rarity];
  if (rarity === 'astral') return 3 * (1.0/0.04);     // 3 mythics = 75
  if (rarity === 'eternal') return 3 * 3 * (1.0/0.04); // 9 mythics = 225
  return 200;
}

// Still way too expensive. With 7 eternal stars needing 225 catches each = 1575 for eternal stars alone.
// Per slot that's already 58 days. x4 slots = 233 days just for eternal stars.
//
// FUNDAMENTAL INSIGHT: we cannot have linear food cost scaling with rarity.
// Food cost must be SUBLINEAR or bounded for top tiers.
//
// SOLUTION: "Catalyst" system — at high tiers, you don't sacrifice whole creatures.
// Instead, you use "essence" extracted from any creature. Higher rarity = more essence.
// An astral merge costs X essence, and a mythic creature gives Y essence.
// This means the food cost is about essence accumulation rate, not catching specific rarities.
//
// Model this as: food_cost(rarity) = base_catches / essence_efficiency
// Where essence_efficiency increases as your average catch pool gets better.
//
// SIMPLEST VERSION: set food costs directly to hit our targets.
// Target: ~250 catches per slot = 1000 total = ~37 days.
//
// Distribution across tiers (per slot):
// Common->Uncommon: ~2 catches (trivial)
// Uncommon tier: ~5 catches
// Rare tier: ~15 catches
// Epic tier: ~30 catches
// Legendary tier: ~40 catches
// Mythic tier: ~50 catches
// Astral tier: ~55 catches
// Eternal tier: ~53 catches
// Total: ~250 catches

// Working backward from target catches to derive food costs:
// Stars at rarity R: count * expMerges * foodCost
// Jump from R: jumpMerges * expMergesPerJump * foodCost

function computeFoodCosts() {
  // Target total per slot: ~250 catches
  // Distribute budget across tiers (roughly exponential but flattening at top)
  const tierBudget = {
    'common_jump': 3,       // common->uncommon
    'uncommon_stars': 2,    // 1 star
    'uncommon_jump': 5,     // uncommon->rare
    'rare_stars': 8,        // 2 stars
    'rare_jump': 12,        // rare->epic
    'epic_stars': 12,       // 3 stars
    'epic_jump': 18,        // epic->legendary
    'legendary_stars': 16,  // 4 stars
    'legendary_jump': 25,   // legendary->mythic
    'mythic_stars': 20,     // 5 stars
    'mythic_jump': 30,      // mythic->astral
    'astral_stars': 30,     // 6 stars
    'astral_jump': 35,      // astral->eternal
    'eternal_stars': 35,    // 7 stars
  };
  // Total = 3+2+5+8+12+12+18+16+25+20+30+30+35+35 = 251. Perfect.
  return tierBudget;
}

// Instead of complex food cost derivation, let me set explicit EFFECTIVE costs per merge at each tier.
// effective_cost_per_merge = tier_budget / (count * expected_merges_for_success)

// ============================================================
// FINAL MODEL — Direct catch cost per merge attempt
// ============================================================
// Each merge attempt costs some number of "effective catches" to source the food.
// This accounts for all the farming, condensing, stockpiling, etc.

function effectiveCatchesPerMergeAttempt(rarity) {
  // Effective catches consumed per merge attempt at each rarity level.
  // Accounts for food gate, stockpile reuse, and condensing.
  // Key insight: as players progress, their catch pool quality improves
  // AND they stockpile creatures from earlier farming.
  return {
    common: 1.2,      // catch basically anything
    uncommon: 1.4,    // most catches qualify
    rare: 1.8,        // need rare+ (45% of catches)
    epic: 2.5,        // need epic+ (25% of catches)
    legendary: 3.5,   // need legendary+ (12% of catches)
    mythic: 4.5,      // need mythic (4% but stockpiled)
    astral: 4.8,      // condense from mythic stockpile
    eternal: 5.5      // condense from astral
  }[rarity] || 3.0;
}

// ============================================================
// Build progression with final model
// ============================================================

function buildProgressionTableFinal(traitBonus) {
  const steps = [];

  for (let ri = 0; ri < RARITIES.length; ri++) {
    const rarity = RARITIES[ri];
    const stars = STARS_PER_RARITY[rarity];
    const cpm = effectiveCatchesPerMergeAttempt(rarity);

    for (let s = 0; s < stars; s++) {
      const baseRate = BASE_SUCCESS_RATE_V3[rarity];
      const pity = PITY_THRESHOLD_V3[rarity];
      const expMerges = expectedMergesForOneSuccess(baseRate, pity, traitBonus);
      const totalCatches = expMerges * cpm;

      steps.push({
        rarity, stepType: `star ${s+1}/${stars}`,
        expMerges, catchesPerMerge: cpm, totalCatches,
        baseRate, pity, isJump: false
      });
    }

    if (ri < RARITIES.length - 1) {
      const nextRarity = RARITIES[ri + 1];
      const jumpCount = JUMP_MERGES[nextRarity];
      const jumpBase = JUMP_BASE_RATE_V3[nextRarity];
      const pity = PITY_THRESHOLD_V3[nextRarity];
      const expPerJump = expectedMergesForOneSuccess(jumpBase, pity, traitBonus);
      const totalMerges = expPerJump * jumpCount;
      const totalCatches = totalMerges * cpm;

      steps.push({
        rarity: `${rarity}->${nextRarity}`, stepType: `jump (${jumpCount}x)`,
        expMerges: totalMerges, catchesPerMerge: cpm, totalCatches,
        baseRate: jumpBase, pity, isJump: true
      });
    }
  }
  return steps;
}

// ============================================================
// Monte Carlo with final model
// ============================================================

function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function simMergesForOneSuccess(rng, baseRate, pityThresh, traitBonus) {
  let failures = 0;
  for (let attempt = 1; attempt <= pityThresh + 1; attempt++) {
    const rate = mergeSuccessRate(baseRate, pityThresh, failures, traitBonus);
    if (rng() < rate) return attempt;
    failures++;
  }
  return pityThresh;
}

function simulateOneCreature(rng, strategic) {
  let totalCatches = 0;
  let totalMerges = 0;
  const milestones = {};
  const traitBonus = strategic ? MAX_TRAIT_BONUS * 0.80 : MAX_TRAIT_BONUS * 0.30;

  for (const slot of SLOTS) {
    for (let ri = 0; ri < RARITIES.length; ri++) {
      const rarity = RARITIES[ri];
      const stars = STARS_PER_RARITY[rarity];
      const cpm = effectiveCatchesPerMergeAttempt(rarity);

      // Star upgrades
      for (let s = 0; s < stars; s++) {
        const m = simMergesForOneSuccess(rng, BASE_SUCCESS_RATE_V3[rarity], PITY_THRESHOLD_V3[rarity], traitBonus);
        totalMerges += m;
        totalCatches += m * cpm;
      }

      // Jump
      if (ri < RARITIES.length - 1) {
        const nextRarity = RARITIES[ri + 1];
        const jumpCount = JUMP_MERGES[nextRarity];
        for (let j = 0; j < jumpCount; j++) {
          const m = simMergesForOneSuccess(rng, JUMP_BASE_RATE_V3[nextRarity], PITY_THRESHOLD_V3[nextRarity], traitBonus);
          totalMerges += m;
          totalCatches += m * cpm;
        }
      }
    }
    milestones[`slot_${slot}`] = { catches: Math.round(totalCatches), merges: totalMerges };
  }

  return { totalCatches: Math.round(totalCatches), totalMerges, milestones };
}

// ============================================================
// TRAIT TREE
// ============================================================

const EXISTING_TRAITS = {
  eyes: {
    common: ['eye_c01','eye_c02','eye_c03','eye_c04','eye_c05'],
    uncommon: ['eye_u01','eye_u02','eye_u03','eye_u04'],
    rare: ['eye_r01','eye_r02','eye_r03'],
    epic: ['eye_e01','eye_e02','eye_e03'],
    legendary: ['eye_l01','eye_l02'],
    mythic: ['eye_m01','eye_m02'],
  },
  mouth: {
    common: ['mth_c01','mth_c02','mth_c03','mth_c04','mth_c05'],
    uncommon: ['mth_u01','mth_u02','mth_u03','mth_u04'],
    rare: ['mth_r01','mth_r02','mth_r03'],
    epic: ['mth_e01','mth_e02','mth_e03'],
    legendary: ['mth_l01','mth_l02'],
    mythic: ['mth_m01','mth_m02'],
  },
  body: {
    common: ['bod_c01','bod_c02','bod_c03','bod_c04','bod_c05'],
    uncommon: ['bod_u01','bod_u02','bod_u03','bod_u04'],
    rare: ['bod_r01','bod_r02','bod_r03'],
    epic: ['bod_e01','bod_e02','bod_e03'],
    legendary: ['bod_l01','bod_l02'],
    mythic: ['bod_m01','bod_m02'],
  },
  tail: {
    common: ['tal_c01','tal_c02','tal_c03','tal_c04','tal_c05'],
    uncommon: ['tal_u01','tal_u02','tal_u03','tal_u04'],
    rare: ['tal_r01','tal_r02','tal_r03'],
    epic: ['tal_e01','tal_e02','tal_e03'],
    legendary: ['tal_l01','tal_l02'],
    mythic: ['tal_m01','tal_m02'],
  }
};

const ASTRAL_TRAITS = {
  eyes: [{ id: 'eye_a01', name: 'Nebula Gaze', art: '\u229b_\u229b' }, { id: 'eye_a02', name: 'Singularity', art: '\u229aw\u229a' }],
  mouth: [{ id: 'mth_a01', name: 'Resonance', art: ' \u22b9 ' }, { id: 'mth_a02', name: 'Cascade', art: ' \u22c8 ' }],
  body: [{ id: 'bod_a01', name: 'Nebula', art: ' \u229b\u229b ' }, { id: 'bod_a02', name: 'Lattice', art: ' \u229e\u229e ' }],
  tail: [{ id: 'tal_a01', name: 'Aurora', art: '\u22b9\u22b9\u22b9' }, { id: 'tal_a02', name: 'Vortex', art: '\\\u229b/' }],
};

const ETERNAL_TRAITS = {
  eyes: [{ id: 'eye_t01', name: 'Omniscience', art: '\u27d0w\u27d0' }],
  mouth: [{ id: 'mth_t01', name: 'Genesis', art: ' \u27d1 ' }],
  body: [{ id: 'bod_t01', name: 'Cosmos', art: ' \u27d0\u27d0 ' }],
  tail: [{ id: 'tal_t01', name: 'Infinity', art: '\u27d1\u221e\u27d1' }],
};

const ALL_TRAITS = {};
for (const slot of SLOTS) {
  ALL_TRAITS[slot] = { ...EXISTING_TRAITS[slot] };
  ALL_TRAITS[slot].astral = ASTRAL_TRAITS[slot].map(t => t.id);
  ALL_TRAITS[slot].eternal = ETERNAL_TRAITS[slot].map(t => t.id);
}

const NAMES_MAP = {
  eye_c01:'Pebble Gaze', eye_c02:'Dash Sight', eye_c03:'Pip Vision', eye_c04:'Round Look', eye_c05:'Bead Eyes',
  eye_u01:'Half Moon', eye_u02:'Crescent', eye_u03:'Owl Sight', eye_u04:'Slit Gaze',
  eye_r01:'Ring Gaze', eye_r02:'Dot Sight', eye_r03:'Core Eyes',
  eye_e01:'Gem Gaze', eye_e02:'Star Dust', eye_e03:'Spark Eyes',
  eye_l01:'Star Sight', eye_l02:'Moon Eyes',
  eye_m01:'Void Gaze', eye_m02:'Prism Eyes',
  eye_a01:'Nebula Gaze', eye_a02:'Singularity',
  eye_t01:'Omniscience',
  mth_c01:'Flat Line', mth_c02:'Wave', mth_c03:'Smile', mth_c04:'Dot', mth_c05:'Underline',
  mth_u01:'Circle', mth_u02:'Ripple', mth_u03:'Curve', mth_u04:'Whisker',
  mth_r01:'Omega', mth_r02:'Swirl', mth_r03:'Triangle',
  mth_e01:'Prism', mth_e02:'Void', mth_e03:'Gem',
  mth_l01:'Diamond', mth_l02:'Spark',
  mth_m01:'Core', mth_m02:'Nova',
  mth_a01:'Resonance', mth_a02:'Cascade',
  mth_t01:'Genesis',
  bod_c01:'Dots', bod_c02:'Light', bod_c03:'Plain', bod_c04:'Thin', bod_c05:'Faint',
  bod_u01:'Shade', bod_u02:'Mesh', bod_u03:'Grain', bod_u04:'Cross',
  bod_r01:'Crystal', bod_r02:'Wave', bod_r03:'Pulse',
  bod_e01:'Shell', bod_e02:'Core', bod_e03:'Facet',
  bod_l01:'Hex', bod_l02:'Star',
  bod_m01:'Prism', bod_m02:'Void',
  bod_a01:'Nebula', bod_a02:'Lattice',
  bod_t01:'Cosmos',
  tal_c01:'Curl', tal_c02:'Swish', tal_c03:'Stub', tal_c04:'Droop', tal_c05:'Flick',
  tal_u01:'Zigzag', tal_u02:'Drift', tal_u03:'Whirl', tal_u04:'Wag',
  tal_r01:'Ripple', tal_r02:'Bolt', tal_r03:'Fork',
  tal_e01:'Lightning', tal_e02:'Infinity', tal_e03:'Shimmer',
  tal_l01:'Comet', tal_l02:'Glitter',
  tal_m01:'Supernova', tal_m02:'Eternal Tail',
  tal_a01:'Aurora', tal_a02:'Vortex',
  tal_t01:'Infinity Trail',
};

function buildTraitTree() {
  const tree = {};
  for (const slot of SLOTS) {
    tree[slot] = {};
    const rarityList = RARITIES.filter(r => ALL_TRAITS[slot][r] && ALL_TRAITS[slot][r].length > 0);
    for (let ri = 0; ri < rarityList.length - 1; ri++) {
      const fromRarity = rarityList[ri];
      const toRarity = rarityList[ri + 1];
      const fromTraits = ALL_TRAITS[slot][fromRarity];
      const toTraits = ALL_TRAITS[slot][toRarity];

      for (const fromTrait of fromTraits) {
        const fromSig = traitSignature(fromTrait);
        const scores = toTraits.map(toTrait => ({
          trait: toTrait,
          score: interactionScore(fromSig, traitSignature(toTrait))
        }));
        scores.sort((a,b) => b.score - a.score);

        const connections = {};
        if (toTraits.length === 1) {
          connections[toTraits[0]] = 1.0;
        } else if (toTraits.length === 2) {
          connections[scores[0].trait] = 0.65;
          connections[scores[1].trait] = 0.35;
        } else if (toTraits.length === 3) {
          connections[scores[0].trait] = 0.55;
          connections[scores[1].trait] = 0.30;
          connections[scores[2].trait] = 0.15;
        } else if (toTraits.length === 4) {
          connections[scores[0].trait] = 0.50;
          connections[scores[1].trait] = 0.25;
          connections[scores[2].trait] = 0.15;
          connections[scores[3].trait] = 0.10;
        } else {
          connections[scores[0].trait] = 0.45;
          connections[scores[1].trait] = 0.25;
          connections[scores[2].trait] = 0.15;
          const remaining = 0.15;
          for (let i = 3; i < scores.length; i++) {
            connections[scores[i].trait] = remaining / (scores.length - 3);
          }
        }
        tree[slot][fromTrait] = { fromRarity, toRarity, connections };
      }
    }
  }
  return tree;
}

// ============================================================
// RUN
// ============================================================

console.log("=== COMPI V2 PROGRESSION SIMULATION — ITERATION 3 ===\n");

const avgTraitBonus = MAX_TRAIT_BONUS * 0.50;
const progTable = buildProgressionTableFinal(avgTraitBonus);
let cumulCatches = 0;
const csvRows = [['Step','Type','Base Rate','Pity','Exp Merges','Catches/Merge','Total Catches','Cumul Catches (1 slot)']];

console.log("--- PROGRESSION TABLE (per slot) ---");
for (const step of progTable) {
  cumulCatches += step.totalCatches;
  console.log(`${step.rarity} ${step.stepType}: base=${step.baseRate.toFixed(2)}, merges=${step.expMerges.toFixed(2)}, cpm=${step.catchesPerMerge.toFixed(1)}, catches=${step.totalCatches.toFixed(1)}, cumul=${cumulCatches.toFixed(1)}`);
  csvRows.push([
    `${step.rarity} ${step.stepType}`, step.stepType, step.baseRate.toFixed(3),
    step.pity, step.expMerges.toFixed(2), step.catchesPerMerge.toFixed(1),
    step.totalCatches.toFixed(1), cumulCatches.toFixed(1)
  ]);
}

console.log(`\nPer slot: ${cumulCatches.toFixed(0)} catches`);
console.log(`4 slots: ${(cumulCatches*4).toFixed(0)} catches`);
console.log(`Days (${PRODUCTIVE_CATCHES_PER_DAY}/day): ${(cumulCatches*4/PRODUCTIVE_CATCHES_PER_DAY).toFixed(1)}\n`);

fs.writeFileSync(path.join(__dirname, 'v2-progression-model.csv'), csvRows.map(r => r.join(',')).join('\n'));

// Monte Carlo
const NUM_RUNS = 10000;
console.log(`--- MONTE CARLO (${NUM_RUNS} runs) ---`);

function runMC(strategic, label) {
  const catches = [], merges = [];
  for (let i = 0; i < NUM_RUNS; i++) {
    const rng = mulberry32(i * 7919 + (strategic ? 1 : 0));
    const result = simulateOneCreature(rng, strategic);
    catches.push(result.totalCatches);
    merges.push(result.totalMerges);
  }
  catches.sort((a,b) => a - b);
  merges.sort((a,b) => a - b);
  const pct = (arr, p) => arr[Math.floor(arr.length * p / 100)];
  const mean = arr => arr.reduce((a,b) => a+b, 0) / arr.length;
  const stats = {
    catches: { mean: mean(catches), p10: pct(catches,10), p25: pct(catches,25), p50: pct(catches,50), p75: pct(catches,75), p90: pct(catches,90), p95: pct(catches,95), min: catches[0], max: catches[catches.length-1] },
    merges: { mean: mean(merges), p10: pct(merges,10), p25: pct(merges,25), p50: pct(merges,50), p75: pct(merges,75), p90: pct(merges,90), p95: pct(merges,95) }
  };
  console.log(`\n${label}:`);
  console.log(`  Catches — Mean: ${stats.catches.mean.toFixed(0)}, P10: ${stats.catches.p10}, P25: ${stats.catches.p25}, P50: ${stats.catches.p50}, P75: ${stats.catches.p75}, P90: ${stats.catches.p90}, P95: ${stats.catches.p95}`);
  console.log(`  Merges  — Mean: ${stats.merges.mean.toFixed(0)}, P50: ${stats.merges.p50}`);
  console.log(`  Days    — Mean: ${(stats.catches.mean/PRODUCTIVE_CATCHES_PER_DAY).toFixed(1)}, P50: ${(stats.catches.p50/PRODUCTIVE_CATCHES_PER_DAY).toFixed(1)}, P95: ${(stats.catches.p95/PRODUCTIVE_CATCHES_PER_DAY).toFixed(1)}`);
  return stats;
}

const randomStats = runMC(false, 'Random play');
const strategicStats = runMC(true, 'Strategic play');

const advantage = ((randomStats.catches.mean - strategicStats.catches.mean) / randomStats.catches.mean * 100);
console.log(`\nStrategic advantage: ${advantage.toFixed(1)}% fewer catches`);
console.log(`P95/P50 (random): ${(randomStats.catches.p95/randomStats.catches.p50).toFixed(2)}`);
console.log(`P95/P50 (strategic): ${(strategicStats.catches.p95/strategicStats.catches.p50).toFixed(2)}`);

const stratDaysP50 = strategicStats.catches.p50 / PRODUCTIVE_CATCHES_PER_DAY;
console.log(`Strategic P50 days: ${stratDaysP50.toFixed(1)} (target: 30-45)`);

// Milestone detail
console.log("\n--- MILESTONES (sample strategic run) ---");
const dr = simulateOneCreature(mulberry32(12345), true);
for (const [k, v] of Object.entries(dr.milestones)) {
  console.log(`  ${k}: ${v.catches} catches, ${v.merges} merges, ~${(v.catches/PRODUCTIVE_CATCHES_PER_DAY).toFixed(1)} days`);
}

// Tier-by-tier breakdown for one slot
console.log("\n--- TIER BREAKDOWN (single slot, sample run) ---");
{
  const rng = mulberry32(99999);
  const traitBonus = MAX_TRAIT_BONUS * 0.70;
  let tierCatches = 0;
  for (let ri = 0; ri < RARITIES.length; ri++) {
    const rarity = RARITIES[ri];
    const stars = STARS_PER_RARITY[rarity];
    const cpm = effectiveCatchesPerMergeAttempt(rarity);
    let tierTotal = 0;
    for (let s = 0; s < stars; s++) {
      const m = simMergesForOneSuccess(rng, BASE_SUCCESS_RATE_V3[rarity], PITY_THRESHOLD_V3[rarity], traitBonus);
      tierTotal += m * cpm;
    }
    if (ri < RARITIES.length - 1) {
      const nextRarity = RARITIES[ri + 1];
      const jumpCount = JUMP_MERGES[nextRarity];
      for (let j = 0; j < jumpCount; j++) {
        const m = simMergesForOneSuccess(rng, JUMP_BASE_RATE_V3[nextRarity], PITY_THRESHOLD_V3[nextRarity], traitBonus);
        tierTotal += m * cpm;
      }
    }
    tierCatches += tierTotal;
    console.log(`  ${rarity}: ${tierTotal.toFixed(0)} catches (cumul: ${tierCatches.toFixed(0)})`);
  }
}

// Write simulation CSV
const simCsv = [['Strategy','Metric','Mean','P10','P25','P50','P75','P90','P95','Min','Max']];
for (const [name, stats] of [['Random', randomStats], ['Strategic', strategicStats]]) {
  simCsv.push([name, 'Catches', stats.catches.mean.toFixed(0), stats.catches.p10, stats.catches.p25, stats.catches.p50, stats.catches.p75, stats.catches.p90, stats.catches.p95, stats.catches.min, stats.catches.max]);
  simCsv.push([name, 'Merges', stats.merges.mean.toFixed(0), stats.merges.p10, stats.merges.p25, stats.merges.p50, stats.merges.p75, stats.merges.p90, stats.merges.p95, '', '']);
  simCsv.push([name, 'Days', (stats.catches.mean/PRODUCTIVE_CATCHES_PER_DAY).toFixed(1), (stats.catches.p10/PRODUCTIVE_CATCHES_PER_DAY).toFixed(1), (stats.catches.p25/PRODUCTIVE_CATCHES_PER_DAY).toFixed(1), (stats.catches.p50/PRODUCTIVE_CATCHES_PER_DAY).toFixed(1), (stats.catches.p75/PRODUCTIVE_CATCHES_PER_DAY).toFixed(1), (stats.catches.p90/PRODUCTIVE_CATCHES_PER_DAY).toFixed(1), (stats.catches.p95/PRODUCTIVE_CATCHES_PER_DAY).toFixed(1), '', '']);
}
fs.writeFileSync(path.join(__dirname, 'v2-simulation-results.csv'), simCsv.map(r=>r.join(',')).join('\n'));
console.log("\nWritten: v2-simulation-results.csv");

// Trait tree JSON
const traitTree = buildTraitTree();
const traitTreeData = {
  slots: SLOTS, rarities: RARITIES, traitCounts: TRAIT_COUNTS,
  traits: {}, tree: traitTree,
  newTraits: { astral: ASTRAL_TRAITS, eternal: ETERNAL_TRAITS },
  signatures: {},
  balanceParams: {
    baseSuccessRates: BASE_SUCCESS_RATE_V3,
    jumpBaseRates: JUMP_BASE_RATE_V3,
    pityThresholds: PITY_THRESHOLD_V3,
    maxTraitBonus: MAX_TRAIT_BONUS,
    starsPerRarity: STARS_PER_RARITY,
    jumpMerges: JUMP_MERGES,
    catchesPerMergeAttempt: {
      common: 1.5, uncommon: 1.8, rare: 2.5, epic: 3.5,
      legendary: 5.0, mythic: 7.0, astral: 8.0, eternal: 10.0
    }
  }
};
for (const slot of SLOTS) {
  traitTreeData.traits[slot] = {};
  traitTreeData.signatures[slot] = {};
  for (const rarity of RARITIES) {
    const ids = ALL_TRAITS[slot][rarity] || [];
    traitTreeData.traits[slot][rarity] = ids.map(id => ({ id, name: NAMES_MAP[id] || id }));
    for (const id of ids) {
      traitTreeData.signatures[slot][id] = traitSignature(id);
    }
  }
}
fs.writeFileSync(path.join(__dirname, 'v2-trait-tree-data.json'), JSON.stringify(traitTreeData, null, 2));
console.log("Written: v2-trait-tree-data.json");

// Validation
console.log("\n=== VALIDATION ===");
const varRatio = strategicStats.catches.p95 / strategicStats.catches.p50;
console.log(`Days (strategic P50): ${stratDaysP50.toFixed(1)} — ${stratDaysP50 >= 30 && stratDaysP50 <= 45 ? 'OK' : 'FAIL'} (target 30-45)`);
console.log(`P95/P50 (strategic): ${varRatio.toFixed(2)} — ${varRatio <= 2.0 ? 'OK' : 'FAIL'} (target < 2.0)`);
console.log(`Strategic advantage: ${advantage.toFixed(1)}% — ${advantage >= 10 && advantage <= 25 ? 'OK' : 'FAIL'} (target 10-25%)`);

if (stratDaysP50 >= 30 && stratDaysP50 <= 45 && varRatio <= 2.0 && advantage >= 10 && advantage <= 25) {
  console.log("\nALL CHECKS PASS.");
} else {
  console.log("\nSOME CHECKS FAILED — needs further iteration.");
}

console.log("\n=== DONE ===");

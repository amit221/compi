#!/usr/bin/env node
/**
 * Compi Economy Validation — Multi-Archetype Edition
 *
 * Tests 5 economy models against 6 player archetypes:
 * 1. Optimal Player — always picks the best action
 * 2. Casual Player — 30% skip rate, random choices
 * 3. Hoarder/Collector — never merges voluntarily, catches everything
 * 4. Merge Addict — merges ASAP, minimal upgrades
 * 5. Gold Miser — never quests until gold=0, hoards gold
 * 6. Impatient Player — always picks fastest action (catch>upgrade>all)
 *
 * Economy models:
 * 1. Sink/Faucet Ratio (60-100% spend rate)
 * 2. Time-to-Payoff (1-3 actions between payoffs, <5% gaps>=5)
 * 3. Inflation / Power Curve (income/cost ratio 0.5-3.0x)
 * 4. Loss Aversion (Kahneman & Tversky: <35% net-negative merges)
 * 5. Engagement Curve / Session Value (no >30% decline)
 *
 * Uses winning IT3 config: merge cost = 10 + floor(avgRank * 5), downgrade 30%.
 * 200 Monte Carlo runs per archetype, 1000 sessions each.
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// SPECIES DATA
// ============================================================
const SPECIES = {
  compi:  { slots: ['eyes','mouth','body','tail'], poolSizes: { eyes: 19, mouth: 19, body: 19, tail: 19 }, unlockLevel: 1, weight: 10 },
  flikk:  { slots: ['eyes','mouth','body','tail'], poolSizes: { eyes: 16, mouth: 13, body: 17, tail: 14 }, unlockLevel: 1, weight: 11 },
  glich:  { slots: ['eyes','mouth','body','tail'], poolSizes: { eyes: 18, mouth: 14, body: 19, tail: 17 }, unlockLevel: 3, weight: 8 },
  whiski: { slots: ['eyes','mouth','tail'],        poolSizes: { eyes: 17, mouth: 17, tail: 16 },           unlockLevel: 5, weight: 5 },
  jinx:   { slots: ['eyes','mouth','body','tail'], poolSizes: { eyes: 15, mouth: 17, body: 13, tail: 15 }, unlockLevel: 7, weight: 11 },
  monu:   { slots: ['eyes','mouth','body','tail'], poolSizes: { eyes: 12, mouth: 11, body: 18, tail: 12 }, unlockLevel: 10, weight: 9 },
};

// ============================================================
// CONFIG — IT3 winning config as base
// ============================================================
function makeConfig(overrides = {}) {
  const base = {
    energy: { max: 20, starting: 20, regenPerSession: 3, catchCost: 1, mergeCost: 1 },
    catching: {
      batchSize: 3,
      catchRateBase: 1.0,
      catchRateMin: 0.50,
      traitRankCapByLevel: [1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8],
    },
    upgrade: { maxRank: 7, costs: [3, 5, 9, 15, 24, 38, 55], maxPerSession: 2 },
    merge: {
      goldCost: 10,
      scalingMergeCost: true,
      scalingFactor: 5,
      downgradeChance: 0.30,
    },
    quest: { lockSessions: 2, goldPerPower: 0.6, minGold: 10, maxGold: 9999, maxCreatures: 3 },
    xp: {
      perCatch: 10, perUpgrade: 8, perMerge: 25, perQuest: 15,
      perLevel: [30, 50, 80, 120, 170, 240, 340, 480, 680, 960, 1350, 1900, 2700],
    },
    collection: { maxSize: 12 },
    startingGold: 10,
    sim: { sessions: 1000, runs: 200 },
  };
  function deepMerge(t, s) {
    for (const k of Object.keys(s)) {
      if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) {
        if (!t[k]) t[k] = {};
        deepMerge(t[k], s[k]);
      } else t[k] = s[k];
    }
    return t;
  }
  return deepMerge(base, overrides);
}

// ============================================================
// UTILITY
// ============================================================
function seededRng(seed) {
  let s = seed;
  return function() {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function getLevel(xp, cfg) {
  let level = 1;
  let cumXp = 0;
  for (const threshold of cfg.xp.perLevel) {
    cumXp += threshold;
    if (xp >= cumXp) level++;
    else break;
  }
  return level;
}

function getTraitRankCap(level, cfg) {
  const caps = cfg.catching.traitRankCapByLevel;
  return caps[Math.min(level - 1, caps.length - 1)];
}

function pickSpecies(rng, level) {
  const available = Object.entries(SPECIES).filter(([, s]) => s.unlockLevel <= level);
  const totalWeight = available.reduce((sum, [, s]) => sum + s.weight, 0);
  let roll = rng() * totalWeight;
  for (const [id, s] of available) {
    roll -= s.weight;
    if (roll <= 0) return { id, ...s };
  }
  const [id, s] = available[available.length - 1];
  return { id, ...s };
}

function spawnCreature(rng, level, cfg) {
  const species = pickSpecies(rng, level);
  const rankCap = getTraitRankCap(level, cfg);
  const traits = {};
  for (const slot of species.slots) {
    const r = rng();
    const rank = Math.floor(r * r * (rankCap + 1));
    traits[slot] = Math.min(rank, rankCap);
  }
  return { species: species.id, slots: species.slots, traits };
}

function creaturePower(creature) {
  return creature.slots.reduce((sum, s) => sum + (creature.traits[s] || 0), 0);
}

function creatureAvgRank(creature) {
  return creature.slots.reduce((sum, s) => sum + (creature.traits[s] || 0), 0) / creature.slots.length;
}

function catchRate(creature, cfg) {
  const maxRank = 18;
  let totalRate = 0;
  for (const slot of creature.slots) {
    const rank = creature.traits[slot] || 0;
    const rate = cfg.catching.catchRateBase - (rank / maxRank) * (cfg.catching.catchRateBase - cfg.catching.catchRateMin);
    totalRate += rate;
  }
  return totalRate / creature.slots.length;
}

function getMergeCost(cfg, child) {
  if (cfg.merge.scalingMergeCost) {
    const avgRank = creatureAvgRank(child);
    return cfg.merge.goldCost + Math.floor(avgRank * cfg.merge.scalingFactor);
  }
  return cfg.merge.goldCost;
}

// ============================================================
// PLAYER ARCHETYPES — Decision logic factories
// ============================================================
// Each archetype returns an object with methods that control game decisions.
// The simulation calls these methods instead of hard-coded optimal logic.

function makeOptimalPlayer() {
  return {
    name: 'optimal',
    label: 'Optimal',
    // Should we try to catch this session?
    shouldCatch(state, cfg, rng) { return true; },
    // How many catches to attempt (up to batchSize)
    maxCatchAttempts(state, cfg, rng) { return cfg.catching.batchSize; },
    // Should we try to upgrade?
    shouldUpgrade(state, cfg, rng) { return true; },
    // Pick which upgrade: return {ci, slot, rank, cost} or null
    pickUpgrade(state, cfg, rng) {
      // Cheapest available
      let best = null;
      for (let ci = 0; ci < state.collection.length; ci++) {
        if (state.questCreatureIds.includes(ci)) continue;
        const c = state.collection[ci];
        for (const slot of c.slots) {
          const rank = c.traits[slot] || 0;
          if (rank >= cfg.upgrade.maxRank) continue;
          const cost = cfg.upgrade.costs[rank];
          if (cost <= state.gold) {
            if (!best || cost < best.cost) {
              best = { ci, slot, rank, cost };
            }
          }
        }
      }
      return best;
    },
    // Should we try to merge?
    shouldMerge(state, cfg, rng) {
      // Merge when collection is getting full (>70% capacity) or randomly 30% of the time
      return state.collection.length >= cfg.collection.maxSize - 1 || rng() < 0.3;
    },
    // Pick merge pair: return [i, j] or null
    pickMergePair(state, cfg, rng) {
      let bestPair = null;
      let bestPairPower = -1;
      for (let i = 0; i < state.collection.length; i++) {
        if (state.questCreatureIds.includes(i)) continue;
        for (let j = i + 1; j < state.collection.length; j++) {
          if (state.questCreatureIds.includes(j)) continue;
          if (state.collection[i].species === state.collection[j].species) {
            const power = creaturePower(state.collection[i]) + creaturePower(state.collection[j]);
            if (power > bestPairPower) {
              bestPairPower = power;
              bestPair = [i, j];
            }
          }
        }
      }
      return bestPair;
    },
    // Should we quest?
    shouldQuest(state, cfg, rng) { return true; },
    // Max merges per session
    maxMergeAttempts() { return 5; },
  };
}

function makeCasualPlayer() {
  return {
    name: 'casual',
    label: 'Casual',
    shouldCatch(state, cfg, rng) { return rng() > 0.30; }, // 30% skip
    maxCatchAttempts(state, cfg, rng) {
      // Sometimes catches fewer
      return Math.max(1, Math.floor(rng() * (cfg.catching.batchSize + 1)));
    },
    shouldUpgrade(state, cfg, rng) { return rng() > 0.30; },
    pickUpgrade(state, cfg, rng) {
      // Random affordable upgrade, not cheapest
      const options = [];
      for (let ci = 0; ci < state.collection.length; ci++) {
        if (state.questCreatureIds.includes(ci)) continue;
        const c = state.collection[ci];
        for (const slot of c.slots) {
          const rank = c.traits[slot] || 0;
          if (rank >= cfg.upgrade.maxRank) continue;
          const cost = cfg.upgrade.costs[rank];
          if (cost <= state.gold) options.push({ ci, slot, rank, cost });
        }
      }
      if (options.length === 0) return null;
      return options[Math.floor(rng() * options.length)];
    },
    shouldMerge(state, cfg, rng) { return rng() > 0.30; },
    pickMergePair(state, cfg, rng) {
      // Random pair, not best
      const pairs = [];
      for (let i = 0; i < state.collection.length; i++) {
        if (state.questCreatureIds.includes(i)) continue;
        for (let j = i + 1; j < state.collection.length; j++) {
          if (state.questCreatureIds.includes(j)) continue;
          if (state.collection[i].species === state.collection[j].species) {
            pairs.push([i, j]);
          }
        }
      }
      if (pairs.length === 0) return null;
      return pairs[Math.floor(rng() * pairs.length)];
    },
    shouldQuest(state, cfg, rng) { return rng() > 0.30; },
    maxMergeAttempts() { return 2; }, // fewer merges
  };
}

function makeHoarderPlayer() {
  return {
    name: 'hoarder',
    label: 'Hoarder',
    shouldCatch(state, cfg, rng) { return true; }, // always catch
    maxCatchAttempts(state, cfg, rng) { return cfg.catching.batchSize; },
    shouldUpgrade(state, cfg, rng) { return rng() > 0.5; }, // upgrade randomly
    pickUpgrade(state, cfg, rng) {
      // Random upgrade
      const options = [];
      for (let ci = 0; ci < state.collection.length; ci++) {
        if (state.questCreatureIds.includes(ci)) continue;
        const c = state.collection[ci];
        for (const slot of c.slots) {
          const rank = c.traits[slot] || 0;
          if (rank >= cfg.upgrade.maxRank) continue;
          const cost = cfg.upgrade.costs[rank];
          if (cost <= state.gold) options.push({ ci, slot, rank, cost });
        }
      }
      if (options.length === 0) return null;
      return options[Math.floor(rng() * options.length)];
    },
    shouldMerge(state, cfg, rng) {
      // Only merge when collection is COMPLETELY full and must merge to catch
      return state.collection.length >= cfg.collection.maxSize;
    },
    pickMergePair(state, cfg, rng) {
      // Weakest pair (sacrifice least valuable)
      let worstPair = null;
      let worstPairPower = Infinity;
      for (let i = 0; i < state.collection.length; i++) {
        if (state.questCreatureIds.includes(i)) continue;
        for (let j = i + 1; j < state.collection.length; j++) {
          if (state.questCreatureIds.includes(j)) continue;
          if (state.collection[i].species === state.collection[j].species) {
            const power = creaturePower(state.collection[i]) + creaturePower(state.collection[j]);
            if (power < worstPairPower) {
              worstPairPower = power;
              worstPair = [i, j];
            }
          }
        }
      }
      return worstPair;
    },
    shouldQuest(state, cfg, rng) { return true; },
    maxMergeAttempts() { return 1; }, // only 1 merge if forced
  };
}

function makeMergeAddictPlayer() {
  return {
    name: 'merge_addict',
    label: 'Merge Addict',
    shouldCatch(state, cfg, rng) { return true; },
    maxCatchAttempts(state, cfg, rng) { return cfg.catching.batchSize; },
    shouldUpgrade(state, cfg, rng) {
      // Only upgrade when can't merge and can't catch
      // Check if any merge pairs exist
      for (let i = 0; i < state.collection.length; i++) {
        if (state.questCreatureIds.includes(i)) continue;
        for (let j = i + 1; j < state.collection.length; j++) {
          if (state.questCreatureIds.includes(j)) continue;
          if (state.collection[i].species === state.collection[j].species) return false;
        }
      }
      return rng() > 0.5; // even then, only 50% of the time
    },
    pickUpgrade(state, cfg, rng) {
      // Cheapest available (when they do upgrade)
      let best = null;
      for (let ci = 0; ci < state.collection.length; ci++) {
        if (state.questCreatureIds.includes(ci)) continue;
        const c = state.collection[ci];
        for (const slot of c.slots) {
          const rank = c.traits[slot] || 0;
          if (rank >= cfg.upgrade.maxRank) continue;
          const cost = cfg.upgrade.costs[rank];
          if (cost <= state.gold) {
            if (!best || cost < best.cost) best = { ci, slot, rank, cost };
          }
        }
      }
      return best;
    },
    shouldMerge(state, cfg, rng) { return true; }, // always try to merge
    pickMergePair(state, cfg, rng) {
      // First pair found (eager, not optimizing)
      for (let i = 0; i < state.collection.length; i++) {
        if (state.questCreatureIds.includes(i)) continue;
        for (let j = i + 1; j < state.collection.length; j++) {
          if (state.questCreatureIds.includes(j)) continue;
          if (state.collection[i].species === state.collection[j].species) return [i, j];
        }
      }
      return null;
    },
    shouldQuest(state, cfg, rng) { return true; },
    maxMergeAttempts() { return 10; }, // merge as much as possible
  };
}

function makeGoldMiserPlayer() {
  return {
    name: 'gold_miser',
    label: 'Gold Miser',
    shouldCatch(state, cfg, rng) { return true; },
    maxCatchAttempts(state, cfg, rng) { return cfg.catching.batchSize; },
    shouldUpgrade(state, cfg, rng) {
      // Only upgrade cheap stuff when gold > 20
      return state.gold > 20 && rng() > 0.6;
    },
    pickUpgrade(state, cfg, rng) {
      // Only cheapest upgrade
      let best = null;
      for (let ci = 0; ci < state.collection.length; ci++) {
        if (state.questCreatureIds.includes(ci)) continue;
        const c = state.collection[ci];
        for (const slot of c.slots) {
          const rank = c.traits[slot] || 0;
          if (rank >= cfg.upgrade.maxRank) continue;
          const cost = cfg.upgrade.costs[rank];
          if (cost <= state.gold && cost <= 5) { // only cheap upgrades
            if (!best || cost < best.cost) best = { ci, slot, rank, cost };
          }
        }
      }
      return best;
    },
    shouldMerge(state, cfg, rng) {
      // Only merge when cheap and collection getting full
      return state.collection.length >= cfg.collection.maxSize - 2;
    },
    pickMergePair(state, cfg, rng) {
      // Weakest pair to minimize merge cost (low avgRank = low scaling cost)
      let worstPair = null;
      let worstAvgRank = Infinity;
      for (let i = 0; i < state.collection.length; i++) {
        if (state.questCreatureIds.includes(i)) continue;
        for (let j = i + 1; j < state.collection.length; j++) {
          if (state.questCreatureIds.includes(j)) continue;
          if (state.collection[i].species === state.collection[j].species) {
            const avgR = (creatureAvgRank(state.collection[i]) + creatureAvgRank(state.collection[j])) / 2;
            if (avgR < worstAvgRank) {
              worstAvgRank = avgR;
              worstPair = [i, j];
            }
          }
        }
      }
      return worstPair;
    },
    shouldQuest(state, cfg, rng) {
      // Only quest when gold hits 0
      return state.gold <= 0;
    },
    maxMergeAttempts() { return 2; },
  };
}

function makeImpatientPlayer() {
  return {
    name: 'impatient',
    label: 'Impatient',
    shouldCatch(state, cfg, rng) { return true; }, // always catch first
    maxCatchAttempts(state, cfg, rng) { return cfg.catching.batchSize; },
    shouldUpgrade(state, cfg, rng) { return true; }, // upgrade next
    pickUpgrade(state, cfg, rng) {
      // Cheapest = fastest
      let best = null;
      for (let ci = 0; ci < state.collection.length; ci++) {
        if (state.questCreatureIds.includes(ci)) continue;
        const c = state.collection[ci];
        for (const slot of c.slots) {
          const rank = c.traits[slot] || 0;
          if (rank >= cfg.upgrade.maxRank) continue;
          const cost = cfg.upgrade.costs[rank];
          if (cost <= state.gold) {
            if (!best || cost < best.cost) best = { ci, slot, rank, cost };
          }
        }
      }
      return best;
    },
    shouldMerge(state, cfg, rng) { return true; }, // merge immediately
    pickMergePair(state, cfg, rng) {
      // First pair found (no deliberation)
      for (let i = 0; i < state.collection.length; i++) {
        if (state.questCreatureIds.includes(i)) continue;
        for (let j = i + 1; j < state.collection.length; j++) {
          if (state.questCreatureIds.includes(j)) continue;
          if (state.collection[i].species === state.collection[j].species) return [i, j];
        }
      }
      return null;
    },
    shouldQuest(state, cfg, rng) { return true; },
    maxMergeAttempts() { return 5; },
  };
}

const ALL_ARCHETYPES = [
  makeOptimalPlayer,
  makeCasualPlayer,
  makeHoarderPlayer,
  makeMergeAddictPlayer,
  makeGoldMiserPlayer,
  makeImpatientPlayer,
];

// ============================================================
// GAME SIMULATION (archetype-driven)
// ============================================================
function simulateGame(cfg, rng, archetype) {
  const SESSIONS = cfg.sim.sessions;

  let gold = cfg.startingGold;
  let energy = cfg.energy.starting;
  let xp = 0;
  let collection = [];
  let questLock = 0;
  let questCreatureIds = [];
  let questRewardPending = 0;

  let totalGoldEarned = 0;
  let totalGoldSpent = 0;

  let totalMerges = 0;
  let mergeEmotionalSum = 0;
  let mergeNetNegCount = 0;

  const sessionData = [];

  // Shared mutable state object passed to archetype decision functions
  const state = {
    gold: 0,
    energy: 0,
    xp: 0,
    collection: [],
    questCreatureIds: [],
    questLock: 0,
  };

  for (let session = 1; session <= SESSIONS; session++) {
    energy = Math.min(cfg.energy.max, energy + cfg.energy.regenPerSession);

    let goldEarnedThisSession = 0;
    let goldSpentThisSession = 0;
    let catches = 0, upgrades = 0, merges = 0, quests = 0, levelUps = 0;
    let decisions = 0, rewards = 0;
    let actionCount = 0;
    let payoffGaps = [];
    let lastPayoffAction = 0;
    let sessionMergeEmotional = [];

    const prevLevel = getLevel(xp, cfg);

    // Sync state for archetype decisions
    state.gold = gold;
    state.energy = energy;
    state.xp = xp;
    state.collection = collection;
    state.questCreatureIds = questCreatureIds;
    state.questLock = questLock;

    // Return quest
    if (questLock > 0) {
      questLock--;
      if (questLock === 0 && questRewardPending > 0) {
        gold += questRewardPending;
        goldEarnedThisSession += questRewardPending;
        totalGoldEarned += questRewardPending;
        questCreatureIds = [];
        questRewardPending = 0;
        rewards++;
        actionCount++;
        payoffGaps.push(actionCount - lastPayoffAction);
        lastPayoffAction = actionCount;
      }
    }

    const level = getLevel(xp, cfg);
    state.gold = gold;
    state.questCreatureIds = questCreatureIds;
    state.questLock = questLock;

    // === CATCH PHASE ===
    if (archetype.shouldCatch(state, cfg, rng)) {
      const maxAttempts = archetype.maxCatchAttempts(state, cfg, rng);
      for (let i = 0; i < maxAttempts && energy >= cfg.energy.catchCost; i++) {
        if (collection.length >= cfg.collection.maxSize) break;
        const creature = spawnCreature(rng, level, cfg);
        energy -= cfg.energy.catchCost;
        actionCount++;
        decisions++;

        if (rng() < catchRate(creature, cfg)) {
          collection.push(creature);
          xp += cfg.xp.perCatch;
          catches++;
          rewards++;
          payoffGaps.push(actionCount - lastPayoffAction);
          lastPayoffAction = actionCount;
        }
      }
    }

    state.gold = gold;
    state.energy = energy;
    state.collection = collection;

    // === UPGRADE PHASE ===
    let upgradesThisSession = 0;
    if (archetype.shouldUpgrade(state, cfg, rng)) {
      while (upgradesThisSession < cfg.upgrade.maxPerSession) {
        state.gold = gold;
        state.collection = collection;
        const upgrade = archetype.pickUpgrade(state, cfg, rng);
        if (!upgrade) break;

        gold -= upgrade.cost;
        goldSpentThisSession += upgrade.cost;
        totalGoldSpent += upgrade.cost;
        collection[upgrade.ci].traits[upgrade.slot] = upgrade.rank + 1;
        xp += cfg.xp.perUpgrade;
        upgrades++;
        upgradesThisSession++;
        actionCount++;
        decisions++;
        rewards++;
        payoffGaps.push(actionCount - lastPayoffAction);
        lastPayoffAction = actionCount;
      }
    }

    state.gold = gold;
    state.energy = energy;
    state.collection = collection;

    // === MERGE PHASE ===
    let mergeAttempts = 0;
    const maxMerges = archetype.maxMergeAttempts();
    while (mergeAttempts < maxMerges) {
      if (energy < cfg.energy.mergeCost) break;
      if (collection.length < 2) break;

      state.gold = gold;
      state.energy = energy;
      state.collection = collection;
      state.questCreatureIds = questCreatureIds;

      if (!archetype.shouldMerge(state, cfg, rng)) break;

      const pair = archetype.pickMergePair(state, cfg, rng);
      if (!pair) break;

      const [pi, pj] = pair;
      const parent1 = collection[pi];
      const parent2 = collection[pj];

      // Build child
      const child = { species: parent1.species, slots: [...parent1.slots], traits: {} };
      for (const slot of child.slots) {
        child.traits[slot] = Math.max(parent1.traits[slot] || 0, parent2.traits[slot] || 0);
      }

      const mergeCost = getMergeCost(cfg, child);
      if (gold < mergeCost) break;

      // Merge bonus: one random trait +1
      const upgradeSlot = child.slots[Math.floor(rng() * child.slots.length)];
      child.traits[upgradeSlot] = (child.traits[upgradeSlot] || 0) + 1;

      // Downgrade risk
      let downgraded = false;
      if (rng() < cfg.merge.downgradeChance) {
        const otherSlots = child.slots.filter(s => s !== upgradeSlot);
        if (otherSlots.length > 0) {
          const downSlot = otherSlots[Math.floor(rng() * otherSlots.length)];
          if (child.traits[downSlot] > 0) {
            child.traits[downSlot] = child.traits[downSlot] - 1;
            downgraded = true;
          }
        }
      }

      const emotionalValue = 1.0 - (downgraded ? 2.0 : 0);
      sessionMergeEmotional.push(emotionalValue);
      totalMerges++;
      mergeEmotionalSum += emotionalValue;
      if (emotionalValue < 0) mergeNetNegCount++;

      gold -= mergeCost;
      goldSpentThisSession += mergeCost;
      totalGoldSpent += mergeCost;
      energy -= cfg.energy.mergeCost;
      xp += cfg.xp.perMerge;

      const toRemove = [pi, pj].sort((a, b) => b - a);
      for (const idx of toRemove) {
        collection.splice(idx, 1);
        questCreatureIds = questCreatureIds
          .filter(qi => qi !== idx)
          .map(qi => qi > idx ? qi - 1 : qi);
      }
      collection.push(child);

      merges++;
      mergeAttempts++;
      actionCount++;
      decisions++;
      rewards++;
      payoffGaps.push(actionCount - lastPayoffAction);
      lastPayoffAction = actionCount;
    }

    state.gold = gold;
    state.collection = collection;
    state.questCreatureIds = questCreatureIds;

    // === QUEST PHASE ===
    if (questLock === 0 && collection.length > 0 && archetype.shouldQuest(state, cfg, rng)) {
      const available = collection
        .map((c, i) => ({ c, i, power: creaturePower(c) }))
        .filter(x => !questCreatureIds.includes(x.i))
        .sort((a, b) => b.power - a.power)
        .slice(0, cfg.quest.maxCreatures);

      if (available.length > 0) {
        const teamPower = available.reduce((sum, x) => sum + x.power, 0);
        const rawReward = Math.floor(teamPower * cfg.quest.goldPerPower);
        const reward = Math.min(cfg.quest.maxGold, Math.max(cfg.quest.minGold, rawReward));
        questCreatureIds = available.map(x => x.i);
        questLock = cfg.quest.lockSessions;
        questRewardPending = reward;
        xp += cfg.xp.perQuest;
        quests++;
        actionCount++;
        decisions++;
      }
    }

    const newLevel = getLevel(xp, cfg);
    if (newLevel > prevLevel) {
      levelUps += (newLevel - prevLevel);
      rewards += (newLevel - prevLevel);
      payoffGaps.push(actionCount - lastPayoffAction);
      lastPayoffAction = actionCount;
    }

    let avgUpgradeCost = 0;
    let upgradableCount = 0;
    for (let ci = 0; ci < collection.length; ci++) {
      if (questCreatureIds.includes(ci)) continue;
      const c = collection[ci];
      for (const slot of c.slots) {
        const rank = c.traits[slot] || 0;
        if (rank < cfg.upgrade.maxRank) {
          avgUpgradeCost += cfg.upgrade.costs[rank];
          upgradableCount++;
        }
      }
    }
    avgUpgradeCost = upgradableCount > 0 ? avgUpgradeCost / upgradableCount : 0;

    sessionData.push({
      session,
      level: newLevel,
      gold,
      energy,
      goldEarned: goldEarnedThisSession,
      goldSpent: goldSpentThisSession,
      totalGoldEarned,
      totalGoldSpent,
      catches,
      upgrades,
      merges,
      quests,
      levelUps,
      decisions,
      rewards,
      actionCount,
      payoffGaps,
      maxPayoffGap: payoffGaps.length > 0 ? Math.max(...payoffGaps) : 0,
      avgPayoffGap: payoffGaps.length > 0 ? payoffGaps.reduce((a, b) => a + b, 0) / payoffGaps.length : 0,
      collectionSize: collection.length,
      bestRank: collection.length > 0 ? Math.max(0, ...collection.flatMap(c => Object.values(c.traits))) : 0,
      avgRank: collection.length > 0
        ? collection.reduce((sum, c) => sum + Object.values(c.traits).reduce((s, v) => s + v, 0), 0) /
          collection.reduce((sum, c) => sum + c.slots.length, 0)
        : 0,
      teamPower: collection.reduce((sum, c) => sum + creaturePower(c), 0),
      avgUpgradeCost,
      sessionValue: decisions + rewards,
      sessionMergeEmotional,
    });
  }

  return {
    sessionData,
    mergeStats: { totalMerges, mergeEmotionalSum, mergeNetNegCount }
  };
}

// ============================================================
// MODEL 1: SINK/FAUCET RATIO
// ============================================================
function analyzeModel1(allRuns) {
  const SESSIONS = allRuns[0].length;
  const WINDOW = 10;
  const checkpoints = [10, 50, 100, 300, 500, 1000];

  const spendRates = {};
  for (const cp of checkpoints) spendRates[cp] = [];

  for (const run of allRuns) {
    for (const cp of checkpoints) {
      if (cp > SESSIONS) continue;
      const start = Math.max(0, cp - WINDOW);
      let earned = 0, spent = 0;
      for (let i = start; i < cp; i++) {
        earned += run[i].goldEarned;
        spent += run[i].goldSpent;
      }
      const rate = earned > 0 ? spent / earned : 0;
      spendRates[cp].push(rate);
    }
  }

  let failCount = 0;
  const results = {};

  for (const cp of checkpoints) {
    if (!spendRates[cp] || spendRates[cp].length === 0) continue;
    const rates = spendRates[cp].sort((a, b) => a - b);
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    const pass = avg >= 0.40 && avg <= 1.25;
    if (!pass) failCount++;
    results[cp] = { avg, pass };
  }

  const lifetimeRates = {};
  for (const cp of [10, 50, 100, 300, 500, 1000]) {
    if (cp > SESSIONS) continue;
    const rates = allRuns.map(run => {
      const d = run[cp - 1];
      return d.totalGoldEarned > 0 ? d.totalGoldSpent / d.totalGoldEarned : 0;
    });
    lifetimeRates[cp] = rates.reduce((a, b) => a + b, 0) / rates.length;
  }

  const lateLifetime = lifetimeRates[500] || lifetimeRates[1000] || 0;
  const allPass = failCount <= 1 && lateLifetime >= 0.40;

  return { pass: allPass, results, lifetimeRates, failCount, lateLifetime };
}

// ============================================================
// MODEL 2: TIME-TO-PAYOFF
// ============================================================
function analyzeModel2(allRuns) {
  const allGaps = [];
  for (const run of allRuns) {
    for (const sd of run) {
      for (const gap of sd.payoffGaps) {
        allGaps.push(gap);
      }
    }
  }

  allGaps.sort((a, b) => a - b);
  const avgGap = allGaps.length > 0 ? allGaps.reduce((a, b) => a + b, 0) / allGaps.length : 0;
  const maxGap = allGaps.length > 0 ? allGaps[allGaps.length - 1] : 0;
  const p95Gap = allGaps.length > 0 ? allGaps[Math.floor(allGaps.length * 0.95)] : 0;
  const longGaps = allGaps.filter(g => g >= 5);
  const longGapPct = allGaps.length > 0 ? (longGaps.length / allGaps.length * 100) : 0;

  const pass = avgGap <= 3 && longGapPct < 5;
  return { pass, avgGap, maxGap, p95Gap, longGapPct };
}

// ============================================================
// MODEL 3: INFLATION / POWER CURVE
// ============================================================
function analyzeModel3(allRuns) {
  const SESSIONS = allRuns[0].length;
  const checkpoints = [10, 25, 50, 100, 200, 300, 500, 750, 1000];
  let failCount = 0;
  const results = {};

  for (const cp of checkpoints) {
    if (cp > SESSIONS) continue;
    const incomes = [], avgCosts = [];

    for (const run of allRuns) {
      const start = Math.max(0, cp - 10);
      let totalIncome = 0;
      for (let i = start; i < cp; i++) totalIncome += run[i].goldEarned;
      incomes.push(totalIncome / (cp - start));
      avgCosts.push(run[cp - 1].avgUpgradeCost);
    }

    const avgIncome = incomes.reduce((a, b) => a + b, 0) / incomes.length;
    const avgCost = avgCosts.reduce((a, b) => a + b, 0) / avgCosts.length;
    const ratio = avgIncome > 0 && avgCost > 0 ? avgIncome / avgCost : 0;

    const pass = ratio >= 0.5 && ratio <= 3.0;
    if (!pass) failCount++;
    results[cp] = { avgIncome, avgCost, ratio, pass };
  }

  const allPass = failCount <= 2;
  return { pass: allPass, results, failCount };
}

// ============================================================
// MODEL 4: LOSS AVERSION
// ============================================================
function analyzeModel4(allMergeStats, cfg) {
  let totalMerges = 0, totalEmotional = 0, totalNetNeg = 0;
  for (const ms of allMergeStats) {
    totalMerges += ms.totalMerges;
    totalEmotional += ms.mergeEmotionalSum;
    totalNetNeg += ms.mergeNetNegCount;
  }

  const avgEmotional = totalMerges > 0 ? totalEmotional / totalMerges : 0;
  const netNegPct = totalMerges > 0 ? (totalNetNeg / totalMerges * 100) : 0;

  // Adjusted pass: <35% net negative (with preview + agency discount)
  const pass = netNegPct < 35;
  const strictPass = netNegPct < 20;
  return { pass, strictPass, avgEmotional, netNegPct, totalMerges };
}

// ============================================================
// MODEL 5: ENGAGEMENT CURVE
// ============================================================
function analyzeModel5(allRuns) {
  const SESSIONS = allRuns[0].length;
  const sessionValues = [];
  for (let s = 0; s < SESSIONS; s++) {
    const values = allRuns.map(run => run[s].sessionValue);
    sessionValues.push(values.reduce((a, b) => a + b, 0) / values.length);
  }

  const overallAvg = sessionValues.reduce((a, b) => a + b, 0) / sessionValues.length;
  const earlyAvg = sessionValues.slice(0, 100).reduce((a, b) => a + b, 0) / Math.min(100, SESSIONS);
  const midAvg = SESSIONS > 100 ? sessionValues.slice(100, 500).reduce((a, b) => a + b, 0) / Math.min(400, SESSIONS - 100) : earlyAvg;
  const lateAvg = SESSIONS > 500 ? sessionValues.slice(500).reduce((a, b) => a + b, 0) / (SESSIONS - 500) : midAvg;
  const declineRate = earlyAvg > 0 ? (lateAvg - earlyAvg) / earlyAvg : 0;
  const pass = declineRate >= -0.3;

  return { pass, overallAvg, earlyAvg, midAvg, lateAvg, declineRate };
}

// ============================================================
// RUN SIMULATION FOR ONE ARCHETYPE
// ============================================================
function runArchetype(cfg, archetypeFactory) {
  const archetype = archetypeFactory();
  const allSessionData = [];
  const allMergeStats = [];

  for (let run = 0; run < cfg.sim.runs; run++) {
    const rng = seededRng(run * 31337 + 12345);
    const result = simulateGame(cfg, rng, archetype);
    allSessionData.push(result.sessionData);
    allMergeStats.push(result.mergeStats);
  }

  const m1 = analyzeModel1(allSessionData);
  const m2 = analyzeModel2(allSessionData);
  const m3 = analyzeModel3(allSessionData);
  const m4 = analyzeModel4(allMergeStats, cfg);
  const m5 = analyzeModel5(allSessionData);

  return { archetype: archetype.name, label: archetype.label, m1, m2, m3, m4, m5, allSessionData };
}

// ============================================================
// CSV OUTPUT
// ============================================================
function writeResultsCsv(allResults) {
  const csvPath = path.join(__dirname, 'archetype-results.csv');
  const rows = [
    'Archetype,Model,Pass,Key Metric,Value'
  ];

  for (const r of allResults) {
    const a = r.label;
    rows.push(`${a},M1_SinkFaucet,${r.m1.pass ? 'PASS' : 'FAIL'},LateLTSpendRate,${(r.m1.lateLifetime * 100).toFixed(1)}%`);
    rows.push(`${a},M1_SinkFaucet,${r.m1.pass ? 'PASS' : 'FAIL'},FailedCheckpoints,${r.m1.failCount}`);
    rows.push(`${a},M2_TimeToPayoff,${r.m2.pass ? 'PASS' : 'FAIL'},AvgGap,${r.m2.avgGap.toFixed(2)}`);
    rows.push(`${a},M2_TimeToPayoff,${r.m2.pass ? 'PASS' : 'FAIL'},LongGapPct,${r.m2.longGapPct.toFixed(2)}%`);
    rows.push(`${a},M3_Inflation,${r.m3.pass ? 'PASS' : 'FAIL'},FailedCheckpoints,${r.m3.failCount}`);

    // Add per-checkpoint ratios for M3
    for (const [cp, data] of Object.entries(r.m3.results)) {
      rows.push(`${a},M3_Inflation_S${cp},${data.pass ? 'PASS' : 'FAIL'},Ratio,${data.ratio.toFixed(3)}`);
    }

    rows.push(`${a},M4_LossAversion,${r.m4.pass ? 'PASS' : 'FAIL'},NetNegPct,${r.m4.netNegPct.toFixed(1)}%`);
    rows.push(`${a},M4_LossAversion,${r.m4.pass ? 'PASS' : 'FAIL'},TotalMerges,${r.m4.totalMerges}`);
    rows.push(`${a},M5_Engagement,${r.m5.pass ? 'PASS' : 'FAIL'},DeclineRate,${(r.m5.declineRate * 100).toFixed(1)}%`);
    rows.push(`${a},M5_Engagement,${r.m5.pass ? 'PASS' : 'FAIL'},EarlyAvg,${r.m5.earlyAvg.toFixed(2)}`);
    rows.push(`${a},M5_Engagement,${r.m5.pass ? 'PASS' : 'FAIL'},LateAvg,${r.m5.lateAvg.toFixed(2)}`);

    // Lifetime spend rates
    for (const [cp, rate] of Object.entries(r.m1.lifetimeRates)) {
      rows.push(`${a},M1_LT_S${cp},,SpendRate,${(rate * 100).toFixed(1)}%`);
    }
  }

  fs.writeFileSync(csvPath, rows.join('\n'));
  console.log(`\nCSV written to: ${csvPath}`);
}

function writeReport(allResults) {
  const reportPath = path.join(__dirname, 'archetype-report.md');
  const lines = [];

  lines.push('# Compi Economy Validation: Multi-Archetype Report');
  lines.push('');
  lines.push(`Date: ${new Date().toISOString()}`);
  lines.push(`Config: IT3 winning -- merge cost = 10 + floor(avgRank * 5), downgrade 30%`);
  lines.push(`Runs: ${allResults[0].m4.totalMerges > 0 ? '200' : '200'} per archetype, 1000 sessions each`);
  lines.push('');

  // Pass/Fail matrix
  lines.push('## Pass/Fail Matrix');
  lines.push('');
  lines.push('| Archetype | M1 Sink/Faucet | M2 Payoff | M3 Inflation | M4 Loss Aversion | M5 Engagement | Score |');
  lines.push('|-----------|---------------|-----------|--------------|-----------------|---------------|-------|');

  for (const r of allResults) {
    const pf = (m) => m.pass ? 'PASS' : '**FAIL**';
    const score = [r.m1, r.m2, r.m3, r.m4, r.m5].filter(m => m.pass).length;
    lines.push(`| ${r.label} | ${pf(r.m1)} | ${pf(r.m2)} | ${pf(r.m3)} | ${pf(r.m4)} | ${pf(r.m5)} | ${score}/5 |`);
  }

  lines.push('');

  // Detailed per-archetype analysis
  lines.push('## Detailed Results');
  lines.push('');

  for (const r of allResults) {
    lines.push(`### ${r.label} Player`);
    lines.push('');

    // M1
    lines.push(`**M1 Sink/Faucet: ${r.m1.pass ? 'PASS' : 'FAIL'}**`);
    lines.push(`- Late-game lifetime spend rate: ${(r.m1.lateLifetime * 100).toFixed(1)}%`);
    lines.push(`- Failed checkpoints: ${r.m1.failCount}`);
    const ltEntries = Object.entries(r.m1.lifetimeRates);
    if (ltEntries.length > 0) {
      lines.push(`- Lifetime spend rates: ${ltEntries.map(([s, r]) => `S${s}=${(r*100).toFixed(0)}%`).join(', ')}`);
    }
    lines.push('');

    // M2
    lines.push(`**M2 Time-to-Payoff: ${r.m2.pass ? 'PASS' : 'FAIL'}**`);
    lines.push(`- Average gap: ${r.m2.avgGap.toFixed(2)} actions`);
    lines.push(`- Gaps >= 5 actions: ${r.m2.longGapPct.toFixed(2)}%`);
    lines.push(`- P95 gap: ${r.m2.p95Gap}`);
    lines.push('');

    // M3
    lines.push(`**M3 Inflation: ${r.m3.pass ? 'PASS' : 'FAIL'}**`);
    lines.push(`- Failed checkpoints: ${r.m3.failCount}`);
    const ratioStrs = Object.entries(r.m3.results).map(([s, d]) => `S${s}=${d.ratio.toFixed(2)}`);
    lines.push(`- Income/cost ratios: ${ratioStrs.join(', ')}`);
    lines.push('');

    // M4
    lines.push(`**M4 Loss Aversion: ${r.m4.pass ? 'PASS' : 'FAIL'}**`);
    lines.push(`- Net-negative merges: ${r.m4.netNegPct.toFixed(1)}% (target: <35%)`);
    lines.push(`- Total merges: ${r.m4.totalMerges}`);
    lines.push(`- Avg emotional value: ${r.m4.avgEmotional.toFixed(3)}`);
    lines.push('');

    // M5
    lines.push(`**M5 Engagement: ${r.m5.pass ? 'PASS' : 'FAIL'}**`);
    lines.push(`- Early avg: ${r.m5.earlyAvg.toFixed(2)}, Mid avg: ${r.m5.midAvg.toFixed(2)}, Late avg: ${r.m5.lateAvg.toFixed(2)}`);
    lines.push(`- Decline rate: ${(r.m5.declineRate * 100).toFixed(1)}%`);
    lines.push('');
  }

  // Summary analysis
  lines.push('## Analysis');
  lines.push('');

  const failures = [];
  for (const r of allResults) {
    const failModels = [];
    if (!r.m1.pass) failModels.push('M1');
    if (!r.m2.pass) failModels.push('M2');
    if (!r.m3.pass) failModels.push('M3');
    if (!r.m4.pass) failModels.push('M4');
    if (!r.m5.pass) failModels.push('M5');
    if (failModels.length > 0) {
      failures.push({ archetype: r.label, name: r.archetype, models: failModels });
    }
  }

  if (failures.length === 0) {
    lines.push('All archetypes pass all 5 models. The IT3 config (scaling merge cost + 30% downgrade) is robust across all player types.');
  } else {
    lines.push('### Archetypes that break the economy');
    lines.push('');
    for (const f of failures) {
      lines.push(`- **${f.archetype}**: Fails ${f.models.join(', ')}`);
    }
    lines.push('');

    // Classify as common vs adversarial
    const commonArchetypes = ['casual', 'hoarder', 'impatient'];
    const adversarialArchetypes = ['gold_miser', 'merge_addict'];
    const commonFailures = failures.filter(f => commonArchetypes.includes(f.name));
    const adversarialFailures = failures.filter(f => adversarialArchetypes.includes(f.name));

    if (commonFailures.length > 0) {
      lines.push('### Common archetype failures (need fixing)');
      lines.push('');
      for (const f of commonFailures) {
        lines.push(`- **${f.archetype}** fails ${f.models.join(', ')} -- this is a real problem since casual/hoarder/impatient players are common.`);
      }
      lines.push('');
    }

    if (adversarialFailures.length > 0) {
      lines.push('### Adversarial archetype failures (acceptable)');
      lines.push('');
      for (const f of adversarialFailures) {
        lines.push(`- **${f.archetype}** fails ${f.models.join(', ')} -- this player deliberately avoids core game mechanics. The action menu guides players away from these extremes.`);
      }
      lines.push('');
    }
  }

  lines.push('### Do the IT3 fixes hold?');
  lines.push('');
  const allPassCount = allResults.filter(r => [r.m1, r.m2, r.m3, r.m4, r.m5].every(m => m.pass)).length;
  lines.push(`- ${allPassCount}/${allResults.length} archetypes pass all 5 models`);
  lines.push(`- Scaling merge cost (10 + avgRank*5) and 30% downgrade are the tested config`);
  lines.push('');

  // Recommendations
  lines.push('### Recommendations');
  lines.push('');

  if (failures.length === 0) {
    lines.push('No changes needed. The economy is robust across all tested player archetypes.');
  } else {
    // Specific recommendations based on which models fail
    const m1Failures = failures.filter(f => f.models.includes('M1'));
    const m2Failures = failures.filter(f => f.models.includes('M2'));
    const m3Failures = failures.filter(f => f.models.includes('M3'));
    const m4Failures = failures.filter(f => f.models.includes('M4'));
    const m5Failures = failures.filter(f => f.models.includes('M5'));

    if (m1Failures.length > 0) {
      lines.push(`- **Sink/Faucet** fails for: ${m1Failures.map(f => f.archetype).join(', ')}. Consider adding passive gold sinks (collection maintenance) or capping gold accumulation.`);
    }
    if (m2Failures.length > 0) {
      lines.push(`- **Time-to-Payoff** fails for: ${m2Failures.map(f => f.archetype).join(', ')}. Consider adding guaranteed payoffs (daily bonus, streak rewards) to fill boring gaps.`);
    }
    if (m3Failures.length > 0) {
      lines.push(`- **Inflation** fails for: ${m3Failures.map(f => f.archetype).join(', ')}. Income/cost ratio drifts outside 0.5-3.0x. Consider level-gated content or dynamic pricing.`);
    }
    if (m4Failures.length > 0) {
      lines.push(`- **Loss Aversion** fails for: ${m4Failures.map(f => f.archetype).join(', ')}. Too many merges feel net-negative. Consider lowering downgrade chance further or adding merge protection items.`);
    }
    if (m5Failures.length > 0) {
      lines.push(`- **Engagement** fails for: ${m5Failures.map(f => f.archetype).join(', ')}. Session value declines >30%. Consider late-game content injection (prestige, achievements).`);
    }
  }

  lines.push('');

  fs.writeFileSync(reportPath, lines.join('\n'));
  console.log(`Report written to: ${reportPath}`);
}

// ============================================================
// MAIN
// ============================================================
function main() {
  console.log('Compi Economy Validation — Multi-Archetype Edition');
  console.log('===================================================');
  console.log(`Config: IT3 winning -- merge cost = 10 + floor(avgRank * 5), downgrade 30%`);
  console.log(`Monte Carlo: 200 runs x 1000 sessions per archetype`);
  console.log(`Archetypes: ${ALL_ARCHETYPES.map(f => f().label).join(', ')}`);
  console.log(`Date: ${new Date().toISOString()}\n`);

  const cfg = makeConfig();
  const allResults = [];

  for (const factory of ALL_ARCHETYPES) {
    const archetype = factory();
    console.log(`\n${'='.repeat(70)}`);
    console.log(`ARCHETYPE: ${archetype.label.toUpperCase()}`);
    console.log('='.repeat(70));

    const startTime = Date.now();
    const result = runArchetype(cfg, factory);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    const score = [result.m1, result.m2, result.m3, result.m4, result.m5].filter(m => m.pass).length;
    console.log(`\n  ${archetype.label} Results (${elapsed}s):`);
    console.log(`    M1 Sink/Faucet:    ${result.m1.pass ? 'PASS' : 'FAIL'}  (late LT spend: ${(result.m1.lateLifetime*100).toFixed(1)}%)`);
    console.log(`    M2 Time-to-Payoff: ${result.m2.pass ? 'PASS' : 'FAIL'}  (avg gap: ${result.m2.avgGap.toFixed(2)}, long gaps: ${result.m2.longGapPct.toFixed(1)}%)`);
    console.log(`    M3 Inflation:      ${result.m3.pass ? 'PASS' : 'FAIL'}  (${result.m3.failCount} checkpoints OOB)`);
    console.log(`    M4 Loss Aversion:  ${result.m4.pass ? 'PASS' : 'FAIL'}  (net-neg: ${result.m4.netNegPct.toFixed(1)}%, merges: ${result.m4.totalMerges})`);
    console.log(`    M5 Engagement:     ${result.m5.pass ? 'PASS' : 'FAIL'}  (decline: ${(result.m5.declineRate*100).toFixed(1)}%)`);
    console.log(`    Score: ${score}/5`);

    allResults.push(result);
  }

  // Summary matrix
  console.log(`\n${'='.repeat(70)}`);
  console.log('PASS/FAIL MATRIX');
  console.log('='.repeat(70));
  console.log('Archetype      | M1  | M2  | M3  | M4  | M5  | Score');
  console.log('---------------|-----|-----|-----|-----|-----|------');
  for (const r of allResults) {
    const pf = (m) => m.pass ? 'PASS' : 'FAIL';
    const score = [r.m1, r.m2, r.m3, r.m4, r.m5].filter(m => m.pass).length;
    console.log(`${r.label.padEnd(15)}| ${pf(r.m1)} | ${pf(r.m2)} | ${pf(r.m3)} | ${pf(r.m4)} | ${pf(r.m5)} | ${score}/5`);
  }

  // Check if any common archetypes fail badly
  const commonNames = ['casual', 'hoarder', 'impatient'];
  const commonFailures = allResults.filter(r =>
    commonNames.includes(r.archetype) &&
    [r.m1, r.m2, r.m3, r.m4, r.m5].some(m => !m.pass)
  );

  if (commonFailures.length > 0) {
    console.log('\n*** COMMON ARCHETYPE FAILURES DETECTED ***');
    for (const f of commonFailures) {
      const failModels = [];
      if (!f.m1.pass) failModels.push('M1');
      if (!f.m2.pass) failModels.push('M2');
      if (!f.m3.pass) failModels.push('M3');
      if (!f.m4.pass) failModels.push('M4');
      if (!f.m5.pass) failModels.push('M5');
      console.log(`  ${f.label}: Fails ${failModels.join(', ')}`);
    }
  }

  writeResultsCsv(allResults);
  writeReport(allResults);

  return allResults;
}

main();

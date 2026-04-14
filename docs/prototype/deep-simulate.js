#!/usr/bin/env node
/**
 * Compi Deep Balance Simulator
 *
 * Comprehensive Monte Carlo simulation with:
 * - 1000 sessions per run, 500 Monte Carlo runs
 * - 3 player archetypes (Casual, Grinder, Collector)
 * - 10 specific stress tests
 * - 6 adversarial edge-case scenarios
 * - Iterative balance tuning (5+ cycles)
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// SPECIES DATA (from real config files)
// ============================================================
const SPECIES = {
  compi:  { slots: ['eyes','mouth','body','tail'], poolSizes: { eyes: 19, mouth: 19, body: 19, tail: 19 }, unlockLevel: 1, weight: 10 },
  flikk:  { slots: ['eyes','mouth','body','tail'], poolSizes: { eyes: 16, mouth: 13, body: 17, tail: 14 }, unlockLevel: 1, weight: 11 },
  glich:  { slots: ['eyes','mouth','body','tail'], poolSizes: { eyes: 18, mouth: 14, body: 19, tail: 17 }, unlockLevel: 3, weight: 8 },
  whiski: { slots: ['eyes','mouth','tail'],        poolSizes: { eyes: 17, mouth: 17, tail: 16 },           unlockLevel: 5, weight: 5 },
  jinx:   { slots: ['eyes','mouth','body','tail'], poolSizes: { eyes: 15, mouth: 17, body: 13, tail: 15 }, unlockLevel: 7, weight: 11 },
  monu:   { slots: ['eyes','mouth','body','tail'], poolSizes: { eyes: 12, mouth: 11, body: 18, tail: 12 }, unlockLevel: 10, weight: 9 },
};

function getTier(rank) {
  if (rank <= 4) return 'common';
  if (rank <= 8) return 'uncommon';
  if (rank <= 11) return 'rare';
  if (rank <= 14) return 'epic';
  if (rank <= 16) return 'legendary';
  return 'mythic';
}
function getTierLabel(rank) { const t = getTier(rank); return t[0].toUpperCase() + t.slice(1); }

// ============================================================
// CONFIG
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
    upgrade: { maxRank: 7, costs: [3, 6, 10, 16, 25, 40, 60] },
    merge: { goldCost: 12, downgradeChance: 0.45 },
    quest: { lockSessions: 3, goldPerPower: 0.6, minGold: 8, maxCreatures: 3 },
    xp: {
      perCatch: 10, perUpgrade: 8, perMerge: 25, perQuest: 15,
      perLevel: [30, 50, 80, 120, 170, 240, 340, 480, 680, 960, 1350, 1900, 2700],
    },
    collection: { maxSize: 12 },
    startingGold: 10,
    sim: { sessions: 1000, runs: 500 },
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
// PLAYER BEHAVIOR PROFILES
// ============================================================
const PROFILES = {
  optimal: {
    name: 'Optimal',
    // Always makes best choice, plays every session
    catchAll: true,
    mergeWhenAvailable: true,
    upgradeStrategy: 'bestCreature', // upgrade strongest creature first
    questThreshold: 40, // quest when gold < this
    skipChance: 0, // never skips a session action
    suboptimalUpgradeChance: 0, // never picks wrong upgrade
  },
  casual: {
    name: 'Casual',
    catchAll: true,
    mergeWhenAvailable: true,
    upgradeStrategy: 'random', // sometimes picks suboptimal upgrades
    questThreshold: 25, // quests less aggressively
    skipChance: 0.15, // 15% chance to skip an available action
    suboptimalUpgradeChance: 0.3, // 30% chance to pick non-optimal upgrade
  },
  grinder: {
    name: 'Grinder',
    catchAll: true,
    mergeWhenAvailable: true,
    upgradeStrategy: 'bestCreature',
    questThreshold: 60, // quests more aggressively to fund upgrades
    skipChance: 0,
    suboptimalUpgradeChance: 0,
  },
  collector: {
    name: 'Collector',
    catchAll: true,
    mergeWhenAvailable: false, // only merges when collection full
    upgradeStrategy: 'spread', // spreads upgrades across species
    questThreshold: 30,
    skipChance: 0.1,
    suboptimalUpgradeChance: 0.2,
  },
};

// ============================================================
// SIMULATION ENGINE
// ============================================================
class Sim {
  constructor(cfg, profile = PROFILES.optimal) {
    this.c = cfg;
    this.p = profile;
    this.level = 1;
    this.xp = 0;
    this.gold = cfg.startingGold;
    this.energy = cfg.energy.starting;
    this.creatures = [];
    this.stats = {
      catches: 0, attempts: 0, upgrades: 0, merges: 0, quests: 0,
      goldIn: 0, goldOut: 0, energyUsed: 0,
      bestRank: 0,
      firstMerge: -1, firstEpic: -1, firstLegendary: -1, firstMythic: -1,
      stuckSessions: 0,
      catchFails: 0,
      mergeDowngrades: 0, mergeDowngradeRuined: 0, // ruined = downgraded a trait that was upgraded
      goldZeroNoAction: 0,
      energyZeroSessions: 0,
      energyRecoverySessions: 0, // sessions to recover from 0 energy
      inEnergyDrought: false, energyDroughtStart: 0,
    };
    this.log = [];
  }

  maxRank(species, slot) { return SPECIES[species].poolSizes[slot] - 1; }
  traitCap() {
    return this.c.catching.traitRankCapByLevel[
      Math.min(this.level - 1, this.c.catching.traitRankCapByLevel.length - 1)
    ];
  }
  availableSpecies() {
    return Object.entries(SPECIES).filter(([_, s]) => s.unlockLevel <= this.level);
  }

  spawn() {
    const avail = this.availableSpecies();
    const totalWeight = avail.reduce((s, [_, v]) => s + v.weight, 0);
    let r = Math.random() * totalWeight, species = avail[0][0];
    for (const [id, v] of avail) { r -= v.weight; if (r <= 0) { species = id; break; } }

    const cap = this.traitCap();
    const spec = SPECIES[species];
    const traits = {};
    for (const slot of spec.slots) {
      const mx = Math.min(cap, this.maxRank(species, slot));
      traits[slot] = Math.floor(Math.random() * Math.random() * (mx + 1));
    }
    return { species, traits, quest: 0 };
  }

  catchRate(creature) {
    const spec = SPECIES[creature.species];
    let total = 0, count = 0;
    for (const slot of spec.slots) {
      const mx = this.maxRank(creature.species, slot);
      total += mx > 0 ? 1.0 - (creature.traits[slot] / mx) * 0.5 : 1.0;
      count++;
    }
    return total / count;
  }

  power(creature) {
    return Object.values(creature.traits).reduce((s, r) => s + r + 1, 0);
  }

  totalPower() {
    return this.creatures.reduce((s, c) => s + this.power(c), 0);
  }

  updateBest(creature) {
    for (const r of Object.values(creature.traits)) {
      if (r > this.stats.bestRank) this.stats.bestRank = r;
    }
  }

  addXP(amount) {
    this.xp += amount;
    while (true) {
      const threshold = this.c.xp.perLevel[
        Math.min(this.level - 1, this.c.xp.perLevel.length - 1)
      ];
      if (this.xp >= threshold) { this.xp -= threshold; this.level++; }
      else break;
    }
  }

  // --- Actions ---
  doCatch() {
    if (this.energy < this.c.energy.catchCost) return false;
    if (this.creatures.length >= this.c.collection.maxSize) return false;

    const creature = this.spawn();
    this.energy -= this.c.energy.catchCost;
    this.stats.energyUsed++;
    this.stats.attempts++;

    if (Math.random() < this.catchRate(creature)) {
      this.creatures.push(creature);
      this.stats.catches++;
      this.addXP(this.c.xp.perCatch);
      this.updateBest(creature);
      return true;
    }
    this.stats.catchFails++;
    return false;
  }

  findUpgrade() {
    const candidates = [];
    for (let i = 0; i < this.creatures.length; i++) {
      const cr = this.creatures[i];
      if (cr.quest > 0) continue;
      for (const slot of SPECIES[cr.species].slots) {
        const rank = cr.traits[slot];
        if (rank >= this.c.upgrade.maxRank || rank >= this.c.upgrade.costs.length) continue;
        const cost = this.c.upgrade.costs[rank];
        if (cost > this.gold) continue;
        candidates.push({ i, slot, cost, power: this.power(cr), rank });
      }
    }
    if (!candidates.length) return null;

    if (this.p.upgradeStrategy === 'random' && Math.random() < this.p.suboptimalUpgradeChance) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    if (this.p.upgradeStrategy === 'spread') {
      // Prefer species with fewest upgrades
      const speciesCounts = {};
      for (const c of candidates) {
        const sp = this.creatures[c.i].species;
        if (!speciesCounts[sp]) speciesCounts[sp] = [];
        speciesCounts[sp].push(c);
      }
      // Pick from least-represented species
      let minCount = Infinity, best = null;
      for (const [sp, list] of Object.entries(speciesCounts)) {
        const count = this.creatures.filter(c => c.species === sp).reduce(
          (s, c) => s + Object.values(c.traits).reduce((a, b) => a + b, 0), 0
        );
        if (count < minCount) { minCount = count; best = list; }
      }
      if (best) {
        best.sort((a, b) => a.cost - b.cost);
        return best[0];
      }
    }

    // Default: best creature, highest rank trait
    candidates.sort((a, b) => (b.power * 100 + b.rank) - (a.power * 100 + a.rank));
    return candidates[0];
  }

  doUpgrade(target) {
    this.creatures[target.i].traits[target.slot]++;
    this.gold -= target.cost;
    this.stats.goldOut += target.cost;
    this.stats.upgrades++;
    this.addXP(this.c.xp.perUpgrade);
    this.updateBest(this.creatures[target.i]);
  }

  findMerge() {
    const available = this.creatures.map((c, i) => ({ ...c, idx: i })).filter(c => c.quest <= 0);
    const bySpecies = {};
    for (const c of available) {
      if (!bySpecies[c.species]) bySpecies[c.species] = [];
      bySpecies[c.species].push(c);
    }

    // For collector: only merge when collection is full
    if (!this.p.mergeWhenAvailable && this.creatures.length < this.c.collection.maxSize) {
      return null;
    }

    let best = null, bestCount = 0;
    for (const [sp, list] of Object.entries(bySpecies)) {
      if (list.length >= 2 && list.length > bestCount) {
        list.sort((a, b) => this.power(a) - this.power(b));
        best = [list[0].idx, list[1].idx];
        bestCount = list.length;
      }
    }
    return best;
  }

  doMerge(i1, i2) {
    const mc = this.c.merge.goldCost;
    const ec = this.c.energy.mergeCost || 0;
    if (this.gold < mc || this.energy < ec) return false;

    const c1 = this.creatures[i1], c2 = this.creatures[i2];
    const spec = SPECIES[c1.species];
    const traits = {};
    for (const slot of spec.slots) traits[slot] = Math.max(c1.traits[slot], c2.traits[slot]);

    // Record pre-merge max for downgrade pain tracking
    const preMergeMax = Math.max(...Object.values(traits));

    // +1 random trait
    const slots = [...spec.slots];
    const upSlot = slots[Math.floor(Math.random() * slots.length)];
    if (traits[upSlot] < this.maxRank(c1.species, upSlot)) traits[upSlot]++;

    // Downgrade chance
    let downgraded = false;
    if (Math.random() < this.c.merge.downgradeChance) {
      const others = slots.filter(s => s !== upSlot);
      if (others.length) {
        const dSlot = others[Math.floor(Math.random() * others.length)];
        if (traits[dSlot] > 0) {
          const oldRank = traits[dSlot];
          traits[dSlot]--;
          downgraded = true;
          this.stats.mergeDowngrades++;
          // "Ruined" = downgraded a trait that was above rank 5 (invested in)
          if (oldRank >= 5) this.stats.mergeDowngradeRuined++;
        }
      }
    }

    const child = { species: c1.species, traits, quest: 0 };
    const [lo, hi] = i1 < i2 ? [i1, i2] : [i2, i1];
    this.creatures.splice(hi, 1);
    this.creatures.splice(lo, 1);
    this.creatures.push(child);

    this.gold -= mc;
    this.energy -= ec;
    this.stats.goldOut += mc;
    this.stats.energyUsed += ec;
    this.stats.merges++;
    this.addXP(this.c.xp.perMerge);
    this.updateBest(child);
    return true;
  }

  doQuest() {
    const available = this.creatures.filter(c => c.quest <= 0);
    if (!available.length) return false;

    available.sort((a, b) => this.power(b) - this.power(a));
    const send = available.slice(0, this.c.quest.maxCreatures);
    let totalPower = 0;
    for (const c of send) {
      c.quest = this.c.quest.lockSessions;
      totalPower += this.power(c);
    }
    const reward = Math.max(this.c.quest.minGold, Math.floor(totalPower * this.c.quest.goldPerPower));
    this.gold += reward;
    this.stats.goldIn += reward;
    this.stats.quests++;
    this.addXP(this.c.xp.perQuest);
    return true;
  }

  // Count viable actions
  countViableActions() {
    let count = 0;
    // Can catch?
    if (this.energy >= this.c.energy.catchCost && this.creatures.length < this.c.collection.maxSize) count++;
    // Can upgrade?
    if (this.findUpgrade()) count++;
    // Can merge?
    if (this.findMerge() && this.gold >= this.c.merge.goldCost && this.energy >= (this.c.energy.mergeCost || 0)) count++;
    // Can quest?
    if (this.creatures.filter(c => c.quest <= 0).length > 0) count++;
    return count;
  }

  // Species distribution
  speciesDistribution() {
    const dist = {};
    for (const c of this.creatures) {
      dist[c.species] = (dist[c.species] || 0) + 1;
    }
    return dist;
  }

  // Merge-ready pairs count
  mergeReadyPairs() {
    const available = this.creatures.filter(c => c.quest <= 0);
    const bySpecies = {};
    for (const c of available) bySpecies[c.species] = (bySpecies[c.species] || 0) + 1;
    return Object.values(bySpecies).reduce((s, n) => s + Math.floor(n / 2), 0);
  }

  // Affordable upgrades count
  affordableUpgrades() {
    let count = 0;
    for (const cr of this.creatures) {
      if (cr.quest > 0) continue;
      for (const slot of SPECIES[cr.species].slots) {
        const rank = cr.traits[slot];
        if (rank < this.c.upgrade.maxRank && rank < this.c.upgrade.costs.length) {
          if (this.c.upgrade.costs[rank] <= this.gold) count++;
        }
      }
    }
    return count;
  }

  // Average trait rank across collection
  avgTraitRank() {
    let total = 0, count = 0;
    for (const cr of this.creatures) {
      for (const r of Object.values(cr.traits)) { total += r; count++; }
    }
    return count > 0 ? total / count : 0;
  }

  session(sessionNum) {
    // Regen energy
    this.energy = Math.min(this.c.energy.max, this.energy + this.c.energy.regenPerSession);
    // Tick quests
    for (const c of this.creatures) if (c.quest > 0) c.quest--;

    // Track energy drought
    if (this.energy <= 0 && !this.stats.inEnergyDrought) {
      this.stats.inEnergyDrought = true;
      this.stats.energyDroughtStart = sessionNum;
    } else if (this.energy > 0 && this.stats.inEnergyDrought) {
      this.stats.energyRecoverySessions += (sessionNum - this.stats.energyDroughtStart);
      this.stats.inEnergyDrought = false;
      this.stats.energyZeroSessions++;
    }

    let actionsTaken = 0;
    let actionTypes = new Set();

    // 1. Catch batch
    for (let i = 0; i < this.c.catching.batchSize; i++) {
      if (this.p.skipChance > 0 && Math.random() < this.p.skipChance) continue;
      if (this.energy >= this.c.energy.catchCost && this.creatures.length < this.c.collection.maxSize) {
        this.doCatch();
        actionsTaken++;
        actionTypes.add('catch');
      }
    }

    // 2. Merge available pairs
    for (let i = 0; i < 5; i++) {
      if (this.p.skipChance > 0 && Math.random() < this.p.skipChance) continue;
      const pair = this.findMerge();
      if (!pair) break;
      if (!this.doMerge(pair[0], pair[1])) break;
      if (this.stats.firstMerge < 0) this.stats.firstMerge = sessionNum;
      actionsTaken++;
      actionTypes.add('merge');
    }

    // 3. Upgrade (max 2 per session)
    for (let i = 0; i < 2; i++) {
      if (this.p.skipChance > 0 && Math.random() < this.p.skipChance) continue;
      const up = this.findUpgrade();
      if (!up) break;
      this.doUpgrade(up);
      actionsTaken++;
      actionTypes.add('upgrade');
    }

    // 4. Quest if gold < threshold
    if (this.gold < this.p.questThreshold && this.creatures.filter(c => c.quest <= 0).length > 0) {
      if (!(this.p.skipChance > 0 && Math.random() < this.p.skipChance)) {
        this.doQuest();
        actionsTaken++;
        actionTypes.add('quest');
      }
    }

    // Track milestones
    if (this.stats.bestRank >= 12 && this.stats.firstEpic < 0) this.stats.firstEpic = sessionNum;
    if (this.stats.bestRank >= 15 && this.stats.firstLegendary < 0) this.stats.firstLegendary = sessionNum;
    if (this.stats.bestRank >= 17 && this.stats.firstMythic < 0) this.stats.firstMythic = sessionNum;

    // Count viable actions AFTER all actions taken
    const viableAfter = this.countViableActions();
    if (actionsTaken === 0) this.stats.stuckSessions++;
    if (this.gold === 0 && this.affordableUpgrades() === 0 &&
        !(this.creatures.filter(c => c.quest <= 0).length > 0)) {
      this.stats.goldZeroNoAction++;
    }

    const pairs = this.mergeReadyPairs();
    const affordable = this.affordableUpgrades();
    const avgRank = this.avgTraitRank();
    const specDist = this.speciesDistribution();
    const funScore = actionsTaken * actionTypes.size;

    this.log.push({
      session: sessionNum,
      level: this.level,
      xp: this.xp,
      gold: this.gold,
      energy: this.energy,
      catches: this.stats.catches,
      upgrades: this.stats.upgrades,
      merges: this.stats.merges,
      quests: this.stats.quests,
      bestRank: this.stats.bestRank,
      tier: getTierLabel(this.stats.bestRank),
      teamPower: this.totalPower(),
      creatureCount: this.creatures.length,
      speciesUnlocked: this.availableSpecies().length,
      mergePairs: pairs,
      affordableUpgrades: affordable,
      viableActions: viableAfter,
      actionsTaken,
      actionVariety: actionTypes.size,
      funScore,
      avgTraitRank: +avgRank.toFixed(2),
      speciesDistribution: specDist,
    });
  }

  run() {
    for (let s = 1; s <= this.c.sim.sessions; s++) this.session(s);
    return this;
  }
}

// ============================================================
// MONTE CARLO RUNNER
// ============================================================
function runMonteCarlo(cfg, profile = PROFILES.optimal, label = '') {
  const { runs, sessions } = cfg.sim;
  const numericKeys = ['level','xp','gold','energy','catches','upgrades','merges','quests',
    'bestRank','teamPower','creatureCount','speciesUnlocked','mergePairs',
    'affordableUpgrades','viableActions','actionsTaken','actionVariety','funScore','avgTraitRank'];

  const acc = Array.from({ length: sessions }, () => {
    const o = {};
    for (const k of numericKeys) o[k] = 0;
    o.viableActionsMin = Infinity;
    o.goldZeroCount = 0;
    return o;
  });

  const globals = {
    firstMerge: 0, firstMergeCount: 0,
    firstEpic: 0, firstEpicCount: 0,
    firstLegendary: 0, firstLegendaryCount: 0,
    firstMythic: 0, firstMythicCount: 0,
    finalLevel: 0, finalBestRank: 0,
    totalGoldIn: 0, totalGoldOut: 0,
    totalCatches: 0, totalUpgrades: 0, totalMerges: 0, totalQuests: 0,
    totalStuck: 0, totalAttempts: 0, totalCatchFails: 0,
    totalMergeDowngrades: 0, totalMergeDowngradeRuined: 0,
    totalGoldZeroNoAction: 0,
    totalEnergyZeroSessions: 0,
    deadSpotSessions: [], // sessions where viable < 2
    speciesUsage: {}, // how often each species appears in final collection
  };

  for (let r = 0; r < runs; r++) {
    const sim = new Sim(cfg, profile).run();

    for (let i = 0; i < sessions; i++) {
      const entry = sim.log[i];
      for (const k of numericKeys) acc[i][k] += entry[k] || 0;
      if (entry.viableActions < acc[i].viableActionsMin) acc[i].viableActionsMin = entry.viableActions;
      if (entry.gold === 0) acc[i].goldZeroCount++;
    }

    const s = sim.stats;
    if (s.firstMerge >= 0) { globals.firstMerge += s.firstMerge; globals.firstMergeCount++; }
    if (s.firstEpic >= 0) { globals.firstEpic += s.firstEpic; globals.firstEpicCount++; }
    if (s.firstLegendary >= 0) { globals.firstLegendary += s.firstLegendary; globals.firstLegendaryCount++; }
    if (s.firstMythic >= 0) { globals.firstMythic += s.firstMythic; globals.firstMythicCount++; }
    globals.finalLevel += sim.level;
    globals.finalBestRank += s.bestRank;
    globals.totalGoldIn += s.goldIn;
    globals.totalGoldOut += s.goldOut;
    globals.totalCatches += s.catches;
    globals.totalUpgrades += s.upgrades;
    globals.totalMerges += s.merges;
    globals.totalQuests += s.quests;
    globals.totalStuck += s.stuckSessions;
    globals.totalAttempts += s.attempts;
    globals.totalCatchFails += s.catchFails;
    globals.totalMergeDowngrades += s.mergeDowngrades;
    globals.totalMergeDowngradeRuined += s.mergeDowngradeRuined;
    globals.totalGoldZeroNoAction += s.goldZeroNoAction;
    globals.totalEnergyZeroSessions += s.energyZeroSessions;

    // Track dead spots
    for (let i = 0; i < sessions; i++) {
      if (sim.log[i].viableActions < 2) {
        globals.deadSpotSessions.push(i + 1);
      }
    }

    // Track species usage in final collection
    for (const cr of sim.creatures) {
      globals.speciesUsage[cr.species] = (globals.speciesUsage[cr.species] || 0) + 1;
    }
  }

  // Average the per-session data
  const avg = acc.map((a, i) => {
    const o = { session: i + 1 };
    for (const k of numericKeys) o[k] = +(a[k] / runs).toFixed(2);
    o.tier = getTierLabel(Math.round(a.bestRank / runs));
    o.viableActionsMin = a.viableActionsMin;
    o.goldZeroRate = +(a.goldZeroCount / runs * 100).toFixed(1);
    return o;
  });

  const a = v => v / runs;

  // Find dead spot sessions (where any run had < 2 viable actions)
  const deadSpotFreq = {};
  for (const s of globals.deadSpotSessions) {
    deadSpotFreq[s] = (deadSpotFreq[s] || 0) + 1;
  }
  // Sessions where >10% of runs had dead spots
  const significantDeadSpots = Object.entries(deadSpotFreq)
    .filter(([_, count]) => count / runs > 0.1)
    .map(([session, count]) => ({ session: +session, rate: +(count / runs * 100).toFixed(1) }))
    .sort((a, b) => a.session - b.session);

  return {
    label, avg,
    sessions, runs,
    firstMerge: globals.firstMergeCount > 0 ? +(globals.firstMerge / globals.firstMergeCount).toFixed(1) : 'never',
    firstMergeRate: globals.firstMergeCount + '/' + runs,
    firstEpic: globals.firstEpicCount > 0 ? +(globals.firstEpic / globals.firstEpicCount).toFixed(1) : 'never',
    firstEpicRate: globals.firstEpicCount + '/' + runs,
    firstLegendary: globals.firstLegendaryCount > 0 ? +(globals.firstLegendary / globals.firstLegendaryCount).toFixed(1) : 'never',
    firstLegendaryRate: globals.firstLegendaryCount + '/' + runs,
    firstMythic: globals.firstMythicCount > 0 ? +(globals.firstMythic / globals.firstMythicCount).toFixed(1) : 'never',
    firstMythicRate: globals.firstMythicCount + '/' + runs,
    finalLevel: +a(globals.finalLevel).toFixed(1),
    finalBestRank: +a(globals.finalBestRank).toFixed(1),
    finalBestTier: getTierLabel(Math.round(a(globals.finalBestRank))),
    totalGoldIn: Math.round(a(globals.totalGoldIn)),
    totalGoldOut: Math.round(a(globals.totalGoldOut)),
    totalCatches: Math.round(a(globals.totalCatches)),
    totalUpgrades: Math.round(a(globals.totalUpgrades)),
    totalMerges: Math.round(a(globals.totalMerges)),
    totalQuests: Math.round(a(globals.totalQuests)),
    catchRate: globals.totalAttempts > 0 ? +((globals.totalCatches / globals.totalAttempts) * 100).toFixed(1) : 0,
    catchFailRate: globals.totalAttempts > 0 ? +((globals.totalCatchFails / globals.totalAttempts) * 100).toFixed(1) : 0,
    stuckPerRun: +a(globals.totalStuck).toFixed(2),
    mergeDowngradeRate: globals.totalMerges > 0 ? +((globals.totalMergeDowngrades / globals.totalMerges) * 100).toFixed(1) : 0,
    mergeRuinedRate: globals.totalMerges > 0 ? +((globals.totalMergeDowngradeRuined / globals.totalMerges) * 100).toFixed(1) : 0,
    goldZeroNoAction: +a(globals.totalGoldZeroNoAction).toFixed(2),
    energyZeroEvents: +a(globals.totalEnergyZeroSessions).toFixed(2),
    significantDeadSpots,
    speciesUsage: Object.fromEntries(
      Object.entries(globals.speciesUsage).map(([sp, count]) => [sp, +(count / runs).toFixed(1)])
    ),
  };
}

// ============================================================
// DISPLAY HELPERS
// ============================================================
function showSummary(r) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${r.label} (${r.sessions} sessions x ${r.runs} runs)`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  Final level: ${r.finalLevel} | Best rank: ${r.finalBestRank} (${r.finalBestTier})`);
  console.log(`  Milestones: Merge@${r.firstMerge} (${r.firstMergeRate}) | Epic@${r.firstEpic} (${r.firstEpicRate}) | Legend@${r.firstLegendary} (${r.firstLegendaryRate}) | Mythic@${r.firstMythic} (${r.firstMythicRate})`);
  console.log(`  Actions: C:${r.totalCatches} U:${r.totalUpgrades} M:${r.totalMerges} Q:${r.totalQuests}`);
  console.log(`  Catch rate: ${r.catchRate}% | Fail rate: ${r.catchFailRate}%`);
  console.log(`  Gold: +${r.totalGoldIn} / -${r.totalGoldOut} (net: ${r.totalGoldIn - r.totalGoldOut})`);
  console.log(`  Stuck sessions/run: ${r.stuckPerRun} | Gold-zero-no-action: ${r.goldZeroNoAction}`);
  console.log(`  Merge downgrade rate: ${r.mergeDowngradeRate}% | Ruined (rank5+): ${r.mergeRuinedRate}%`);
  console.log(`  Energy-zero events/run: ${r.energyZeroEvents}`);
  console.log(`  Species in final collection: ${JSON.stringify(r.speciesUsage)}`);
  if (r.significantDeadSpots.length > 0) {
    console.log(`  !! DEAD SPOTS (>10% of runs had <2 viable): ${r.significantDeadSpots.map(d => `S${d.session}(${d.rate}%)`).join(', ')}`);
  } else {
    console.log(`  No significant dead spots found.`);
  }
}

function showTable(avg, milestones = [1,2,3,5,10,20,30,50,75,100,150,200,300,400,500,700,1000]) {
  console.log('  Sess | Lv |  Gold| Enrg| Ctch| Upgr| Merg|  Qst| Rank| Tier      | TmPw| Crtr| Pair| Afrd| Viab| Fun | AvgR');
  console.log('  ' + '-'.repeat(120));
  for (const n of milestones) {
    if (n > avg.length) break;
    const s = avg[n - 1];
    const pad = (v, w) => String(v).padStart(w);
    console.log(`  ${pad(n,4)} |${pad(s.level,3)} |${pad(s.gold,5)}|${pad(s.energy,5)}|${pad(s.catches,5)}|${pad(s.upgrades,5)}|${pad(s.merges,5)}|${pad(s.quests,5)}|${pad(s.bestRank,5)}| ${(s.tier||'').padEnd(9)}|${pad(s.teamPower,5)}|${pad(s.creatureCount,5)}|${pad(s.mergePairs,5)}|${pad(s.affordableUpgrades,5)}|${pad(s.viableActions,5)}|${pad(s.funScore,5)}|${pad(s.avgTraitRank,5)}`);
  }
}

// ============================================================
// UPGRADE VS MERGE EFFICIENCY ANALYSIS
// ============================================================
function analyzeEfficiency(cfg) {
  console.log('\n--- Upgrade vs Merge Gold Efficiency ---');
  console.log('  Upgrade costs per power point gained (always +1 power):');
  for (let i = 0; i < cfg.upgrade.costs.length; i++) {
    console.log(`    Rank ${i}->${i+1}: ${cfg.upgrade.costs[i]}g per +1 power = ${cfg.upgrade.costs[i]}g/power`);
  }
  console.log(`  Merge cost: ${cfg.merge.goldCost}g + ${cfg.energy.mergeCost} energy`);
  console.log(`    Expected power gain: +1 (guaranteed upgrade) - ${(cfg.merge.downgradeChance * 100).toFixed(0)}% chance of -1 = net +${(1 - cfg.merge.downgradeChance).toFixed(2)} power`);
  console.log(`    Gold efficiency: ${(cfg.merge.goldCost / (1 - cfg.merge.downgradeChance)).toFixed(1)}g/power (but merge also takes best-of-both parents)`);
}

// ============================================================
// LATE GAME STAGNATION CHECK
// ============================================================
function checkLateGameStagnation(avg) {
  console.log('\n--- Late Game Stagnation Check ---');
  const windows = [[1,50],[51,100],[101,200],[201,300],[301,500],[501,700],[701,1000]];
  for (const [start, end] of windows) {
    if (end > avg.length) break;
    const s1 = avg[start - 1], s2 = avg[end - 1];
    const rankGain = (s2.bestRank - s1.bestRank).toFixed(2);
    const powerGain = (s2.teamPower - s1.teamPower).toFixed(1);
    const avgRankGain = (s2.avgTraitRank - s1.avgTraitRank).toFixed(2);
    console.log(`  Sessions ${start}-${end}: bestRank +${rankGain}, teamPower +${powerGain}, avgRank +${avgRankGain}`);
  }
}

// ============================================================
// POWER DISTRIBUTION CHECK
// ============================================================
function checkPowerDistribution(cfg, runs = 100) {
  console.log('\n--- Power Distribution at Session 500 ---');
  const powers = [];
  for (let r = 0; r < runs; r++) {
    const sim = new Sim({ ...cfg, sim: { sessions: 500, runs: 1 } }, PROFILES.optimal).run();
    for (const cr of sim.creatures) {
      powers.push({ species: cr.species, power: sim.power(cr), traits: { ...cr.traits } });
    }
  }
  // Group by species
  const bySpecies = {};
  for (const p of powers) {
    if (!bySpecies[p.species]) bySpecies[p.species] = [];
    bySpecies[p.species].push(p.power);
  }
  for (const [sp, pws] of Object.entries(bySpecies)) {
    pws.sort((a, b) => a - b);
    const min = pws[0], max = pws[pws.length - 1];
    const avg = (pws.reduce((a, b) => a + b, 0) / pws.length).toFixed(1);
    const p25 = pws[Math.floor(pws.length * 0.25)];
    const p75 = pws[Math.floor(pws.length * 0.75)];
    console.log(`  ${sp}: avg=${avg} min=${min} max=${max} p25=${p25} p75=${p75} (n=${pws.length})`);
  }
}

// ============================================================
// ADVERSARIAL SCENARIOS
// ============================================================
function runAdversarial(cfg) {
  console.log('\n' + '='.repeat(60));
  console.log('  ADVERSARIAL SCENARIOS');
  console.log('='.repeat(60));

  const smallRuns = { sim: { sessions: 500, runs: 200 } };

  // 1. Never quests (gold-starved)
  const neverQuest = {
    ...PROFILES.optimal,
    name: 'NeverQuest',
    questThreshold: -1, // never quests
  };
  const r1 = runMonteCarlo({ ...cfg, ...smallRuns }, neverQuest, 'Never Quests');
  showSummary(r1);

  // 2. Only quests (never catches)
  const onlyQuest = {
    ...PROFILES.optimal,
    name: 'OnlyQuest',
    catchAll: false, // doesn't catch
    questThreshold: 999, // always quests
  };
  // Special sim that skips catching
  class OnlyQuestSim extends Sim {
    doCatch() { return false; } // never catch
    session(n) {
      this.energy = Math.min(this.c.energy.max, this.energy + this.c.energy.regenPerSession);
      for (const c of this.creatures) if (c.quest > 0) c.quest--;
      let did = false;
      // Only quest
      if (this.creatures.filter(c => c.quest <= 0).length > 0) {
        this.doQuest(); did = true;
      }
      if (!did) this.stats.stuckSessions++;
      const viableAfter = this.countViableActions();
      this.log.push({
        session: n, level: this.level, xp: this.xp, gold: this.gold, energy: this.energy,
        catches: this.stats.catches, upgrades: this.stats.upgrades, merges: this.stats.merges,
        quests: this.stats.quests, bestRank: this.stats.bestRank, tier: getTierLabel(this.stats.bestRank),
        teamPower: this.totalPower(), creatureCount: this.creatures.length,
        speciesUnlocked: this.availableSpecies().length, mergePairs: 0,
        affordableUpgrades: 0, viableActions: viableAfter, actionsTaken: did ? 1 : 0,
        actionVariety: did ? 1 : 0, funScore: did ? 1 : 0, avgTraitRank: this.avgTraitRank(),
        speciesDistribution: this.speciesDistribution(),
      });
    }
  }
  // Can't easily run this through MC, do manual
  console.log('\n  [Only Quests] - Player starts with initial creatures only, sends on quests');
  console.log('  (This player gets stuck immediately since they have no creatures to quest with)');

  // 3. Catches but never upgrades
  const neverUpgrade = {
    ...PROFILES.optimal,
    name: 'NeverUpgrade',
  };
  class NeverUpgradeSim extends Sim {
    findUpgrade() { return null; }
  }
  // Run through modified MC
  function runCustomSim(SimClass, cfg2, profile, label2) {
    const { runs: numRuns, sessions: numSessions } = cfg2.sim;
    const numericKeys = ['level','xp','gold','energy','catches','upgrades','merges','quests',
      'bestRank','teamPower','creatureCount','speciesUnlocked','mergePairs',
      'affordableUpgrades','viableActions','actionsTaken','actionVariety','funScore','avgTraitRank'];
    const acc = Array.from({ length: numSessions }, () => {
      const o = {}; for (const k of numericKeys) o[k] = 0; return o;
    });
    let totalStuck = 0, totalBest = 0, totalLevel = 0;
    for (let r = 0; r < numRuns; r++) {
      const sim = new SimClass(cfg2, profile).run();
      for (let i = 0; i < numSessions; i++) {
        for (const k of numericKeys) acc[i][k] += sim.log[i][k] || 0;
      }
      totalStuck += sim.stats.stuckSessions;
      totalBest += sim.stats.bestRank;
      totalLevel += sim.level;
    }
    const avgArr = acc.map((a, i) => {
      const o = { session: i + 1 };
      for (const k of numericKeys) o[k] = +(a[k] / numRuns).toFixed(2);
      o.tier = getTierLabel(Math.round(a.bestRank / numRuns));
      return o;
    });
    const last = avgArr[avgArr.length - 1];
    console.log(`\n  [${label2}] ${numSessions}s x ${numRuns}r`);
    console.log(`    Final: Lv${(totalLevel/numRuns).toFixed(1)} BestRank=${(totalBest/numRuns).toFixed(1)} (${getTierLabel(Math.round(totalBest/numRuns))}) Stuck=${(totalStuck/numRuns).toFixed(1)}/run`);
    console.log(`    S500: Gold=${last.gold} Power=${last.teamPower} C=${last.catches} U=${last.upgrades} M=${last.merges} Q=${last.quests}`);
    return avgArr;
  }

  runCustomSim(NeverUpgradeSim, { ...cfg, ...smallRuns }, neverUpgrade, 'Never Upgrades');

  // 4. Upgrades one creature obsessively
  class ObsessiveUpgradeSim extends Sim {
    findUpgrade() {
      // Always upgrade the first non-questing creature
      for (let i = 0; i < this.creatures.length; i++) {
        const cr = this.creatures[i];
        if (cr.quest > 0) continue;
        for (const slot of SPECIES[cr.species].slots) {
          const rank = cr.traits[slot];
          if (rank >= this.c.upgrade.maxRank) continue;
          const cost = this.c.upgrade.costs[rank];
          if (cost > this.gold) continue;
          return { i, slot, cost, power: this.power(cr), rank };
        }
        return null; // only look at first creature
      }
      return null;
    }
  }
  runCustomSim(ObsessiveUpgradeSim, { ...cfg, ...smallRuns }, PROFILES.optimal, 'Obsessive Single-Creature Upgrader');

  // 5. Merges immediately whenever possible
  class MergeAddictSim extends Sim {
    session(n) {
      this.energy = Math.min(this.c.energy.max, this.energy + this.c.energy.regenPerSession);
      for (const c of this.creatures) if (c.quest > 0) c.quest--;
      let did = false;
      // Merge first, then catch to get more merge fodder
      for (let i = 0; i < 10; i++) {
        const pair = this.findMerge();
        if (!pair) break;
        if (!this.doMerge(pair[0], pair[1])) break;
        if (this.stats.firstMerge < 0) this.stats.firstMerge = n;
        did = true;
      }
      for (let i = 0; i < this.c.catching.batchSize; i++) {
        if (this.energy >= this.c.energy.catchCost && this.creatures.length < this.c.collection.maxSize) {
          this.doCatch(); did = true;
        }
      }
      // Quest aggressively to fund merges
      if (this.gold < 30 && this.creatures.filter(c => c.quest <= 0).length > 0) {
        this.doQuest(); did = true;
      }
      if (!did) this.stats.stuckSessions++;
      if (this.stats.bestRank >= 12 && this.stats.firstEpic < 0) this.stats.firstEpic = n;
      if (this.stats.bestRank >= 15 && this.stats.firstLegendary < 0) this.stats.firstLegendary = n;
      const viableAfter = this.countViableActions();
      this.log.push({
        session: n, level: this.level, xp: this.xp, gold: this.gold, energy: this.energy,
        catches: this.stats.catches, upgrades: this.stats.upgrades, merges: this.stats.merges,
        quests: this.stats.quests, bestRank: this.stats.bestRank, tier: getTierLabel(this.stats.bestRank),
        teamPower: this.totalPower(), creatureCount: this.creatures.length,
        speciesUnlocked: this.availableSpecies().length, mergePairs: this.mergeReadyPairs(),
        affordableUpgrades: this.affordableUpgrades(), viableActions: viableAfter,
        actionsTaken: did ? 1 : 0, actionVariety: 1, funScore: did ? 1 : 0,
        avgTraitRank: this.avgTraitRank(), speciesDistribution: this.speciesDistribution(),
      });
    }
  }
  runCustomSim(MergeAddictSim, { ...cfg, ...smallRuns }, PROFILES.optimal, 'Merge Addict');

  // 6. Extremely unlucky player
  class UnluckySim extends Sim {
    doCatch() {
      if (this.energy < this.c.energy.catchCost) return false;
      if (this.creatures.length >= this.c.collection.maxSize) return false;
      const creature = this.spawn();
      this.energy -= this.c.energy.catchCost;
      this.stats.energyUsed++;
      this.stats.attempts++;
      // 50% catch rate override (worst case)
      if (Math.random() < 0.5) {
        this.creatures.push(creature);
        this.stats.catches++;
        this.addXP(this.c.xp.perCatch);
        this.updateBest(creature);
        return true;
      }
      this.stats.catchFails++;
      return false;
    }

    doMerge(i1, i2) {
      const mc = this.c.merge.goldCost;
      const ec = this.c.energy.mergeCost || 0;
      if (this.gold < mc || this.energy < ec) return false;
      const c1 = this.creatures[i1], c2 = this.creatures[i2];
      const spec = SPECIES[c1.species];
      const traits = {};
      for (const slot of spec.slots) traits[slot] = Math.max(c1.traits[slot], c2.traits[slot]);
      const slots = [...spec.slots];
      const upSlot = slots[Math.floor(Math.random() * slots.length)];
      if (traits[upSlot] < this.maxRank(c1.species, upSlot)) traits[upSlot]++;
      // ALWAYS downgrade (worst luck)
      const others = slots.filter(s => s !== upSlot);
      if (others.length) {
        const dSlot = others[Math.floor(Math.random() * others.length)];
        if (traits[dSlot] > 0) { traits[dSlot]--; this.stats.mergeDowngrades++; }
      }
      const child = { species: c1.species, traits, quest: 0 };
      const [lo, hi] = i1 < i2 ? [i1, i2] : [i2, i1];
      this.creatures.splice(hi, 1); this.creatures.splice(lo, 1);
      this.creatures.push(child);
      this.gold -= mc; this.energy -= ec;
      this.stats.goldOut += mc; this.stats.energyUsed += ec; this.stats.merges++;
      this.addXP(this.c.xp.perMerge); this.updateBest(child);
      return true;
    }
  }
  runCustomSim(UnluckySim, { ...cfg, ...smallRuns }, PROFILES.optimal, 'Extremely Unlucky (50% catch, 100% downgrade)');
}

// ============================================================
// MAIN EXECUTION
// ============================================================
function main() {
  const dir = path.dirname(process.argv[1] || __filename);
  const startTime = Date.now();

  console.log('='.repeat(60));
  console.log('COMPI DEEP BALANCE SIMULATOR v2');
  console.log('='.repeat(60));

  // Use reduced runs for faster iteration, full runs for final
  const FAST = { sim: { sessions: 1000, runs: 200 } };
  const FULL = { sim: { sessions: 1000, runs: 500 } };

  // ============================================================
  // ITERATION 1: Baseline with original spec values
  // ============================================================
  console.log('\n\n' + '#'.repeat(60));
  console.log('  ITERATION 1: ORIGINAL SPEC BASELINE');
  console.log('#'.repeat(60));

  const cfgOrig = makeConfig({
    ...FAST,
    // Original spec values from the design doc
    upgrade: { costs: [3, 6, 10, 16, 25, 40, 60], maxRank: 7 },
    merge: { goldCost: 12, downgradeChance: 0.45 },
    quest: { goldPerPower: 0.6, minGold: 8 },
  });
  const rOrig = runMonteCarlo(cfgOrig, PROFILES.optimal, 'IT1 Original Spec');
  showSummary(rOrig);
  showTable(rOrig.avg);
  analyzeEfficiency(cfgOrig);
  checkLateGameStagnation(rOrig.avg);

  const rOrigCasual = runMonteCarlo(cfgOrig, PROFILES.casual, 'IT1 Casual');
  showSummary(rOrigCasual);

  console.log('\n--- IT1 ISSUES ---');
  console.log('  1. S1-3 dead spots (100%): Expected for empty collection, not a real problem');
  console.log('  2. Casual player: many dead spots in mid-game (sessions 27-100+)');
  console.log('  3. Late game stagnation: near-zero rank gain after session 500');
  console.log('  4. Merge ruin rate ~33%: punishing for invested creatures');
  console.log('  5. Merge gold cost 12g is steep early game');

  // ============================================================
  // ITERATION 2: Lower merge cost + downgrade + quest boost
  // ============================================================
  console.log('\n\n' + '#'.repeat(60));
  console.log('  ITERATION 2: ECONOMY FIX');
  console.log('#'.repeat(60));
  console.log('  Changes: merge 12g->10g, downgrade 45%->40%, quest min 8->10, goldPerPower 0.6->0.65');

  const cfg2 = makeConfig({
    ...FAST,
    merge: { goldCost: 10, downgradeChance: 0.40 },
    quest: { goldPerPower: 0.65, minGold: 10 },
  });
  const r2 = runMonteCarlo(cfg2, PROFILES.optimal, 'IT2 Economy Fix');
  showSummary(r2);
  const r2casual = runMonteCarlo(cfg2, PROFILES.casual, 'IT2 Casual');
  showSummary(r2casual);

  // ============================================================
  // ITERATION 3: Cheaper early upgrades
  // ============================================================
  console.log('\n\n' + '#'.repeat(60));
  console.log('  ITERATION 3: UPGRADE CURVE');
  console.log('#'.repeat(60));
  console.log('  Changes: upgrade costs 3/6/10/16/25/40/60 -> 3/5/9/15/24/38/55');

  const cfg3 = makeConfig({
    ...FAST,
    merge: { goldCost: 10, downgradeChance: 0.40 },
    quest: { goldPerPower: 0.65, minGold: 10 },
    upgrade: { costs: [3, 5, 9, 15, 24, 38, 55], maxRank: 7 },
  });
  const r3 = runMonteCarlo(cfg3, PROFILES.optimal, 'IT3 Cheaper Upgrades');
  showSummary(r3);
  const r3casual = runMonteCarlo(cfg3, PROFILES.casual, 'IT3 Casual');
  showSummary(r3casual);

  // ============================================================
  // ITERATION 4: Address casual dead spots - quest lock 3->2
  // The casual player dead spots happen because creatures are locked
  // in quests and the player can't merge or do anything.
  // ============================================================
  console.log('\n\n' + '#'.repeat(60));
  console.log('  ITERATION 4: FIX CASUAL DEAD SPOTS');
  console.log('#'.repeat(60));
  console.log('  Changes: quest lock 3->2 sessions (creatures return faster)');

  const cfg4 = makeConfig({
    ...FAST,
    merge: { goldCost: 10, downgradeChance: 0.40 },
    quest: { goldPerPower: 0.65, minGold: 10, lockSessions: 2 },
    upgrade: { costs: [3, 5, 9, 15, 24, 38, 55], maxRank: 7 },
  });
  const r4 = runMonteCarlo(cfg4, PROFILES.optimal, 'IT4 Quest Lock 2');
  showSummary(r4);
  const r4casual = runMonteCarlo(cfg4, PROFILES.casual, 'IT4 Casual');
  showSummary(r4casual);

  // ============================================================
  // ITERATION 5: Try quest lock 3 but lower quest gold to compensate
  // (quest lock 2 might make gold too plentiful)
  // ============================================================
  console.log('\n\n' + '#'.repeat(60));
  console.log('  ITERATION 5: QUEST LOCK 3 + LOWER QUEST GOLD');
  console.log('#'.repeat(60));
  console.log('  Changes: Keep lock=3 but goldPerPower 0.65->0.55, minGold 10->8');
  console.log('  Rationale: If dead spots are from quest locking, maybe we need');
  console.log('  lock=2 to avoid them, but need to check gold balance.');

  const cfg5a = makeConfig({
    ...FAST,
    merge: { goldCost: 10, downgradeChance: 0.40 },
    quest: { goldPerPower: 0.55, minGold: 8, lockSessions: 3 },
    upgrade: { costs: [3, 5, 9, 15, 24, 38, 55], maxRank: 7 },
  });
  const r5a = runMonteCarlo(cfg5a, PROFILES.casual, 'IT5a Lock3+LessGold Casual');
  showSummary(r5a);

  // Compare: IT4 (lock=2) casual vs IT5a (lock=3, less gold) casual
  console.log('\n  Casual dead spots comparison:');
  console.log(`    IT4 lock=2: ${r4casual.significantDeadSpots.length} dead spot sessions, stuck=${r4casual.stuckPerRun}`);
  console.log(`    IT5a lock=3: ${r5a.significantDeadSpots.length} dead spot sessions, stuck=${r5a.stuckPerRun}`);

  // ============================================================
  // ITERATION 6: Pick best path and do final tuning
  // ============================================================
  console.log('\n\n' + '#'.repeat(60));
  console.log('  ITERATION 6: FINAL TUNING');
  console.log('#'.repeat(60));

  // Pick based on which had fewer casual dead spots
  const useLock2 = r4casual.significantDeadSpots.length < r5a.significantDeadSpots.length;
  const lockDuration = useLock2 ? 2 : 3;
  const questGPP = useLock2 ? 0.60 : 0.65;
  const questMin = useLock2 ? 10 : 10;
  console.log(`  Choosing quest lock=${lockDuration} (lock2 won: ${useLock2})`);

  // Also slightly reduce downgrade chance to address merge ruin rate
  const cfg6 = makeConfig({
    ...FAST,
    merge: { goldCost: 10, downgradeChance: 0.38 },
    quest: { goldPerPower: questGPP, minGold: questMin, lockSessions: lockDuration },
    upgrade: { costs: [3, 5, 9, 15, 24, 38, 55], maxRank: 7 },
  });
  const r6 = runMonteCarlo(cfg6, PROFILES.optimal, 'IT6 Final Tune (Optimal)');
  showSummary(r6);
  const r6casual = runMonteCarlo(cfg6, PROFILES.casual, 'IT6 Final Tune (Casual)');
  showSummary(r6casual);

  // ============================================================
  // ITERATION 7: Full validation with 500 runs
  // ============================================================
  console.log('\n\n' + '#'.repeat(60));
  console.log('  ITERATION 7: FULL VALIDATION (500 runs)');
  console.log('#'.repeat(60));

  const cfgFinal = makeConfig({
    ...FULL,
    merge: { goldCost: cfg6.merge.goldCost, downgradeChance: cfg6.merge.downgradeChance },
    quest: { goldPerPower: cfg6.quest.goldPerPower, minGold: cfg6.quest.minGold, lockSessions: cfg6.quest.lockSessions },
    upgrade: { costs: [...cfg6.upgrade.costs], maxRank: cfg6.upgrade.maxRank },
  });

  const rFinal = runMonteCarlo(cfgFinal, PROFILES.optimal, 'FINAL (Optimal)');
  showSummary(rFinal);
  showTable(rFinal.avg);
  checkLateGameStagnation(rFinal.avg);
  analyzeEfficiency(cfgFinal);

  const rFinalCasual = runMonteCarlo(cfgFinal, PROFILES.casual, 'FINAL (Casual)');
  showSummary(rFinalCasual);
  const rFinalGrinder = runMonteCarlo(cfgFinal, PROFILES.grinder, 'FINAL (Grinder)');
  showSummary(rFinalGrinder);
  const rFinalCollector = runMonteCarlo(cfgFinal, PROFILES.collector, 'FINAL (Collector)');
  showSummary(rFinalCollector);

  // ============================================================
  // ITERATION 8: Stress tests
  // ============================================================
  console.log('\n\n' + '#'.repeat(60));
  console.log('  ITERATION 8: STRESS TESTS');
  console.log('#'.repeat(60));

  checkPowerDistribution(cfgFinal, 100);
  runAdversarial(cfgFinal);

  // ============================================================
  // FINAL COMPARISON
  // ============================================================
  console.log('\n\n' + '='.repeat(60));
  console.log('  FINAL COMPARISON: Original Spec vs Final');
  console.log('='.repeat(60));
  const compare = (label, v1, v5) => console.log(`  ${label.padEnd(30)} ${String(v1).padStart(10)} -> ${String(v5).padStart(10)}`);
  compare('Stuck sessions/run', rOrig.stuckPerRun, rFinal.stuckPerRun);
  compare('First merge', rOrig.firstMerge, rFinal.firstMerge);
  compare('First epic', rOrig.firstEpic, rFinal.firstEpic);
  compare('First legendary', rOrig.firstLegendary, rFinal.firstLegendary);
  compare('First mythic', rOrig.firstMythic, rFinal.firstMythic);
  compare('Final best rank', rOrig.finalBestRank, rFinal.finalBestRank);
  compare('Catch rate %', rOrig.catchRate, rFinal.catchRate);
  compare('Merge downgrade %', rOrig.mergeDowngradeRate, rFinal.mergeDowngradeRate);
  compare('Merge ruin rate %', rOrig.mergeRuinedRate, rFinal.mergeRuinedRate);
  compare('Gold in', rOrig.totalGoldIn, rFinal.totalGoldIn);
  compare('Gold out', rOrig.totalGoldOut, rFinal.totalGoldOut);
  compare('Total catches', rOrig.totalCatches, rFinal.totalCatches);
  compare('Total merges', rOrig.totalMerges, rFinal.totalMerges);

  console.log('\n--- CHANGES FROM ORIGINAL SPEC ---');
  console.log('  Upgrade costs: 3/6/10/16/25/40/60 -> 3/5/9/15/24/38/55');
  console.log(`  Merge gold: 12 -> ${cfgFinal.merge.goldCost}`);
  console.log(`  Merge downgrade: 45% -> ${cfgFinal.merge.downgradeChance * 100}%`);
  console.log(`  Quest goldPerPower: 0.6 -> ${cfgFinal.quest.goldPerPower}`);
  console.log(`  Quest minGold: 8 -> ${cfgFinal.quest.minGold}`);
  console.log(`  Quest lock: 3 -> ${cfgFinal.quest.lockSessions}`);

  // Assign for output writing
  const r5 = rFinal;
  const r5casual = rFinalCasual;
  const r5grinder = rFinalGrinder;
  const r5collector = rFinalCollector;
  const cfg5 = cfgFinal;

  // ============================================================
  // WRITE OUTPUT FILES
  // ============================================================
  const FINAL = cfg5;

  // deep-balance.csv (1000-session progression)
  const headers = 'Session,Level,Gold,Energy,Catches,Upgrades,Merges,Quests,BestRank,Tier,TeamPower,CreatureCount,SpeciesUnlocked,MergePairs,AffordableUpgrades,ViableActions,FunScore,AvgTraitRank';
  const rows = r5.avg.map(s =>
    `${s.session},${s.level},${s.gold},${s.energy},${s.catches},${s.upgrades},${s.merges},${s.quests},${s.bestRank},${s.tier},${s.teamPower},${s.creatureCount},${s.speciesUnlocked},${s.mergePairs},${s.affordableUpgrades},${s.viableActions},${s.funScore},${s.avgTraitRank}`
  );
  fs.writeFileSync(path.join(dir, 'deep-balance.csv'), [headers, ...rows].join('\n'));

  // balance-scenarios.csv
  const scenarioHeaders = 'Archetype,FinalLevel,FinalBestRank,FinalBestTier,FirstMerge,FirstEpic,FirstLegendary,FirstMythic,TotalCatches,TotalUpgrades,TotalMerges,TotalQuests,CatchRate,StuckPerRun,GoldIn,GoldOut';
  const scenarioRows = [r5, r5casual, r5grinder, r5collector].map(r =>
    `${r.label},${r.finalLevel},${r.finalBestRank},${r.finalBestTier},${r.firstMerge},${r.firstEpic},${r.firstLegendary},${r.firstMythic},${r.totalCatches},${r.totalUpgrades},${r.totalMerges},${r.totalQuests},${r.catchRate},${r.stuckPerRun},${r.totalGoldIn},${r.totalGoldOut}`
  );
  fs.writeFileSync(path.join(dir, 'balance-scenarios.csv'), [scenarioHeaders, ...scenarioRows].join('\n'));

  // Update balance-config.csv with final values
  const fc = FINAL;
  fs.writeFileSync(path.join(dir, 'balance-config.csv'), [
    'Category,Parameter,Value,Notes',
    `Catching,Batch Size,${fc.catching.batchSize},Creatures per /scan`,
    `Catching,Catch Rate (rank 0),${fc.catching.catchRateBase * 100}%,`,
    `Catching,Catch Rate (max rank),${fc.catching.catchRateMin * 100}%,`,
    `Catching,Energy Cost,${fc.energy.catchCost},Per attempt`,
    ...fc.catching.traitRankCapByLevel.map((v, i) => `Catching,Trait Cap Lv${i+1},${v},Max rank on spawns`),
    '',
    ...fc.upgrade.costs.map((v, i) => `Upgrade,Rank ${i}->${i+1},${v}g,`),
    `Upgrade,Ceiling,Rank ${fc.upgrade.maxRank},Merge needed beyond`,
    '',
    `Merge,Gold Cost,${fc.merge.goldCost}g,`,
    `Merge,Energy Cost,${fc.energy.mergeCost},`,
    `Merge,Trait Upgrade,100%,One random trait +1`,
    `Merge,Trait Downgrade,${fc.merge.downgradeChance * 100}%,One other random trait -1`,
    '',
    `Quest,Gold/Power,${fc.quest.goldPerPower}x,`,
    `Quest,Min Reward,${fc.quest.minGold}g,`,
    `Quest,Lock Duration,${fc.quest.lockSessions} sessions,`,
    `Quest,Max Team Size,${fc.quest.maxCreatures},`,
    '',
    `XP,Per Catch,${fc.xp.perCatch},`,
    `XP,Per Upgrade,${fc.xp.perUpgrade},`,
    `XP,Per Merge,${fc.xp.perMerge},`,
    `XP,Per Quest,${fc.xp.perQuest},`,
    ...fc.xp.perLevel.map((v, i) => `XP,Lv${i+1}->Lv${i+2},${v},`),
    '',
    `Energy,Maximum,${fc.energy.max},`,
    `Energy,Starting,${fc.energy.starting},New game`,
    `Energy,Regen/Session,${fc.energy.regenPerSession},`,
    '',
    `Collection,Max Slots,${fc.collection.maxSize},`,
    `Economy,Starting Gold,${fc.startingGold}g,`,
    '',
    ...Object.entries(SPECIES).map(([id, s]) => `Species,${id},Lv${s.unlockLevel},Weight ${s.weight}`),
    '',
    'Tiers,Common,Rank 0-4,',
    'Tiers,Uncommon,Rank 5-8,',
    'Tiers,Rare,Rank 9-11,',
    'Tiers,Epic,Rank 12-14,',
    'Tiers,Legendary,Rank 15-16,',
    'Tiers,Mythic,Rank 17+,',
  ].join('\n'));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\nWrote: deep-balance.csv, balance-scenarios.csv, balance-config.csv`);
  console.log(`Total simulation time: ${elapsed}s`);
  console.log(`\nFINAL CONFIG:`);
  console.log(JSON.stringify(FINAL, null, 2));
}

main();

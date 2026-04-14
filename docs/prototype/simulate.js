#!/usr/bin/env node
/**
 * Compi Balance Simulator v4 - FINAL
 *
 * Models a realistic play pattern:
 * - A "session" = one /scan interaction (a few minutes during a coding break)
 * - Player gets 3 creatures per scan, tries to catch them
 * - Between scans, player can upgrade/merge/quest
 * - Energy regenerates between sessions (time-based)
 * - ~8-15 sessions per coding day, ~300 sessions over a few weeks
 */

const fs = require('fs');
const path = require('path');

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

// Default config
function C(o = {}) {
  const b = {
    energy: { max: 20, starting: 20, regenPerSession: 2, catchCost: 1, mergeCost: 2 },
    catching: {
      batchSize: 3,
      catchRateBase: 1.0,
      catchRateMin: 0.50,
      traitRankCapByLevel: [2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8],
    },
    upgrade: { maxRank: 7, costs: [5, 8, 12, 20, 32, 50, 75] },
    merge: { goldCost: 15, downgradeChance: 0.55 },
    quest: { lockSessions: 3, goldPerPower: 0.5, minGold: 5, maxCreatures: 3 },
    xp: {
      perCatch: 15, perUpgrade: 10, perMerge: 30, perQuest: 20,
      perLevel: [50, 80, 120, 180, 250, 350, 500, 700, 1000, 1400, 2000, 2800, 4000],
    },
    collection: { maxSize: 12 },
    startingGold: 10,
    sim: { sessions: 300, runs: 300 },
  };
  function dm(t, s) {
    for (const k of Object.keys(s)) {
      if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) { if (!t[k]) t[k] = {}; dm(t[k], s[k]); }
      else t[k] = s[k];
    }
    return t;
  }
  return dm(b, o);
}

class Sim {
  constructor(c) {
    this.c = c;
    this.level = 1; this.xp = 0; this.gold = c.startingGold;
    this.energy = c.energy.starting;
    this.creatures = []; // { species, traits:{slot:rank}, quest:0 }
    this.st = { catches: 0, attempts: 0, upgrades: 0, merges: 0, quests: 0,
      goldIn: 0, goldOut: 0, eUsed: 0, best: 0, fm: -1, fe: -1, fl: -1, stuck: 0 };
    this.log = [];
  }

  maxR(sp, sl) { return SPECIES[sp].poolSizes[sl] - 1; }
  cap() { return this.c.catching.traitRankCapByLevel[Math.min(this.level - 1, this.c.catching.traitRankCapByLevel.length - 1)]; }
  avail() { return Object.entries(SPECIES).filter(([_, s]) => s.unlockLevel <= this.level); }

  spawn() {
    const av = this.avail();
    const tw = av.reduce((s, [_, v]) => s + v.weight, 0);
    let r = Math.random() * tw, sp = av[0][0];
    for (const [id, v] of av) { r -= v.weight; if (r <= 0) { sp = id; break; } }
    const cap = this.cap(), spec = SPECIES[sp], tr = {};
    for (const sl of spec.slots) {
      const mx = Math.min(cap, this.maxR(sp, sl));
      // Triangular distribution skewed low
      tr[sl] = Math.floor(Math.random() * Math.random() * (mx + 1));
    }
    return { species: sp, traits: tr, quest: 0 };
  }

  crate(cr) {
    const sp = SPECIES[cr.species]; let t = 0, n = 0;
    for (const sl of sp.slots) {
      const mx = this.maxR(cr.species, sl);
      t += mx > 0 ? 1.0 - (cr.traits[sl] / mx) * 0.5 : 1.0;
      n++;
    }
    return t / n;
  }

  power(cr) { return Object.values(cr.traits).reduce((s, r) => s + r + 1, 0); }
  tpower() { return this.creatures.reduce((s, c) => s + this.power(c), 0); }
  upBest(cr) { for (const r of Object.values(cr.traits)) if (r > this.st.best) this.st.best = r; }

  addXP(n) {
    this.xp += n;
    while (true) {
      const th = this.c.xp.perLevel[Math.min(this.level - 1, this.c.xp.perLevel.length - 1)];
      if (this.xp >= th) { this.xp -= th; this.level++; } else break;
    }
  }

  // --- Actions ---
  doCatch() {
    if (this.energy < this.c.energy.catchCost || this.creatures.length >= this.c.collection.maxSize) return false;
    const cr = this.spawn();
    this.energy -= this.c.energy.catchCost;
    this.st.eUsed++; this.st.attempts++;
    if (Math.random() < this.crate(cr)) {
      this.creatures.push(cr); this.st.catches++; this.addXP(this.c.xp.perCatch); this.upBest(cr);
      return true;
    }
    return false; // fled but still cost energy
  }

  findUpgrade() {
    let best = null;
    for (let i = 0; i < this.creatures.length; i++) {
      const cr = this.creatures[i]; if (cr.quest > 0) continue;
      for (const sl of SPECIES[cr.species].slots) {
        const rk = cr.traits[sl];
        if (rk >= this.c.upgrade.maxRank || rk >= this.c.upgrade.costs.length) continue;
        const cost = this.c.upgrade.costs[rk];
        if (cost > this.gold) continue;
        const pri = this.power(cr) * 100 + rk;
        if (!best || pri > best.pri) best = { i, sl, cost, pri };
      }
    }
    return best;
  }

  doUpgrade(t) {
    this.creatures[t.i].traits[t.sl]++;
    this.gold -= t.cost; this.st.goldOut += t.cost; this.st.upgrades++;
    this.addXP(this.c.xp.perUpgrade); this.upBest(this.creatures[t.i]);
  }

  findMerge() {
    const av = this.creatures.map((c, i) => ({ ...c, i })).filter(c => c.quest <= 0);
    const by = {};
    for (const c of av) { if (!by[c.species]) by[c.species] = []; by[c.species].push(c); }
    let best = null, bestN = 0;
    for (const [sp, list] of Object.entries(by)) {
      if (list.length >= 2 && list.length > bestN) {
        list.sort((a, b) => this.power(a) - this.power(b));
        best = [list[0].i, list[1].i]; bestN = list.length;
      }
    }
    return best;
  }

  doMerge(i1, i2) {
    const mc = this.c.merge.goldCost, ec = this.c.energy.mergeCost || 0;
    if (this.gold < mc || this.energy < ec) return false;
    const c1 = this.creatures[i1], c2 = this.creatures[i2];
    const sp = SPECIES[c1.species], tr = {};
    for (const sl of sp.slots) tr[sl] = Math.max(c1.traits[sl], c2.traits[sl]);
    // +1 random trait
    const slots = [...sp.slots];
    const up = slots[Math.floor(Math.random() * slots.length)];
    if (tr[up] < this.maxR(c1.species, up)) tr[up]++;
    // downgrade chance
    if (Math.random() < this.c.merge.downgradeChance) {
      const oth = slots.filter(s => s !== up);
      if (oth.length) { const d = oth[Math.floor(Math.random() * oth.length)]; if (tr[d] > 0) tr[d]--; }
    }
    const child = { species: c1.species, traits: tr, quest: 0 };
    const [lo, hi] = i1 < i2 ? [i1, i2] : [i2, i1];
    this.creatures.splice(hi, 1); this.creatures.splice(lo, 1);
    this.creatures.push(child);
    this.gold -= mc; this.energy -= ec;
    this.st.goldOut += mc; this.st.eUsed += ec; this.st.merges++;
    this.addXP(this.c.xp.perMerge); this.upBest(child);
    return true;
  }

  doQuest() {
    const av = this.creatures.filter(c => c.quest <= 0);
    if (!av.length) return false;
    av.sort((a, b) => this.power(b) - this.power(a));
    const send = av.slice(0, this.c.quest.maxCreatures);
    let tp = 0;
    for (const c of send) { c.quest = this.c.quest.lockSessions; tp += this.power(c); }
    const rew = Math.max(this.c.quest.minGold, Math.floor(tp * this.c.quest.goldPerPower));
    this.gold += rew; this.st.goldIn += rew; this.st.quests++;
    this.addXP(this.c.xp.perQuest);
    return true;
  }

  session(n) {
    // Regen energy
    this.energy = Math.min(this.c.energy.max, this.energy + this.c.energy.regenPerSession);
    // Tick quests
    for (const c of this.creatures) if (c.quest > 0) c.quest--;

    let did = false;

    // 1. Catch batch
    for (let i = 0; i < this.c.catching.batchSize; i++) {
      if (this.energy >= this.c.energy.catchCost && this.creatures.length < this.c.collection.maxSize) {
        this.doCatch(); did = true;
      }
    }

    // 2. Merge all available pairs (if gold allows)
    for (let i = 0; i < 5; i++) { // max 5 merges per session
      const pair = this.findMerge();
      if (!pair) break;
      if (!this.doMerge(pair[0], pair[1])) break;
      if (this.st.fm < 0) this.st.fm = n;
      did = true;
    }

    // 3. Upgrade (max 2 per session)
    for (let i = 0; i < 2; i++) {
      const up = this.findUpgrade();
      if (!up) break;
      this.doUpgrade(up); did = true;
    }

    // 4. Quest if gold < threshold
    if (this.gold < 40 && this.creatures.filter(c => c.quest <= 0).length > 0) {
      this.doQuest(); did = true;
    }

    if (!did) this.st.stuck++;

    if (this.st.best >= 12 && this.st.fe < 0) this.st.fe = n;
    if (this.st.best >= 15 && this.st.fl < 0) this.st.fl = n;

    const pairs = (() => {
      const av = this.creatures.filter(c => c.quest <= 0), by = {};
      for (const c of av) by[c.species] = (by[c.species] || 0) + 1;
      return Object.values(by).reduce((s, n) => s + Math.floor(n / 2), 0);
    })();

    this.log.push({
      s: n, lv: this.level, xp: this.xp, g: this.gold, e: this.energy,
      c: this.st.catches, u: this.st.upgrades, m: this.st.merges, q: this.st.quests,
      br: this.st.best, tp: this.tpower(), cc: this.creatures.length,
      su: this.avail().length, pr: pairs,
    });
  }

  run() {
    for (let s = 1; s <= this.c.sim.sessions; s++) this.session(s);
    return this;
  }
}

// Monte Carlo
function MC(cfg, label) {
  const { runs, sessions: ns } = cfg.sim;
  const keys = ['lv','xp','g','e','c','u','m','q','br','tp','cc','su','pr'];
  const acc = Array.from({ length: ns }, () => { const o = {}; for (const k of keys) o[k] = 0; return o; });
  const g = { fm: 0, fmc: 0, fe: 0, fec: 0, fl: 0, flc: 0, lv: 0, br: 0, gi: 0, go: 0, c: 0, u: 0, m: 0, q: 0, ss: 0, at: 0 };

  for (let r = 0; r < runs; r++) {
    const sim = new Sim(cfg).run();
    for (let i = 0; i < ns; i++) for (const k of keys) acc[i][k] += sim.log[i][k] || 0;
    const s = sim.st;
    if (s.fm >= 0) { g.fm += s.fm; g.fmc++; }
    if (s.fe >= 0) { g.fe += s.fe; g.fec++; }
    if (s.fl >= 0) { g.fl += s.fl; g.flc++; }
    g.lv += sim.level; g.br += s.best; g.gi += s.goldIn; g.go += s.goldOut;
    g.c += s.catches; g.u += s.upgrades; g.m += s.merges; g.q += s.quests;
    g.ss += s.stuck; g.at += s.attempts;
  }

  const avg = acc.map((a, i) => {
    const o = { session: i + 1 };
    for (const k of keys) o[k] = +(a[k] / runs).toFixed(1);
    o.tier = getTierLabel(Math.round(a.br / runs));
    return o;
  });

  const a = v => v / runs;
  return {
    avg, label,
    fm: g.fmc > 0 ? (g.fm / g.fmc).toFixed(1) : 'never', fmr: g.fmc + '/' + runs,
    fe: g.fec > 0 ? (g.fe / g.fec).toFixed(1) : 'never', fer: g.fec + '/' + runs,
    fl: g.flc > 0 ? (g.fl / g.flc).toFixed(1) : 'never', flr: g.flc + '/' + runs,
    lv: a(g.lv).toFixed(1), br: a(g.br).toFixed(1), bt: getTierLabel(Math.round(a(g.br))),
    gi: Math.round(a(g.gi)), go: Math.round(a(g.go)),
    c: Math.round(a(g.c)), u: Math.round(a(g.u)), m: Math.round(a(g.m)), q: Math.round(a(g.q)),
    cpm: g.m > 0 ? (g.c / g.m).toFixed(1) : '-',
    cr: g.at > 0 ? ((g.c / g.at) * 100).toFixed(0) + '%' : '-',
    ss: a(g.ss).toFixed(1),
  };
}

function show(r) {
  console.log(`\n=== ${r.label} ===`);
  console.log(`  Level: ${r.lv} | Best rank: ${r.br} (${r.bt})`);
  console.log(`  Merge@~${r.fm} (${r.fmr}) | Epic@~${r.fe} (${r.fer}) | Legend@~${r.fl} (${r.flr})`);
  console.log(`  C:${r.c} (${r.cr}) U:${r.u} M:${r.m} Q:${r.q} | C/M:${r.cpm} | Gold +${r.gi}/-${r.go} | Stuck:${r.ss}`);
}

function table(avg) {
  const ms = [1, 2, 3, 5, 8, 10, 15, 20, 30, 50, 75, 100, 125, 150, 200, 250, 300];
  console.log('  Sess| Lv| Gold| Enrg| Ctch| Upgr| Merg| Qst| Rank| Tier      | TmPw| Crtr| Spec| Pair');
  console.log('  ' + '-'.repeat(98));
  for (const n of ms) {
    if (n > avg.length) break;
    const s = avg[n - 1];
    const pad = (v, w) => String(v).padStart(w);
    console.log(`  ${pad(n,4)}|${pad(s.lv,3)}|${pad(s.g,5)}|${pad(s.e,5)}|${pad(s.c,5)}|${pad(s.u,5)}|${pad(s.m,5)}|${pad(s.q,4)}|${pad(s.br,5)}| ${s.tier.padEnd(9)}|${pad(s.tp,5)}|${pad(s.cc,5)}|${pad(s.su,5)}|${pad(s.pr,5)}`);
  }
}

console.log('======================================');
console.log('COMPI BALANCE SIMULATOR v4');
console.log('======================================');

// ========== ITERATION 1 ==========
console.log('\n--- IT1: Baseline ---');
const r1 = MC(C(), 'IT1 Baseline');
show(r1); table(r1.avg);

// ========== ITERATION 2 ==========
console.log('\n--- IT2: Fix economy ---');
const r2 = MC(C({
  energy: { max: 20, starting: 20, regenPerSession: 3, catchCost: 1, mergeCost: 1 },
  upgrade: { costs: [3, 5, 8, 14, 22, 35, 55], maxRank: 7 },
  merge: { goldCost: 10, downgradeChance: 0.45 },
  quest: { goldPerPower: 0.6, minGold: 8, lockSessions: 2 },
  xp: {
    perCatch: 10, perUpgrade: 8, perMerge: 25, perQuest: 15,
    perLevel: [40, 60, 100, 150, 220, 300, 420, 580, 800, 1100, 1500, 2100, 3000],
  },
  catching: { traitRankCapByLevel: [1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8] },
  startingGold: 10,
}), 'IT2 Economy');
show(r2); table(r2.avg);

// ========== ITERATION 3 ==========
console.log('\n--- IT3: Tune milestones ---');
const r3 = MC(C({
  energy: { max: 20, starting: 20, regenPerSession: 3, catchCost: 1, mergeCost: 1 },
  upgrade: { costs: [3, 5, 10, 16, 25, 40, 60], maxRank: 7 },
  merge: { goldCost: 12, downgradeChance: 0.45 },
  quest: { goldPerPower: 0.6, minGold: 8, lockSessions: 3 },
  xp: {
    perCatch: 10, perUpgrade: 8, perMerge: 25, perQuest: 15,
    perLevel: [30, 50, 80, 120, 170, 240, 340, 480, 680, 960, 1350, 1900, 2700],
  },
  catching: { batchSize: 3, traitRankCapByLevel: [1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8] },
  startingGold: 10,
  collection: { maxSize: 12 },
}), 'IT3 Milestones');
show(r3); table(r3.avg);

// ========== ITERATION 4: FINAL ==========
console.log('\n--- IT4: FINAL ---');
const FINAL = C({
  energy: { max: 20, starting: 20, regenPerSession: 3, catchCost: 1, mergeCost: 1 },
  upgrade: { costs: [3, 6, 10, 16, 25, 40, 60], maxRank: 7 },
  merge: { goldCost: 12, downgradeChance: 0.45 },
  quest: { goldPerPower: 0.6, minGold: 8, lockSessions: 3, maxCreatures: 3 },
  xp: {
    perCatch: 10, perUpgrade: 8, perMerge: 25, perQuest: 15,
    perLevel: [30, 50, 80, 120, 170, 240, 340, 480, 680, 960, 1350, 1900, 2700],
  },
  catching: { batchSize: 3, traitRankCapByLevel: [1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8] },
  startingGold: 10,
  collection: { maxSize: 12 },
});
const r4 = MC(FINAL, 'IT4 FINAL');
show(r4); table(r4.avg);

// ============================================================
// WRITE OUTPUT FILES
// ============================================================
const dir = path.dirname(process.argv[1] || __filename);

// balance.csv
const hdr = 'Session,Level,XP,Gold,Energy,CatchesTotal,UpgradesTotal,MergesTotal,QuestsTotal,BestRankAchieved,BestTier,TeamPower,CreatureCount,SpeciesUnlocked';
fs.writeFileSync(path.join(dir, 'balance.csv'),
  [hdr, ...r4.avg.map(s => `${s.session},${s.lv},${s.xp},${s.g},${s.e},${s.c},${s.u},${s.m},${s.q},${s.br},${s.tier},${s.tp},${s.cc},${s.su}`)].join('\n')
);

// balance-config.csv
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

console.log('\nWrote balance.csv and balance-config.csv');

// ============================================================
// SUMMARY
// ============================================================
console.log(`
======================================
BALANCE SUMMARY
======================================

CONFIGURATION:
  Collection: ${fc.collection.maxSize} slots
  Energy: ${fc.energy.max} max, +${fc.energy.regenPerSession}/session, catch=${fc.energy.catchCost}, merge=${fc.energy.mergeCost}
  Batch: ${fc.catching.batchSize} creatures per scan
  Upgrade costs: ${fc.upgrade.costs.join(', ')} (ceiling: rank ${fc.upgrade.maxRank})
  Merge: ${fc.merge.goldCost}g, ${fc.merge.downgradeChance * 100}% downgrade
  Quest: ${fc.quest.goldPerPower}x power, min ${fc.quest.minGold}g, ${fc.quest.lockSessions}-session lock
  XP: catch=${fc.xp.perCatch}, upgrade=${fc.xp.perUpgrade}, merge=${fc.xp.perMerge}, quest=${fc.xp.perQuest}

RESULTS (${fc.sim.sessions} sessions, ${fc.sim.runs} runs):
  First merge:      session ~${r4.fm}
  First epic:       session ~${r4.fe} (${r4.fer})
  First legendary:  session ~${r4.fl} (${r4.flr})
  Final level:      ${r4.lv}
  Final best rank:  ${r4.br} (${r4.bt})
  Catch rate:       ${r4.cr}
  Catches/merge:    ${r4.cpm}
  Stuck sessions:   ${r4.ss}
`);

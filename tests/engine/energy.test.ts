import { calculateEnergyCost, processEnergyGain, spendEnergy, canAfford } from "../../src/engine/energy";
import { GameState, CreatureTrait } from "../../src/types";

function makeTraits(rarities: string[]): CreatureTrait[] {
  return rarities.map((r, i) => ({
    slotId: ["eyes", "mouth", "tail", "gills", "pattern", "aura"][i] as any,
    traitId: `test_${r}_${i}`,
    rarity: r as any,
    mergeModifier: { type: "stable" as const, value: 0.05 },
  }));
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 2,
    profile: { level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: "" },
    collection: [],
    energy: 10,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    recentTicks: [],
    claimedMilestones: [],
    settings: { renderer: "simple", notificationLevel: "moderate" },
    ...overrides,
  };
}

describe("calculateEnergyCost", () => {
  test("all common = 1 energy", () => {
    const traits = makeTraits(["common", "common", "common", "common", "common", "common"]);
    expect(calculateEnergyCost(traits)).toBe(1);
  });

  test("4 common + 2 uncommon = 3 energy", () => {
    const traits = makeTraits(["common", "common", "common", "common", "uncommon", "uncommon"]);
    expect(calculateEnergyCost(traits)).toBe(3);
  });

  test("6 void = 43 energy", () => {
    const traits = makeTraits(["void", "void", "void", "void", "void", "void"]);
    expect(calculateEnergyCost(traits)).toBe(43);
  });

  test("mixed traits", () => {
    const traits = makeTraits(["common", "common", "uncommon", "uncommon", "rare", "epic"]);
    expect(calculateEnergyCost(traits)).toBe(8); // 0+0+1+1+2+3=7, +1=8
  });
});

describe("processEnergyGain", () => {
  test("gains 1 energy when 30 min have passed", () => {
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
    const state = makeState({ energy: 5, lastEnergyGainAt: thirtyMinAgo });
    const gained = processEnergyGain(state, Date.now());
    expect(gained).toBe(1);
    expect(state.energy).toBe(6);
  });

  test("gains multiple energy for multiple intervals", () => {
    const twoHoursAgo = Date.now() - 120 * 60 * 1000;
    const state = makeState({ energy: 5, lastEnergyGainAt: twoHoursAgo });
    const gained = processEnergyGain(state, Date.now());
    expect(gained).toBe(4);
    expect(state.energy).toBe(9);
  });

  test("caps at max energy (30)", () => {
    const twoHoursAgo = Date.now() - 120 * 60 * 1000;
    const state = makeState({ energy: 28, lastEnergyGainAt: twoHoursAgo });
    const gained = processEnergyGain(state, Date.now());
    expect(state.energy).toBe(30);
    expect(gained).toBe(2);
  });

  test("no gain if interval not reached", () => {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const state = makeState({ energy: 5, lastEnergyGainAt: fiveMinAgo });
    const gained = processEnergyGain(state, Date.now());
    expect(gained).toBe(0);
    expect(state.energy).toBe(5);
  });
});

describe("spendEnergy", () => {
  test("deducts energy from state", () => {
    const state = makeState({ energy: 10 });
    spendEnergy(state, 3);
    expect(state.energy).toBe(7);
  });

  test("throws if insufficient energy", () => {
    const state = makeState({ energy: 2 });
    expect(() => spendEnergy(state, 5)).toThrow();
  });
});

describe("canAfford", () => {
  test("returns true when enough energy", () => {
    expect(canAfford(10, 5)).toBe(true);
  });

  test("returns false when not enough", () => {
    expect(canAfford(2, 5)).toBe(false);
  });
});

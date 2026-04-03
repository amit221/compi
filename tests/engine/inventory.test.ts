import { processPassiveDrip, processSessionReward, checkMilestones } from "../../src/engine/inventory";
import { GameState } from "../../src/types";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    profile: {
      level: 1, xp: 0, totalCatches: 0, totalTicks: 0,
      currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-04-01",
    },
    collection: [],
    inventory: { bytetrap: 5 },
    nearby: [],
    recentTicks: [],
    claimedMilestones: [],
    settings: { renderer: "simple", notificationLevel: "moderate" },
    ...overrides,
  };
}

describe("processPassiveDrip", () => {
  test("awards items at drip interval", () => {
    const state = makeState();
    state.profile.totalTicks = 25;
    const items = processPassiveDrip(state, () => 0.1);
    expect(items.length).toBeGreaterThan(0);
    expect(state.inventory["bytetrap"]).toBeGreaterThan(5);
  });

  test("does not award at non-interval ticks", () => {
    const state = makeState();
    state.profile.totalTicks = 13;
    const items = processPassiveDrip(state, () => 0.1);
    expect(items).toHaveLength(0);
  });
});

describe("processSessionReward", () => {
  test("awards items", () => {
    const state = makeState();
    const items = processSessionReward(state, () => 0.1);
    expect(items.length).toBeGreaterThan(0);
  });
});

describe("checkMilestones", () => {
  test("awards milestone on first catch", () => {
    const state = makeState();
    state.profile.totalCatches = 1;
    const reached: string[] = [];
    const items = checkMilestones(state, reached);
    expect(items.length).toBeGreaterThan(0);
    expect(reached).toContain("first_catch");
  });

  test("does not re-award already claimed milestone", () => {
    const state = makeState();
    state.profile.totalCatches = 1;
    const reached = ["first_catch"];
    const items = checkMilestones(state, reached);
    expect(items).toHaveLength(0);
  });

  test("awards streak milestone", () => {
    const state = makeState();
    state.profile.currentStreak = 3;
    const reached: string[] = [];
    const items = checkMilestones(state, reached);
    expect(reached).toContain("streak_3");
  });
});

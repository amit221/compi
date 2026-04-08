import { processNewTick, getTimeOfDay, deriveStreak } from "../../src/engine/ticks";
import { GameState, Tick } from "../../src/types";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 4,
    profile: {
      level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0,
      currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-04-01",
    },
    collection: [],
    archive: [],
    energy: 5,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
    ...overrides,
  };
}

describe("getTimeOfDay", () => {
  test("returns morning for 6-11", () => {
    expect(getTimeOfDay(8)).toBe("morning");
  });
  test("returns afternoon for 12-16", () => {
    expect(getTimeOfDay(14)).toBe("afternoon");
  });
  test("returns evening for 17-20", () => {
    expect(getTimeOfDay(19)).toBe("evening");
  });
  test("returns night for 21-5", () => {
    expect(getTimeOfDay(23)).toBe("night");
    expect(getTimeOfDay(3)).toBe("night");
  });
});

describe("deriveStreak", () => {
  test("continues streak if last active was yesterday", () => {
    const result = deriveStreak("2026-04-02", "2026-04-03", 5);
    expect(result).toBe(6);
  });
  test("keeps streak if last active is today", () => {
    const result = deriveStreak("2026-04-03", "2026-04-03", 5);
    expect(result).toBe(5);
  });
  test("resets streak if gap > 1 day", () => {
    const result = deriveStreak("2026-04-01", "2026-04-03", 5);
    expect(result).toBe(1);
  });
  test("starts streak at 1 for first activity", () => {
    const result = deriveStreak("2026-04-03", "2026-04-03", 0);
    expect(result).toBe(1);
  });
});

describe("processNewTick", () => {
  test("increments totalTicks", () => {
    const state = makeState();
    const tick: Tick = { timestamp: Date.now() };
    processNewTick(state, tick);
    expect(state.profile.totalTicks).toBe(1);
  });

  test("adds tick to recentTicks", () => {
    const state = makeState();
    const tick: Tick = { timestamp: Date.now() };
    processNewTick(state, tick);
    expect(state.recentTicks).toHaveLength(1);
    expect(state.recentTicks[0].timestamp).toBe(tick.timestamp);
  });

  test("prunes recentTicks beyond limit", () => {
    const ticks: Tick[] = Array.from({ length: 500 }, (_, i) => ({
      timestamp: 1000 + i,
    }));
    const state = makeState({ recentTicks: ticks });
    processNewTick(state, { timestamp: 9999 });
    expect(state.recentTicks.length).toBeLessThanOrEqual(500);
    expect(state.recentTicks[state.recentTicks.length - 1].timestamp).toBe(9999);
  });

  test("updates lastActiveDate and streak", () => {
    const state = makeState();
    state.profile.lastActiveDate = "2026-04-02";
    state.profile.currentStreak = 3;
    const tick: Tick = { timestamp: new Date("2026-04-03T10:00:00").getTime() };
    processNewTick(state, tick);
    expect(state.profile.lastActiveDate).toBe("2026-04-03");
    expect(state.profile.currentStreak).toBe(4);
  });
});

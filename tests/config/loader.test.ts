import { loadConfig, formatMessage, buildMilestoneCondition } from "../../src/config/loader";
import { BalanceConfig } from "../../src/types";

describe("loadConfig", () => {
  let config: BalanceConfig;

  beforeAll(() => {
    config = loadConfig();
  });

  test("loads and returns a BalanceConfig object", () => {
    expect(config).toBeDefined();
    expect(config.spawning).toBeDefined();
    expect(config.catching).toBeDefined();
    expect(config.progression).toBeDefined();
    expect(config.rewards).toBeDefined();
    expect(config.creatures).toBeDefined();
    expect(config.items).toBeDefined();
    expect(config.messages).toBeDefined();
  });

  test("spawning section has correct values", () => {
    expect(config.spawning.ticksPerSpawnCheck).toBe(10);
    expect(config.spawning.spawnProbability).toBe(0.6);
    expect(config.spawning.maxNearby).toBe(10);
    expect(config.spawning.spawnWeights.common).toBe(0.45);
    expect(config.spawning.timeOfDay.morning).toEqual([6, 12]);
  });

  test("catching section has correct values", () => {
    expect(config.catching.maxCatchRate).toBe(1.0);
    expect(config.catching.bonusItemDropChance).toBe(0.1);
    expect(config.catching.bonusItemId).toBe("bytetrap");
    expect(config.catching.fragmentsPerCatch).toBe(1);
    expect(config.catching.xpPerCatch.legendary).toBe(250);
  });

  test("creatures array has 31 entries", () => {
    expect(config.creatures.length).toBe(31);
  });

  test("items array has 5 entries", () => {
    expect(config.items.length).toBe(5);
  });

  test("milestones have declarative conditions", () => {
    const firstCatch = config.rewards.milestones.find((m) => m.id === "first_catch");
    expect(firstCatch).toBeDefined();
    expect(firstCatch!.condition.type).toBe("totalCatches");
    expect(firstCatch!.condition.threshold).toBe(1);
  });

  test("messages sections exist", () => {
    expect(config.messages.scan).toBeDefined();
    expect(config.messages.catch).toBeDefined();
    expect(config.messages.notifications).toBeDefined();
    expect(config.messages.scan.empty).toBe("No signals detected — nothing nearby right now.");
  });

  test("returns cached instance on second call", () => {
    const config2 = loadConfig();
    expect(config2).toBe(config);
  });
});

describe("formatMessage", () => {
  test("replaces single placeholder", () => {
    expect(formatMessage("Hello {name}", { name: "World" })).toBe("Hello World");
  });

  test("replaces multiple placeholders", () => {
    expect(formatMessage("{a} and {b}", { a: "X", b: "Y" })).toBe("X and Y");
  });

  test("leaves unknown placeholders unchanged", () => {
    expect(formatMessage("Hello {name}", {})).toBe("Hello {name}");
  });

  test("handles numeric values", () => {
    expect(formatMessage("+{xp} XP", { xp: 50 })).toBe("+50 XP");
  });
});

describe("buildMilestoneCondition", () => {
  test("totalCatches condition", () => {
    const fn = buildMilestoneCondition({ type: "totalCatches", threshold: 10 });
    expect(fn({ totalCatches: 9, currentStreak: 0, totalTicks: 0 })).toBe(false);
    expect(fn({ totalCatches: 10, currentStreak: 0, totalTicks: 0 })).toBe(true);
    expect(fn({ totalCatches: 11, currentStreak: 0, totalTicks: 0 })).toBe(true);
  });

  test("currentStreak condition", () => {
    const fn = buildMilestoneCondition({ type: "currentStreak", threshold: 3 });
    expect(fn({ totalCatches: 0, currentStreak: 2, totalTicks: 0 })).toBe(false);
    expect(fn({ totalCatches: 0, currentStreak: 3, totalTicks: 0 })).toBe(true);
  });

  test("totalTicks condition", () => {
    const fn = buildMilestoneCondition({ type: "totalTicks", threshold: 500 });
    expect(fn({ totalCatches: 0, currentStreak: 0, totalTicks: 499 })).toBe(false);
    expect(fn({ totalCatches: 0, currentStreak: 0, totalTicks: 500 })).toBe(true);
  });
});

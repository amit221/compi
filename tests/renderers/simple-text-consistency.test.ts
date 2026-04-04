import { SimpleTextRenderer } from "../../src/renderers/simple-text";
import { StatusResult, EvolveResult, CreatureDefinition } from "../../src/types";

describe("SimpleTextRenderer consistency - status and evolve", () => {
  it("should display status with borders", () => {
    const renderer = new SimpleTextRenderer();
    const result: StatusResult = {
      profile: {
        level: 5,
        xp: 50,
        totalCatches: 10,
        totalTicks: 100,
        currentStreak: 3,
        longestStreak: 7,
        lastActiveDate: "2026-04-03",
      },
      collectionCount: 5,
      totalCreatures: 20,
      nearbyCount: 2,
    };

    const output = renderer.renderStatus(result);
    expect(output).toContain("+");
    expect(output).toContain("STATUS");
  });

  it("should display status with correct profile information", () => {
    const renderer = new SimpleTextRenderer();
    const result: StatusResult = {
      profile: {
        level: 5,
        xp: 50,
        totalCatches: 10,
        totalTicks: 100,
        currentStreak: 3,
        longestStreak: 7,
        lastActiveDate: "2026-04-03",
      },
      collectionCount: 5,
      totalCreatures: 20,
      nearbyCount: 2,
    };

    const output = renderer.renderStatus(result);
    expect(output).toContain("Level 5");
    expect(output).toContain("10");
    expect(output).toContain("5/20");
    expect(output).toContain("3");
    expect(output).toContain("7");
  });

  it("should display evolve result with borders", () => {
    const renderer = new SimpleTextRenderer();
    const creature1: CreatureDefinition = {
      id: "mousebyte",
      name: "Mousebyte",
      description: "A tiny mouse",
      rarity: "common",
      baseCatchRate: 0.8,
      art: { simple: ["⠰⡱⢀⠤⠤⡀⢎⠆"], rich: ["⠰⡱⢀⠤⠤⡀⢎⠆"] },
      spawnCondition: {},
    };
    const creature2: CreatureDefinition = {
      id: "circuitmouse",
      name: "Circuitmouse",
      description: "An evolved mouse",
      rarity: "common",
      baseCatchRate: 0,
      art: { simple: ["⠰⡱⢀⠤⠤⡀⢎⠆ evolved"], rich: ["⠰⡱⢀⠤⠤⡀⢎⠆ evolved"] },
      spawnCondition: {},
    };

    const result: EvolveResult = {
      success: true,
      from: creature1,
      to: creature2,
      fragmentsSpent: 5,
    };

    const output = renderer.renderEvolve(result);
    expect(output).toContain("->");
    expect(output).toContain("Circuitmouse");
  });

  it("should display evolve with creature art", () => {
    const renderer = new SimpleTextRenderer();
    const creature1: CreatureDefinition = {
      id: "buglet",
      name: "Buglet",
      description: "A caterpillar",
      rarity: "common",
      baseCatchRate: 0.8,
      art: { simple: ["⢀⠧⠧⡀"], rich: ["⢀⠧⠧⡀"] },
      spawnCondition: {},
    };
    const creature2: CreatureDefinition = {
      id: "malworm",
      name: "Malworm",
      description: "An evolved worm",
      rarity: "common",
      baseCatchRate: 0,
      art: { simple: ["⢀⠧⠧⡀ evolved"], rich: ["⢀⠧⠧⡀ evolved"] },
      spawnCondition: {},
    };

    const result: EvolveResult = {
      success: true,
      from: creature1,
      to: creature2,
      fragmentsSpent: 5,
    };

    const output = renderer.renderEvolve(result);
    expect(output).toContain("evolved"); // Check both name and description reference
    expect(output).toContain("⢀⠧⠧⡀"); // Check for art
  });

  it("should handle evolution with catalyst", () => {
    const renderer = new SimpleTextRenderer();
    const creature1: CreatureDefinition = {
      id: "glyphant",
      name: "Glyphant",
      description: "A mystic creature",
      rarity: "rare",
      baseCatchRate: 0.4,
      art: { simple: ["⠀⢀⠀"], rich: ["⠀⢀⠀"] },
      spawnCondition: {},
      evolution: { targetId: "mystant", fragmentCost: 10, catalystItemId: "prism" },
    };
    const creature2: CreatureDefinition = {
      id: "mystant",
      name: "Mystant",
      description: "A mystical being",
      rarity: "rare",
      baseCatchRate: 0,
      art: { simple: ["⠀⢀⠀ ✨"], rich: ["⠀⢀⠀ ✨"] },
      spawnCondition: {},
    };

    const result: EvolveResult = {
      success: true,
      from: creature1,
      to: creature2,
      fragmentsSpent: 10,
      catalystUsed: "Prism",
    };

    const output = renderer.renderEvolve(result);
    expect(output).toContain("Mystant");
    expect(output).toContain("Prism");
  });
});

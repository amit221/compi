// tests/renderers/simple-text-catch-effects.test.ts
import { SimpleTextRenderer } from "../../src/renderers/simple-text";
import { CatchResult, CreatureDefinition, ItemDefinition } from "../../src/types";

describe("SimpleTextRenderer catch effects", () => {
  const mockCreature: CreatureDefinition = {
    id: "test",
    name: "TestMonster",
    description: "A test creature",
    rarity: "common",
    baseCatchRate: 0.8,
    art: { simple: ["  test  "], rich: ["  test  "] },
    spawnCondition: {},
  };

  const mockItem: ItemDefinition = {
    id: "bytetrap",
    name: "ByteTrap",
    description: "Basic capture",
    type: "capture",
    catchMultiplier: 1.0,
  };

  it("should display success animation on catch", () => {
    const renderer = new SimpleTextRenderer();
    const result: CatchResult = {
      success: true,
      creature: mockCreature,
      itemUsed: mockItem,
      fragmentsEarned: 1,
      totalFragments: 1,
      xpEarned: 10,
      fled: false,
      evolutionReady: false,
    };

    const output = renderer.renderCatch(result);
    expect(output).toContain("***"); // Success indicator
    expect(output).toContain("CAUGHT!");
  });

  it("should display failure animation on escape", () => {
    const renderer = new SimpleTextRenderer();
    const result: CatchResult = {
      success: false,
      creature: mockCreature,
      itemUsed: mockItem,
      fragmentsEarned: 0,
      totalFragments: 0,
      xpEarned: 0,
      fled: false,
      evolutionReady: false,
    };

    const output = renderer.renderCatch(result);
    expect(output).toContain("X"); // Failure indicator
    expect(output).toContain("ESCAPED");
  });

  it("should display flee animation when creature flees", () => {
    const renderer = new SimpleTextRenderer();
    const result: CatchResult = {
      success: false,
      creature: mockCreature,
      itemUsed: mockItem,
      fragmentsEarned: 0,
      totalFragments: 0,
      xpEarned: 0,
      fled: true,
      evolutionReady: false,
    };

    const output = renderer.renderCatch(result);
    expect(output).toContain("*"); // Flee indicator
    expect(output).toContain("FLED!");
  });

  it("should show evolution ready indicator on success", () => {
    const renderer = new SimpleTextRenderer();
    const creature = { ...mockCreature, evolution: { targetId: "evolved", fragmentCost: 5 } };
    const result: CatchResult = {
      success: true,
      creature,
      itemUsed: mockItem,
      fragmentsEarned: 1,
      totalFragments: 5,
      xpEarned: 50,
      fled: false,
      evolutionReady: true,
    };

    const output = renderer.renderCatch(result);
    expect(output).toContain("[Ready to evolve!]");
  });

  it("should show bonus item when earned", () => {
    const renderer = new SimpleTextRenderer();
    const bonusItem: ItemDefinition = {
      id: "netsnare",
      name: "NetSnare",
      description: "Improved trap",
      type: "capture",
      catchMultiplier: 1.5,
    };
    const result: CatchResult = {
      success: true,
      creature: mockCreature,
      itemUsed: mockItem,
      fragmentsEarned: 1,
      totalFragments: 1,
      xpEarned: 10,
      bonusItem: { item: bonusItem, count: 1 },
      fled: false,
      evolutionReady: false,
    };

    const output = renderer.renderCatch(result);
    expect(output).toContain("Bonus:");
    expect(output).toContain("NetSnare");
  });
});

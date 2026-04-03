// tests/renderers/simple-text-inventory-summary.test.ts
import { SimpleTextRenderer } from "../../src/renderers/simple-text";
import { ScanResult, CreatureDefinition } from "../../src/types";

describe("SimpleTextRenderer scan inventory summary", () => {
  const mockCreature: CreatureDefinition = {
    id: "test",
    name: "TestMonster",
    description: "A test creature",
    rarity: "common",
    baseCatchRate: 0.8,
    art: { simple: ["  test  "], rich: ["  test  "] },
    spawnCondition: {},
  };

  it("should include total catch items count at top of scan", () => {
    const renderer = new SimpleTextRenderer();
    const scanResult: ScanResult = {
      nearby: [
        {
          index: 0,
          creature: mockCreature,
          spawnedAt: Date.now(),
          catchRate: 0.8,
          attemptsRemaining: 3,
        },
      ],
      totalCatchItems: 7,
    };
    const output = renderer.renderScan(scanResult);

    expect(output).toContain("Catch items: 7");
  });

  it("should show remaining attempts for each creature", () => {
    const renderer = new SimpleTextRenderer();
    const creature2: CreatureDefinition = { ...mockCreature, id: "test2", name: "TestMonster2" };
    const scanResult: ScanResult = {
      nearby: [
        {
          index: 0,
          creature: mockCreature,
          spawnedAt: Date.now(),
          catchRate: 0.8,
          attemptsRemaining: 3,
        },
        {
          index: 1,
          creature: creature2,
          spawnedAt: Date.now(),
          catchRate: 0.7,
          attemptsRemaining: 1,
        },
      ],
      totalCatchItems: 10,
    };
    const output = renderer.renderScan(scanResult);

    expect(output).toContain("Attempts: 3/3");
    expect(output).toContain("Attempts: 1/3");
  });
});

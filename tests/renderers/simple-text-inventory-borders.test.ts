// tests/renderers/simple-text-inventory-borders.test.ts
import { SimpleTextRenderer } from "../../src/renderers/simple-text";
import { ItemDefinition } from "../../src/types";

describe("SimpleTextRenderer inventory display", () => {
  it("should display inventory with borders and organization", () => {
    const renderer = new SimpleTextRenderer();
    const inventory = {
      bytetrap: 5,
      netsnare: 2,
      corelock: 0,
      shard: 1,
    };
    const items = new Map<string, ItemDefinition>([
      [
        "bytetrap",
        {
          id: "bytetrap",
          name: "ByteTrap",
          description: "Basic capture",
          type: "capture",
        },
      ],
      [
        "netsnare",
        {
          id: "netsnare",
          name: "NetSnare",
          description: "Improved trap",
          type: "capture",
        },
      ],
      [
        "corelock",
        {
          id: "corelock",
          name: "CoreLock",
          description: "Military-grade",
          type: "capture",
        },
      ],
      [
        "shard",
        {
          id: "shard",
          name: "Shard",
          description: "Evolution catalyst",
          type: "catalyst",
        },
      ],
    ]);

    const output = renderer.renderInventory(inventory, items);
    expect(output).toContain("INVENTORY");
    expect(output).toContain("-");
    expect(output).toContain("ByteTrap");
  });

  it("should separate capture devices and catalysts", () => {
    const renderer = new SimpleTextRenderer();
    const inventory = {
      bytetrap: 3,
      shard: 2,
    };
    const items = new Map<string, ItemDefinition>([
      [
        "bytetrap",
        {
          id: "bytetrap",
          name: "ByteTrap",
          description: "Basic capture",
          type: "capture",
        },
      ],
      [
        "shard",
        {
          id: "shard",
          name: "Shard",
          description: "Evolution catalyst",
          type: "catalyst",
        },
      ],
    ]);

    const output = renderer.renderInventory(inventory, items);
    expect(output).toContain("CAPTURE DEVICES");
    expect(output).toContain("EVOLUTION CATALYSTS");
    // Catalyst section should come after capture section
    const captureIndex = output.indexOf("CAPTURE DEVICES");
    const catalystIndex = output.indexOf("EVOLUTION CATALYSTS");
    expect(catalystIndex).toBeGreaterThan(captureIndex);
  });

  it("should use tree-style formatting for items", () => {
    const renderer = new SimpleTextRenderer();
    const inventory = {
      bytetrap: 5,
    };
    const items = new Map<string, ItemDefinition>([
      [
        "bytetrap",
        {
          id: "bytetrap",
          name: "ByteTrap",
          description: "Basic capture",
          type: "capture",
        },
      ],
    ]);

    const output = renderer.renderInventory(inventory, items);
    expect(output).toContain("+-"); // Tree-style branch
    expect(output).toContain("|"); // Tree-style line
  });

  it("should display correct item counts", () => {
    const renderer = new SimpleTextRenderer();
    const inventory = {
      bytetrap: 7,
      netsnare: 2,
      corelock: 0,
    };
    const items = new Map<string, ItemDefinition>([
      [
        "bytetrap",
        {
          id: "bytetrap",
          name: "ByteTrap",
          description: "Basic capture",
          type: "capture",
        },
      ],
      [
        "netsnare",
        {
          id: "netsnare",
          name: "NetSnare",
          description: "Improved trap",
          type: "capture",
        },
      ],
      [
        "corelock",
        {
          id: "corelock",
          name: "CoreLock",
          description: "Military-grade",
          type: "capture",
        },
      ],
    ]);

    const output = renderer.renderInventory(inventory, items);
    expect(output).toContain("ByteTrap x7");
    expect(output).toContain("NetSnare x2");
    expect(output).not.toContain("CoreLock"); // Count is 0, should not display
  });
});

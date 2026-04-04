// tests/renderers/simple-text-collection-art.test.ts
import { SimpleTextRenderer } from "../../src/renderers/simple-text";
import { CollectionEntry, CreatureDefinition } from "../../src/types";

describe("SimpleTextRenderer collection with art", () => {
  it("should display creature art in collection view", () => {
    const renderer = new SimpleTextRenderer();
    const creature: CreatureDefinition = {
      id: "mousebyte",
      name: "Mousebyte",
      description: "A tiny mouse",
      rarity: "common",
      baseCatchRate: 0.8,
      art: {
        simple: ["⠰⡱⢀⠤⠤⡀⢎⠆", "  ⡇⠂⣐⢸  ", "  ⢈⠖⠲⡁  "],
        rich: ["⠰⡱⢀⠤⠤⡀⢎⠆", "  ⡇⠂⣐⢸  ", "  ⢈⠖⠲⡁  "],
      },
      spawnCondition: {},
    };
    const collection: CollectionEntry[] = [
      {
        creatureId: "mousebyte",
        fragments: 3,
        totalCaught: 2,
        firstCaughtAt: Date.now(),
        evolved: false,
      },
    ];
    const creatures = new Map([["mousebyte", creature]]);

    const output = renderer.renderCollection(collection, creatures);

    expect(output).toContain("⠰⡱⢀⠤⠤⡀⢎⠆"); // Should have first line of art
    expect(output).toContain("Mousebyte");
  });

  it("should display evolved creature label", () => {
    const renderer = new SimpleTextRenderer();
    const creature: CreatureDefinition = {
      id: "circuitmouse",
      name: "Circuitmouse",
      description: "An evolved mouse",
      rarity: "common",
      baseCatchRate: 0,
      art: {
        simple: ["⠰⡱⢀⠤⠤⡀⢎⠆", "  ⡇⠂⣐⢸  "],
        rich: ["⠰⡱⢀⠤⠤⡀⢎⠆", "  ⡇⠂⣐⢸  "],
      },
      spawnCondition: {},
    };
    const collection: CollectionEntry[] = [
      {
        creatureId: "circuitmouse",
        fragments: 0,
        totalCaught: 1,
        firstCaughtAt: Date.now(),
        evolved: true,
      },
    ];
    const creatures = new Map([["circuitmouse", creature]]);

    const output = renderer.renderCollection(collection, creatures);

    expect(output).toContain("Circuitmouse");
    expect(output).toContain("[EVOLVED]");
  });

  it("should display evolution progress for non-evolved creatures", () => {
    const renderer = new SimpleTextRenderer();
    const creature: CreatureDefinition = {
      id: "buglet",
      name: "Buglet",
      description: "A caterpillar",
      rarity: "common",
      baseCatchRate: 0.8,
      art: {
        simple: ["⢀⠧⠧⡀    ", "⠘⠬⡬⡪⠤⡀  "],
        rich: ["⢀⠧⠧⡀    ", "⠘⠬⡬⡪⠤⡀  "],
      },
      spawnCondition: {},
      evolution: { targetId: "malworm", fragmentCost: 5 },
    };
    const collection: CollectionEntry[] = [
      {
        creatureId: "buglet",
        fragments: 3,
        totalCaught: 3,
        firstCaughtAt: Date.now(),
        evolved: false,
      },
    ];
    const creatures = new Map([["buglet", creature]]);

    const output = renderer.renderCollection(collection, creatures);

    expect(output).toContain("Frags: [");
    expect(output).toContain("3/5");
  });

  it("should display evolution ready indicator", () => {
    const renderer = new SimpleTextRenderer();
    const creature: CreatureDefinition = {
      id: "buglet",
      name: "Buglet",
      description: "A caterpillar",
      rarity: "common",
      baseCatchRate: 0.8,
      art: {
        simple: ["⢀⠧⠧⡀    "],
        rich: ["⢀⠧⠧⡀    "],
      },
      spawnCondition: {},
      evolution: { targetId: "malworm", fragmentCost: 5 },
    };
    const collection: CollectionEntry[] = [
      {
        creatureId: "buglet",
        fragments: 5,
        totalCaught: 5,
        firstCaughtAt: Date.now(),
        evolved: false,
      },
    ];
    const creatures = new Map([["buglet", creature]]);

    const output = renderer.renderCollection(collection, creatures);

    expect(output).toContain("Frags: [");
    expect(output).toContain("5/5");
    expect(output).toContain("Ready to evolve");
  });
});

import { SimpleTextRenderer } from "../../src/renderers/simple-text";
import { getCreatureMap } from "../../src/config/creatures";
import { getItemMap } from "../../src/config/items";

const renderer = new SimpleTextRenderer();
const creatures = getCreatureMap();
const items = getItemMap();

describe("SimpleTextRenderer", () => {
  test("renderScan shows nearby creatures with art and info", () => {
    const result = renderer.renderScan({
      nearby: [
        {
          index: 0,
          creature: creatures.get("glitchlet")!,
          spawnedAt: Date.now(),
          catchRate: 0.8,
        },
        {
          index: 1,
          creature: creatures.get("hexashade")!,
          spawnedAt: Date.now(),
          catchRate: 0.55,
        },
      ],
    });
    expect(result).toContain("Glitchlet");
    expect(result).toContain("Hexashade");
    expect(result).toContain("[1]");
    expect(result).toContain("[2]");
    expect(result).toContain("/catch");
  });

  test("renderScan shows empty message when nothing nearby", () => {
    const result = renderer.renderScan({ nearby: [] });
    expect(result).toContain("nothing");
  });

  test("renderCatch shows success", () => {
    const result = renderer.renderCatch({
      success: true,
      creature: creatures.get("glitchlet")!,
      itemUsed: items.get("bytetrap")!,
      fragmentsEarned: 1,
      totalFragments: 3,
      xpEarned: 10,
      fled: false,
      evolutionReady: false,
    });
    expect(result).toContain("Caught");
    expect(result).toContain("Glitchlet");
    expect(result).toContain("3");
  });

  test("renderCatch shows failure", () => {
    const result = renderer.renderCatch({
      success: false,
      creature: creatures.get("glitchlet")!,
      itemUsed: items.get("bytetrap")!,
      fragmentsEarned: 0,
      totalFragments: 0,
      xpEarned: 0,
      fled: false,
      evolutionReady: false,
    });
    expect(result).toContain("escaped");
  });

  test("renderCatch shows fled", () => {
    const result = renderer.renderCatch({
      success: false,
      creature: creatures.get("glitchlet")!,
      itemUsed: items.get("bytetrap")!,
      fragmentsEarned: 0,
      totalFragments: 0,
      xpEarned: 0,
      fled: true,
      evolutionReady: false,
    });
    expect(result).toContain("fled");
  });

  test("renderCollection shows creatures with fragment counts", () => {
    const result = renderer.renderCollection(
      [
        { creatureId: "glitchlet", fragments: 3, totalCaught: 5, firstCaughtAt: 1000, evolved: false },
      ],
      creatures
    );
    expect(result).toContain("Glitchlet");
    expect(result).toContain("3");
  });

  test("renderInventory shows items with counts", () => {
    const result = renderer.renderInventory({ bytetrap: 5, netsnare: 2 }, items);
    expect(result).toContain("ByteTrap");
    expect(result).toContain("5");
  });

  test("renderStatus shows profile info", () => {
    const result = renderer.renderStatus({
      profile: {
        level: 3, xp: 50, totalCatches: 15, totalTicks: 200,
        currentStreak: 5, longestStreak: 7, lastActiveDate: "2026-04-03",
      },
      collectionCount: 4,
      totalCreatures: 30,
      nearbyCount: 2,
    });
    expect(result).toContain("Level 3");
    expect(result).toContain("15");
    expect(result).toContain("5");
  });

  test("renderNotification returns one-line message", () => {
    const result = renderer.renderNotification({
      type: "spawn",
      message: "Something flickering nearby...",
    });
    expect(result).toContain("flickering");
    expect(result.split("\n").length).toBeLessThanOrEqual(2);
  });
});

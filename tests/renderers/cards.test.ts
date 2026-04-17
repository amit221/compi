import { SimpleTextRenderer } from "../../src/renderers/simple-text";
import { DrawResult, Card, CatchCardData, BreedCardData, PlayerProfile, SlotUpgradeInfo } from "../../src/types";

function makeProfile(): PlayerProfile {
  return { level: 4, xp: 287, totalCatches: 10, totalMerges: 2, totalTicks: 50, currentStreak: 3, longestStreak: 5, lastActiveDate: "2026-04-17" };
}

function makeCatchCard(id: string, name: string, speciesId: string): Card {
  return {
    id, type: "catch", label: `Catch ${name}`, energyCost: 2,
    data: {
      nearbyIndex: 0,
      creature: { id: `n-${id}`, speciesId, name, slots: [
        { slotId: "eyes", variantId: "eyes_default", color: "green", rarity: 2 },
        { slotId: "mouth", variantId: "mouth_default", color: "grey", rarity: 0 },
        { slotId: "body", variantId: "body_default", color: "cyan", rarity: 3 },
        { slotId: "tail", variantId: "tail_default", color: "grey", rarity: 0 },
      ], spawnedAt: Date.now() },
      catchRate: 0.78, energyCost: 2,
    } as CatchCardData,
  };
}

describe("card rendering", () => {
  const renderer = new SimpleTextRenderer();

  it("renderCardDraw shows cards with labels", () => {
    const draw: DrawResult = {
      cards: [makeCatchCard("1", "Flikk", "flikk"), makeCatchCard("2", "Pyrax", "pyrax")],
      empty: false, noEnergy: false,
    };
    const output = renderer.renderCardDraw(draw, 16, 30, makeProfile());
    expect(output).toContain("[A]");
    expect(output).toContain("[B]");
    expect(output).toContain("Flikk");
    expect(output).toContain("Pyrax");
    expect(output).toContain("78%");
    expect(output).toContain("Skip");
  });

  it("renderCardDraw shows empty state", () => {
    const draw: DrawResult = { cards: [], empty: true, noEnergy: false };
    const output = renderer.renderCardDraw(draw, 5, 30, makeProfile());
    expect(output).toContain("Nothing happening");
  });

  it("renderCardDraw shows no energy state", () => {
    const draw: DrawResult = { cards: [], empty: false, noEnergy: true };
    const output = renderer.renderCardDraw(draw, 0, 30, makeProfile());
    expect(output).toContain("energy");
  });
});

import { HtmlAppRenderer } from "../../src/renderers/html-app";
import {
  DrawResult,
  Card,
  CatchCardData,
  BreedCardData,
  PlayerProfile,
  PlayResult,
  CatchResult,
  BreedResult,
  CollectionCreature,
  SlotUpgradeInfo,
} from "../../src/types";

function makeProfile(): PlayerProfile {
  return {
    level: 4, xp: 287, totalCatches: 10, totalMerges: 2,
    totalTicks: 50, currentStreak: 3, longestStreak: 5, lastActiveDate: "2026-04-17",
  };
}

function makeCatchCard(id: string, name: string, speciesId: string): Card {
  return {
    id, type: "catch", label: `Catch ${name}`, energyCost: 2,
    data: {
      nearbyIndex: 0,
      creature: {
        id: `n-${id}`, speciesId, name,
        slots: [
          { slotId: "eyes", variantId: "eyes_default", color: "green", rarity: 2 },
          { slotId: "mouth", variantId: "mouth_default", color: "grey", rarity: 0 },
          { slotId: "body", variantId: "body_default", color: "cyan", rarity: 3 },
          { slotId: "tail", variantId: "tail_default", color: "grey", rarity: 0 },
        ],
        spawnedAt: Date.now(),
      },
      catchRate: 0.78,
      energyCost: 2,
    } as CatchCardData,
  };
}

function makeCollectionCreature(id: string, name: string, speciesId: string): CollectionCreature {
  return {
    id, speciesId, name,
    slots: [
      { slotId: "eyes", variantId: "eyes_default", color: "green", rarity: 2 },
      { slotId: "mouth", variantId: "mouth_default", color: "grey", rarity: 0 },
      { slotId: "body", variantId: "body_default", color: "cyan", rarity: 3 },
      { slotId: "tail", variantId: "tail_default", color: "grey", rarity: 0 },
    ],
    caughtAt: Date.now(),
    generation: 1,
    archived: false,
  };
}

function makeBreedCard(): Card {
  const parentA = makeCollectionCreature("p1", "Alpha", "compi");
  const parentB = makeCollectionCreature("p2", "Beta", "compi");
  const upgradeChances: SlotUpgradeInfo[] = [
    { slotId: "eyes", match: true, upgradeChance: 0.35 },
    { slotId: "mouth", match: false, upgradeChance: 0 },
    { slotId: "body", match: false, upgradeChance: 0 },
    { slotId: "tail", match: true, upgradeChance: 0.15 },
  ];
  return {
    id: "breed-1", type: "breed", label: "Breed Alpha + Beta", energyCost: 5,
    data: {
      parentA: { index: 0, creature: parentA },
      parentB: { index: 1, creature: parentB },
      upgradeChances,
      energyCost: 5,
    } as BreedCardData,
  };
}

describe("HtmlAppRenderer", () => {
  describe("renderCardDraw", () => {
    it("returns full HTML document with catch cards", () => {
      const renderer = new HtmlAppRenderer(null);
      const draw: DrawResult = {
        cards: [makeCatchCard("1", "Flikk", "flikk"), makeCatchCard("2", "Pyrax", "pyrax")],
        empty: false, noEnergy: false,
      };
      const html = renderer.renderCardDraw(draw, 16, 30, makeProfile());
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("status-hud");
      expect(html).toContain("game-card");
      expect(html).toContain("78%");
      expect(html).toContain("catch");
    });

    it("shows empty state when no creatures", () => {
      const renderer = new HtmlAppRenderer(null);
      const draw: DrawResult = { cards: [], empty: true, noEnergy: false };
      const html = renderer.renderCardDraw(draw, 5, 30, makeProfile());
      expect(html).toContain("Nothing happening");
    });

    it("shows no energy state", () => {
      const renderer = new HtmlAppRenderer(null);
      const draw: DrawResult = { cards: [], empty: false, noEnergy: true };
      const html = renderer.renderCardDraw(draw, 0, 30, makeProfile());
      expect(html).toContain("Out of energy");
    });

    it("renders breed card when single breed card", () => {
      const renderer = new HtmlAppRenderer(null);
      const draw: DrawResult = { cards: [makeBreedCard()], empty: false, noEnergy: false };
      const html = renderer.renderCardDraw(draw, 20, 30, makeProfile());
      expect(html).toContain("breed-card-big");
      expect(html).toContain("BREEDING MATCH");
      expect(html).toContain("Alpha");
      expect(html).toContain("Beta");
    });

    it("shows prompt hint with letter keys", () => {
      const renderer = new HtmlAppRenderer(null);
      const draw: DrawResult = {
        cards: [makeCatchCard("1", "Flikk", "flikk")],
        empty: false, noEnergy: false,
      };
      const html = renderer.renderCardDraw(draw, 16, 30, makeProfile());
      expect(html).toContain("prompt-hint");
      expect(html).toContain("<kbd>a</kbd>");
      expect(html).toContain("<kbd>s</kbd>");
    });

    it("includes onclick handlers when sidecar port provided", () => {
      const renderer = new HtmlAppRenderer(8765);
      const draw: DrawResult = {
        cards: [makeCatchCard("1", "Flikk", "flikk")],
        empty: false, noEnergy: false,
      };
      const html = renderer.renderCardDraw(draw, 16, 30, makeProfile());
      expect(html).toContain("pickCard");
      expect(html).toContain("SIDECAR_PORT = 8765");
    });

    it("renders HUD with energy and level", () => {
      const renderer = new HtmlAppRenderer(null);
      const draw: DrawResult = {
        cards: [makeCatchCard("1", "Flikk", "flikk")],
        empty: false, noEnergy: false,
      };
      const html = renderer.renderCardDraw(draw, 16, 30, makeProfile());
      expect(html).toContain("16/30");
      expect(html).toContain("Lv");
    });

    it("shows upgrade chances in breed card", () => {
      const renderer = new HtmlAppRenderer(null);
      const draw: DrawResult = { cards: [makeBreedCard()], empty: false, noEnergy: false };
      const html = renderer.renderCardDraw(draw, 20, 30, makeProfile());
      expect(html).toContain("35%");
      expect(html).toContain("15%");
    });
  });

  describe("renderPlayResult", () => {
    it("shows catch success overlay", () => {
      const renderer = new HtmlAppRenderer(null);
      const catchResult: CatchResult = {
        success: true,
        creature: {
          id: "n-1", speciesId: "flikk", name: "Flikk",
          slots: [
            { slotId: "eyes", variantId: "eyes_default", color: "green", rarity: 2 },
            { slotId: "mouth", variantId: "mouth_default", color: "grey", rarity: 0 },
            { slotId: "body", variantId: "body_default", color: "cyan", rarity: 3 },
            { slotId: "tail", variantId: "tail_default", color: "grey", rarity: 0 },
          ],
          spawnedAt: Date.now(),
        },
        energySpent: 2,
        fled: false,
        xpEarned: 10,
        attemptsRemaining: 2,
        failPenalty: 0.1,
      };
      const nextDraw: DrawResult = { cards: [], empty: true, noEnergy: false };
      const result: PlayResult = { action: "catch", catchResult, nextDraw };
      const html = renderer.renderPlayResult(result, 14, 30, makeProfile());
      expect(html).toContain("CAUGHT");
      expect(html).toContain("catch-success");
      expect(html).toContain("Flikk");
      expect(html).toContain("result-overlay");
      expect(html).toContain("next-draw-content");
      expect(html).toContain("setTimeout"); // auto-dismiss script
    });

    it("shows fled overlay", () => {
      const renderer = new HtmlAppRenderer(null);
      const catchResult: CatchResult = {
        success: false,
        creature: {
          id: "n-1", speciesId: "flikk", name: "Flikk",
          slots: [
            { slotId: "eyes", variantId: "eyes_default", color: "green", rarity: 2 },
            { slotId: "mouth", variantId: "mouth_default", color: "grey", rarity: 0 },
            { slotId: "body", variantId: "body_default", color: "cyan", rarity: 3 },
            { slotId: "tail", variantId: "tail_default", color: "grey", rarity: 0 },
          ],
          spawnedAt: Date.now(),
        },
        energySpent: 2,
        fled: true,
        xpEarned: 0,
        attemptsRemaining: 0,
        failPenalty: 0.1,
      };
      const nextDraw: DrawResult = { cards: [], empty: true, noEnergy: false };
      const result: PlayResult = { action: "catch", catchResult, nextDraw };
      const html = renderer.renderPlayResult(result, 14, 30, makeProfile());
      expect(html).toContain("FLED");
      expect(html).toContain("catch-fail");
    });

    it("shows breed result overlay", () => {
      const renderer = new HtmlAppRenderer(null);
      const child = makeCollectionCreature("c1", "Baby", "compi");
      const breedResult: BreedResult = {
        child,
        parentA: makeCollectionCreature("p1", "Alpha", "compi"),
        parentB: makeCollectionCreature("p2", "Beta", "compi"),
        inheritedFrom: { eyes: "A", mouth: "B", body: "A", tail: "B" },
        isCrossSpecies: false,
        upgrades: [{ slotId: "eyes", fromRarity: 1, toRarity: 2 }],
      };
      const nextDraw: DrawResult = { cards: [], empty: true, noEnergy: false };
      const result: PlayResult = { action: "breed", breedResult, nextDraw };
      const html = renderer.renderPlayResult(result, 14, 30, makeProfile());
      expect(html).toContain("BABY BORN");
      expect(html).toContain("breed-success");
      expect(html).toContain("Baby");
      expect(html).toContain("upgrade-arrow");
    });

    it("shows hybrid breed title for cross-species", () => {
      const renderer = new HtmlAppRenderer(null);
      const child = makeCollectionCreature("c1", "Hybrid", "compi");
      const breedResult: BreedResult = {
        child,
        parentA: makeCollectionCreature("p1", "Alpha", "compi"),
        parentB: makeCollectionCreature("p2", "Beta", "flikk"),
        inheritedFrom: { eyes: "A", mouth: "B", body: "A", tail: "B" },
        isCrossSpecies: true,
        upgrades: [],
      };
      const nextDraw: DrawResult = { cards: [], empty: true, noEnergy: false };
      const result: PlayResult = { action: "breed", breedResult, nextDraw };
      const html = renderer.renderPlayResult(result, 14, 30, makeProfile());
      expect(html).toContain("HYBRID BORN");
    });

    it("renders next draw cards after result", () => {
      const renderer = new HtmlAppRenderer(null);
      const catchResult: CatchResult = {
        success: true,
        creature: {
          id: "n-1", speciesId: "flikk", name: "Flikk",
          slots: [
            { slotId: "eyes", variantId: "eyes_default", color: "green", rarity: 2 },
            { slotId: "mouth", variantId: "mouth_default", color: "grey", rarity: 0 },
            { slotId: "body", variantId: "body_default", color: "cyan", rarity: 3 },
            { slotId: "tail", variantId: "tail_default", color: "grey", rarity: 0 },
          ],
          spawnedAt: Date.now(),
        },
        energySpent: 2, fled: false, xpEarned: 10,
        attemptsRemaining: 2, failPenalty: 0.1,
      };
      const nextDraw: DrawResult = {
        cards: [makeCatchCard("3", "Jinx", "jinx")],
        empty: false, noEnergy: false,
      };
      const result: PlayResult = { action: "catch", catchResult, nextDraw };
      const html = renderer.renderPlayResult(result, 14, 30, makeProfile());
      expect(html).toContain("game-card");
      expect(html).toContain("next-draw-content");
    });
  });

  describe("renderCollection", () => {
    it("renders empty collection", () => {
      const renderer = new HtmlAppRenderer(null);
      const html = renderer.renderCollection([]);
      expect(html).toContain("No creatures");
    });

    it("renders collection grid", () => {
      const renderer = new HtmlAppRenderer(null);
      const collection = [
        makeCollectionCreature("c1", "Alpha", "compi"),
        makeCollectionCreature("c2", "Beta", "flikk"),
      ];
      const html = renderer.renderCollection(collection);
      expect(html).toContain("collection-grid");
      expect(html).toContain("collection-card");
      expect(html).toContain("Alpha");
      expect(html).toContain("Beta");
      expect(html).toContain("Collection (2)");
    });
  });

  describe("delegated methods", () => {
    it("renderScan delegates to SimpleTextRenderer via buildAppHtml", () => {
      const renderer = new HtmlAppRenderer(null);
      const scanResult = {
        nearby: [],
        energy: 10,
        batch: null,
        nextBatchInMs: 60000,
      };
      const html = renderer.renderScan(scanResult);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<pre>");
    });

    it("renderLevelUp delegates to SimpleTextRenderer", () => {
      const renderer = new HtmlAppRenderer(null);
      const html = renderer.renderLevelUp({ oldLevel: 3, newLevel: 4, xpOverflow: 12 });
      expect(html).toContain("LEVEL UP");
    });

    it("renderCompanionOverview returns empty string", () => {
      const renderer = new HtmlAppRenderer(null);
      const result = renderer.renderCompanionOverview({
        progress: {} as any,
        nearbyHighlights: [],
        breedablePairs: [],
        suggestedActions: [],
      });
      expect(result).toBe("");
    });
  });
});

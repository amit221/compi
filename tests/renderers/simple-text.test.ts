import { SimpleTextRenderer } from "../../src/renderers/simple-text";
import {
  ScanResult,
  CatchResult,
  BreedPreview,
  BreedResult,
  CollectionCreature,
  CreatureSlot,
  NearbyCreature,
  SlotInheritance,
} from "../../src/types";

// --- Helpers ---

function makeSlots(color: string = "white"): CreatureSlot[] {
  const slotIds = ["eyes", "mouth", "body", "tail"] as const;
  const variantIds = ["eye_c01", "mth_c01", "bod_c01", "tal_c01"];
  return slotIds.map((slotId, i) => ({
    slotId,
    variantId: variantIds[i],
    color: color as any,
  }));
}

function makeNearby(id: string, name: string, slotColor: string = "white"): NearbyCreature {
  return {
    id,
    speciesId: "compi",
    name,
    slots: makeSlots(slotColor),
    spawnedAt: Date.now(),
  };
}

function makeCollection(id: string, name: string, generation = 1, slotColor: string = "white"): CollectionCreature {
  return {
    id,
    speciesId: "compi",
    name,
    slots: makeSlots(slotColor),
    caughtAt: Date.now(),
    generation,
    archived: false,
  };
}

const renderer = new SimpleTextRenderer();

// --- renderScan ---

describe("renderScan", () => {
  const result: ScanResult = {
    energy: 6,
    batch: null,
    nextBatchInMs: 900000,
    nearby: [
      { index: 1, creature: makeNearby("c1", "Sparks"), catchRate: 0.55, energyCost: 3 },
      { index: 2, creature: makeNearby("c2", "Muddle"), catchRate: 0.92, energyCost: 1 },
    ],
  };

  test("contains creature names", () => {
    const out = renderer.renderScan(result);
    expect(out).toContain("Sparks");
    expect(out).toContain("Muddle");
  });

  test("contains catch rates", () => {
    const out = renderer.renderScan(result);
    expect(out).toContain("55%");
    expect(out).toContain("92%");
  });

  test("contains energy costs", () => {
    const out = renderer.renderScan(result);
    expect(out).toContain("Cost:");
    expect(out).toContain("⚡");
  });

  test("contains ANSI color codes", () => {
    const out = renderer.renderScan(result);
    expect(out).toContain("\x1b[");
  });

  test("contains energy bar", () => {
    const out = renderer.renderScan(result);
    expect(out).toContain("⚡");
    expect(out).toContain("6/");
  });

  test("contains species name", () => {
    const out = renderer.renderScan(result);
    expect(out).toContain("compi");
  });
});

// --- renderCatch ---

describe("renderCatch — success", () => {
  const result: CatchResult = {
    success: true,
    creature: makeNearby("c1", "Sparks"),
    energySpent: 3,
    fled: false,
    xpEarned: 25,
    attemptsRemaining: 3,
    failPenalty: 0,
  };

  test("contains CAUGHT", () => {
    const out = renderer.renderCatch(result);
    expect(out).toContain("CAUGHT");
  });

  test("contains creature name", () => {
    const out = renderer.renderCatch(result);
    expect(out).toContain("Sparks");
  });

  test("contains XP earned", () => {
    const out = renderer.renderCatch(result);
    expect(out).toContain("25");
  });
});

describe("renderCatch — escaped", () => {
  const result: CatchResult = {
    success: false,
    creature: makeNearby("c1", "Lumina"),
    energySpent: 5,
    fled: false,
    xpEarned: 0,
    attemptsRemaining: 2,
    failPenalty: 0.1,
  };

  test("contains ESCAPED", () => {
    const out = renderer.renderCatch(result);
    expect(out).toContain("ESCAPED");
  });

  test("contains creature name", () => {
    const out = renderer.renderCatch(result);
    expect(out).toContain("Lumina");
  });

  test("contains attempts remaining", () => {
    const out = renderer.renderCatch(result);
    expect(out).toContain("2 attempts remaining");
  });
});

describe("renderCatch — fled", () => {
  const result: CatchResult = {
    success: false,
    creature: makeNearby("c1", "Vortex"),
    energySpent: 5,
    fled: true,
    xpEarned: 0,
    attemptsRemaining: 0,
    failPenalty: 0,
  };

  test("contains FLED", () => {
    const out = renderer.renderCatch(result);
    expect(out).toContain("FLED");
  });

  test("contains creature name", () => {
    const out = renderer.renderCatch(result);
    expect(out).toContain("Vortex");
  });
});

// --- renderCollection ---

describe("renderCollection", () => {
  const collection = [makeCollection("c1", "Sparks", 4), makeCollection("c2", "Muddle", 1)];

  test("contains creature names", () => {
    const out = renderer.renderCollection(collection);
    expect(out).toContain("Sparks");
    expect(out).toContain("Muddle");
  });

  test("contains ANSI codes", () => {
    const out = renderer.renderCollection(collection);
    expect(out).toContain("\x1b[");
  });

  test("contains levels", () => {
    const out = renderer.renderCollection(collection);
    expect(out).toContain("Lv 4");
    expect(out).toContain("Lv 1");
  });

  test("contains species name", () => {
    const out = renderer.renderCollection(collection);
    expect(out).toContain("compi");
  });

  test("empty collection returns message", () => {
    const out = renderer.renderCollection([]);
    expect(out).toContain("No creatures");
  });
});

// --- renderBreedPreview ---

describe("renderBreedPreview", () => {
  const parentA = makeCollection("c1", "Sparks", 4);
  const parentB = makeCollection("c2", "Muddle", 1);

  const preview: BreedPreview = {
    parentA,
    parentB,
    parentAIndex: 1,
    parentBIndex: 2,
    slotInheritance: [
      { slotId: "eyes", parentAVariant: { id: "eye_c01", name: "Dot Eyes", art: "o.o", spawnRate: 0.10 }, parentBVariant: { id: "eye_c01", name: "Dot Eyes", art: "o.o", spawnRate: 0.10 }, parentAChance: 0.50, parentBChance: 0.50 },
      { slotId: "mouth", parentAVariant: { id: "mth_c01", name: "Flat Line", art: " - ", spawnRate: 0.10 }, parentBVariant: { id: "mth_c01", name: "Flat Line", art: " - ", spawnRate: 0.10 }, parentAChance: 0.50, parentBChance: 0.50 },
      { slotId: "body", parentAVariant: { id: "bod_c01", name: "Block", art: " ░░ ", spawnRate: 0.10 }, parentBVariant: { id: "bod_c01", name: "Block", art: " ░░ ", spawnRate: 0.10 }, parentAChance: 0.50, parentBChance: 0.50 },
      { slotId: "tail", parentAVariant: { id: "tal_c01", name: "Wave", art: "~", spawnRate: 0.10 }, parentBVariant: { id: "tal_c01", name: "Wave", art: "~", spawnRate: 0.10 }, parentAChance: 0.50, parentBChance: 0.50 },
    ],
    energyCost: 3,
  };

  test("contains both creature names", () => {
    const out = renderer.renderBreedPreview(preview);
    expect(out).toContain("Sparks");
    expect(out).toContain("Muddle");
  });

  test("contains slot names", () => {
    const out = renderer.renderBreedPreview(preview);
    expect(out).toContain("eyes");
    expect(out).toContain("tail");
    expect(out).toContain("body");
    expect(out).toContain("mouth");
  });

  test("contains percentages", () => {
    const out = renderer.renderBreedPreview(preview);
    expect(out).toContain("50%");
  });

  test("contains energy cost", () => {
    const out = renderer.renderBreedPreview(preview);
    expect(out).toContain("3");
    expect(out).toContain("Energy cost");
  });

  test("contains ANSI codes", () => {
    const out = renderer.renderBreedPreview(preview);
    expect(out).toContain("\x1b[");
  });
});

// --- renderBreedResult ---

describe("renderBreedResult", () => {
  const parentA = makeCollection("c1", "Sparks", 4);
  const parentB = makeCollection("c2", "Muddle", 1);
  const child = makeCollection("c3", "Sparks", 5);

  const result: BreedResult = {
    child,
    parentA,
    parentB,
    inheritedFrom: { eyes: "A", mouth: "B", body: "A", tail: "B" },
  };

  test("contains BREED SUCCESS", () => {
    const out = renderer.renderBreedResult(result);
    expect(out).toContain("BREED SUCCESS");
  });

  test("contains child creature name", () => {
    const out = renderer.renderBreedResult(result);
    expect(out).toContain("Sparks");
  });

  test("contains inherited from markers", () => {
    const out = renderer.renderBreedResult(result);
    expect(out).toContain("A");
    expect(out).toContain("B");
  });

  test("contains consumed message", () => {
    const out = renderer.renderBreedResult(result);
    expect(out).toContain("consumed");
  });
});

// --- renderArchive ---

describe("renderArchive", () => {
  test("empty archive returns message", () => {
    const out = renderer.renderArchive([]);
    expect(out).toContain("No creatures in your archive");
  });

  test("shows archived creatures", () => {
    const archived = [{ ...makeCollection("c1", "Sparks", 3), archived: true }];
    const out = renderer.renderArchive(archived);
    expect(out).toContain("Sparks");
    expect(out).toContain("Archive");
  });
});

// --- renderEnergy ---

describe("renderEnergy", () => {
  test("contains Energy icon and values", () => {
    const out = renderer.renderEnergy(6, 10);
    expect(out).toContain("⚡");
    expect(out).toContain("6/10");
  });

  test("contains ANSI green color", () => {
    const out = renderer.renderEnergy(6, 10);
    expect(out).toContain("\x1b[32m");
  });
});

// --- renderStatus ---

describe("renderStatus", () => {
  test("contains archive count", () => {
    const out = renderer.renderStatus({
      profile: {
        level: 1, xp: 0, totalCatches: 0, totalMerges: 0, totalTicks: 0,
        currentStreak: 0, longestStreak: 0, lastActiveDate: "2026-04-01",
      },
      collectionCount: 2,
      archiveCount: 5,
      energy: 5,
      nearbyCount: 0,
      batchAttemptsRemaining: 0,
    });
    expect(out).toContain("Archive");
    expect(out).toContain("5 creatures");
  });
});

// --- species-specific art ---

describe("species-specific art", () => {
  test("renderScan uses fallback art for species without art template", () => {
    // Compi has no art template, so it uses the fallback layout with ( ) and ╱ ╲
    const result: ScanResult = {
      energy: 6,
      batch: null,
      nextBatchInMs: 900000,
      nearby: [
        { index: 0, creature: makeNearby("c1", "Sparks"), catchRate: 0.55, energyCost: 3 },
      ],
    };
    const out = renderer.renderScan(result);
    expect(out).toContain("╱");
    expect(out).toContain("╲");
  });
});

// --- renderNotification ---

describe("renderNotification", () => {
  test("returns notification message directly", () => {
    const out = renderer.renderNotification({ message: "A creature appeared!", level: "moderate" });
    expect(out).toBe("A creature appeared!");
  });
});

// --- Color display ---
//
// The renderer used to color creature art and trait names based on the slot's
// `color` field. That was replaced by rarity-based coloring (see simple-text.ts
// `renderCreatureLines` / `renderCreatureSideBySide`, which call
// `calculateRarityColor`). The slot `color` field is no longer consulted by
// the renderer, so the old "per-slot color display" tests were removed.

describe("rarity-based color display", () => {
  test("renderScan emits ANSI color codes for trait rarity", () => {
    const result: ScanResult = {
      energy: 6,
      batch: null,
      nextBatchInMs: 900000,
      nearby: [
        { index: 0, creature: makeNearby("c1", "Sparks"), catchRate: 0.55, energyCost: 3 },
      ],
    };
    const out = renderer.renderScan(result);
    // Rarity colors are ANSI foreground codes in the 30-37 / 90-97 range.
    expect(out).toMatch(/\x1b\[(3[0-7]|9[0-7])m/);
    expect(out).not.toContain("[cyan]");
  });
});

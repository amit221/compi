import {
  loadSpecies,
  getSpeciesById,
  getAllSpecies,
  pickSpecies,
  pickTraitForSlot,
  getTraitDefinition,
  getTraitRank,
  _resetSpeciesCache,
} from "../../src/config/species";
import { SpeciesDefinition, SlotId, SLOT_IDS } from "../../src/types";

beforeEach(() => {
  _resetSpeciesCache();
});

describe("loadSpecies", () => {
  it("loads species from config/species/*.json", () => {
    const species = loadSpecies();
    expect(species.length).toBeGreaterThanOrEqual(1);
    const compi = species.find((s) => s.id === "compi");
    expect(compi).toBeDefined();
  });

  it("returns species with correct shape", () => {
    const species = loadSpecies();
    const compi = species.find((s) => s.id === "compi")!;
    expect(compi.id).toBe("compi");
    expect(compi.name).toBe("Compi");
    expect(compi.description).toBeTruthy();
    expect(compi.spawnWeight).toBe(10);
    for (const slotId of SLOT_IDS) {
      expect(compi.traitPools[slotId]).toBeDefined();
      expect(compi.traitPools[slotId]!.length).toBe(19);
    }
  });
});

describe("getSpeciesById", () => {
  it("returns compi species", () => {
    const compi = getSpeciesById("compi");
    expect(compi).toBeDefined();
    expect(compi!.id).toBe("compi");
  });

  it("returns undefined for unknown species", () => {
    expect(getSpeciesById("unknown")).toBeUndefined();
  });
});

describe("getAllSpecies", () => {
  it("returns all loaded species", () => {
    const all = getAllSpecies();
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all.some((s) => s.id === "compi")).toBe(true);
  });

  it("caches results", () => {
    const a = getAllSpecies();
    const b = getAllSpecies();
    expect(a).toBe(b); // same reference
  });
});

describe("pickSpecies", () => {
  it("returns a species with deterministic rng", () => {
    const species = pickSpecies(() => 0.5);
    expect(species).toBeDefined();
    expect(species.id).toBeTruthy();
  });

  it("returns first species when rng is 0", () => {
    const species = pickSpecies(() => 0);
    expect(species).toBeDefined();
  });

  it("returns last species when rng approaches 1", () => {
    const species = pickSpecies(() => 0.999);
    expect(species).toBeDefined();
  });

  it("weighted selection respects weights with multiple species", () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) {
      const s = pickSpecies(() => Math.random());
      counts[s.id] = (counts[s.id] || 0) + 1;
    }
    // compi should appear but not exclusively (other species exist now)
    expect(counts["compi"]).toBeGreaterThan(0);
    expect(Object.keys(counts).length).toBeGreaterThan(1);
  });
});

describe("pickTraitForSlot", () => {
  let compi: SpeciesDefinition;

  beforeEach(() => {
    compi = getSpeciesById("compi")!;
  });

  it("returns a trait for each slot", () => {
    for (const slotId of SLOT_IDS) {
      const trait = pickTraitForSlot(compi, slotId, 5, () => 0.5);
      expect(trait).toBeDefined();
      expect(trait.id).toBeTruthy();
      expect(trait.name).toBeTruthy();
      expect(trait.art).toBeTruthy();
      expect(trait.spawnRate).toBeGreaterThan(0);
    }
  });

  it("at level 1 (rankCap=1), only returns rank 0 or rank 1 traits", () => {
    const validIds = new Set(["eye_c01", "eye_c02"]);
    for (let i = 0; i < 100; i++) {
      const trait = pickTraitForSlot(compi, "eyes", 1, () => i / 100);
      expect(validIds.has(trait.id)).toBe(true);
    }
  });

  it("at level 1, rank 0 (most common) is more likely than rank 1", () => {
    let rank0Count = 0;
    const iterations = 1000;
    for (let i = 0; i < iterations; i++) {
      const trait = pickTraitForSlot(compi, "eyes", 1, () => i / iterations);
      if (trait.id === "eye_c01") rank0Count++;
    }
    // Triangular distribution: P(rank0) = 2/3 ≈ 67%
    expect(rank0Count / iterations).toBeGreaterThan(0.5);
  });

  it("at level 14 (rankCap=8), can return up to rank 8 traits", () => {
    const trait = pickTraitForSlot(compi, "eyes", 14, () => 0.9999);
    const pool = compi.traitPools["eyes"]!;
    const idx = pool.findIndex((t) => t.id === trait.id);
    expect(idx).toBeLessThanOrEqual(8);
    expect(idx).toBeGreaterThanOrEqual(0);
  });

  it("never returns traits above the rank cap", () => {
    const allowed = new Set(["eye_c01", "eye_c02", "eye_c03"]);
    for (let i = 0; i < 200; i++) {
      const trait = pickTraitForSlot(compi, "eyes", 3, () => i / 200);
      expect(allowed.has(trait.id)).toBe(true);
    }
  });

  it("triangular distribution skews toward lower ranks", () => {
    const counts: Record<number, number> = {};
    const iterations = 10000;
    for (let i = 0; i < iterations; i++) {
      const trait = pickTraitForSlot(compi, "eyes", 14, () => i / iterations);
      const pool = compi.traitPools["eyes"]!;
      const idx = pool.findIndex((t) => t.id === trait.id);
      counts[idx] = (counts[idx] || 0) + 1;
    }
    expect(counts[0]).toBeGreaterThan(counts[8] || 0);
    expect(counts[0]).toBeGreaterThan(counts[4] || 0);
  });
});

describe("species zones", () => {
  it("every species should have art and zones arrays of equal length", () => {
    const species = getAllSpecies();
    for (const s of species) {
      expect(s.art).toBeDefined();
      expect(s.art!.length).toBeGreaterThan(0);
      expect(s.zones).toBeDefined();
      expect(s.zones!.length).toBe(s.art!.length);
    }
  });
});

describe("getTraitDefinition", () => {
  it("returns trait by speciesId and variantId", () => {
    const trait = getTraitDefinition("compi", "eye_c01");
    expect(trait).toBeDefined();
    expect(trait!.id).toBe("eye_c01");
    expect(trait!.name).toBe("Pebble Gaze");
    expect(trait!.art).toBe("○.○");
    expect(trait!.spawnRate).toBe(0.12);
  });

  it("returns traits from different slots", () => {
    expect(getTraitDefinition("compi", "mth_c01")?.name).toBe("Flat Line");
    expect(getTraitDefinition("compi", "bod_c01")?.name).toBe("Dots");
    expect(getTraitDefinition("compi", "tal_c01")?.name).toBe("Curl");
  });

  it("returns undefined for unknown species", () => {
    expect(getTraitDefinition("unknown", "eye_c01")).toBeUndefined();
  });

  it("returns undefined for unknown variant", () => {
    expect(getTraitDefinition("compi", "eye_x99")).toBeUndefined();
  });
});

describe("getTraitRank", () => {
  it("returns 0 for the first (most common) trait in pool", () => {
    expect(getTraitRank("compi", "eyes", "eye_c01")).toBe(0);
  });

  it("returns last index for the rarest trait", () => {
    expect(getTraitRank("compi", "eyes", "eye_m02")).toBe(18);
  });

  it("returns correct middle rank", () => {
    expect(getTraitRank("compi", "eyes", "eye_u01")).toBe(5);
  });

  it("returns -1 for unknown variant", () => {
    expect(getTraitRank("compi", "eyes", "eye_x99")).toBe(-1);
  });

  it("returns -1 for unknown species", () => {
    expect(getTraitRank("unknown", "eyes", "eye_c01")).toBe(-1);
  });
});

describe("compi.json data integrity", () => {
  let compi: SpeciesDefinition;

  beforeEach(() => {
    compi = getSpeciesById("compi")!;
  });

  it("has 76 total traits (19 per slot x 4 slots)", () => {
    let total = 0;
    for (const slotId of SLOT_IDS) {
      const traits = compi.traitPools[slotId];
      if (traits) total += traits.length;
    }
    expect(total).toBe(76);
  });

  it("all trait IDs are unique", () => {
    const ids = new Set<string>();
    for (const slotId of SLOT_IDS) {
      const traits = compi.traitPools[slotId];
      if (traits) {
        for (const trait of traits) {
          expect(ids.has(trait.id)).toBe(false);
          ids.add(trait.id);
        }
      }
    }
    expect(ids.size).toBe(76);
  });

  it("spawn rates sum to approximately 1.0 per slot", () => {
    for (const slotId of SLOT_IDS) {
      const traits = compi.traitPools[slotId];
      if (traits) {
        const sum = traits.reduce((s, t) => s + t.spawnRate, 0);
        expect(sum).toBeCloseTo(1.0, 1);
      }
    }
  });

  it("spawn rates are in descending order per slot", () => {
    for (const slotId of SLOT_IDS) {
      const traits = compi.traitPools[slotId];
      if (traits) {
        const rates = traits.map((t) => t.spawnRate);
        for (let i = 1; i < rates.length; i++) {
          expect(rates[i]).toBeLessThanOrEqual(rates[i - 1]);
        }
      }
    }
  });
});

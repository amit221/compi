import { getSpeciesIndex } from "../../src/engine/species-index";

describe("species-index", () => {
  it("returns progress for each discovered species", () => {
    const progress = {
      compi: [true, true, false, false, false, false, false, false],
      pyrax: [true, false, false, false, false, false, false, false],
    };
    const result = getSpeciesIndex(progress);
    expect(result).toHaveLength(2);
    expect(result[0].speciesId).toBe("compi");
    expect(result[0].discovered).toBe(2);
    expect(result[0].total).toBe(8);
  });

  it("separates hybrids from base species", () => {
    const progress = {
      compi: [true, true, false, false, false, false, false, false],
      "hybrid_compi_pyrax": [true, false, false, false, false, false, false, false],
    };
    const result = getSpeciesIndex(progress);
    const base = result.filter(r => !r.isHybrid);
    const hybrids = result.filter(r => r.isHybrid);
    expect(base).toHaveLength(1);
    expect(hybrids).toHaveLength(1);
  });

  it("returns empty for no progress", () => {
    expect(getSpeciesIndex({})).toEqual([]);
  });
});

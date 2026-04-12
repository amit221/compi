import { SpeciesDefinition, SlotId } from "../../src/types";

describe("SpeciesDefinition zones field", () => {
  it("should accept a zones array of SlotId values", () => {
    const species: SpeciesDefinition = {
      id: "test",
      name: "Test",
      description: "A test species",
      spawnWeight: 10,
      art: ["line1", "line2"],
      zones: ["eyes", "body"],
      traitPools: {},
    };
    expect(species.zones).toEqual(["eyes", "body"]);
  });

  it("should allow zones to be undefined for backward compat during migration", () => {
    const species: SpeciesDefinition = {
      id: "test",
      name: "Test",
      description: "A test species",
      spawnWeight: 10,
      art: ["line1"],
      traitPools: {},
    };
    expect(species.zones).toBeUndefined();
  });
});

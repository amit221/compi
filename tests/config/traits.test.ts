import { getVariantById, loadCreatureName, _resetTraitsCache } from "../../src/config/traits";

beforeEach(() => _resetTraitsCache());

describe("trait loader", () => {
  test("getVariantById finds a known variant", () => {
    const v = getVariantById("eye_c01");
    expect(v).toBeDefined();
    expect(v!.name).toBe("Pebble Gaze");
  });

  test("getVariantById returns undefined for unknown id", () => {
    expect(getVariantById("nonexistent")).toBeUndefined();
  });

  test("loadCreatureName returns a string", () => {
    let i = 0;
    const rng = () => (i++ * 0.1) % 1;
    const name = loadCreatureName(rng);
    expect(typeof name).toBe("string");
    expect(name.length).toBeGreaterThan(0);
  });
});

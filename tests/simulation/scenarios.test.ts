import { getScenario, getAllScenarios, ScenarioId } from "../../src/simulation/scenarios";

describe("scenarios", () => {
  test("getAllScenarios returns all 8 scenarios", () => {
    const all = getAllScenarios();
    expect(all).toHaveLength(8);
  });

  test("each scenario has required fields", () => {
    for (const scenario of getAllScenarios()) {
      expect(scenario.id).toBeTruthy();
      expect(scenario.name).toBeTruthy();
      expect(scenario.description).toBeTruthy();
      expect(scenario.prompt).toBeTruthy();
      expect(scenario.prompt.length).toBeGreaterThan(100);
    }
  });

  test("getScenario returns specific scenario by id", () => {
    const scenario = getScenario("first-10-minutes");
    expect(scenario).toBeDefined();
    expect(scenario!.name).toContain("First");
  });

  test("getScenario returns undefined for unknown id", () => {
    const scenario = getScenario("nonexistent" as ScenarioId);
    expect(scenario).toBeUndefined();
  });
});

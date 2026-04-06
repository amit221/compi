import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { StateManager } from "../../src/state/state-manager";

describe("StateManager v3", () => {
  const tmpDir = path.join(os.tmpdir(), "compi-test-" + Date.now());
  const statePath = path.join(tmpDir, "state.json");

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("creates default v3 state when no file exists", () => {
    const sm = new StateManager(statePath);
    const state = sm.load();

    expect(state.version).toBe(3);
    expect(state.profile.level).toBe(1);
    expect(state.collection).toEqual([]);
    expect(state.nearby).toEqual([]);
    expect(state.settings).toEqual({ notificationLevel: "moderate" });
  });

  test("saves and loads state", () => {
    const sm = new StateManager(statePath);
    const state = sm.load();
    state.profile.totalCatches = 5;
    sm.save(state);

    const loaded = sm.load();
    expect(loaded.profile.totalCatches).toBe(5);
    expect(loaded.version).toBe(3);
  });
});

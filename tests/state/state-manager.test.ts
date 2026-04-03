import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { StateManager } from "../../src/state/state-manager";
import { GameState } from "../../src/types";

describe("StateManager", () => {
  let tmpDir: string;
  let stateManager: StateManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "termomon-test-"));
    stateManager = new StateManager(path.join(tmpDir, "state.json"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("creates default state when no file exists", () => {
    const state = stateManager.load();
    expect(state.version).toBe(1);
    expect(state.profile.level).toBe(1);
    expect(state.profile.xp).toBe(0);
    expect(state.profile.totalCatches).toBe(0);
    expect(state.collection).toEqual([]);
    expect(state.nearby).toEqual([]);
    expect(state.inventory).toEqual({ bytetrap: 5 });
    expect(state.claimedMilestones).toEqual([]);
    expect(state.settings.renderer).toBe("simple");
    expect(state.settings.notificationLevel).toBe("moderate");
  });

  test("saves and loads state", () => {
    const state = stateManager.load();
    state.profile.totalCatches = 42;
    state.inventory["netsnare"] = 3;
    stateManager.save(state);

    const loaded = stateManager.load();
    expect(loaded.profile.totalCatches).toBe(42);
    expect(loaded.inventory["netsnare"]).toBe(3);
  });

  test("creates parent directory if missing", () => {
    const deepPath = path.join(tmpDir, "a", "b", "state.json");
    const mgr = new StateManager(deepPath);
    const state = mgr.load();
    mgr.save(state);
    expect(fs.existsSync(deepPath)).toBe(true);
  });
});

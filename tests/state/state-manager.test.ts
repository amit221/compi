import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { StateManager } from "../../src/state/state-manager";

describe("StateManager v4", () => {
  const tmpDir = path.join(os.tmpdir(), "compi-test-" + Date.now());
  const statePath = path.join(tmpDir, "state.json");

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("creates default v4 state when no file exists", () => {
    const sm = new StateManager(statePath);
    const state = sm.load();

    expect(state.version).toBe(4);
    expect(state.profile.level).toBe(1);
    expect(state.collection).toEqual([]);
    expect(state.archive).toEqual([]);
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
    expect(loaded.version).toBe(4);
  });

  test("migrates v3 state to v4", () => {
    // Write a v3 state file
    const v3State = {
      version: 3,
      profile: {
        level: 2,
        xp: 50,
        totalCatches: 3,
        totalMerges: 1,
        totalTicks: 100,
        currentStreak: 2,
        longestStreak: 5,
        lastActiveDate: "2026-04-01",
      },
      collection: [
        {
          id: "c1",
          name: "Sparks",
          slots: [
            { slotId: "eyes", variantId: "eye_c01", rarity: "common" },
            { slotId: "mouth", variantId: "mth_c01", rarity: "rare" },
            { slotId: "body", variantId: "bod_c01", rarity: "common" },
            { slotId: "tail", variantId: "tal_c01", rarity: "epic" },
          ],
          caughtAt: 1000,
          generation: 2,
        },
      ],
      nearby: [
        {
          id: "n1",
          name: "Muddle",
          slots: [
            { slotId: "eyes", variantId: "eye_c01", rarity: "uncommon" },
            { slotId: "mouth", variantId: "mth_c01", rarity: "common" },
            { slotId: "body", variantId: "bod_c01", rarity: "common" },
            { slotId: "tail", variantId: "tal_c01", rarity: "common" },
          ],
          spawnedAt: 2000,
        },
      ],
      energy: 8,
      lastEnergyGainAt: 5000,
      batch: null,
      recentTicks: [],
      claimedMilestones: [],
      settings: { notificationLevel: "moderate" },
    };

    const dir = path.dirname(statePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(v3State, null, 2));

    const sm = new StateManager(statePath);
    const state = sm.load();

    expect(state.version).toBe(4);
    expect(state.archive).toEqual([]);

    // Collection creature should have speciesId and archived, no rarity on slots
    expect(state.collection[0].speciesId).toBe("compi");
    expect(state.collection[0].archived).toBe(false);
    expect((state.collection[0].slots[0] as any).rarity).toBeUndefined();

    // Nearby creature should have speciesId, no rarity on slots
    expect(state.nearby[0].speciesId).toBe("compi");
    expect((state.nearby[0].slots[0] as any).rarity).toBeUndefined();

    // Profile data preserved
    expect(state.profile.level).toBe(2);
    expect(state.profile.totalCatches).toBe(3);
  });
});

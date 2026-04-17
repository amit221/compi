import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { StateManager } from "../../src/state/state-manager";

describe("StateManager v6→v7 migration", () => {
  const tmpDir = path.join(os.tmpdir(), "compi-test-v7-" + Date.now());
  const statePath = path.join(tmpDir, "state.json");

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("fresh state (no file) creates v7 state with no archive field", () => {
    const freshPath = path.join(tmpDir, "fresh.json");
    const sm = new StateManager(freshPath);
    const state = sm.load();

    expect(state.version).toBe(7);
    expect((state as any).archive).toBeUndefined();
    expect(state.collection).toEqual([]);
  });

  test("v6 state with archived creatures migrates to v7: moves archive to collection with archived=false, removes archive field", () => {
    const v6State = {
      version: 6,
      profile: {
        level: 3,
        xp: 120,
        totalCatches: 10,
        totalMerges: 2,
        totalTicks: 500,
        currentStreak: 3,
        longestStreak: 7,
        lastActiveDate: "2026-04-10",
      },
      collection: [
        {
          id: "c1",
          speciesId: "compi",
          name: "Sparks",
          slots: [
            { slotId: "eyes", variantId: "eye_c01", color: "grey", rarity: 0 },
            { slotId: "mouth", variantId: "mth_c01", color: "white", rarity: 1 },
            { slotId: "body", variantId: "bod_c01", color: "grey", rarity: 0 },
            { slotId: "tail", variantId: "tal_c01", color: "grey", rarity: 0 },
          ],
          caughtAt: 1000,
          generation: 1,
          archived: false,
        },
      ],
      archive: [
        {
          id: "a1",
          speciesId: "flikk",
          name: "Archie",
          slots: [
            { slotId: "eyes", variantId: "eye_f01", color: "green", rarity: 2 },
            { slotId: "mouth", variantId: "mth_f01", color: "grey", rarity: 0 },
            { slotId: "body", variantId: "bod_f01", color: "grey", rarity: 0 },
            { slotId: "tail", variantId: "tal_f01", color: "grey", rarity: 0 },
          ],
          caughtAt: 2000,
          generation: 1,
          archived: true,
        },
      ],
      energy: 15,
      lastEnergyGainAt: 9000,
      nearby: [],
      batch: null,
      lastSpawnAt: 0,
      recentTicks: [],
      claimedMilestones: [],
      settings: { notificationLevel: "moderate" },
      discoveredSpecies: ["compi", "flikk"],
      currentSessionId: "",
      speciesProgress: {},
      personalSpecies: [],
      sessionBreedCount: 0,
      breedCooldowns: {},
    };

    fs.writeFileSync(statePath, JSON.stringify(v6State, null, 2));

    const sm = new StateManager(statePath);
    const state = sm.load();

    // Version bumped
    expect(state.version).toBe(7);

    // archive field removed
    expect((state as any).archive).toBeUndefined();

    // Collection contains both original collection creature and the archived one
    expect(state.collection).toHaveLength(2);

    const original = state.collection.find((c) => c.id === "c1");
    const migrated = state.collection.find((c) => c.id === "a1");

    expect(original).toBeDefined();
    expect(original!.archived).toBe(false);

    // Archived creature moved to collection with archived = false
    expect(migrated).toBeDefined();
    expect(migrated!.archived).toBe(false);
    expect(migrated!.speciesId).toBe("flikk");
    expect(migrated!.name).toBe("Archie");

    // Other fields preserved
    expect(state.profile.level).toBe(3);
    expect(state.energy).toBe(15);
    expect(state.discoveredSpecies).toEqual(["compi", "flikk"]);
  });

  test("v6 state with empty archive migrates cleanly to v7", () => {
    const emptyArchivePath = path.join(tmpDir, "empty-archive.json");
    const v6State = {
      version: 6,
      profile: {
        level: 1,
        xp: 0,
        totalCatches: 0,
        totalMerges: 0,
        totalTicks: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: "2026-04-17",
      },
      collection: [],
      archive: [],
      energy: 10,
      lastEnergyGainAt: 0,
      nearby: [],
      batch: null,
      lastSpawnAt: 0,
      recentTicks: [],
      claimedMilestones: [],
      settings: { notificationLevel: "moderate" },
      discoveredSpecies: [],
      currentSessionId: "",
      speciesProgress: {},
      personalSpecies: [],
      sessionBreedCount: 0,
      breedCooldowns: {},
    };

    fs.writeFileSync(emptyArchivePath, JSON.stringify(v6State, null, 2));

    const sm = new StateManager(emptyArchivePath);
    const state = sm.load();

    expect(state.version).toBe(7);
    expect((state as any).archive).toBeUndefined();
    expect(state.collection).toEqual([]);
  });
});

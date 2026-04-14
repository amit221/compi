import { getCompanionOverview } from "../../src/engine/companion";
import { GameState } from "../../src/types";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 5,
    profile: {
      level: 3,
      xp: 20,
      totalCatches: 5,
      totalMerges: 0,
      totalTicks: 50,
      currentStreak: 2,
      longestStreak: 3,
      lastActiveDate: "2026-04-14",
      totalUpgrades: 1,
      totalQuests: 0,
    },
    collection: [],
    archive: [],
    energy: 20,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    lastSpawnAt: 0,
    recentTicks: [],
    claimedMilestones: [],
    settings: { notificationLevel: "moderate" },
    gold: 10,
    discoveredSpecies: ["compi"],
    activeQuest: null,
    sessionUpgradeCount: 0,
    currentSessionId: "s1",
    ...overrides,
  };
}

describe("getCompanionOverview", () => {
  it("returns overview with empty collection", () => {
    const state = makeState();
    const overview = getCompanionOverview(state);
    expect(overview.progress).toBeDefined();
    expect(overview.progress.level).toBe(3);
    expect(overview.nearbyHighlights).toEqual([]);
    expect(overview.breedablePairs).toEqual([]);
    expect(overview.upgradeOpportunities).toEqual([]);
    expect(overview.questStatus).toBe("no_creatures");
    expect(overview.suggestedActions.length).toBeGreaterThan(0);
  });

  it("highlights nearby creatures with new species flag", () => {
    const state = makeState({
      nearby: [
        {
          id: "n1",
          speciesId: "compi",
          name: "Ziggy",
          slots: [
            { slotId: "eyes", variantId: "eye_c01", color: "grey" },
            { slotId: "mouth", variantId: "mth_c01", color: "grey" },
            { slotId: "body", variantId: "bod_c01", color: "grey" },
            { slotId: "tail", variantId: "tal_c01", color: "grey" },
          ],
          spawnedAt: Date.now(),
        },
        {
          id: "n2",
          speciesId: "flikk",
          name: "Buzzy",
          slots: [
            { slotId: "eyes", variantId: "flk_eye_01", color: "grey" },
            { slotId: "mouth", variantId: "flk_mth_01", color: "grey" },
            { slotId: "body", variantId: "flk_bod_01", color: "grey" },
            { slotId: "tail", variantId: "flk_tal_01", color: "grey" },
          ],
          spawnedAt: Date.now(),
        },
      ],
      batch: { attemptsRemaining: 3, failPenalty: 0, spawnedAt: Date.now() },
      discoveredSpecies: ["compi"],
    });
    const overview = getCompanionOverview(state);
    expect(overview.nearbyHighlights).toHaveLength(2);
    expect(overview.nearbyHighlights[0].isNewSpecies).toBe(false);
    expect(overview.nearbyHighlights[1].isNewSpecies).toBe(true);
  });

  it("detects breedable pairs", () => {
    const state = makeState({
      collection: [
        {
          id: "c1", speciesId: "compi", name: "Alpha", archived: false,
          generation: 0, caughtAt: Date.now(),
          slots: [
            { slotId: "eyes", variantId: "eye_c01", color: "grey" },
            { slotId: "mouth", variantId: "mth_c01", color: "grey" },
            { slotId: "body", variantId: "bod_c01", color: "grey" },
            { slotId: "tail", variantId: "tal_c01", color: "grey" },
          ],
        },
        {
          id: "c2", speciesId: "compi", name: "Beta", archived: false,
          generation: 0, caughtAt: Date.now(),
          slots: [
            { slotId: "eyes", variantId: "eye_c02", color: "grey" },
            { slotId: "mouth", variantId: "mth_c02", color: "grey" },
            { slotId: "body", variantId: "bod_c02", color: "grey" },
            { slotId: "tail", variantId: "tal_c02", color: "grey" },
          ],
        },
      ],
    });
    const overview = getCompanionOverview(state);
    expect(overview.breedablePairs).toHaveLength(1);
    expect(overview.breedablePairs[0].speciesId).toBe("compi");
    expect(overview.questStatus).toBe("available");
  });

  it("reports quest in progress", () => {
    const state = makeState({
      activeQuest: {
        id: "q1",
        creatureIds: ["c1"],
        startedAtSession: 1,
        sessionsRemaining: 1,
        teamPower: 10,
      },
    });
    const overview = getCompanionOverview(state);
    expect(overview.questStatus).toBe("in_progress");
    expect(overview.questSessionsRemaining).toBe(1);
  });
});

import * as fs from "fs";
import * as path from "path";
import { GameState } from "../types";
import { loadConfig } from "../config/loader";
import { logger } from "../logger";

function defaultState(): GameState {
  const today = new Date().toISOString().split("T")[0];
  return {
    version: 5,
    profile: {
      level: 1,
      xp: 0,
      totalCatches: 0,
      totalMerges: 0,
      totalTicks: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: today,
      totalUpgrades: 0,
      totalQuests: 0,
    },
    collection: [],
    archive: [],
    energy: loadConfig().energy.maxEnergy,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    lastSpawnAt: 0,
    recentTicks: [],
    claimedMilestones: [],
    settings: {
      notificationLevel: "moderate",
    },
    gold: 10,
    discoveredSpecies: [],
    activeQuest: null,
    sessionUpgradeCount: 0,
    currentSessionId: "",
  };
}

function migrateV3toV4(raw: Record<string, unknown>): GameState {
  const state = raw as unknown as GameState & { collection: any[]; nearby: any[] };

  // Add speciesId, archived to collection creatures, remove rarity from slots, add color to slots
  if (Array.isArray(state.collection)) {
    for (const creature of state.collection) {
      if (!creature.speciesId) creature.speciesId = "compi";
      if (creature.archived === undefined) creature.archived = false;
      delete (creature as any).color;
      if (Array.isArray(creature.slots)) {
        for (const slot of creature.slots) {
          delete (slot as any).rarity;
          if (!slot.color) slot.color = "white";
        }
      }
    }
  }

  // Add speciesId to nearby creatures, remove rarity from slots, add color to slots
  if (Array.isArray(state.nearby)) {
    for (const creature of state.nearby) {
      if (!creature.speciesId) creature.speciesId = "compi";
      delete (creature as any).color;
      if (Array.isArray(creature.slots)) {
        for (const slot of creature.slots) {
          delete (slot as any).rarity;
          if (!slot.color) slot.color = "white";
        }
      }
    }
  }

  // Add archive if missing
  if (!Array.isArray(state.archive)) {
    (state as any).archive = [];
  }

  state.version = 4;
  return state as unknown as GameState;
}

function migrateV4toV5(raw: Record<string, unknown>): GameState {
  const state = raw as unknown as GameState;

  // Add new profile fields
  if (!state.profile) (state as any).profile = {};
  if ((state.profile as any).totalUpgrades === undefined) (state.profile as any).totalUpgrades = 0;
  if ((state.profile as any).totalQuests === undefined) (state.profile as any).totalQuests = 0;

  // Add new top-level fields
  if ((state as any).gold === undefined) (state as any).gold = 10;
  if ((state as any).discoveredSpecies === undefined) (state as any).discoveredSpecies = [];
  if ((state as any).activeQuest === undefined) (state as any).activeQuest = null;
  if ((state as any).sessionUpgradeCount === undefined) (state as any).sessionUpgradeCount = 0;
  if ((state as any).currentSessionId === undefined) (state as any).currentSessionId = "";

  state.version = 5;
  return state;
}

export class StateManager {
  constructor(private filePath: string) {}

  load(): GameState {
    try {
      const data = fs.readFileSync(this.filePath, "utf-8");
      const raw = JSON.parse(data) as Record<string, unknown>;
      const version = raw.version as number;
      if (version === 3) {
        logger.info("Migrating state from v3 to v4", { path: this.filePath });
        const v4 = migrateV3toV4(raw);
        logger.info("Migrating state from v4 to v5", { path: this.filePath });
        return migrateV4toV5(v4 as unknown as Record<string, unknown>);
      }
      if (version === 4) {
        logger.info("Migrating state from v4 to v5", { path: this.filePath });
        return migrateV4toV5(raw);
      }
      if (version !== 5) {
        logger.info("Incompatible state version, creating fresh state", { path: this.filePath });
        return defaultState();
      }
      // Backfill lastSpawnAt for existing v5 states
      const state = raw as unknown as GameState;
      if (state.lastSpawnAt === undefined) {
        (state as any).lastSpawnAt = 0;
      }
      // Backfill color to slots for existing v4 states; remove creature-level color
      for (const list of [state.collection, state.nearby, state.archive]) {
        if (Array.isArray(list)) {
          for (const c of list as any[]) {
            delete c.color;
            if (Array.isArray(c.slots)) {
              for (const slot of c.slots) {
                if (!slot.color) slot.color = "white";
              }
            }
          }
        }
      }
      return state;
    } catch (err: unknown) {
      const errObj = err as Record<string, unknown>;
      const isNotFound = errObj && errObj.code === "ENOENT";
      if (isNotFound) {
        logger.info("No state file found, creating default state", { path: this.filePath });
      } else {
        logger.error("Failed to load state, resetting to default", {
          path: this.filePath,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      return defaultState();
    }
  }

  save(state: GameState): void {
    try {
      const dir = path.dirname(this.filePath);
      fs.mkdirSync(dir, { recursive: true });
      const tmp = this.filePath + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
      try {
        fs.renameSync(tmp, this.filePath);
      } catch {
        fs.writeFileSync(this.filePath, JSON.stringify(state, null, 2), "utf-8");
        try { fs.unlinkSync(tmp); } catch { /* ignore */ }
      }
    } catch (err: unknown) {
      logger.error("Failed to save state", {
        path: this.filePath,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

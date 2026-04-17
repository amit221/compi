import * as fs from "fs";
import * as path from "path";
import { GameState } from "../types";
import { loadConfig } from "../config/loader";
import { logger } from "../logger";

function defaultState(): GameState {
  const today = new Date().toISOString().split("T")[0];
  return {
    version: 7,
    profile: {
      level: 1,
      xp: 0,
      totalCatches: 0,
      totalMerges: 0,
      totalTicks: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: today,
    },
    collection: [],
    energy: loadConfig().energy.startingEnergy,
    lastEnergyGainAt: Date.now(),
    nearby: [],
    batch: null,
    lastSpawnAt: 0,
    recentTicks: [],
    claimedMilestones: [],
    settings: {
      notificationLevel: "moderate",
    },
    discoveredSpecies: [],
    currentSessionId: "",
    speciesProgress: {},
    personalSpecies: [],
    sessionBreedCount: 0,
    breedCooldowns: {},
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

  // Add archive if missing (v4 intermediate field, removed in v7)
  if (!Array.isArray((state as any).archive)) {
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

function migrateV5toV6(raw: Record<string, unknown>): GameState {
  const state = raw as any;

  // Strip _rN suffix from variantId, set rarity field on all creature slots
  for (const list of [state.collection, state.nearby, state.archive]) {
    if (Array.isArray(list)) {
      for (const creature of list) {
        if (Array.isArray(creature.slots)) {
          for (const slot of creature.slots) {
            const match = slot.variantId?.match(/_r(\d+)$/);
            if (match) {
              slot.rarity = parseInt(match[1], 10);
              slot.variantId = slot.variantId.replace(/_r\d+$/, "");
            } else {
              slot.rarity = slot.rarity ?? 0;
            }
            // Update color to match new 8-color rarity system
            const RARITY_TO_COLOR = ["grey", "white", "green", "cyan", "blue", "magenta", "yellow", "red"];
            slot.color = RARITY_TO_COLOR[Math.min(slot.rarity, 7)] || "grey";
          }
        }
      }
    }
  }

  // Remove old fields
  delete state.gold;
  delete state.activeQuest;
  delete state.sessionUpgradeCount;
  if (state.profile) {
    delete state.profile.totalUpgrades;
    delete state.profile.totalQuests;
  }

  // Initialize speciesProgress from existing collection + archive
  const progress: Record<string, boolean[]> = {};
  for (const list of [state.collection, state.archive]) {
    if (Array.isArray(list)) {
      for (const creature of list) {
        const sid = creature.speciesId;
        if (!sid) continue;
        if (!progress[sid]) progress[sid] = Array(8).fill(false);
        for (const slot of creature.slots || []) {
          const r = slot.rarity ?? 0;
          if (r >= 0 && r < 8) progress[sid][r] = true;
        }
      }
    }
  }
  state.speciesProgress = progress;

  // Add new fields
  state.personalSpecies = state.personalSpecies || [];
  state.sessionBreedCount = 0;
  state.breedCooldowns = {};

  state.version = 6;
  return state as GameState;
}

function migrateV6toV7(raw: Record<string, unknown>): GameState {
  const state = raw as any;

  // Move all archived creatures into collection with archived = false
  if (Array.isArray(state.archive)) {
    for (const creature of state.archive) {
      creature.archived = false;
      state.collection.push(creature);
    }
  }
  delete state.archive;

  state.version = 7;
  return state as GameState;
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
        const v5 = migrateV4toV5(v4 as unknown as Record<string, unknown>);
        logger.info("Migrating state from v5 to v6", { path: this.filePath });
        const v6 = migrateV5toV6(v5 as unknown as Record<string, unknown>);
        logger.info("Migrating state from v6 to v7", { path: this.filePath });
        return migrateV6toV7(v6 as unknown as Record<string, unknown>);
      }
      if (version === 4) {
        logger.info("Migrating state from v4 to v5", { path: this.filePath });
        const v5 = migrateV4toV5(raw);
        logger.info("Migrating state from v5 to v6", { path: this.filePath });
        const v6 = migrateV5toV6(v5 as unknown as Record<string, unknown>);
        logger.info("Migrating state from v6 to v7", { path: this.filePath });
        return migrateV6toV7(v6 as unknown as Record<string, unknown>);
      }
      if (version === 5) {
        logger.info("Migrating state from v5 to v6", { path: this.filePath });
        const v6 = migrateV5toV6(raw);
        logger.info("Migrating state from v6 to v7", { path: this.filePath });
        return migrateV6toV7(v6 as unknown as Record<string, unknown>);
      }
      if (version === 6) {
        logger.info("Migrating state from v6 to v7", { path: this.filePath });
        return migrateV6toV7(raw);
      }
      if (version !== 7) {
        logger.info("Incompatible state version, creating fresh state", { path: this.filePath });
        return defaultState();
      }
      // Backfill lastSpawnAt for existing v7 states
      const state = raw as unknown as GameState;
      if (state.lastSpawnAt === undefined) {
        (state as any).lastSpawnAt = 0;
      }
      // Ensure v7 fields are present (backfill for states that may be missing them)
      if (!state.speciesProgress) (state as any).speciesProgress = {};
      if (!state.personalSpecies) (state as any).personalSpecies = [];
      if (state.sessionBreedCount === undefined) (state as any).sessionBreedCount = 0;
      if (!state.breedCooldowns) (state as any).breedCooldowns = {};
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

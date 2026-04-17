import { GameState, Tick, TickResult, ScanResult, ScanEntry, CatchResult, BreedPreview, BreedResult, ArchiveResult, StatusResult, Notification, BreedTable, AdvisorContext } from "../types";
import { processNewTick } from "./ticks";
import { spawnBatch, cleanupBatch } from "./batch";
import { attemptCatch, calculateCatchRate, calculateEnergyCost } from "./catch";
import { processEnergyGain, processSessionEnergyBonus } from "./energy";
import { previewBreed, executeBreed, buildBreedTable } from "./breed";
import { archiveCreature, releaseCreature, isCollectionFull } from "./archive";
import { SPAWN_INTERVAL_MS } from "../config/constants";
import { recordDiscovery } from "./discovery";
import { grantXp } from "./progression";
import { loadConfig } from "../config/loader";
import { buildAdvisorContext } from "./advisor";
import { getSpeciesIndex, SpeciesIndexEntry } from "./species-index";

export class GameEngine {
  private state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  processTick(tick: Tick, rng: () => number = Math.random): TickResult {
    const notifications: Notification[] = [];

    processNewTick(this.state, tick);

    // Grant session energy bonus if this tick carries a new session ID.
    const sessionId = tick.sessionId ?? String(tick.timestamp);
    const isNewSession = this.state.currentSessionId !== sessionId;
    processSessionEnergyBonus(this.state, sessionId);

    if (isNewSession) {
      this.state.sessionBreedCount = 0;
      const now = Date.now();
      for (const key of Object.keys(this.state.breedCooldowns)) {
        if (this.state.breedCooldowns[key] <= now) delete this.state.breedCooldowns[key];
      }
    }

    const energyGained = processEnergyGain(this.state, tick.timestamp);

    const despawned = cleanupBatch(this.state, tick.timestamp);

    let spawned = false;
    const timeSinceLastSpawn = tick.timestamp - this.state.lastSpawnAt;
    if (!this.state.batch && timeSinceLastSpawn >= SPAWN_INTERVAL_MS) {
      const creatures = spawnBatch(this.state, tick.timestamp, rng);
      if (creatures.length > 0) {
        spawned = true;
        this.state.lastSpawnAt = tick.timestamp;
        notifications.push({ message: `${creatures.length} creatures appeared nearby!`, level: "moderate" });
      }
    }

    return { notifications, spawned, energyGained, despawned };
  }

  scan(rng: () => number = Math.random): ScanResult {
    // If no creatures nearby, spawn a fresh batch
    if (this.state.nearby.length === 0) {
      spawnBatch(this.state, Date.now(), rng);
    } else if (this.state.nearby.length > 1) {
      // Player scanned again without catching — previous creature "escaped", show next
      this.state.nearby.shift();
    }
    // If only 1 left and player scans again, keep showing it (don't remove the last one)

    // Return only the first creature — one at a time
    const nearby: ScanEntry[] = this.state.nearby.slice(0, 1).map((creature, i) => ({
      index: i,
      creature,
      catchRate: calculateCatchRate(creature.speciesId, creature.slots, this.state.batch?.failPenalty ?? 0),
      energyCost: calculateEnergyCost(creature.speciesId, creature.slots),
    }));

    const now = Date.now();
    const timeSinceSpawn = now - this.state.lastSpawnAt;
    const nextBatchInMs = Math.max(0, SPAWN_INTERVAL_MS - timeSinceSpawn);
    return { nearby, energy: this.state.energy, batch: this.state.batch, nextBatchInMs };
  }

  catch(nearbyIndex: number, rng: () => number = Math.random): CatchResult {
    if (isCollectionFull(this.state)) {
      throw new Error("Collection is full (15 creatures). Archive or release a creature first.");
    }
    const result = attemptCatch(this.state, nearbyIndex, rng);
    if (result.success) {
      const config = loadConfig();
      grantXp(this.state, config.leveling.xpPerCatch);
      const discovery = recordDiscovery(this.state, result.creature.speciesId);
      if (discovery.isNew) {
        result.discovery = discovery;
      }
    }
    return result;
  }

  breedPreview(parentAId: string, parentBId: string): BreedPreview {
    return previewBreed(this.state, parentAId, parentBId);
  }

  breedExecute(parentAId: string, parentBId: string, rng: () => number = Math.random): BreedResult {
    return executeBreed(this.state, parentAId, parentBId, rng);
  }

  buildBreedTable(): BreedTable {
    return buildBreedTable(this.state);
  }

  archive(creatureId: string): ArchiveResult {
    return archiveCreature(this.state, creatureId);
  }

  release(creatureId: string): void {
    return releaseCreature(this.state, creatureId);
  }

  status(): StatusResult {
    return {
      profile: this.state.profile,
      collectionCount: this.state.collection.length,
      archiveCount: ((this.state as any).archive ?? []).length,
      energy: this.state.energy,
      nearbyCount: this.state.nearby.length,
      batchAttemptsRemaining: this.state.batch?.attemptsRemaining ?? 0,
      discoveredCount: this.state.discoveredSpecies.length,
      speciesProgress: this.state.speciesProgress,
    };
  }

  species(): SpeciesIndexEntry[] {
    return getSpeciesIndex(this.state.speciesProgress);
  }

  getDiscoveredSpecies(): string[] {
    return [...this.state.discoveredSpecies];
  }

  getAdvisorContext(action: string, result: unknown): AdvisorContext {
    return buildAdvisorContext(action, result, this.state);
  }

  getState(): GameState {
    return this.state;
  }
}

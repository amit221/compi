import { GameState, Tick, TickResult, ScanResult, ScanEntry, CatchResult, BreedPreview, BreedResult, ArchiveResult, StatusResult, Notification } from "../types";
import { processNewTick } from "./ticks";
import { spawnBatch, cleanupBatch } from "./batch";
import { attemptCatch, calculateCatchRate, calculateEnergyCost } from "./catch";
import { processEnergyGain } from "./energy";
import { previewBreed, executeBreed } from "./breed";
import { archiveCreature, releaseCreature, isCollectionFull } from "./archive";
import { TICKS_PER_SPAWN_CHECK, SPAWN_PROBABILITY } from "../config/constants";

export class GameEngine {
  private state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  processTick(tick: Tick, rng: () => number = Math.random): TickResult {
    const notifications: Notification[] = [];

    processNewTick(this.state, tick);

    const energyGained = processEnergyGain(this.state, tick.timestamp);

    const despawned = cleanupBatch(this.state, tick.timestamp);

    let spawned = false;
    if (!this.state.batch && this.state.profile.totalTicks % TICKS_PER_SPAWN_CHECK === 0) {
      if (rng() < SPAWN_PROBABILITY) {
        const creatures = spawnBatch(this.state, tick.timestamp, rng);
        if (creatures.length > 0) {
          spawned = true;
          notifications.push({ message: `${creatures.length} creatures appeared nearby!`, level: "moderate" });
        }
      }
    }

    return { notifications, spawned, energyGained, despawned };
  }

  scan(rng: () => number = Math.random): ScanResult {
    // Auto-spawn if no creatures nearby
    if (this.state.nearby.length === 0) {
      spawnBatch(this.state, Date.now(), rng);
    }
    const nearby: ScanEntry[] = this.state.nearby.map((creature, index) => ({
      index,
      creature,
      catchRate: calculateCatchRate(creature.speciesId, creature.slots, this.state.batch?.failPenalty ?? 0),
      energyCost: calculateEnergyCost(creature.speciesId, creature.slots),
    }));
    return { nearby, energy: this.state.energy, batch: this.state.batch };
  }

  catch(nearbyIndex: number, rng: () => number = Math.random): CatchResult {
    if (isCollectionFull(this.state)) {
      throw new Error("Collection is full (15 creatures). Archive or release a creature first.");
    }
    return attemptCatch(this.state, nearbyIndex, rng);
  }

  breedPreview(parentAId: string, parentBId: string): BreedPreview {
    return previewBreed(this.state, parentAId, parentBId);
  }

  breedExecute(parentAId: string, parentBId: string, rng: () => number = Math.random): BreedResult {
    return executeBreed(this.state, parentAId, parentBId, rng);
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
      archiveCount: this.state.archive.length,
      energy: this.state.energy,
      nearbyCount: this.state.nearby.length,
      batchAttemptsRemaining: this.state.batch?.attemptsRemaining ?? 0,
    };
  }

  getState(): GameState {
    return this.state;
  }
}

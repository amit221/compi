import {
  GameState,
  Tick,
  ScanResult,
  CatchResult,
  EvolveResult,
  StatusResult,
  TickResult,
  Notification,
  CreatureDefinition,
  ItemDefinition,
} from "../types";
import { getCreatureMap, getSpawnableCreatures, CREATURES } from "../config/creatures";
import { getItemMap } from "../config/items";
import { processNewTick } from "./ticks";
import { processSpawns, cleanupDespawned } from "./spawn";
import { attemptCatch } from "./catch";
import { evolveCreature } from "./evolution";
import { processPassiveDrip, checkMilestones } from "./inventory";

export class GameEngine {
  private creatures: Map<string, CreatureDefinition>;
  private items: Map<string, ItemDefinition>;

  constructor(private state: GameState) {
    this.creatures = getCreatureMap();
    this.items = getItemMap();
  }

  processTick(tick: Tick, rng: () => number = Math.random): TickResult {
    const now = tick.timestamp;
    const notifications: Notification[] = [];

    processNewTick(this.state, tick);

    const despawned = cleanupDespawned(this.state, now);
    for (const id of despawned) {
      const c = this.creatures.get(id);
      notifications.push({
        type: "despawn",
        message: `${c?.name || id} slipped away...`,
      });
    }

    const spawned = processSpawns(this.state, now, rng);
    for (const c of spawned) {
      const isRare = c.rarity === "rare" || c.rarity === "epic" || c.rarity === "legendary";
      notifications.push({
        type: isRare ? "rare_spawn" : "spawn",
        message: isRare
          ? "Rare signal detected!"
          : "Something flickering nearby...",
      });
    }

    const itemsEarned = processPassiveDrip(this.state, rng);

    if (!this.state.claimedMilestones) {
      this.state.claimedMilestones = [];
    }
    const milestoneItems = checkMilestones(this.state, this.state.claimedMilestones);
    itemsEarned.push(...milestoneItems);

    if (milestoneItems.length > 0) {
      const itemNames = milestoneItems.map((i) => `${i.count}x ${i.item.name}`).join(", ");
      notifications.push({
        type: "milestone",
        message: `Milestone reward! +${itemNames}`,
      });
    }

    for (const entry of this.state.collection) {
      if (entry.evolved) continue;
      const creature = this.creatures.get(entry.creatureId);
      if (!creature?.evolution) continue;
      if (entry.fragments >= creature.evolution.fragmentCost) {
        notifications.push({
          type: "evolution_ready",
          message: `${creature.name} has enough fragments to evolve!`,
        });
      }
    }

    return {
      notifications,
      spawned,
      itemsEarned,
      despawned: despawned.map((id) => this.creatures.get(id)?.name || id),
    };
  }

  scan(): ScanResult {
    const now = Date.now();
    cleanupDespawned(this.state, now);

    return {
      nearby: this.state.nearby.map((n, i) => {
        const creature = this.creatures.get(n.creatureId)!;
        return {
          index: i,
          creature,
          spawnedAt: n.spawnedAt,
          catchRate: creature.baseCatchRate,
        };
      }),
    };
  }

  catch(
    nearbyIndex: number,
    itemId: string,
    rng: () => number = Math.random
  ): CatchResult {
    return attemptCatch(this.state, nearbyIndex, itemId, this.creatures, this.items, rng);
  }

  evolve(creatureId: string): EvolveResult {
    return evolveCreature(this.state, creatureId, this.creatures);
  }

  status(): StatusResult {
    return {
      profile: { ...this.state.profile },
      collectionCount: this.state.collection.length,
      totalCreatures: CREATURES.length,
      nearbyCount: this.state.nearby.length,
    };
  }

  getState(): GameState {
    return this.state;
  }
}

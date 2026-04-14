import { GameState, CollectionCreature, SlotId, MAX_COLLECTION_SIZE } from "../types";
import { GameEngine } from "../engine/game-engine";
import { loadConfig } from "../config/loader";
import { SimulationConfig, SimulationResult, SimAction, StrategyName, ActionType } from "./types";
import { makeRng, makeDefaultState } from "./helpers";

// --- Breed pair helper ---

function findBreedPairs(state: GameState): Array<[CollectionCreature, CollectionCreature]> {
  const active = state.collection.filter((c) => !c.archived);
  // Group by speciesId
  const bySpecies = new Map<string, CollectionCreature[]>();
  for (const c of active) {
    const group = bySpecies.get(c.speciesId) ?? [];
    group.push(c);
    bySpecies.set(c.speciesId, group);
  }
  const pairs: Array<[CollectionCreature, CollectionCreature]> = [];
  for (const group of bySpecies.values()) {
    // Filter out creatures on quest
    const available = group.filter(
      (c) => !state.activeQuest || !state.activeQuest.creatureIds.includes(c.id)
    );
    if (available.length >= 2) {
      pairs.push([available[0], available[1]]);
    }
  }
  return pairs;
}

// --- Upgrade candidates helper ---

function findUpgradeCandidates(
  state: GameState
): Array<{ creature: CollectionCreature; slotId: SlotId; rank: number }> {
  const config = loadConfig();
  const maxRank = config.upgrade.maxRank;
  const candidates: Array<{ creature: CollectionCreature; slotId: SlotId; rank: number }> = [];

  for (const creature of state.collection) {
    if (creature.archived) continue;
    if (state.activeQuest && state.activeQuest.creatureIds.includes(creature.id)) continue;
    for (const slot of creature.slots) {
      const rankMatch = slot.variantId.match(/_r(\d+)$/);
      const rank = rankMatch ? parseInt(rankMatch[1], 10) : 0;
      if (rank < maxRank) {
        const cost = config.upgrade.costs[rank];
        if (state.gold >= cost && state.sessionUpgradeCount < config.upgrade.sessionCap) {
          candidates.push({ creature, slotId: slot.slotId, rank });
        }
      }
    }
  }
  return candidates;
}

// --- Strategy types ---

type StrategyDecision = { type: ActionType; detail?: string } | null;
type StrategyFn = (
  state: GameState,
  engine: GameEngine,
  rng: () => number
) => StrategyDecision;

// --- Strategy: random ---

function randomStrategy(state: GameState, engine: GameEngine, rng: () => number): StrategyDecision {
  const actions: Array<() => StrategyDecision> = [];

  // catch
  if (state.nearby.length > 0 && state.collection.length < MAX_COLLECTION_SIZE) {
    actions.push(() => ({
      type: "catch" as ActionType,
      detail: `nearby:${state.nearby.length}`,
    }));
  }

  // breed
  if (state.collection.length < MAX_COLLECTION_SIZE) {
    const pairs = findBreedPairs(state);
    if (pairs.length > 0) {
      actions.push(() => ({ type: "breed" as ActionType, detail: `pairs:${pairs.length}` }));
    }
  }

  // upgrade
  const upgradeCandidates = findUpgradeCandidates(state);
  if (upgradeCandidates.length > 0) {
    actions.push(() => ({ type: "upgrade" as ActionType, detail: `candidates:${upgradeCandidates.length}` }));
  }

  // quest_start
  if (!state.activeQuest && state.collection.length > 0) {
    actions.push(() => ({ type: "quest_start" as ActionType, detail: "send_quest" }));
  }

  // archive (if collection getting full)
  if (state.collection.length >= MAX_COLLECTION_SIZE) {
    actions.push(() => ({ type: "archive" as ActionType, detail: "collection_full" }));
  }

  // scan
  actions.push(() => ({ type: "scan" as ActionType, detail: "look_around" }));

  if (actions.length === 0) return { type: "idle" };

  const idx = Math.floor(rng() * actions.length);
  return actions[idx]();
}

// --- Strategy: greedy ---

function greedyStrategy(state: GameState, engine: GameEngine, _rng: () => number): StrategyDecision {
  // Priority: catch > upgrade > breed > quest > archive

  // 1. catch
  if (state.nearby.length > 0 && state.collection.length < MAX_COLLECTION_SIZE) {
    return { type: "catch", detail: `nearby:${state.nearby.length}` };
  }

  // 2. upgrade
  const upgradeCandidates = findUpgradeCandidates(state);
  if (upgradeCandidates.length > 0) {
    return { type: "upgrade", detail: `candidates:${upgradeCandidates.length}` };
  }

  // 3. breed
  if (state.collection.length < MAX_COLLECTION_SIZE) {
    const pairs = findBreedPairs(state);
    if (pairs.length > 0) {
      return { type: "breed", detail: `pairs:${pairs.length}` };
    }
  }

  // 4. quest
  if (!state.activeQuest && state.collection.length > 0) {
    return { type: "quest_start", detail: "send_quest" };
  }

  // 5. archive if full
  if (state.collection.length >= MAX_COLLECTION_SIZE) {
    return { type: "archive", detail: "collection_full" };
  }

  // 6. scan to get creatures
  return { type: "scan", detail: "look_around" };
}

// --- Strategy: passive ---

function passiveStrategy(state: GameState, engine: GameEngine, _rng: () => number): StrategyDecision {
  // Only catches, never breeds/upgrades/quests
  if (state.nearby.length > 0 && state.collection.length < MAX_COLLECTION_SIZE) {
    return { type: "catch", detail: `nearby:${state.nearby.length}` };
  }

  // Archive if full to free space
  if (state.collection.length >= MAX_COLLECTION_SIZE) {
    return { type: "archive", detail: "collection_full" };
  }

  return { type: "scan", detail: "look_around" };
}

const STRATEGIES: Record<StrategyName, StrategyFn> = {
  random: randomStrategy,
  greedy: greedyStrategy,
  passive: passiveStrategy,
};

// --- GameSimulator class ---

export class GameSimulator {
  constructor(private readonly config: SimulationConfig) {}

  runAll(): SimulationResult[] {
    const results: SimulationResult[] = [];
    for (let i = 0; i < this.config.runs; i++) {
      results.push(this.runOne(this.config.seed + i));
    }
    return results;
  }

  private runOne(seed: number): SimulationResult {
    const rng = makeRng(seed);
    const state = makeDefaultState();
    const engine = new GameEngine(state);
    const strategyFn = STRATEGIES[this.config.strategy];
    const actions: SimAction[] = [];
    const balanceConfig = loadConfig();
    const spawnIntervalMs = balanceConfig.batch.spawnIntervalMs;

    for (let tick = 0; tick < this.config.ticksPerGame; tick++) {
      const now = (tick + 1) * spawnIntervalMs;

      // Change session every 10 ticks
      if (tick % 10 === 0) {
        state.sessionUpgradeCount = 0;
        state.currentSessionId = `sim-session-${Math.floor(tick / 10)}`;
      }

      // Process the tick
      try {
        engine.processTick({ timestamp: now, sessionId: state.currentSessionId }, rng);
      } catch (err) {
        actions.push({
          tick,
          type: "idle",
          detail: `processTick error: ${err instanceof Error ? err.message : String(err)}`,
          success: false,
        });
        continue;
      }

      // Get strategy decision
      const decision = strategyFn(state, engine, rng);
      if (!decision || decision.type === "idle") {
        actions.push({ tick, type: "idle", detail: "no_action", success: true });
        continue;
      }

      // Execute the decision
      const action = this.executeAction(decision.type, state, engine, rng, tick, decision.detail ?? "");
      actions.push(action);
    }

    return {
      seed,
      strategy: this.config.strategy,
      ticks: this.config.ticksPerGame,
      actions,
      violations: [],
      finalState: engine.getState(),
    };
  }

  private executeAction(
    type: ActionType,
    state: GameState,
    engine: GameEngine,
    rng: () => number,
    tick: number,
    detail: string
  ): SimAction {
    try {
      switch (type) {
        case "scan": {
          engine.scan(rng);
          return { tick, type, detail, success: true };
        }

        case "catch": {
          if (state.nearby.length === 0) {
            engine.scan(rng);
          }
          if (state.nearby.length === 0) {
            return { tick, type, detail: "no_nearby_after_scan", success: false };
          }
          if (state.collection.length >= MAX_COLLECTION_SIZE) {
            return { tick, type, detail: "collection_full", success: false };
          }
          const idx = Math.floor(rng() * state.nearby.length);
          const result = engine.catch(idx, rng);
          return {
            tick,
            type,
            detail: `caught:${result.success} species:${result.creature.speciesId}`,
            success: result.success,
          };
        }

        case "breed": {
          if (state.collection.length >= MAX_COLLECTION_SIZE) {
            return { tick, type, detail: "collection_full", success: false };
          }
          const pairs = findBreedPairs(state);
          if (pairs.length === 0) {
            return { tick, type, detail: "no_pairs", success: false };
          }
          const pairIdx = Math.floor(rng() * pairs.length);
          const [parentA, parentB] = pairs[pairIdx];
          const breedResult = engine.breedExecute(parentA.id, parentB.id, rng);
          return {
            tick,
            type,
            detail: `child:${breedResult.child.id} species:${breedResult.child.speciesId} gen:${breedResult.child.generation}`,
            success: true,
          };
        }

        case "upgrade": {
          const candidates = findUpgradeCandidates(state);
          if (candidates.length === 0) {
            return { tick, type, detail: "no_candidates", success: false };
          }
          const candIdx = Math.floor(rng() * candidates.length);
          const { creature, slotId, rank } = candidates[candIdx];
          const upgradeResult = engine.upgrade(creature.id, slotId);
          return {
            tick,
            type,
            detail: `creature:${creature.id} slot:${slotId} rank:${rank}->${upgradeResult.toRank}`,
            success: true,
          };
        }

        case "quest_start": {
          if (state.activeQuest) {
            return { tick, type, detail: "already_on_quest", success: false };
          }
          const available = state.collection.filter((c) => !c.archived);
          if (available.length === 0) {
            return { tick, type, detail: "no_creatures", success: false };
          }
          const config = loadConfig();
          const teamSize = Math.min(available.length, config.quest.maxTeamSize);
          const team = available.slice(0, teamSize).map((c) => c.id);
          engine.questStart(team);
          return {
            tick,
            type,
            detail: `team_size:${teamSize}`,
            success: true,
          };
        }

        case "quest_check": {
          const questResult = engine.questCheck();
          return {
            tick,
            type,
            detail: questResult ? `completed gold:${questResult.goldEarned}` : "in_progress",
            success: true,
          };
        }

        case "archive": {
          const active = state.collection.filter((c) => !c.archived);
          if (active.length === 0) {
            return { tick, type, detail: "no_creatures", success: false };
          }
          // Archive the last creature (least recently caught)
          const target = active[active.length - 1];
          engine.archive(target.id);
          return {
            tick,
            type,
            detail: `archived:${target.id}`,
            success: true,
          };
        }

        case "release": {
          const active = state.collection.filter((c) => !c.archived);
          if (active.length === 0) {
            return { tick, type, detail: "no_creatures", success: false };
          }
          const target = active[active.length - 1];
          engine.release(target.id);
          return {
            tick,
            type,
            detail: `released:${target.id}`,
            success: true,
          };
        }

        default:
          return { tick, type: "idle", detail: "unknown_action", success: false };
      }
    } catch (err) {
      return {
        tick,
        type,
        detail: `error: ${err instanceof Error ? err.message : String(err)}`,
        success: false,
      };
    }
  }
}

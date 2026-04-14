import { GameState, ActiveQuest, QuestStartResult, QuestCompleteResult } from "../types";
import { loadConfig } from "../config/loader";
import { earnGold } from "./gold";
import { grantXp } from "./progression";

function generateQuestId(): string {
  return "q_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * Calculate team power as the sum of all trait ranks across all creatures.
 * Rank is extracted from variantId suffix `_rN`.
 */
function calculateTeamPower(state: GameState, creatureIds: string[]): number {
  let total = 0;
  for (const id of creatureIds) {
    const creature = state.collection.find((c) => c.id === id);
    if (!creature) continue;
    for (const slot of creature.slots) {
      const rankMatch = slot.variantId.match(/_r(\d+)$/);
      total += rankMatch ? parseInt(rankMatch[1], 10) : 0;
    }
  }
  return total;
}

/**
 * Calculate gold reward for a quest based on total team power.
 * reward = max(floor, floor(teamPower * multiplier))
 */
export function calculateQuestReward(teamPower: number): number {
  const config = loadConfig();
  return Math.max(
    config.quest.rewardFloor,
    Math.floor(teamPower * config.quest.rewardMultiplier)
  );
}

/**
 * Start a quest with the given creature IDs.
 * Validates: no active quest, creatures exist, not archived, within team size limit.
 * Locks creatures by setting activeQuest on state.
 */
export function startQuest(
  state: GameState,
  creatureIds: string[]
): QuestStartResult {
  const config = loadConfig();

  if (state.activeQuest) {
    throw new Error("Already on a quest. Wait for the current quest to complete.");
  }

  if (creatureIds.length === 0) {
    throw new Error("Must send at least 1 creature on a quest.");
  }

  if (creatureIds.length > config.quest.maxTeamSize) {
    throw new Error(
      `Max team size is ${config.quest.maxTeamSize}, got ${creatureIds.length}`
    );
  }

  // Validate all creatures exist and are not archived
  for (const id of creatureIds) {
    const creature = state.collection.find((c) => c.id === id);
    if (!creature) {
      throw new Error(`Creature not found: ${id}`);
    }
    if (creature.archived) {
      throw new Error(`Creature is archived and cannot quest: ${id}`);
    }
  }

  const teamPower = calculateTeamPower(state, creatureIds);

  const quest: ActiveQuest = {
    id: generateQuestId(),
    creatureIds: [...creatureIds],
    startedAtSession: 0, // will be tracked by session ID
    sessionsRemaining: config.quest.lockDurationSessions,
    teamPower,
  };

  state.activeQuest = quest;

  const creatures = creatureIds.map(id => {
    const c = state.collection.find(cr => cr.id === id)!;
    return { name: c.name, speciesId: c.speciesId, slots: c.slots };
  });

  return {
    quest,
    creaturesLocked: [...creatureIds],
    creatures,
  };
}

/**
 * Check/advance the active quest. Called once per session.
 * - Decrements sessionsRemaining
 * - If 0, completes the quest: awards gold + XP, clears activeQuest
 * - Returns QuestCompleteResult on completion, null otherwise
 */
export function checkQuest(state: GameState): QuestCompleteResult | null {
  if (!state.activeQuest) {
    return null;
  }

  state.activeQuest.sessionsRemaining--;

  if (state.activeQuest.sessionsRemaining > 0) {
    return null;
  }

  // Quest complete
  const config = loadConfig();
  const quest = state.activeQuest;
  const goldReward = calculateQuestReward(quest.teamPower);

  earnGold(state, goldReward);
  grantXp(state, config.leveling.xpPerQuest);
  state.profile.totalQuests++;
  state.activeQuest = null;

  const creatures = quest.creatureIds.map(id => {
    const c = state.collection.find(cr => cr.id === id)!;
    return { name: c.name, speciesId: c.speciesId, slots: c.slots };
  });

  return {
    questId: quest.id,
    goldEarned: goldReward,
    xpEarned: config.leveling.xpPerQuest,
    creaturesReturned: [...quest.creatureIds],
    creatures,
  };
}

/**
 * Check if a creature is currently locked on a quest.
 */
export function isOnQuest(state: GameState, creatureId: string): boolean {
  if (!state.activeQuest) return false;
  return state.activeQuest.creatureIds.includes(creatureId);
}

// src/engine/archive.ts — archive and collection cap logic

import { GameState, CollectionCreature, ArchiveResult, MAX_COLLECTION_SIZE } from "../types";

/**
 * Move a creature from the active collection to the archive.
 * Sets archived=true on the creature. One-way operation.
 * Throws if the creature is not found in collection or is already archived.
 */
export function archiveCreature(state: GameState, creatureId: string): ArchiveResult {
  const index = state.collection.findIndex((c) => c.id === creatureId);
  if (index === -1) {
    throw new Error(`Creature not found in collection: ${creatureId}`);
  }

  const creature = state.collection[index];
  if (creature.archived) {
    throw new Error(`Creature is already archived: ${creatureId}`);
  }

  // Remove from collection
  state.collection.splice(index, 1);

  // Mark archived and push to archive
  creature.archived = true;
  state.archive.push(creature);

  return { creature };
}

/**
 * Permanently remove a creature from the collection (gone forever).
 * Throws if the creature is not found in collection.
 */
export function releaseCreature(state: GameState, creatureId: string): void {
  const index = state.collection.findIndex((c) => c.id === creatureId);
  if (index === -1) {
    throw new Error(`Creature not found in collection: ${creatureId}`);
  }

  state.collection.splice(index, 1);
}

/**
 * Returns true if the active (non-archived) collection has reached the cap.
 * The collection array only holds active creatures, so we check its length directly.
 */
export function isCollectionFull(state: GameState): boolean {
  return state.collection.length >= MAX_COLLECTION_SIZE;
}

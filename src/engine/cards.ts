// src/engine/cards.ts — card-based UX engine module

import {
  GameState,
  Card,
  CardRef,
  DrawResult,
  PlayResult,
  CatchCardData,
  BreedCardData,
  SlotUpgradeInfo,
  SlotId,
  CollectionCreature,
} from "../types";
import { calculateCatchRate, calculateEnergyCost, attemptCatch } from "./catch";
import { calculateBreedCost, executeBreed } from "./breed";
import { spendEnergy } from "./energy";
import { grantXp } from "./progression";
import { recordDiscovery } from "./discovery";
import { loadConfig } from "../config/loader";

/**
 * Build pool of all available cards from the current game state.
 */
export function buildPool(state: GameState): Card[] {
  const cards: Card[] = [];
  const config = loadConfig();

  // Catch cards: one per nearby creature if batch is active with attempts remaining
  if (state.batch && state.batch.attemptsRemaining > 0) {
    for (let i = 0; i < state.nearby.length; i++) {
      const creature = state.nearby[i];
      const catchRate = calculateCatchRate(creature.speciesId, creature.slots, state.batch.failPenalty);
      const energyCost = calculateEnergyCost(creature.speciesId, creature.slots);

      const data: CatchCardData = {
        nearbyIndex: i,
        creature,
        catchRate,
        energyCost,
      };

      cards.push({
        id: `catch_${creature.id}`,
        type: "catch",
        label: `Catch ${creature.name}`,
        energyCost,
        data,
      });
    }
  }

  // Breed cards: one per valid pair in collection
  const maxBreedsPerSession = config.breed.maxBreedsPerSession ?? 3;
  if (state.sessionBreedCount < maxBreedsPerSession) {
    const nonArchived: { index: number; creature: CollectionCreature }[] = [];
    for (let i = 0; i < state.collection.length; i++) {
      if (!state.collection[i].archived) {
        nonArchived.push({ index: i, creature: state.collection[i] });
      }
    }

    const now = Date.now();

    for (let a = 0; a < nonArchived.length; a++) {
      for (let b = a + 1; b < nonArchived.length; b++) {
        const parentA = nonArchived[a];
        const parentB = nonArchived[b];

        // Check cooldown
        const key = [parentA.creature.id, parentB.creature.id].sort().join(":");
        const cooldownUntil = state.breedCooldowns[key] ?? 0;
        if (now < cooldownUntil) continue;

        const energyCost = calculateBreedCost(parentA.creature, parentB.creature);
        const isSameSpecies = parentA.creature.speciesId === parentB.creature.speciesId;

        // Build SlotUpgradeInfo[] per slot
        const upgradeChances: SlotUpgradeInfo[] = [];
        const slotIds: SlotId[] = ["eyes", "mouth", "body", "tail"];
        for (const slotId of slotIds) {
          const slotA = parentA.creature.slots.find((s) => s.slotId === slotId);
          const slotB = parentB.creature.slots.find((s) => s.slotId === slotId);
          if (!slotA || !slotB) continue;

          const match = slotA.variantId === slotB.variantId;
          let upgradeChance: number;
          if (match) {
            const sameRarity = slotA.rarity === slotB.rarity;
            upgradeChance = sameRarity
              ? config.breed.sameTraitUpgradeChance ?? 0.35
              : config.breed.sameTraitHigherParentUpgradeChance ?? 0.15;
          } else {
            upgradeChance = isSameSpecies
              ? config.breed.diffTraitSameSpeciesUpgradeChance ?? 0.10
              : config.breed.diffTraitCrossSpeciesUpgradeChance ?? 0.05;
          }

          upgradeChances.push({ slotId, match, upgradeChance });
        }

        const breedData: BreedCardData = {
          parentA: { index: parentA.index, creature: parentA.creature },
          parentB: { index: parentB.index, creature: parentB.creature },
          upgradeChances,
          energyCost,
        };

        cards.push({
          id: `breed_${parentA.creature.id}_${parentB.creature.id}`,
          type: "breed",
          label: `Breed ${parentA.creature.name} + ${parentB.creature.name}`,
          energyCost,
          data: breedData,
        });
      }
    }
  }

  return cards;
}

/**
 * Shuffle an array in-place using Fisher-Yates.
 */
function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Internal helper: draw cards without energy deduction.
 */
function drawCardsFree(state: GameState, rng: () => number = Math.random): DrawResult {
  if (state.energy <= 0) {
    return { cards: [], empty: false, noEnergy: true };
  }

  const pool = buildPool(state);
  if (pool.length === 0) {
    return { cards: [], empty: true, noEnergy: false };
  }

  const catchPool = pool.filter((c) => c.type === "catch");
  const breedPool = pool.filter((c) => c.type === "breed");

  let drawn: Card[];

  // Breed shows ~20% of the time (capped), so catches dominate
  const breedProb = catchPool.length > 0 ? 0.2 : 1.0;
  if (breedPool.length > 0 && rng() < breedProb) {
    // Draw 1 breed card (big layout)
    shuffle(breedPool, rng);
    drawn = [breedPool[0]];
  } else if (catchPool.length > 0) {
    // Draw up to 3 catch cards (shuffled)
    shuffle(catchPool, rng);
    drawn = catchPool.slice(0, 3);
  } else if (breedPool.length > 0) {
    // Fallback: only breed cards available
    shuffle(breedPool, rng);
    drawn = [breedPool[0]];
  } else {
    return { cards: [], empty: true, noEnergy: false };
  }

  // Store CardRefs on state
  state.currentHand = drawn.map((card): CardRef => {
    const ref: CardRef = { id: card.id, type: card.type };
    if (card.type === "catch") {
      ref.nearbyIndex = (card.data as CatchCardData).nearbyIndex;
    } else {
      const bd = card.data as BreedCardData;
      ref.parentIndices = [bd.parentA.index, bd.parentB.index];
    }
    return ref;
  });

  return { cards: drawn, empty: false, noEnergy: false };
}

/**
 * Draw up to 3 cards. Costs 1 energy (turn cost).
 */
export function drawCards(state: GameState, rng: () => number = Math.random): DrawResult {
  if (state.energy < 1) {
    return { cards: [], empty: false, noEnergy: true };
  }

  const pool = buildPool(state);
  if (pool.length === 0) {
    return { cards: [], empty: true, noEnergy: false };
  }

  // Deduct 1 energy for the turn
  spendEnergy(state, 1);

  return drawCardsFree(state, rng);
}

/**
 * Execute a card from the current hand.
 */
export function playCard(
  state: GameState,
  choiceIndex: number,
  rng: () => number = Math.random
): PlayResult {
  if (!state.currentHand || state.currentHand.length === 0) {
    throw new Error("No cards in hand");
  }

  if (choiceIndex < 0 || choiceIndex >= state.currentHand.length) {
    throw new Error(`Invalid choice index: ${choiceIndex}`);
  }

  const cardRef = state.currentHand[choiceIndex];

  if (cardRef.type === "catch") {
    const nearbyIndex = cardRef.nearbyIndex!;
    const catchResult = attemptCatch(state, nearbyIndex, rng);

    if (catchResult.success) {
      grantXp(state, 0); // XP already granted by attemptCatch
      recordDiscovery(state, catchResult.creature.speciesId);
    }

    state.currentHand = undefined;
    const nextDraw = drawCardsFree(state, rng);

    return {
      action: "catch",
      catchResult,
      nextDraw,
    };
  } else {
    const [idxA, idxB] = cardRef.parentIndices!;
    const parentA = state.collection[idxA];
    const parentB = state.collection[idxB];
    const breedResult = executeBreed(state, parentA.id, parentB.id, rng);

    state.currentHand = undefined;
    const nextDraw = drawCardsFree(state, rng);

    return {
      action: "breed",
      breedResult,
      nextDraw,
    };
  }
}

/**
 * Skip the current hand and get a free redraw.
 */
export function skipHand(state: GameState, rng: () => number = Math.random): DrawResult {
  state.currentHand = undefined;
  return drawCardsFree(state, rng);
}

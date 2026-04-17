import compiData from "../../config/species/compi.json";
import flikkData from "../../config/species/flikk.json";
import glichData from "../../config/species/glich.json";
import jinxData from "../../config/species/jinx.json";
import monuData from "../../config/species/monu.json";
import whiskiData from "../../config/species/whiski.json";
import pyraxData from "../../config/species/pyrax.json";
import { SpeciesDefinition, TraitDefinition, SlotId } from "../types";

// Species files are imported statically so the bundled MCP server doesn't
// need filesystem access at runtime. When adding a new species JSON file
// under config/species/, add its import here and append it to SPECIES_DATA.
const SPECIES_DATA: SpeciesDefinition[] = [
  compiData,
  flikkData,
  glichData,
  jinxData,
  monuData,
  whiskiData,
  pyraxData,
] as unknown as SpeciesDefinition[];

let _speciesCache: SpeciesDefinition[] | null = null;
let _speciesById: Map<string, SpeciesDefinition> = new Map();
let _traitIndex: Map<string, Map<string, TraitDefinition>> = new Map(); // speciesId -> variantId -> TraitDefinition

function ensureLoaded(): void {
  if (_speciesCache) return;
  _speciesCache = loadSpecies();
  _speciesById = new Map();
  _traitIndex = new Map();

  for (const species of _speciesCache) {
    _speciesById.set(species.id, species);
    const variantMap = new Map<string, TraitDefinition>();
    for (const slotId of Object.keys(species.traitPools) as SlotId[]) {
      const traits = species.traitPools[slotId];
      if (traits) {
        for (const trait of traits) {
          variantMap.set(trait.id, trait);
        }
      }
    }
    _traitIndex.set(species.id, variantMap);
  }
}

export function loadSpecies(): SpeciesDefinition[] {
  return SPECIES_DATA;
}

export function getSpeciesById(id: string): SpeciesDefinition | undefined {
  ensureLoaded();
  return _speciesById.get(id);
}

/**
 * Register personal/hybrid species into the lookup cache so renderers can find them.
 * Call this after loading state, before rendering.
 */
export function registerPersonalSpecies(species: SpeciesDefinition[]): void {
  ensureLoaded();
  for (const s of species) {
    if (!_speciesById.has(s.id)) {
      _speciesById.set(s.id, s);
    }
  }
}

export function getAllSpecies(): SpeciesDefinition[] {
  ensureLoaded();
  return _speciesCache!;
}

export function pickSpecies(rng: () => number): SpeciesDefinition {
  ensureLoaded();
  const species = _speciesCache!;
  if (species.length === 0) {
    throw new Error("No species loaded");
  }
  const totalWeight = species.reduce((sum, s) => sum + s.spawnWeight, 0);
  let roll = rng() * totalWeight;
  for (const s of species) {
    roll -= s.spawnWeight;
    if (roll <= 0) return s;
  }
  return species[species.length - 1];
}

export function pickTraitForSlot(
  species: SpeciesDefinition,
  slotId: SlotId,
  playerLevel: number,
  rng: () => number
): TraitDefinition {
  const traits = species.traitPools[slotId];
  if (!traits || traits.length === 0) {
    throw new Error(`No traits for slot ${slotId} in species ${species.id}`);
  }
  // Lazy require to avoid circular dependency: species.ts → progression.ts → loader.ts
  const { getTraitRankCap } = require("../engine/progression");
  const rankCap: number = getTraitRankCap(playerLevel);
  const poolSize = traits.length;
  const maxRank = Math.min(rankCap, poolSize - 1);

  // Discrete triangular distribution skewed toward rank 0
  // Weight for rank k = maxRank - k + 1
  // Total weight = (maxRank + 1) * (maxRank + 2) / 2
  const totalWeight = ((maxRank + 1) * (maxRank + 2)) / 2;
  let roll = rng() * totalWeight;
  for (let k = 0; k <= maxRank; k++) {
    roll -= maxRank - k + 1;
    if (roll <= 0) return traits[k];
  }
  return traits[maxRank];
}

export function getTraitDefinition(
  speciesId: string,
  variantId: string
): TraitDefinition | undefined {
  ensureLoaded();
  const variantMap = _traitIndex.get(speciesId);
  if (!variantMap) return undefined;
  return variantMap.get(variantId);
}

/**
 * Returns the rank (0-based index) of a trait variant within its species+slot pool.
 * Pools are ordered by spawnRate descending, so rank 0 = most common.
 * Returns -1 if species, slot, or variant is not found.
 */
export function getTraitRank(
  speciesId: string,
  slotId: SlotId,
  variantId: string
): number {
  ensureLoaded();
  const species = _speciesById.get(speciesId);
  if (!species) return -1;
  const pool = species.traitPools[slotId];
  if (!pool) return -1;
  const index = pool.findIndex((t) => t.id === variantId);
  return index;
}

export function _resetSpeciesCache(): void {
  _speciesCache = null;
  _speciesById = new Map();
  _traitIndex = new Map();
}

import compiData from "../../config/species/compi.json";
import flikkData from "../../config/species/flikk.json";
import glichData from "../../config/species/glich.json";
import jinxData from "../../config/species/jinx.json";
import monuData from "../../config/species/monu.json";
import whiskiData from "../../config/species/whiski.json";
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
  rng: () => number
): TraitDefinition {
  const traits = species.traitPools[slotId];
  if (!traits || traits.length === 0) {
    throw new Error(`No traits for slot ${slotId} in species ${species.id}`);
  }
  const totalWeight = traits.reduce((sum, t) => sum + t.spawnRate, 0);
  let roll = rng() * totalWeight;
  for (const t of traits) {
    roll -= t.spawnRate;
    if (roll <= 0) return t;
  }
  return traits[traits.length - 1];
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

export function _resetSpeciesCache(): void {
  _speciesCache = null;
  _speciesById = new Map();
  _traitIndex = new Map();
}

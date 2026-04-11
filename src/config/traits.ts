import traitsData from "../../config/traits.json";
import namesData from "../../config/names.json";
import { TraitVariant, SlotId } from "../types";

interface TraitsConfig {
  raritySpawnWeights: Record<string, number>;
  slots: Array<{
    id: SlotId;
    variants: Record<string, Array<{ id: string; name: string; art: string }>>;
  }>;
}

const _config = traitsData as unknown as TraitsConfig;
let _byId: Map<string, TraitVariant> | null = null;

function ensureLoaded(): void {
  if (_byId) return;
  _byId = new Map();

  for (const slotRaw of _config.slots) {
    for (const variantList of Object.values(slotRaw.variants)) {
      for (const v of variantList) {
        _byId.set(v.id, { id: v.id, name: v.name, art: v.art });
      }
    }
  }
}

export function getVariantById(id: string): TraitVariant | undefined {
  ensureLoaded();
  return _byId!.get(id);
}

export function loadCreatureName(rng: () => number): string {
  const names: string[] = (namesData as { names: string[] }).names;
  return names[Math.floor(rng() * names.length)];
}

export function _resetTraitsCache(): void {
  _byId = null;
}

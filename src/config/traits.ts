import * as fs from "fs";
import * as path from "path";
import { TraitVariant, SlotId } from "../types";

interface TraitsConfig {
  raritySpawnWeights: Record<string, number>;
  slots: Array<{
    id: SlotId;
    variants: Record<string, Array<{ id: string; name: string; art: string }>>;
  }>;
}

let _config: TraitsConfig | null = null;
let _byId: Map<string, TraitVariant> = new Map();

function ensureLoaded(): void {
  if (_config) return;
  const configPath = path.resolve(__dirname, "../../config/traits.json");
  _config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  _byId = new Map();

  for (const slotRaw of _config!.slots) {
    for (const variantList of Object.values(slotRaw.variants)) {
      for (const v of variantList) {
        _byId.set(v.id, { id: v.id, name: v.name, art: v.art });
      }
    }
  }
}

export function getVariantById(id: string): TraitVariant | undefined {
  ensureLoaded();
  return _byId.get(id);
}

export function loadCreatureName(rng: () => number): string {
  const namesPath = path.resolve(__dirname, "../../config/names.json");
  const data = JSON.parse(fs.readFileSync(namesPath, "utf-8"));
  const names: string[] = data.names;
  return names[Math.floor(rng() * names.length)];
}

export function _resetTraitsCache(): void {
  _config = null;
  _byId = new Map();
}

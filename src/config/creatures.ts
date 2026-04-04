import { CreatureDefinition } from "../types";
import { loadConfig } from "./loader";

const config = loadConfig();

export const CREATURES: CreatureDefinition[] = config.creatures;

export function getCreatureMap(): Map<string, CreatureDefinition> {
  const map = new Map<string, CreatureDefinition>();
  for (const c of CREATURES) {
    map.set(c.id, c);
  }
  return map;
}

export function getSpawnableCreatures(): CreatureDefinition[] {
  return CREATURES.filter((c) => c.baseCatchRate > 0);
}

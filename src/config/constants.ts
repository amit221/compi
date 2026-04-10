import { loadConfig } from "./loader";

const config = loadConfig();

// Batch / Spawning
export const SPAWN_INTERVAL_MS = config.batch.spawnIntervalMs;
export const BATCH_LINGER_MS = config.batch.batchLingerMs;
export const SHARED_ATTEMPTS = config.batch.sharedAttempts;
export const TIME_OF_DAY_RANGES: Record<string, [number, number]> = config.batch.timeOfDay;

// Progression
export const TICK_PRUNE_COUNT = config.progression.tickPruneCount;

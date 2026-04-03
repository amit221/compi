// src/types.ts

// --- Rarity ---

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const RARITY_STARS: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
};

// --- Creatures ---

export interface CreatureArt {
  simple: string[];   // Lines of ASCII art for simple text renderer
  rich: string[];     // Lines of Unicode/box-drawing art for rich terminal
}

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export interface SpawnCondition {
  timeOfDay?: TimeOfDay[];
  minTotalTicks?: number;
}

export interface CreatureDefinition {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  baseCatchRate: number;
  art: CreatureArt;
  spawnCondition: SpawnCondition;
  evolution?: {
    targetId: string;
    fragmentCost: number;
    catalystItemId?: string;
  };
}

// --- Items ---

export type ItemType = "capture" | "catalyst";

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  catchMultiplier?: number;
}

// --- Game State ---

export interface Tick {
  timestamp: number;
  sessionId?: string;
  eventType?: string;
}

export interface NearbyCreature {
  creatureId: string;
  spawnedAt: number;
  failedAttempts: number;
  maxAttempts: number;
}

export interface CollectionEntry {
  creatureId: string;
  fragments: number;
  totalCaught: number;
  firstCaughtAt: number;
  evolved: boolean;
}

export interface PlayerProfile {
  level: number;
  xp: number;
  totalCatches: number;
  totalTicks: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
}

export interface GameSettings {
  renderer: "rich" | "simple" | "browser" | "terminal";
  notificationLevel: "minimal" | "moderate" | "off";
}

export interface GameState {
  version: number;
  profile: PlayerProfile;
  collection: CollectionEntry[];
  inventory: Record<string, number>;
  nearby: NearbyCreature[];
  recentTicks: Tick[];
  claimedMilestones: string[];
  settings: GameSettings;
}

// --- Engine Results ---

export interface ScanResult {
  nearby: Array<{
    index: number;
    creature: CreatureDefinition;
    spawnedAt: number;
    catchRate: number;
    attemptsRemaining?: number;  // New: attempts left for this creature (maxAttempts - failedAttempts)
  }>;
  totalCatchItems?: number;  // New: total count of bytetrap + netsnare + corelock
}

export interface CatchResult {
  success: boolean;
  creature: CreatureDefinition;
  itemUsed: ItemDefinition;
  fragmentsEarned: number;
  totalFragments: number;
  xpEarned: number;
  bonusItem?: { item: ItemDefinition; count: number };
  fled: boolean;
  evolutionReady: boolean;
}

export interface EvolveResult {
  success: boolean;
  from: CreatureDefinition;
  to: CreatureDefinition;
  fragmentsSpent: number;
  catalystUsed?: string;
}

export interface StatusResult {
  profile: PlayerProfile;
  collectionCount: number;
  totalCreatures: number;
  nearbyCount: number;
}

export interface TickResult {
  notifications: Notification[];
  spawned: CreatureDefinition[];
  itemsEarned: Array<{ item: ItemDefinition; count: number }>;
  despawned: string[];
}

export interface Notification {
  type: "spawn" | "rare_spawn" | "despawn" | "milestone" | "evolution_ready";
  message: string;
}

// --- Renderer ---

export interface Renderer {
  renderScan(result: ScanResult): string;
  renderCatch(result: CatchResult): string;
  renderCollection(collection: CollectionEntry[], creatures: Map<string, CreatureDefinition>): string;
  renderInventory(inventory: Record<string, number>, items: Map<string, ItemDefinition>): string;
  renderEvolve(result: EvolveResult): string;
  renderStatus(result: StatusResult): string;
  renderNotification(notification: Notification): string;
}

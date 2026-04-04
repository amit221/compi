// src/types.ts

// --- Rarity (8 tiers, pyramid distribution) ---

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic" | "ancient" | "void";

export const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary", "mythic", "ancient", "void"];

export const RARITY_STARS: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  mythic: 6,
  ancient: 7,
  void: 8,
};

// --- Traits ---

export type TraitSlotId = "eyes" | "mouth" | "tail" | "gills" | "pattern" | "aura";

export const TRAIT_SLOTS: TraitSlotId[] = ["eyes", "mouth", "tail", "gills", "pattern", "aura"];

export type MergeModifierType = "stable" | "volatile" | "catalyst";

export interface MergeModifier {
  type: MergeModifierType;
  value: number;
}

export interface TraitDefinition {
  id: string;
  name: string;
  rarity: Rarity;
  art: string;
  mergeModifier: MergeModifier;
}

export interface TraitSlotConfig {
  slotId: TraitSlotId;
  variants: TraitDefinition[];
}

export interface CatalystSynergy {
  traitA: string;
  traitB: string;
  bonus: number;
}

export interface CreatureTrait {
  slotId: TraitSlotId;
  traitId: string;
  rarity: Rarity;
  mergeModifier: MergeModifier;
}

// --- Time ---

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

// --- Game State ---

export interface Tick {
  timestamp: number;
  sessionId?: string;
  eventType?: string;
}

export interface NearbyCreature {
  id: string;
  traits: CreatureTrait[];
  spawnedAt: number;
}

export interface CollectionCreature {
  id: string;
  traits: CreatureTrait[];
  caughtAt: number;
  generation: number;
  mergedFrom?: [string, string];
}

export interface BatchState {
  attemptsRemaining: number;
  failPenalty: number;
  spawnedAt: number;
}

export interface PlayerProfile {
  level: number;
  xp: number;
  totalCatches: number;
  totalMerges: number;
  totalTicks: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
}

export interface GameSettings {
  renderer: "simple" | "rich" | "browser" | "terminal";
  notificationLevel: "minimal" | "moderate" | "off";
}

export interface GameState {
  version: number;
  profile: PlayerProfile;
  collection: CollectionCreature[];
  energy: number;
  lastEnergyGainAt: number;
  nearby: NearbyCreature[];
  batch: BatchState | null;
  recentTicks: Tick[];
  claimedMilestones: string[];
  settings: GameSettings;
}

// --- Engine Results ---

export interface Notification {
  message: string;
  level: "minimal" | "moderate";
}

export interface ScanEntry {
  index: number;
  creature: NearbyCreature;
  catchRate: number;
  energyCost: number;
}

export interface ScanResult {
  nearby: ScanEntry[];
  energy: number;
  batch: BatchState | null;
}

export interface CatchResult {
  success: boolean;
  creature: NearbyCreature;
  energySpent: number;
  fled: boolean;
  xpEarned: number;
  attemptsRemaining: number;
  failPenalty: number;
}

export interface MergeResult {
  success: boolean;
  parentA: CollectionCreature;
  parentB: CollectionCreature;
  child: CollectionCreature | null;
  mergeRate: number;
  synergyBonuses: CatalystSynergy[];
}

export interface StatusResult {
  profile: PlayerProfile;
  collectionCount: number;
  energy: number;
  nearbyCount: number;
  batchAttemptsRemaining: number;
}

export interface TickResult {
  notifications: Notification[];
  spawned: boolean;
  energyGained: number;
  despawned: string[];
}

// --- Renderer Interface ---

export interface Renderer {
  renderScan(result: ScanResult): string;
  renderCatch(result: CatchResult): string;
  renderMerge(result: MergeResult): string;
  renderCollection(collection: CollectionCreature[]): string;
  renderEnergy(energy: number, maxEnergy: number): string;
  renderStatus(result: StatusResult): string;
  renderNotification(notification: Notification): string;
}

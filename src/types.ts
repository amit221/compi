// src/types.ts — Compi v3 (multi-species)

// --- Slots (4) ---

export type SlotId = "eyes" | "mouth" | "body" | "tail";
export const SLOT_IDS: SlotId[] = ["eyes", "mouth", "body", "tail"];

// --- Traits ---

export interface TraitVariant {
  id: string;
  name: string;
  art: string;
}

export interface TraitDefinition {
  id: string;
  name: string;
  art: string;
  spawnRate: number; // 0.001 to 0.30
}

export interface CreatureSlot {
  slotId: SlotId;
  variantId: string;
  color: CreatureColor;
}

// --- Colors ---

export type CreatureColor = "grey" | "white" | "cyan" | "magenta" | "yellow" | "red";
export const CREATURE_COLORS: CreatureColor[] = ["grey", "white", "cyan", "magenta", "yellow", "red"];

// --- Species ---

export interface SpeciesDefinition {
  id: string;
  name: string;
  description: string;
  spawnWeight: number;
  art: string[]; // multi-line ASCII template
  traitPools: Partial<Record<SlotId, TraitDefinition[]>>;
}

// --- Collection ---

export const MAX_COLLECTION_SIZE = 15;

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
  speciesId: string;
  name: string;
  slots: CreatureSlot[];
  spawnedAt: number;
}

export interface CollectionCreature {
  id: string;
  speciesId: string;
  name: string;
  slots: CreatureSlot[];
  caughtAt: number;
  generation: number;
  mergedFrom?: [string, string];
  archived: boolean;
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
  notificationLevel: "minimal" | "moderate" | "off";
}

export interface GameState {
  version: number; // 4
  profile: PlayerProfile;
  collection: CollectionCreature[];
  archive: CollectionCreature[];
  energy: number;
  lastEnergyGainAt: number;
  nearby: NearbyCreature[];
  batch: BatchState | null;
  lastSpawnAt: number;
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
  nextBatchInMs: number;
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

export interface SlotInheritance {
  slotId: SlotId;
  parentAVariant: TraitDefinition;
  parentBVariant: TraitDefinition;
  parentAChance: number; // normalized probability
  parentBChance: number;
}

export interface BreedPreview {
  parentA: CollectionCreature;
  parentB: CollectionCreature;
  /** 1-indexed position of parentA in state.collection at preview time */
  parentAIndex: number;
  /** 1-indexed position of parentB in state.collection at preview time */
  parentBIndex: number;
  slotInheritance: SlotInheritance[];
  energyCost: number;
}

export interface BreedResult {
  child: CollectionCreature;
  parentA: CollectionCreature;
  parentB: CollectionCreature;
  inheritedFrom: Record<SlotId, "A" | "B">;
}

export interface BreedableEntry {
  /** 1-indexed position in the collection array */
  creatureIndex: number;
  creature: CollectionCreature;
  /** Number of same-species, non-archived partners this creature has */
  partnerCount: number;
}

export interface BreedablePartner {
  /** 1-indexed position in the collection array */
  partnerIndex: number;
  creature: CollectionCreature;
  /** Energy cost to breed the selected creature with this partner */
  energyCost: number;
}

export interface BreedPartnersView {
  /** 1-indexed position of the selected creature */
  creatureIndex: number;
  creature: CollectionCreature;
  partners: BreedablePartner[];
}

export interface ArchiveResult {
  creature: CollectionCreature;
}

export interface StatusResult {
  profile: PlayerProfile;
  collectionCount: number;
  archiveCount: number;
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

// --- Config Types ---

export interface MilestoneCondition {
  type: "totalCatches" | "currentStreak" | "totalTicks";
  threshold: number;
}

export interface MilestoneReward {
  energy?: number;
}

export interface MilestoneConfig {
  id: string;
  description: string;
  condition: MilestoneCondition;
  reward: MilestoneReward[];
  oneTime: boolean;
}

export interface BalanceConfig {
  colors: Record<string, number>;
  batch: {
    spawnIntervalMs: number;
    batchLingerMs: number;
    sharedAttempts: number;
    timeOfDay: Record<string, [number, number]>;
  };
  catching: {
    baseCatchRate: number;
    minCatchRate: number;
    maxCatchRate: number;
    failPenaltyPerMiss: number;
    maxTraitSpawnRate: number; // reference point for difficulty scaling (0.12)
    difficultyScale: number; // how much rarity affects catch rate (0.50)
    xpBase: number; // base XP for a catch
    xpRarityMultiplier: number; // XP bonus per rare trait
  };
  energy: {
    gainIntervalMs: number;
    maxEnergy: number;
    startingEnergy: number;
    sessionBonus: number;
    baseMergeCost: number; // flat cost per merge
    maxMergeCost: number; // cap
    rareThreashold: number; // spawn rate below which trait counts as "rare" for cost
  };
  breed: {
    inheritanceBase: number; // 0.50
    inheritanceRarityScale: number; // 0.80
    inheritanceMin: number; // 0.45
    inheritanceMax: number; // 0.58
    referenceSpawnRate: number; // 0.12
  };
  progression: {
    xpPerLevel: number;
    sessionGapMs: number;
    tickPruneCount: number;
  };
  rewards: {
    milestones: MilestoneConfig[];
  };
  messages: Record<string, Record<string, string>>;
}

// --- Renderer Interface ---

export interface Renderer {
  renderScan(result: ScanResult): string;
  renderCatch(result: CatchResult): string;
  renderBreedPreview(preview: BreedPreview): string;
  renderBreedResult(result: BreedResult): string;
  renderCollection(collection: CollectionCreature[]): string;
  renderArchive(archive: CollectionCreature[]): string;
  renderEnergy(energy: number, maxEnergy: number): string;
  renderStatus(result: StatusResult): string;
  renderNotification(notification: Notification): string;
  renderBreedableList(entries: BreedableEntry[]): string;
  renderBreedPartners(view: BreedPartnersView): string;
}

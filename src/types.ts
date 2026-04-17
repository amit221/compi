// src/types.ts — Compi v7

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
  /** 0-7 rarity index. 0=common(grey), 7=mythic(red). Added in v6. */
  rarity: number;
}

// --- Colors ---

export type CreatureColor = "grey" | "white" | "green" | "cyan" | "blue" | "magenta" | "yellow" | "red";
export const CREATURE_COLORS: CreatureColor[] = ["grey", "white", "green", "cyan", "blue", "magenta", "yellow", "red"];

/** Maps rarity index (0-7) to CreatureColor */
export const RARITY_COLORS: CreatureColor[] = ["grey", "white", "green", "cyan", "blue", "magenta", "yellow", "red"];
export const RARITY_NAMES = ["Common", "Uncommon", "Rare", "Superior", "Elite", "Epic", "Legendary", "Mythic"] as const;
export type RarityName = typeof RARITY_NAMES[number];

// --- Species ---

export interface SpeciesDefinition {
  id: string;
  name: string;
  description: string;
  spawnWeight: number;
  art: string[]; // multi-line ASCII template
  zones?: SlotId[]; // one per art line, maps line to slot rarity color
  traitPools: Partial<Record<SlotId, TraitDefinition[]>>;
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
  version: number; // 7
  profile: PlayerProfile;
  collection: CollectionCreature[];
  energy: number;
  lastEnergyGainAt: number;
  nearby: NearbyCreature[];
  batch: BatchState | null;
  lastSpawnAt: number;
  recentTicks: Tick[];
  claimedMilestones: string[];
  settings: GameSettings;
  discoveredSpecies: string[];
  currentSessionId: string;
  // v6 new fields
  speciesProgress: Record<string, boolean[]>;
  personalSpecies: SpeciesDefinition[];
  sessionBreedCount: number;
  breedCooldowns: Record<string, number>;
  /** v7: current drawn cards for /play, cleared after pick/skip */
  currentHand?: CardRef[];
}

// --- Level Up ---
export interface LevelUpResult {
  oldLevel: number;
  newLevel: number;
  xpOverflow: number;
}

// --- Discovery ---
export interface DiscoveryResult {
  speciesId: string;
  isNew: boolean;
  bonusXp: number;
  totalDiscovered: number;
}

// --- Advisor ---

export type AdvisorMode = "autopilot" | "advisor";

export interface SuggestedAction {
  type: "catch" | "breed" | "scan" | "release" | "collection";
  label: string;
  cost: { energy?: number };
  priority: number;
  reasoning: string;
  target?: {
    creatureIndex?: number;
    nearbyIndex?: number;
    slotId?: SlotId;
    partnerIndex?: number;
  };
}

export interface ProgressInfo {
  level: number;
  xp: number;
  xpToNextLevel: number;
  xpPercent: number;
  nextSpeciesUnlock: { species: string; level: number } | null;
  bestTrait: { creatureName: string; slot: SlotId; rank: number; tierName: string } | null;
  collectionSize: number;
  collectionMax: number;
  energy: number;
  energyMax: number;
  discoveredCount: number;
  totalSpecies: number;
  speciesProgress: Record<string, boolean[]>;
}

export interface AdvisorContext {
  mode: AdvisorMode;
  suggestedActions: SuggestedAction[];
  progress: ProgressInfo;
}

// --- Companion Overview ---

export interface NearbyHighlight {
  index: number;
  name: string;
  speciesId: string;
  isNewSpecies: boolean;
  catchRate: number;
  energyCost: number;
  /** Total rarity score across all 4 slots (0-400 scale) */
  totalRarity: number;
}

export interface BreedablePair {
  indexA: number;
  nameA: string;
  indexB: number;
  nameB: string;
  speciesId: string;
}

export interface CompanionOverview {
  progress: ProgressInfo;
  nearbyHighlights: NearbyHighlight[];
  breedablePairs: BreedablePair[];
  suggestedActions: SuggestedAction[];
}

export interface ActionMenuEntry {
  number: number;
  label: string;
  cost?: string;
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
  /** Set when the catch succeeded and the species was newly discovered. */
  discovery?: DiscoveryResult;
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
  isCrossSpecies: boolean;
  upgrades: { slotId: SlotId; fromRarity: number; toRarity: number }[];
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

export interface BreedTableRow {
  /** 1-indexed position in state.collection */
  creatureIndex: number;
  creature: CollectionCreature;
}

export interface BreedTableSpecies {
  speciesId: string;
  /**
   * Slots of the first non-archived creature of this species in collection order.
   * The renderer draws these as a single grey "species silhouette" to the left
   * of the table — the slots are not associated with any specific row.
   */
  silhouette: CreatureSlot[];
  rows: BreedTableRow[];
}

export interface BreedTable {
  /** One entry per species that has >= 2 non-archived creatures. */
  species: BreedTableSpecies[];
}

export interface StatusResult {
  profile: PlayerProfile;
  collectionCount: number;
  energy: number;
  nearbyCount: number;
  batchAttemptsRemaining: number;
  discoveredCount: number;
  speciesProgress: Record<string, boolean[]>;
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
    baseChance: number; // 0.50 — chance when ranks are equal
    rankDiffScale: number; // 0.065 — bonus per rank difference
    maxAdvantage: number; // 0.35 — cap on rank advantage
    synergyBonus: number; // 0.05 — max synergy boost from matching rarity tiers
    downgradeChance: number; // 0.30 — chance to downgrade one trait during breed
    rarityTiers: Array<{ name: string; minSpawnRate: number }>;
    baseCost: number; // 3 — base energy cost per breed
    maxBreedCost: number; // 11 — cap on energy cost
    sameTraitUpgradeChance: number; // 0.35 — upgrade chance when same variant & same rarity
    sameTraitHigherParentUpgradeChance: number; // 0.15 — upgrade chance when same variant, different rarity
    diffTraitSameSpeciesUpgradeChance: number; // 0.10 — upgrade chance when different variants, same species
    diffTraitCrossSpeciesUpgradeChance: number; // 0.05 — upgrade chance when different variants, cross species
    maxBreedsPerSession: number; // 3 — max breeds per session
    cooldownMs: number; // 3600000 — cooldown between same pair re-breeding
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
  leveling: {
    thresholds: number[];
    traitRankCaps: number[];
    xpPerCatch: number;
    xpPerMerge: number;
    xpPerHybrid: number;
    xpDiscoveryBonus: number;
    rarityBreedCaps: number[];
  };
  discovery: {
    speciesUnlockLevels: Record<string, number>;
  };
}

// --- Cards (v7) ---

export interface CardRef {
  id: string;
  type: "catch" | "breed";
  /** For catch cards: index into nearby[] */
  nearbyIndex?: number;
  /** For breed cards: indices into collection[] (0-based) */
  parentIndices?: [number, number];
}

export interface CatchCardData {
  nearbyIndex: number;
  creature: NearbyCreature;
  catchRate: number;
  energyCost: number;
}

export interface BreedCardData {
  parentA: { index: number; creature: CollectionCreature };
  parentB: { index: number; creature: CollectionCreature };
  upgradeChances: SlotUpgradeInfo[];
  energyCost: number;
}

export interface SlotUpgradeInfo {
  slotId: SlotId;
  match: boolean;
  upgradeChance: number;
}

export interface Card {
  id: string;
  type: "catch" | "breed";
  label: string;
  energyCost: number;
  data: CatchCardData | BreedCardData;
}

export interface DrawResult {
  cards: Card[];
  empty: boolean;
  noEnergy: boolean;
}

export interface PlayResult {
  action: "catch" | "breed";
  catchResult?: CatchResult;
  breedResult?: BreedResult;
  nextDraw: DrawResult;
}

// --- Renderer Interface ---

export interface Renderer {
  renderScan(result: ScanResult): string;
  renderCatch(result: CatchResult): string;
  renderBreedPreview(preview: BreedPreview): string;
  renderBreedResult(result: BreedResult): string;
  renderCollection(collection: CollectionCreature[]): string;
  renderEnergy(energy: number, maxEnergy: number): string;
  renderStatus(result: StatusResult): string;
  renderNotification(notification: Notification): string;
  renderBreedTable(table: BreedTable): string;
  renderSpeciesIndex(progress: Record<string, boolean[]>): string;
  renderLevelUp(result: LevelUpResult): string;
  renderDiscovery(result: DiscoveryResult): string;
  renderStatusBar(progress: ProgressInfo): string;
  renderActionMenu(entries: ActionMenuEntry[]): string;
  renderProgressPanel(progress: ProgressInfo): string;
  renderCompanionOverview(overview: CompanionOverview): string;
  renderCardDraw(draw: DrawResult, energy: number, maxEnergy: number, profile: PlayerProfile): string;
  renderPlayResult(result: PlayResult, energy: number, maxEnergy: number, profile: PlayerProfile): string;
}

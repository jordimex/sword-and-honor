export type DamageType = "physical" | "fire" | "frost" | "lightning";
export type StatusId =
  | "burning"
  | "chilled"
  | "frozen"
  | "shocked"
  | "shield-wall"
  | "riposte-ready";
export type TickTiming =
  | "turn-start"
  | "before-action"
  | "after-action"
  | "turn-end";
export type RecoveryTiming = "turn-end";
export type EquipmentSlot =
  | "weapon"
  | "offhand"
  | "helmet"
  | "chest"
  | "gauntlets"
  | "legs"
  | "boots"
  | "cloak"
  | "belt"
  | "ring1"
  | "ring2"
  | "amulet";
export type ItemCategory = "weapon" | "armor" | "shield" | "accessory";
export type ArmorWeight = "light" | "medium" | "heavy";
export type WeaponFamily =
  | "longsword"
  | "greatsword"
  | "axe"
  | "warhammer"
  | "spear"
  | "mace"
  | "dagger"
  | "wand"
  | "staff";
export type Rarity = "normal" | "magic" | "rare" | "unique";
export type Tier =
  | "tier1"
  | "tier2"
  | "tier3"
  | "tier4"
  | "tier5"
  | "tier6"
  | "tier7"
  | "tier8"
  | "tier9";
export type AbilityId =
  | "attack"
  | "power-strike"
  | "shield-wall"
  | "riposte"
  | "second-wind"
  | "battle-cry"
  | "execute"
  | "charge"
  | "enemy-cleave"
  | "enemy-firebrand"
  | "enemy-frostbite"
  | "enemy-thunder-jolt"
  | "roderick-cleave"
  | "dirty-strike"
  | "battle-fury";
export type QuestId =
  | "tutorial"
  | "bandit-hunt"
  | "wolf-hunt"
  | "village-defense"
  | "tournament"
  | "roderick"
  | "ironwood-ambush"
  | "elven-ruins"
  | "thornmother-grove"
  | "moonlit-hunt"
  | "ironwood-citadel"
  | "frostmarch-trail"
  | "icebound-crypt"
  | "winter-wolves"
  | "glacier-gate"
  | "frost-wyrm"
  | "ember-road"
  | "salamander-pit"
  | "ashen-arena"
  | "volcanic-forge"
  | "ember-dragon"
  | "crown-gate"
  | "cloud-citadel"
  | "dragon-guard"
  | "throne-of-scales";
export type BiomeId =
  | "greywatch"
  | "ironwood"
  | "frostmarch"
  | "emberpeak"
  | "dragon-crown";
export type SkillId = "attack" | "defense" | "health";
export type MaterialId = "wood" | "stone" | "iron" | "orichalcum";
export type PlayerTitleId =
  | "unknown-knight"
  | "recognized-knight"
  | "knight-banneret"
  | "baron";
export type Specialization =
  | "knight"
  | "barbarian"
  | "ranger"
  | "witch"
  | "rogue";

export interface CoreStats {
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  critChance: number;
  critDamage: number;
  blockChance: number;
  dodgeChance: number;
}

export interface Resistances {
  fireDamage: number;
  frostDamage: number;
  lightningDamage: number;
  burnApplication: number;
  chillApplication: number;
  freezeApplication: number;
  shockApplication: number;
  burnRecovery: number;
  chillRecovery: number;
  shockRecovery: number;
  stunRecovery: number;
  statusRecovery: number;
}

export interface Affix {
  id: string;
  label: string;
  statBonuses?: Partial<CoreStats>;
  resistanceBonuses?: Partial<Resistances>;
  elementalDamage?: Partial<Record<Exclude<DamageType, "physical">, number>>;
  tags?: string[];
}

export interface ItemDefinition {
  id: string;
  name: string;
  category: ItemCategory;
  slot: EquipmentSlot;
  tier: Tier;
  rarity: Rarity;
  weaponFamily?: WeaponFamily;
  armorWeight?: ArmorWeight;
  gearScore: number;
  statBonuses: Partial<CoreStats>;
  resistanceBonuses: Partial<Resistances>;
  elementalDamage?: Partial<Record<Exclude<DamageType, "physical">, number>>;
  affixes: Affix[];
  setId?: string;
  uniqueEffect?: string;
  allowedClasses?: Specialization[];
  upgradeLevel?: number;
  locked?: boolean;
  favorite?: boolean;
}

export interface StatusEffect {
  id: StatusId;
  name: string;
  category:
    | "damage-over-time"
    | "control"
    | "debuff"
    | "buff"
    | "defensive"
    | "special";
  durationTurns: number;
  stacks: number;
  maxStacks: number;
  tickTiming: TickTiming;
  power: number;
  removable: boolean;
  recoveryChance: number;
  recoveryTiming: RecoveryTiming;
  sourceId: string;
  tags: string[];
}

export interface Combatant {
  id: string;
  name: string;
  isPlayer: boolean;
  title?: string;
  hp: number;
  stats: CoreStats;
  resistances: Resistances;
  statuses: StatusEffect[];
  cooldowns: Partial<Record<AbilityId, number>>;
  abilities: AbilityId[];
  equipment?: Partial<Record<EquipmentSlot, ItemDefinition | null>>;
  elementalDamage?: Partial<Record<Exclude<DamageType, "physical">, number>>;
  telegraph?: string;
}

export interface AbilityDefinition {
  id: AbilityId;
  name: string;
  description: string;
  cooldown: number;
  resourceCost: number;
  target: "self" | "enemy";
  execute: (context: AbilityExecutionContext) => AbilityResult;
}

export interface AbilityExecutionContext {
  source: Combatant;
  target: Combatant;
  rng: () => number;
}

export interface AbilityResult {
  damage?: number;
  damageType?: DamageType;
  heal?: number;
  appliedStatuses?: StatusEffect[];
  selfStatuses?: StatusEffect[];
  selfStatBuffs?: Partial<CoreStats>;
  notes: string[];
  telegraph?: string | null;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  stats: CoreStats;
  resistances: Resistances;
  abilities: AbilityId[];
  xpReward: number;
  goldReward: number;
  honorReward: number;
  lootTable: string[];
  boss?: boolean;
}

export interface EncounterDefinition {
  id: QuestId;
  name: string;
  description: string;
  enemies: EnemyDefinition[];
  previewText: string;
  biome: BiomeId;
  rooms: number;
  rewardTier: Rarity;
  bossExclusiveDrops?: string[];
  rewards: {
    guaranteedLoot?: string[];
    bonusGold?: number;
    bonusHonor?: number;
    bonusPrestige?: number;
    achievement?: string;
    materials?: Partial<Record<MaterialId, number>>;
  };
}

export interface ProgressGoal {
  label: string;
  current: number;
  target: number;
}

export interface TitleDefinition {
  id: PlayerTitleId;
  label: string;
  unlock: {
    level: number;
    honor: number;
    prestige: number;
    reputation: number;
    tournamentWins: number;
  };
}

export interface ProductDefinition {
  productId: string;
  name: string;
  displayPrice: string;
  gemAmount: number;
  bonusGemAmount: number;
}

export interface WorldSpeedOption {
  id: string;
  label: string;
  gemCost: number;
  minutes: number;
}

export interface WorldTimer {
  id: string;
  label: string;
  startedAt: number;
  endsAt: number;
  supportsWorldSpeed: boolean;
  rewardGold?: number;
  rewardUnits?: string;
  completed: boolean;
}

export interface OfflineProgressSummary {
  completedTimers: string[];
  goldCollected: number;
}

export interface PlayerState {
  redditUserId: string;
  username: string;
  createdAt: number;
  updatedAt: number;
  level: number;
  xp: number;
  skillPoints: number;
  skillUpgrades: Record<SkillId, number>;
  materials: Record<MaterialId, number>;
  gold: number;
  gems: number;
  honor: number;
  prestige: number;
  reputation: number;
  nobleSupport: number;
  popularSupport: number;
  churchSupport: number;
  militarySupport: number;
  legitimacy: number;
  throneProximity: number;
  gearScore: number;
  specialization: Specialization;
  currentTitle: PlayerTitleId;
  titles: PlayerTitleId[];
  achievements: string[];
  tournamentWins: number;
  completedQuests: QuestId[];
  currentQuestIndex: number;
  inventoryCapacity: number;
  inventory: ItemDefinition[];
  equipment: Partial<Record<EquipmentSlot, ItemDefinition | null>>;
  abilities: AbilityId[];
  baseStats: CoreStats;
  stats: CoreStats;
  statusResistances: Resistances;
  worldTimers: WorldTimer[];
  activeWorldSpeed: {
    startedAt: number;
    endsAt: number;
    multiplier: number;
  } | null;
  lastSeenAt: number;
}

export interface CombatLogEntry {
  round: number;
  text: string;
  emphasis?: "damage" | "status" | "loot" | "warning" | "reward";
}

export interface CombatState {
  round: number;
  encounterId: QuestId;
  player: Combatant;
  enemies: Combatant[];
  turnOrder: string[];
  activeTurnId: string;
  winner: "player" | "enemy" | null;
  log: CombatLogEntry[];
  pendingLoot: ItemDefinition[];
  rewardsClaimed: boolean;
}

import type {
  CoreStats,
  Resistances,
  Tier,
  Rarity,
  TitleDefinition,
  ProductDefinition,
  WorldSpeedOption,
  ProgressGoal,
} from "@/shared/game/types";

export const BASE_PLAYER_STATS: CoreStats = {
  maxHp: 120,
  attack: 12,
  defense: 8,
  speed: 10,
  critChance: 0.08,
  critDamage: 1.5,
  blockChance: 0.06,
  dodgeChance: 0.04,
};

export const ZERO_RESISTANCES: Resistances = {
  fireDamage: 0,
  frostDamage: 0,
  lightningDamage: 0,
  burnApplication: 0,
  chillApplication: 0,
  freezeApplication: 0,
  shockApplication: 0,
  burnRecovery: 0,
  chillRecovery: 0,
  shockRecovery: 0,
  stunRecovery: 0,
  statusRecovery: 0,
};

export const TIER_MULTIPLIERS: Record<Tier, number> = {
  tier1: 1,
  tier2: 1.18,
  tier3: 1.36,
  tier4: 1.58,
  tier5: 1.84,
  tier6: 2.15,
  tier7: 2.5,
  tier8: 2.9,
  tier9: 3.4,
};

export const RARITY_MULTIPLIERS: Record<Rarity, number> = {
  normal: 1,
  magic: 1.32,
  rare: 1.8,
  unique: 3.1,
};

export const TITLE_DEFINITIONS: TitleDefinition[] = [
  {
    id: "unknown-knight",
    label: "Unknown Knight",
    unlock: {
      level: 1,
      honor: 0,
      prestige: 0,
      reputation: 0,
      tournamentWins: 0,
    },
  },
  {
    id: "recognized-knight",
    label: "Recognized Knight",
    unlock: {
      level: 3,
      honor: 200,
      prestige: 10,
      reputation: 5,
      tournamentWins: 0,
    },
  },
  {
    id: "knight-banneret",
    label: "Knight Banneret",
    unlock: {
      level: 6,
      honor: 700,
      prestige: 75,
      reputation: 12,
      tournamentWins: 1,
    },
  },
  {
    id: "baron",
    label: "Baron",
    unlock: {
      level: 15,
      honor: 2500,
      prestige: 350,
      reputation: 20,
      tournamentWins: 3,
    },
  },
];

export const GEM_PRODUCTS: ProductDefinition[] = [
  {
    productId: "gems-80",
    name: "Pouch of Gems",
    displayPrice: "$0.99",
    gemAmount: 80,
    bonusGemAmount: 0,
  },
  {
    productId: "gems-175",
    name: "Handful of Gems",
    displayPrice: "$1.99",
    gemAmount: 175,
    bonusGemAmount: 0,
  },
  {
    productId: "gems-280",
    name: "Bag of Gems",
    displayPrice: "$2.99",
    gemAmount: 260,
    bonusGemAmount: 20,
  },
  {
    productId: "gems-500",
    name: "Chest of Gems",
    displayPrice: "$4.99",
    gemAmount: 450,
    bonusGemAmount: 50,
  },
  {
    productId: "gems-850",
    name: "Lord's Gem Chest",
    displayPrice: "$7.99",
    gemAmount: 760,
    bonusGemAmount: 90,
  },
  {
    productId: "gems-1100",
    name: "Royal Gem Chest",
    displayPrice: "$9.99",
    gemAmount: 960,
    bonusGemAmount: 140,
  },
];

export const WORLD_SPEED_OPTIONS: WorldSpeedOption[] = [
  { id: "speed-15", label: "15 min", gemCost: 10, minutes: 15 },
  { id: "speed-60", label: "1 hour", gemCost: 30, minutes: 60 },
  { id: "speed-240", label: "4 hours", gemCost: 90, minutes: 240 },
  { id: "speed-720", label: "12 hours", gemCost: 200, minutes: 720 },
  { id: "speed-1440", label: "24 hours", gemCost: 350, minutes: 1440 },
];

export const MAX_KNIGHT_LEVEL = 400;
// XP is still shown as a dungeon reward, while gold-funded skill training controls levels.
export const XP_CURVE = Array.from(
  { length: MAX_KNIGHT_LEVEL + 1 },
  (_, level) => level * level * 70
);

export const ROAD_TO_THRONE: ProgressGoal[] = [
  { label: "Unknown Knight", current: 1, target: 1 },
  { label: "Recognized Knight", current: 0, target: 1 },
  { label: "Knight Banneret", current: 0, target: 1 },
  { label: "Landed Noble", current: 0, target: 100 },
  { label: "Major Noble", current: 0, target: 100 },
  { label: "Regional Lord", current: 0, target: 100 },
  { label: "Royal Court Member", current: 0, target: 100 },
  { label: "Power Broker", current: 0, target: 100 },
  { label: "Claimant", current: 0, target: 100 },
  { label: "King", current: 0, target: 100 },
];

export const STATUS_CAPS = {
  resistance: 0.75,
  applicationFloor: 0.05,
  applicationCeiling: 0.95,
};

import {
  BASE_PLAYER_STATS,
  RARITY_MULTIPLIERS,
  TIER_MULTIPLIERS,
  ZERO_RESISTANCES,
} from "@/shared/game/balance";
import type {
  AbilityDefinition,
  Affix,
  EncounterDefinition,
  EnemyDefinition,
  BiomeId,
  EquipmentSlot,
  ItemDefinition,
  PlayerState,
  Rarity,
  Resistances,
  StatusEffect,
  Specialization,
  Tier,
  QuestId,
  WeaponFamily,
} from "@/shared/game/types";

const tierLabels: Record<Tier, string> = {
  tier1: "Worn",
  tier2: "Soldier",
  tier3: "Knight",
  tier4: "Veteran",
  tier5: "Noble",
  tier6: "Lordly",
  tier7: "Royal",
  tier8: "Legendary",
  tier9: "Relic",
};

const rarityLabels: Record<Rarity, string> = {
  normal: "Normal",
  magic: "Magic",
  rare: "Rare",
  unique: "Unique",
};

const makeStatus = (
  id: StatusEffect["id"],
  power: number,
  durationTurns: number,
  sourceId: string
): StatusEffect => {
  const byId: Record<StatusEffect["id"], StatusEffect> = {
    burning: {
      id: "burning",
      name: "Burning",
      category: "damage-over-time",
      durationTurns,
      stacks: 1,
      maxStacks: 3,
      tickTiming: "turn-end",
      power,
      removable: true,
      recoveryChance: 0.15,
      recoveryTiming: "turn-end",
      sourceId,
      tags: ["fire", "dot"],
    },
    chilled: {
      id: "chilled",
      name: "Chilled",
      category: "debuff",
      durationTurns,
      stacks: 1,
      maxStacks: 1,
      tickTiming: "turn-start",
      power,
      removable: true,
      recoveryChance: 0.2,
      recoveryTiming: "turn-end",
      sourceId,
      tags: ["frost", "speed-down"],
    },
    frozen: {
      id: "frozen",
      name: "Frozen",
      category: "control",
      durationTurns,
      stacks: 1,
      maxStacks: 1,
      tickTiming: "before-action",
      power,
      removable: true,
      recoveryChance: 0,
      recoveryTiming: "turn-end",
      sourceId,
      tags: ["frost", "skip-turn"],
    },
    shocked: {
      id: "shocked",
      name: "Shocked",
      category: "debuff",
      durationTurns,
      stacks: 1,
      maxStacks: 1,
      tickTiming: "turn-start",
      power,
      removable: true,
      recoveryChance: 0.2,
      recoveryTiming: "turn-end",
      sourceId,
      tags: ["lightning", "defense-down"],
    },
    "shield-wall": {
      id: "shield-wall",
      name: "Shield Wall",
      category: "defensive",
      durationTurns,
      stacks: 1,
      maxStacks: 1,
      tickTiming: "turn-start",
      power,
      removable: true,
      recoveryChance: 0,
      recoveryTiming: "turn-end",
      sourceId,
      tags: ["defense"],
    },
    "riposte-ready": {
      id: "riposte-ready",
      name: "Riposte Ready",
      category: "special",
      durationTurns,
      stacks: 1,
      maxStacks: 1,
      tickTiming: "after-action",
      power,
      removable: true,
      recoveryChance: 0,
      recoveryTiming: "turn-end",
      sourceId,
      tags: ["counter"],
    },
  };
  return byId[id];
};

const elementalAffixes: Affix[] = [
  {
    id: "flaming",
    label: "Flaming",
    elementalDamage: { fire: 12 },
    tags: ["elemental"],
  },
  {
    id: "frostbound",
    label: "Frostbound",
    elementalDamage: { frost: 10 },
    tags: ["elemental"],
  },
  {
    id: "shocking",
    label: "Shocking",
    elementalDamage: { lightning: 10 },
    tags: ["elemental"],
  },
];

const resistanceAffixes: Affix[] = [
  {
    id: "fireward",
    label: "Fireward",
    resistanceBonuses: { fireDamage: 0.15, burnRecovery: 0.1 },
  },
  {
    id: "frostward",
    label: "Frostward",
    resistanceBonuses: { frostDamage: 0.15, chillRecovery: 0.15 },
  },
  {
    id: "stormward",
    label: "Stormward",
    resistanceBonuses: { lightningDamage: 0.15, shockRecovery: 0.1 },
  },
  {
    id: "steadfast",
    label: "Steadfast",
    resistanceBonuses: { statusRecovery: 0.1, burnApplication: 0.08 },
  },
];

function mergeResistances(...values: Partial<Resistances>[]): Resistances {
  return values.reduce<Resistances>(
    (acc, current) => ({
      fireDamage: acc.fireDamage + (current.fireDamage ?? 0),
      frostDamage: acc.frostDamage + (current.frostDamage ?? 0),
      lightningDamage: acc.lightningDamage + (current.lightningDamage ?? 0),
      burnApplication: acc.burnApplication + (current.burnApplication ?? 0),
      chillApplication: acc.chillApplication + (current.chillApplication ?? 0),
      freezeApplication:
        acc.freezeApplication + (current.freezeApplication ?? 0),
      shockApplication: acc.shockApplication + (current.shockApplication ?? 0),
      burnRecovery: acc.burnRecovery + (current.burnRecovery ?? 0),
      chillRecovery: acc.chillRecovery + (current.chillRecovery ?? 0),
      shockRecovery: acc.shockRecovery + (current.shockRecovery ?? 0),
      stunRecovery: acc.stunRecovery + (current.stunRecovery ?? 0),
      statusRecovery: acc.statusRecovery + (current.statusRecovery ?? 0),
    }),
    { ...ZERO_RESISTANCES }
  );
}

function makeGearScore(tier: Tier, rarity: Rarity, base: number): number {
  return Math.round(base * TIER_MULTIPLIERS[tier] * RARITY_MULTIPLIERS[rarity]);
}

function buildItem(args: {
  id: string;
  name: string;
  category: ItemDefinition["category"];
  slot: EquipmentSlot;
  tier: Tier;
  rarity: Rarity;
  attack?: number;
  defense?: number;
  maxHp?: number;
  speed?: number;
  critChance?: number;
  critDamage?: number;
  blockChance?: number;
  dodgeChance?: number;
  family?: WeaponFamily;
  armorWeight?: ItemDefinition["armorWeight"];
  affixes?: Affix[];
  resistances?: Partial<Resistances>;
  uniqueEffect?: string;
  setId?: string;
  allowedClasses?: ItemDefinition["allowedClasses"];
}): ItemDefinition {
  const affixes = args.affixes ?? [];
  const statBonuses = {
    maxHp: args.maxHp ?? 0,
    attack: args.attack ?? 0,
    defense: args.defense ?? 0,
    speed: args.speed ?? 0,
    critChance: args.critChance ?? 0,
    critDamage: args.critDamage ?? 0,
    blockChance: args.blockChance ?? 0,
    dodgeChance: args.dodgeChance ?? 0,
  };
  const affixResistances = mergeResistances(
    ...affixes.map((affix) => affix.resistanceBonuses ?? {})
  );
  const baseResistances = mergeResistances(
    args.resistances ?? {},
    affixResistances
  );
  const elementalDamage = affixes.reduce<ItemDefinition["elementalDamage"]>(
    (acc, affix) => ({
      fire: (acc?.fire ?? 0) + (affix.elementalDamage?.fire ?? 0),
      frost: (acc?.frost ?? 0) + (affix.elementalDamage?.frost ?? 0),
      lightning:
        (acc?.lightning ?? 0) + (affix.elementalDamage?.lightning ?? 0),
    }),
    {}
  );
  return {
    id: args.id,
    name: `${rarityLabels[args.rarity]} ${tierLabels[args.tier]} ${args.name}`,
    category: args.category,
    slot: args.slot,
    tier: args.tier,
    rarity: args.rarity,
    weaponFamily: args.family,
    armorWeight: args.armorWeight,
    gearScore: makeGearScore(
      args.tier,
      args.rarity,
      20 + (args.attack ?? 0) * 3 + (args.defense ?? 0) * 3
    ),
    statBonuses,
    resistanceBonuses: baseResistances,
    elementalDamage,
    affixes,
    uniqueEffect: args.uniqueEffect,
    setId: args.setId,
    allowedClasses: args.allowedClasses,
  };
}

const weaponTemplates: Array<{
  base: string;
  family: WeaponFamily;
  attack: number;
  speed: number;
  critChance?: number;
}> = [
  { base: "Gilded Oathblade", family: "longsword", attack: 5, speed: 0 },
  { base: "Lionguard Falchion", family: "longsword", attack: 8, speed: 0 },
  { base: "Sunsteel Knightblade", family: "longsword", attack: 11, speed: 1 },
  {
    base: "Crownsplitter Greatsword",
    family: "greatsword",
    attack: 13,
    speed: -2,
  },
  { base: "Bloodoak Reaver", family: "axe", attack: 10, speed: -1 },
  { base: "Anvilbreaker Maul", family: "warhammer", attack: 11, speed: -2 },
  { base: "Thornwind Lance", family: "spear", attack: 9, speed: 2 },
  { base: "Reliquary Mace", family: "mace", attack: 10, speed: 0 },
  {
    base: "Moonfang Dagger",
    family: "dagger",
    attack: 7,
    speed: 3,
    critChance: 0.05,
  },
  {
    base: "Silver Tournament Blade",
    family: "longsword",
    attack: 12,
    speed: 1,
  },
  {
    base: "Violet Star Wand",
    family: "wand",
    attack: 7,
    speed: 1,
    critChance: 0.04,
  },
  {
    base: "Astral Root Staff",
    family: "staff",
    attack: 10,
    speed: -1,
    critChance: 0.03,
  },
];

const armorTemplates: Array<{
  base: string;
  slot: EquipmentSlot;
  defense: number;
  speed?: number;
  armorWeight: ItemDefinition["armorWeight"];
}> = [
  { base: "Worn Gambeson", slot: "chest", defense: 4, armorWeight: "light" },
  { base: "Leather Cap", slot: "helmet", defense: 2, armorWeight: "light" },
  {
    base: "Padded Gloves",
    slot: "gauntlets",
    defense: 1,
    armorWeight: "light",
  },
  { base: "Quilted Chausses", slot: "legs", defense: 2, armorWeight: "light" },
  {
    base: "Old Boots",
    slot: "boots",
    defense: 1,
    speed: 1,
    armorWeight: "light",
  },
  {
    base: "Mail Hauberk",
    slot: "chest",
    defense: 7,
    speed: -1,
    armorWeight: "medium",
  },
  { base: "Iron Helm", slot: "helmet", defense: 4, armorWeight: "medium" },
  { base: "Kite Leggings", slot: "legs", defense: 4, armorWeight: "medium" },
  {
    base: "Guard Gauntlets",
    slot: "gauntlets",
    defense: 3,
    armorWeight: "medium",
  },
  { base: "Marcher Boots", slot: "boots", defense: 2, armorWeight: "medium" },
];

const shieldTemplates = [
  { base: "Cracked Shield", defense: 3, blockChance: 0.04 },
  { base: "Guard Shield", defense: 5, blockChance: 0.06 },
  { base: "Tower Shield", defense: 7, blockChance: 0.08 },
  { base: "Herald Shield", defense: 6, blockChance: 0.07 },
  { base: "Wall Shield", defense: 8, blockChance: 0.09 },
];

const accessoryTemplates: Array<{
  base: string;
  slot: EquipmentSlot;
  attack?: number;
  defense?: number;
  speed?: number;
  resistance?: Partial<Resistances>;
}> = [
  {
    base: "Traveler's Cloak",
    slot: "cloak",
    defense: 1,
    resistance: { frostDamage: 0.05 },
  },
  {
    base: "Leather Belt",
    slot: "belt",
    defense: 1,
    resistance: { burnRecovery: 0.05 },
  },
  { base: "Mercenary Ring", slot: "ring1", attack: 2 },
  { base: "Warden Ring", slot: "ring2", defense: 2 },
  {
    base: "Pilgrim Amulet",
    slot: "amulet",
    speed: 1,
    resistance: { shockRecovery: 0.05 },
  },
];

function withAffixes(index: number): Affix[] {
  if (index % 7 === 0) {
    return [elementalAffixes[index % elementalAffixes.length]];
  }
  if (index % 5 === 0) {
    return [resistanceAffixes[index % resistanceAffixes.length]];
  }
  if (index % 11 === 0) {
    return [
      elementalAffixes[index % elementalAffixes.length],
      resistanceAffixes[index % resistanceAffixes.length],
    ];
  }
  return [];
}

function rarityForIndex(index: number): Rarity {
  // Unique pieces are intentionally scarce: three in each 100-item equipment family.
  if (index > 0 && index % 41 === 0) return "unique";
  if (index % 8 === 0) return "rare";
  if (index % 3 === 0) return "magic";
  return "normal";
}

function tierForIndex(index: number): Tier {
  return `tier${Math.min(9, Math.floor(index / 12) + 1)}` as Tier;
}

function weaponClasses(family: WeaponFamily): Specialization[] {
  if (family === "wand" || family === "staff") return ["witch"];
  if (family === "dagger") return ["rogue"];
  if (family === "spear") return ["ranger"];
  if (family === "axe" || family === "warhammer" || family === "mace")
    return ["barbarian"];
  return ["knight"];
}

function armorClasses(weight: ItemDefinition["armorWeight"]): Specialization[] {
  if (weight === "heavy") return ["knight", "barbarian"];
  if (weight === "medium") return ["knight", "barbarian"];
  return ["ranger", "witch", "rogue"];
}

function expandCatalog(): ItemDefinition[] {
  const items: ItemDefinition[] = [];
  const rarityScale = (rarity: Rarity) => RARITY_MULTIPLIERS[rarity];

  // One hundred pieces in every category make the forge feel like a real collection.
  for (let index = 0; index < 100; index += 1) {
    const template = weaponTemplates[index % weaponTemplates.length];
    const tier = tierForIndex(index);
    const rarity = rarityForIndex(index);
    const scale = TIER_MULTIPLIERS[tier] * rarityScale(rarity);
    items.push(
      buildItem({
        id: `weapon-${index}`,
        name: template.base,
        category: "weapon",
        slot: "weapon",
        tier,
        rarity,
        attack: Math.round(template.attack * scale),
        speed: template.speed,
        critChance:
          (template.critChance ?? 0) +
          (rarity === "unique" ? 0.08 : rarity === "rare" ? 0.03 : 0),
        family: template.family,
        allowedClasses: weaponClasses(template.family),
        affixes: withAffixes(index),
        uniqueEffect:
          rarity === "unique"
            ? "A boss-forged weapon with a greatly increased critical chance."
            : undefined,
      })
    );
  }
  for (let index = 0; index < 100; index += 1) {
    const template = armorTemplates[index % armorTemplates.length];
    const tier = tierForIndex(index);
    const rarity = rarityForIndex(index);
    const scale = TIER_MULTIPLIERS[tier] * rarityScale(rarity);
    items.push(
      buildItem({
        id: `armor-${index}`,
        name: template.base,
        category: "armor",
        slot: template.slot,
        tier,
        rarity,
        defense: Math.round(template.defense * scale),
        maxHp: Math.round((6 + (index % 8)) * scale),
        speed: template.speed,
        armorWeight: template.armorWeight,
        allowedClasses: armorClasses(template.armorWeight),
        affixes: withAffixes(index + 100),
        uniqueEffect:
          rarity === "unique"
            ? "Ancient armor that grants a large health reserve."
            : undefined,
      })
    );
  }
  for (let index = 0; index < 100; index += 1) {
    const template = shieldTemplates[index % shieldTemplates.length];
    const tier = tierForIndex(index);
    const rarity = rarityForIndex(index);
    const scale = TIER_MULTIPLIERS[tier] * rarityScale(rarity);
    items.push(
      buildItem({
        id: `shield-${index}`,
        name: template.base,
        category: "shield",
        slot: "offhand",
        tier,
        rarity,
        defense: Math.round(template.defense * scale),
        blockChance: template.blockChance + (rarity === "unique" ? 0.1 : 0),
        affixes: withAffixes(index + 200),
        allowedClasses: ["knight"],
        uniqueEffect:
          rarity === "unique"
            ? "A champion's shield with a major block chance bonus."
            : undefined,
      })
    );
  }
  for (let index = 0; index < 100; index += 1) {
    const template = accessoryTemplates[index % accessoryTemplates.length];
    const tier = tierForIndex(index);
    const rarity = rarityForIndex(index);
    const scale = TIER_MULTIPLIERS[tier] * rarityScale(rarity);
    items.push(
      buildItem({
        id: `accessory-${index}`,
        name: template.base,
        category: "accessory",
        slot: template.slot,
        tier,
        rarity,
        attack: Math.round((template.attack ?? 0) * scale),
        defense: Math.round((template.defense ?? 0) * scale),
        speed: template.speed,
        critChance: rarity === "unique" ? 0.06 : 0,
        affixes: withAffixes(index + 300),
        resistances: template.resistance,
        allowedClasses: ["knight", "barbarian", "ranger", "witch", "rogue"],
        uniqueEffect:
          rarity === "unique"
            ? "A rare heirloom that sharpens every critical strike."
            : undefined,
      })
    );
  }

  items.push(
    buildItem({
      id: "unique-rodericks-bloodletter",
      name: "Roderick's Bloodletter",
      category: "weapon",
      slot: "weapon",
      tier: "tier2",
      rarity: "unique",
      attack: 16,
      speed: 1,
      family: "axe",
      affixes: [
        {
          id: "bloodletter",
          label: "Bloodletter",
          statBonuses: { critChance: 0.08 },
          tags: ["bleed"],
        },
      ],
      uniqueEffect: "Dirty hits deal bonus damage to wounded enemies.",
    }),
    buildItem({
      id: "unique-greywatch-oathblade",
      name: "Greywatch Oathblade",
      category: "weapon",
      slot: "weapon",
      tier: "tier3",
      rarity: "unique",
      attack: 18,
      speed: 1,
      family: "longsword",
      affixes: [elementalAffixes[0], resistanceAffixes[0]],
      uniqueEffect: "Power Strike gains bonus fire damage.",
    }),
    buildItem({
      id: "unique-frostmarch-guard",
      name: "Frostmarch Guard",
      category: "shield",
      slot: "offhand",
      tier: "tier3",
      rarity: "unique",
      defense: 12,
      blockChance: 0.12,
      affixes: [resistanceAffixes[1]],
      uniqueEffect: "Defend grants Chill resistance.",
    }),
    buildItem({
      id: "unique-stormseal-amulet",
      name: "Stormseal Amulet",
      category: "accessory",
      slot: "amulet",
      tier: "tier3",
      rarity: "unique",
      attack: 3,
      speed: 2,
      affixes: [elementalAffixes[2], resistanceAffixes[2]],
      uniqueEffect: "Shock recovery greatly improved.",
    }),
    buildItem({
      id: "unique-banner-cloak",
      name: "Banner of the First Retinue",
      category: "accessory",
      slot: "cloak",
      tier: "tier3",
      rarity: "unique",
      defense: 4,
      speed: 2,
      affixes: [resistanceAffixes[3]],
      uniqueEffect: "Honor gains increased by 10% from victories.",
    })
  );

  items.push(
    buildItem({
      id: "set-greywatch-helm",
      name: "Greywatch Helm",
      category: "armor",
      slot: "helmet",
      tier: "tier2",
      rarity: "rare",
      defense: 7,
      setId: "greywatch-warden",
    }),
    buildItem({
      id: "set-greywatch-chest",
      name: "Greywatch Hauberk",
      category: "armor",
      slot: "chest",
      tier: "tier2",
      rarity: "rare",
      defense: 10,
      setId: "greywatch-warden",
    }),
    buildItem({
      id: "set-greywatch-boots",
      name: "Greywatch Boots",
      category: "armor",
      slot: "boots",
      tier: "tier2",
      rarity: "rare",
      defense: 5,
      setId: "greywatch-warden",
    }),
    buildItem({
      id: "set-ironwood-helm",
      name: "Ironwood Helm",
      category: "armor",
      slot: "helmet",
      tier: "tier2",
      rarity: "rare",
      defense: 6,
      setId: "ironwood-hunt",
      affixes: [resistanceAffixes[0]],
    }),
    buildItem({
      id: "set-ironwood-chest",
      name: "Ironwood Jack",
      category: "armor",
      slot: "chest",
      tier: "tier2",
      rarity: "rare",
      defense: 9,
      setId: "ironwood-hunt",
      affixes: [resistanceAffixes[1]],
    }),
    buildItem({
      id: "set-ironwood-boots",
      name: "Ironwood Boots",
      category: "armor",
      slot: "boots",
      tier: "tier2",
      rarity: "rare",
      defense: 4,
      setId: "ironwood-hunt",
    }),
    buildItem({
      id: "set-stormkeep-helm",
      name: "Stormkeep Helm",
      category: "armor",
      slot: "helmet",
      tier: "tier3",
      rarity: "unique",
      defense: 8,
      setId: "stormkeep-guard",
      affixes: [resistanceAffixes[2]],
    }),
    buildItem({
      id: "set-stormkeep-chest",
      name: "Stormkeep Plate",
      category: "armor",
      slot: "chest",
      tier: "tier3",
      rarity: "unique",
      defense: 13,
      setId: "stormkeep-guard",
    }),
    buildItem({
      id: "set-stormkeep-boots",
      name: "Stormkeep Sabatons",
      category: "armor",
      slot: "boots",
      tier: "tier3",
      rarity: "unique",
      defense: 6,
      setId: "stormkeep-guard",
    })
  );

  // These named relics only appear in their biome's final boss chest.
  const bossRelics: Array<{
    id: string;
    name: string;
    category: ItemDefinition["category"];
    slot: EquipmentSlot;
    attack?: number;
    defense?: number;
    maxHp?: number;
  }> = [
    {
      id: "boss-ironwood-moonblade",
      name: "Moonblade of the Thornmother",
      category: "weapon",
      slot: "weapon",
      attack: 44,
    },
    {
      id: "boss-frostmarch-wyrmguard",
      name: "Wyrmguard of Frostmarch",
      category: "shield",
      slot: "offhand",
      defense: 32,
      maxHp: 55,
    },
    {
      id: "boss-emberpeak-heartplate",
      name: "Heartplate of Emberpeak",
      category: "armor",
      slot: "chest",
      defense: 42,
      maxHp: 70,
    },
    {
      id: "boss-dragon-crown-signet",
      name: "Signet of the Dragon Crown",
      category: "accessory",
      slot: "amulet",
      attack: 24,
      maxHp: 48,
    },
  ];
  bossRelics.forEach((relic, index) => {
    items.push(
      buildItem({
        ...relic,
        tier: "tier9",
        rarity: "unique",
        critChance: 0.12,
        affixes: [
          elementalAffixes[index % elementalAffixes.length],
          resistanceAffixes[index % resistanceAffixes.length],
        ],
        uniqueEffect:
          "Exclusive boss relic. It can only be claimed from its biome's final chest.",
      })
    );
  });

  return items;
}

export const ITEM_CATALOG = expandCatalog();

export function findItem(itemId: string): ItemDefinition {
  const item = ITEM_CATALOG.find((entry) => entry.id === itemId);
  if (!item) {
    throw new Error(`Unknown item: ${itemId}`);
  }
  return structuredClone(item);
}

function damageFormula(
  sourceAttack: number,
  multiplier: number,
  bonus = 0
): number {
  return Math.round(sourceAttack * multiplier + bonus);
}

export const ABILITIES: Record<string, AbilityDefinition> = {
  attack: {
    id: "attack",
    name: "Attack",
    description: "Reliable weapon strike.",
    cooldown: 0,
    resourceCost: 0,
    target: "enemy",
    execute: ({ source }) => ({
      damage: damageFormula(source.stats.attack, 1),
      damageType: "physical",
      notes: [],
    }),
  },
  "power-strike": {
    id: "power-strike",
    name: "Power Strike",
    description: "Heavy strike for 180% weapon damage.",
    cooldown: 3,
    resourceCost: 0,
    target: "enemy",
    execute: ({ source }) => ({
      damage: damageFormula(source.stats.attack, 1.8),
      damageType: "physical",
      notes: ["Power Strike lands with force."],
    }),
  },
  "shield-wall": {
    id: "shield-wall",
    name: "Shield Wall",
    description: "Gain defense and block until your next turn.",
    cooldown: 3,
    resourceCost: 0,
    target: "self",
    execute: ({ source }) => ({
      selfStatuses: [makeStatus("shield-wall", 0.3, 1, source.id)],
      notes: ["Shield Wall raises your guard."],
    }),
  },
  riposte: {
    id: "riposte",
    name: "Riposte",
    description: "Prepare to counter the next melee attack.",
    cooldown: 3,
    resourceCost: 0,
    target: "self",
    execute: ({ source }) => ({
      selfStatuses: [makeStatus("riposte-ready", 1.2, 1, source.id)],
      notes: ["Riposte stance prepared."],
    }),
  },
  "second-wind": {
    id: "second-wind",
    name: "Second Wind",
    description: "Recover health and cleanse fire or shock.",
    cooldown: 4,
    resourceCost: 0,
    target: "self",
    execute: () => ({
      heal: 28,
      notes: [
        "Second Wind restores your footing.",
        "Second Wind can cleanse Burning or Shocked.",
      ],
    }),
  },
  "battle-cry": {
    id: "battle-cry",
    name: "Battle Cry",
    description: "Gain attack for several turns.",
    cooldown: 4,
    resourceCost: 0,
    target: "self",
    execute: () => ({
      selfStatBuffs: { attack: 4 },
      notes: ["Battle Cry steels your resolve."],
    }),
  },
  execute: {
    id: "execute",
    name: "Execute",
    description: "Bonus damage to low-health targets.",
    cooldown: 3,
    resourceCost: 0,
    target: "enemy",
    execute: ({ source, target }) => ({
      damage: damageFormula(
        source.stats.attack,
        target.hp <= target.stats.maxHp * 0.35 ? 2.2 : 1.2
      ),
      damageType: "physical",
      notes: ["Execute grows deadlier when the foe is reeling."],
    }),
  },
  charge: {
    id: "charge",
    name: "Charge",
    description: "Fast opening strike with initiative pressure.",
    cooldown: 2,
    resourceCost: 0,
    target: "enemy",
    execute: ({ source }) => ({
      damage: damageFormula(source.stats.attack, 1.35),
      damageType: "physical",
      notes: ["Charge closes the gap in a burst."],
    }),
  },
  "enemy-cleave": {
    id: "enemy-cleave",
    name: "Bandit Slash",
    description: "Basic enemy attack.",
    cooldown: 0,
    resourceCost: 0,
    target: "enemy",
    execute: ({ source }) => ({
      damage: damageFormula(source.stats.attack, 1),
      damageType: "physical",
      notes: [],
    }),
  },
  "enemy-firebrand": {
    id: "enemy-firebrand",
    name: "Firebrand Slash",
    description: "Applies burning.",
    cooldown: 2,
    resourceCost: 0,
    target: "enemy",
    execute: ({ source }) => ({
      damage: damageFormula(source.stats.attack, 1.1, 8),
      damageType: "fire",
      appliedStatuses: [makeStatus("burning", 10, 3, source.id)],
      notes: ["Flames cling to the wound."],
    }),
  },
  "enemy-frostbite": {
    id: "enemy-frostbite",
    name: "Frostbite Spear",
    description: "Applies chilled and sometimes freeze.",
    cooldown: 2,
    resourceCost: 0,
    target: "enemy",
    execute: ({ source, rng }) => ({
      damage: damageFormula(source.stats.attack, 1.05, 6),
      damageType: "frost",
      appliedStatuses: [makeStatus("chilled", 0.15, 3, source.id)].concat(
        rng() > 0.55 ? [makeStatus("frozen", 1, 1, source.id)] : []
      ),
      notes: ["Cold settles into your limbs."],
    }),
  },
  "enemy-thunder-jolt": {
    id: "enemy-thunder-jolt",
    name: "Thunder Jolt",
    description: "Applies shocked.",
    cooldown: 2,
    resourceCost: 0,
    target: "enemy",
    execute: ({ source }) => ({
      damage: damageFormula(source.stats.attack, 1.1, 7),
      damageType: "lightning",
      appliedStatuses: [makeStatus("shocked", 0.2, 2, source.id)],
      notes: ["Your guard is rattled by lightning."],
    }),
  },
  "roderick-cleave": {
    id: "roderick-cleave",
    name: "Brutal Cleave",
    description: "Telegraphed heavy boss attack.",
    cooldown: 2,
    resourceCost: 0,
    target: "enemy",
    execute: ({ source }) => ({
      damage: damageFormula(source.stats.attack, 2.05),
      damageType: "physical",
      notes: ["Roderick brings his greatsword down."],
      telegraph:
        "Roderick raises his greatsword overhead. Brutal Cleave is coming.",
    }),
  },
  "dirty-strike": {
    id: "dirty-strike",
    name: "Dirty Strike",
    description: "Pressure attack.",
    cooldown: 1,
    resourceCost: 0,
    target: "enemy",
    execute: ({ source }) => ({
      damage: damageFormula(source.stats.attack, 1.15),
      damageType: "physical",
      appliedStatuses: [makeStatus("burning", 6, 2, source.id)],
      notes: ["Roderick fights without honor."],
    }),
  },
  "battle-fury": {
    id: "battle-fury",
    name: "Battle Fury",
    description: "Enrage self at low health.",
    cooldown: 99,
    resourceCost: 0,
    target: "self",
    execute: () => ({
      selfStatBuffs: { attack: 6 },
      notes: ["The bandit lord roars with fury."],
    }),
  },
};

function createEnemy(definition: EnemyDefinition): EnemyDefinition {
  return definition;
}

const GREYWATCH_ENCOUNTERS: EncounterDefinition[] = [
  {
    id: "tutorial",
    name: "The Greywatch Road",
    description:
      "Two highwaymen stand between you and your first name-worthy victory.",
    previewText: "You are nobody. Tonight, the road will remember you.",
    biome: "greywatch",
    rooms: 3,
    rewardTier: "normal",
    enemies: [
      createEnemy({
        id: "highwayman-1",
        name: "Highwayman",
        stats: {
          maxHp: 40,
          attack: 8,
          defense: 4,
          speed: 9,
          critChance: 0.05,
          critDamage: 1.4,
          blockChance: 0.02,
          dodgeChance: 0.02,
        },
        resistances: { ...ZERO_RESISTANCES },
        abilities: ["enemy-cleave"],
        xpReward: 40,
        goldReward: 30,
        honorReward: 12,
        lootTable: ["weapon-10"],
      }),
      createEnemy({
        id: "highwayman-2",
        name: "Highwayman Archer",
        stats: {
          maxHp: 35,
          attack: 7,
          defense: 3,
          speed: 11,
          critChance: 0.04,
          critDamage: 1.35,
          blockChance: 0,
          dodgeChance: 0.05,
        },
        resistances: { ...ZERO_RESISTANCES },
        abilities: ["enemy-cleave"],
        xpReward: 35,
        goldReward: 25,
        honorReward: 10,
        lootTable: ["weapon-13"],
      }),
    ],
    rewards: { guaranteedLoot: ["weapon-11"], bonusGold: 20, bonusHonor: 15 },
  },
  {
    id: "bandit-hunt",
    name: "Bandit Hunt",
    description: "A torch-bearing raider pushes the line with fire.",
    previewText: "Greywatch calls for a hunter of outlaws.",
    biome: "greywatch",
    rooms: 3,
    rewardTier: "magic",
    enemies: [
      createEnemy({
        id: "fire-raider",
        name: "Fire Raider",
        stats: {
          maxHp: 62,
          attack: 12,
          defense: 6,
          speed: 10,
          critChance: 0.06,
          critDamage: 1.45,
          blockChance: 0.02,
          dodgeChance: 0.03,
        },
        resistances: { ...ZERO_RESISTANCES, fireDamage: 0.1 },
        abilities: ["enemy-firebrand", "enemy-cleave"],
        xpReward: 85,
        goldReward: 70,
        honorReward: 40,
        lootTable: ["armor-10"],
      }),
    ],
    rewards: { guaranteedLoot: ["armor-10"], bonusGold: 40, bonusHonor: 25 },
  },
  {
    id: "wolf-hunt",
    name: "Wolf Hunt",
    description:
      "Frost-bitten wolves and a hunter from Ironwood test your timing.",
    previewText: "Cold mist rolls over Ironwood.",
    biome: "greywatch",
    rooms: 3,
    rewardTier: "magic",
    enemies: [
      createEnemy({
        id: "ironwood-hunter",
        name: "Ironwood Hunter",
        stats: {
          maxHp: 68,
          attack: 13,
          defense: 7,
          speed: 11,
          critChance: 0.05,
          critDamage: 1.5,
          blockChance: 0.02,
          dodgeChance: 0.04,
        },
        resistances: { ...ZERO_RESISTANCES, frostDamage: 0.1 },
        abilities: ["enemy-frostbite", "enemy-cleave"],
        xpReward: 100,
        goldReward: 80,
        honorReward: 45,
        lootTable: ["weapon-14"],
      }),
    ],
    rewards: { guaranteedLoot: ["weapon-14"], bonusGold: 50, bonusHonor: 30 },
  },
  {
    id: "village-defense",
    name: "Village Defense",
    description:
      "Stormkeep scouts practice cruel lightning magic on villagers.",
    previewText: "A storm gathers over the thatch roofs.",
    biome: "greywatch",
    rooms: 4,
    rewardTier: "rare",
    enemies: [
      createEnemy({
        id: "stormkeep-deserter",
        name: "Stormkeep Deserter",
        stats: {
          maxHp: 76,
          attack: 14,
          defense: 8,
          speed: 11,
          critChance: 0.05,
          critDamage: 1.5,
          blockChance: 0.04,
          dodgeChance: 0.03,
        },
        resistances: { ...ZERO_RESISTANCES, lightningDamage: 0.15 },
        abilities: ["enemy-thunder-jolt", "enemy-cleave"],
        xpReward: 115,
        goldReward: 95,
        honorReward: 55,
        lootTable: ["accessory-10"],
      }),
    ],
    rewards: {
      guaranteedLoot: ["accessory-10"],
      bonusGold: 50,
      bonusHonor: 40,
    },
  },
  {
    id: "tournament",
    name: "Greywatch Tournament",
    description:
      "Win before the crowd and the crown's agents will hear your name.",
    previewText: "The lists are open. Steel will decide your standing.",
    biome: "greywatch",
    rooms: 4,
    rewardTier: "rare",
    enemies: [
      createEnemy({
        id: "tournament-knight",
        name: "Tournament Knight",
        stats: {
          maxHp: 92,
          attack: 16,
          defense: 10,
          speed: 12,
          critChance: 0.07,
          critDamage: 1.55,
          blockChance: 0.06,
          dodgeChance: 0.03,
        },
        resistances: { ...ZERO_RESISTANCES },
        abilities: ["enemy-cleave"],
        xpReward: 135,
        goldReward: 130,
        honorReward: 95,
        lootTable: ["set-greywatch-helm"],
      }),
    ],
    rewards: {
      guaranteedLoot: ["set-greywatch-helm"],
      bonusGold: 70,
      bonusHonor: 60,
      bonusPrestige: 25,
    },
  },
  {
    id: "roderick",
    name: "Roderick the Red",
    description: "The bandit lord of Greywatch waits in a ruined watchtower.",
    previewText:
      "Roderick raises his greatsword overhead. One duel decides whether Greywatch keeps breathing.",
    biome: "greywatch",
    rooms: 5,
    rewardTier: "unique",
    bossExclusiveDrops: ["unique-rodericks-bloodletter"],
    enemies: [
      createEnemy({
        id: "roderick",
        name: "Roderick the Red",
        stats: {
          maxHp: 150,
          attack: 21,
          defense: 12,
          speed: 10,
          critChance: 0.08,
          critDamage: 1.7,
          blockChance: 0.05,
          dodgeChance: 0.03,
        },
        resistances: {
          ...ZERO_RESISTANCES,
          fireDamage: 0.2,
          burnApplication: 0.1,
        },
        abilities: ["dirty-strike", "roderick-cleave", "battle-fury"],
        xpReward: 260,
        goldReward: 300,
        honorReward: 250,
        lootTable: ["unique-rodericks-bloodletter"],
        boss: true,
      }),
    ],
    rewards: {
      guaranteedLoot: ["unique-rodericks-bloodletter"],
      bonusGold: 200,
      bonusHonor: 250,
      bonusPrestige: 60,
      achievement: "Savior of Greywatch",
    },
  },
];

const DUNGEON_EXTENSIONS: Array<{
  id: QuestId;
  name: string;
  description: string;
  biome: BiomeId;
  enemy: string;
  boss?: boolean;
  exclusiveDrop?: string;
}> = [
  {
    id: "ironwood-ambush",
    name: "Ironwood Ambush",
    description: "Elven scouts and thorn beasts stalk the ancient trees.",
    biome: "ironwood",
    enemy: "Thorn Elf",
  },
  {
    id: "elven-ruins",
    name: "The Sunken Grove",
    description: "Lost elven guardians awaken beneath the roots.",
    biome: "ironwood",
    enemy: "Grove Sentinel",
  },
  {
    id: "thornmother-grove",
    name: "Thornmother's Grove",
    description: "A forest matriarch commands her briar-born court.",
    biome: "ironwood",
    enemy: "Thornmother",
    boss: true,
    exclusiveDrop: "boss-ironwood-moonblade",
  },
  {
    id: "moonlit-hunt",
    name: "Moonlit Hunt",
    description: "Spectral hounds race through a silvered forest trail.",
    biome: "ironwood",
    enemy: "Moon Hound",
  },
  {
    id: "ironwood-citadel",
    name: "Ironwood Citadel",
    description: "The last elf-lord defends a citadel of living wood.",
    biome: "ironwood",
    enemy: "Elf-Lord Aelthorn",
    boss: true,
    exclusiveDrop: "boss-ironwood-moonblade",
  },
  {
    id: "frostmarch-trail",
    name: "Frostmarch Trail",
    description: "Ice raiders test every step across the white waste.",
    biome: "frostmarch",
    enemy: "Frost Raider",
  },
  {
    id: "icebound-crypt",
    name: "Icebound Crypt",
    description: "The dead rise beneath a buried glacier shrine.",
    biome: "frostmarch",
    enemy: "Ice Wight",
  },
  {
    id: "winter-wolves",
    name: "Winter Wolf Den",
    description: "A pack of mythic wolves stalks the frozen moonlight.",
    biome: "frostmarch",
    enemy: "Winter Wolf",
  },
  {
    id: "glacier-gate",
    name: "Glacier Gate",
    description: "Stone giants guard the pass to an ancient wyrm.",
    biome: "frostmarch",
    enemy: "Glacier Giant",
  },
  {
    id: "frost-wyrm",
    name: "Frost Wyrm's Lair",
    description: "An elder dragon freezes the breath in your lungs.",
    biome: "frostmarch",
    enemy: "Frost Wyrm",
    boss: true,
    exclusiveDrop: "boss-frostmarch-wyrmguard",
  },
  {
    id: "ember-road",
    name: "Ember Road",
    description: "Ash devils and fire cultists block the blackened road.",
    biome: "emberpeak",
    enemy: "Ash Devil",
  },
  {
    id: "salamander-pit",
    name: "Salamander Pit",
    description: "Molten beasts spill from a fissure under the mountain.",
    biome: "emberpeak",
    enemy: "Magma Salamander",
  },
  {
    id: "ashen-arena",
    name: "Ashen Arena",
    description: "The fire court demands a trial against its champions.",
    biome: "emberpeak",
    enemy: "Cinder Champion",
  },
  {
    id: "volcanic-forge",
    name: "Volcanic Forge",
    description: "A living forge hammers weapons for the dragon's army.",
    biome: "emberpeak",
    enemy: "Forge Colossus",
  },
  {
    id: "ember-dragon",
    name: "The Ember Dragon",
    description: "A flame dragon keeps a hoard beneath Emberpeak.",
    biome: "emberpeak",
    enemy: "Ember Dragon",
    boss: true,
    exclusiveDrop: "boss-emberpeak-heartplate",
  },
  {
    id: "crown-gate",
    name: "Crown Gate",
    description: "Dragonborn sentinels bar the road to the old throne.",
    biome: "dragon-crown",
    enemy: "Dragonborn Sentinel",
  },
  {
    id: "cloud-citadel",
    name: "Cloud Citadel",
    description: "Storm elves descend from a palace above the clouds.",
    biome: "dragon-crown",
    enemy: "Storm Elf",
  },
  {
    id: "dragon-guard",
    name: "The Dragon Guard",
    description: "Ancient guardians test those who would claim the crown.",
    biome: "dragon-crown",
    enemy: "Dragon Guard",
  },
  {
    id: "throne-of-scales",
    name: "Throne of Scales",
    description: "Defeat the Crown Dragon and claim the path to sovereignty.",
    biome: "dragon-crown",
    enemy: "Crown Dragon",
    boss: true,
    exclusiveDrop: "boss-dragon-crown-signet",
  },
];

function createDungeonEncounter(
  definition: (typeof DUNGEON_EXTENSIONS)[number],
  offset: number
): EncounterDefinition {
  const difficulty = offset + GREYWATCH_ENCOUNTERS.length + 1;
  const boss = definition.boss ?? false;
  const rewardTier: Rarity = boss
    ? "unique"
    : difficulty % 4 === 0
    ? "rare"
    : difficulty % 2 === 0
    ? "magic"
    : "normal";
  const goldReward = 80 + difficulty * difficulty * 72;
  const enemyCount = boss ? 4 : 3;
  const enemies = Array.from({ length: enemyCount }, (_, room) =>
    createEnemy({
      id: `${definition.id}-room-${room + 1}`,
      name:
        room === enemyCount - 1 && boss
          ? definition.enemy
          : `${definition.enemy} ${room + 1}`,
      stats: {
        maxHp: 72 + difficulty * 38 + room * 24,
        attack: 11 + difficulty * 3 + room,
        defense: 5 + difficulty * 2,
        speed: 9 + (difficulty % 6),
        critChance: 0.05 + difficulty * 0.002,
        critDamage: 1.45 + difficulty * 0.015,
        blockChance: 0.03 + difficulty * 0.002,
        dodgeChance: 0.02 + difficulty * 0.001,
      },
      resistances: {
        ...ZERO_RESISTANCES,
        fireDamage: definition.biome === "emberpeak" ? 0.2 : 0,
        frostDamage: definition.biome === "frostmarch" ? 0.2 : 0,
        lightningDamage: definition.biome === "dragon-crown" ? 0.16 : 0,
      },
      abilities:
        definition.biome === "frostmarch"
          ? ["enemy-frostbite", "enemy-cleave"]
          : definition.biome === "emberpeak"
          ? ["enemy-firebrand", "enemy-cleave"]
          : definition.biome === "dragon-crown"
          ? ["enemy-thunder-jolt", "enemy-cleave"]
          : ["enemy-cleave"],
      xpReward: 45 + difficulty * 28,
      goldReward: Math.round(goldReward / enemyCount),
      honorReward: 14 + difficulty * 13,
      lootTable: [
        definition.exclusiveDrop ?? `weapon-${Math.min(99, difficulty * 4)}`,
        `armor-${Math.min(99, difficulty * 4 + 1)}`,
        `accessory-${Math.min(99, difficulty * 4 + 2)}`,
      ],
      boss: boss && room === enemyCount - 1,
    })
  );
  const materials =
    definition.biome === "ironwood"
      ? { wood: difficulty * 5, stone: difficulty * 2 }
      : definition.biome === "frostmarch"
      ? { stone: difficulty * 6, iron: difficulty * 3 }
      : definition.biome === "emberpeak"
      ? { iron: difficulty * 7, orichalcum: boss ? difficulty : 0 }
      : { iron: difficulty * 8, orichalcum: boss ? difficulty * 2 : 0 };
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    previewText: `${definition.biome.replace(
      "-",
      " "
    )} dungeon · ${enemyCount} rooms cleared for a final chest.`,
    biome: definition.biome,
    rooms: enemyCount,
    rewardTier,
    bossExclusiveDrops: definition.exclusiveDrop
      ? [definition.exclusiveDrop]
      : undefined,
    enemies,
    rewards: {
      guaranteedLoot: definition.exclusiveDrop
        ? [definition.exclusiveDrop]
        : undefined,
      bonusGold: goldReward,
      bonusHonor: difficulty * 24,
      bonusPrestige: boss ? difficulty * 7 : 0,
      materials,
      achievement: boss ? `Conqueror of ${definition.name}` : undefined,
    },
  };
}

export const ENCOUNTERS: EncounterDefinition[] = [
  ...GREYWATCH_ENCOUNTERS,
  ...DUNGEON_EXTENSIONS.map(createDungeonEncounter),
];

export function buildStarterPlayer(
  username: string,
  specialization: PlayerState["specialization"]
): PlayerState {
  const specializationBonuses = {
    knight: { defense: 2, blockChance: 0.03 },
    barbarian: { attack: 5, maxHp: 18 },
    ranger: { speed: 4, critChance: 0.03 },
    witch: { attack: 4, critChance: 0.04 },
    rogue: { speed: 3, critChance: 0.06 },
  }[specialization];

  const starterWeapon = findItem(
    {
      knight: "weapon-0",
      barbarian: "weapon-4",
      ranger: "weapon-6",
      witch: "weapon-10",
      rogue: "weapon-8",
    }[specialization]
  );
  const starterShield = findItem("shield-0");
  const starterChest = findItem(
    specialization === "knight" || specialization === "barbarian"
      ? "armor-5"
      : "armor-0"
  );
  const starterBoots = findItem(
    specialization === "knight" || specialization === "barbarian"
      ? "armor-9"
      : "armor-4"
  );

  const equipment: PlayerState["equipment"] = {
    weapon: starterWeapon,
    offhand: specialization === "knight" ? starterShield : null,
    chest: starterChest,
    boots: starterBoots,
    helmet: null,
    gauntlets: null,
    legs: null,
    cloak: null,
    belt: null,
    ring1: null,
    ring2: null,
    amulet: null,
  };

  return {
    redditUserId: "local-user",
    username,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    level: 1,
    xp: 0,
    skillPoints: 0,
    skillUpgrades: { attack: 0, defense: 0, health: 0 },
    materials: { wood: 8, stone: 4, iron: 0, orichalcum: 0 },
    gold: 100,
    gems: 25,
    honor: 0,
    prestige: 0,
    reputation: 0,
    nobleSupport: 0,
    popularSupport: 0,
    churchSupport: 0,
    militarySupport: 0,
    legitimacy: 0,
    throneProximity: 2,
    gearScore: 0,
    specialization,
    currentTitle: "unknown-knight",
    titles: ["unknown-knight"],
    achievements: [],
    tournamentWins: 0,
    completedQuests: [],
    currentQuestIndex: 0,
    inventoryCapacity: 24,
    inventory:
      specialization === "knight"
        ? [starterWeapon, starterShield, starterChest, starterBoots]
        : [starterWeapon, starterChest, starterBoots],
    equipment,
    abilities: [
      "attack",
      "power-strike",
      "shield-wall",
      "riposte",
      "second-wind",
      "battle-cry",
      "execute",
      "charge",
    ],
    baseStats: {
      ...BASE_PLAYER_STATS,
      attack: BASE_PLAYER_STATS.attack + (specializationBonuses.attack ?? 0),
      defense: BASE_PLAYER_STATS.defense + (specializationBonuses.defense ?? 0),
      speed: BASE_PLAYER_STATS.speed + (specializationBonuses.speed ?? 0),
      critChance:
        BASE_PLAYER_STATS.critChance + (specializationBonuses.critChance ?? 0),
      blockChance:
        BASE_PLAYER_STATS.blockChance +
        (specializationBonuses.blockChance ?? 0),
      critDamage: BASE_PLAYER_STATS.critDamage,
      dodgeChance: BASE_PLAYER_STATS.dodgeChance,
      maxHp: BASE_PLAYER_STATS.maxHp + (specializationBonuses.maxHp ?? 0),
    },
    stats: {
      ...BASE_PLAYER_STATS,
      attack: BASE_PLAYER_STATS.attack + (specializationBonuses.attack ?? 0),
      defense: BASE_PLAYER_STATS.defense + (specializationBonuses.defense ?? 0),
      speed: BASE_PLAYER_STATS.speed + (specializationBonuses.speed ?? 0),
      critChance:
        BASE_PLAYER_STATS.critChance + (specializationBonuses.critChance ?? 0),
      blockChance:
        BASE_PLAYER_STATS.blockChance +
        (specializationBonuses.blockChance ?? 0),
      critDamage: BASE_PLAYER_STATS.critDamage,
      dodgeChance: BASE_PLAYER_STATS.dodgeChance,
      maxHp: BASE_PLAYER_STATS.maxHp + (specializationBonuses.maxHp ?? 0),
    },
    statusResistances: { ...ZERO_RESISTANCES },
    worldTimers: [
      {
        id: "greywatch-barracks",
        label: "Greywatch Barracks Repairs",
        startedAt: Date.now(),
        endsAt: Date.now() + 1000 * 60 * 45,
        supportsWorldSpeed: true,
        rewardGold: 140,
        completed: false,
      },
    ],
    activeWorldSpeed: null,
    lastSeenAt: Date.now(),
  };
}

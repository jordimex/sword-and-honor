import {
  ABILITIES,
  ENCOUNTERS,
  findItem,
  ITEM_CATALOG,
} from "@/shared/game/content";
import {
  MAX_KNIGHT_LEVEL,
  STATUS_CAPS,
  TITLE_DEFINITIONS,
  ZERO_RESISTANCES,
} from "@/shared/game/balance";
import type {
  AbilityId,
  CombatLogEntry,
  CombatState,
  Combatant,
  DamageType,
  EncounterDefinition,
  ItemDefinition,
  MaterialId,
  OfflineProgressSummary,
  PlayerState,
  Resistances,
  StatusEffect,
  SkillId,
  Specialization,
  WorldSpeedOption,
} from "@/shared/game/types";
import { createSeededRng } from "@/shared/game/rng";

export class SaveService {
  static key = "sword-and-honor-save";

  static load(): PlayerState | null {
    if (typeof localStorage === "undefined") {
      return null;
    }
    const raw = localStorage.getItem(SaveService.key);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<PlayerState>;
    const legacyClass: Record<string, PlayerState["specialization"]> = {
      swordsman: "knight",
      guardian: "barbarian",
      duelist: "rogue",
      sorcerer: "witch",
    };
    // Save files from earlier playtests predate crafting and skill training.
    return {
      ...saved,
      specialization:
        legacyClass[String(saved.specialization)] ??
        saved.specialization ??
        "knight",
      skillPoints: saved.skillPoints ?? 0,
      skillUpgrades: saved.skillUpgrades ?? {
        attack: 0,
        defense: 0,
        health: 0,
      },
      materials: saved.materials ?? {
        wood: 8,
        stone: 4,
        iron: 0,
        orichalcum: 0,
      },
    } as PlayerState;
  }

  static save(player: PlayerState): void {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.setItem(SaveService.key, JSON.stringify(player));
  }

  static clear(): void {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.removeItem(SaveService.key);
  }
}

function sumResistances(...parts: Partial<Resistances>[]): Resistances {
  return parts.reduce<Resistances>(
    (acc, value) => ({
      fireDamage: acc.fireDamage + (value.fireDamage ?? 0),
      frostDamage: acc.frostDamage + (value.frostDamage ?? 0),
      lightningDamage: acc.lightningDamage + (value.lightningDamage ?? 0),
      burnApplication: acc.burnApplication + (value.burnApplication ?? 0),
      chillApplication: acc.chillApplication + (value.chillApplication ?? 0),
      freezeApplication: acc.freezeApplication + (value.freezeApplication ?? 0),
      shockApplication: acc.shockApplication + (value.shockApplication ?? 0),
      burnRecovery: acc.burnRecovery + (value.burnRecovery ?? 0),
      chillRecovery: acc.chillRecovery + (value.chillRecovery ?? 0),
      shockRecovery: acc.shockRecovery + (value.shockRecovery ?? 0),
      stunRecovery: acc.stunRecovery + (value.stunRecovery ?? 0),
      statusRecovery: acc.statusRecovery + (value.statusRecovery ?? 0),
    }),
    { ...ZERO_RESISTANCES }
  );
}

function cloneStatus(status: StatusEffect): StatusEffect {
  return { ...status, tags: [...status.tags] };
}

export class EquipmentService {
  static computePlayerState(player: PlayerState): PlayerState {
    const equippedItems = Object.values(player.equipment).filter(
      (item): item is ItemDefinition => Boolean(item)
    );
    const statBonus = equippedItems.reduce(
      (acc, item) => ({
        maxHp: acc.maxHp + (item.statBonuses.maxHp ?? 0),
        attack: acc.attack + (item.statBonuses.attack ?? 0),
        defense: acc.defense + (item.statBonuses.defense ?? 0),
        speed: acc.speed + (item.statBonuses.speed ?? 0),
        critChance: acc.critChance + (item.statBonuses.critChance ?? 0),
        critDamage: acc.critDamage + (item.statBonuses.critDamage ?? 0),
        blockChance: acc.blockChance + (item.statBonuses.blockChance ?? 0),
        dodgeChance: acc.dodgeChance + (item.statBonuses.dodgeChance ?? 0),
      }),
      {
        ...player.baseStats,
        // Skill investments are applied before gear so equipment remains additive.
        maxHp: player.baseStats.maxHp + player.skillUpgrades.health * 12,
        attack: player.baseStats.attack + player.skillUpgrades.attack * 2,
        defense: player.baseStats.defense + player.skillUpgrades.defense * 2,
        critDamage: player.baseStats.critDamage,
      }
    );
    const resistances = sumResistances(
      player.statusResistances,
      ...equippedItems.map((item) => item.resistanceBonuses)
    );
    const gearScore = equippedItems.reduce(
      (total, item) => total + item.gearScore,
      0
    );
    return {
      ...player,
      stats: statBonus,
      statusResistances: resistances,
      gearScore,
      updatedAt: Date.now(),
    };
  }

  static equip(player: PlayerState, itemId: string): PlayerState {
    const item = player.inventory.find((entry) => entry.id === itemId);
    if (
      !item ||
      (item.allowedClasses?.length &&
        !item.allowedClasses.includes(player.specialization))
    ) {
      return player;
    }
    const nextEquipment = { ...player.equipment, [item.slot]: item };
    return EquipmentService.computePlayerState({
      ...player,
      equipment: nextEquipment,
    });
  }

  static upgradeCost(item: ItemDefinition): {
    gold: number;
    materials: Partial<Record<MaterialId, number>>;
  } {
    const nextLevel = (item.upgradeLevel ?? 0) + 1;
    const material: MaterialId =
      item.tier === "tier9"
        ? "orichalcum"
        : item.tier === "tier6" ||
          item.tier === "tier7" ||
          item.tier === "tier8"
        ? "iron"
        : item.tier === "tier3" ||
          item.tier === "tier4" ||
          item.tier === "tier5"
        ? "stone"
        : "wood";
    return {
      gold: item.gearScore * (nextLevel + 2),
      materials: { [material]: nextLevel * 2 },
    };
  }

  static upgrade(player: PlayerState, itemId: string): PlayerState {
    const item = player.inventory.find((entry) => entry.id === itemId);
    if (!item) return player;
    const cost = EquipmentService.upgradeCost(item);
    const material = Object.keys(cost.materials)[0] as MaterialId;
    const needed = cost.materials[material] ?? 0;
    if (player.gold < cost.gold || player.materials[material] < needed)
      return player;

    // Upgrade the inventory copy and every equipped reference to keep the loadout in sync.
    const upgraded: ItemDefinition = {
      ...item,
      upgradeLevel: (item.upgradeLevel ?? 0) + 1,
      gearScore:
        item.gearScore + Math.max(4, Math.round(item.gearScore * 0.12)),
      statBonuses: {
        ...item.statBonuses,
        attack:
          (item.statBonuses.attack ?? 0) + (item.category === "weapon" ? 2 : 0),
        defense:
          (item.statBonuses.defense ?? 0) +
          (item.category !== "weapon" ? 2 : 0),
        maxHp: (item.statBonuses.maxHp ?? 0) + 4,
      },
    };
    const inventory = player.inventory.map((entry) =>
      entry.id === itemId ? upgraded : entry
    );
    const equipment = Object.fromEntries(
      Object.entries(player.equipment).map(([slot, equipped]) => [
        slot,
        equipped?.id === itemId ? upgraded : equipped,
      ])
    ) as PlayerState["equipment"];
    return EquipmentService.computePlayerState({
      ...player,
      gold: player.gold - cost.gold,
      materials: {
        ...player.materials,
        [material]: player.materials[material] - needed,
      },
      inventory,
      equipment,
    });
  }
}

export class PlayerService {
  static toCombatant(player: PlayerState): Combatant {
    const elementalDamage = Object.values(player.equipment).reduce<
      Combatant["elementalDamage"]
    >(
      (acc, item) => ({
        fire: (acc?.fire ?? 0) + (item?.elementalDamage?.fire ?? 0),
        frost: (acc?.frost ?? 0) + (item?.elementalDamage?.frost ?? 0),
        lightning:
          (acc?.lightning ?? 0) + (item?.elementalDamage?.lightning ?? 0),
      }),
      {}
    );
    return {
      id: "player",
      name: player.username,
      isPlayer: true,
      title: player.currentTitle,
      hp: player.stats.maxHp,
      stats: { ...player.stats },
      resistances: { ...player.statusResistances },
      statuses: [],
      cooldowns: {},
      abilities: [...player.abilities],
      equipment: player.equipment,
      elementalDamage,
    };
  }
}

export class ProgressionService {
  static addRewards(
    player: PlayerState,
    encounter: EncounterDefinition
  ): PlayerState {
    const defeated = encounter.enemies.reduce(
      (acc, enemy) => ({
        xp: acc.xp + enemy.xpReward,
        gold: acc.gold + enemy.goldReward,
        honor: acc.honor + enemy.honorReward,
      }),
      {
        xp: 0,
        gold: encounter.rewards.bonusGold ?? 0,
        honor: encounter.rewards.bonusHonor ?? 0,
      }
    );

    let next = {
      ...player,
      xp: player.xp + defeated.xp,
      gold: player.gold + defeated.gold,
      honor: player.honor + defeated.honor,
      prestige: player.prestige + (encounter.rewards.bonusPrestige ?? 0),
      reputation: player.reputation + (encounter.id === "roderick" ? 8 : 3),
      materials: Object.entries(encounter.rewards.materials ?? {}).reduce(
        (materials, [material, amount]) => ({
          ...materials,
          [material]: materials[material as MaterialId] + (amount ?? 0),
        }),
        { ...player.materials }
      ),
      completedQuests: player.completedQuests.includes(encounter.id)
        ? player.completedQuests
        : [...player.completedQuests, encounter.id],
      currentQuestIndex: Math.min(
        player.currentQuestIndex + 1,
        ENCOUNTERS.length - 1
      ),
      tournamentWins:
        player.tournamentWins + (encounter.id === "tournament" ? 1 : 0),
      updatedAt: Date.now(),
    };
    return ThroneProgressionService.updateTitleAndThrone(next);
  }
}

export class SkillService {
  static goldCost(player: PlayerState): number {
    // The quadratic curve keeps early training affordable while making high levels meaningful.
    return 35 + player.level * player.level * 4;
  }

  static upgrade(player: PlayerState, skill: SkillId): PlayerState {
    const cost = SkillService.goldCost(player);
    if (player.level >= MAX_KNIGHT_LEVEL || player.gold < cost) return player;
    return EquipmentService.computePlayerState({
      ...player,
      gold: player.gold - cost,
      level: player.level + 1,
      skillPoints: player.skillPoints + 1,
      skillUpgrades: {
        ...player.skillUpgrades,
        [skill]: player.skillUpgrades[skill] + 1,
      },
      updatedAt: Date.now(),
    });
  }
}

export class ThroneProgressionService {
  static updateTitleAndThrone(player: PlayerState): PlayerState {
    const unlocked = TITLE_DEFINITIONS.filter(
      (title) =>
        player.level >= title.unlock.level &&
        player.honor >= title.unlock.honor &&
        player.prestige >= title.unlock.prestige &&
        player.reputation >= title.unlock.reputation &&
        player.tournamentWins >= title.unlock.tournamentWins
    );
    const current = unlocked.at(-1) ?? TITLE_DEFINITIONS[0];
    const titles = TITLE_DEFINITIONS.filter((title) =>
      unlocked.some((entry) => entry.id === title.id)
    ).map((title) => title.id);
    const throneProximity = Math.min(
      100,
      Math.round(
        player.level * 1.8 +
          player.honor / 60 +
          player.prestige / 8 +
          player.reputation * 1.5 +
          player.tournamentWins * 5 +
          player.gold / 500 +
          player.gearScore / 50
      )
    );
    return {
      ...player,
      currentTitle: current.id,
      titles,
      throneProximity,
    };
  }

  static nextMilestone(player: PlayerState): {
    label: string;
    requirements: Array<{ label: string; current: number; target: number }>;
  } {
    const next =
      TITLE_DEFINITIONS.find(
        (title) =>
          title.id !== player.currentTitle && !player.titles.includes(title.id)
      ) ?? TITLE_DEFINITIONS.at(-1)!;
    return {
      label: next.label,
      requirements: [
        { label: "Honor", current: player.honor, target: next.unlock.honor },
        {
          label: "Gold",
          current: player.gold,
          target: next.unlock.level >= 15 ? 5000 : 500,
        },
        { label: "Level", current: player.level, target: next.unlock.level },
        {
          label: "Crown Reputation",
          current: player.reputation,
          target: next.unlock.reputation,
        },
        {
          label: "Tournament Victories",
          current: player.tournamentWins,
          target: next.unlock.tournamentWins,
        },
      ],
    };
  }
}

export class WorldSimulationService {
  static processOffline(
    player: PlayerState,
    now: number
  ): { player: PlayerState; summary: OfflineProgressSummary } {
    const completedTimers: string[] = [];
    let goldCollected = 0;
    const multiplier =
      player.activeWorldSpeed &&
      player.activeWorldSpeed.endsAt > player.lastSeenAt
        ? player.activeWorldSpeed.multiplier
        : 1;
    const worldTimers = player.worldTimers.map((timer) => {
      if (timer.completed) {
        return timer;
      }
      const effectiveNow = timer.supportsWorldSpeed
        ? player.lastSeenAt + (now - player.lastSeenAt) * multiplier
        : now;
      if (effectiveNow >= timer.endsAt) {
        completedTimers.push(timer.label);
        goldCollected += timer.rewardGold ?? 0;
        return { ...timer, completed: true };
      }
      return timer;
    });
    return {
      player: {
        ...player,
        gold: player.gold + goldCollected,
        worldTimers,
        lastSeenAt: now,
      },
      summary: { completedTimers, goldCollected },
    };
  }
}

export class GemService {
  static activateWorldSpeed(
    player: PlayerState,
    option: WorldSpeedOption
  ): PlayerState {
    if (player.gems < option.gemCost) {
      return player;
    }
    const now = Date.now();
    return {
      ...player,
      gems: player.gems - option.gemCost,
      activeWorldSpeed: {
        startedAt: now,
        endsAt: now + option.minutes * 60 * 1000,
        multiplier: 2,
      },
    };
  }
}

export class LootService {
  static generateEncounterLoot(
    encounter: EncounterDefinition,
    seed: number,
    specialization: Specialization
  ): ItemDefinition[] {
    const rng = createSeededRng(seed);
    const usableDrop = (itemId: string) => {
      const rolled = findItem(itemId);
      if (
        !rolled.allowedClasses?.length ||
        rolled.allowedClasses.includes(specialization)
      ) {
        return rolled;
      }

      // Preserve the drop's equipment role where possible, then reroll within the active class pool.
      const compatible = ITEM_CATALOG.filter(
        (item) =>
          item.category === rolled.category &&
          item.slot === rolled.slot &&
          (!item.allowedClasses?.length ||
            item.allowedClasses.includes(specialization))
      );
      const fallback =
        compatible.length > 0
          ? compatible
          : ITEM_CATALOG.filter(
              (item) =>
                !item.allowedClasses?.length ||
                item.allowedClasses.includes(specialization)
            );
      return findItem(fallback[Math.floor(rng() * fallback.length)].id);
    };
    const guaranteed = encounter.rewards.guaranteedLoot?.map(usableDrop) ?? [];
    const enemyDrops = encounter.enemies
      .map((enemy) => {
        const dropId =
          enemy.lootTable[Math.floor(rng() * enemy.lootTable.length)];
        return usableDrop(dropId);
      })
      .slice(0, 1);
    return [...guaranteed, ...enemyDrops];
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function resistanceForDamage(
  resistances: Resistances,
  type: DamageType
): number {
  if (type === "fire") {
    return resistances.fireDamage;
  }
  if (type === "frost") {
    return resistances.frostDamage;
  }
  if (type === "lightning") {
    return resistances.lightningDamage;
  }
  return 0;
}

function statusResistance(
  resistances: Resistances,
  statusId: StatusEffect["id"]
): number {
  if (statusId === "burning") return resistances.burnApplication;
  if (statusId === "chilled") return resistances.chillApplication;
  if (statusId === "frozen") return resistances.freezeApplication;
  if (statusId === "shocked") return resistances.shockApplication;
  return 0;
}

function recoveryBonus(
  resistances: Resistances,
  statusId: StatusEffect["id"]
): number {
  if (statusId === "burning") return resistances.burnRecovery;
  if (statusId === "chilled" || statusId === "frozen")
    return resistances.chillRecovery;
  if (statusId === "shocked") return resistances.shockRecovery;
  return 0;
}

export class CombatEngine {
  static createEncounterState(
    player: PlayerState,
    encounterId: CombatState["encounterId"],
    seed = Date.now()
  ): CombatState {
    const encounter = ENCOUNTERS.find((entry) => entry.id === encounterId);
    if (!encounter) {
      throw new Error(`Unknown encounter: ${encounterId}`);
    }
    const playerCombatant = PlayerService.toCombatant(
      EquipmentService.computePlayerState(player)
    );
    const enemies = encounter.enemies.map((enemy, index) => ({
      id: `${enemy.id}-${index}`,
      name: enemy.name,
      isPlayer: false,
      hp: enemy.stats.maxHp,
      stats: { ...enemy.stats },
      resistances: { ...enemy.resistances },
      statuses: [],
      cooldowns: {},
      abilities: [...enemy.abilities],
    }));
    const turnOrder = CombatEngine.rollTurnOrder(
      [playerCombatant, ...enemies],
      seed
    );
    return {
      round: 1,
      encounterId,
      playerSpecialization: player.specialization,
      player: playerCombatant,
      enemies,
      turnOrder,
      activeTurnId: turnOrder[0],
      winner: null,
      log: [{ round: 1, text: encounter.previewText, emphasis: "warning" }],
      pendingLoot: [],
      rewardsClaimed: false,
    };
  }

  static rollTurnOrder(combatants: Combatant[], seed: number): string[] {
    const rng = createSeededRng(seed);
    return combatants
      .map((combatant) => ({
        id: combatant.id,
        initiative: combatant.stats.speed + Math.floor(rng() * 4),
      }))
      .sort((a, b) => b.initiative - a.initiative)
      .map((entry) => entry.id);
  }

  static performTurn(
    state: CombatState,
    abilityId: AbilityId,
    targetId?: string,
    seed = Date.now()
  ): CombatState {
    if (state.winner) {
      return state;
    }
    const rng = createSeededRng(seed);
    const encounter = ENCOUNTERS.find(
      (entry) => entry.id === state.encounterId
    )!;
    let player = structuredClone(state.player);
    let enemies = state.enemies.map((enemy) => structuredClone(enemy));
    const log: CombatLogEntry[] = [...state.log];
    const actor =
      player.id === state.activeTurnId
        ? player
        : enemies.find((enemy) => enemy.id === state.activeTurnId)!;
    const targets = actor.isPlayer
      ? enemies.filter((enemy) => enemy.hp > 0)
      : [player];
    const fallbackTarget =
      targets.find((entry) => entry.id === targetId) ?? targets[0];

    const startResults = CombatEngine.processTurnStart(actor, log);
    actor.statuses = startResults.statuses;
    actor.stats = startResults.stats;
    if (startResults.skipAction) {
      log.push({
        round: state.round,
        text: `${actor.name} is Frozen and loses the turn.`,
        emphasis: "status",
      });
    } else {
      const selectedAbility = ABILITIES[abilityId] ?? ABILITIES.attack;
      const actualTarget =
        selectedAbility.target === "self" ? actor : fallbackTarget;
      const result = selectedAbility.execute({
        source: actor,
        target: actualTarget,
        rng,
      });
      if (selectedAbility.target === "enemy") {
        const resolved = CombatEngine.resolveDamage(
          actor,
          actualTarget,
          result.damage ?? 0,
          result.damageType ?? "physical",
          rng,
          log,
          result.notes,
          state.round
        );
        if (actor.isPlayer) {
          enemies = enemies.map((enemy) =>
            enemy.id === resolved.target.id
              ? CombatEngine.applyStatuses(
                  resolved.target,
                  result.appliedStatuses ?? [],
                  rng,
                  log
                )
              : enemy
          );
        } else {
          player = CombatEngine.applyStatuses(
            resolved.target,
            result.appliedStatuses ?? [],
            rng,
            log
          );
        }
      } else {
        actor.hp = Math.min(actor.stats.maxHp, actor.hp + (result.heal ?? 0));
        if (result.heal) {
          log.push({
            round: state.round,
            text: `${actor.name} restores ${result.heal} HP.`,
            emphasis: "reward",
          });
        }
        if (abilityId === "second-wind") {
          actor.statuses = actor.statuses.filter(
            (status) => !["burning", "shocked"].includes(status.id)
          );
          log.push({
            round: state.round,
            text: `${actor.name} sheds lingering harm.`,
            emphasis: "status",
          });
        }
        actor.statuses = actor.statuses.concat(
          (result.selfStatuses ?? []).map(cloneStatus)
        );
        if (result.selfStatBuffs) {
          actor.stats = {
            ...actor.stats,
            attack: actor.stats.attack + (result.selfStatBuffs.attack ?? 0),
            defense: actor.stats.defense + (result.selfStatBuffs.defense ?? 0),
            speed: actor.stats.speed + (result.selfStatBuffs.speed ?? 0),
            maxHp: actor.stats.maxHp + (result.selfStatBuffs.maxHp ?? 0),
            critChance:
              actor.stats.critChance + (result.selfStatBuffs.critChance ?? 0),
            critDamage:
              actor.stats.critDamage + (result.selfStatBuffs.critDamage ?? 0),
            blockChance:
              actor.stats.blockChance + (result.selfStatBuffs.blockChance ?? 0),
            dodgeChance:
              actor.stats.dodgeChance + (result.selfStatBuffs.dodgeChance ?? 0),
          };
        }
        result.notes.forEach((text) => log.push({ round: state.round, text }));
      }
      actor.cooldowns[selectedAbility.id] = selectedAbility.cooldown;
      if (result.telegraph) {
        actor.telegraph = result.telegraph;
        log.push({
          round: state.round,
          text: result.telegraph,
          emphasis: "warning",
        });
      } else if (actor.telegraph && abilityId === "roderick-cleave") {
        actor.telegraph = undefined;
      }
    }

    const endResults = CombatEngine.processTurnEnd(
      actor,
      log,
      rng,
      state.round
    );
    actor.statuses = endResults.statuses;
    actor.hp = endResults.hp;
    actor.cooldowns = Object.fromEntries(
      Object.entries(actor.cooldowns)
        .map(([id, value]) => [id, Math.max(0, (value ?? 0) - 1)])
        .filter(([, value]) => Number(value) > 0)
    );

    if (actor.isPlayer) {
      player = actor;
    } else {
      enemies = enemies.map((enemy) => (enemy.id === actor.id ? actor : enemy));
    }
    enemies = enemies.filter((enemy) => enemy.hp > 0);

    const survivorList = [player, ...enemies];
    const currentIndex = state.turnOrder.indexOf(state.activeTurnId);
    let nextTurnOrder = state.turnOrder.filter((id) =>
      survivorList.some((entry) => entry.id === id)
    );
    if (nextTurnOrder.length === 0) {
      nextTurnOrder = CombatEngine.rollTurnOrder(survivorList, seed + 1);
    }

    let nextRound = state.round;
    let nextIndex =
      currentIndex >= nextTurnOrder.length - 1 ? 0 : currentIndex + 1;
    if (currentIndex >= nextTurnOrder.length - 1) {
      nextRound += 1;
      nextTurnOrder = CombatEngine.rollTurnOrder(
        survivorList,
        seed + nextRound
      );
      nextIndex = 0;
    }

    const winner =
      player.hp <= 0 ? "enemy" : enemies.length === 0 ? "player" : null;
    const nextState: CombatState = {
      ...state,
      round: nextRound,
      player,
      enemies,
      turnOrder: nextTurnOrder,
      activeTurnId: winner ? state.activeTurnId : nextTurnOrder[nextIndex],
      winner,
      log,
      pendingLoot:
        winner === "player"
          ? LootService.generateEncounterLoot(
              encounter,
              seed,
              state.playerSpecialization
            )
          : [],
    };
    if (winner === "player") {
      nextState.log.push({
        round: state.round,
        text: "Victory. Your name carries farther than before.",
        emphasis: "reward",
      });
    }
    if (winner === "enemy") {
      nextState.log.push({
        round: state.round,
        text: "Defeat. Even the worthy fall before the throne is won.",
        emphasis: "warning",
      });
    }
    return nextState;
  }

  private static resolveDamage(
    source: Combatant,
    target: Combatant,
    rawDamage: number,
    damageType: DamageType,
    rng: () => number,
    log: CombatLogEntry[],
    notes: string[],
    round: number
  ): { source: Combatant; target: Combatant } {
    const crit = rng() <= source.stats.critChance;
    const shielded = target.statuses.some(
      (status) => status.id === "shield-wall"
    );
    const shocked = target.statuses.some((status) => status.id === "shocked");
    const effectiveDefense =
      target.stats.defense * (shocked ? 0.8 : 1) * (shielded ? 1.3 : 1);
    const resisted = resistanceForDamage(target.resistances, damageType);
    const blockChance = clamp(
      target.stats.blockChance + (shielded ? 0.2 : 0),
      0,
      0.9
    );
    const dodged = rng() <= target.stats.dodgeChance;
    if (dodged) {
      log.push({ round, text: `${target.name} dodges the attack.` });
      return { source, target };
    }
    const blocked = rng() <= blockChance;
    const damageAfterDefense = Math.max(1, rawDamage - effectiveDefense);
    const damageAfterCrit = crit
      ? Math.round(damageAfterDefense * source.stats.critDamage)
      : damageAfterDefense;
    const damageAfterBlock = blocked
      ? Math.round(damageAfterCrit * 0.57)
      : damageAfterCrit;
    const finalDamage = Math.max(
      1,
      Math.round(
        damageAfterBlock * (1 - clamp(resisted, 0, STATUS_CAPS.resistance))
      )
    );
    target.hp = Math.max(0, target.hp - finalDamage);
    const flavor = notes.length > 0 ? ` ${notes[0]}` : "";
    log.push({
      round,
      text: `${source.name} hits ${
        target.name
      } for ${finalDamage} ${damageType} damage.${crit ? " Critical!" : ""}${
        blocked ? " Blocked." : ""
      }${flavor}`,
      emphasis: "damage",
    });
    return { source, target };
  }

  private static applyStatuses(
    target: Combatant,
    statuses: StatusEffect[],
    rng: () => number,
    log: CombatLogEntry[],
    round = 0
  ): Combatant {
    let updated = target;
    statuses.forEach((status) => {
      const chance = clamp(
        status.recoveryChance === 0
          ? 1 - statusResistance(updated.resistances, status.id)
          : 1 - statusResistance(updated.resistances, status.id),
        STATUS_CAPS.applicationFloor,
        STATUS_CAPS.applicationCeiling
      );
      if (rng() <= chance) {
        updated = {
          ...updated,
          statuses: [...updated.statuses, cloneStatus(status)],
        };
        const label =
          status.id === "burning"
            ? "BURNING"
            : status.id === "chilled"
            ? "CHILLED"
            : status.id === "frozen"
            ? "FROZEN"
            : "SHOCKED";
        log.push({
          round,
          text: `${updated.name} is ${label}.`,
          emphasis: "status",
        });
      } else {
        log.push({
          round,
          text: `${status.name} is resisted by ${updated.name}.`,
          emphasis: "status",
        });
      }
    });
    return updated;
  }

  private static processTurnStart(
    actor: Combatant,
    log: CombatLogEntry[]
  ): {
    statuses: StatusEffect[];
    stats: Combatant["stats"];
    skipAction: boolean;
  } {
    let skipAction = false;
    let speedPenalty = 0;
    let defensePenalty = 0;
    actor.statuses.forEach((status) => {
      if (status.id === "frozen") {
        skipAction = true;
      }
      if (status.id === "chilled") {
        speedPenalty += status.power;
      }
      if (status.id === "shocked") {
        defensePenalty += status.power;
      }
    });
    const stats = {
      ...actor.stats,
      speed: Math.max(1, Math.round(actor.stats.speed * (1 - speedPenalty))),
      defense: Math.max(
        0,
        Math.round(actor.stats.defense * (1 - defensePenalty))
      ),
    };
    if (actor.telegraph && !actor.isPlayer) {
      log.push({ round: 0, text: actor.telegraph, emphasis: "warning" });
    }
    return { statuses: actor.statuses, stats, skipAction };
  }

  private static processTurnEnd(
    actor: Combatant,
    log: CombatLogEntry[],
    rng: () => number,
    round: number
  ): { statuses: StatusEffect[]; hp: number } {
    let hp = actor.hp;
    const remaining: StatusEffect[] = [];
    actor.statuses.forEach((status) => {
      if (status.id === "burning") {
        const resisted = clamp(
          actor.resistances.fireDamage,
          0,
          STATUS_CAPS.resistance
        );
        const burnDamage = Math.max(
          1,
          Math.round(status.power * (1 - resisted))
        );
        hp = Math.max(0, hp - burnDamage);
        log.push({
          round,
          text: `Burning deals ${burnDamage} damage to ${actor.name}.`,
          emphasis: "status",
        });
      }
      const nextDuration = status.durationTurns - 1;
      const recoveryChance =
        status.recoveryChance +
        recoveryBonus(actor.resistances, status.id) +
        actor.resistances.statusRecovery;
      if (status.recoveryChance > 0 && rng() <= recoveryChance) {
        const recoveryText =
          status.id === "burning"
            ? "Burn extinguished."
            : status.id === "chilled" || status.id === "frozen"
            ? "Thawed."
            : "Shock ended.";
        log.push({
          round,
          text: `${actor.name}: ${recoveryText}`,
          emphasis: "status",
        });
        return;
      }
      if (nextDuration > 0 && status.id !== "frozen") {
        remaining.push({ ...status, durationTurns: nextDuration });
      }
    });
    return { statuses: remaining, hp };
  }
}

export class EconomyService {
  static sellItem(player: PlayerState, itemId: string): PlayerState {
    const item = player.inventory.find((entry) => entry.id === itemId);
    if (!item || item.locked || item.favorite) {
      return player;
    }
    return {
      ...player,
      inventory: player.inventory.filter((entry) => entry.id !== itemId),
      gold: player.gold + Math.max(10, Math.round(item.gearScore * 0.45)),
    };
  }
}

import { describe, expect, it } from "vitest";
import { BASE_PLAYER_STATS, WORLD_SPEED_OPTIONS } from "@/shared/game/balance";
import {
  ENCOUNTERS,
  ITEM_CATALOG,
  buildStarterPlayer,
  findItem,
} from "@/shared/game/content";
import {
  CombatEngine,
  EquipmentService,
  GemService,
  LootService,
  ProgressionService,
  SkillService,
  ThroneProgressionService,
  WorldSimulationService,
} from "@/shared/game/services";

describe("combat engine", () => {
  it("orders turns deterministically from seeded initiative", () => {
    const player = EquipmentService.computePlayerState(
      buildStarterPlayer("Aldric", "ranger")
    );
    const state = CombatEngine.createEncounterState(player, "tutorial", 99);
    expect(state.turnOrder[0]).toBeDefined();
    expect(state.turnOrder).toContain("player");
  });

  it("applies burn damage with fire resistance mitigation", () => {
    const player = EquipmentService.computePlayerState(
      buildStarterPlayer("Aldric", "knight")
    );
    player.statusResistances.fireDamage = 0.25;
    const state = CombatEngine.createEncounterState(player, "bandit-hunt", 7);
    const enemyTurn = CombatEngine.performTurn(
      { ...state, activeTurnId: "fire-raider-0" },
      "enemy-firebrand",
      "player",
      8
    );
    expect(enemyTurn.player.hp).toBeLessThan(enemyTurn.player.stats.maxHp);
  });

  it("lets frost enemies apply chilled or frozen", () => {
    const player = EquipmentService.computePlayerState(
      buildStarterPlayer("Aldric", "knight")
    );
    const state = CombatEngine.createEncounterState(player, "wolf-hunt", 3);
    const next = CombatEngine.performTurn(
      state,
      "attack",
      "ironwood-hunter-0",
      4
    );
    const enemyTurn = CombatEngine.performTurn(
      next,
      "enemy-frostbite",
      "player",
      5
    );
    expect(enemyTurn.player.statuses.length).toBeGreaterThan(0);
  });

  it("drops deterministic loot", () => {
    const loot = LootService.generateEncounterLoot(
      ENCOUNTERS[0],
      123,
      "knight"
    );
    expect(
      loot.every(
        (item) =>
          !item.allowedClasses?.length || item.allowedClasses.includes("knight")
      )
    ).toBe(true);
  });
});

describe("progression systems", () => {
  it("rewards dungeon gold while training controls levels", () => {
    const player = EquipmentService.computePlayerState(
      buildStarterPlayer("Aldric", "knight")
    );
    const rewarded = ProgressionService.addRewards(player, ENCOUNTERS[5]);
    const trained = SkillService.upgrade(
      { ...rewarded, gold: 10_000 },
      "attack"
    );
    expect(rewarded.level).toBe(player.level);
    expect(trained.level).toBe(player.level + 1);
    expect(trained.skillUpgrades.attack).toBe(1);
  });

  it("updates title and throne proximity", () => {
    const player = EquipmentService.computePlayerState(
      buildStarterPlayer("Aldric", "knight")
    );
    const advanced = ThroneProgressionService.updateTitleAndThrone({
      ...player,
      level: 6,
      honor: 900,
      prestige: 100,
      reputation: 13,
      tournamentWins: 1,
      gearScore: 300,
    });
    expect(advanced.currentTitle).toBe("knight-banneret");
    expect(advanced.throneProximity).toBeGreaterThan(20);
  });

  it("equips items and increases gear score", () => {
    const player = EquipmentService.computePlayerState(
      buildStarterPlayer("Aldric", "knight")
    );
    const upgraded = {
      ...player,
      inventory: [
        ...player.inventory,
        findItem("unique-rodericks-bloodletter"),
      ],
    };
    const equipped = EquipmentService.equip(
      upgraded,
      "unique-rodericks-bloodletter"
    );
    expect(equipped.gearScore).toBeGreaterThan(player.gearScore);
  });

  it("creates at least one hundred collectible pieces per equipment category", () => {
    expect(
      ITEM_CATALOG.filter((item) => item.category === "weapon").length
    ).toBeGreaterThanOrEqual(100);
    expect(
      ITEM_CATALOG.filter((item) => item.category === "armor").length
    ).toBeGreaterThanOrEqual(100);
    expect(
      ITEM_CATALOG.filter((item) => item.category === "shield").length
    ).toBeGreaterThanOrEqual(100);
    expect(
      ITEM_CATALOG.filter((item) => item.category === "accessory").length
    ).toBeGreaterThanOrEqual(100);
    expect(ITEM_CATALOG.some((item) => item.rarity === "unique")).toBe(true);
  });

  it("contains a long multi-biome dungeon campaign with boss relics", () => {
    expect(ENCOUNTERS.length).toBeGreaterThan(20);
    expect(new Set(ENCOUNTERS.map((encounter) => encounter.biome)).size).toBe(
      5
    );
    expect(
      ENCOUNTERS.some((encounter) => encounter.bossExclusiveDrops?.length)
    ).toBe(true);
  });
});

describe("world and premium systems", () => {
  it("activates 2x world speed by spending gems", () => {
    const player = EquipmentService.computePlayerState(
      buildStarterPlayer("Aldric", "ranger")
    );
    const activated = GemService.activateWorldSpeed(
      player,
      WORLD_SPEED_OPTIONS[0]
    );
    expect(activated.gems).toBe(player.gems - WORLD_SPEED_OPTIONS[0].gemCost);
    expect(activated.activeWorldSpeed?.multiplier).toBe(2);
  });

  it("completes timers while offline", () => {
    const player = EquipmentService.computePlayerState(
      buildStarterPlayer("Aldric", "ranger")
    );
    const now = Date.now();
    const processed = WorldSimulationService.processOffline(
      {
        ...player,
        worldTimers: player.worldTimers.map((timer) => ({
          ...timer,
          startedAt: now - 1000 * 60 * 90,
          endsAt: now - 1000 * 60 * 45,
        })),
        lastSeenAt: now - 1000 * 60 * 90,
        activeWorldSpeed: null,
      },
      now
    );
    expect(processed.summary.goldCollected).toBeGreaterThanOrEqual(140);
  });

  it("keeps base player stats intact for starter builds", () => {
    expect(BASE_PLAYER_STATS.maxHp).toBeGreaterThan(100);
  });
});

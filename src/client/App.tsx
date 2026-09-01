import { useEffect, useState } from "react";
import { ENCOUNTERS, buildStarterPlayer } from "@/shared/game/content";
import {
  CombatEngine,
  EquipmentService,
  ProgressionService,
  SaveService,
  SkillService,
  ThroneProgressionService,
  WorldSimulationService,
} from "@/shared/game/services";
import type {
  CombatState,
  EquipmentSlot,
  ItemDefinition,
  PlayerState,
  SkillId,
  Specialization,
} from "@/shared/game/types";
import knightArtwork from "@/client/assets/knight-cutout.png";

type Modal = "knight" | "combat" | "loot" | "gear" | "skills" | "map" | null;
const biomes = [
  "greywatch",
  "ironwood",
  "frostmarch",
  "emberpeak",
  "dragon-crown",
] as const;
const choices: Array<{ id: Specialization; label: string; detail: string }> = [
  { id: "knight", label: "Knight", detail: "Shield and plate" },
  { id: "ranger", label: "Ranger", detail: "Spears and speed" },
  { id: "witch", label: "Witch", detail: "Wands and magic" },
];
const comingClasses = ["Barbarian", "Rogue"];
const loadoutSlots: Array<{ slot: EquipmentSlot; label: string }> = [
  { slot: "weapon", label: "Weapon" },
  { slot: "helmet", label: "Helmet" },
  { slot: "chest", label: "Armor" },
  { slot: "offhand", label: "Offhand" },
  { slot: "gauntlets", label: "Gloves" },
  { slot: "boots", label: "Boots" },
  { slot: "cloak", label: "Cloak" },
  { slot: "ring1", label: "Ring" },
  { slot: "amulet", label: "Amulet" },
];
const skills: Array<{
  id: SkillId;
  label: string;
  detail: string;
  icon: string;
}> = [
  { id: "attack", label: "Attack", detail: "+2 attack", icon: "⚔" },
  { id: "defense", label: "Defense", detail: "+2 defense", icon: "◈" },
  { id: "health", label: "Health", detail: "+12 health", icon: "♥" },
];
const meter = (value: number, maximum: number) =>
  `${Math.max(0, Math.min(100, Math.round((value / maximum) * 100)))}%`;
const rarityLabel = (item: ItemDefinition) =>
  `${item.rarity} · T${item.tier.replace("tier", "")}`;

function enemyArtClass(name: string, biome: string) {
  if (biome === "greywatch") {
    if (name.includes("Archer")) return "enemy-art-greywatch-archer";
    if (name.includes("Wolf")) return "enemy-art-greywatch-wolf";
    if (name.includes("Tournament")) return "enemy-art-greywatch-knight";
    if (name.includes("Roderick")) return "enemy-art-greywatch-roderick";
    return "enemy-art-greywatch-bandit";
  }
  if (biome === "ironwood")
    return name.includes("Grove") || name.includes("Thornmother")
      ? "enemy-art-wilds-1"
      : name.includes("Hound")
      ? "enemy-art-wilds-2"
      : "enemy-art-wilds-0";
  if (biome === "frostmarch")
    return name.includes("Wight")
      ? "enemy-art-wilds-4"
      : name.includes("Giant")
      ? "enemy-art-wilds-5"
      : name.includes("Wolf")
      ? "enemy-art-wilds-2"
      : name.includes("Wyrm")
      ? "enemy-art-mythic"
      : "enemy-art-wilds-3";
  if (biome === "emberpeak")
    return name.includes("Salamander")
      ? "enemy-art-mythic-biomes-2"
      : name.includes("Cyclops") || name.includes("Colossus")
      ? "enemy-art-mythic-biomes-3"
      : name.includes("Minotaur")
      ? "enemy-art-mythic-biomes-0"
      : name.includes("Dragon")
      ? "enemy-art-mythic-biomes-5"
      : "enemy-art-mythic-biomes-1";
  return name.includes("Dragon")
    ? "enemy-art-mythic-biomes-5"
    : name.includes("Dragonborn") || name.includes("Guard")
    ? "enemy-art-mythic-biomes-4"
    : "enemy-art-wilds-0";
}

function GearIcon({
  item,
  compact = false,
}: {
  item: ItemDefinition;
  compact?: boolean;
}) {
  const weaponArt: Record<string, number> = {
    longsword: 0,
    greatsword: 0,
    axe: 1,
    warhammer: 1,
    spear: 2,
    dagger: 2,
    mace: 1,
    wand: 3,
    staff: 3,
  };
  const artIndex =
    item.category === "shield"
      ? 7
      : item.category === "accessory"
      ? item.slot === "amulet"
        ? 11
        : 10
      : item.category === "armor"
      ? item.slot === "helmet"
        ? 8
        : item.slot === "boots"
        ? 9
        : item.allowedClasses?.includes("witch")
        ? 6
        : item.allowedClasses?.includes("ranger") ||
          item.allowedClasses?.includes("rogue")
        ? 5
        : 4
      : weaponArt[item.weaponFamily ?? "longsword"];
  return (
    <span
      className={`gear-icon art-${artIndex} rarity-${item.rarity} ${
        compact ? "compact" : ""
      }`}
      aria-label={`${item.name} visual`}
    >
      <b>+{item.upgradeLevel ?? 0}</b>
    </span>
  );
}

export function App() {
  const [name, setName] = useState("Sir Rowan");
  const [specialization, setSpecialization] =
    useState<Specialization>("knight");
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [battleRunning, setBattleRunning] = useState(false);
  const [modal, setModal] = useState<Modal>("knight");
  const [loot, setLoot] = useState<ItemDefinition | null>(null);
  const [selectedGear, setSelectedGear] = useState<ItemDefinition | null>(null);
  const [notice, setNotice] = useState(
    "Forge your knight, then enter the Greywatch dungeon."
  );

  useEffect(() => {
    const saved = SaveService.load();
    if (!saved) return;
    const processed = WorldSimulationService.processOffline(saved, Date.now());
    setPlayer(EquipmentService.computePlayerState(processed.player));
    setModal(null);
  }, []);
  useEffect(() => {
    if (player) SaveService.save(player);
  }, [player]);
  useEffect(() => {
    if (!combat || !battleRunning || !player) return;
    if (combat.winner) {
      setBattleRunning(false);
      if (combat.winner === "player") resolveVictory(combat);
      else
        setNotice(
          "The dungeon pushed back. Train skills, improve gear, or return with better loot."
        );
      return;
    }
    const timer = window.setTimeout(() => {
      if (combat.activeTurnId === "player") {
        const targetId = combat.enemies.find((enemy) => enemy.hp > 0)?.id;
        if (targetId)
          setCombat(
            CombatEngine.performTurn(combat, "attack", targetId, Date.now())
          );
        return;
      }
      const activeEnemy = combat.enemies.find(
        (entry) => entry.id === combat.activeTurnId
      );
      if (!activeEnemy) return;
      const move =
        activeEnemy.abilities.find((id) => !activeEnemy.cooldowns[id]) ??
        activeEnemy.abilities[0];
      setCombat(CombatEngine.performTurn(combat, move, "player", Date.now()));
    }, 620);
    return () => window.clearTimeout(timer);
  }, [battleRunning, combat, player]);

  const encounter = player
    ? ENCOUNTERS[player.currentQuestIndex] ?? ENCOUNTERS.at(-1)!
    : ENCOUNTERS[0];
  const campaignLevel = Math.min(
    (player?.currentQuestIndex ?? 0) + 1,
    ENCOUNTERS.length
  );
  const trackStart = Math.max(
    0,
    Math.min(ENCOUNTERS.length - 5, campaignLevel - 3)
  );
  const visibleLevels = ENCOUNTERS.slice(trackStart, trackStart + 5);

  function createKnight() {
    const knight = EquipmentService.computePlayerState(
      buildStarterPlayer(name.trim() || "Sir Rowan", specialization)
    );
    setPlayer(knight);
    setCombat(null);
    setLoot(null);
    setNotice("Greywatch awaits. Clear every room to open its reward chest.");
    setModal(null);
  }

  function runAutoBattle() {
    if (!player) return setModal("knight");
    setCombat(
      CombatEngine.createEncounterState(player, encounter.id, Date.now())
    );
    setBattleRunning(true);
    setModal("combat");
  }

  function resolveVictory(result: CombatState) {
    if (!player) return;
    const rewarded = ProgressionService.addRewards(player, encounter);
    const updated = ThroneProgressionService.updateTitleAndThrone(
      EquipmentService.computePlayerState({
        ...rewarded,
        inventory: [...rewarded.inventory, ...result.pendingLoot],
        achievements:
          encounter.rewards.achievement &&
          !rewarded.achievements.includes(encounter.rewards.achievement)
            ? [...rewarded.achievements, encounter.rewards.achievement]
            : rewarded.achievements,
      })
    );
    setPlayer(updated);
    setLoot(result.pendingLoot[0] ?? null);
    setCombat(null);
    setNotice(
      `Dungeon clear. The ${encounter.rewardTier} reward chest is open.`
    );
    setModal(result.pendingLoot[0] ? "loot" : null);
  }
  function equip(item: ItemDefinition) {
    if (!player) return;
    if (
      item.allowedClasses?.length &&
      !item.allowedClasses.includes(player.specialization)
    ) {
      setNotice(
        `${item.name} is reserved for ${item.allowedClasses.join(" or ")}.`
      );
      return;
    }
    setPlayer(EquipmentService.equip(player, item.id));
    setSelectedGear(item);
    setNotice(`${item.name} equipped.`);
  }
  function equipIntoSlot(item: ItemDefinition, slot: EquipmentSlot) {
    if (item.slot !== slot) {
      setNotice(`${item.name} belongs in the ${item.slot} slot.`);
      return;
    }
    equip(item);
  }
  function upgradeGear() {
    if (!player || !selectedGear) return;
    const next = EquipmentService.upgrade(player, selectedGear.id);
    if (next === player)
      return setNotice(
        "You need more gold or crafting materials for that upgrade."
      );
    const upgraded =
      next.inventory.find((item) => item.id === selectedGear.id) ??
      selectedGear;
    setPlayer(next);
    setSelectedGear(upgraded);
    setNotice(`${upgraded.name} was improved to +${upgraded.upgradeLevel}.`);
  }
  function upgradeSkill(skill: SkillId) {
    if (!player) return;
    const next = SkillService.upgrade(player, skill);
    if (next === player)
      return setNotice(
        player.level >= 400
          ? "Your knight has reached level 400."
          : "You need more gold for training."
      );
    setPlayer(ThroneProgressionService.updateTitleAndThrone(next));
    setNotice(`${skill} training complete. You are now level ${next.level}.`);
  }

  const enemy =
    combat?.enemies.find((entry) => entry.hp > 0) ?? combat?.enemies.at(-1);
  const selectedCost = selectedGear
    ? EquipmentService.upgradeCost(selectedGear)
    : null;
  return (
    <main className="game-shell">
      <section className="campaign-card">
        <header className="game-header">
          <div>
            <p className="eyebrow">SWORD AND HONOR · DUNGEON RUN</p>
            <h1>{player?.username ?? "A knight without a name"}</h1>
          </div>
          <button
            type="button"
            className="quiet-button"
            onClick={() => setModal("knight")}
          >
            New Knight
          </button>
        </header>
        <div className="status-row">
          <div>
            <span>Level</span>
            <strong>{player?.level ?? 1}</strong>
          </div>
          <div>
            <span>Gold</span>
            <strong>{player?.gold ?? 0}</strong>
          </div>
          <div>
            <span>Gear</span>
            <strong>{player?.gearScore ?? 0}</strong>
          </div>
          <div>
            <span>Crit</span>
            <strong>
              {Math.round((player?.stats.critChance ?? 0) * 100)}%
            </strong>
          </div>
        </div>
        <section className="level-track" aria-label="Dungeon progression">
          <span>{encounter.biome.replace("-", " ")}</span>
          <div>
            {visibleLevels.map((_, index) => {
              const number = trackStart + index + 1;
              return (
                <i
                  key={number}
                  className={
                    number < campaignLevel
                      ? "complete"
                      : number === campaignLevel
                      ? "current"
                      : ""
                  }
                >
                  {number}
                </i>
              );
            })}
          </div>
          <strong>
            {campaignLevel}/{ENCOUNTERS.length}
          </strong>
        </section>
        <section className={`contract-card biome-${encounter.biome}`}>
          <div className="hero-preview">
            <img src={knightArtwork} alt="Armored knight" />
            {player?.equipment.weapon && (
              <div className="equipped-visual equipped-weapon">
                <GearIcon item={player.equipment.weapon} compact />
              </div>
            )}
            {player?.equipment.offhand && (
              <div className="equipped-visual equipped-offhand">
                <GearIcon item={player.equipment.offhand} compact />
              </div>
            )}
            <div
              className={`contract-enemy enemy-art ${enemyArtClass(
                encounter.enemies[0].name,
                encounter.biome
              )}`}
              role="img"
              aria-label={`Current dungeon: ${encounter.name}`}
            />
            <span className="versus-mark">{encounter.rooms} ROOMS</span>
          </div>
          <p className="eyebrow">
            {encounter.biome.replace("-", " ")} DUNGEON · {encounter.rewardTier}{" "}
            CHEST
          </p>
          <h2>{encounter.name}</h2>
          <p>{encounter.description}</p>
          <div className="reward-line">
            Gold {encounter.rewards.bonusGold ?? 0} ·{" "}
            {encounter.bossExclusiveDrops
              ? "Boss relic available"
              : "Materials and gear"}
          </div>
          <button
            type="button"
            className="fight-button"
            onClick={runAutoBattle}
          >
            {player
              ? `Enter ${encounter.rooms}-Room Dungeon`
              : "Create Your Knight"}
          </button>
        </section>
        <p className="notice" role="status">
          {notice}
        </p>
        <nav className="bottom-nav" aria-label="Game screens">
          <button type="button" onClick={() => setModal("map")}>
            ⌂<span>Map</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedGear(
                player?.equipment.weapon ?? player?.inventory[0] ?? null
              );
              setModal("gear");
            }}
          >
            ◈<span>Gear</span>
          </button>
          <button type="button" onClick={() => setModal("skills")}>
            ✦<span>Growth</span>
          </button>
        </nav>
      </section>
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={() => modal !== "combat" && setModal(null)}
        >
          <section
            className="game-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {modal === "knight" && (
              <>
                <p className="eyebrow">CREATE A KNIGHT</p>
                <h2>Choose your beginning</h2>
                <label className="name-field">
                  Knight name
                  <input
                    value={name}
                    maxLength={24}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <div className="choice-grid">
                  {choices.map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      className={
                        specialization === option.id
                          ? "choice selected"
                          : "choice"
                      }
                      onClick={() => setSpecialization(option.id)}
                    >
                      <strong>{option.label}</strong>
                      <span>{option.detail}</span>
                    </button>
                  ))}
                  {comingClasses.map((className) => (
                    <button
                      type="button"
                      className="choice coming-soon"
                      disabled
                      key={className}
                    >
                      <strong>{className}</strong>
                      <span>Coming soon</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="fight-button"
                  onClick={createKnight}
                >
                  Begin Campaign
                </button>
              </>
            )}
            {modal === "combat" && combat && enemy && (
              <>
                <p className="eyebrow">
                  DUNGEON BATTLE · ROOM{" "}
                  {combat.enemies.filter((entry) => entry.hp <= 0).length + 1}{" "}
                  OF {encounter.rooms}
                </p>
                <div
                  className={
                    battleRunning ? "battle-art battle-active" : "battle-art"
                  }
                >
                  <img
                    className="animated-knight"
                    src={knightArtwork}
                    alt="Your armored knight"
                  />
                  <div
                    className={`enemy-art ${enemyArtClass(
                      enemy.name,
                      encounter.biome
                    )}`}
                    role="img"
                    aria-label={enemy.name}
                  />
                </div>
                <div className="duel-heading">
                  <div>
                    <span>{player?.username}</span>
                    <strong>
                      {combat.player.hp} / {combat.player.stats.maxHp} HP
                    </strong>
                    <i>
                      <b
                        style={{
                          width: meter(
                            combat.player.hp,
                            combat.player.stats.maxHp
                          ),
                        }}
                      />
                    </i>
                  </div>
                  <div>
                    <span>{enemy.name}</span>
                    <strong>
                      {enemy.hp} / {enemy.stats.maxHp} HP
                    </strong>
                    <i>
                      <b
                        style={{ width: meter(enemy.hp, enemy.stats.maxHp) }}
                      />
                    </i>
                  </div>
                </div>
                <div className="battle-log">
                  {combat.log.slice(-4).map((entry, index) => (
                    <p key={`${entry.text}-${index}`}>{entry.text}</p>
                  ))}
                </div>
                {battleRunning ? (
                  <p className="battle-status">Auto battle in progress...</p>
                ) : (
                  <>
                    <button
                      type="button"
                      className="fight-button"
                      onClick={runAutoBattle}
                    >
                      Try Dungeon Again
                    </button>
                    <button
                      type="button"
                      className="quiet-button full-width"
                      onClick={() => setModal(null)}
                    >
                      Return
                    </button>
                  </>
                )}
              </>
            )}
            {modal === "loot" && loot && (
              <>
                <p className="eyebrow">DUNGEON CHEST · {loot.rarity}</p>
                <h2>{loot.name}</h2>
                <p>
                  Gear {loot.gearScore} · {rarityLabel(loot)}
                  {loot.uniqueEffect ? ` · ${loot.uniqueEffect}` : ""}
                </p>
                <button
                  type="button"
                  className="fight-button"
                  onClick={() => {
                    equip(loot);
                    setModal("gear");
                  }}
                >
                  Equip and Open Forge
                </button>
                <button
                  type="button"
                  className="quiet-button full-width"
                  onClick={() => setModal(null)}
                >
                  Keep in Pack
                </button>
              </>
            )}
            {modal === "gear" && (
              <>
                <p className="eyebrow">ARMORY DECK · FORGE LOADOUT</p>
                <h2>Gear and upgrades</h2>
                <div className="material-row">
                  {Object.entries(player?.materials ?? {}).map(
                    ([material, count]) => (
                      <span key={material}>
                        {material} <b>{count}</b>
                      </span>
                    )
                  )}
                </div>
                <div className="armory-grid armory-loadout">
                  <section className="paper-doll" aria-label="Knight equipment">
                    <p>Drag gear to its matching slot</p>
                    <img src={knightArtwork} alt="Your equipped knight" />
                    {loadoutSlots.map(({ slot, label }) => {
                      const equipped = player?.equipment[slot] ?? null;
                      return (
                        <button
                          type="button"
                          key={slot}
                          className={`equipment-slot slot-${slot} ${
                            equipped ? `rarity-${equipped.rarity}` : "empty"
                          }`}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault();
                            const item = player?.inventory.find(
                              (entry) =>
                                entry.id ===
                                event.dataTransfer.getData("item-id")
                            );
                            if (item) equipIntoSlot(item, slot);
                          }}
                          onClick={() => {
                            if (selectedGear) equipIntoSlot(selectedGear, slot);
                          }}
                        >
                          {equipped ? (
                            <GearIcon item={equipped} compact />
                          ) : (
                            "＋"
                          )}
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </section>
                  <div className="gear-list" aria-label="Inventory">
                    {player?.inventory
                      .slice()
                      .reverse()
                      .slice(0, 20)
                      .map((item) => (
                        <button
                          type="button"
                          draggable
                          key={item.id}
                          className={
                            selectedGear?.id === item.id
                              ? `selected rarity-${item.rarity}`
                              : `rarity-${item.rarity}`
                          }
                          onDragStart={(event) =>
                            event.dataTransfer.setData("item-id", item.id)
                          }
                          onClick={() => setSelectedGear(item)}
                        >
                          <GearIcon item={item} />
                          <span>
                            <strong>{item.name}</strong>
                            <small>
                              {rarityLabel(item)} · +{item.upgradeLevel ?? 0}
                            </small>
                          </span>
                          <em>
                            {player.equipment[item.slot]?.id === item.id
                              ? "Worn"
                              : item.slot}
                          </em>
                        </button>
                      ))}
                  </div>
                  <aside className="forge-panel">
                    {selectedGear ? (
                      <>
                        <p
                          className={`rarity-tag rarity-${selectedGear.rarity}`}
                        >
                          {rarityLabel(selectedGear)}
                        </p>
                        <GearIcon item={selectedGear} />
                        <h3>{selectedGear.name}</h3>
                        <p>
                          Gear {selectedGear.gearScore} · +
                          {selectedGear.upgradeLevel ?? 0}
                        </p>
                        <p>
                          {selectedGear.uniqueEffect ??
                            "Forge this item with monster materials."}
                        </p>
                        <button
                          type="button"
                          className="quiet-button full-width"
                          onClick={() => equip(selectedGear)}
                        >
                          Equip
                        </button>
                        <button
                          type="button"
                          className="fight-button"
                          onClick={upgradeGear}
                        >
                          Improve · {selectedCost?.gold} gold
                        </button>
                        <small>
                          Needs{" "}
                          {selectedCost &&
                            Object.entries(selectedCost.materials)
                              .map(
                                ([material, amount]) => `${amount} ${material}`
                              )
                              .join(", ")}
                        </small>
                      </>
                    ) : (
                      <p>Select an item to equip or improve it.</p>
                    )}
                  </aside>
                </div>
                <button
                  type="button"
                  className="quiet-button full-width"
                  onClick={() => setModal(null)}
                >
                  Close
                </button>
              </>
            )}
            {modal === "skills" && (
              <>
                <p className="eyebrow">KNIGHT GROWTH</p>
                <h2>Train with gold</h2>
                <p className="growth-summary">
                  Level {player?.level ?? 1} / 400 · Next training costs{" "}
                  <b>{player ? SkillService.goldCost(player) : 0} gold</b>
                </p>
                <div className="skill-grid">
                  {skills.map((skill) => (
                    <article
                      key={skill.id}
                      className={`skill-card skill-${skill.id}`}
                    >
                      <span>{skill.icon}</span>
                      <h3>{skill.label}</h3>
                      <p>{skill.detail}</p>
                      <strong>
                        Rank {player?.skillUpgrades[skill.id] ?? 0}
                      </strong>
                      <button
                        type="button"
                        onClick={() => upgradeSkill(skill.id)}
                      >
                        + Train
                      </button>
                    </article>
                  ))}
                </div>
                <button
                  type="button"
                  className="quiet-button full-width"
                  onClick={() => setModal(null)}
                >
                  Close
                </button>
              </>
            )}
            {modal === "map" && (
              <>
                <p className="eyebrow">WORLD MAP</p>
                <h2>Five dungeon biomes</h2>
                <div className="map-grid">
                  {biomes.map((biome) => {
                    const entries = ENCOUNTERS.filter(
                      (entry) => entry.biome === biome
                    );
                    const materials =
                      biome === "ironwood"
                        ? "wood · stone"
                        : biome === "frostmarch"
                        ? "stone · iron"
                        : biome === "emberpeak"
                        ? "iron · orichalcum"
                        : biome === "dragon-crown"
                        ? "iron · boss relics"
                        : "gold · starter gear";
                    return (
                      <button
                        type="button"
                        key={biome}
                        className="map-node unlocked"
                        onClick={() => {
                          if (!player) return;
                          setPlayer({
                            ...player,
                            currentQuestIndex: ENCOUNTERS.indexOf(entries[0]),
                          });
                          setNotice(
                            `${biome.replace(
                              "-",
                              " "
                            )} selected. Farm ${materials} for upgrades.`
                          );
                          setModal(null);
                        }}
                      >
                        <span>✦</span>
                        <h3>{biome.replace("-", " ")}</h3>
                        <p>
                          {entries.length} dungeons · {materials} ·{" "}
                          {entries.some((entry) => entry.bossExclusiveDrops)
                            ? "boss relic"
                            : "material loot"}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="quiet-button full-width"
                  onClick={() => setModal(null)}
                >
                  Return to Dungeon
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

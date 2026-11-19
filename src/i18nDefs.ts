/**
 * 实体文案翻译表（繁体中文 / 英文）。
 * 简体中文以 config.ts 中的 name/desc 为源；本表按 Def.id 索引，缺项自动回落中文原名。
 * 结构：[名称, 描述]。
 */

type Pair = [string, string];

export const DEF_TEXT: Record<string, { tw: Pair; en: Pair }> = {
  /* ——— 人族建筑 ——— */
  cc: {
    tw: ["指揮中心", "生產 SCV；附屬衛星站/核彈井"],
    en: ["Command Center", "Trains SCVs; add-ons: Comsat / Nuclear Silo"],
  },
  sd: {
    tw: ["補給站", "+8 人口上限，可升降"],
    en: ["Supply Depot", "+8 supply cap; can lower/raise"],
  },
  rf: {
    tw: ["精煉廠", "建在瓦斯氣礦上，採集瓦斯"],
    en: ["Refinery", "Built on a geyser to harvest vespene"],
  },
  barracks: {
    tw: ["兵營", "產步兵；可起飛；附屬反應爐/科技實驗室"],
    en: ["Barracks", "Trains infantry; add-ons: Reactor / Tech Lab"],
  },
  academy: {
    tw: ["研究院", "步兵攻防研究"],
    en: ["Academy", "Infantry attack/armor research"],
  },
  ebay: {
    tw: ["工程灣", "步兵攻防研究"],
    en: ["Engineering Bay", "Infantry attack/armor research"],
  },
  factory: {
    tw: ["重工廠", "機械單位；附屬機械車間"],
    en: ["Factory", "Mechanical units; add-on: Machine Shop"],
  },
  armory: {
    tw: ["軍械庫", "機械/空軍攻防研究"],
    en: ["Armory", "Vehicle/air attack & armor research"],
  },
  starport: {
    tw: ["星港", "空軍生產；附屬控制塔"],
    en: ["Starport", "Air production; add-on: Control Tower"],
  },
  scienceFacility: {
    tw: ["科學站", "高級科技；附屬物理實驗室/諜報中心"],
    en: ["Science Facility", "Advanced tech; add-ons: Physics Lab / Covert Ops"],
  },
  bunker: {
    tw: ["碉堡", "進駐 4 個步兵的防禦建築（步兵右鍵進駐，U 鍵卸載）"],
    en: ["Bunker", "Defensive structure holding 4 infantry (right-click to enter, U to unload)"],
  },
  turret: {
    tw: ["飛彈塔", "防空 + 反隱形"],
    en: ["Missile Turret", "Anti-air + detector"],
  },
  comsat: {
    tw: ["衛星站", "指揮中心附屬：偵測隱形"],
    en: ["Comsat Station", "Command Center add-on: detects cloaked units"],
  },
  nuclear: {
    tw: ["核彈井", "指揮中心附屬：解鎖核彈"],
    en: ["Nuclear Silo", "Command Center add-on: unlocks nukes"],
  },
  techlab: {
    tw: ["科技實驗室", "兵營附屬：解鎖鬼兵"],
    en: ["Tech Lab", "Barracks add-on: unlocks Ghosts"],
  },
  reactor: {
    tw: ["反應爐", "兵營附屬：雙倍產兵（訓練速度 ×2）"],
    en: ["Reactor", "Barracks add-on: double production (training ×2)"],
  },
  machineShop: {
    tw: ["機械車間", "重工廠附屬：坦克/雷車升級"],
    en: ["Machine Shop", "Factory add-on: Tank/Vulture upgrades"],
  },
  controlTower: {
    tw: ["控制塔", "星港附屬：解鎖戰巡/女武神"],
    en: ["Control Tower", "Starport add-on: unlocks Battlecruiser/Valkyrie"],
  },
  physicsLab: {
    tw: ["物理實驗室", "科學站附屬：科技球"],
    en: ["Physics Lab", "Science Facility add-on: Science Vessel"],
  },
  covertOps: {
    tw: ["諜報中心", "科學站附屬：隱形戰機/反隱形"],
    en: ["Covert Ops", "Science Facility add-on: Wraith/detection"],
  },

  /* ——— 人族兵种 ——— */
  scv: {
    tw: ["SCV", "農民，採集與建造"],
    en: ["SCV", "Worker: gathers and builds"],
  },
  marine: {
    tw: ["陸戰隊", "基礎步兵（T 鍵興奮劑）"],
    en: ["Marine", "Basic infantry (T: Stim)"],
  },
  firebat: {
    tw: ["火焰兵", "範圍近戰火焰（T 鍵興奮劑）"],
    en: ["Firebat", "Short-range flame (T: Stim)"],
  },
  medic: {
    tw: ["醫護兵", "治療友軍"],
    en: ["Medic", "Heals friendly units"],
  },
  ghost: {
    tw: ["幽靈(鬼兵)", "隱形、鎖定、核打擊"],
    en: ["Ghost", "Cloak, Lockdown, nuke strike"],
  },
  vulture: {
    tw: ["禿鷹戰車(雷車)", "高速布雷車（M 鍵腳下布雷）"],
    en: ["Vulture", "Fast minelayer (M: plant mine)"],
  },
  tank: {
    tw: ["攻城坦克", "可切攻城模式（E 鍵）"],
    en: ["Siege Tank", "Toggle siege mode (E)"],
  },
  goliath: {
    tw: ["巨型機器人", "對空對地雙管"],
    en: ["Goliath", "Twin cannons vs air and ground"],
  },
  dropship: {
    tw: ["運輸機", "運輸單位（右鍵己方地面單位裝載，U 鍵卸載）"],
    en: ["Dropship", "Transport (right-click friendly ground units, U to unload)"],
  },
  wraith: {
    tw: ["怨靈戰機(隱飛)", "可隱形戰機"],
    en: ["Wraith", "Cloaking fighter"],
  },
  valkyrie: {
    tw: ["女武神護衛艦", "對空齊射"],
    en: ["Valkyrie", "Anti-air volley"],
  },
  scienceVessel: {
    tw: ["科學球(科技球)", "反隱形/防禦場"],
    en: ["Science Vessel", "Detector / Defensive Matrix"],
  },
  battlecruiser: {
    tw: ["戰列巡洋艦(大和)", "大和砲主力艦（Y 鍵指定目標）"],
    en: ["Battlecruiser", "Yamato capital ship (Y: pick target)"],
  },

  /* ——— 神族建筑 ——— */
  nexus: {
    tw: ["樞紐", "主基地，生產探針"],
    en: ["Nexus", "Main base; trains Probes"],
  },
  pylon: {
    tw: ["水晶塔", "+8 人口上限，供能"],
    en: ["Pylon", "+8 supply cap; provides power"],
  },
  assimilator: {
    tw: ["吸收器", "建在瓦斯氣泉上採集瓦斯"],
    en: ["Assimilator", "Built on a geyser to harvest vespene"],
  },
  gateway: {
    tw: ["傳送門", "產狂戰士、龍騎士"],
    en: ["Gateway", "Trains Zealots and Dragoons"],
  },
  forge: {
    tw: ["鍛造爐", "地面攻防研究"],
    en: ["Forge", "Ground attack/armor research"],
  },
  cannon: {
    tw: ["光子砲台", "防禦，對地對空 + 反隱"],
    en: ["Photon Cannon", "Defense: hits air & ground + detector"],
  },
  archives: {
    tw: ["聖堂檔案館", "高階聖堂、黑暗聖堂解鎖"],
    en: ["Templar Archives", "Unlocks High/Dark Templar"],
  },
  robofac: {
    tw: ["機械製造廠", "甲蟲、運輸機"],
    en: ["Robotics Facility", "Reaver, Shuttle"],
  },
  robobay: {
    tw: ["機械支援所", "甲蟲砲彈、金甲蟲升級"],
    en: ["Robotics Support Bay", "Reaver scarab upgrades"],
  },
  stargate: {
    tw: ["星門", "空軍生產"],
    en: ["Stargate", "Air production"],
  },
  fleetbeacon: {
    tw: ["艦隊導航台", "航母、仲裁者科技"],
    en: ["Fleet Beacon", "Carrier/Arbiter tech"],
  },
  arbiterTribunal: {
    tw: ["仲裁神殿", "仲裁者解鎖"],
    en: ["Arbiter Tribunal", "Unlocks the Arbiter"],
  },

  /* ——— 神族兵种 ——— */
  probe: {
    tw: ["探針", "農民，採集與建造"],
    en: ["Probe", "Worker: gathers and builds"],
  },
  zealot: {
    tw: ["狂戰士(叉子)", "近戰狂戰士"],
    en: ["Zealot", "Melee warrior"],
  },
  dragoon: {
    tw: ["龍騎士", "對空對地遠程"],
    en: ["Dragoon", "Ranged vs air and ground"],
  },
  ht: {
    tw: ["高階聖堂", "靈能法師（S 鍵風暴）"],
    en: ["High Templar", "Psionic caster (S: Psi Storm)"],
  },
  dt: {
    tw: ["黑暗聖堂", "隱形近戰刺客"],
    en: ["Dark Templar", "Cloaked melee assassin"],
  },
  reaver: {
    tw: ["金甲蟲", "拋射甲蟲砲彈"],
    en: ["Reaver", "Launches scarabs"],
  },
  shuttle: {
    tw: ["運輸機", "運輸單位（右鍵己方地面單位裝載，U 鍵卸載）"],
    en: ["Shuttle", "Transport (right-click friendly ground units, U to unload)"],
  },
  scout: {
    tw: ["偵察機", "高速攔截機"],
    en: ["Scout", "Fast interceptor"],
  },
  carrier: {
    tw: ["航母", "攜帶攔截機的主力艦（機庫 8，自動出擊/回收）"],
    en: ["Carrier", "Capital ship with 8 interceptors (auto launch/recall)"],
  },
  arbiter: {
    tw: ["仲裁者", "時空力場主力艦"],
    en: ["Arbiter", "Stasis-field capital ship"],
  },
  observer: {
    tw: ["觀察者(叮噹)", "反隱形偵察（隱形）"],
    en: ["Observer", "Cloaked detector"],
  },
  interceptor: {
    tw: ["攔截機", "航母小飛機"],
    en: ["Interceptor", "Carrier fighter"],
  },
  corsair: {
    tw: ["海盜船", "對空攔截（閃電）"],
    en: ["Corsair", "Anti-air interceptor"],
  },
  archon: {
    tw: ["執政官(白球)", "雙聖堂融合，範圍濺射"],
    en: ["Archon", "Fused Templar with splash damage"],
  },
  darkarchon: {
    tw: ["黑暗執政官(紅球)", "雙黑暗聖堂融合（C 鍵精神控制）"],
    en: ["Dark Archon", "Fused Dark Templar (C: Mind Control)"],
  },

  /* ——— 虫族建筑 ——— */
  hatchery: {
    tw: ["孵化場", "主基地，產幼蟲；幼蟲變異全部蟲族單位；可變異→巢穴"],
    en: ["Hatchery", "Main base; spawns larva that morph into all Zerg units; → Lair"],
  },
  lair: {
    tw: ["巢穴", "孵化場升級，解鎖飛龍塔/皇后巢等；可再升→母巢"],
    en: ["Lair", "Hatchery upgrade; unlocks Spire/Queen's Nest; → Hive"],
  },
  hive: {
    tw: ["母巢", "巢穴升級，終極主基地"],
    en: ["Hive", "Lair upgrade; ultimate main base"],
  },
  spawningPool: {
    tw: ["孵化池", "小狗解鎖、提速"],
    en: ["Spawning Pool", "Unlocks and speeds up Zerglings"],
  },
  extractor: {
    tw: ["萃取器", "瓦斯採集"],
    en: ["Extractor", "Vespene harvesting"],
  },
  evolutionChamber: {
    tw: ["進化室", "地面攻防研究"],
    en: ["Evolution Chamber", "Ground attack/armor research"],
  },
  creepColony: {
    tw: ["菌毯殖民地", "可變 地刺堡/孢子堡"],
    en: ["Creep Colony", "Morphs into Sunken/Spore Colony"],
  },
  hydraliskDen: {
    tw: ["刺蛇穴", "刺蛇、潛伏者解鎖"],
    en: ["Hydralisk Den", "Unlocks Hydralisk and Lurker"],
  },
  queenNest: {
    tw: ["皇后巢", "皇后科技"],
    en: ["Queen's Nest", "Queen tech"],
  },
  spire: {
    tw: ["飛龍塔", "飛龍；可變異→大飛龍塔，解鎖守護者/吞噬者"],
    en: ["Spire", "Mutalisk; → Greater Spire for Guardian/Devourer"],
  },
  greaterSpire: {
    tw: ["大飛龍塔", "飛龍塔升級，解鎖守護者/吞噬者"],
    en: ["Greater Spire", "Spire upgrade; unlocks Guardian/Devourer"],
  },
  ultraliskCavern: {
    tw: ["巨蟒洞穴", "猛獁（雷獸）"],
    en: ["Ultralisk Cavern", "Ultralisk"],
  },
  defilerMound: {
    tw: ["蠍子窩", "蠍子科技"],
    en: ["Defiler Mound", "Defiler tech"],
  },
  nydus: {
    tw: ["尼達斯坑道", "兩地基地間傳送通道（演示建築）"],
    en: ["Nydus Canal", "Tunnel between bases (demo building)"],
  },
  sunken: {
    tw: ["地刺堡", "對地防禦（菌毯殖民地變異）"],
    en: ["Sunken Colony", "Ground defense (from Creep Colony)"],
  },
  spore: {
    tw: ["孢子堡", "防空 + 反隱形（菌毯殖民地變異）"],
    en: ["Spore Colony", "Anti-air + detector (from Creep Colony)"],
  },

  /* ——— 虫族兵种 ——— */
  drone: {
    tw: ["工蜂", "農民，採集與建造"],
    en: ["Drone", "Worker: gathers and builds"],
  },
  larva: {
    tw: ["幼蟲", "孵化一切兵種的基礎"],
    en: ["Larva", "Base for morphing all Zerg units"],
  },
  overlord: {
    tw: ["領主", "房子，人口（反隱形偵測·可裝載）"],
    en: ["Overlord", "Supply provider (detector, can transport)"],
  },
  zergling: {
    tw: ["小狗", "快速近戰蟲"],
    en: ["Zergling", "Fast melee unit"],
  },
  hydralisk: {
    tw: ["刺蛇", "對空對地遠程蟲"],
    en: ["Hydralisk", "Ranged vs air and ground"],
  },
  lurker: {
    tw: ["潛伏者", "隱形對地刺蛇"],
    en: ["Lurker", "Cloaked ground attacker"],
  },
  queen: {
    tw: ["皇后", "蟲族法術單位"],
    en: ["Queen", "Zerg spellcaster"],
  },
  defiler: {
    tw: ["蠍子", "施法者（簡化）"],
    en: ["Defiler", "Caster (simplified)"],
  },
  mutalisk: {
    tw: ["飛龍", "彈射攻擊飛龍"],
    en: ["Mutalisk", "Bouncing attack flyer"],
  },
  guardian: {
    tw: ["守護者", "對地大龍"],
    en: ["Guardian", "Anti-ground flyer"],
  },
  devourer: {
    tw: ["吞噬者", "對空大龍"],
    en: ["Devourer", "Anti-air flyer"],
  },
  ultralisk: {
    tw: ["猛獁(雷獸)", "重型近戰巨獸"],
    en: ["Ultralisk", "Heavy melee beast"],
  },
  scourge: {
    tw: ["自殺蚊(自爆)", "對空自爆飛機（撞擊爆炸 110）"],
    en: ["Scourge", "Suicide anti-air flyer (110 impact damage)"],
  },

  /* ——— 中立资源 ——— */
  mineral: {
    tw: ["水晶礦", "礦物資源"],
    en: ["Mineral Field", "Mineral resource"],
  },
  vespene: {
    tw: ["瓦斯氣泉", "瓦斯資源"],
    en: ["Vespene Geyser", "Vespene resource"],
  },
};

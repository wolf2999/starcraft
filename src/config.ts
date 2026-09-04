/**
 * 全局游戏配置与常量 —— 以人族(Terran)为主体实现
 */

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** 阵营/种族配色（tint 用） */
export const FACTION_COLORS: Record<string, number> = {
  player: 0x2e6cb8, // 我方（人族蓝）
  enemy: 0xb83a3a, // 敌方（红）
  terran: 0x2e6cb8,
  protoss: 0x4a7fd6, // 神族（淡金蓝）
  zerg: 0x9b4ad6 // 虫族（紫）
};

export type Faction = keyof typeof FACTION_COLORS;

/** 资源类型 */
export type ResourceType = "minerals" | "vespene";

/** 实体大类 */
export type EntityKind = "unit" | "building";

/**
 * 阵营（归属）枚举。
 * - player：人类玩家
 * - neutral：中立（矿/气/可破坏物）
 * - ai1~ai7：7 个 AI 阵营，彼此独立、互不友好，可互相攻击
 *
 * 这样扩展后即可支持“8 人混战（FFA）”：每个 AI 是一个独立 owner，
 * 战斗时通过 owner 相等来判断是否友军，从而让 AI 之间也会互相打。
 */
export type Owner =
  | "player"
  | "neutral"
  | "ai1"
  | "ai2"
  | "ai3"
  | "ai4"
  | "ai5"
  | "ai6"
  | "ai7";

/** 是否属于 AI 阵营（区别于玩家与中立） */
export function ownerIsAI(owner: string): boolean {
  return owner.startsWith("ai");
}

/** 阵营显示/描边颜色（HUD、子弹、单位染色） */
export const OWNER_COLORS: Record<string, number> = {
  player: 0x2e6cb8, // 蓝
  ai1: 0xd64545, // 红
  ai2: 0x4a7fd6, // 蓝
  ai3: 0x9b4ad6, // 紫
  ai4: 0xd6b04a, // 金
  ai5: 0x33c9a0, // 青
  ai6: 0xd64a8c, // 粉
  ai7: 0x6ad64a, // 绿
};

/** 取阵营颜色，未知阵营回退白色 */
export function ownerColor(owner: string): number {
  return OWNER_COLORS[owner] ?? 0xffffff;
}

/**
 * 调试开关：是否允许 AI 单位主动索敌/移动。
 * 设为 false 时 AI 单位不会 acquireTarget、不会主动移动，方便单独调试
 * 玩家单位的刷新、框选与移动逻辑。需要时改回 true 即可恢复 8 人混战。
 */
export const AI_AGGRESSIVE = false;

/** 攻击可命中的目标类型 */
export type AttackTargetType = "ground" | "air" | "both";

/** 种族 */
export type Race = "terran" | "protoss" | "zerg";

/** 兵种/建筑定义（数据驱动） */
export interface Def {
  id: string;
  name: string;
  kind: EntityKind;
  /** 种族 */
  race: Race;
  /** 纹理 key */
  tex: string;
  /** 矿物造价 */
  minerals: number;
  /** 瓦斯造价 */
  vespene: number;
  /** 占用人口（建筑为提供人口用 supplyProvided） */
  supply: number;
  /** 建造/训练耗时（毫秒） */
  buildTime: number;
  hp: number;
  /** 神族护盾值（默认 0） */
  shield?: number;
  /** 对地攻击力 */
  groundDamage?: number;
  /** 对空攻击力 */
  airDamage?: number;
  /** 攻击可命中的目标类型（默认 ground） */
  attackType?: AttackTargetType;
  /** 攻击射程（像素） */
  range?: number;
  /** 攻击间隔（毫秒） */
  attackInterval?: number;
  /** 单位：移动速度（像素/秒） */
  speed?: number;
  /** 单位：是否空中（影响目标选择） */
  air?: boolean;
  /** 建筑：是否提供人口上限 */
  supplyProvided?: number;
  /** 建筑：可生产哪些单位/建筑（id 列表） */
  produces?: string[];
  /** 建筑：必须建在特定资源上（精炼厂） */
  requiresVespeneGeyser?: boolean;
  /** 建筑：可降下/收起（供给站） */
  canLift?: boolean;
  /** 建筑：是否需要菌毯（虫族） */
  needsCreep?: boolean;
  /** 建筑：是某建筑的升级形态（生成后替换原建筑）。值为被升级建筑的 id */
  upgradeOf?: string;
  /** 建筑：升级前置（需已存在该建筑 id 才能建造/变异），仅作展示提示 */
  requires?: string;
  /** 简体中文提示 */
  desc: string;

  /* —— 以下为运行时派生字段（由桥接层 ALL_DEFS 注入，数据本身不写） —— */
  /** 是否为建筑（= kind === "building"） */
  isBuilding?: boolean;
  /** 是否中立资源节点 */
  isNeutral?: boolean;
  /** 是否空中单位（= air） */
  isAir?: boolean;
  /** 占用人口（= supply，便于 entities 读取） */
  supplyCost?: number;
  /** 碰撞/渲染尺寸（像素） */
  size?: number;
  /** 可产出幼虫的主基地/孵化场 */
  canProduceLarva?: boolean;

  /* —— 程序化贴图需要的额外字段 —— */
  /** 贴图尺寸（像素宽） */
  w?: number;
  /** 贴图尺寸（像素高） */
  h?: number;
}

/** ——— 人族建筑 ——— */
export const BUILDINGS: Def[] = [
  {
    id: "cc", name: "指挥中心", kind: "building", race: "terran", tex: "b_cc", minerals: 400, vespene: 0,
    supply: 0, buildTime: 8000, hp: 1500, supplyProvided: 10,
    produces: ["scv", "comsat", "nuclear"], desc: "生产 SCV；附属卫星站/核弹井"
  },
  {
    id: "sd", name: "供给站", kind: "building", race: "terran", tex: "b_sd", minerals: 100, vespene: 0,
    supply: 0, buildTime: 3000, hp: 400, supplyProvided: 8, canLift: true,
    desc: "+8 人口上限，可降下/收起"
  },
  {
    id: "rf", name: "精炼厂", kind: "building", race: "terran", tex: "b_rf", minerals: 100, vespene: 0,
    supply: 0, buildTime: 3000, hp: 500, requiresVespeneGeyser: true,
    desc: "建在瓦斯气矿上，采集瓦斯"
  },
  {
    id: "barracks", name: "兵营", kind: "building", race: "terran", tex: "b_barracks", minerals: 150, vespene: 0,
    supply: 0, buildTime: 4500, hp: 1000, produces: ["marine", "firebat", "medic", "ghost", "techlab", "reactor"],
    desc: "产步兵；可起飞；附属反应堆/科技实验室"
  },
  {
    id: "academy", name: "研究院", kind: "building", race: "terran", tex: "b_academy", minerals: 150, vespene: 0,
    supply: 0, buildTime: 4500, hp: 600, desc: "解锁兴奋剂/火兵/护士"
  },
  {
    id: "ebay", name: "工程湾", kind: "building", race: "terran", tex: "b_ebay", minerals: 150, vespene: 0,
    supply: 0, buildTime: 4500, hp: 850, desc: "步兵攻防升级"
  },
  {
    id: "factory", name: "重工", kind: "building", race: "terran", tex: "b_factory", minerals: 200, vespene: 100,
    supply: 0, buildTime: 6000, hp: 1250, produces: ["vulture", "tank", "goliath", "machineShop"],
    desc: "机械单位；附属机械车间"
  },
  {
    id: "armory", name: "军械库", kind: "building", race: "terran", tex: "b_armory", minerals: 150, vespene: 100,
    supply: 0, buildTime: 6000, hp: 750, desc: "机械/空军攻防升级"
  },
  {
    id: "starport", name: "飞机场", kind: "building", race: "terran", tex: "b_starport", minerals: 150, vespene: 100,
    supply: 0, buildTime: 6000, hp: 1300, produces: ["dropship", "wraith", "valkyrie", "scienceVessel", "battlecruiser", "controlTower"],
    desc: "空军生产；附属控制塔"
  },
  {
    id: "scienceFacility", name: "科学站", kind: "building", race: "terran", tex: "b_sci", minerals: 200, vespene: 200,
    supply: 0, buildTime: 8000, hp: 850, produces: ["physicsLab", "covertOps"],
    desc: "高级科技；附属物理实验室/谍报中心"
  },
  {
    id: "bunker", name: "碉堡", kind: "building", race: "terran", tex: "b_bunker", minerals: 100, vespene: 0,
    supply: 0, buildTime: 3000, hp: 350, desc: "进驻 4 个步兵的防御建筑"
  },
  {
    id: "turret", name: "导弹塔", kind: "building", race: "terran", tex: "b_turret", minerals: 100, vespene: 0,
    supply: 0, buildTime: 3000, hp: 250, airDamage: 20, attackType: "air", range: 140, attackInterval: 500, desc: "防空 + 反隐形"
  },
  // —— 附属建筑（仅作占位/简化，可在兵营/重工/机场/科学站上附加） ——
  {
    id: "comsat", name: "卫星站", kind: "building", race: "terran", tex: "b_comsat", minerals: 50, vespene: 50,
    supply: 0, buildTime: 3000, hp: 200, desc: "指挥中心附属：侦测隐形"
  },
  {
    id: "nuclear", name: "核弹井", kind: "building", race: "terran", tex: "b_nuke", minerals: 100, vespene: 100,
    supply: 0, buildTime: 4000, hp: 200, desc: "指挥中心附属：核弹"
  },
  {
    id: "techlab", name: "科技实验室", kind: "building", race: "terran", tex: "b_techlab", minerals: 50, vespene: 50,
    supply: 0, buildTime: 2000, hp: 200, desc: "兵营附属：解锁鬼兵"
  },
  {
    id: "reactor", name: "反应堆", kind: "building", race: "terran", tex: "b_reactor", minerals: 50, vespene: 0,
    supply: 0, buildTime: 2000, hp: 200, desc: "兵营附属：双倍产兵"
  },
  {
    id: "machineShop", name: "机械车间", kind: "building", race: "terran", tex: "b_machineshop", minerals: 50, vespene: 50,
    supply: 0, buildTime: 2000, hp: 200, desc: "重工附属：坦克/雷车升级"
  },
  {
    id: "controlTower", name: "控制塔", kind: "building", race: "terran", tex: "b_controltower", minerals: 50, vespene: 50,
    supply: 0, buildTime: 2000, hp: 200, desc: "机场附属：解锁战巡/女武神"
  },
  {
    id: "physicsLab", name: "物理实验室", kind: "building", race: "terran", tex: "b_physicslab", minerals: 50, vespene: 100,
    supply: 0, buildTime: 2000, hp: 200, desc: "科学站附属：科技球"
  },
  {
    id: "covertOps", name: "谍报中心", kind: "building", race: "terran", tex: "b_covertops", minerals: 50, vespene: 100,
    supply: 0, buildTime: 2000, hp: 200, desc: "科学站附属：隐飞/反隐形"
  }
];

/** ——— 人族兵种 ——— */
export const UNITS: Def[] = [
  // 农民
  { id: "scv", name: "SCV", kind: "unit", race: "terran", tex: "u_scv", minerals: 50, vespene: 0, supply: 1, buildTime: 4000,
    hp: 60, groundDamage: 5, attackType: "ground", range: 18, attackInterval: 1000, speed: 90, desc: "农民，采集与建造" },
  // 地面步兵
  { id: "marine", name: "机枪兵", kind: "unit", race: "terran", tex: "u_marine", minerals: 50, vespene: 0, supply: 1, buildTime: 4000,
    hp: 40, groundDamage: 6, airDamage: 6, attackType: "both", range: 110, attackInterval: 600, speed: 90, desc: "基础步兵" },
  { id: "firebat", name: "喷火兵", kind: "unit", race: "terran", tex: "u_firebat", minerals: 50, vespene: 25, supply: 1, buildTime: 4000,
    hp: 50, groundDamage: 16, attackType: "ground", range: 32, attackInterval: 600, speed: 90, desc: "范围近战火焰" },
  { id: "medic", name: "护士", kind: "unit", race: "terran", tex: "u_medic", minerals: 50, vespene: 25, supply: 1, buildTime: 4000,
    hp: 60, range: 100, attackInterval: 1000, speed: 90, desc: "治疗友军" },
  { id: "ghost", name: "幽灵(鬼兵)", kind: "unit", race: "terran", tex: "u_ghost", minerals: 25, vespene: 75, supply: 1, buildTime: 5000,
    hp: 45, groundDamage: 10, airDamage: 10, attackType: "both", range: 130, attackInterval: 1000, speed: 95, desc: "隐形、锁定、核打击" },
  // 机械地面
  { id: "vulture", name: "秃鹫战车(雷车)", kind: "unit", race: "terran", tex: "u_vulture", minerals: 75, vespene: 0, supply: 2, buildTime: 4000,
    hp: 80, groundDamage: 20, attackType: "ground", range: 110, attackInterval: 600, speed: 150, desc: "高速布雷车" },
  { id: "tank", name: "攻城坦克", kind: "unit", race: "terran", tex: "u_tank", minerals: 150, vespene: 100, supply: 6, buildTime: 6000,
    hp: 150, groundDamage: 30, attackType: "ground", range: 130, attackInterval: 1100, speed: 70, desc: "可切攻城模式" },
  { id: "goliath", name: "巨型机器人", kind: "unit", race: "terran", tex: "u_goliath", minerals: 100, vespene: 50, supply: 2, buildTime: 5000,
    hp: 125, groundDamage: 12, airDamage: 12, attackType: "both", range: 120, attackInterval: 500, speed: 75, air: true, desc: "对空对地双管" },
  // 空中
  { id: "dropship", name: "运输机", kind: "unit", race: "terran", tex: "u_dropship", minerals: 100, vespene: 100, supply: 2, buildTime: 5000,
    hp: 150, speed: 110, air: true, desc: "运输单位" },
  { id: "wraith", name: "怨灵战机(隐飞)", kind: "unit", race: "terran", tex: "u_wraith", minerals: 150, vespene: 100, supply: 2, buildTime: 6000,
    hp: 120, groundDamage: 8, airDamage: 8, attackType: "both", range: 120, attackInterval: 600, speed: 130, air: true, desc: "可隐形战机" },
  { id: "valkyrie", name: "女武神护卫舰", kind: "unit", race: "terran", tex: "u_valkyrie", minerals: 250, vespene: 125, supply: 4, buildTime: 7000,
    hp: 200, airDamage: 14, attackType: "air", range: 130, attackInterval: 500, speed: 110, air: true, desc: "对空齐射" },
  { id: "scienceVessel", name: "科学球(科技球)", kind: "unit", race: "terran", tex: "u_sciencevessel", minerals: 100, vespene: 225, supply: 2, buildTime: 8000,
    hp: 200, speed: 110, air: true, desc: "反隐形/防御场" },
  { id: "battlecruiser", name: "战列巡洋舰(大和)", kind: "unit", race: "terran", tex: "u_battlecruiser", minerals: 400, vespene: 300, supply: 8, buildTime: 12000,
    hp: 500, groundDamage: 25, airDamage: 25, attackType: "both", range: 150, attackInterval: 1000, speed: 70, air: true, desc: "大和炮主力舰" }
];

/** ——— 神族建筑 ——— */
export const PROTOSS_BUILDINGS: Def[] = [
  {
    id: "nexus", name: "枢纽", kind: "building", race: "protoss", tex: "b_nexus", minerals: 400, vespene: 0,
    supply: 0, buildTime: 8000, hp: 1500, shield: 1500, supplyProvided: 10,
    produces: ["probe"], desc: "主基地，生产探针"
  },
  {
    id: "pylon", name: "水晶塔", kind: "building", race: "protoss", tex: "b_pylon", minerals: 100, vespene: 0,
    supply: 0, buildTime: 3000, hp: 300, shield: 300, supplyProvided: 8, desc: "+8 人口上限，供能"
  },
  {
    id: "assimilator", name: "吸收器", kind: "building", race: "protoss", tex: "b_assimilator", minerals: 100, vespene: 0,
    supply: 0, buildTime: 3000, hp: 300, shield: 300, requiresVespeneGeyser: true, desc: "建在瓦斯气泉上采集瓦斯"
  },
  {
    id: "gateway", name: "兵营", kind: "building", race: "protoss", tex: "b_gateway", minerals: 150, vespene: 0,
    supply: 0, buildTime: 4500, hp: 500, shield: 500, produces: ["zealot", "dragoon"], desc: "产狂徒、龙骑士"
  },
  {
    id: "forge", name: "锻造炉", kind: "building", race: "protoss", tex: "b_forge", minerals: 150, vespene: 0,
    supply: 0, buildTime: 4500, hp: 350, shield: 350, desc: "地面攻防升级"
  },
  {
    id: "cannon", name: "光子炮台", kind: "building", race: "protoss", tex: "b_cannon", minerals: 150, vespene: 0,
    supply: 0, buildTime: 3000, hp: 200, shield: 200, groundDamage: 20, airDamage: 20, attackType: "both", range: 150, attackInterval: 600, desc: "防御，对地对空 + 反隐"
  },
  {
    id: "archives", name: "圣堂档案馆", kind: "building", race: "protoss", tex: "b_archives", minerals: 150, vespene: 150,
    supply: 0, buildTime: 5000, hp: 400, shield: 400, produces: ["ht", "dt"], desc: "高阶圣堂、黑暗圣堂解锁"
  },
  {
    id: "robofac", name: "机械加工厂", kind: "building", race: "protoss", tex: "b_robofac", minerals: 200, vespene: 100,
    supply: 0, buildTime: 6000, hp: 450, shield: 450, produces: ["reaver", "shuttle"], desc: "甲虫、运输机"
  },
  {
    id: "robobay", name: "机械支援所", kind: "building", race: "protoss", tex: "b_robobay", minerals: 100, vespene: 100,
    supply: 0, buildTime: 4000, hp: 300, shield: 300, desc: "甲虫炮弹、金甲虫升级"
  },
  {
    id: "stargate", name: "星门", kind: "building", race: "protoss", tex: "b_stargate", minerals: 150, vespene: 150,
    supply: 0, buildTime: 6000, hp: 600, shield: 600, produces: ["scout", "carrier", "arbiter"], desc: "空军生产"
  },
  {
    id: "fleetbeacon", name: "舰队航标", kind: "building", race: "protoss", tex: "b_fleetbeacon", minerals: 300, vespene: 200,
    supply: 0, buildTime: 6000, hp: 500, shield: 500, desc: "航母、仲裁者科技"
  },
  {
    id: "arbiterTribunal", name: "仲裁神殿", kind: "building", race: "protoss", tex: "b_arbiter", minerals: 200, vespene: 150,
    supply: 0, buildTime: 6000, hp: 450, shield: 450, desc: "仲裁者解锁"
  }
];

/** ——— 神族兵种 ——— */
export const PROTOSS_UNITS: Def[] = [
  { id: "probe", name: "探针", kind: "unit", race: "protoss", tex: "u_probe", minerals: 50, vespene: 0, supply: 1, buildTime: 4000,
    hp: 20, shield: 20, groundDamage: 5, attackType: "ground", range: 18, attackInterval: 1000, speed: 90, desc: "农民，采集与建造" },
  { id: "zealot", name: "狂徒(叉子)", kind: "unit", race: "protoss", tex: "u_zealot", minerals: 100, vespene: 0, supply: 2, buildTime: 4000,
    hp: 100, shield: 60, groundDamage: 8, attackType: "ground", range: 22, attackInterval: 400, speed: 95, desc: "近战狂战士" },
  { id: "dragoon", name: "龙骑士", kind: "unit", race: "protoss", tex: "u_dragoon", minerals: 125, vespene: 50, supply: 2, buildTime: 5000,
    hp: 100, shield: 80, groundDamage: 20, airDamage: 20, attackType: "both", range: 120, attackInterval: 600, speed: 70, desc: "对空对地远程" },
  { id: "ht", name: "高阶圣堂", kind: "unit", race: "protoss", tex: "u_ht", minerals: 50, vespene: 150, supply: 2, buildTime: 6000,
    hp: 40, shield: 40, groundDamage: 0, attackType: "both", range: 110, attackInterval: 1000, speed: 90, desc: "灵能法师（简化）" },
  { id: "dt", name: "黑暗圣堂", kind: "unit", race: "protoss", tex: "u_dt", minerals: 125, vespene: 100, supply: 2, buildTime: 6000,
    hp: 40, shield: 40, groundDamage: 40, attackType: "ground", range: 22, attackInterval: 400, speed: 90, desc: "隐形近战刺客" },
  { id: "reaver", name: "金甲虫", kind: "unit", race: "protoss", tex: "u_reaver", minerals: 200, vespene: 100, supply: 4, buildTime: 7000,
    hp: 140, shield: 80, groundDamage: 100, attackType: "ground", range: 160, attackInterval: 2000, speed: 50, desc: "抛射甲虫炮弹" },
  { id: "shuttle", name: "运输机", kind: "unit", race: "protoss", tex: "u_shuttle", minerals: 200, vespene: 0, supply: 2, buildTime: 5000,
    hp: 80, shield: 60, speed: 130, air: true, desc: "运输单位" },
  { id: "scout", name: "侦察机", kind: "unit", race: "protoss", tex: "u_scout", minerals: 300, vespene: 150, supply: 3, buildTime: 6000,
    hp: 150, shield: 100, groundDamage: 28, airDamage: 28, attackType: "both", range: 140, attackInterval: 500, speed: 130, air: true, desc: "高速拦截机" },
  { id: "carrier", name: "航母", kind: "unit", race: "protoss", tex: "u_carrier", minerals: 350, vespene: 250, supply: 8, buildTime: 10000,
    hp: 250, shield: 150, groundDamage: 0, airDamage: 0, attackType: "both", range: 200, attackInterval: 1000, speed: 60, air: true, desc: "携带拦截机的主力舰" },
  { id: "arbiter", name: "仲裁者", kind: "unit", race: "protoss", tex: "u_arbiter", minerals: 350, vespene: 250, supply: 6, buildTime: 9000,
    hp: 200, shield: 150, airDamage: 0, attackType: "air", range: 160, attackInterval: 1000, speed: 70, air: true, desc: "时空力场主力舰" },
  { id: "observer", name: "观察者(叮当)", kind: "unit", race: "protoss", tex: "u_observer", minerals: 25, vespene: 75, supply: 1, buildTime: 4000,
    hp: 40, shield: 20, speed: 130, air: true, desc: "反隐形侦察（隐形）" },
  { id: "interceptor", name: "拦截机", kind: "unit", race: "protoss", tex: "u_interceptor", minerals: 0, vespene: 0, supply: 0, buildTime: 1000,
    hp: 40, shield: 40, groundDamage: 4, airDamage: 4, attackType: "both", range: 100, attackInterval: 500, speed: 120, air: true, desc: "航母小飞机" },
  { id: "corsair", name: "海盗船", kind: "unit", race: "protoss", tex: "u_corsair", minerals: 150, vespene: 100, supply: 2, buildTime: 5000,
    hp: 100, shield: 80, airDamage: 8, attackType: "air", range: 140, attackInterval: 400, speed: 150, air: true, desc: "对空拦截（闪电）" },
  { id: "archon", name: "执政官(白球)", kind: "unit", race: "protoss", tex: "u_archon", minerals: 100, vespene: 300, supply: 4, buildTime: 6000,
    hp: 10, shield: 350, groundDamage: 30, airDamage: 30, attackType: "both", range: 60, attackInterval: 600, speed: 80, desc: "双圣堂融合，范围溅射" },
  { id: "darkarchon", name: "黑暗执政官(红球)", kind: "unit", race: "protoss", tex: "u_darkarchon", minerals: 125, vespene: 200, supply: 4, buildTime: 6000,
    hp: 10, shield: 250, groundDamage: 0, attackType: "both", range: 100, attackInterval: 1000, speed: 80, desc: "双黑暗圣堂融合，精神控制（简化）" }
];

/** ——— 虫族建筑 ——— */
export const ZERG_BUILDINGS: Def[] = [
  {
    id: "hatchery", name: "孵化场", kind: "building", race: "zerg", tex: "b_hatchery", minerals: 300, vespene: 0,
    supply: 0, buildTime: 8000, hp: 1500, supplyProvided: 10, needsCreep: true,
    produces: ["larva", "lair", "nydus"], desc: "主基地，产幼虫；可变异→巢穴；造尼达斯坑道"
  },
  { // 孵化场升级形态（变异后替换孵化场）
    id: "lair", name: "巢穴", kind: "building", race: "zerg", tex: "b_lair", minerals: 150, vespene: 100,
    supply: 0, buildTime: 6000, hp: 2000, supplyProvided: 10, needsCreep: true, upgradeOf: "hatchery",
    produces: ["hive"], desc: "孵化场升级，解锁飞龙塔/皇后巢等；可再升→母巢"
  },
  { // 巢穴升级形态
    id: "hive", name: "母巢", kind: "building", race: "zerg", tex: "b_hive", minerals: 200, vespene: 150,
    supply: 0, buildTime: 8000, hp: 2500, supplyProvided: 10, needsCreep: true, upgradeOf: "lair",
    desc: "巢穴升级，终极主基地"
  },
  {
    id: "spawningPool", name: "孵化池", kind: "building", race: "zerg", tex: "b_spawningpool", minerals: 200, vespene: 0,
    supply: 0, buildTime: 4000, hp: 500, needsCreep: true, desc: "小狗解锁、提速"
  },
  {
    id: "extractor", name: "萃取器", kind: "building", race: "zerg", tex: "b_extractor", minerals: 25, vespene: 0,
    supply: 0, buildTime: 3000, hp: 500, requiresVespeneGeyser: true, needsCreep: true, desc: "瓦斯采集"
  },
  {
    id: "evolutionChamber", name: "进化室", kind: "building", race: "zerg", tex: "b_evolution", minerals: 75, vespene: 0,
    supply: 0, buildTime: 3000, hp: 400, needsCreep: true, desc: "地面攻防升级"
  },
  {
    id: "creepColony", name: "菌毯殖民地", kind: "building", race: "zerg", tex: "b_creepcolony", minerals: 150, vespene: 0,
    supply: 0, buildTime: 3000, hp: 400, needsCreep: true, produces: ["sunken", "spore"], desc: "可变 地刺堡/孢子堡"
  },
  {
    id: "hydraliskDen", name: "刺蛇穴", kind: "building", race: "zerg", tex: "b_hydraden", minerals: 100, vespene: 50,
    supply: 0, buildTime: 4000, hp: 500, needsCreep: true, produces: ["hydralisk", "lurker"], desc: "刺蛇、潜伏者解锁"
  },
  {
    id: "queenNest", name: "皇后巢", kind: "building", race: "zerg", tex: "b_queennest", minerals: 150, vespene: 100,
    supply: 0, buildTime: 5000, hp: 600, needsCreep: true, produces: ["queen"], desc: "皇后科技"
  },
  {
    id: "spire", name: "飞龙塔", kind: "building", race: "zerg", tex: "b_spire", minerals: 200, vespene: 150,
    supply: 0, buildTime: 6000, hp: 600, needsCreep: true, produces: ["mutalisk", "greaterSpire"], desc: "飞龙；可变异→大飞龙塔，解锁守护者/吞噬者"
  },
  { // 飞龙塔升级形态
    id: "greaterSpire", name: "大飞龙塔", kind: "building", race: "zerg", tex: "b_greaterSpire", minerals: 100, vespene: 150,
    supply: 0, buildTime: 6000, hp: 850, needsCreep: true, upgradeOf: "spire",
    produces: ["guardian", "devourer"], desc: "飞龙塔升级，解锁守护者/吞噬者"
  },
  {
    id: "ultraliskCavern", name: "巨蟒洞穴", kind: "building", race: "zerg", tex: "b_ultracavern", minerals: 200, vespene: 200,
    supply: 0, buildTime: 6000, hp: 600, needsCreep: true, produces: ["ultralisk"], desc: "猛犸（雷兽）"
  },
  {
    id: "defilerMound", name: "蝎子窝", kind: "building", race: "zerg", tex: "b_defilermound", minerals: 100, vespene: 100,
    supply: 0, buildTime: 5000, hp: 500, needsCreep: true, produces: ["defiler"], desc: "蝎子科技"
  },
  {
    id: "nydus", name: "尼达斯坑道", kind: "building", race: "zerg", tex: "b_nydus", minerals: 200, vespene: 200,
    supply: 0, buildTime: 6000, hp: 850, needsCreep: true, desc: "两地基地间传送通道（演示建筑）"
  },
  {
    id: "sunken", name: "地刺堡", kind: "building", race: "zerg", tex: "b_sunken", minerals: 100, vespene: 0,
    supply: 0, buildTime: 3000, hp: 350, groundDamage: 40, attackType: "ground", range: 110, attackInterval: 600, needsCreep: true, desc: "对地防御（需菌毯殖民地升级）"
  },
  {
    id: "spore", name: "孢子堡", kind: "building", race: "zerg", tex: "b_spore", minerals: 75, vespene: 0,
    supply: 0, buildTime: 3000, hp: 400, airDamage: 15, attackType: "air", range: 140, attackInterval: 600, needsCreep: true, desc: "防空 + 反隐形（需菌毯殖民地升级）"
  }
];

/** ——— 虫族兵种 ——— */
export const ZERG_UNITS: Def[] = [
  { id: "drone", name: "工蜂", kind: "unit", race: "zerg", tex: "u_drone", minerals: 50, vespene: 0, supply: 1, buildTime: 4000,
    hp: 40, groundDamage: 5, attackType: "ground", range: 18, attackInterval: 1000, speed: 90, desc: "农民，采集成建筑" },
  { id: "larva", name: "幼虫", kind: "unit", race: "zerg", tex: "u_larva", minerals: 0, vespene: 0, supply: 0, buildTime: 0,
    hp: 25, speed: 0, desc: "孵化一切兵种的基础" },
  { id: "overlord", name: "领主", kind: "unit", race: "zerg", tex: "u_overlord", minerals: 100, vespene: 0, supply: 0, buildTime: 4000,
    hp: 200, speed: 80, air: true, supplyProvided: 8, desc: "房子，人口" },
  { id: "zergling", name: "小狗", kind: "unit", race: "zerg", tex: "u_zergling", minerals: 50, vespene: 0, supply: 1, buildTime: 4000,
    hp: 35, groundDamage: 5, attackType: "ground", range: 20, attackInterval: 500, speed: 110, desc: "快速近战虫" },
  { id: "hydralisk", name: "刺蛇", kind: "unit", race: "zerg", tex: "u_hydralisk", minerals: 75, vespene: 25, supply: 2, buildTime: 4000,
    hp: 80, groundDamage: 10, airDamage: 10, attackType: "both", range: 110, attackInterval: 500, speed: 90, desc: "对空对地远程虫" },
  { id: "lurker", name: "潜伏者", kind: "unit", race: "zerg", tex: "u_lurker", minerals: 125, vespene: 100, supply: 3, buildTime: 5000,
    hp: 120, groundDamage: 20, attackType: "ground", range: 130, attackInterval: 600, speed: 60, desc: "隐形对地刺蛇" },
  { id: "queen", name: "皇后", kind: "unit", race: "zerg", tex: "u_queen", minerals: 100, vespene: 100, supply: 2, buildTime: 5000,
    hp: 120, groundDamage: 10, airDamage: 10, attackType: "both", range: 120, attackInterval: 600, speed: 90, air: true, desc: "虫族法术单位" },
  { id: "defiler", name: "蝎子", kind: "unit", race: "zerg", tex: "u_defiler", minerals: 150, vespene: 150, supply: 3, buildTime: 6000,
    hp: 150, groundDamage: 0, attackType: "both", range: 100, attackInterval: 1000, speed: 70, air: true, desc: "施法者（简化）" },
  { id: "mutalisk", name: "飞龙", kind: "unit", race: "zerg", tex: "u_mutalisk", minerals: 100, vespene: 100, supply: 2, buildTime: 5000,
    hp: 120, groundDamage: 9, airDamage: 9, attackType: "both", range: 110, attackInterval: 500, speed: 130, air: true, desc: "弹射攻击飞龙" },
  { id: "guardian", name: "守护者", kind: "unit", race: "zerg", tex: "u_guardian", minerals: 150, vespene: 150, supply: 4, buildTime: 6000,
    hp: 150, groundDamage: 20, attackType: "ground", range: 150, attackInterval: 600, speed: 80, air: true, desc: "对地大龙" },
  { id: "devourer", name: "吞噬者", kind: "unit", race: "zerg", tex: "u_devourer", minerals: 150, vespene: 150, supply: 4, buildTime: 6000,
    hp: 150, airDamage: 25, attackType: "air", range: 150, attackInterval: 600, speed: 80, air: true, desc: "对空大龙" },
  { id: "ultralisk", name: "猛犸(雷兽)", kind: "unit", race: "zerg", tex: "u_ultralisk", minerals: 200, vespene: 200, supply: 6, buildTime: 7000,
    hp: 400, groundDamage: 20, attackType: "ground", range: 30, attackInterval: 500, speed: 70, desc: "重型近战巨兽" },
  { id: "scourge", name: "自杀蚊(自爆)", kind: "unit", race: "zerg", tex: "u_scourge", minerals: 25, vespene: 75, supply: 1, buildTime: 3000,
    hp: 25, airDamage: 110, attackType: "air", range: 20, attackInterval: 1000, speed: 150, air: true, desc: "对空自爆飞机（高爆伤）" }
];

/** 中立资源节点定义（不计入战斗单位） */
export const RESOURCE_DEFS: Record<string, Def> = {
  mineral: {
    id: "mineral", name: "水晶矿", kind: "unit", race: "zerg", tex: "mineral",
    minerals: 0, vespene: 0, supply: 0, buildTime: 0, hp: 1,
    isNeutral: true, size: 36, desc: "矿物资源",
  } as Def,
  vespene: {
    id: "vespene", name: "瓦斯气泉", kind: "unit", race: "zerg", tex: "vespene",
    minerals: 0, vespene: 0, supply: 0, buildTime: 0, hp: 1,
    isNeutral: true, size: 40, desc: "瓦斯资源",
  } as Def,
};

/** 可产出幼虫的建筑 id */
const LARVA_PRODUCERS = new Set(["hatchery", "lair", "hive", "nexus"]);

/** 运行时桥接：把数据上的字段（air/supply/kind）映射为 entities/Textures 期望的字段，并补充贴图尺寸。 */
function decorate(d: Def): Def {
  const isBuilding = d.kind === "building";
  const w = d.w ?? (isBuilding ? 48 : 26);
  const h = d.h ?? (isBuilding ? 48 : 26);
  return {
    ...d,
    isBuilding,
    isAir: d.air ?? false,
    supplyCost: d.supply ?? 0,
    size: d.size ?? (isBuilding ? 30 : 16),
    canProduceLarva: LARVA_PRODUCERS.has(d.id),
    w,
    h,
  };
}

/** 合并查找表（含桥接字段 + 资源节点） */
export const ALL_DEFS: Record<string, Def> = {};
for (const d of [
  ...BUILDINGS, ...UNITS,
  ...PROTOSS_BUILDINGS, ...PROTOSS_UNITS,
  ...ZERG_BUILDINGS, ...ZERG_UNITS,
  ...Object.values(RESOURCE_DEFS),
]) ALL_DEFS[d.id] = decorate(d);

export function getDef(id: string): Def {
  return ALL_DEFS[id];
}

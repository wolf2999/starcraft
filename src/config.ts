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
  | "ai7"
  | "ai8";

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
  ai8: 0xd6894a, // 橙（网络局主机槽位在非主机端的显示色）
};

/** 取阵营颜色，未知阵营回退白色 */
export function ownerColor(owner: string): number {
  return OWNER_COLORS[owner] ?? 0xffffff;
}

/* —— 网络局阵营支持（单机局默认值保证行为不变）——
 * 主机固定占 slot0 = "player"，其余玩家依次占 ai1..ai7（服务器 start_game.slots 一一对应）。
 * 单机局：LOCAL_OWNER="player"、NET_TEAMS=null → isFriendly 仅自己+中立同侧，与旧逻辑一致。 */

/** 本端视角的 owner（单机恒为 player；网络局由 GameScene init 按槽位设置） */
export let LOCAL_OWNER: Owner = "player";

/** 网络局 owner → 阵营（"A"|"B"）映射；null = 单机局 */
export let NET_TEAMS: Record<string, "A" | "B"> | null = null;

/** 设置本端 owner 与阵营表（GameScene init 网络局时调用） */
export function setNetContext(localOwner: Owner, teams: Record<string, "A" | "B"> | null): void {
  LOCAL_OWNER = localOwner;
  NET_TEAMS = teams;
}

/** owner 是否友军：自己、或网络局中同阵营（单机局仅自己） */
export function isFriendly(owner: string): boolean {
  if (owner === LOCAL_OWNER) return true;
  if (!NET_TEAMS) return false;
  return NET_TEAMS[owner] === NET_TEAMS[LOCAL_OWNER];
}

/** owner 是否敌对（中立既非友军也非敌对；战斗/迷雾/染色按此过滤） */
export function isHostile(owner: string): boolean {
  return owner !== "neutral" && !isFriendly(owner);
}

/**
 * 调试开关：是否允许 AI 战斗单位主动索敌/移动（AI 经济出兵的战斗消费端）。
 * 农民（有 builds 清单）永远不设 aggressive，否则会放弃采集去追杀敌人。
 */
export const AI_AGGRESSIVE = true;

/* —— AI 经济（数据驱动，GameScene.updateAI/aiTick 消费）—— */
/** AI 经济决策间隔（秒），各阵营在此间隔内随机错峰 */
export const AI_TICK_INTERVAL = 1.2;
/** AI 每阵营农民数量目标 */
export const AI_WORKER_TARGET = 8;
/** 各族农民 id（造农用） */
export const AI_WORKER: Record<string, string> = {
  terran: "scv",
  protoss: "probe",
  zerg: "drone",
};
/** 各族首个产能建筑（AI 的第一个非补给建造目标） */
export const AI_PRODUCTION_BUILDING: Record<string, string> = {
  terran: "barracks",
  protoss: "gateway",
  zerg: "spawningPool",
};
/** 各族补给建筑（虫族走训练 overlord，无建造项） */
export const AI_SUPPLY_BUILDING: Record<string, string> = {
  terran: "sd",
  protoss: "pylon",
};
/** 各族出兵偏好列表（与产能建筑 trainableListOf 取交集，按序取首个可负担项） */
export const AI_COMBAT_UNITS: Record<string, string[]> = {
  terran: ["marine"],
  protoss: ["zealot", "dragoon"],
  zerg: ["zergling", "hydralisk"],
};

/** 视野半径（格）：待命单位原地索敌的判定范围（星际式"驻守迎击"）。
 * 全图索敌是 aggressive 单位（AI 主动进攻）的语义；待命单位只迎击
 * 视野内的敌人，目标死亡即回待命，不会跨图追猎。 */
export const SIGHT_RANGE = 6;

/* —— 战争迷雾（fog of war，仅玩家视角的表现层）—— */
/** 迷雾刷新间隔（ms）：可见集重算 + 覆盖层/小地图迷雾重绘节流 */
export const FOG_UPDATE_INTERVAL = 250;
/** 建筑视野半径（格）；单位视野复用 SIGHT_RANGE */
export const FOG_SIGHT_BUILDING = 9;
/** 已探索但不可见区域的黑色覆盖透明度 */
export const FOG_EXPLORED_ALPHA = 0.45;

/* —— 胜负判定 —— */
/** 存活实体扫描间隔（秒）：玩家全灭=失败 / 全部 AI 阵营全灭=胜利 */
export const VICTORY_CHECK_INTERVAL = 1;

/* —— 蜘蛛雷（vulture 布雷，M 键）—— */
/** 引爆对地面实体伤害（AoE，不穿盾） */
export const SPIDER_MINE_DAMAGE = 100;
/** 敌方地面单位触发半径（格） */
export const SPIDER_MINE_TRIGGER = 0.45;
/** 溅射半径（格，对敌方地面单位） */
export const SPIDER_MINE_SPLASH = 0.7;
/** 布雷到激活的延时（毫秒，防贴脸秒爆） */
export const SPIDER_MINE_ARM_MS = 750;

/* —— 灵能风暴（ht，S 键）—— */
/** 能量消耗 */
export const STORM_COST = 75;
/** 施法距离（格） */
export const STORM_RANGE = 9;
/** 风暴半径（格，敌我通吃对单位，不含建筑/中立/乘客） */
export const STORM_RADIUS = 1.2;
/** 总波数 */
export const STORM_TICKS = 3;
/** 波间隔（毫秒） */
export const STORM_TICK_INTERVAL = 500;
/** 每波伤害 */
export const STORM_TICK_DAMAGE = 20;

/* —— 精神控制（darkarchon，C 键）—— */
/** 能量消耗 */
export const MIND_CONTROL_COST = 150;
/** 施放距离（格） */
export const MIND_CONTROL_RANGE = 1.5;

/* —— 附属建筑挂接（comsat/nuclear/techlab/reactor）—— */
/** 附属建筑放置：距 attachOf 主建筑中心的最大距离（格） */
export const ATTACH_RANGE = 2.2;
/** SCV 修理速率（HP/秒，修理己方机械单位/建筑） */
export const REPAIR_RATE = 35;

/** 每秒能量回复（有 def.energy 的单位；星际约 0.94/s，取整便于心算） */
export const ENERGY_REGEN = 1;

/** 反隐形侦测半径（格）：detects 单位/建筑（防御塔/科学球等）可锁定
 * 该半径内的敌方隐形单位；隐形目标攻击 detect 实体时也会暴露自身。 */
export const DETECT_RANGE = 7;

/** 隐形单位对己方渲染的半透明度（星际式"看得到自己人"，对敌方才真正隐形） */
export const CLOAK_ALPHA = 0.45;

/** ghost/wraith 攻击瞬间显形时长（ms）：显形期间可被任何敌人直接锁定；
 * dt/observer 不显形（observer 无攻击力，dt 恒隐形）。 */
export const ATTACK_REVEAL_MS = 2000;

/** ghost 锁定（Lockdown）持续时间（ms）：被锁定的机械单位冻结一切行为 */
export const LOCKDOWN_DURATION = 60000;
/** ghost 锁定能量消耗 */
export const LOCKDOWN_COST = 100;
/** ghost 锁定施放距离（格） */
export const LOCKDOWN_RANGE = 8;
/** ghost 核弹（Nuke）溅射伤害（敌我通吃，神族盾正常吸收非穿盾） */
export const NUKE_DAMAGE = 600;
/** 核弹溅射半径（格，以落点为中心） */
export const NUKE_RADIUS = 3;
/** 核弹引导倒计时（ms）：ghost 原地显形引导，死亡/位移打断 */
export const NUKE_GUIDE_MS = 10000;
/** 核弹全局装填冷却（ms，发射即开始倒数，引导期含在内） */
export const NUKE_COOLDOWN = 30000;
/** 核弹科技门槛：需己方已建成核弹井（指挥中心附属，2026-10-10 挂接开放） */
export const NUKE_REQUIRES = "nuclear";

/* —— 航母拦截机（carrier bay）—— */
/** 航母出厂自带拦截机数（免费停泊进机库，上限 def.interceptorBay） */
export const CARRIER_START_INTERCEPTORS = 4;
/** 拦截机回收停靠距离（格）：出击拦截机无目标后飞回母舰，小于该距离即停泊 */
export const INTERCEPTOR_REDOCK_DIST = 1.2;
/** 拦截机出击弹出偏移（格）：从母舰位置沿随机方向弹出，避免与母舰重叠 */
export const INTERCEPTOR_LAUNCH_OFFSET = 0.6;

/* —— 兴奋剂（stimpack，marine/firebat）—— */
/** 施放自伤（HP 直扣，不走 takeDamage 反击链） */
export const STIM_COST_HP = 10;
/** 增益持续时长（ms） */
export const STIM_DURATION = 15000;
/** 攻速/移速倍率（星际式 +50%） */
export const STIM_RATE = 1.5;

/* —— 科技升级（research，academy/ebay/armory/forge/evolutionChamber 消费）—— */
/** 攻击升级每级伤害加成（attackDamage 统一入口追加，全兵种通用简化） */
export const ATTACK_UPGRADE_BONUS = 2;
/** 防御升级每级减伤（takeDamage 统一入口扣减，最低 0） */
export const ARMOR_UPGRADE_BONUS = 1;
/** 科技升级种类表：等级按阵营记在 GameScene.upgradesBy；成本/耗时按下标（=当前等级）取 */
export interface UpgradeKindDef {
  id: string;
  name: string;
  maxLevel: number;
  minerals: number[];
  vespene: number[];
  /** 每级研究耗时（ms，下标 = 当前等级） */
  time: number[];
}
export const UPGRADE_KINDS: Record<string, UpgradeKindDef> = {
  attack: {
    id: "attack", name: "攻击升级", maxLevel: 3,
    minerals: [100, 150, 200], vespene: [100, 150, 200], time: [12000, 15000, 18000],
  },
  armor: {
    id: "armor", name: "防御升级", maxLevel: 3,
    minerals: [100, 150, 200], vespene: [75, 125, 175], time: [12000, 15000, 18000],
  },
};

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
  /** 单位：可建造的建筑 id 列表（SCV/probe/drone 等建造者） */
  builds?: string[];
  /** 单位：是否空中（影响目标选择） */
  air?: boolean;
  /** 建筑：是否提供人口上限 */
  supplyProvided?: number;
  /** 建筑：可生产哪些单位/建筑（id 列表） */
  produces?: string[];
  /** 建筑：训练面板列出本族全部单位经幼虫变异（虫族孵化场系；训练时消耗一只附着幼虫） */
  larvaMorph?: boolean;
  /** 建筑：必须建在特定资源上（精炼厂） */
  requiresVespeneGeyser?: boolean;
  /** 视觉缩放倍率（乘在 spriteScale/资源缩放之上；气矿类建筑罩住气泉用） */
  visualScale?: number;
  /** 建筑：可降下/收起（供给站） */
  canLift?: boolean;
  /** 建筑：是否需要菌毯（虫族） */
  needsCreep?: boolean;
  /** 建筑：是某建筑的升级形态（生成后替换原建筑）。值为被升级建筑的 id */
  upgradeOf?: string;
  /** 建筑：可研究的科技升级种类（UPGRADE_KINDS 键；面板出研究按钮，完成按阵营记等级） */
  researches?: string[];
  /** 建筑/单位：前置建筑（需己方已建成该 id 才能建造/变异/训练），生产面板据此置灰 */
  requires?: string;
  /** 单位：天生隐形（对敌方不可见，需敌方侦测方可被锁定/攻击；己方半透明显示） */
  cloaked?: boolean;
  /** 单位：天生隐形且攻击时显形（ghost/wraith；dt/observer 恒隐形不设此字段） */
  cloakRevealsOnAttack?: boolean;
  /** 建筑/单位：反隐形侦测（DETECT_RANGE 格内的敌方隐形单位可被己方锁定/攻击） */
  detects?: boolean;
  /** 单位：每次治疗回复量（medic；治疗间隔复用 attackInterval，空闲时自动治疗 6 格内受伤友军） */
  healAmount?: number;
  /** 单位：撞击自爆（scourge；airDamage 即爆炸伤害，命中后自身死亡，无普通开火） */
  suicide?: boolean;
  /** 单位：攻城模式对地攻击力（tank；sieged 态替换 groundDamage，且不能移动） */
  siegeDamage?: number;
  /** 单位：攻城模式射程（tank，像素；sieged 态替换 range） */
  siegeRange?: number;
  /** 单位：能量上限（battlecruiser/ghost/scienceVessel；有值即参与回能并显示蓝色能量条） */
  energy?: number;
  /** 单位：大和炮伤害（battlecruiser；穿透护盾直接扣血，Y 键指定目标） */
  yamatoDamage?: number;
  /** 单位：大和炮能量消耗（battlecruiser） */
  yamatoCost?: number;
  /** 单位：运输装载容量（dropship/shuttle/overlord；乘客占用位 = cargoSize，装满即拒载） */
  cargoCapacity?: number;
  /** 单位：装载占位（重型地面单位 2，默认 1） */
  cargoSize?: number;
  /** 单位：航母机库容量（carrier=8；>0 即"航母"——本体 0 伤不开火，索敌锁定目标后
   * 由 GameScene.updateInterceptors 释放拦截机出击/回收） */
  interceptorBay?: number;
  /** 单位：可进驻碉堡（marine/firebat/medic/ghost/scv 步兵系；右键己方碉堡即进驻） */
  bunkerUnit?: boolean;
  /** 单位：可施放兴奋剂（T 键，自伤 STIM_COST_HP 换攻速/移速 STIM_RATE 倍，持续 STIM_DURATION） */
  stim?: boolean;
  /** 单位：携带蜘蛛雷数（vulture；M 键脚下布雷，用完为止，雷不自动补充） */
  mines?: number;
  /** 单位：可施放灵能风暴（ht；S 键指定落点，STORM_TICKS 波 AoE，敌我通吃对单位） */
  storm?: boolean;
  /** 单位：可施放精神控制（darkarchon；C 键指定敌方单位永久策反为施法者阵营） */
  mindControl?: boolean;
  /** 建筑：附属建筑（必须建在 attachOf 指定主建筑 ATTACH_RANGE 内；comsat/nuclear/techlab/reactor） */
  attachment?: boolean;
  /** 建筑：附属允许附着的主建筑 id */
  attachOf?: string;
  /** 简体中文提示 */
  desc: string;

  /* —— 以下为运行时派生字段（由桥接层 ALL_DEFS 注入，数据本身不写） —— */
  /** 是否为建筑（= kind === "building"） */
  isBuilding?: boolean;
  /** 机械单位（ghost 锁定 Lockdown 的合法目标；由 MECHANICAL_IDS 桥接注入，数据不写） */
  mechanical?: boolean;
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
    supply: 0, buildTime: 8000, hp: 1500, supplyProvided: 10, w: 128, size: 128,
    produces: ["scv", "comsat", "nuclear"], desc: "生产 SCV；附属卫星站/核弹井"
  },
  {
    id: "sd", name: "供给站", kind: "building", race: "terran", tex: "b_sd", minerals: 100, vespene: 0,
    supply: 0, buildTime: 3000, hp: 400, supplyProvided: 8, canLift: true,
    desc: "+8 人口上限，可降下/收起"
  },
  {
    id: "rf", name: "精炼厂", kind: "building", race: "terran", tex: "b_rf", minerals: 100, vespene: 0,
    supply: 0, buildTime: 3000, hp: 500, requiresVespeneGeyser: true, visualScale: 1.6,
    desc: "建在瓦斯气矿上，采集瓦斯"
  },
  {
    id: "barracks", name: "兵营", kind: "building", race: "terran", tex: "b_barracks", minerals: 150, vespene: 0,
    supply: 0, buildTime: 4500, hp: 1000, produces: ["marine", "firebat", "medic", "ghost", "techlab", "reactor"],
    desc: "产步兵；可起飞；附属反应堆/科技实验室"
  },
  {
    id: "academy", name: "研究院", kind: "building", race: "terran", tex: "b_academy", minerals: 150, vespene: 0,
    supply: 0, buildTime: 4500, hp: 600, researches: ["attack", "armor"], desc: "步兵攻防研究"
  },
  {
    id: "ebay", name: "工程湾", kind: "building", race: "terran", tex: "b_ebay", minerals: 150, vespene: 0,
    supply: 0, buildTime: 4500, hp: 850, researches: ["attack", "armor"], desc: "步兵攻防研究"
  },
  {
    id: "factory", name: "重工", kind: "building", race: "terran", tex: "b_factory", minerals: 200, vespene: 100,
    supply: 0, buildTime: 6000, hp: 1250, produces: ["vulture", "tank", "goliath", "machineShop"],
    desc: "机械单位；附属机械车间"
  },
  {
    id: "armory", name: "军械库", kind: "building", race: "terran", tex: "b_armory", minerals: 150, vespene: 100,
    supply: 0, buildTime: 6000, hp: 750, researches: ["attack", "armor"], desc: "机械/空军攻防研究"
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
    supply: 0, buildTime: 3000, hp: 350, cargoCapacity: 4, desc: "进驻 4 个步兵的防御建筑（步兵右键进驻，U 键卸载）"
  },
  {
    id: "turret", name: "导弹塔", kind: "building", race: "terran", tex: "b_turret", minerals: 100, vespene: 0,
    supply: 0, buildTime: 3000, hp: 250, airDamage: 20, attackType: "air", range: 140, attackInterval: 500, detects: true, desc: "防空 + 反隐形"
  },
  // —— 附属建筑（comsat/nuclear 挂 cc、techlab/reactor 挂 barracks，SCV 可建；
  // machineShop/controlTower/physicsLab/covertOps 暂为摆设不开放） ——
  {
    id: "comsat", name: "卫星站", kind: "building", race: "terran", tex: "b_comsat", minerals: 50, vespene: 50,
    supply: 0, buildTime: 3000, hp: 200, detects: true, attachment: true, attachOf: "cc", desc: "指挥中心附属：侦测隐形"
  },
  {
    id: "nuclear", name: "核弹井", kind: "building", race: "terran", tex: "b_nuke", minerals: 100, vespene: 100,
    supply: 0, buildTime: 4000, hp: 200, attachment: true, attachOf: "cc", desc: "指挥中心附属：解锁核弹"
  },
  {
    id: "techlab", name: "科技实验室", kind: "building", race: "terran", tex: "b_techlab", minerals: 50, vespene: 50,
    supply: 0, buildTime: 2000, hp: 200, attachment: true, attachOf: "barracks", desc: "兵营附属：解锁鬼兵"
  },
  {
    id: "reactor", name: "反应堆", kind: "building", race: "terran", tex: "b_reactor", minerals: 50, vespene: 0,
    supply: 0, buildTime: 2000, hp: 200, attachment: true, attachOf: "barracks", desc: "兵营附属：双倍产兵（训练速度 ×2）"
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
  {
    id: "scv", name: "SCV", kind: "unit", race: "terran", tex: "u_scv", minerals: 50, vespene: 0, supply: 1, buildTime: 4000,
    hp: 60, groundDamage: 5, attackType: "ground", range: 18, attackInterval: 1000, speed: 90,
    // 可建造：主体建筑 + 附属建筑（comsat/nuclear 挂 cc、techlab/reactor 挂 barracks）
    builds: ["cc", "sd", "rf", "barracks", "academy", "ebay", "factory", "armory", "starport", "scienceFacility", "bunker", "turret", "comsat", "nuclear", "techlab", "reactor"], bunkerUnit: true,
    desc: "农民，采集与建造"
  },
  // 地面步兵
  {
    id: "marine", name: "机枪兵", kind: "unit", race: "terran", tex: "u_marine", minerals: 50, vespene: 0, supply: 1, buildTime: 4000,
    hp: 40, groundDamage: 6, airDamage: 6, attackType: "both", range: 110, attackInterval: 600, speed: 90, bunkerUnit: true, stim: true, desc: "基础步兵（T 键兴奋剂）"
  },
  {
    id: "firebat", name: "喷火兵", kind: "unit", race: "terran", tex: "u_firebat", minerals: 50, vespene: 25, supply: 1, buildTime: 4000,
    hp: 50, groundDamage: 16, attackType: "ground", range: 32, attackInterval: 600, speed: 90, bunkerUnit: true, stim: true, desc: "范围近战火焰（T 键兴奋剂）"
  },
  {
    id: "medic", name: "护士", kind: "unit", race: "terran", tex: "u_medic", minerals: 50, vespene: 25, supply: 1, buildTime: 4000,
    hp: 60, range: 100, attackInterval: 1000, speed: 90, healAmount: 6, bunkerUnit: true, desc: "治疗友军"
  },
  {
    id: "ghost", name: "幽灵(鬼兵)", kind: "unit", race: "terran", tex: "u_ghost", minerals: 25, vespene: 75, supply: 1, buildTime: 5000,
    hp: 45, groundDamage: 10, airDamage: 10, attackType: "both", range: 130, attackInterval: 1000, speed: 95, energy: 200, cloaked: true, cloakRevealsOnAttack: true, bunkerUnit: true, requires: "techlab", desc: "隐形、锁定、核打击"
  },
  // 机械地面
  {
    id: "vulture", name: "秃鹫战车(雷车)", kind: "unit", race: "terran", tex: "u_vulture", minerals: 75, vespene: 0, supply: 2, buildTime: 4000,
    hp: 80, groundDamage: 20, attackType: "ground", range: 110, attackInterval: 600, speed: 150, cargoSize: 2, mines: 3, desc: "高速布雷车（M 键脚下布雷）"
  },
  {
    id: "tank", name: "攻城坦克", kind: "unit", race: "terran", tex: "u_tank", minerals: 150, vespene: 100, supply: 6, buildTime: 6000,
    hp: 150, groundDamage: 30, attackType: "ground", range: 130, attackInterval: 1100, speed: 70, siegeDamage: 60, siegeRange: 384, cargoSize: 2, desc: "可切攻城模式（E 键）"
  },
  {
    id: "goliath", name: "巨型机器人", kind: "unit", race: "terran", tex: "u_goliath", minerals: 100, vespene: 50, supply: 2, buildTime: 5000,
    hp: 125, groundDamage: 12, airDamage: 12, attackType: "both", range: 120, attackInterval: 500, speed: 75, cargoSize: 2, desc: "对空对地双管"
  },
  // 空中
  {
    id: "dropship", name: "运输机", kind: "unit", race: "terran", tex: "u_dropship", minerals: 100, vespene: 100, supply: 2, buildTime: 5000,
    hp: 150, speed: 110, air: true, cargoCapacity: 8, desc: "运输单位（右键己方地面单位装载，U 键卸载）"
  },
  {
    id: "wraith", name: "怨灵战机(隐飞)", kind: "unit", race: "terran", tex: "u_wraith", minerals: 150, vespene: 100, supply: 2, buildTime: 6000,
    hp: 120, groundDamage: 8, airDamage: 8, attackType: "both", range: 120, attackInterval: 600, speed: 130, air: true, cloaked: true, cloakRevealsOnAttack: true, desc: "可隐形战机"
  },
  {
    id: "valkyrie", name: "女武神护卫舰", kind: "unit", race: "terran", tex: "u_valkyrie", minerals: 250, vespene: 125, supply: 4, buildTime: 7000,
    hp: 200, airDamage: 14, attackType: "air", range: 130, attackInterval: 500, speed: 110, air: true, desc: "对空齐射"
  },
  {
    id: "scienceVessel", name: "科学球(科技球)", kind: "unit", race: "terran", tex: "u_sciencevessel", minerals: 100, vespene: 225, supply: 2, buildTime: 8000,
    hp: 200, speed: 110, air: true, energy: 200, detects: true, desc: "反隐形/防御场"
  },
  {
    id: "battlecruiser", name: "战列巡洋舰(大和)", kind: "unit", race: "terran", tex: "u_battlecruiser", minerals: 400, vespene: 300, supply: 8, buildTime: 12000,
    hp: 500, groundDamage: 25, airDamage: 25, attackType: "both", range: 150, attackInterval: 1000, speed: 70, air: true, energy: 200, yamatoDamage: 250, yamatoCost: 150, desc: "大和炮主力舰（Y 键指定目标）"
  }
];

/** ——— 神族建筑 ——— */
export const PROTOSS_BUILDINGS: Def[] = [
  {
    id: "nexus", name: "枢纽", kind: "building", race: "protoss", tex: "b_nexus", minerals: 400, vespene: 0,
    supply: 0, buildTime: 8000, hp: 1500, shield: 1500, supplyProvided: 10, w: 128, size: 128,
    produces: ["probe"], desc: "主基地，生产探针"
  },
  {
    id: "pylon", name: "水晶塔", kind: "building", race: "protoss", tex: "b_pylon", minerals: 100, vespene: 0,
    supply: 0, buildTime: 3000, hp: 300, shield: 300, supplyProvided: 8, desc: "+8 人口上限，供能"
  },
  {
    id: "assimilator", name: "吸收器", kind: "building", race: "protoss", tex: "b_assimilator", minerals: 100, vespene: 0,
    supply: 0, buildTime: 3000, hp: 300, shield: 300, requiresVespeneGeyser: true, visualScale: 1.6, desc: "建在瓦斯气泉上采集瓦斯"
  },
  {
    id: "gateway", name: "兵营", kind: "building", race: "protoss", tex: "b_gateway", minerals: 150, vespene: 0,
    supply: 0, buildTime: 4500, hp: 500, shield: 500, produces: ["zealot", "dragoon"], desc: "产狂徒、龙骑士"
  },
  {
    id: "forge", name: "锻造炉", kind: "building", race: "protoss", tex: "b_forge", minerals: 150, vespene: 0,
    supply: 0, buildTime: 4500, hp: 350, shield: 350, researches: ["attack", "armor"], desc: "地面攻防研究"
  },
  {
    id: "cannon", name: "光子炮台", kind: "building", race: "protoss", tex: "b_cannon", minerals: 150, vespene: 0,
    supply: 0, buildTime: 3000, hp: 200, shield: 200, groundDamage: 20, airDamage: 20, attackType: "both", range: 150, attackInterval: 600, detects: true, desc: "防御，对地对空 + 反隐"
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
  {
    id: "probe", name: "探针", kind: "unit", race: "protoss", tex: "u_probe", minerals: 50, vespene: 0, supply: 1, buildTime: 4000,
    hp: 20, shield: 20, groundDamage: 5, attackType: "ground", range: 18, attackInterval: 1000, speed: 90, desc: "农民，采集与建造",
    // 召唤（瞬建）未做，与 SCV/drone 同款简化施工；AI 经济依赖此清单建水晶塔/兵营
    builds: ["nexus", "pylon", "assimilator", "gateway", "forge", "cannon", "archives", "robofac", "robobay", "stargate", "fleetbeacon", "arbiterTribunal"]
  },
  {
    id: "zealot", name: "狂徒(叉子)", kind: "unit", race: "protoss", tex: "u_zealot", minerals: 100, vespene: 0, supply: 2, buildTime: 4000,
    hp: 100, shield: 60, groundDamage: 8, attackType: "ground", range: 22, attackInterval: 400, speed: 95, desc: "近战狂战士"
  },
  {
    id: "dragoon", name: "龙骑士", kind: "unit", race: "protoss", tex: "u_dragoon", minerals: 125, vespene: 50, supply: 2, buildTime: 5000,
    hp: 100, shield: 80, groundDamage: 20, airDamage: 20, attackType: "both", range: 120, attackInterval: 600, speed: 70, desc: "对空对地远程"
  },
  {
    id: "ht", name: "高阶圣堂", kind: "unit", race: "protoss", tex: "u_ht", minerals: 50, vespene: 150, supply: 2, buildTime: 6000,
    hp: 40, shield: 40, groundDamage: 0, attackType: "both", range: 110, attackInterval: 1000, speed: 90, energy: 200, storm: true, desc: "灵能法师（S 键风暴）"
  },
  {
    id: "dt", name: "黑暗圣堂", kind: "unit", race: "protoss", tex: "u_dt", minerals: 125, vespene: 100, supply: 2, buildTime: 6000,
    hp: 40, shield: 40, groundDamage: 40, attackType: "ground", range: 22, attackInterval: 400, speed: 90, cloaked: true, desc: "隐形近战刺客"
  },
  {
    id: "reaver", name: "金甲虫", kind: "unit", race: "protoss", tex: "u_reaver", minerals: 200, vespene: 100, supply: 4, buildTime: 7000,
    hp: 140, shield: 80, groundDamage: 100, attackType: "ground", range: 160, attackInterval: 2000, speed: 50, desc: "抛射甲虫炮弹"
  },
  {
    id: "shuttle", name: "运输机", kind: "unit", race: "protoss", tex: "u_shuttle", minerals: 200, vespene: 0, supply: 2, buildTime: 5000,
    hp: 80, shield: 60, speed: 130, air: true, cargoCapacity: 8, desc: "运输单位（右键己方地面单位装载，U 键卸载）"
  },
  {
    id: "scout", name: "侦察机", kind: "unit", race: "protoss", tex: "u_scout", minerals: 300, vespene: 150, supply: 3, buildTime: 6000,
    hp: 150, shield: 100, groundDamage: 28, airDamage: 28, attackType: "both", range: 140, attackInterval: 500, speed: 130, air: true, desc: "高速拦截机"
  },
  {
    id: "carrier", name: "航母", kind: "unit", race: "protoss", tex: "u_carrier", minerals: 350, vespene: 250, supply: 8, buildTime: 10000,
    hp: 250, shield: 150, groundDamage: 0, airDamage: 0, attackType: "both", range: 200, attackInterval: 1000, speed: 60, air: true,
    interceptorBay: 8, produces: ["interceptor"], desc: "携带拦截机的主力舰（机库 8，自动出击/回收）"
  },
  {
    id: "arbiter", name: "仲裁者", kind: "unit", race: "protoss", tex: "u_arbiter", minerals: 350, vespene: 250, supply: 6, buildTime: 9000,
    hp: 200, shield: 150, airDamage: 0, attackType: "air", range: 160, attackInterval: 1000, speed: 70, air: true, desc: "时空力场主力舰"
  },
  {
    id: "observer", name: "观察者(叮当)", kind: "unit", race: "protoss", tex: "u_observer", minerals: 25, vespene: 75, supply: 1, buildTime: 4000,
    hp: 40, shield: 20, speed: 130, air: true, cloaked: true, detects: true, desc: "反隐形侦察（隐形）"
  },
  {
    id: "interceptor", name: "拦截机", kind: "unit", race: "protoss", tex: "u_interceptor", minerals: 0, vespene: 0, supply: 0, buildTime: 1000,
    hp: 40, shield: 40, groundDamage: 4, airDamage: 4, attackType: "both", range: 100, attackInterval: 500, speed: 120, air: true, desc: "航母小飞机"
  },
  {
    id: "corsair", name: "海盗船", kind: "unit", race: "protoss", tex: "u_corsair", minerals: 150, vespene: 100, supply: 2, buildTime: 5000,
    hp: 100, shield: 80, airDamage: 8, attackType: "air", range: 140, attackInterval: 400, speed: 150, air: true, desc: "对空拦截（闪电）"
  },
  {
    id: "archon", name: "执政官(白球)", kind: "unit", race: "protoss", tex: "u_archon", minerals: 100, vespene: 300, supply: 4, buildTime: 6000,
    hp: 10, shield: 350, groundDamage: 30, airDamage: 30, attackType: "both", range: 60, attackInterval: 600, speed: 80, desc: "双圣堂融合，范围溅射"
  },
  {
    id: "darkarchon", name: "黑暗执政官(红球)", kind: "unit", race: "protoss", tex: "u_darkarchon", minerals: 125, vespene: 200, supply: 4, buildTime: 6000,
    hp: 10, shield: 250, groundDamage: 0, attackType: "both", range: 100, attackInterval: 1000, speed: 80, energy: 200, mindControl: true, desc: "双黑暗圣堂融合（C 键精神控制）"
  }
];

/** ——— 虫族建筑 ——— */
export const ZERG_BUILDINGS: Def[] = [
  {
    id: "hatchery", name: "孵化场", kind: "building", race: "zerg", tex: "b_hatchery", minerals: 300, vespene: 0,
    supply: 0, buildTime: 8000, hp: 1500, supplyProvided: 10, needsCreep: true, larvaMorph: true, w: 128, size: 128,
    produces: ["larva", "lair", "nydus"], desc: "主基地，产幼虫；幼虫变异全部虫族单位；可变异→巢穴"
  },
  { // 孵化场升级形态（变异后替换孵化场）
    id: "lair", name: "巢穴", kind: "building", race: "zerg", tex: "b_lair", minerals: 150, vespene: 100,
    supply: 0, buildTime: 6000, hp: 2000, supplyProvided: 10, needsCreep: true, upgradeOf: "hatchery", larvaMorph: true, w: 128, size: 128,
    produces: ["hive"], desc: "孵化场升级，解锁飞龙塔/皇后巢等；可再升→母巢"
  },
  { // 巢穴升级形态
    id: "hive", name: "母巢", kind: "building", race: "zerg", tex: "b_hive", minerals: 200, vespene: 150,
    supply: 0, buildTime: 8000, hp: 2500, supplyProvided: 10, needsCreep: true, upgradeOf: "lair", larvaMorph: true, w: 128, size: 128,
    desc: "巢穴升级，终极主基地"
  },
  {
    id: "spawningPool", name: "孵化池", kind: "building", race: "zerg", tex: "b_spawningpool", minerals: 200, vespene: 0,
    supply: 0, buildTime: 4000, hp: 500, needsCreep: true, desc: "小狗解锁、提速"
  },
  {
    id: "extractor", name: "萃取器", kind: "building", race: "zerg", tex: "b_extractor", minerals: 25, vespene: 0,
    supply: 0, buildTime: 3000, hp: 500, requiresVespeneGeyser: true, needsCreep: true, visualScale: 1.6, desc: "瓦斯采集"
  },
  {
    id: "evolutionChamber", name: "进化室", kind: "building", race: "zerg", tex: "b_evolution", minerals: 75, vespene: 0,
    supply: 0, buildTime: 3000, hp: 400, needsCreep: true, researches: ["attack", "armor"], desc: "地面攻防研究"
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
    supply: 0, buildTime: 3000, hp: 350, groundDamage: 40, attackType: "ground", range: 110, attackInterval: 600, needsCreep: true, upgradeOf: "creepColony", desc: "对地防御（菌毯殖民地变异）"
  },
  {
    id: "spore", name: "孢子堡", kind: "building", race: "zerg", tex: "b_spore", minerals: 75, vespene: 0,
    supply: 0, buildTime: 3000, hp: 400, airDamage: 15, attackType: "air", range: 140, attackInterval: 600, needsCreep: true, detects: true, upgradeOf: "creepColony", desc: "防空 + 反隐形（菌毯殖民地变异）"
  }
];

/** ——— 虫族兵种 ——— */
export const ZERG_UNITS: Def[] = [
  {
    id: "drone", name: "工蜂", kind: "unit", race: "zerg", tex: "u_drone", minerals: 50, vespene: 0, supply: 1, buildTime: 4000,
    hp: 40, groundDamage: 5, attackType: "ground", range: 18, attackInterval: 1000, speed: 90, desc: "农民，采集成建筑",
    builds: ["hatchery", "extractor", "spawningPool", "evolutionChamber", "creepColony", "hydraliskDen", "queenNest", "spire", "ultraliskCavern", "defilerMound", "nydus"]
  },
  {
    id: "larva", name: "幼虫", kind: "unit", race: "zerg", tex: "u_larva", minerals: 0, vespene: 0, supply: 0, buildTime: 0,
    hp: 25, speed: 0, desc: "孵化一切兵种的基础"
  },
  {
    id: "overlord", name: "领主", kind: "unit", race: "zerg", tex: "u_overlord", minerals: 100, vespene: 0, supply: 0, buildTime: 4000,
    hp: 200, speed: 80, air: true, supplyProvided: 8, cargoCapacity: 8, detects: true, desc: "房子，人口（反隐形侦测·可装载）"
  },
  {
    id: "zergling", name: "小狗", kind: "unit", race: "zerg", tex: "u_zergling", minerals: 50, vespene: 0, supply: 1, buildTime: 4000,
    hp: 35, groundDamage: 5, attackType: "ground", range: 20, attackInterval: 500, speed: 110, desc: "快速近战虫"
  },
  {
    id: "hydralisk", name: "刺蛇", kind: "unit", race: "zerg", tex: "u_hydralisk", minerals: 75, vespene: 25, supply: 2, buildTime: 4000,
    hp: 80, groundDamage: 10, airDamage: 10, attackType: "both", range: 110, attackInterval: 500, speed: 90, requires: "hydraliskDen", desc: "对空对地远程虫"
  },
  {
    id: "lurker", name: "潜伏者", kind: "unit", race: "zerg", tex: "u_lurker", minerals: 125, vespene: 100, supply: 3, buildTime: 5000,
    hp: 120, groundDamage: 20, attackType: "ground", range: 130, attackInterval: 600, speed: 60, requires: "hydraliskDen", desc: "隐形对地刺蛇"
  },
  {
    id: "queen", name: "皇后", kind: "unit", race: "zerg", tex: "u_queen", minerals: 100, vespene: 100, supply: 2, buildTime: 5000,
    hp: 120, groundDamage: 10, airDamage: 10, attackType: "both", range: 120, attackInterval: 600, speed: 90, air: true, requires: "queenNest", desc: "虫族法术单位"
  },
  {
    id: "defiler", name: "蝎子", kind: "unit", race: "zerg", tex: "u_defiler", minerals: 150, vespene: 150, supply: 3, buildTime: 6000,
    hp: 150, groundDamage: 0, attackType: "ground", range: 100, attackInterval: 1000, speed: 70, requires: "defilerMound", desc: "施法者（简化）"
  },
  {
    id: "mutalisk", name: "飞龙", kind: "unit", race: "zerg", tex: "u_mutalisk", minerals: 100, vespene: 100, supply: 2, buildTime: 5000,
    hp: 120, groundDamage: 9, airDamage: 9, attackType: "both", range: 110, attackInterval: 500, speed: 130, air: true, requires: "spire", desc: "弹射攻击飞龙"
  },
  {
    id: "guardian", name: "守护者", kind: "unit", race: "zerg", tex: "u_guardian", minerals: 150, vespene: 150, supply: 4, buildTime: 6000,
    hp: 150, groundDamage: 20, attackType: "ground", range: 150, attackInterval: 600, speed: 80, air: true, requires: "greaterSpire", desc: "对地大龙"
  },
  {
    id: "devourer", name: "吞噬者", kind: "unit", race: "zerg", tex: "u_devourer", minerals: 150, vespene: 150, supply: 4, buildTime: 6000,
    hp: 150, airDamage: 25, attackType: "air", range: 150, attackInterval: 600, speed: 80, air: true, requires: "greaterSpire", desc: "对空大龙"
  },
  {
    id: "ultralisk", name: "猛犸(雷兽)", kind: "unit", race: "zerg", tex: "u_ultralisk", minerals: 200, vespene: 200, supply: 6, buildTime: 7000,
    hp: 400, groundDamage: 20, attackType: "ground", range: 30, attackInterval: 500, speed: 70, requires: "ultraliskCavern", desc: "重型近战巨兽"
  },
  {
    id: "scourge", name: "自杀蚊(自爆)", kind: "unit", race: "zerg", tex: "u_scourge", minerals: 25, vespene: 75, supply: 1, buildTime: 3000,
    hp: 25, airDamage: 110, attackType: "air", range: 20, attackInterval: 1000, speed: 150, air: true, suicide: true, requires: "spire", desc: "对空自爆飞机（撞击爆炸 110）"
  }
];

/** 中立资源节点定义（不计入战斗单位） */
export const RESOURCE_DEFS: Record<string, Def> = {
  mineral: {
    id: "mineral", name: "水晶矿", kind: "unit", race: "zerg", tex: "mineral",
    minerals: 0, vespene: 0, supply: 0, buildTime: 0, hp: 1,
    isNeutral: true, size: 48, desc: "矿物资源",
  } as Def,
  vespene: {
    id: "vespene", name: "瓦斯气泉", kind: "unit", race: "zerg", tex: "vespene",
    minerals: 0, vespene: 0, supply: 0, buildTime: 0, hp: 1,
    isNeutral: true, size: 52, desc: "瓦斯资源",
  } as Def,
};

/** 可产出幼虫的建筑 id（仅虫族孵化场系；nexus 属神族不应挂虫族幼虫） */
const LARVA_PRODUCERS = new Set(["hatchery", "lair", "hive"]);

/** 机械单位 id（ghost 锁定 Lockdown 的合法目标；星际式——
 * terran 含 SCV 但步兵系 marine/firebat/medic/ghost 除外；
 * protoss 机械系（zealot/ht/dt/probe 有机体、archon 系灵能体除外）；
 * zerg 全有机体不标） */
const MECHANICAL_IDS = new Set([
  "scv", "vulture", "tank", "goliath", "dropship", "wraith", "valkyrie", "scienceVessel", "battlecruiser",
  "dragoon", "reaver", "shuttle", "scout", "carrier", "arbiter", "observer", "interceptor", "corsair",
]);

/** 运行时桥接：把数据上的字段（air/supply/kind）映射为 entities/Textures 期望的字段，并补充贴图尺寸。 */
function decorate(d: Def): Def {
  const isBuilding = d.kind === "building";
  const w = d.w ?? (isBuilding ? 48 : 26);
  const h = d.h ?? (isBuilding ? 48 : 26);
  return {
    ...d,
    isBuilding,
    mechanical: MECHANICAL_IDS.has(d.id),
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

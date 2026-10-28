import type { TerrainType } from "../terrain";
import type { Owner } from "../config";
import { isPlayable } from "../iso";

/**
 * Lost Temple 风格地图（抽象重制，仅取经典对称布局，不含官方素材）。
 *
 * 数据网格 128×128（见 src/iso.ts），有效格排成一条对角带
 * （u = gx+gy ∈ [64,194]，v = gx-gy ∈ [-32,32]），投影到屏幕后轮廓恰好是
 * 2112×2112 的正方形；带外（地图四角的大三角区）为 void 虚空。
 *
 * 地形特征（与 scripts/gen-map.mjs 的 generateTerrain() 保持一致，改图需同步两处）：
 * - 4 个出生区分布在对角带四角（屏幕四角），对应星际式 4 人地图。
 * - 中央 16×16 高地 plateau，被一条纵向 water 沟分割为左右两半，中间以 bridge 连接。
 * - 四条 ramp 从 plateau 四边通往外圈 low，对应扩张路线。
 * - 4 个矿群（对应四个出生区），每个含矿物 + 瓦斯——未被阵营占用的角落
 *   即天然扩张点（资源恒在，主基地才按对局分配）。
 *
 * 出生点分配（星际式）：本局阵营 = 玩家 + 前 N 个 AI（MenuScene 选敌 1~3），
 * buildBases() 把这些阵营随机洗到四个角落出生区上。
 */

const N = 128;

function generateTerrain(): TerrainType[][] {
  const t: TerrainType[][] = [];
  for (let y = 0; y < N; y++) {
    const row: TerrainType[] = [];
    for (let x = 0; x < N; x++) row.push(isPlayable(x, y) ? "low" : "void");
    t.push(row);
  }
  // 中央高地 plateau（16×16）
  for (let y = 56; y <= 71; y++)
    for (let x = 56; x <= 71; x++) t[y][x] = "high";
  // 纵向 water 沟（分割左右高地）
  for (let y = 56; y <= 71; y++) {
    t[y][63] = "water";
    t[y][64] = "water";
  }
  // 中央 bridge 连接左右高地
  for (let y = 60; y <= 67; y++) {
    t[y][63] = "bridge";
    t[y][64] = "bridge";
  }
  // 四条 ramp（plateau 边界外的过渡带）
  for (let x = 60; x <= 67; x++) {
    t[55][x] = "ramp";
    t[72][x] = "ramp";
  }
  for (let y = 60; y <= 67; y++) {
    t[y][55] = "ramp";
    t[y][72] = "ramp";
  }
  [[55, 55], [72, 55], [55, 72], [72, 72]].forEach(([y, x]) => {
    t[y][x] = "ramp";
  });
  return t;
}

export interface ResourceNode {
  kind: "mineral" | "vespene";
  gx: number;
  gy: number;
}

export interface BaseSpawn {
  gx: number;
  gy: number;
  owner: Owner;
  defId: string;
  corner: string;
  units?: { defId: string; dx: number; dy: number }[];
}

export interface LostTempleMap {
  terrain: TerrainType[][];
  resources: ResourceNode[];
}

/** 角落出生区（屏幕四角各一处）：主基地锚点 + 矿区/瓦斯坐标（全部在有效带内） */
export interface StartLocation {
  /** 屏幕方位名（左下/左上/右下/右上） */
  corner: string;
  /** 主基地格坐标 */
  gx: number;
  gy: number;
  /** 矿物簇锚点（mineralCluster 起点） */
  mx: number;
  my: number;
  /** 瓦斯气泉坐标 */
  vx: number;
  vy: number;
}

/** 四个角落出生区（地形恒为 low，矿区/瓦斯恒在 → 空角即扩张点） */
export const START_LOCATIONS: StartLocation[] = [
  { corner: "左下", gx: 78, gy: 106, mx: 76, my: 103, vx: 74, vy: 104 },
  { corner: "左上", gx: 22, gy: 50, mx: 24, my: 48, vx: 24, vy: 46 },
  { corner: "右下", gx: 106, gy: 78, mx: 104, my: 76, vx: 104, vy: 74 },
  { corner: "右上", gx: 50, gy: 22, mx: 48, my: 24, vx: 48, vy: 26 },
];

/** 各阵营开局模板（主建筑 + 缩进随从单位；种族决定 AI 经济路径）。
 * 玩家恒人族（本项目 HUD/面板以人族为主体）；AI 三族齐备：
 * ai1 虫族 / ai2 神族 / ai3 人族——分配到哪个角落由 buildBases 随机决定。 */
const FACTION_STARTS: Record<string, BaseSpawn> = {
  player: {
    gx: 0,
    gy: 0,
    owner: "player",
    defId: "cc",
    units: [
      { defId: "scv", dx: -1, dy: 1 },
      { defId: "scv", dx: 1, dy: 1 },
      { defId: "scv", dx: 2, dy: 0 },
      // 机枪兵放主建筑占地外（cc 占地 2×2，|dx|>=2 才在格内之外），避免开局站上建筑
      { defId: "marine", dx: -2, dy: 1 },
      { defId: "marine", dx: 2, dy: 1 },
    ],
  },
  ai1: {
    gx: 0,
    gy: 0,
    owner: "ai1",
    defId: "hatchery",
    // 幼虫由 hatchery 的 attachLarvae 自动附着生成，无需在此列出
    units: [
      { defId: "drone", dx: -1, dy: 1 },
      { defId: "drone", dx: 1, dy: 1 },
      { defId: "drone", dx: 0, dy: 2 },
      { defId: "zergling", dx: -1, dy: -1 },
      { defId: "zergling", dx: 1, dy: -1 },
    ],
  },
  ai2: {
    gx: 0,
    gy: 0,
    owner: "ai2",
    defId: "nexus",
    units: [
      { defId: "pylon", dx: 1, dy: 0 },
      { defId: "probe", dx: -1, dy: 1 },
      { defId: "probe", dx: 0, dy: 2 },
      { defId: "zealot", dx: -1, dy: -1 },
      { defId: "dragoon", dx: 1, dy: -1 },
    ],
  },
  ai3: {
    gx: 0,
    gy: 0,
    owner: "ai3",
    defId: "cc",
    units: [
      { defId: "scv", dx: -1, dy: 1 },
      { defId: "scv", dx: 1, dy: 1 },
      { defId: "scv", dx: 2, dy: 0 },
      // 同上：机枪兵放主建筑占地外
      { defId: "marine", dx: -2, dy: 1 },
      { defId: "marine", dx: 2, dy: 1 },
    ],
  },
};

/** 本局出场阵营（玩家 + 前 enemyCount 个 AI）；敌人上限 3 → 最多 4 家 */
export function factionsFor(enemyCount: number): string[] {
  const n = Math.min(3, Math.max(1, Math.trunc(enemyCount)));
  return ["player", "ai1", "ai2", "ai3"].slice(0, 1 + n);
}

/**
 * 按敌人数量生成一局出生点分配：出场阵营随机洗到四个角落。
 * Fisher-Yates 洗牌 START_LOCATIONS 副本（每局独立随机，可重开局重分配）。
 */
export function buildBases(enemyCount: number): BaseSpawn[] {
  const slots = [...START_LOCATIONS];
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return factionsFor(enemyCount).map((owner) => {
    const slot = slots.pop()!;
    const tpl = FACTION_STARTS[owner];
    return { ...tpl, gx: slot.gx, gy: slot.gy, corner: slot.corner };
  });
}

function mineralCluster(gx: number, gy: number): ResourceNode[] {
  return [
    { kind: "mineral", gx, gy },
    { kind: "mineral", gx: gx + 1, gy },
    { kind: "mineral", gx, gy: gy + 1 },
  ];
}

function build(): LostTempleMap {
  const terrain = generateTerrain();
  const resources: ResourceNode[] = [];
  // 四个角落矿群（与 START_LOCATIONS 一一对应；空角 = 天然扩张点）
  for (const s of START_LOCATIONS) {
    resources.push(...mineralCluster(s.mx, s.my));
    resources.push({ kind: "vespene", gx: s.vx, gy: s.vy });
  }
  return { terrain, resources };
}

let cached: LostTempleMap | null = null;

export function getLostTemple(): LostTempleMap {
  if (!cached) cached = build();
  return cached;
}

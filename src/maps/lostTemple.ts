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
 * - 3 个出生区沿对角带分布（左下/左上/右下）。
 * - 中央 16×16 高地 plateau，被一条纵向 water 沟分割为左右两半，中间以 bridge 连接。
 * - 四条 ramp 从 plateau 四边通往外圈 low，对应扩张路线。
 * - 3 个矿群（对应三个出生点），每个含矿物 + 瓦斯。
 *
 * 出生点：3 阵营（当前为框选逻辑测试配置，刻意精简实体数量）。
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
  units?: { defId: string; dx: number; dy: number }[];
}

export interface LostTempleMap {
  terrain: TerrainType[][];
  resources: ResourceNode[];
  bases: BaseSpawn[];
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
  const mineralSpots: [number, number, [number, number]][] = [
    // [矿物簇锚点 gx, gy, 瓦斯 [gx, gy]]（全部位于对角带有效区内）
    // 3 个出生点矿区（与 bases 一一对应）
    [76, 103, [74, 104]], // 玩家：左下角
    [24, 48, [24, 46]], // ai1：左上角（虫族）
    [104, 76, [104, 74]], // ai2：右下角（神族）
  ];
  mineralSpots.forEach(([cx, cy, v]) => {
    resources.push(...mineralCluster(cx, cy));
    resources.push({ kind: "vespene", gx: v[0], gy: v[1] });
  });

  const bases: BaseSpawn[] = [
    // 玩家：屏幕左下角（人族，自行控制）
    {
      gx: 78,
      gy: 106,
      owner: "player",
      defId: "cc",
      units: [
        { defId: "scv", dx: -1, dy: 1 },
        { defId: "scv", dx: 1, dy: 1 },
        { defId: "scv", dx: 2, dy: 0 },
        { defId: "marine", dx: -1, dy: -1 },
        { defId: "marine", dx: 1, dy: -1 },
      ],
    },
    // ai1：屏幕左上角（虫族，AI，不可框选）
    {
      gx: 22,
      gy: 50,
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
    // ai2：屏幕右下角（神族，AI，不可框选）
    {
      gx: 106,
      gy: 78,
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
  ];

  return { terrain, resources, bases };
}

let cached: LostTempleMap | null = null;

export function getLostTemple(): LostTempleMap {
  if (!cached) cached = build();
  return cached;
}

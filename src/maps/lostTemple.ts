import type { TerrainType } from "../terrain";
import type { Owner } from "../config";

/**
 * Lost Temple 风格的 32×32 地图（抽象重制，仅取经典对称布局，不含官方素材）。
 *
 * 地形特征：
 * - 四角 + 四边中点共 8 个对称出生区（low）。
 * - 中央一大片高地 plateau，被一条纵向 water 沟分割为左右两半，中间以 bridge 连接。
 * - 四条 ramp 从 plateau 四边通往外圈 low，对应四个边中点的扩张路线。
 * - 10 个矿群（4 角主矿 + 2 中央扩张 + 4 边中点扩张），每个含矿物 + 瓦斯。
 *
 * 出生点：8 阵营 FFA（自由混战）。玩家占西南角；其余 7 个对称位置（3 角 + 4 边中点）
 * 均为独立 AI 阵营，彼此互不友好，会互相索敌作战。
 */

const N = 32;

function generateTerrain(): TerrainType[][] {
  const t: TerrainType[][] = [];
  for (let y = 0; y < N; y++) {
    const row: TerrainType[] = [];
    for (let x = 0; x < N; x++) row.push("low");
    t.push(row);
  }
  // 中央高地 plateau
  for (let y = 12; y <= 19; y++)
    for (let x = 12; x <= 19; x++) t[y][x] = "high";
  // 纵向 water 沟（分割左右高地）
  for (let y = 12; y <= 19; y++) {
    t[y][15] = "water";
    t[y][16] = "water";
  }
  // 中央 bridge 连接左右高地
  for (let y = 14; y <= 17; y++) {
    t[y][15] = "bridge";
    t[y][16] = "bridge";
  }
  // 四条 ramp（plateau 边界外的过渡带）
  for (let x = 14; x <= 17; x++) {
    t[11][x] = "ramp";
    t[20][x] = "ramp";
  }
  for (let y = 14; y <= 17; y++) {
    t[y][11] = "ramp";
    t[y][20] = "ramp";
  }
  [[11, 11], [20, 11], [11, 20], [20, 20]].forEach(([y, x]) => {
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
    // [centerX, centerY, vespeneOffset]
    [3, 4, [5, 4]],
    [28, 4, [26, 4]],
    [3, 27, [5, 27]],
    [28, 27, [26, 27]],
    [15, 2, [17, 2]],
    [15, 29, [17, 29]],
    [2, 15, [2, 17]],
    [29, 15, [29, 17]],
    [13, 15, [14, 16]],
    [18, 15, [17, 16]],
  ];
  mineralSpots.forEach(([cx, cy, v]) => {
    resources.push(...mineralCluster(cx, cy));
    resources.push({ kind: "vespene", gx: v[0], gy: v[1] });
  });

  const bases: BaseSpawn[] = [
    // 玩家：西南角（虫族）
    {
      gx: 3,
      gy: 3,
      owner: "player",
      defId: "hatchery",
      // 工蜂铺开到基地外围，避免与幼虫、建筑重叠成一团（否则点选时难以区分）。
      // 幼虫由 hatchery 的 canProduceLarva（attachLarvae）自动附着生成，无需在此重复列出。
      units: [
        { defId: "drone", dx: 2, dy: 1 },
        { defId: "drone", dx: 1, dy: 2 },
        { defId: "drone", dx: -1, dy: 2 },
      ],
    },
    // ai1：东北角（人族）
    {
      gx: 28,
      gy: 28,
      owner: "ai1",
      defId: "cc",
      units: [
        { defId: "scv", dx: -1, dy: -1 },
        { defId: "scv", dx: 1, dy: -1 },
        { defId: "marine", dx: -1, dy: 1 },
      ],
    },
    // ai2：西北角（神族）
    {
      gx: 3,
      gy: 28,
      owner: "ai2",
      defId: "nexus",
      units: [
        { defId: "pylon", dx: 1, dy: 0 },
        { defId: "zealot", dx: -1, dy: -1 },
        { defId: "dragoon", dx: 1, dy: -1 },
      ],
    },
    // ai3：东南角（虫族）
    {
      gx: 28,
      gy: 3,
      owner: "ai3",
      defId: "hatchery",
      units: [
        { defId: "drone", dx: -1, dy: 1 },
        { defId: "zergling", dx: -1, dy: -1 },
      ],
    },
    // ai4：上边中点（人族）
    {
      gx: 15,
      gy: 6,
      owner: "ai4",
      defId: "cc",
      units: [
        { defId: "scv", dx: -1, dy: 1 },
        { defId: "marine", dx: 1, dy: 1 },
      ],
    },
    // ai5：下边中点（神族）
    {
      gx: 15,
      gy: 26,
      owner: "ai5",
      defId: "nexus",
      units: [
        { defId: "pylon", dx: 1, dy: 0 },
        { defId: "zealot", dx: -1, dy: -1 },
      ],
    },
    // ai6：左边中点（虫族）
    {
      gx: 6,
      gy: 15,
      owner: "ai6",
      defId: "hatchery",
      units: [
        { defId: "drone", dx: 1, dy: 1 },
        { defId: "zergling", dx: 1, dy: -1 },
      ],
    },
    // ai7：右边中点（人族）
    {
      gx: 26,
      gy: 15,
      owner: "ai7",
      defId: "cc",
      units: [
        { defId: "scv", dx: -1, dy: 1 },
        { defId: "marine", dx: 1, dy: 1 },
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

/**
 * 地形类型。等距下用“高度级”表现高低差：
 * - low    普通地面（0 级）
 * - high   高地（1 级）
 * - ramp   坡道（0.5 级，连接 low<->high）
 * - water  水/沟壑（0 级，不可通行）
 * - bridge 桥面（1 级，跨在 water 上，连接左右高台）
 *
 * 地形网格不再由本模块绘制（渲染交给 Phaser Tilemap + Tiled），
 * 这里只负责：类型/高度查询，以及 Tiled 瓦片 gid ↔ 地形的映射。
 */
export type TerrainType = "low" | "high" | "ramp" | "water" | "bridge";

/** 各地形高度（级），用于 A* 代价与悬崖判定 */
export const HEIGHT: Record<TerrainType, number> = {
  low: 0,
  high: 1,
  ramp: 0.5,
  water: 0,
  bridge: 1,
};

/**
 * Tiled 瓦片 gid ↔ 地形类型，必须与 public/maps/lost-temple.tmj 里
 * tileset 的格子顺序保持一致：第 1 格=low, 2=high, 3=ramp, 4=water, 5=bridge。
 * 若你用 Tiled 重新绘制地图并换成自己的 tileset，记得保持这个顺序（或同步修改这里）。
 */
export const TERRAIN_GID: Record<TerrainType, number> = {
  low: 1,
  high: 2,
  ramp: 3,
  water: 4,
  bridge: 5,
};

export const GID_TERRAIN: Record<number, TerrainType> = {
  1: "low",
  2: "high",
  3: "ramp",
  4: "water",
  5: "bridge",
};

/** 当前关卡的地形二维数组（[gy][gx]），由 GameScene 从 Tiled 地图反推后写入 */
let currentTerrain: TerrainType[][] | null = null;

export function setTerrain(t: TerrainType[][]) {
  currentTerrain = t;
}

export function getTerrain(): TerrainType[][] | null {
  return currentTerrain;
}

/** 取某格地形高度（级），越界按 low 处理 */
export function heightAt(gx: number, gy: number): number {
  if (!currentTerrain) return 0;
  const x = Math.floor(gx);
  const y = Math.floor(gy);
  if (y < 0 || y >= currentTerrain.length) return 0;
  const row = currentTerrain[y];
  if (x < 0 || x >= row.length) return 0;
  return HEIGHT[row[x]];
}

/** 取某格地形类型 */
export function typeAt(gx: number, gy: number): TerrainType {
  if (!currentTerrain) return "low";
  const x = Math.floor(gx);
  const y = Math.floor(gy);
  if (y < 0 || y >= currentTerrain.length) return "low";
  const row = currentTerrain[y];
  if (x < 0 || x >= row.length) return "low";
  return row[x];
}

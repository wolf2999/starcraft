import { MAP_COLS, MAP_ROWS } from "./iso";
import { typeAt, heightAt, TerrainType } from "./terrain";

/**
 * 基于地形代价的 A* 寻路（网格 = 地图格子）。
 *
 * 设计目标：让地面单位“真正绕开”水面与高地。
 * - water：不可通行（代价 Infinity）。
 * - high（高地）：可通行但代价更高，鼓励绕行。
 * - low↔high 直接跨越（高度差 > 0.6 级，即跨越悬崖）被禁止，
 *   单位必须借助 ramp，从而在等距地图上自然绕过悬崖 / 水面。
 * - bridge：正常通行（跨水沟的桥）。
 */

// 各地形基础通行代价：越高代表越“难走”，A* 会优先选择低代价路线
const BASE_COST: Record<TerrainType, number> = {
  low: 1,
  high: 2.2,
  ramp: 1.6,
  bridge: 1,
  water: Infinity,
};

export interface PathCell {
  x: number;
  y: number;
}

function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < MAP_COLS && y < MAP_ROWS;
}

function passable(x: number, y: number): boolean {
  return inBounds(x, y) && BASE_COST[typeAt(x, y)] !== Infinity;
}

function stepCost(x: number, y: number): number {
  return BASE_COST[typeAt(x, y)];
}

/** 低地↔高地直接跨越（高度差 > 0.6 级）视为悬崖，禁止直接通行，逼单位走 ramp */
function isCliff(ax: number, ay: number, bx: number, by: number): boolean {
  return Math.abs(heightAt(ax, ay) - heightAt(bx, by)) > 0.6;
}

/** 目标落在不可通行格（如水面）时，向外螺旋搜索最近可通行格 */
function nearestPassable(x: number, y: number, maxR = 8): PathCell | null {
  if (passable(x, y)) return { x, y };
  const seen = new Set<number>();
  const q: PathCell[] = [{ x, y }];
  seen.add(y * MAP_COLS + x);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (q.length) {
    const c = q.shift()!;
    if (passable(c.x, c.y)) return c;
    for (const [dx, dy] of dirs) {
      const nx = c.x + dx;
      const ny = c.y + dy;
      if (!inBounds(nx, ny)) continue;
      const k = ny * MAP_COLS + nx;
      if (seen.has(k)) continue;
      if (Math.abs(nx - x) + Math.abs(ny - y) > maxR) continue;
      seen.add(k);
      q.push({ x: nx, y: ny });
    }
  }
  return null;
}

/** 八方向 octile 启发式（最小单步代价为 1） */
function octile(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
}

/**
 * 求从世界坐标 (startWX,startWY) 到 (goalWX,goalWY) 的格子路径。
 * 返回值是“后续路点”列表（不含起点）；无路可走返回 null，起点即终点返回 []。
 */
export function findPath(
  startWX: number,
  startWY: number,
  goalWX: number,
  goalWY: number
): PathCell[] | null {
  const sx = Math.min(MAP_COLS - 1, Math.max(0, Math.floor(startWX)));
  const sy = Math.min(MAP_ROWS - 1, Math.max(0, Math.floor(startWY)));
  let gx = Math.min(MAP_COLS - 1, Math.max(0, Math.floor(goalWX)));
  let gy = Math.min(MAP_ROWS - 1, Math.max(0, Math.floor(goalWY)));

  // 目标可能落在水面等不可通行格 → 吸附到最近可通行格
  const goal = nearestPassable(gx, gy);
  if (!goal) return null;
  gx = goal.x;
  gy = goal.y;
  if (sx === gx && sy === gy) return [];

  const key = (x: number, y: number) => y * MAP_COLS + x;
  const g = new Map<number, number>();
  const came = new Map<number, number>();
  const open: { x: number; y: number; f: number }[] = [];
  const closed = new Set<number>();

  g.set(key(sx, sy), 0);
  open.push({ x: sx, y: sy, f: octile(sx, sy, gx, gy) });

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  while (open.length) {
    // 取 f 最小的节点（网格较小，线性扫描即可）
    let bi = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bi].f) bi = i;
    }
    const cur = open.splice(bi, 1)[0];
    const ck = key(cur.x, cur.y);
    if (cur.x === gx && cur.y === gy) return reconstruct(came, ck);
    if (closed.has(ck)) continue;
    closed.add(ck);

    const cg = g.get(ck)!;
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!inBounds(nx, ny)) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      if (!passable(nx, ny)) continue;
      // 悬崖拦截：低地↔高地不可直接跨越
      if (isCliff(cur.x, cur.y, nx, ny)) continue;
      // 对角移动禁止贴着不可通行格切角（避免穿过水角）
      if (dx !== 0 && dy !== 0) {
        if (!passable(cur.x + dx, cur.y) || !passable(cur.x, cur.y + dy)) continue;
      }
      const step = dx !== 0 && dy !== 0 ? Math.SQRT2 : 1;
      const tentative = cg + step * stepCost(nx, ny);
      if (!g.has(nk) || tentative < g.get(nk)!) {
        g.set(nk, tentative);
        came.set(nk, ck);
        open.push({ x: nx, y: ny, f: tentative + octile(nx, ny, gx, gy) });
      }
    }
  }
  return null;
}

function reconstruct(came: Map<number, number>, goalKey: number): PathCell[] {
  const path: PathCell[] = [];
  let k: number | undefined = goalKey;
  while (k !== undefined) {
    path.push({ x: k % MAP_COLS, y: Math.floor(k / MAP_COLS) });
    k = came.get(k);
  }
  path.reverse();
  path.shift(); // 去掉起点自身，只保留后续路点
  return path;
}

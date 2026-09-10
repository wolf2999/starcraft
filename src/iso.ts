/**
 * 等距投影（2:1 菱形）坐标转换层。
 *
 * 设计要点：
 * - 世界坐标 (wx, wy) 是“格坐标”（浮点数，单位为格），笛卡尔空间，用于战斗/索敌/移动/框选判定。
 * - 屏幕坐标 (sx, sy) 是像素坐标，渲染时由世界坐标投影得到。
 * - 所有游戏逻辑只用世界坐标；只在渲染层做投影，保证战斗系统完全不必改写。
 *
 * 投影公式（2:1 等距）：
 *   sx = ORIGIN_X + (wx - wy) * HALF_W
 *   sy = ORIGIN_Y + (wx + wy) * HALF_H - h * ELEV
 * 反投影：
 *   a = (sx - ORIGIN_X) / HALF_W
 *   b = (sy - ORIGIN_Y) / HALF_H
 *   wx = (a + b) / 2
 *   wy = (b - a) / 2
 *
 * 屏幕正方形轮廓：
 * 等距投影下，任何“世界轴对齐矩形”都会投成 2:1 菱形。要让屏幕上的地图轮廓
 * 呈正方形，有效格子必须排成一条对角带（在 u=wx+wy / v=wx-wy 坐标系里是矩形）：
 *   u ∈ [U_MIN, U_MAX]、v ∈ [V_MIN, V_MAX]，且 U 跨度 = 2 × V 跨度。
 * 带外格子为 void（虚空，见 terrain.ts）：不渲染、不可通行——地图四角的大片
 * 三角区即虚空。此时地图屏幕包围盒（含瓦片半宽）恰为正方形
 * MAP_W × MAP_H = 2048 × 2080，相机边界直接贴住它（出血位 0），拖动/缩放永不露黑边。
 */

export const TILE_W = 64; // 菱形 tile 宽（屏幕像素）
export const TILE_H = 32; // 菱形 tile 高（屏幕像素）
export const HALF_W = TILE_W / 2;
export const HALF_H = TILE_H / 2;

/** 每级地形高度在屏幕上抬升的像素数（半菱形高，刚好像一级“台阶”） */
export const ELEV = HALF_H;

/** tileset 单帧画布高度：顶面菱形 (TILE_H) + 侧面高度 (ELEV) + 余量 (ELEV) */
export const FRAME_H = TILE_H + ELEV * 2;

/** 数据网格尺寸（格）。有效区只占其中一条对角带，其余为 void 虚空 */
export const MAP_COLS = 128;
export const MAP_ROWS = 128;

/** 有效区范围（u = wx+wy，v = wx-wy）；U 跨度 = 2 × V 跨度 ⇒ 屏幕轮廓为正方形 */
export const U_MIN = 64;
export const U_MAX = 194;
export const V_MIN = -32;
export const V_MAX = 32;

/** 格子是否在有效区（对角带）内：带外为 void 虚空 */
export function isPlayable(gx: number, gy: number): boolean {
  const u = gx + gy;
  const v = gx - gy;
  return u >= U_MIN && u <= U_MAX && v >= V_MIN && v <= V_MAX;
}

/**
 * 地图屏幕包围盒（像素）= 有效带边界格中心的范围（“锯齿谷线”矩形）。
 *
 * 等距菱形网格沿 45° 方向（u/v = 常数）的边界天然是锯齿形。渲染用格中心
 * worldToScreen(x+0.5, y+0.5)，比整数格坐标整体偏移 (0, HALF_H)，因此：
 * - 顶行（u=U_MIN）菱形中心在 sy = HALF_H，锯齿在 [0, HALF_H] 间起伏，
 *   谷线 sy = HALF_H ⇒ 完整覆盖从 sy ≥ HALF_H 开始；
 * - 左列（v=V_MIN）菱形中心在 sx = 0，锯齿在 [-HALF_W, 0]，谷线 sx = 0；
 * - 右列谷线 sx = MAP_W，底行谷线 sy = MAP_TOP + MAP_H。
 * 相机边界取谷线矩形：锯齿带完全在边界之外，视口永不越入 ⇒ 永不露黑边。
 * MAP_W = V跨度*HALF_W = 2048；MAP_H = U跨度*HALF_H = 2080（近似正方形）。
 */
export const MAP_LEFT = 0;
export const MAP_TOP = HALF_H; // 16：顶行锯齿谷线（渲染中心含 +0.5 偏移）
export const MAP_W = (V_MAX - V_MIN) * HALF_W; // 2048
export const MAP_H = (U_MAX - U_MIN) * HALF_H; // 2080

/**
 * 出血位：地图轮廓（谷线矩形）即相机边界，无需额外出血（语义占位，恒为 0）。
 */
export const MAP_BLEED_X = 0;
export const MAP_BLEED_Y = 0;

/**
 * 相机最小缩放（按实际视口动态计算）：
 * 缩放后视口（viewW/zoom × viewH/zoom）不超出地图包围盒 ⇒ 永不露黑边。
 * RESIZE 模式下画布 = 浏览器窗口实际大小，必须用真实尺寸而非固定常量；
 * 窗口宽于地图（>2048px）时 minZoom 会 > 1，相机自动放大以撑满地图。
 */
export function minZoom(viewW: number, viewH: number): number {
  return Math.max(viewW / MAP_W, viewH / MAP_H);
}

/**
 * 地图原点（屏幕像素）：世界格 (wx, wy) 的投影基准。
 * ORIGIN_X = -V_MIN*HALF_W 使带左缘（v=V_MIN）的格中心落在 x=0；
 * ORIGIN_Y = -U_MIN*HALF_H 使带上缘（u=U_MIN）的格中心落在 y=0。
 */
export const ORIGIN_X = -V_MIN * HALF_W; // 1024
export const ORIGIN_Y = -U_MIN * HALF_H; // -1024

export interface WorldPoint {
  wx: number;
  wy: number;
}
export interface ScreenPoint {
  sx: number;
  sy: number;
}

/**
 * 世界格坐标 → 屏幕像素坐标（渲染用）。
 * h = 地形高度级（0 / 0.5 / 1），高地顶面按 h * ELEV 向屏幕上方抬升。
 * 拾取（screenToWorld）不含 h，与旧版行为一致。
 */
export function worldToScreen(wx: number, wy: number, h = 0): ScreenPoint {
  return {
    sx: ORIGIN_X + (wx - wy) * HALF_W,
    sy: ORIGIN_Y + (wx + wy) * HALF_H - h * ELEV,
  };
}

/** 屏幕像素坐标 → 世界格坐标（鼠标拾取用，忽略地形高度） */
export function screenToWorld(sx: number, sy: number): WorldPoint {
  const a = (sx - ORIGIN_X) / HALF_W;
  const b = (sy - ORIGIN_Y) / HALF_H;
  return {
    wx: (a + b) / 2,
    wy: (b - a) / 2,
  };
}

/**
 * 世界格坐标 AABB 投影成屏幕菱形的 4 个顶点（左上/右上/右下/左下格角），
 * 用于框选框绘制、建筑放置 ghost 等需要“格子轮廓”的场合。
 */
export function worldAABBToScreenDiamond(
  minWx: number,
  minWy: number,
  maxWx: number,
  maxWy: number
): ScreenPoint[] {
  return [
    worldToScreen(minWx, minWy),
    worldToScreen(maxWx, minWy),
    worldToScreen(maxWx, maxWy),
    worldToScreen(minWx, maxWy),
  ];
}

/** 在屏幕矩形（像素）内，判断世界点是否落入（反投影四角取世界 AABB 再判定）。 */
export function screenRectContainsWorld(
  rectX: number,
  rectY: number,
  rectW: number,
  rectH: number,
  wx: number,
  wy: number
): boolean {
  const p1 = screenToWorld(rectX, rectY);
  const p2 = screenToWorld(rectX + rectW, rectY);
  const p3 = screenToWorld(rectX + rectW, rectY + rectH);
  const p4 = screenToWorld(rectX, rectY + rectH);
  const minWx = Math.min(p1.wx, p2.wx, p3.wx, p4.wx);
  const maxWx = Math.max(p1.wx, p2.wx, p3.wx, p4.wx);
  const minWy = Math.min(p1.wy, p2.wy, p3.wy, p4.wy);
  const maxWy = Math.max(p1.wy, p2.wy, p3.wy, p4.wy);
  return wx >= minWx && wx <= maxWx && wy >= minWy && wy <= maxWy;
}

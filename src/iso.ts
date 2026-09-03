import { GAME_WIDTH, GAME_HEIGHT } from "./config";

/**
 * 等距投影（2:1 菱形）坐标转换层。
 *
 * 设计要点：
 * - 世界坐标 (wx, wy) 是“格坐标”（浮点数，单位为格），笛卡尔空间，用于战斗/索敌/移动/选框判定。
 * - 屏幕坐标 (sx, sy) 是像素坐标，渲染时由世界坐标投影得到。
 * - 所有游戏逻辑只用世界坐标；只在渲染层做投影，保证战斗系统完全不必改写。
 *
 * 投影公式（2:1 等距）：
 *   sx = ORIGIN_X + (wx - wy) * (TILE_W / 2)
 *   sy = ORIGIN_Y + (wx + wy) * (TILE_H / 2)
 * 反投影：
 *   wx = (sx - ORIGIN_X) / (TILE_W / 2) + (sy - ORIGIN_Y) / (TILE_H / 2) ... 由下式求解
 *   a = (sx - ORIGIN_X) / (TILE_W / 2)
 *   b = (sy - ORIGIN_Y) / (TILE_H / 2)
 *   wx = (a + b) / 2
 *   wy = (b - a) / 2
 */

export const TILE_W = 64; // 菱形 tile 宽（屏幕像素）
export const TILE_H = 32; // 菱形 tile 高（屏幕像素）
export const HALF_W = TILE_W / 2;
export const HALF_H = TILE_H / 2;

/** 地图在世界格中的尺寸（格） */
export const MAP_COLS = 20;
export const MAP_ROWS = 20;

/** 菱形地图整体像素尺寸 */
export const MAP_W = (MAP_COLS + MAP_ROWS) * HALF_W;
export const MAP_H = (MAP_COLS + MAP_ROWS) * HALF_H;

/**
 * 地图原点（屏幕像素）：让世界中心 [(MAP_COLS-1)/2, (MAP_ROWS-1)/2]
 * 投影到屏幕中心 (GAME_WIDTH/2, GAME_HEIGHT/2)。
 */
export const ORIGIN_X = GAME_WIDTH / 2;
export const ORIGIN_Y =
  GAME_HEIGHT / 2 - ((MAP_COLS + MAP_ROWS - 2) / 2) * HALF_H;

export interface WorldPoint {
  wx: number;
  wy: number;
}
export interface ScreenPoint {
  sx: number;
  sy: number;
}

/** 世界格坐标 → 屏幕像素坐标（渲染用） */
export function worldToScreen(wx: number, wy: number): ScreenPoint {
  return {
    sx: ORIGIN_X + (wx - wy) * HALF_W,
    sy: ORIGIN_Y + (wx + wy) * HALF_H,
  };
}

/** 屏幕像素坐标 → 世界格坐标（鼠标拾取用） */
export function screenToWorld(sx: number, sy: number): WorldPoint {
  const a = (sx - ORIGIN_X) / HALF_W;
  const b = (sy - ORIGIN_Y) / HALF_H;
  return {
    wx: (a + b) / 2,
    wy: (b - a) / 2,
  };
}

/**
 * 把世界格坐标的 AABB（轴对齐包围盒：minWx,minWy,maxWx,maxWy）
 * 投影成屏幕上的 4 个菱形顶点（用于绘制选中高亮、placement ghost 等）。
 * 注意：等距下世界 AABB 投影后是旋转 45° 的菱形，需用 4 角顶点绘制。
 */
export function worldAABBToScreenDiamond(
  minWx: number,
  minWy: number,
  maxWx: number,
  maxWy: number
): ScreenPoint[] {
  const corners = [
    worldToScreen(minWx, minWy),
    worldToScreen(maxWx, minWy),
    worldToScreen(maxWx, maxWy),
    worldToScreen(minWx, maxWy),
  ];
  return corners;
}

/** 在屏幕矩形（像素）内，判断世界点是否落入。先把屏幕矩形反投影成世界 AABB 再判定。 */
export function screenRectContainsWorld(
  rectX: number,
  rectY: number,
  rectW: number,
  rectH: number,
  wx: number,
  wy: number
): boolean {
  // 反投影矩形四角到世界坐标，取 min/max 形成世界 AABB
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

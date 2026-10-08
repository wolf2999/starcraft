/**
 * 动作序列帧元数据 —— 由 scripts/gen-ase.mjs 生成（勿手改，重跑脚本覆盖）。
 * 每个种族实体一张横条 spritesheet：public/textures/<race>/<tex>.png，
 * 帧按 cols 列行优先排布（第 i 帧位于 [i%cols 行内列, floor(i/cols) 行]）。
 * 游戏侧据此加载 spritesheet（GameScene.preload）并注册动作动画（GameScene.registerAnims）。
 */
import animDefsJson from "./animDefs.json";

/** 单个动作的帧区间与播放参数 */
export interface AnimAction {
  /** 起始帧索引（含） */
  from: number;
  /** 结束帧索引（含） */
  to: number;
  /** 帧率（帧/秒） */
  fps: number;
  /** 循环次数：-1 无限循环（idle/walk/build）；0 播一次（attack/death） */
  repeat: number;
}

/** 单个实体的序列帧信息 */
export interface AnimDef {
  race: "terran" | "protoss" | "zerg";
  kind: "unit" | "building";
  /** 单帧宽高（= ASE 画布：单位 80×60 / 建筑 272×272） */
  frameWidth: number;
  frameHeight: number;
  /** 横条网格列数（行优先切帧） */
  cols: number;
  /** 总帧数 */
  frameCount: number;
  /** 动作名 → 帧区间（单位 idle/walk/attack/death；建筑 idle/build/death） */
  actions: Record<string, AnimAction>;
}

export const ANIM_DEFS = animDefsJson as unknown as Record<string, AnimDef>;

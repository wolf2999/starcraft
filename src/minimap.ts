import * as Phaser from "phaser";
import {
  MAP_W,
  MAP_H,
  ORIGIN_X,
  ORIGIN_Y,
  HALF_W,
  HALF_H,
  worldToScreen,
} from "./iso";
import { typeAt, TerrainType } from "./terrain";
import { ownerIsAI, Owner } from "./config";

/**
 * 右上角小地图（星际风格）：
 * - 底图：把地图屏幕投影（MAP_W×MAP_H 方形轮廓）等比缩小，逐像素反投影回
 *   格子取地形颜色，一次性画入离屏 canvas 缓存（void 虚空呈深色底）；
 * - 每帧刷新：底图 + 实体点（我方绿 / 敌方红 / 资源黄）+ 相机视野白框；
 * - 点击 / 按住拖动：小地图坐标反算回世界屏幕坐标，相机居中跳转（受
 *   setBounds 约束，不会越出地图）。
 */

/** 小地图缩放系数：地图屏幕投影宽 2048 → 160px */
const MM_SCALE = 160 / MAP_W;
const MM_W = Math.round(MAP_W * MM_SCALE);
const MM_H = Math.round(MAP_H * MM_SCALE);

/** 各地形底图颜色（RGB）；void 虚空 = 近黑底色 */
const TERRAIN_COLOR: Record<TerrainType, [number, number, number]> = {
  low: [40, 82, 40],
  high: [72, 116, 56],
  ramp: [88, 102, 68],
  water: [28, 56, 94],
  bridge: [104, 88, 56],
  void: [8, 8, 14],
};

/** 小地图刷新所需的最小实体结构（Entity 天然满足） */
export interface MinimapEntity {
  x: number;
  y: number;
  owner: Owner;
  alive: boolean;
  def: { isNeutral?: boolean; isBuilding?: boolean };
}

function entityColor(e: MinimapEntity): string {
  if (e.def.isNeutral) return "#ffd24a"; // 资源（矿/气）
  return ownerIsAI(e.owner) ? "#ff5252" : "#4ade4a";
}

export class Minimap {
  private cam: Phaser.Cameras.Scene2D.Camera;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private terrainCanvas: HTMLCanvasElement;
  private dragging = false;

  constructor(
    cam: Phaser.Cameras.Scene2D.Camera,
    onJump: (sx: number, sy: number) => void
  ) {
    this.cam = cam;

    // 容器：index.html 里预置 #minimap；缺失则兜底创建挂到 body
    let host = document.getElementById("minimap");
    if (!host) {
      host = document.createElement("div");
      host.id = "minimap";
      document.body.appendChild(host);
    }

    this.canvas = document.createElement("canvas");
    this.canvas.width = MM_W;
    this.canvas.height = MM_H;
    host.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;

    this.terrainCanvas = document.createElement("canvas");
    this.terrainCanvas.width = MM_W;
    this.terrainCanvas.height = MM_H;
    this.buildTerrain();

    // 点击 / 按住拖动 → 跳转相机（pointer capture 让按住后移出画布也能继续拖）
    this.canvas.addEventListener("pointerdown", (ev) => {
      this.dragging = true;
      this.canvas.setPointerCapture(ev.pointerId);
      this.jump(ev, onJump);
    });
    this.canvas.addEventListener("pointermove", (ev) => {
      if (this.dragging) this.jump(ev, onJump);
    });
    this.canvas.addEventListener("pointerup", () => (this.dragging = false));
    this.canvas.addEventListener("pointerleave", () => (this.dragging = false));
  }

  /** 小地图像素 → 世界屏幕坐标 → 相机居中 */
  private jump(
    ev: PointerEvent,
    onJump: (sx: number, sy: number) => void
  ) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;
    onJump(mx / MM_SCALE, my / MM_SCALE);
  }

  /** 地形底图：逐像素反投影（与 screenToWorld 同公式）取格子地形颜色 */
  private buildTerrain() {
    const ctx = this.terrainCanvas.getContext("2d")!;
    const img = ctx.createImageData(MM_W, MM_H);
    for (let py = 0; py < MM_H; py++) {
      for (let px = 0; px < MM_W; px++) {
        // 小地图像素 → 世界屏幕坐标 → 反投影 → 格坐标
        const a = (px / MM_SCALE - ORIGIN_X) / HALF_W;
        const b = (py / MM_SCALE - ORIGIN_Y) / HALF_H;
        const gx = Math.floor((a + b) / 2);
        const gy = Math.floor((b - a) / 2);
        const [r, g, b2] = TERRAIN_COLOR[typeAt(gx, gy)];
        const i = (py * MM_W + px) * 4;
        img.data[i] = r;
        img.data[i + 1] = g;
        img.data[i + 2] = b2;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  /** 每帧刷新：底图 + 实体点 + 相机视野框 */
  refresh(entities: MinimapEntity[]) {
    const ctx = this.ctx;
    ctx.drawImage(this.terrainCanvas, 0, 0);

    for (const e of entities) {
      if (!e.alive) continue;
      const p = worldToScreen(e.x, e.y);
      const mx = p.sx * MM_SCALE;
      const my = p.sy * MM_SCALE;
      ctx.fillStyle = entityColor(e);
      // 建筑稍大，单位 2×2
      const s = e.def.isNeutral || e.def.isBuilding ? 3 : 2;
      ctx.fillRect(mx - s / 2, my - s / 2, s, s);
    }

    // 相机视野框（worldView = 当前可见世界矩形，含 zoom）
    const v = this.cam.worldView;
    ctx.strokeStyle = "#e8e8e8";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      v.x * MM_SCALE + 0.5,
      v.y * MM_SCALE + 0.5,
      Math.max(1, v.width * MM_SCALE),
      Math.max(1, v.height * MM_SCALE)
    );
  }
}

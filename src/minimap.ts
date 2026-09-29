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
 * 小地图（星际风格，渲染在 Phaser 内、屏幕层固定不随相机滚动）：
 * - 底图：把地图屏幕投影（MAP_W×MAP_H 方形轮廓）等比缩小，逐像素反投影回
 *   格子取地形颜色，一次性画入离屏 canvas 缓存（void 虚空呈深色底）；
 * - 每帧刷新：底图 + 实体点（我方绿 / 敌方红 / 资源黄）+ 相机视野白框，
 *   画入 Phaser CanvasTexture 后 refresh() 上传 GPU；
 * - 点击 / 按住拖动：由 GameScene 统一转接（hit + jumpAt），像素反算回
 *   世界屏幕坐标后相机居中跳转（受边界钳制，不会越出地图）。
 */

/** 小地图缩放系数：地图屏幕投影宽 2048 → 160px */
const MM_SCALE = 160 / MAP_W;
const MM_W = Math.round(MAP_W * MM_SCALE);
const MM_H = Math.round(MAP_H * MM_SCALE);
/** 距窗口右/上边缘的留白 */
const MARGIN = 12;

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
  /** 左上角屏幕坐标（RESIZE 时 layout 重排） */
  x = 0;
  y = 0;
  readonly w = MM_W;
  readonly h = MM_H;

  private canvasTexture: Phaser.Textures.CanvasTexture;
  private ctx: CanvasRenderingContext2D;
  private terrainCanvas: HTMLCanvasElement;
  private image: Phaser.GameObjects.Image;
  private frame: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, private cam: Phaser.Cameras.Scene2D.Camera) {
    if (scene.textures.exists("minimap")) scene.textures.remove("minimap");
    const tex = scene.textures.createCanvas("minimap", MM_W, MM_H);
    if (!tex) throw new Error("minimap CanvasTexture 创建失败");
    this.canvasTexture = tex;
    this.ctx = tex.context;

    this.terrainCanvas = document.createElement("canvas");
    this.terrainCanvas.width = MM_W;
    this.terrainCanvas.height = MM_H;
    this.buildTerrain();

    this.image = scene.add
      .image(0, 0, "minimap")
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(5000);
    this.frame = scene.add.graphics().setScrollFactor(0).setDepth(5001);
    this.layout(scene.scale.gameSize.width, scene.scale.gameSize.height);
  }

  /** 屏幕像素是否落在小地图内（GameScene 用于拦截世界输入 + 触发跳转） */
  hit(px: number, py: number): boolean {
    return px >= this.x && px < this.x + MM_W && py >= this.y && py < this.y + MM_H;
  }

  /** 屏幕像素 → 小地图内部像素 → 世界屏幕坐标 → 相机居中 */
  jumpAt(px: number, py: number, onJump: (sx: number, sy: number) => void): void {
    const mx = px - this.x;
    const my = py - this.y;
    onJump(mx / MM_SCALE, my / MM_SCALE);
  }

  /** 窗口尺寸变化：右上角重排 + 边框重绘（gh 暂未用到：小地图固定贴顶） */
  layout(gw: number, _gh: number): void {
    this.x = gw - MM_W - MARGIN;
    this.y = MARGIN;
    this.image.setPosition(this.x, this.y);
    this.frame.clear();
    this.frame.lineStyle(1, 0x5a7a5a, 0.9);
    this.frame.strokeRect(this.x - 1.5, this.y - 1.5, MM_W + 3, MM_H + 3);
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

  /** 每帧刷新：底图 + 实体点 + 相机视野框，画完 refresh 上传 */
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
    this.canvasTexture.refresh();
  }
}

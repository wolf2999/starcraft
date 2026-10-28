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
import { ownerIsAI, Owner, FOG_EXPLORED_ALPHA } from "./config";
import { HUD_H } from "./ui/liquidHud";

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

/** 迷雾网格（GameScene 持有；0 未探索 / 1 已探索 / 2 可见，玩家视角） */
export interface FogGrid {
  data: Uint8Array;
  cols: number;
  rows: number;
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
  /** 迷雾层画布（与底图同尺寸的屏幕空间烘焙缓存；null = 未启用迷雾） */
  private fogCanvas: HTMLCanvasElement | null = null;
  private image: Phaser.GameObjects.Image;
  private frame: Phaser.GameObjects.Graphics;
  private scene: Phaser.Scene;
  /** 玩家的出生角落（屏幕方位名）。小地图固定放在其“对角”，
   * 确保无论随机到哪个角，都不会挡住自家基地（相机以玩家基地为中心）。 */
  private avoidCorner = "右下";

  constructor(scene: Phaser.Scene, private cam: Phaser.Cameras.Scene2D.Camera) {
    this.scene = scene;
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

  /** 设置需避让的角落（玩家出生角），小地图自动放到其屏幕对角 */
  setAvoidCorner(corner: string): void {
    this.avoidCorner = corner;
    this.layout(this.scene.scale.gameSize.width, this.scene.scale.gameSize.height);
  }

  /** 窗口尺寸变化：按避让角放到其“对角” + 边框重绘。
   * 屏幕四角锚点：左上(MARGIN,MARGIN) 右上(右,上) 左下(左,底上) 右下(右,底上)；
   * 玩家出生角 → 取对角，保证相机居中玩家基地时小地图不遮挡。 */
  layout(gw: number, gh: number): void {
    const right = gw - MM_W - MARGIN;
    const top = MARGIN;
    const bottom = gh - MM_H - HUD_H - MARGIN;
    const left = MARGIN;
    // 对角映射：左下↔右上、右下↔左上
    switch (this.avoidCorner) {
      case "左下":
        this.x = right; this.y = top; break;
      case "左上":
        this.x = right; this.y = bottom; break;
      case "右下":
        this.x = left; this.y = top; break;
      case "右上":
      default:
        this.x = left; this.y = bottom; break;
    }
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

  /** 迷雾层重绘（GameScene 迷雾 tick 时调用，非每帧）：把迷雾网格按等距反投影
   * 烘焙成与底图同尺寸的屏幕空间画布——未探索全黑、已探索按 FOG_EXPLORED_ALPHA
   * 暗化、可见透明；refresh 每帧仅 drawImage 该缓存，零逐像素开销。 */
  updateFog(fog: FogGrid) {
    if (!this.fogCanvas) {
      this.fogCanvas = document.createElement("canvas");
      this.fogCanvas.width = MM_W;
      this.fogCanvas.height = MM_H;
    }
    const ctx = this.fogCanvas.getContext("2d")!;
    const img = ctx.createImageData(MM_W, MM_H);
    const exploredAlpha = Math.round(255 * FOG_EXPLORED_ALPHA);
    for (let py = 0; py < MM_H; py++) {
      for (let px = 0; px < MM_W; px++) {
        // 小地图像素 → 世界屏幕坐标 → 反投影 → 格坐标（与 buildTerrain 同公式）
        const a = (px / MM_SCALE - ORIGIN_X) / HALF_W;
        const b = (py / MM_SCALE - ORIGIN_Y) / HALF_H;
        const gx = Math.floor((a + b) / 2);
        const gy = Math.floor((b - a) / 2);
        let alpha = 255; // 带外（void）/未探索
        if (gx >= 0 && gy >= 0 && gx < fog.cols && gy < fog.rows) {
          const st = fog.data[gy * fog.cols + gx];
          alpha = st === 2 ? 0 : st === 1 ? exploredAlpha : 255;
        }
        const i = (py * MM_W + px) * 4;
        img.data[i + 3] = alpha; // RGB 恒黑（ImageData 初始即为 0）
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  /** 每帧刷新：底图 + 迷雾层 + 实体点 + 相机视野框，画完 refresh 上传 */
  refresh(entities: MinimapEntity[], fog?: FogGrid) {
    const ctx = this.ctx;
    ctx.drawImage(this.terrainCanvas, 0, 0);
    if (this.fogCanvas) ctx.drawImage(this.fogCanvas, 0, 0);

    for (const e of entities) {
      if (!e.alive) continue;
      // 迷雾过滤：资源需已探索（≥1）、敌方需可见（=2）才画点；我方恒显示
      if (fog) {
        const gx = Math.floor(e.x);
        const gy = Math.floor(e.y);
        const st =
          gx >= 0 && gy >= 0 && gx < fog.cols && gy < fog.rows
            ? fog.data[gy * fog.cols + gx]
            : 0;
        if (e.def.isNeutral ? st < 1 : ownerIsAI(e.owner) && st < 2) continue;
      }
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

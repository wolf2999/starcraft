import * as Phaser from "phaser";
import { TILE_W, TILE_H } from "./iso";

/**
 * 删除旧纹理（重建前的清理）。
 * Phaser 的 textures.remove(key) 内部会先 get(key)，对不存在的 key 会打
 * "No texture found matching key" 警告——首次生成时所有 key 都不存在，
 * 因此必须先 exists() 判断，否则控制台被无害警告刷屏。
 */
function removeTex(scene: Phaser.Scene, key: string) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
}

/**
 * 程序化生成地面/资源/特效贴图。等距风格：地面为 2:1 菱形 tile。
 * 种族实体贴图（b_ 与 u_ 前缀）不在此生成——已改由 GameScene.preload 加载
 * gen-ase.mjs 导出的横条序列帧 spritesheet（动作动画见 src/animDefs.json）。
 */
export function generateAll(scene: Phaser.Scene) {
  makeTile(scene);
  makeMineral(scene);
  makeVespene(scene);
  makeLarva(scene);

  removeTex(scene, "rect");
  const rect = scene.textures.createCanvas("rect", 16, 16);
  if (rect) {
    const c = rect.getContext();
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, 16, 16);
    rect.refresh();
  }

  removeTex(scene, "drone");
  removeTex(scene, "creep");

  // 虫族菌毯（2:1 菱形，贴等距地面）
  const creep = scene.textures.createCanvas("creep", TILE_W, TILE_H);
  if (creep) {
    const cc = creep.getContext();
    cc.clearRect(0, 0, TILE_W, TILE_H);
    cc.fillStyle = "rgba(150, 60, 170, 0.55)";
    cc.beginPath();
    cc.moveTo(TILE_W / 2, 0);
    cc.lineTo(TILE_W, TILE_H / 2);
    cc.lineTo(TILE_W / 2, TILE_H);
    cc.lineTo(0, TILE_H / 2);
    cc.closePath();
    cc.fill();
    creep.refresh();
  }

  // 采集中的工蜂身上小方块（动画）
  const drone = scene.textures.createCanvas("drone", 8, 8);
  if (drone) {
    const dc = drone.getContext();
    dc.fillStyle = "#8cf0ff";
    dc.fillRect(0, 0, 8, 8);
    drone.refresh();
  }

  // 一些通用特效贴图
  makeShotDot(scene, "shot_red", "#ff5555");
  makeShotDot(scene, "shot_blue", "#66ccff");
  makeShotDot(scene, "shot_green", "#88ff66");
  makeShotDot(scene, "shot_orange", "#ffaa33");
  makeShotDot(scene, "shot_cyan", "#88ffee");
  makeShotDot(scene, "shot_white", "#ffffff");

  makeGlow(scene, "glow_red", "#ff5555");
  makeGlow(scene, "glow_blue", "#77ccff");
  makeGlow(scene, "glow_green", "#88ff66");
  makeGlow(scene, "glow_orange", "#ffaa33");
  makeGlow(scene, "glow_cyan", "#88ffee");
  makeGlow(scene, "glow_white", "#ffffff");
}

/** 菱形地面 tile（2:1 等距）。 */
function makeTile(scene: Phaser.Scene) {
  removeTex(scene, "tile_ground");
  const size = TILE_W;
  const h = TILE_H;
  const tex = scene.textures.createCanvas("tile_ground", size, h);
  if (!tex) return;
  const c = tex.getContext();
  c.clearRect(0, 0, size, h);
  // 菱形填充
  c.fillStyle = "#2f4633";
  c.beginPath();
  c.moveTo(size / 2, 0);
  c.lineTo(size, h / 2);
  c.lineTo(size / 2, h);
  c.lineTo(0, h / 2);
  c.closePath();
  c.fill();
  // 不描边、不分块，避免 tile 之间产生网格线
  tex.refresh();
}

function makeMineral(scene: Phaser.Scene) {
  removeTex(scene, "mineral");
  // 画布 = 显示尺寸(48×52) × 2（与 AI 出图规格一致，neutral 缩放 0.5 后即为显示尺寸）
  const tex = scene.textures.createCanvas("mineral", 96, 104);
  if (!tex) return;
  const c = tex.getContext();
  c.clearRect(0, 0, 96, 104);
  // 阴影
  c.fillStyle = "rgba(0,0,0,0.3)";
  c.beginPath();
  c.ellipse(48, 88, 43, 15, 0, 0, Math.PI * 2);
  c.fill();
  // 晶体簇
  const drawCrystal = (cx: number, cy: number, w: number, hh: number, col: string) => {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(cx, cy - hh);
    c.lineTo(cx + w / 2, cy);
    c.lineTo(cx, cy + hh * 0.4);
    c.lineTo(cx - w / 2, cy);
    c.closePath();
    c.fill();
    c.fillStyle = "rgba(255,255,255,0.35)";
    c.beginPath();
    c.moveTo(cx, cy - hh);
    c.lineTo(cx + w / 2, cy);
    c.lineTo(cx, cy);
    c.closePath();
    c.fill();
  };
  drawCrystal(48, 68, 43, 62, "#4fd0e0");
  drawCrystal(27, 78, 32, 47, "#3bb8c8");
  drawCrystal(69, 78, 32, 47, "#3bb8c8");
  tex.refresh();
}

function makeVespene(scene: Phaser.Scene) {
  removeTex(scene, "vespene");
  // 画布 = 显示尺寸(52×52) × 2（同上，neutral 缩放 0.5）
  const tex = scene.textures.createCanvas("vespene", 104, 104);
  if (!tex) return;
  const c = tex.getContext();
  c.clearRect(0, 0, 104, 104);
  c.fillStyle = "rgba(0,0,0,0.3)";
  c.beginPath();
  c.ellipse(52, 88, 42, 15, 0, 0, Math.PI * 2);
  c.fill();
  // 球体
  c.fillStyle = "#6b4f2a";
  c.beginPath();
  c.ellipse(52, 57, 34, 36, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#8a6a36";
  c.beginPath();
  c.ellipse(42, 47, 16, 18, 0, 0, Math.PI * 2);
  c.fill();
  // 绿色气体孔
  c.fillStyle = "#9bff6a";
  c.beginPath();
  c.arc(52, 36, 10, 0, Math.PI * 2);
  c.fill();
  tex.refresh();
}

function makeLarva(scene: Phaser.Scene) {
  removeTex(scene, "larva");
  const tex = scene.textures.createCanvas("larva", 14, 10);
  if (!tex) return;
  const c = tex.getContext();
  c.clearRect(0, 0, 14, 10);
  c.fillStyle = "#c9d36a";
  c.beginPath();
  c.ellipse(7, 6, 6, 3.5, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#fff";
  c.beginPath();
  c.arc(5, 5, 1.2, 0, Math.PI * 2);
  c.arc(9, 5, 1.2, 0, Math.PI * 2);
  c.fill();
  tex.refresh();
}

function makeShotDot(scene: Phaser.Scene, key: string, color: string) {
  removeTex(scene, key);
  const tex = scene.textures.createCanvas(key, 8, 8);
  if (!tex) return;
  const c = tex.getContext();
  c.fillStyle = color;
  c.beginPath();
  c.arc(4, 4, 3, 0, Math.PI * 2);
  c.fill();
  tex.refresh();
}

function makeGlow(scene: Phaser.Scene, key: string, color: string) {
  removeTex(scene, key);
  const tex = scene.textures.createCanvas(key, 32, 32);
  if (!tex) return;
  const c = tex.getContext();
  const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, 32, 32);
  tex.refresh();
}

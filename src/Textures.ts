import * as Phaser from "phaser";
import {
  PROTOSS_UNITS,
  PROTOSS_BUILDINGS,
  UNITS as TERRAN_UNITS,
  BUILDINGS as TERRAN_BUILDINGS,
  ZERG_UNITS,
  ZERG_BUILDINGS,
} from "./config";
import type { Def } from "./config";
import { TILE_W, TILE_H } from "./iso";

/** 程序化生成所有贴图，避免依赖外部美术资源。等距风格：地面为 2:1 菱形 tile。 */
export function generateAll(scene: Phaser.Scene) {
  makeTile(scene);
  makeMineral(scene);
  makeVespene(scene);
  makeLarva(scene);

  scene.textures.remove("rect");
  const rect = scene.textures.createCanvas("rect", 16, 16);
  if (rect) {
    const c = rect.getContext();
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, 16, 16);
    rect.refresh();
  }

  scene.textures.remove("drone");
  scene.textures.remove("creep");

  // 虫族菌毯（菱形）
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

  // 人族
  TERRAN_BUILDINGS.forEach((d) => terranBuilding(scene, d));
  TERRAN_UNITS.forEach((d) => terranUnit(scene, d));

  // 神族
  PROTOSS_BUILDINGS.forEach((d) => protossBuilding(scene, d));
  PROTOSS_UNITS.forEach((d) => protossUnit(scene, d));

  // 虫族
  ZERG_BUILDINGS.forEach((d) => zergBuilding(scene, d));
  ZERG_UNITS.forEach((d) => zergUnit(scene, d));

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
  scene.textures.remove("tile_ground");
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
  scene.textures.remove("mineral");
  const tex = scene.textures.createCanvas("mineral", 36, 40);
  if (!tex) return;
  const c = tex.getContext();
  c.clearRect(0, 0, 36, 40);
  // 阴影
  c.fillStyle = "rgba(0,0,0,0.3)";
  c.beginPath();
  c.ellipse(18, 34, 16, 6, 0, 0, Math.PI * 2);
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
  drawCrystal(18, 26, 16, 24, "#4fd0e0");
  drawCrystal(10, 30, 12, 18, "#3bb8c8");
  drawCrystal(26, 30, 12, 18, "#3bb8c8");
  tex.refresh();
}

function makeVespene(scene: Phaser.Scene) {
  scene.textures.remove("vespene");
  const tex = scene.textures.createCanvas("vespene", 40, 40);
  if (!tex) return;
  const c = tex.getContext();
  c.clearRect(0, 0, 40, 40);
  c.fillStyle = "rgba(0,0,0,0.3)";
  c.beginPath();
  c.ellipse(20, 34, 16, 6, 0, 0, Math.PI * 2);
  c.fill();
  // 球体
  c.fillStyle = "#6b4f2a";
  c.beginPath();
  c.ellipse(20, 22, 13, 14, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#8a6a36";
  c.beginPath();
  c.ellipse(16, 18, 6, 7, 0, 0, Math.PI * 2);
  c.fill();
  // 绿色气体孔
  c.fillStyle = "#9bff6a";
  c.beginPath();
  c.arc(20, 14, 4, 0, Math.PI * 2);
  c.fill();
  tex.refresh();
}

function makeLarva(scene: Phaser.Scene) {
  scene.textures.remove("larva");
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
  scene.textures.remove(key);
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
  scene.textures.remove(key);
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

/* ============ 人族：硬朗金属、直角箱体 + 等距脚底阴影 ============ */

function terranBuilding(scene: Phaser.Scene, d: Def) {
  const w = d.w ?? (d.kind === "building" ? 48 : 26);
  const h = d.h ?? (d.kind === "building" ? 48 : 26);
  scene.textures.remove(d.id);
  const tex = scene.textures.createCanvas(d.id, w, h);
  if (!tex) return;
  const c = tex.getContext();
  c.clearRect(0, 0, w, h);
  // 脚底阴影（贴合等距脚底）
  c.fillStyle = "rgba(0,0,0,0.28)";
  c.beginPath();
  c.ellipse(w / 2, h - 6, w / 2.4, h / 7, 0, 0, Math.PI * 2);
  c.fill();
  // 主体金属箱
  const bodyTop = h * 0.18;
  c.fillStyle = "#5a5f66";
  c.fillRect(w * 0.12, bodyTop, w * 0.76, h * 0.66);
  // 顶面高光
  c.fillStyle = "#7d838b";
  c.fillRect(w * 0.12, bodyTop, w * 0.76, h * 0.1);
  // 暗部
  c.fillStyle = "#3c4046";
  c.fillRect(w * 0.12, h * 0.74, w * 0.76, h * 0.1);
  // 结构线
  c.strokeStyle = "#2a2d31";
  c.lineWidth = 1;
  c.strokeRect(w * 0.12, bodyTop, w * 0.76, h * 0.66);
  // 细节：红蓝指示灯
  c.fillStyle = d.race === "terran" ? "#ffcf4d" : "#66ccff";
  c.beginPath();
  c.arc(w * 0.5, h * 0.5, 3, 0, Math.PI * 2);
  c.fill();
  // 顶部烟囱/塔
  c.fillStyle = "#4a4e54";
  c.fillRect(w * 0.42, bodyTop - h * 0.12, w * 0.16, h * 0.14);
  tex.refresh();
}

function terranUnit(scene: Phaser.Scene, d: Def) {
  const w = d.w ?? (d.kind === "building" ? 48 : 26);
  const h = d.h ?? (d.kind === "building" ? 48 : 26);
  scene.textures.remove(d.id);
  const tex = scene.textures.createCanvas(d.id, w, h);
  if (!tex) return;
  const c = tex.getContext();
  c.clearRect(0, 0, w, h);
  c.fillStyle = "rgba(0,0,0,0.28)";
  c.beginPath();
  c.ellipse(w / 2, h - 4, w / 2.6, h / 6, 0, 0, Math.PI * 2);
  c.fill();
  // 坦克/兵人：身体
  c.fillStyle = "#8a8f96";
  c.beginPath();
  c.ellipse(w / 2, h * 0.62, w * 0.32, h * 0.3, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#b9bec4";
  c.beginPath();
  c.ellipse(w / 2, h * 0.5, w * 0.22, h * 0.22, 0, 0, Math.PI * 2);
  c.fill();
  // 炮/臂
  c.fillStyle = "#5a5f66";
  c.fillRect(w * 0.5, h * 0.2, w * 0.08, h * 0.4);
  // 头灯
  c.fillStyle = "#ff6b4d";
  c.beginPath();
  c.arc(w / 2, h * 0.42, 2.4, 0, Math.PI * 2);
  c.fill();
  tex.refresh();
}

/* ============ 神族：水晶/能量结构，青蓝发光 ============ */

function protossBuilding(scene: Phaser.Scene, d: Def) {
  const w = d.w ?? (d.kind === "building" ? 48 : 26);
  const h = d.h ?? (d.kind === "building" ? 48 : 26);
  scene.textures.remove(d.id);
  const tex = scene.textures.createCanvas(d.id, w, h);
  if (!tex) return;
  const c = tex.getContext();
  c.clearRect(0, 0, w, h);
  c.fillStyle = "rgba(0,0,0,0.28)";
  c.beginPath();
  c.ellipse(w / 2, h - 6, w / 2.4, h / 7, 0, 0, Math.PI * 2);
  c.fill();
  // 底座（能量环）
  c.fillStyle = "#1c3a4a";
  c.beginPath();
  c.ellipse(w / 2, h * 0.78, w * 0.36, h * 0.14, 0, 0, Math.PI * 2);
  c.fill();
  // 主体水晶柱
  const topY = h * 0.16;
  const grad = c.createLinearGradient(0, topY, 0, h * 0.8);
  grad.addColorStop(0, "#7fe6ff");
  grad.addColorStop(1, "#2b6f8f");
  c.fillStyle = grad;
  c.beginPath();
  c.moveTo(w / 2, topY);
  c.lineTo(w * 0.78, h * 0.62);
  c.lineTo(w * 0.62, h * 0.82);
  c.lineTo(w * 0.38, h * 0.82);
  c.lineTo(w * 0.22, h * 0.62);
  c.closePath();
  c.fill();
  // 发光核心
  c.fillStyle = "rgba(180,250,255,0.9)";
  c.beginPath();
  c.ellipse(w / 2, h * 0.55, w * 0.1, h * 0.18, 0, 0, Math.PI * 2);
  c.fill();
  tex.refresh();
}

function protossUnit(scene: Phaser.Scene, d: Def) {
  const w = d.w ?? (d.kind === "building" ? 48 : 26);
  const h = d.h ?? (d.kind === "building" ? 48 : 26);
  scene.textures.remove(d.id);
  const tex = scene.textures.createCanvas(d.id, w, h);
  if (!tex) return;
  const c = tex.getContext();
  c.clearRect(0, 0, w, h);
  c.fillStyle = "rgba(0,0,0,0.28)";
  c.beginPath();
  c.ellipse(w / 2, h - 4, w / 2.6, h / 6, 0, 0, Math.PI * 2);
  c.fill();
  // 悬浮盘
  c.fillStyle = "#2b6f8f";
  c.beginPath();
  c.ellipse(w / 2, h * 0.66, w * 0.34, h * 0.16, 0, 0, Math.PI * 2);
  c.fill();
  // 能量体
  const grad = c.createLinearGradient(0, h * 0.2, 0, h * 0.66);
  grad.addColorStop(0, "#9ff0ff");
  grad.addColorStop(1, "#3a8fb0");
  c.fillStyle = grad;
  c.beginPath();
  c.moveTo(w / 2, h * 0.22);
  c.lineTo(w * 0.7, h * 0.6);
  c.lineTo(w / 2, h * 0.66);
  c.lineTo(w * 0.3, h * 0.6);
  c.closePath();
  c.fill();
  // 眼
  c.fillStyle = "#fff";
  c.beginPath();
  c.arc(w / 2, h * 0.46, 2, 0, Math.PI * 2);
  c.fill();
  tex.refresh();
}

/* ============ 虫族：有机甲壳，紫绿，带脚底椭圆 ============ */

function zergBuilding(scene: Phaser.Scene, d: Def) {
  const w = d.w ?? (d.kind === "building" ? 48 : 26);
  const h = d.h ?? (d.kind === "building" ? 48 : 26);
  scene.textures.remove(d.id);
  const tex = scene.textures.createCanvas(d.id, w, h);
  if (!tex) return;
  const c = tex.getContext();
  c.clearRect(0, 0, w, h);
  c.fillStyle = "rgba(0,0,0,0.28)";
  c.beginPath();
  c.ellipse(w / 2, h - 6, w / 2.4, h / 7, 0, 0, Math.PI * 2);
  c.fill();
  // 有机底座
  c.fillStyle = "#5a3a6a";
  c.beginPath();
  c.ellipse(w / 2, h * 0.74, w * 0.4, h * 0.18, 0, 0, Math.PI * 2);
  c.fill();
  // 甲壳主体
  const grad = c.createLinearGradient(0, h * 0.16, 0, h * 0.8);
  grad.addColorStop(0, "#9c5fb0");
  grad.addColorStop(1, "#4a2a5a");
  c.fillStyle = grad;
  c.beginPath();
  c.moveTo(w / 2, h * 0.16);
  c.bezierCurveTo(w * 0.85, h * 0.3, w * 0.8, h * 0.7, w / 2, h * 0.82);
  c.bezierCurveTo(w * 0.2, h * 0.7, w * 0.15, h * 0.3, w / 2, h * 0.16);
  c.closePath();
  c.fill();
  // 开口发光
  c.fillStyle = "#c9ff6a";
  c.beginPath();
  c.ellipse(w / 2, h * 0.56, w * 0.12, h * 0.1, 0, 0, Math.PI * 2);
  c.fill();
  tex.refresh();
}

function zergUnit(scene: Phaser.Scene, d: Def) {
  const w = d.w ?? (d.kind === "building" ? 48 : 26);
  const h = d.h ?? (d.kind === "building" ? 48 : 26);
  scene.textures.remove(d.id);
  const tex = scene.textures.createCanvas(d.id, w, h);
  if (!tex) return;
  const c = tex.getContext();
  c.clearRect(0, 0, w, h);
  c.fillStyle = "rgba(0,0,0,0.28)";
  c.beginPath();
  c.ellipse(w / 2, h - 4, w / 2.6, h / 6, 0, 0, Math.PI * 2);
  c.fill();
  // 身体（甲壳）
  c.fillStyle = "#7a4a8a";
  c.beginPath();
  c.ellipse(w / 2, h * 0.58, w * 0.34, h * 0.34, 0, 0, Math.PI * 2);
  c.fill();
  // 亮甲
  c.fillStyle = "#a86fc0";
  c.beginPath();
  c.ellipse(w / 2, h * 0.46, w * 0.2, h * 0.2, 0, 0, Math.PI * 2);
  c.fill();
  // 眼睛
  c.fillStyle = "#c9ff6a";
  c.beginPath();
  c.arc(w * 0.42, h * 0.5, 2, 0, Math.PI * 2);
  c.arc(w * 0.58, h * 0.5, 2, 0, Math.PI * 2);
  c.fill();
  tex.refresh();
}

// 避免未使用的导入告警（这些常量在 generateAll 中通过遍历数组使用）
void 0;

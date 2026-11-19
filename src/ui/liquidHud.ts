import * as Phaser from "phaser";
import {
  initRuntime,
  attachPointerBridge,
  attachInvalidationTicker,
  InputAdapter,
  Stage,
  TextFormat,
} from "liquidphaser/fl";
import { LiquidManager, LiquidLabel } from "liquidphaser/liquid";
import { Minimap } from "../minimap";
import { t } from "../i18n";

/**
 * Liquid UI 层（liquidphaser 库接入）：
 * - 底部指挥条：矿物 / 瓦斯 / 人口 / 我方单位 / 选中 / 操作提示（LiquidLabel，无背景皮肤）；
 * - 右上角小地图：CanvasTexture 绘制（见 minimap.ts），与 Liquid 组件同处 Phaser 屏幕层；
 * - 初始化硬约束（liquidphaser 约定）：initRuntime → InputAdapter.setCanvas →
 *   attachPointerBridge → attachInvalidationTicker → LiquidManager.init 皮肤预载后建组件。
 */

/** 底部指挥条高度 */
export const HUD_H = 44;

export interface HudStats {
  minerals: number;
  vespene: number;
  supplyUsed: number;
  supplyProvided: number;
  unitCount: number;
  selCount: number;
  /** 帧率（game.loop.actualFps 取整；updateHud 节流 150ms 刷新一次足够） */
  fps: number;
  hint: string;
}

export interface LiquidUI {
  stage: Stage;
  minimap: Minimap;
  setStats(s: HudStats): void;
  /** 屏幕像素命中任何 UI 区域（指挥条 / 小地图）——命中时 GameScene 应拦截世界输入 */
  hitUI(px: number, py: number): boolean;
  /** 窗口尺寸变化重排 */
  layout(w: number, h: number): void;
}

/**
 * 递归钉屏：把 Liquid 组件树（含 lib 内部子件）scrollFactor 置 0。
 * 必要性：Stage 自身 sf=0 只保证【渲染】钉屏（容器渲染忽略子项 sf），
 * 但 Phaser 输入命中（InputManager.hitTest）按每个对象【自身】的 scrollFactor
 * 把屏幕点换算回世界坐标——子项默认 sf=1，相机滚动后命中坐标跑到世界深处，
 * 所有 Liquid 按钮点击全部落空。置 0 后命中换算=屏幕坐标，与渲染及 lib
 * 「world 即屏坐标」的约定一致。组件所有内部子件创建完成后调用（addChild 后）。
 */
export function pinLiquidUI(root: unknown): void {
  const obj = root as { setScrollFactor?: (x: number, y: number) => void; list?: unknown[] };
  obj.setScrollFactor?.(0, 0);
  if (Array.isArray(obj.list)) for (const c of obj.list) pinLiquidUI(c);
}

export async function initLiquidUI(scene: Phaser.Scene): Promise<LiquidUI> {
  const cam = scene.cameras.main;
  // —— liquidphaser 初始化五步（顺序硬约束，见 lib/fl.ts 头注释）——
  initRuntime(scene.game, scene);
  InputAdapter.setCanvas(scene.game.canvas);
  attachPointerBridge(scene);
  attachInvalidationTicker();
  // 皮肤 png 在 public/skin/（Vite 静态根路径）
  await LiquidManager.init({ skinBase: "skin/" });

  const gw = scene.scale.gameSize.width;
  const gh = scene.scale.gameSize.height;

  // Stage：AS3 顶层显示容器 shim（底层 Phaser Container），整层固定屏幕坐标
  const stage = new Stage(gw, gh);
  scene.add.existing(stage as unknown as Phaser.GameObjects.GameObject);
  (stage as unknown as { setScrollFactor: (f: number) => void }).setScrollFactor(0);
  (stage as unknown as { setDepth: (d: number) => void }).setDepth(5100);

  // 指挥条背景（Phaser 层，LiquidLabel 无背景皮肤，需要自备底色）
  const bg = scene.add
    .rectangle(0, gh - HUD_H, gw, HUD_H, 0x0d1218, 0.94)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(5090);
  const bgLine = scene.add
    .graphics()
    .setScrollFactor(0)
    .setDepth(5091);
  bgLine.lineStyle(1, 0x3a5a42, 1);
  bgLine.lineBetween(0, gh - HUD_H, gw, gh - HUD_H);

  // —— LiquidLabel 组（皮肤缺失 → 纯文字，Liquid 原版行为）——
  const fmt = () => new TextFormat("Consolas, 'Courier New', monospace", 13, 0xd8ffe6);
  const dimFmt = () => new TextFormat("Consolas, 'Courier New', monospace", 12, 0x8fae96);
  const mkLabel = (w: number, dim = false): LiquidLabel => {
    const l = new LiquidLabel();
    l.setStyle("textFormat", dim ? dimFmt() : fmt());
    l.setSize(w, 22);
    return l;
  };
  const lblMineral = mkLabel(120);
  const lblVespene = mkLabel(110);
  const lblSupply = mkLabel(120);
  const lblUnits = mkLabel(120);
  const lblSel = mkLabel(140);
  const lblFps = mkLabel(90);
  const lblHint = mkLabel(640, true);
  [lblMineral, lblVespene, lblSupply, lblUnits, lblSel, lblFps, lblHint].forEach((l) => {
    stage.addChild(l);
    pinLiquidUI(l);
  });

  const minimap = new Minimap(scene, cam);

  // 当前窗口高（RESIZE 时更新）：hitUI 判定用动态值，不能用初始化时的 gh
  let curH = gh;

  const layout = (w: number, h: number): void => {
    curH = h;
    stage.setStageSize(w, h);
    // 背景通栏
    bg.setSize(w, HUD_H);
    bg.setPosition(0, h - HUD_H);
    bgLine.clear();
    bgLine.lineStyle(1, 0x3a5a42, 1);
    bgLine.lineBetween(0, h - HUD_H, w, h - HUD_H);
    // 标签行：垂直居中于指挥条
    const ly = h - HUD_H + (HUD_H - 22) / 2;
    lblMineral.position.set(14, ly);
    lblVespene.position.set(140, ly);
    lblSupply.position.set(256, ly);
    lblUnits.position.set(382, ly);
    lblSel.position.set(508, ly);
    lblFps.position.set(652, ly);
    // 提示靠右（右端留小地图宽度的空白由小地图占据上方，底部整条可用）
    lblHint.position.set(Math.max(760, w - 650), ly);
    // 小地图右上角
    minimap.layout(w, h);
  };
  layout(gw, gh);

  return {
    stage,
    minimap,
    setStats(s: HudStats): void {
      lblMineral.text = `${t("hud.minerals")} ${s.minerals}`;
      lblVespene.text = `${t("hud.vespene")} ${s.vespene}`;
      lblSupply.text = `${t("hud.supply")} ${s.supplyUsed}/${s.supplyProvided}`;
      lblUnits.text = `${t("hud.units")} ${s.unitCount}`;
      lblSel.text = `${t("hud.selected")} ${s.selCount}`;
      lblFps.text = `${t("hud.fps")} ${s.fps}`;
      lblHint.text = s.hint;
    },
    hitUI(px: number, py: number): boolean {
      return py >= curH - HUD_H || minimap.hit(px, py);
    },
    layout(w: number, h: number): void {
      layout(w, h);
    },
  };
}

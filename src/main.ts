import * as Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";
import { GAME_WIDTH, GAME_HEIGHT } from "./config";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  // 初始尺寸（RESIZE 模式下会被真实窗口尺寸立即覆盖）
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#0a0a12",
  pixelArt: true,
  scale: {
    // RESIZE：画布直接撑满浏览器窗口（窗口多大画布多大，无 FIT 信箱黑边）
    mode: Phaser.Scale.RESIZE
    // 居中完全由 CSS 控制，避免 Phaser 的 autoCenter 与 CSS transform 冲突
  },
  // 关闭 Phaser 默认右键菜单，方便我们用右键下达指令
  disableContextMenu: true,
  scene: [GameScene]
};

const game = new Phaser.Game(config);

// 调试钩子：仅在 dev 下把游戏实例挂到 window.__GAME__，
// 供 debug/overlay.js（独立脚本 / Chrome 扩展）读取并叠加调试层。
// 生产构建（import.meta.env.DEV 为 false）不会执行，零污染。
if (import.meta.env.DEV) {
  (window as any).__GAME__ = game;
}

import * as Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";
import { GAME_WIDTH, GAME_HEIGHT } from "./config";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#0a0a12",
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT
    // 居中完全由 CSS 控制，避免 Phaser 的 autoCenter 与 CSS transform 冲突
  },
  // 关闭 Phaser 默认右键菜单，方便我们用右键下达指令
  disableContextMenu: true,
  scene: [GameScene]
};

new Phaser.Game(config);

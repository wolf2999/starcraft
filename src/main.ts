import * as Phaser from "phaser";
import { MenuScene } from "./scenes/MenuScene";
import { GameScene } from "./scenes/GameScene";
import { GAME_WIDTH, GAME_HEIGHT } from "./config";
import { LANG, t } from "./i18n";
import type { Race } from "./config";

// 页面语言/标题跟随 i18n 判定结果（index.html 内为默认值）
document.documentElement.lang = LANG;
document.title = t("app.title");

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
  // 场景启动链：主菜单（星际式选敌/开始）→ GameScene（经 scene data 传 enemies）
  scene: [MenuScene, GameScene]
};

const game = new Phaser.Game(config);

// 调试直开：?game=1 跳过主菜单直接进对局（与 GameScene.init 的"调试直开"兼容
// 缺省一致），可带 ?enemies=3&race=zerg 指定对局参数；无参数时行为完全不变。
// 也供无头浏览器/自动化验证直接截取对局画面。
{
  const p = new URLSearchParams(location.search);
  if (p.get("game")) {
    game.events.once(Phaser.Core.Events.READY, () => {
      game.scene.stop("menu"); // 直接关掉主菜单，避免其叠在对局之上
      game.scene.start("game", {
        enemies: Math.trunc(Number(p.get("enemies") ?? 2)) || 2,
        race: (p.get("race") ?? "terran") as Race,
      });
    });
  }
}

// 调试钩子：仅在 dev 下把游戏实例挂到 window.__GAME__，
// 供 debug/overlay.js（独立脚本 / Chrome 扩展）读取并叠加调试层。
// 生产构建（import.meta.env.DEV 为 false）不会执行，零污染。
if (import.meta.env.DEV) {
  (window as any).__GAME__ = game;
}

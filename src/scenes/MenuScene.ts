import * as Phaser from "phaser";

/**
 * 主菜单（星际争霸原版风格）：深空星幕 + 斜切金属按钮 + 琥珀金高亮。
 *
 * - 地图固定 Lost Temple（唯一地图，无需选图）。
 * - 可选敌人数量 1~3（加自己最多 4 家，对应地图四个角落出生区）。
 * - 开始后经 scene data 把 enemies 传给 GameScene：出场阵营（玩家 + 前 N 个 AI）
 *   随机洗到四角落出生区，未占用的角落保留矿区即天然扩张点。
 *
 * 纯 Graphics/Text 绘制（与项目"程序化美术、不含官方素材"约定一致）；
 * RESIZE 模式下整体居中重排，按钮命中用独立 Zone（避开容器内交互偏移问题）。
 */

const FONT = "Consolas, 'Courier New', monospace";

/** SC1 菜单配色：深蓝金属底 + 琥珀金高亮 */
const C = {
  bgTop: 0x060913,
  bgBottom: 0x0d1526,
  star: 0xcfd8ff,
  panelFill: 0x0f182b,
  panelFillHover: 0x1c2b47,
  panelFillSel: 0x24365c,
  border: 0x39527a,
  bevelLight: 0x8ea6cf,
  bevelDark: 0x05070d,
  amber: 0xe8a33d,
  text: "#e8e6d8",
  dim: "#7f8db0",
  amberText: "#f2c56a",
};

/** 斜切角（px）：面板/按钮左上与右下切角，星际式斜切轮廓 */
const CHAMFER = 12;

type Pt = Phaser.Math.Vector2;

/** 斜切轮廓六个顶点（中心定位）：左上角与右下角各切一刀 */
function slantPts(x: number, y: number, w: number, h: number, c = CHAMFER): Pt[] {
  const x0 = x - w / 2, x1 = x + w / 2, y0 = y - h / 2, y1 = y + h / 2;
  return [
    new Phaser.Math.Vector2(x0 + c, y0),
    new Phaser.Math.Vector2(x1, y0),
    new Phaser.Math.Vector2(x1, y1 - c),
    new Phaser.Math.Vector2(x1 - c, y1),
    new Phaser.Math.Vector2(x0, y1),
    new Phaser.Math.Vector2(x0, y0 + c),
  ];
}

/** 画斜切面板：填充 + 描边 + 左上亮/右下暗的金属斜面高光 */
function drawSlantPanel(
  g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number,
  fill: number, border: number, alpha = 1, c = CHAMFER
) {
  const pts = slantPts(x, y, w, h, c);
  g.fillStyle(fill, alpha);
  g.fillPoints(pts, true);
  g.lineStyle(2, border, alpha);
  g.strokePoints(pts, true);
  g.lineStyle(1, C.bevelLight, 0.55 * alpha);
  g.beginPath();
  g.moveTo(pts[5].x, pts[5].y);
  g.lineTo(pts[0].x, pts[0].y);
  g.lineTo(pts[1].x, pts[1].y);
  g.strokePath();
  g.lineStyle(1, C.bevelDark, 0.9 * alpha);
  g.beginPath();
  g.moveTo(pts[2].x, pts[2].y);
  g.lineTo(pts[3].x, pts[3].y);
  g.lineTo(pts[4].x, pts[4].y);
  g.strokePath();
}

/** 确定性伪随机（星幕布局稳定不闪动） */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t ^ (t >>> 13)) >>> 0;
    t = (Math.imul(t, 0x5bd1e995) ^ t) >>> 0;
    return t / 0x100000000;
  };
}

export class MenuScene extends Phaser.Scene {
  /** 选中的敌人数量（1~3） */
  private enemies = 2;
  /** 当前悬停的按钮 key */
  private hoverKey: string | null = null;

  private root: Phaser.GameObjects.Container | null = null;
  private bgGfx: Phaser.GameObjects.Graphics | null = null;
  /** 按钮命中区（绝对坐标挂在场景根，避免容器内交互偏移） */
  private zones: Phaser.GameObjects.Zone[] = [];
  private btnGfx: Record<string, Phaser.GameObjects.Graphics> = {};
  private btnText: Record<string, Phaser.GameObjects.Text> = {};
  private descText: Phaser.GameObjects.Text | null = null;
  /** 按钮纵坐标（重绘与命中区必须用同一值；rebuild 时刷新） */
  private enemyBtnY = 22;
  private startBtnY = 190;

  constructor() {
    super("menu");
  }

  create() {
    this.rebuild();
    this.scale.on("resize", this.rebuild, this);
    this.events.once("shutdown", () => this.scale.off("resize", this.rebuild, this));

    // 快捷键：1/2/3 选敌，回车开始（星际菜单的键盘操作习惯）
    const kb = this.input.keyboard;
    kb?.on("keydown-ONE", () => this.pickEnemies(1));
    kb?.on("keydown-TWO", () => this.pickEnemies(2));
    kb?.on("keydown-THREE", () => this.pickEnemies(3));
    kb?.on("keydown-ENTER", () => this.startGame());
  }

  /** 整体重排/重绘（create 与窗口 resize 时调用；对象全量重建，菜单很轻） */
  private rebuild() {
    // 清理旧对象（按钮/文本都在 root 容器里，随容器一起销毁）
    this.zones.forEach((z) => z.destroy());
    this.zones = [];
    this.bgGfx?.destroy();
    this.root?.destroy();
    this.btnGfx = {};
    this.btnText = {};
    this.descText = null;
    this.hoverKey = null;

    const gw = this.scale.gameSize.width;
    const gh = this.scale.gameSize.height;
    const cx = gw / 2;
    const cy = gh / 2;

    // —— 背景：深空渐变 + 星云 + 星幕（挂在场景根，不进 root）——
    const bg = this.add.graphics().setDepth(-10);
    this.bgGfx = bg;
    bg.fillGradientStyle(C.bgTop, C.bgTop, C.bgBottom, C.bgBottom, 1);
    bg.fillRect(0, 0, gw, gh);
    const rnd = mulberry32(0x5ca1);
    for (const [nx, ny, nr, col] of [
      [gw * 0.2, gh * 0.25, 340, 0x3a5adf],
      [gw * 0.82, gh * 0.7, 420, 0x7a4adf],
      [gw * 0.6, gh * 0.15, 260, 0x1f8f8f],
    ] as const) {
      bg.fillStyle(col, 0.055);
      bg.fillCircle(nx, ny, nr);
    }
    for (let i = 0; i < 150; i++) {
      bg.fillStyle(C.star, 0.15 + rnd() * 0.7);
      bg.fillCircle(rnd() * gw, rnd() * gh, 0.6 + rnd() * 1.1);
    }

    // —— 内容根容器（居中）——
    const root = this.add.container(cx, cy);
    this.root = root;

    // 标题（星际式金属蓝大字）+ 副标
    const title = this.add.text(0, -196, "星 际 争 霸", {
      fontFamily: FONT, fontSize: "64px", fontStyle: "bold",
      color: "#cfe0f5", stroke: "#0a1830", strokeThickness: 10,
    }).setOrigin(0.5);
    title.setShadow(0, 5, "#000000", 10, false, true);
    root.add(title);
    root.add(this.add.text(0, -142, "LOST TEMPLE · 等距抽象重制版", {
      fontFamily: FONT, fontSize: "16px", color: C.dim,
    }).setOrigin(0.5).setLetterSpacing(4));

    // —— 对局设置面板 ——
    const pw = 640, ph = 252, py = 26;
    this.enemyBtnY = py - 4;
    this.startBtnY = 190;
    const panel = this.add.graphics();
    drawSlantPanel(panel, 0, py, pw, ph, C.panelFill, C.border, 0.94);
    root.add(panel);

    // 面板标题 + 琥珀下划线
    const headerX = -pw / 2 + 28;
    root.add(this.add.text(headerX, py - ph / 2 + 26, "对 局 设 置", {
      fontFamily: FONT, fontSize: "20px", fontStyle: "bold", color: C.amberText,
    }).setOrigin(0, 0.5));
    panel.fillStyle(C.amber, 0.9);
    panel.fillRect(headerX, py - ph / 2 + 42, 132, 2);

    // 敌人数量三选一（斜切按钮）
    root.add(this.add.text(headerX, py - 42, "敌人数量（加自己最多 4 家）", {
      fontFamily: FONT, fontSize: "15px", color: C.text,
    }).setOrigin(0, 0.5));
    const ew = 140, eh = 44;
    const exs = [-ew - 32, 0, ew + 32];
    const names = ["1 个敌人", "2 个敌人", "3 个敌人"];
    names.forEach((label, i) => {
      const n = i + 1;
      const key = `e${n}`;
      const g = this.add.graphics();
      this.btnGfx[key] = g;
      root.add(g);
      const t = this.add.text(exs[i], this.enemyBtnY, label, {
        fontFamily: FONT, fontSize: "17px", fontStyle: "bold", color: C.text,
      }).setOrigin(0.5);
      this.btnText[key] = t;
      root.add(t);
      this.drawEnemyBtn(n);
      // 命中区（绝对坐标）：悬停/点击
      const zone = this.add.zone(cx + exs[i], cy + this.enemyBtnY, ew, eh)
        .setInteractive({ useHandCursor: true });
      zone.on("pointerover", () => { this.hoverKey = key; this.drawEnemyBtn(n); });
      zone.on("pointerout", () => { if (this.hoverKey === key) this.hoverKey = null; this.drawEnemyBtn(n); });
      zone.on("pointerdown", () => this.pickEnemies(n));
      this.zones.push(zone);
    });

    // 动态说明文字（随所选敌人数切换）
    this.descText = this.add.text(0, py + 44, "", {
      fontFamily: FONT, fontSize: "14px", color: C.dim,
    }).setOrigin(0.5);
    root.add(this.descText);
    this.updateDesc();

    // 分隔线 + 地图信息（唯一地图，无需选图）
    panel.lineStyle(1, C.border, 0.7);
    panel.beginPath();
    panel.moveTo(-pw / 2 + 28, py + 66);
    panel.lineTo(pw / 2 - 28, py + 66);
    panel.strokePath();
    root.add(this.add.text(headerX, py + 84, "地图：Lost Temple（唯一地图，无需选择）", {
      fontFamily: FONT, fontSize: "14px", color: C.text,
    }).setOrigin(0, 0.5));
    root.add(this.add.text(headerX, py + 106, "出生点：玩家与敌人随机分配到地图四角", {
      fontFamily: FONT, fontSize: "14px", color: C.text,
    }).setOrigin(0, 0.5));

    // —— 开始按钮 ——
    const sg = this.add.graphics();
    this.btnGfx.start = sg;
    root.add(sg);
    this.drawStartBtn();
    const st = this.add.text(0, this.startBtnY, "开 始 游 戏", {
      fontFamily: FONT, fontSize: "26px", fontStyle: "bold", color: C.amberText,
    }).setOrigin(0.5);
    this.btnText.start = st;
    root.add(st);
    const szone = this.add.zone(cx, cy + this.startBtnY, 320, 60)
      .setInteractive({ useHandCursor: true });
    szone.on("pointerover", () => { this.hoverKey = "start"; this.drawStartBtn(); });
    szone.on("pointerout", () => { if (this.hoverKey === "start") this.hoverKey = null; this.drawStartBtn(); });
    szone.on("pointerdown", () => this.startGame());
    this.zones.push(szone);

    // —— 角落注释（窗口角落，绝对坐标）——
    root.add(this.add.text(-cx + 16, -cy + gh - 24, "星际争霸风格 · 程序化美术 · 无官方素材", {
      fontFamily: FONT, fontSize: "12px", color: "#54617e",
    }).setOrigin(0, 0.5));
    root.add(this.add.text(cx - 16, -cy + gh - 24, "1/2/3 选择敌人 · 回车开始", {
      fontFamily: FONT, fontSize: "12px", color: "#54617e",
    }).setOrigin(1, 0.5));
  }

  /** 重绘敌人数量按钮（选中琥珀高亮 + 左侧指示三角） */
  private drawEnemyBtn(n: number) {
    const key = `e${n}`;
    const g = this.btnGfx[key];
    const t = this.btnText[key];
    if (!g || !t) return;
    g.clear();
    const x = (n - 2) * 172; // 与 exs 一致（±172）
    const y = this.enemyBtnY;
    const sel = this.enemies === n;
    const hov = this.hoverKey === key;
    const fill = sel ? C.panelFillSel : hov ? C.panelFillHover : C.panelFill;
    const border = sel ? C.amber : hov ? C.bevelLight : C.border;
    drawSlantPanel(g, x, y, 140, 44, fill, border);
    if (sel) {
      g.fillStyle(C.amber, 1);
      g.fillTriangle(x - 60, y - 5, x - 60, y + 5, x - 51, y);
    }
    t.setColor(sel ? C.amberText : hov ? "#ffffff" : C.text);
  }

  /** 重绘开始按钮（悬停琥珀描边加亮） */
  private drawStartBtn() {
    const g = this.btnGfx.start;
    const t = this.btnText.start;
    if (!g || !t) return;
    g.clear();
    const hov = this.hoverKey === "start";
    drawSlantPanel(g, 0, this.startBtnY, 320, 60, hov ? C.panelFillSel : C.panelFill, hov ? C.amber : C.border, 0.96);
    t.setColor(hov ? "#ffe2a0" : C.amberText);
  }

  /** 更新所选敌人数量对应的说明文字 */
  private updateDesc() {
    const desc = [
      "",
      "1 个敌人：双人对决，专注运营，一波定胜负",
      "2 个敌人：三足鼎立，警惕两线开花",
      "3 个敌人：四角混战，经典 4 人图体验",
    ][this.enemies];
    this.descText?.setText(desc);
  }

  private pickEnemies(n: number) {
    this.enemies = Math.min(3, Math.max(1, Math.trunc(n)));
    for (let i = 1; i <= 3; i++) this.drawEnemyBtn(i);
    this.updateDesc();
  }

  private startGame() {
    this.scene.start("game", { enemies: this.enemies });
  }
}

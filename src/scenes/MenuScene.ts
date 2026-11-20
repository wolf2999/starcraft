import * as Phaser from "phaser";
import type { Race } from "../config";
import { LANG, setLang, t, type Lang } from "../i18n";
import { net, NET_HTTP_BASE, type RoomListItem, type RoomStateMsg } from "../net/client";

/**
 * 主菜单（星际争霸原版风格）：深空星幕 + 斜切金属按钮 + 琥珀金高亮。
 *
 * - 地图固定 Lost Temple（唯一地图，无需选图）。
 * - 可选种族 Terran/Protoss/Zerg（决定玩家主基地、农民与初始兵）。
 * - 可选敌人数量 1~3（加自己最多 4 家，对应地图四个角落出生区）。
 * - 开始后经 scene data 把 { enemies, race } 传给 GameScene：出场阵营
 *   （玩家 + 前 N 个 AI）随机洗到四角落出生区，未占用的角落保留矿区即天然扩张点。
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

/** 三族选项（主菜单种族按钮；文案走 i18n 键） */
const RACES: { id: Race; labelKey: string; descKey: string }[] = [
  { id: "terran", labelKey: "race.terran", descKey: "race.terran.desc" },
  { id: "protoss", labelKey: "race.protoss", descKey: "race.protoss.desc" },
  { id: "zerg", labelKey: "race.zerg", descKey: "race.zerg.desc" },
];

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
  /** 选中的玩家种族 */
  private race: Race = "terran";
  /** 当前悬停的按钮 key */
  private hoverKey: string | null = null;

  private root: Phaser.GameObjects.Container | null = null;
  private bgGfx: Phaser.GameObjects.Graphics | null = null;
  /** 按钮命中区（绝对坐标挂在场景根，避免容器内交互偏移） */
  private zones: Phaser.GameObjects.Zone[] = [];
  private btnGfx: Record<string, Phaser.GameObjects.Graphics> = {};
  private btnText: Record<string, Phaser.GameObjects.Text> = {};
  private descText: Phaser.GameObjects.Text | null = null;
  private raceDescText: Phaser.GameObjects.Text | null = null;
  /** 按钮纵坐标（重绘与命中区必须用同一值；rebuild 时刷新） */
  private enemyBtnY = -12;
  private raceBtnY = 100;
  private startBtnY = 250;

  // —— 战网对战面板状态 ——
  /** 战网面板是否打开（打开时替换对局设置面板） */
  private netOpen = false;
  /** 面板状态机：登录 → 房间列表 → 创建房间 → 房间内 */
  private netState: "login" | "rooms" | "create" | "inroom" = "login";
  /** 登录输入框内容（密码仅内存保存） */
  private netUser = "";
  private netPass = "";
  /** 当前聚焦的输入框（null = 无） */
  private netFocused: "user" | "pass" | null = null;
  /** 面板提示/错误消息 */
  private netMsg = "";
  /** 房间列表（list_room 返回） */
  private roomList: RoomListItem[] = [];
  /** 当前所在房间状态（room_state 广播） */
  private currentRoom: RoomStateMsg | null = null;
  /** 创建房间的对战规模 */
  private netTeamSize = 1;
  /** 输入框文本对象（键入时直接改文本，不整面板重建） */
  private netFieldTexts: Record<string, Phaser.GameObjects.Text> = {};
  /** 创建房间流程防抖 */
  private netBusy = false;

  constructor() {
    super("menu");
  }

  create() {
    this.rebuild();
    this.scale.on("resize", this.rebuild, this);
    this.events.once("shutdown", () => this.scale.off("resize", this.rebuild, this));

    // 快捷键：1/2/3 选敌，Q/W/E 选族，回车开始（星际菜单的键盘操作习惯）
    // 战网面板打开时这些热键停用（输入框优先），由 onNetKey 接管
    const kb = this.input.keyboard;
    kb?.on("keydown-ONE", () => this.pickEnemies(1));
    kb?.on("keydown-TWO", () => this.pickEnemies(2));
    kb?.on("keydown-THREE", () => this.pickEnemies(3));
    kb?.on("keydown-Q", () => this.pickRace("terran"));
    kb?.on("keydown-W", () => this.pickRace("protoss"));
    kb?.on("keydown-E", () => this.pickRace("zerg"));
    kb?.on("keydown-ENTER", () => this.startGame());
    kb?.on("keydown", (ev: KeyboardEvent) => this.onNetKey(ev));

    // 注册战网消息处理器（进入对局时 GameScene 会整体替换）
    this.registerNetHandlers();
    // 从对局结算返回时 ws 仍在线：直接进房间列表
    if (this.netOpen && net.connected) {
      this.netState = "rooms";
      net.listRooms();
      this.rebuild();
    }
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
    this.raceDescText = null;
    this.netFieldTexts = {};
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

    // —— 语言切换（右上角）：点击后重建菜单，进入对局沿用所选语言 ——
    const LANGS: { id: Lang; key: string }[] = [
      { id: "zh-CN", key: "lang.zhCN" },
      { id: "zh-TW", key: "lang.zhTW" },
      { id: "en", key: "lang.en" },
    ];
    LANGS.forEach((l, i) => {
      const lx = cx - 16 - (LANGS.length - 1 - i) * 60;
      const active = LANG === l.id;
      const lb = this.add.text(lx, -cy + 22, t(l.key), {
        fontFamily: FONT, fontSize: "13px", fontStyle: "bold",
        color: active ? C.amberText : C.dim,
      }).setOrigin(1, 0.5);
      root.add(lb);
      if (active) {
        const ul = this.add.graphics();
        ul.fillStyle(C.amber, 0.9);
        ul.fillRect(lx - lb.width, -cy + 30, lb.width, 2);
        root.add(ul);
      }
      const zone = this.add.zone(cx + lx - 26, 22, 52, 26)
        .setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => {
        if (LANG === l.id) return;
        setLang(l.id);
        this.time.delayedCall(0, () => this.rebuild());
      });
      this.zones.push(zone);
    });

    // 标题（星际式金属蓝大字）+ 副标
    const title = this.add.text(0, -196, "S T A R C R A F T", {
      fontFamily: FONT, fontSize: "64px", fontStyle: "bold",
      color: "#cfe0f5", stroke: "#0a1830", strokeThickness: 10,
    }).setOrigin(0.5);
    title.setShadow(0, 5, "#000000", 10, false, true);
    root.add(title);
    root.add(this.add.text(0, -142, "LOST TEMPLE", {
      fontFamily: FONT, fontSize: "16px", color: C.dim,
    }).setOrigin(0.5).setLetterSpacing(4));

    // —— 对局设置面板（战网面板打开时替换为战网 UI）——
    if (this.netOpen) {
      this.buildNetPanel(root);
      return;
    }
    const pw = 660, ph = 318, py = 55;
    const top = py - ph / 2; // 面板顶边（局部坐标）
    this.enemyBtnY = top + 92;
    this.raceBtnY = top + 204;
    this.startBtnY = top + ph + 36;
    const panel = this.add.graphics();
    drawSlantPanel(panel, 0, py, pw, ph, C.panelFill, C.border, 0.94);
    root.add(panel);

    // 面板标题 + 琥珀下划线
    const headerX = -pw / 2 + 28;
    const headerTxt = this.add.text(headerX, top + 16, t("menu.title"), {
      fontFamily: FONT, fontSize: "20px", fontStyle: "bold", color: C.amberText,
    }).setOrigin(0, 0.5);
    root.add(headerTxt);
    panel.fillStyle(C.amber, 0.9);
    panel.fillRect(headerX, top + 34, Math.min(pw - 56, headerTxt.width + 6), 2);

    // 敌人数量三选一（斜切按钮）
    root.add(this.add.text(headerX, top + 52, t("menu.enemiesLabel"), {
      fontFamily: FONT, fontSize: "15px", color: C.text,
    }).setOrigin(0, 0.5));
    const ew = 140, eh = 44;
    const exs = [-ew - 32, 0, ew + 32];
    const nameKeys = ["menu.enemies1", "menu.enemies2", "menu.enemies3"];
    nameKeys.forEach((labelKey, i) => {
      const n = i + 1;
      const key = `e${n}`;
      const g = this.add.graphics();
      this.btnGfx[key] = g;
      root.add(g);
      const label = t(labelKey);
      const txt = this.add.text(exs[i], this.enemyBtnY, label, {
        fontFamily: FONT, fontSize: "17px", fontStyle: "bold", color: C.text,
      }).setOrigin(0.5);
      this.btnText[key] = txt;
      root.add(txt);
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
    this.descText = this.add.text(0, top + 130, "", {
      fontFamily: FONT, fontSize: LANG === "en" ? "13px" : "14px", color: C.dim,
    }).setOrigin(0.5);
    root.add(this.descText);
    this.updateDesc();

    // 分隔线
    panel.lineStyle(1, C.border, 0.7);
    panel.beginPath();
    panel.moveTo(-pw / 2 + 28, top + 150);
    panel.lineTo(pw / 2 - 28, top + 150);
    panel.strokePath();

    // 种族三选一（斜切按钮）
    root.add(this.add.text(headerX, top + 166, t("menu.raceLabel"), {
      fontFamily: FONT, fontSize: "15px", color: C.text,
    }).setOrigin(0, 0.5));
    RACES.forEach((r, i) => {
      const key = `r_${r.id}`;
      const g = this.add.graphics();
      this.btnGfx[key] = g;
      root.add(g);
      const txt = this.add.text(exs[i], this.raceBtnY, t(r.labelKey), {
        fontFamily: FONT, fontSize: "15px", fontStyle: "bold", color: C.text,
      }).setOrigin(0.5);
      this.btnText[key] = txt;
      root.add(txt);
      this.drawRaceBtn(i);
      const zone = this.add.zone(cx + exs[i], cy + this.raceBtnY, ew, eh)
        .setInteractive({ useHandCursor: true });
      zone.on("pointerover", () => { this.hoverKey = key; this.drawRaceBtn(i); });
      zone.on("pointerout", () => { if (this.hoverKey === key) this.hoverKey = null; this.drawRaceBtn(i); });
      zone.on("pointerdown", () => this.pickRace(r.id));
      this.zones.push(zone);
    });

    // 种族说明（随所选种族切换）
    this.raceDescText = this.add.text(0, top + 242, "", {
      fontFamily: FONT, fontSize: LANG === "en" ? "13px" : "14px", color: C.dim,
    }).setOrigin(0.5);
    root.add(this.raceDescText);
    this.updateRaceDesc();

    // 分隔线 + 地图信息（唯一地图，无需选图）
    panel.lineStyle(1, C.border, 0.7);
    panel.beginPath();
    panel.moveTo(-pw / 2 + 28, top + 262);
    panel.lineTo(pw / 2 - 28, top + 262);
    panel.strokePath();
    const infoSize = LANG === "en" ? "13px" : "14px";
    root.add(this.add.text(headerX, top + 278, t("menu.mapInfo"), {
      fontFamily: FONT, fontSize: infoSize, color: C.text,
    }).setOrigin(0, 0.5));
    root.add(this.add.text(headerX, top + 302, t("menu.spawnInfo"), {
      fontFamily: FONT, fontSize: infoSize, color: C.text,
    }).setOrigin(0, 0.5));

    // —— 开始按钮 + 战网对战入口（并排，避免小窗口下溢出画布）——
    const sg = this.add.graphics();
    this.btnGfx.start = sg;
    root.add(sg);
    this.drawStartBtn();
    const st = this.add.text(-170, this.startBtnY, t("menu.start"), {
      fontFamily: FONT, fontSize: "26px", fontStyle: "bold", color: C.amberText,
    }).setOrigin(0.5);
    this.btnText.start = st;
    root.add(st);
    const szone = this.add.zone(cx - 170, cy + this.startBtnY, 300, 60)
      .setInteractive({ useHandCursor: true });
    szone.on("pointerover", () => { this.hoverKey = "start"; this.drawStartBtn(); });
    szone.on("pointerout", () => { if (this.hoverKey === "start") this.hoverKey = null; this.drawStartBtn(); });
    szone.on("pointerdown", () => this.startGame());
    this.zones.push(szone);

    const netBtnY = this.startBtnY;
    const ng = this.add.graphics();
    this.btnGfx.net = ng;
    root.add(ng);
    this.drawNetEntryBtn(netBtnY);
    const nt = this.add.text(170, netBtnY, t("menu.net"), {
      fontFamily: FONT, fontSize: "20px", fontStyle: "bold", color: C.text,
    }).setOrigin(0.5);
    this.btnText.net = nt;
    root.add(nt);
    const nzone = this.add.zone(cx + 170, cy + netBtnY, 300, 60)
      .setInteractive({ useHandCursor: true });
    nzone.on("pointerover", () => { this.hoverKey = "net"; this.drawNetEntryBtn(netBtnY); });
    nzone.on("pointerout", () => { if (this.hoverKey === "net") this.hoverKey = null; this.drawNetEntryBtn(netBtnY); });
    nzone.on("pointerdown", () => this.openNet());
    this.zones.push(nzone);

    // —— 角落注释（窗口角落，绝对坐标）——
    root.add(this.add.text(-cx + 16, -cy + gh - 24, t("menu.footerLeft"), {
      fontFamily: FONT, fontSize: "12px", color: "#54617e",
    }).setOrigin(0, 0.5));
    root.add(this.add.text(cx - 16, -cy + gh - 24, t("menu.hotkeys"), {
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

  /** 重绘种族按钮（选中琥珀高亮 + 左侧指示三角） */
  private drawRaceBtn(i: number) {
    const r = RACES[i];
    const key = `r_${r.id}`;
    const g = this.btnGfx[key];
    const t = this.btnText[key];
    if (!g || !t) return;
    g.clear();
    const x = (i - 1) * 172; // 与 exs 一致（±172）
    const y = this.raceBtnY;
    const sel = this.race === r.id;
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

  /** 重绘开始按钮（悬停琥珀描边加亮；与战网入口并排，中心 x=-170） */
  private drawStartBtn() {
    const g = this.btnGfx.start;
    const t = this.btnText.start;
    if (!g || !t) return;
    g.clear();
    const hov = this.hoverKey === "start";
    drawSlantPanel(g, -170, this.startBtnY, 300, 60, hov ? C.panelFillSel : C.panelFill, hov ? C.amber : C.border, 0.96);
    t.setColor(hov ? "#ffe2a0" : C.amberText);
  }

  /** 更新所选敌人数量对应的说明文字 */
  private updateDesc() {
    const desc = ["", t("menu.enemiesDesc1"), t("menu.enemiesDesc2"), t("menu.enemiesDesc3")][this.enemies];
    this.descText?.setText(desc);
  }

  private pickEnemies(n: number) {
    if (this.netOpen) return;
    this.enemies = Math.min(3, Math.max(1, Math.trunc(n)));
    for (let i = 1; i <= 3; i++) this.drawEnemyBtn(i);
    this.updateDesc();
  }

  /** 更新所选种族对应的说明文字 */
  private updateRaceDesc() {
    const r = RACES.find((x) => x.id === this.race) ?? RACES[0];
    this.raceDescText?.setText(t(r.descKey));
  }

  private pickRace(id: Race) {
    if (this.netOpen) return;
    this.race = id;
    RACES.forEach((_, i) => this.drawRaceBtn(i));
    this.updateRaceDesc();
  }

  private startGame() {
    if (this.netOpen) return;
    this.scene.start("game", { enemies: this.enemies, race: this.race });
  }

  // ==================== 战网对战面板 ====================

  /** 战网入口按钮（悬停加亮；与开始按钮并排，中心 x=170） */
  private drawNetEntryBtn(y: number) {
    const g = this.btnGfx.net;
    const txt = this.btnText.net;
    if (!g || !txt) return;
    g.clear();
    const hov = this.hoverKey === "net";
    drawSlantPanel(g, 170, y, 300, 60, hov ? C.panelFillSel : C.panelFill, hov ? C.amber : C.border, 0.96);
    txt.setColor(hov ? "#ffe2a0" : C.text);
  }

  /** 注册战网消息处理器（MenuScene create 时调用；切到对局会被替换） */
  private registerNetHandlers() {
    net.clearHandlers();
    net.setHandler("room_list", (m: { rooms: RoomListItem[] }) => {
      this.roomList = m.rooms ?? [];
      if (this.netOpen) this.rebuild();
    });
    net.setHandler("room_state", (m: RoomStateMsg) => {
      this.currentRoom = m;
      this.netState = "inroom";
      if (this.netOpen) this.rebuild();
    });
    net.setHandler("start_game", (m: { seed: number; slots: any[] }) => {
      // 清掉上一局残留的快照缓存（镜像端补放的是"本局"快照，不能串局）
      net.lastSnapshot = null;
      this.scene.start("game", {
        net: true,
        seed: m.seed,
        slots: m.slots,
        myUid: net.userId,
        race: this.race,
      });
    });
    net.setHandler("kicked", () => {
      this.netState = "login";
      this.currentRoom = null;
      this.showNetMsg(t("net.kicked"));
    });
    net.setHandler("error", (m: { code: number; msg: string }) => {
      if (this.netOpen) this.handleServerError(m);
    });
    net.setHandler("_close", () => {
      if (!this.netOpen) return;
      this.netState = "login";
      this.currentRoom = null;
      this.showNetMsg(t("net.disconnected"));
      this.rebuild();
    });
  }

  /** 服务器 error 消息 → i18n 文案（无对应键则用服务器原文） */
  private handleServerError(m: { code: number; msg: string }) {
    const key = `net.err${m.code}`;
    const mapped = t(key);
    this.showNetMsg(mapped === key ? m.msg : mapped);
  }

  private showNetMsg(msg: string) {
    this.netMsg = msg;
    this.rebuild();
  }

  /** 打开战网面板：未连接进登录页，已连接进房间列表 */
  private openNet() {
    this.netOpen = true;
    this.netMsg = "";
    if (net.connected) {
      this.netState = "rooms";
      net.listRooms();
    } else {
      this.netState = "login";
    }
    this.rebuild();
  }

  private closeNet() {
    this.netOpen = false;
    this.netFocused = null;
    this.rebuild();
  }

  /** 键盘事件路由：战网面板输入框优先 */
  private onNetKey(ev: KeyboardEvent) {
    if (!this.netOpen) return;
    if (ev.key === "Enter" && this.netState === "login") {
      ev.preventDefault();
      this.doLogin();
      return;
    }
    if (this.netState !== "login" || !this.netFocused) return;
    if (ev.key === "Backspace") {
      ev.preventDefault();
      if (this.netFocused === "user") this.netUser = this.netUser.slice(0, -1);
      else this.netPass = this.netPass.slice(0, -1);
      this.refreshNetField(this.netFocused);
      return;
    }
    if (ev.key.length === 1 && /^[\x21-\x7e]$/.test(ev.key)) {
      // 可见 ASCII（面板输入仅支持字母数字等；中文用户名请用注册后服务端校验的名字）
      if (this.netFocused === "user" && this.netUser.length < 16) {
        this.netUser += ev.key;
        this.refreshNetField("user");
      } else if (this.netFocused === "pass" && this.netPass.length < 32) {
        this.netPass += ev.key;
        this.refreshNetField("pass");
      }
    }
  }

  /** 键入后只更新对应输入框文本（不整面板重建） */
  private refreshNetField(field: "user" | "pass") {
    const txt = this.netFieldTexts[field];
    if (!txt) return;
    const value = field === "user" ? this.netUser : "*".repeat(this.netPass.length);
    txt.setText(value + (this.netFocused === field ? "_" : ""));
  }

  /** 注册（成功自动登录；网络异常/混合内容拦截等 fetch 抛错也给出可见反馈） */
  private async doRegister() {
    if (this.netBusy) return;
    this.netBusy = true;
    this.showNetMsg(t("net.busy"));
    try {
      const r = await net.register(this.netUser, this.netPass);
      if (r.code !== 0) {
        this.showNetMsg(r.msg ?? "register failed");
        return;
      }
      this.showNetMsg(t("net.regOk"));
      await this.doLogin();
    } catch {
      this.showNetMsg(t("net.connFail", { addr: NET_HTTP_BASE }));
    } finally {
      this.netBusy = false;
    }
  }

  /** 登录 → 建立 WS → 房间列表（fetch 抛错同样可见反馈） */
  private async doLogin() {
    if (this.netBusy) return;
    this.netBusy = true;
    this.showNetMsg(t("net.busy"));
    try {
      const r = await net.login(this.netUser, this.netPass);
      if (r.code !== 0) {
        this.showNetMsg(r.msg ?? "login failed");
        return;
      }
      try {
        await net.connect();
      } catch {
        this.showNetMsg(t("net.connFail", { addr: NET_HTTP_BASE }));
        return;
      }
      this.registerNetHandlers();
      this.netState = "rooms";
      this.netMsg = "";
      net.listRooms();
      this.rebuild();
    } catch {
      this.showNetMsg(t("net.connFail", { addr: NET_HTTP_BASE }));
    } finally {
      this.netBusy = false;
    }
  }

  /** 点击房间行加入 */
  private joinRoomById(roomId: string) {
    net.joinRoom(roomId, this.race);
    // room_state 到达后 registerNetHandlers 会切到 inroom
  }

  /** 房间内离开 → 回房间列表 */
  private leaveRoomUi() {
    net.leaveRoom();
    this.currentRoom = null;
    this.netState = "rooms";
    net.listRooms();
    this.rebuild();
  }

  /** 房主点击开始 */
  private startBattle() {
    const room = this.currentRoom;
    if (!room) return;
    const me = room.players.find((p) => p.uid === net.userId);
    if (!me?.host) return;
    const countA = room.players.filter((p) => p.team === "A").length;
    const countB = room.players.filter((p) => p.team === "B").length;
    if (countA !== room.teamSize || countB !== room.teamSize) {
      this.showNetMsg(t("net.err108"));
      return;
    }
    net.start();
  }

  /**
   * 战网面板（替换对局设置面板；斜切风格同主面板）。
   * 状态机四态：login / rooms / create / inroom
   */
  private buildNetPanel(root: Phaser.GameObjects.Container) {
    const pw = 620, ph = 352, py = 55;
    const top = py - ph / 2;
    const headerX = -pw / 2 + 28;
    const panel = this.add.graphics();
    drawSlantPanel(panel, 0, py, pw, ph, C.panelFill, C.border, 0.94);
    root.add(panel);

    // 标题 + 琥珀下划线
    const headerTxt = this.add.text(headerX, top + 16, t("net.title"), {
      fontFamily: FONT, fontSize: "20px", fontStyle: "bold", color: C.amberText,
    }).setOrigin(0, 0.5);
    root.add(headerTxt);
    panel.fillStyle(C.amber, 0.9);
    panel.fillRect(headerX, top + 34, Math.min(pw - 56, headerTxt.width + 6), 2);

    // 返回按钮（右上角）
    this.addNetBtn(root, pw / 2 - 70, top + 28, 84, 32, t("net.back"), "13px", () => this.closeNet(), "netback");

    // 提示/错误消息行（面板底部）
    if (this.netMsg) {
      root.add(this.add.text(headerX, top + ph - 20, this.netMsg, {
        fontFamily: FONT, fontSize: "13px", color: "#e07b7b", wordWrap: { width: pw - 56 },
      }).setOrigin(0, 0.5));
    }

    if (this.netState === "login") this.buildNetLogin(root, top, pw);
    else if (this.netState === "rooms") this.buildNetRooms(root, top, pw);
    else if (this.netState === "create") this.buildNetCreate(root, top, pw);
    else this.buildNetInRoom(root, top, pw);
  }

  /** 通用斜切小按钮：绘制 + 命中区 + hover 着色；key 参与 hover 状态 */
  private addNetBtn(
    root: Phaser.GameObjects.Container,
    x: number, y: number, w: number, h: number,
    label: string, fontSize: string, onClick: () => void, key: string,
    opts?: { disabled?: boolean; selected?: boolean }
  ) {
    const g = this.add.graphics();
    this.btnGfx[key] = g;
    root.add(g);
    const txt = this.add.text(x, y, label, {
      fontFamily: FONT, fontSize, fontStyle: "bold",
      color: opts?.disabled ? C.dim : opts?.selected ? C.amberText : C.text,
    }).setOrigin(0.5);
    this.btnText[key] = txt;
    root.add(txt);
    const draw = () => {
      g.clear();
      const hov = this.hoverKey === key;
      const fill = opts?.disabled ? C.panelFill : opts?.selected ? C.panelFillSel : hov ? C.panelFillHover : C.panelFill;
      const border = opts?.disabled ? C.border : opts?.selected ? C.amber : hov ? C.bevelLight : C.border;
      drawSlantPanel(g, x, y, w, h, fill, border);
    };
    draw();
    const zone = this.add.zone(this.scale.gameSize.width / 2 + x, this.scale.gameSize.height / 2 + y, w, h)
      .setInteractive({ useHandCursor: !opts?.disabled });
    zone.on("pointerover", () => { if (!opts?.disabled) { this.hoverKey = key; draw(); } });
    zone.on("pointerout", () => { if (this.hoverKey === key) { this.hoverKey = null; draw(); } });
    zone.on("pointerdown", () => { if (!opts?.disabled) onClick(); });
    this.zones.push(zone);
  }

  /** 登录/注册页 */
  private buildNetLogin(root: Phaser.GameObjects.Container, top: number, pw: number) {
    const labelX = -pw / 2 + 40;
    const fieldX = 40;
    // 用户名
    root.add(this.add.text(labelX, top + 84, t("net.user"), {
      fontFamily: FONT, fontSize: "15px", color: C.text,
    }).setOrigin(0, 0.5));
    const ug = this.add.graphics();
    drawSlantPanel(ug, fieldX + 130, top + 84, 280, 40, 0x0a1120, C.border);
    root.add(ug);
    const ut = this.add.text(fieldX + 130, top + 84, this.netUser + (this.netFocused === "user" ? "_" : ""), {
      fontFamily: FONT, fontSize: "16px", color: C.amberText,
    }).setOrigin(0.5);
    this.netFieldTexts.user = ut;
    root.add(ut);
    const uz = this.add.zone(this.scale.gameSize.width / 2 + fieldX + 130, this.scale.gameSize.height / 2 + top + 84, 280, 40)
      .setInteractive({ useHandCursor: true });
    uz.on("pointerdown", () => { this.netFocused = "user"; this.refreshNetField("user"); this.refreshNetField("pass"); });
    this.zones.push(uz);

    // 密码
    root.add(this.add.text(labelX, top + 144, t("net.pass"), {
      fontFamily: FONT, fontSize: "15px", color: C.text,
    }).setOrigin(0, 0.5));
    const pg = this.add.graphics();
    drawSlantPanel(pg, fieldX + 130, top + 144, 280, 40, 0x0a1120, C.border);
    root.add(pg);
    const pt = this.add.text(fieldX + 130, top + 144, "*".repeat(this.netPass.length) + (this.netFocused === "pass" ? "_" : ""), {
      fontFamily: FONT, fontSize: "16px", color: C.amberText,
    }).setOrigin(0.5);
    this.netFieldTexts.pass = pt;
    root.add(pt);
    const pz = this.add.zone(this.scale.gameSize.width / 2 + fieldX + 130, this.scale.gameSize.height / 2 + top + 144, 280, 40)
      .setInteractive({ useHandCursor: true });
    pz.on("pointerdown", () => { this.netFocused = "pass"; this.refreshNetField("user"); this.refreshNetField("pass"); });
    this.zones.push(pz);

    // 登录 / 注册
    this.addNetBtn(root, -80, top + 216, 150, 48, t("net.login"), "17px", () => this.doLogin(), "netlogin");
    this.addNetBtn(root, 80, top + 216, 150, 48, t("net.register"), "17px", () => this.doRegister(), "netreg");
  }

  /** 房间列表页 */
  private buildNetRooms(root: Phaser.GameObjects.Container, top: number, pw: number) {
    const hx = -pw / 2 + 40;
    root.add(this.add.text(hx, top + 58, t("net.loggedAs", {
      name: net.username, wins: net.wins, losses: net.losses,
    }), {
      fontFamily: FONT, fontSize: "14px", color: C.text,
    }).setOrigin(0, 0.5));

    // 右侧竖排操作列（返回在面板右上角 top+28，刷新/创建依次向下——横排放不下三个按钮）
    this.addNetBtn(root, pw / 2 - 70, top + 72, 110, 34, t("net.refresh"), "13px", () => net.listRooms(), "netrefresh");
    this.addNetBtn(root, pw / 2 - 70, top + 116, 110, 34, t("net.createRoom"), "13px", () => {
      this.netState = "create";
      this.rebuild();
    }, "netcreate");

    // 房间行（最多 6 行，未开局的可加入；宽 430 左移避让右侧操作列）
    const rows = this.roomList.filter((r) => !r.started).slice(0, 6);
    if (rows.length === 0) {
      root.add(this.add.text(-40, top + 150, t("net.noRooms"), {
        fontFamily: FONT, fontSize: "14px", color: C.dim,
      }).setOrigin(0.5));
    }
    rows.forEach((r, i) => {
      const y = top + 112 + i * 34;
      const label = `${r.id}   ${r.teamSize}v${r.teamSize}   ${r.count}/${r.max}`;
      this.addNetBtn(root, -25, y, 430, 32, label, "15px", () => this.joinRoomById(r.id), `roomrow_${r.id}`);
    });

    if (rows.length > 0) {
      root.add(this.add.text(-25, top + 112 + (rows.length - 1) * 34 + 21, t("net.joinHint"), {
        fontFamily: FONT, fontSize: "12px", color: C.dim,
      }).setOrigin(0.5));
    }
  }

  /** 创建房间页（规模 + 种族） */
  private buildNetCreate(root: Phaser.GameObjects.Container, top: number, pw: number) {
    root.add(this.add.text(-pw / 2 + 40, top + 62, t("net.modeLabel"), {
      fontFamily: FONT, fontSize: "15px", color: C.text,
    }).setOrigin(0, 0.5));
    // 规模档位 1v1~4v4（房间上限 8 人；>4 人共用出生角落，主基地自动偏移）
    [1, 2, 3, 4].forEach((n, i) => {
      const x = -225 + i * 150;
      this.addNetBtn(root, x, top + 108, 130, 44, `${n}v${n}`, "17px", () => {
        this.netTeamSize = n;
        this.rebuild();
      }, `netsize${n}`, { selected: this.netTeamSize === n });
    });

    root.add(this.add.text(-pw / 2 + 40, top + 164, t("net.teamLabel"), {
      fontFamily: FONT, fontSize: "15px", color: C.text,
    }).setOrigin(0, 0.5));
    RACES.forEach((r, i) => {
      const x = -225 + i * 150;
      this.addNetBtn(root, x, top + 210, 130, 44, t(r.labelKey), "14px", () => {
        this.race = r.id;
        this.rebuild();
      }, `netrace_${r.id}`, { selected: this.race === r.id });
    });

    this.addNetBtn(root, 0, top + 288, 220, 48, t("net.confirmCreate"), "18px", () => {
      net.createRoom(this.netTeamSize, this.race);
    }, "netconfirm");
  }

  /** 房间内页（双列阵营表 + 开始/离开） */
  private buildNetInRoom(root: Phaser.GameObjects.Container, top: number, _pw: number) {
    const room = this.currentRoom;
    if (!room) return;
    const me = room.players.find((p) => p.uid === net.userId);
    const countA = room.players.filter((p) => p.team === "A").length;
    const countB = room.players.filter((p) => p.team === "B").length;
    const ready = countA === room.teamSize && countB === room.teamSize;
    const iAmHost = !!me?.host;

    root.add(this.add.text(0, top + 56, t("net.roomId", { id: room.roomId, n: room.teamSize }), {
      fontFamily: FONT, fontSize: "18px", fontStyle: "bold", color: C.amberText,
    }).setOrigin(0.5));
    root.add(this.add.text(0, top + 84, t("net.switchHint"), {
      fontFamily: FONT, fontSize: "12px", color: C.dim,
    }).setOrigin(0.5));

    // 双列阵营（点击列 = 换阵营）
    const colX = { A: -160, B: 160 };
    for (const team of ["A", "B"] as const) {
      const count = team === "A" ? countA : countB;
      this.addNetBtn(root, colX[team], top + 124, 280, 34,
        `${t(`net.team${team}`)}  ${count}/${room.teamSize}`, "15px",
        () => { if (me && me.team !== team) net.setTeam(team); },
        `netcol${team}`, { selected: me?.team === team });
      const members = room.players.filter((p) => p.team === team).sort((a, b) => a.slot - b.slot);
      members.forEach((p, i) => {
        const y = top + 156 + i * 30;
        const tags: string[] = [];
        if (p.host) tags.push(`★${t("net.hostTag")}`);
        if (p.uid === net.userId) tags.push("(you)");
        if (!p.online) tags.push(t("net.offlineTag"));
        const line = `${p.name}  ${raceShort(p.race)}  ${tags.join(" ")}`;
        root.add(this.add.text(colX[team], y, line, {
          fontFamily: FONT, fontSize: "14px",
          color: p.uid === net.userId ? C.amberText : C.text,
        }).setOrigin(0.5));
      });
    }

    // 开始（房主且对等才可用）/ 离开
    this.addNetBtn(root, iAmHost ? -110 : -160, top + 300, 220, 48,
      iAmHost ? t("net.start") : t("net.waitHost"), "17px",
      () => this.startBattle(), "netstart", { disabled: !iAmHost || !ready });
    this.addNetBtn(root, 130, top + 300, 160, 48, t("net.leave"), "15px",
      () => this.leaveRoomUi(), "netleave");
  }
}

/** 种族缩写（房间成员行） */
function raceShort(race: Race): string {
  return race === "terran" ? "T" : race === "protoss" ? "P" : "Z";
}

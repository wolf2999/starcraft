import * as Phaser from "phaser";
import { Entity } from "../entities";
import {
  ALL_DEFS,
  RESOURCE_DEFS,
  UNITS as TERRAN_UNITS,
  PROTOSS_UNITS,
  ZERG_UNITS,
  BUILDINGS as TERRAN_BUILDINGS,
  PROTOSS_BUILDINGS,
  ZERG_BUILDINGS,
  Owner,
  ownerIsAI,
  ownerColor,
  AI_AGGRESSIVE,
} from "../config";
import { generateAll } from "../Textures";
import {
  TILE_W,
  TILE_H,
  worldToScreen,
  screenToWorld,
  minZoom,
  MAP_W,
  MAP_H,
  MAP_LEFT,
  MAP_TOP,
  MAP_COLS,
  MAP_ROWS,
} from "../iso";
import { heightAt, typeAt } from "../terrain";
import { buildTerrainTilemap } from "../tilemap";
import { getLostTemple } from "../maps/lostTemple";
import { initLiquidUI, HUD_H, type LiquidUI } from "../ui/liquidHud";
import { LiquidButton } from "liquidphaser/liquid";
import { MouseEvent as LiquidMouseEvent, TextFormat } from "liquidphaser/fl";
import type { Def } from "../config";

export class GameScene extends Phaser.Scene {
  entities: Entity[] = [];
  selection: Entity[] = [];
  selecting = false;
  /** 框选起点：世界屏幕坐标（相机空间像素）。等距下不能用格坐标矩形判定，见 onPointerUp */
  selStartPx = new Phaser.Math.Vector2();
  selRect!: Phaser.GameObjects.Graphics;
  attackMoveMode = false;
  attackMoveCursor!: Phaser.GameObjects.Graphics;

  // 相机中键拖动状态：按下点（画布像素）+ 按下时的相机 scroll 起点
  cameraDragging = false;
  dragStartPx = new Phaser.Math.Vector2();
  dragCamScroll = new Phaser.Math.Vector2();

  // 分层容器：地图层(底) / 单位层(中) / UI 层(顶)。
  // 容器本身固定在 (0,0)、scale=1，子对象用世界坐标直接定位，渲染结果与加入根显示列表一致，
  // 但 DevTools inspector 能按这三层看到真实场景树（而非平铺 1279 个 Image）。
  mapLayer!: Phaser.GameObjects.Container;
  entityLayer!: Phaser.GameObjects.Container;
  uiLayer!: Phaser.GameObjects.Container;

  supplyProvided = 0;
  supplyUsed = 0;
  minerals = 50;
  vespene = 0;

  creepLayer!: Phaser.GameObjects.Graphics;
  resourceLayer!: Phaser.GameObjects.Container;
  larvaTimers: { ent: Entity; t: number }[] = [];
  cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

  /** Liquid UI 层（底部指挥条 + 右上角小地图），皮肤异步加载完成后就绪 */
  liquidUI?: LiquidUI;
  /** 小地图按住拖动中（pointerdown 命中小地图后置位） */
  mapDragging = false;

  // —— 建造系统（人族单 SCV 版）——
  /** 建造面板（B 键开关）：LiquidButton 挂在 Liquid stage 上；rect 拦截面板区域的世界输入 */
  buildPanel: {
    buttons: { btn: any; defId: string }[];
    visible: boolean;
    rect: { x: number; y: number; w: number; h: number };
  } | null = null;
  /** 幽灵放置状态：null = 未在放置模式 */
  placing: {
    defId: string;
    ghost: Phaser.GameObjects.Image;
    ring: Phaser.GameObjects.Graphics;
    gx: number;
    gy: number;
    valid: boolean;
  } | null = null;
  /** 建造面板/幽灵下的资源余额快照（打开面板时刷新按钮可用态用） */
  panelRefreshTick = 0;
  /** 临时提示文本（被拒绝操作的可见反馈，自动淡出） */
  hintText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super("game");
  }

  preload() {
    // Tiled 导出的等距地图（地形层 + 瓦片引用），运行期由 buildTerrainTilemap 消费
    this.load.tilemapTiledJSON("lost-temple", "maps/lost-temple.tmj");
    // 等距地形 tileset 贴图（5 帧横排 64×64：菱形顶面 + 侧面带，low/high/ramp/water/bridge）。
    // 优先用真实 PNG（可用 scripts/gen-tileset.mjs 或从外部导入）；
    // 若加载失败（资源缺失），ensureTerrainTileset 会兜底生成 program texture。
    // terrain.png 真源在 public/maps/（与 lost-temple.tmj 同目录），
    // 用无 ../ 的相对引用，Tiled 与游戏端都能稳定找到。
    this.load.image("terrain", "maps/terrain.png");
  }

  create() {
    try {
      // 分层容器：地图层(底) / 单位层(中) / UI 层(顶)。必须在其它对象创建前建立。
      this.mapLayer = this.add.container(0, 0).setDepth(-1000);
      this.entityLayer = this.add.container(0, 0).setDepth(0);
      this.uiLayer = this.add.container(0, 0).setDepth(1000);

      // 选择框 / 攻击移动光标 → UI 层（永远最上）
      this.selRect = this.add.graphics().setDepth(6000);
      this.uiLayer.add(this.selRect);
      this.attackMoveCursor = this.add.graphics().setDepth(6000);
      this.uiLayer.add(this.attackMoveCursor);

      this.cameras.main.setBackgroundColor("#10221a");
      // 菌毯 → 地图层（位于地形瓦片之上）
      this.creepLayer = this.add.graphics();
      this.creepLayer.setDepth(5);
      this.mapLayer.add(this.creepLayer);

      generateAll(this);

      // 加载 Lost Temple 风格地图（地形 + 资源 + 出生点）
      const map = getLostTemple();
      // 用 Phaser Tilemap + Tiled 渲染地形（maps/lost-temple.tmj），
      // 并由瓦片 gid 反推地形网格供寻路/出生点使用
      buildTerrainTilemap(this, this.mapLayer);

      // 资源节点
      map.resources.forEach((r) => this.spawnResource(r.kind, r.gx, r.gy));

      // 出生点（基地 + 附属单位）
      for (const b of map.bases) {
        this.spawnFromDef(b.gx, b.gy, b.defId, b.owner, true);
        if (b.units) {
          for (const u of b.units) {
            this.spawnFromDef(b.gx + u.dx, b.gy + u.dy, u.defId, b.owner);
          }
        }
      }

      this.updateSupply();

      // 相机：初始放大并对准玩家出生点，让开局单位清晰分离、可逐个点选。
      // 之前整张 32×32 地图被缩到一屏（zoom≈0.59），玩家基地被挤到屏幕顶端一条
      // ~76×28px 的窄带里，多个单位完全重叠成一团，导致“只能选中露在外面的 1~2 个”。
      const cam = this.cameras.main;
      // 星际式固定视距：不可缩放，恒 1:1（窗口宽于地图 2048×2080 时按
      // minZoom 自动放大撑满，仍不露黑边——见 iso.ts 与下方 resize 监听）。
      const gw = this.scale.gameSize.width;
      const gh = this.scale.gameSize.height;
      const playerBase = map.bases.find((b) => b.owner === "player");
      const focus = playerBase
        ? worldToScreen(playerBase.gx, playerBase.gy)
        : { sx: gw / 2, sy: gh / 2 };
      cam.setZoom(Math.max(1, minZoom(gw, gh)));
      // Phaser 4 RESIZE 下 camera.width/height 恒 0（框架未自动同步），
      // 会导致：setBounds 失效、input 的 worldX/worldY 换算错误（框选/点选全废）。
      // 显式 setSize 让相机矩形跟随窗口，输入坐标换算恢复正确。
      cam.setSize(gw, gh);
      this.centerCamOn(focus.sx, focus.sy);
      // 出血位为 0：地图屏幕轮廓是 2048×2080 近似正方形（iso.ts），相机边界
      // 贴地形谷线矩形（MAP_LEFT/TOP + MAP_W/H）。注意 Phaser 4 RESIZE 下
      // cam.width 恒 0，setBounds 的自动钳制失效，实际夹紧靠 clampCamScroll()
      // （update 每帧兜底 + resize/跳转时主动调用）。
      cam.setBounds(MAP_LEFT, MAP_TOP, MAP_W, MAP_H);
      cam.setBackgroundColor("#10221a");

      this.cursors = this.input.keyboard?.createCursorKeys();

      // 窗口尺寸变化（RESIZE 模式）：不可缩放（星际式 1:1 视距）。窗口宽于地图
      // （minZoom>1）时自动放大撑满，并夹紧视野，任何窗口都无黑边
      this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
        const w = gameSize.width;
        const h = gameSize.height;
        this.cameras.main.setZoom(Math.max(1, minZoom(w, h)));
        this.cameras.main.setSize(w, h);
        this.clampCamScroll();
        this.liquidUI?.layout(w, h);
        // 面板坐标基于旧窗口尺寸，直接关闭（下次按 B 重建）
        this.closeBuildPanel();
      });

      // Liquid UI（底部指挥条 + 右上角小地图，Phaser 屏幕层渲染，替代 DOM HUD）。
      // 皮肤 png 异步加载：就绪前 updateHud/setStats 调用走空，就绪后立即补一次。
      void initLiquidUI(this).then((ui) => {
        this.liquidUI = ui;
        this.updateHud();
      });

      this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onPointerDown(p));
      this.input.on("pointerup", (p: Phaser.Input.Pointer) => this.onPointerUp(p));
      this.input.on("pointermove", (p: Phaser.Input.Pointer) => this.onPointerMove(p));
      this.input.keyboard?.on("keydown-A", () => {
        this.attackMoveMode = true;
      });
      // B：开关建造面板（需选中有 builds 清单的单位，如 SCV）
      this.input.keyboard?.on("keydown-B", () => this.toggleBuildPanel());
      this.input.keyboard?.on("keydown-ESC", () => {
        this.attackMoveMode = false;
        this.clearSelection();
        // ESC 优先退出幽灵放置，其次关闭建造面板
        if (this.placing) this.exitPlacing();
        else this.closeBuildPanel();
      });
    } catch (e: any) {
      const errText = this.add
        .text(12, 80, "ERROR: " + (e?.message || String(e)), {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#ff6666",
          backgroundColor: "#000000cc",
        })
        .setDepth(10000);
      // 错误提示也归 UI 层（若有 uiLayer 已建立）
      if (this.uiLayer) this.uiLayer.add(errText);
      console.error(e);
    }
  }

  /** 相机视口宽（画布像素 / zoom）。Phaser 4 RESIZE 下 cam.width 恒 0，必须用 gameSize */
  camViewW() {
    return this.scale.gameSize.width / this.cameras.main.zoom;
  }
  camViewH() {
    return this.scale.gameSize.height / this.cameras.main.zoom;
  }

  /** 把相机 scroll 夹紧到地图谷线矩形内（替代 RESIZE 下失效的 setBounds 自动钳制） */
  clampCamScroll() {
    const cam = this.cameras.main;
    const vw = this.camViewW();
    const vh = this.camViewH();
    cam.scrollX = Phaser.Math.Clamp(
      cam.scrollX,
      MAP_LEFT,
      Math.max(MAP_LEFT, MAP_LEFT + MAP_W - vw)
    );
    cam.scrollY = Phaser.Math.Clamp(
      cam.scrollY,
      MAP_TOP,
      Math.max(MAP_TOP, MAP_TOP + MAP_H - vh)
    );
  }

  /** 相机居中到世界屏幕坐标 (sx, sy)（替代 Phaser 4 行为异常的 centerOn） */
  centerCamOn(sx: number, sy: number) {
    const cam = this.cameras.main;
    cam.scrollX = sx - this.camViewW() / 2;
    cam.scrollY = sy - this.camViewH() / 2;
    this.clampCamScroll();
  }

  spawnResource(id: string, gx: number, gy: number) {
    const def = RESOURCE_DEFS[id];
    const e = new Entity(this, def, gx, gy, "neutral", this.entityLayer);
    e.hideHpBar = true;
    // 资源容器也按等距排序（与 constructor 里的非建筑公式一致）
    e.container.setDepth(1000 + gx + gy);
    this.entities.push(e);
  }

  spawnFromDef(
    x: number,
    y: number,
    defId: string,
    owner: Owner,
    constructed = true
  ): Entity {
    const def = ALL_DEFS[defId];
    if (!def) return null as any;
    const e = new Entity(this, def, x, y, owner, this.entityLayer);
    e.constructed = constructed;

    if (def.isBuilding) {
      // 建筑容器 depth 用 200+x+y，低于单位层（1000+…），保证单位绘制在建筑物之上。
      e.container.setDepth(200 + x + y);
    }

    if (def.isNeutral) {
      // 资源节点无所属
    } else if (ownerIsAI(owner)) {
      // AI 阵营按各自颜色染色
      e.setFaction(owner, ownerColor(owner));
      // 好斗（主动索敌/移动）受全局调试开关控制，便于单独调玩家单位
      if (AI_AGGRESSIVE && (def.groundDamage || def.airDamage) && !def.isBuilding) {
        e.aggressive = true;
      }
    }

    // 初始化战斗特效回调
    e.onAttack = (from, to) => this.drawShot(from, to);

    // 菌毯视觉
    if (def.needsCreep) {
      this.drawCreep(x, y);
    }

    // 升级替换（如孵化场→巢穴→母巢）
    if (def.upgradeOf) {
      const old = this.entities.find(
        (b) => b.def.id === def.upgradeOf && Math.abs(b.x - x) < 1 && Math.abs(b.y - y) < 1
      );
      if (old) old.alive = false;
    }

    // 供给（升级建筑不重复计数；未完工建筑完工后才计入人口上限）
    if (def.supplyProvided && owner !== "neutral" && !def.upgradeOf && constructed) {
      this.supplyProvided += def.supplyProvided;
    }
    // 施工中表现：半透明地基，起始 10% HP 随施工进度回复到满
    if (def.isBuilding && !constructed) {
      e.sprite.setAlpha(0.55);
      e.hp = Math.max(1, Math.round(e.maxHp * 0.1));
    }

    // 虫族幼虫依附
    if (def.canProduceLarva) {
      this.attachLarvae(e);
    }

    this.entities.push(e);
    return e;
  }

  attachLarvae(building: Entity) {
    const spots = [
      [building.x - 0.6, building.y + 0.6],
      [building.x + 0.6, building.y + 0.6],
      [building.x, building.y + 1.0],
    ];
    // 每个幼虫都是独立 Entity，自带 Container 并加入 entityLayer；
    // 不再单独包一个空 larvaeContainer（之前那个容器没有任何子节点，纯属多余）。
    spots.forEach(([lx, ly]) => {
      const l = this.spawnFromDef(lx, ly, "larva", building.owner);
      if (l) (building as any)._larvae = ((building as any)._larvae || []).concat(l);
    });
  }

  drawCreep(cx: number, cy: number) {
    const radius = 3;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (Math.abs(dx) + Math.abs(dy) > radius) continue;
        const { sx, sy } = worldToScreen(cx + dx + 0.5, cy + dy + 0.5);
        this.creepLayer.fillStyle(0x963cab, 0.5);
        // 等距地面：菌毯按 2:1 菱形铺
        this.creepLayer.fillPoints(
          [
            new Phaser.Math.Vector2(sx, sy - TILE_H / 2),
            new Phaser.Math.Vector2(sx + TILE_W / 2, sy),
            new Phaser.Math.Vector2(sx, sy + TILE_H / 2),
            new Phaser.Math.Vector2(sx - TILE_W / 2, sy),
          ],
          true
        );
      }
    }
  }

  onPointerDown(p: Phaser.Input.Pointer) {
    // UI 层命中（底部指挥条 / 小地图）：拦截世界输入。
    // 小地图命中 → 进入按住拖动跳转模式（星际行为），不触发框选/指令。
    if (this.liquidUI) {
      if (this.liquidUI.minimap.hit(p.x, p.y)) {
        this.mapDragging = true;
        this.liquidUI.minimap.jumpAt(p.x, p.y, (sx, sy) => this.centerCamOn(sx, sy));
        return;
      }
      if (this.liquidUI.hitUI(p.x, p.y)) return;
    }

    // 建造面板区域：按钮点击由 liquid 桥接处理，这里拦截世界输入避免误框选/误指令
    if (this.buildPanel?.visible && this.hitBuildPanel(p.x, p.y)) return;

    // 幽灵放置模式：右键取消，左键落子；不进入框选/指令分支
    if (this.placing) {
      if (p.rightButtonDown()) {
        this.exitPlacing();
        return;
      }
      if (p.leftButtonDown()) {
        this.tryPlaceBuilding();
        return;
      }
    }

    // 中键拖动地图：优先于框选/指令，避免误触发左键框选。
    // 拖动范围由 cam.setBounds（贴地形包围盒，出血位 0）自动夹紧。
    if (p.middleButtonDown()) {
      this.cameraDragging = true;
      this.dragStartPx.set(p.x, p.y);
      const cam = this.cameras.main;
      this.dragCamScroll.set(cam.scrollX, cam.scrollY);
      return;
    }

    if (this.attackMoveMode) {
      // 攻击移动：把屏幕点击反投影成世界坐标
      const w = screenToWorld(p.worldX, p.worldY);
      this.selection.forEach((e) => {
        if (!e.def.isBuilding) e.attackMoveTo(w.wx, w.wy);
      });
      this.attackMoveMode = false;
      this.attackMoveCursor.clear();
      return;
    }

    if (p.rightButtonDown()) {
      const w = screenToWorld(p.worldX, p.worldY);
      this.commandRightClick(w.wx, w.wy);
      return;
    }

    // 左键开始框选：记录世界屏幕坐标起点（相机空间像素）。
    // 框选判定必须用屏幕矩形（与用户画的框一致），不能用格坐标（等距下是菱形）。
    this.selecting = true;
    this.selStartPx.set(p.worldX, p.worldY);
  }

  onPointerMove(p: Phaser.Input.Pointer) {
    // 小地图按住拖动：持续跳转相机（星际行为——按住小地图边缘可连续平移视野）
    if (this.mapDragging) {
      if (p.leftButtonReleased()) return; // 松开在 onPointerUp 统一收尾
      this.liquidUI?.minimap.jumpAt(p.x, p.y, (sx, sy) => this.centerCamOn(sx, sy));
      return;
    }
    // 中键拖动中：按位移差反向平移相机（除以 zoom 把画布像素换算回世界像素）
    if (this.cameraDragging) {
      const cam = this.cameras.main;
      cam.scrollX = this.dragCamScroll.x - (p.x - this.dragStartPx.x) / cam.zoom;
      cam.scrollY = this.dragCamScroll.y - (p.y - this.dragStartPx.y) / cam.zoom;
      return;
    }
    // 幽灵放置：跟随指针（吸附格 + 红绿合法性）
    if (this.placing) {
      this.updatePlacingGhost(p.worldX, p.worldY);
      return;
    }
    if (this.attackMoveMode) {
      const w = screenToWorld(p.worldX, p.worldY);
      const { sx, sy } = worldToScreen(w.wx, w.wy);
      this.attackMoveCursor.clear();
      this.attackMoveCursor.lineStyle(2, 0xff4444, 0.9);
      this.attackMoveCursor.strokeEllipse(sx, sy, 22, 11);
    }
    if (this.selecting) {
      this.selRect.clear();
      this.selRect.lineStyle(1.5, 0x66ff99, 0.9);
      this.selRect.fillStyle(0x66ff99, 0.12);
      // 起终点都是世界屏幕坐标（相机空间像素），直接构成可视矩形
      const x = Math.min(this.selStartPx.x, p.worldX);
      const y = Math.min(this.selStartPx.y, p.worldY);
      const w = Math.abs(p.worldX - this.selStartPx.x);
      const h = Math.abs(p.worldY - this.selStartPx.y);
      this.selRect.fillRect(x, y, w, h);
      this.selRect.strokeRect(x, y, w, h);
    }
  }

  onPointerUp(p: Phaser.Input.Pointer) {
    // 小地图拖动结束：吞掉本次抬起，不触发框选/点选判定
    if (this.mapDragging) {
      this.mapDragging = false;
      return;
    }
    // 抬起在 UI 区域（指挥条）：吞掉，避免误触发清空选区/移动指令
    if (this.liquidUI?.hitUI(p.x, p.y)) return;
    // 中键拖动结束：吞掉本次抬起，不触发框选/点选判定
    if (this.cameraDragging) {
      this.cameraDragging = false;
      return;
    }
    if (!this.selecting) return;
    this.selecting = false;
    this.selRect.clear();
    // 终点也反投影成游戏世界坐标（格坐标），与 entity.x/y 同一坐标系
    const w = screenToWorld(p.worldX, p.worldY);
    // 点选 vs 框选：起终点屏幕距离几乎为零 → 点选（阈值 8px，容忍手抖）
    const ww = Math.abs(p.worldX - this.selStartPx.x);
    const wh = Math.abs(p.worldY - this.selStartPx.y);

    if (ww < 8 && wh < 8) {
      // 点选：屏幕空间判定——实体中心（含地形高度）投回屏幕，与点击点比像素距离。
      // 判定半径 = 精灵实际半宽 + 8px 手抖容差，贴精灵本体。
      // 历史教训两版：① e.r(像素) 被当格用 → 判定圈 ≈7.9 格(屏幕 ~500px)，
      // 点哪都选中最近单位；② 改 e.r/TILE_W+0.2 后只有 ~14px 斜菱形，且精灵
      // 锚点 origin(0.5,0.72) 使本体偏向中心上方——点 SCV 下缘常选不中，
      // selection 为空，右键矿/气泉看似"没反应"（实际是选中那步就失败了）。
      let best: Entity | null = null;
      let bestD = Infinity;
      for (const e of this.entities) {
        if (!e.alive || e.owner !== "player" || e.def.isNeutral) continue;
        const es = worldToScreen(e.x, e.y, heightAt(e.x, e.y));
        const dpx = Phaser.Math.Distance.Between(p.worldX, p.worldY, es.sx, es.sy);
        const rr = e.sprite.displayWidth / 2 + 8;
        if (dpx < rr && dpx < bestD) {
          bestD = dpx;
          best = e;
        }
      }
      if (best) {
        // 点中我方单位：替换选区（与星际一致——左键点单位=选中该单位）
        this.clearSelection();
        best.selected = true;
        this.selection.push(best);
      } else if (this.selection.length > 0) {
        // 点中空地且已有选区：下达移动指令（左键也能移动，更直观，
        // 避免用户误用左键点空地导致选区被清空而“无法移动”）
        this.commandRightClick(w.wx, w.wy);
      } else {
        // 空地且无选区：清空
        this.clearSelection();
      }
    } else {
      // 框选：星际语义 = 单位中心落在“屏幕矩形”内即选中（用户画的就是屏幕框）。
      // 等距投影下格坐标轴对齐矩形对应的屏幕区域是旋转菱形，若按格矩形判定
      // 会与视觉框不一致而大量漏选——因此把单位中心投回屏幕再做矩形判定。
      // 星际规则：框选只选单位；建筑不参与框选，只能左键点选。
      this.clearSelection();
      const sx1 = Math.min(this.selStartPx.x, p.worldX);
      const sx2 = Math.max(this.selStartPx.x, p.worldX);
      const sy1 = Math.min(this.selStartPx.y, p.worldY);
      const sy2 = Math.max(this.selStartPx.y, p.worldY);
      for (const e of this.entities) {
        if (!e.alive || e.owner !== "player" || e.def.isNeutral || e.def.isBuilding) continue;
        const s = worldToScreen(e.x, e.y);
        if (s.sx >= sx1 && s.sx <= sx2 && s.sy >= sy1 && s.sy <= sy2) {
          e.selected = true;
          this.selection.push(e);
        }
      }
    }
  }

  commandRightClick(wx: number, wy: number) {
    for (const e of this.selection) {
      if (e.def.isBuilding) continue;
      // 任何新指令都取消进行中的建造
      e.buildTarget = null;

      // 未完工的我方建筑：继续施工（点工地）
      let site: Entity | null = null;
      let siteD = 1.6;
      for (const o of this.entities) {
        if (!o.alive || o.owner !== "player" || !o.def.isBuilding || o.constructed) continue;
        const d = Phaser.Math.Distance.Between(wx, wy, o.x, o.y);
        if (d < siteD) {
          siteD = d;
          site = o;
        }
      }
      if (site && e.def.builds?.length) {
        e.buildTarget = site;
        e.gatherTarget = null;
        e.gatherState = "idle";
        e.combatTarget = null;
        continue;
      }

      // 攻击敌人？
      let target: Entity | null = null;
      let bestD = 1.2;
      for (const o of this.entities) {
        if (!o.alive || o.owner === "player" || o.def.isNeutral) continue;
        const d = Phaser.Math.Distance.Between(wx, wy, o.x, o.y);
        if (d < bestD) {
          bestD = d;
          target = o;
        }
      }
      if (target && e.canAttackTarget(target)) {
        e.orderAttack(target);
        continue;
      }

      // 采集资源？
      let res: Entity | null = null;
      let bestR = 1.6;
      for (const o of this.entities) {
        if (!o.alive || !o.def.isNeutral) continue;
        const d = Phaser.Math.Distance.Between(wx, wy, o.x, o.y);
        if (d < bestR) {
          bestR = d;
          res = o;
        }
      }
      if (res) {
        e.gatherTarget = res;
        e.gatherState = "toResource";
        e.combatTarget = null;
        continue;
      }

      // 普通移动
      e.attackMove = false;
      e.aggressive = false;
      e.moveTargetX = wx;
      e.moveTargetY = wy;
      e.combatTarget = null;
    }
  }

  clearSelection() {
    this.selection.forEach((e) => (e.selected = false));
    this.selection = [];
  }

  /* ============ 建造系统（人族单 SCV 版） ============ */

  /** 建筑占地（格，正方形）：按贴图宽换算，1 格 = TILE_W px；至少 1 格 */
  footprintOf(def: Def): number {
    return Math.max(1, Math.round((def.w ?? TILE_W) / TILE_W));
  }

  /** 当前是否选中有 builds 清单的可建造单位（SCV） */
  hasBuilderSelected(): boolean {
    return this.selection.some((e) => e.alive && e.owner === "player" && e.def.builds?.length);
  }

  /** B 键：开关建造面板（LiquidButton 挂 Liquid stage，两行 6 列） */
  toggleBuildPanel() {
    if (this.buildPanel?.visible) {
      this.closeBuildPanel();
      return;
    }
    if (!this.hasBuilderSelected() || !this.liquidUI) return;
    const builder = this.selection.find((e) => e.def.builds?.length)!;
    const stage = this.liquidUI.stage;
    const gh = this.scale.gameSize.height;
    const cols = 6;
    const bw = 96;
    const bh = 24;
    const gapX = 8;
    const gapY = 6;
    const rows = Math.ceil(builder.def.builds!.length / cols);
    const x0 = 16;
    // 面板在指挥条上方
    const y0 = gh - HUD_H - rows * (bh + gapY) - 8;
    const buttons: { btn: any; defId: string }[] = [];
    try {
      builder.def.builds!.forEach((defId, i) => {
        const def = ALL_DEFS[defId];
        if (!def) return;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const btn = new LiquidButton();
        btn.label = `${def.name} ${def.minerals}`;
        btn.setStyle("textFormat", new TextFormat("Consolas, 'Courier New', monospace", 12, 0xd8ffe6));
        btn.setSize(bw, bh);
        btn.position.set(x0 + col * (bw + gapX), y0 + row * (bh + gapY));
        btn.addEventListener(LiquidMouseEvent.CLICK, () => this.onBuildPick(defId));
        stage.addChild(btn);
        buttons.push({ btn, defId });
      });
    } catch (err) {
      console.warn("[buildPanel] 创建失败", err);
      return;
    }
    this.buildPanel = {
      buttons,
      visible: true,
      rect: { x: x0 - 4, y: y0 - 4, w: cols * (bw + gapX), h: rows * (bh + gapY) + 8 },
    };
    this.refreshBuildPanel();
  }

  /** 关面板：从 stage 移除并销毁按钮；若在幽灵放置也一并退出 */
  closeBuildPanel() {
    const panel = this.buildPanel;
    if (!panel) return;
    const stage = this.liquidUI?.stage;
    for (const b of panel.buttons) {
      try {
        stage?.removeChild(b.btn);
        b.btn.destroy?.();
      } catch {
        /* 组件可能已被销毁 */
      }
    }
    this.buildPanel = null;
    this.exitPlacing();
  }

  /** 屏幕坐标是否落在面板矩形内（onPointerDown 拦截世界输入用） */
  hitBuildPanel(px: number, py: number): boolean {
    const r = this.buildPanel?.rect;
    if (!r) return false;
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }

  /** 余额变化时刷新按钮可用态（买不起置灰）——updateHud 节流调用 */
  refreshBuildPanel() {
    const panel = this.buildPanel;
    if (!panel) return;
    for (const b of panel.buttons) {
      const def = ALL_DEFS[b.defId];
      if (!def) continue;
      const ok = this.minerals >= def.minerals && this.vespene >= def.vespene;
      // 皮肤就绪时 LiquidButton 文字色跟随皮肤（同 LiquidLabel 库级行为），setStyle 置灰可能不可见；
      // 改标签内容做“买不起”标记（文本内容不会被皮肤覆盖）
      const base = `${def.name} ${def.minerals}`;
      b.btn.label = ok ? base : `${base} ×`;
      b.btn.setStyle("textFormat", new TextFormat("Consolas, 'Courier New', monospace", 12, ok ? 0xd8ffe6 : 0x66766d));
    }
  }

  /** 临时提示（左下角红色文字，约 2s 后淡出）：让被拒绝的操作有可见反馈 */
  showHint(msg: string) {
    if (this.hintText) {
      this.tweens.killTweensOf(this.hintText);
      this.hintText.destroy();
      this.hintText = null;
    }
    const gh = this.scale.gameSize.height;
    const t = this.add
      .text(16, gh - HUD_H - 26, msg, {
        fontFamily: "Consolas, 'Courier New', monospace",
        fontSize: "13px",
        color: "#ffb0a0",
        backgroundColor: "#000000cc",
      })
      .setScrollFactor(0)
      .setDepth(6000);
    this.hintText = t;
    this.tweens.add({
      targets: t,
      alpha: 0,
      delay: 1600,
      duration: 400,
      onComplete: () => {
        t.destroy();
        if (this.hintText === t) this.hintText = null;
      },
    });
  }

  /** 面板按钮点击：买得起才进入幽灵放置 */
  onBuildPick(defId: string) {
    const def = ALL_DEFS[defId];
    if (!def) return;
    if (this.minerals < def.minerals || this.vespene < def.vespene) {
      // 此前静默 return → 用户视角“点了没反应”。给出可见反馈（红色提示，自动淡出）
      const lack =
        this.minerals < def.minerals
          ? `矿物不足：需要 ${def.minerals}（现有 ${this.minerals}）`
          : `瓦斯不足：需要 ${def.vespene}（现有 ${this.vespene}）`;
      console.log("[build] pick 拒绝", defId, lack);
      this.showHint(lack);
      return;
    }
    console.log("[build] pick 通过", defId);
    this.enterPlacing(defId);
  }

  /** 进入幽灵放置：半透明贴图 + 占地菱形（绿=可放 / 红=不可） */
  enterPlacing(defId: string) {
    this.exitPlacing();
    const def = ALL_DEFS[defId];
    if (!def) return;
    const ghost = this.add.image(-100, -100, def.tex).setOrigin(0.5, 0.72).setAlpha(0.55).setDepth(5080);
    const ring = this.add.graphics().setDepth(5079);
    this.placing = { defId, ghost, ring, gx: -999, gy: -999, valid: false };
  }

  exitPlacing() {
    if (!this.placing) return;
    this.placing.ghost.destroy();
    this.placing.ring.destroy();
    this.placing = null;
  }

  /** 幽灵跟随指针：吸附到格子（占地左上角）并刷新合法性 */
  updatePlacingGhost(worldX: number, worldY: number) {
    const pl = this.placing;
    if (!pl) return;
    const def = ALL_DEFS[pl.defId];
    if (!def) {
      this.exitPlacing();
      return;
    }
    const w = screenToWorld(worldX, worldY);
    const fp = this.footprintOf(def);
    const gx = Math.round(w.wx - fp / 2);
    const gy = Math.round(w.wy - fp / 2);
    pl.gx = gx;
    pl.gy = gy;
    pl.valid = this.canPlaceAt(gx, gy, def);
    // 以占地中心格的地形高度画（跨高差时避免四角参差）
    const cx = gx + fp / 2;
    const cy = gy + fp / 2;
    const h = heightAt(cx, cy);
    const c = worldToScreen(cx, cy, h);
    pl.ghost.setPosition(c.sx, c.sy);
    pl.ghost.setTint(pl.valid ? 0x99ffbb : 0xff6666);
    const p1 = worldToScreen(gx, gy, h);
    const p2 = worldToScreen(gx + fp, gy, h);
    const p3 = worldToScreen(gx + fp, gy + fp, h);
    const p4 = worldToScreen(gx, gy + fp, h);
    const ring = pl.ring;
    ring.clear();
    ring.lineStyle(2, pl.valid ? 0x66ff99 : 0xff5555, 0.9);
    ring.fillStyle(pl.valid ? 0x66ff99 : 0xff5555, 0.15);
    ring.beginPath();
    ring.moveTo(p1.sx, p1.sy);
    ring.lineTo(p2.sx, p2.sy);
    ring.lineTo(p3.sx, p3.sy);
    ring.lineTo(p4.sx, p4.sy);
    ring.closePath();
    ring.fillPath();
    ring.strokePath();
  }

  /** 放置合法性：地图范围 / 地形（仅 low/high/bridge）/ 占地高差 ≤0.6 / 实体重叠 / 精炼厂绑气泉 */
  canPlaceAt(gx: number, gy: number, def: Def): boolean {
    const fp = this.footprintOf(def);
    if (gx < 0 || gy < 0 || gx + fp > MAP_COLS || gy + fp > MAP_ROWS) return false;
    let hMin = Infinity;
    let hMax = -Infinity;
    for (let x = gx; x < gx + fp; x++) {
      for (let y = gy; y < gy + fp; y++) {
        const t = typeAt(x, y);
        // low/high 可建；ramp/water/void 禁止（bridge 与地面同级允许）
        if (t !== "low" && t !== "high" && t !== "bridge") return false;
        const h = heightAt(x, y);
        if (h < hMin) hMin = h;
        if (h > hMax) hMax = h;
      }
    }
    // 不可横跨悬崖
    if (hMax - hMin > 0.6) return false;
    // 重叠：任何非空军存活实体的碰撞圈与占地矩形相交即不可放
    for (const e of this.entities) {
      if (!e.alive || e.isAir) continue;
      // 精炼厂：气泉自身重叠交给下方专属校验
      if (def.requiresVespeneGeyser && e.def.id === "vespene") continue;
      const er = e.r / TILE_W;
      if (e.x + er <= gx || e.x - er >= gx + fp || e.y + er <= gy || e.y - er >= gy + fp) continue;
      return false;
    }
    // 精炼厂必须建在未占用气泉上（气泉中心在占地中心附近）
    if (def.requiresVespeneGeyser) {
      const cx = gx + fp / 2;
      const cy = gy + fp / 2;
      const geyser = this.entities.find(
        (g) =>
          g.alive &&
          g.def.isNeutral &&
          g.def.id === "vespene" &&
          Math.abs(g.x - cx) < 0.75 &&
          Math.abs(g.y - cy) < 0.75
      );
      if (!geyser) return false;
      const occupied = this.entities.some(
        (b) => b.alive && b.def.requiresVespeneGeyser && Math.hypot(b.x - geyser.x, b.y - geyser.y) < 1.5
      );
      if (occupied) return false;
    }
    return true;
  }

  /** 左键落子：合法性已由幽灵保证；扣费 → 建筑入场 → 指派最近 SCV 前往施工 */
  tryPlaceBuilding() {
    const pl = this.placing;
    if (!pl || !pl.valid) return;
    this.placeBuilding(pl.defId, pl.gx, pl.gy);
    this.exitPlacing();
  }

  placeBuilding(defId: string, gx: number, gy: number) {
    const def = ALL_DEFS[defId];
    if (!def) return;
    if (this.minerals < def.minerals || this.vespene < def.vespene) return;
    // 指派建造者：优先当前选中的，否则最近的可用 SCV
    const builders = this.entities.filter(
      (e) => e.alive && !e.def.isBuilding && e.owner === "player" && e.def.builds?.includes(defId)
    );
    const sel = builders.find((e) => this.selection.includes(e));
    const scv =
      sel ??
      builders.sort(
        (a, b) =>
          Phaser.Math.Distance.Between(a.x, a.y, gx, gy) -
          Phaser.Math.Distance.Between(b.x, b.y, gx, gy)
      )[0];
    if (!scv) return;
    this.minerals -= def.minerals;
    this.vespene -= def.vespene;
    const fp = this.footprintOf(def);
    // 建筑中心落占地中心；constructed=false 进入施工态（半透明 + 10% HP + 不计人口）
    const b = this.spawnFromDef(gx + fp / 2, gy + fp / 2, defId, "player", false);
    if (!b || !b.alive) return;
    scv.stop();
    scv.gatherTarget = null;
    scv.gatherState = "idle";
    scv.buildTarget = b;
    b.buildProgress = 0;
    b.buildNeed = def.buildTime;
    this.updateSupply();
    this.updateHud();
  }

  /** SCV 施工状态机：走向工地 → 贴身后推进 buildProgress → 完工结算 */
  updateBuild(e: Entity, dt: number) {
    const b = e.buildTarget;
    if (!b || !b.alive || b.constructed) {
      e.buildTarget = null;
      return;
    }
    const d = Phaser.Math.Distance.Between(e.x, e.y, b.x, b.y);
    // 到达阈值按格换算（r 是像素，教训同采集）
    const reach = b.r / TILE_W + e.r / TILE_W + 0.35;
    if (d > reach) {
      e.stepMove(dt, b.x, b.y);
      return;
    }
    // 贴身施工：停下推进进度（多个 SCV 可共建，进度共享）
    e.path = [];
    e.moveTargetX = null;
    e.moveTargetY = null;
    b.buildProgress += dt * 1000;
    const frac = Math.min(1, b.buildProgress / Math.max(1, b.buildNeed));
    b.hp = Math.max(b.hp, Math.round(b.maxHp * (0.1 + 0.9 * frac)));
    if (b.buildProgress >= b.buildNeed) this.finishBuilding(b, e);
  }

  /** 完工：恢复不透明 + 满血，人口供给此时才结算 */
  finishBuilding(b: Entity, worker?: Entity) {
    b.constructed = true;
    b.buildProgress = b.buildNeed;
    b.hp = b.maxHp;
    b.sprite.setAlpha(1);
    if (worker) worker.buildTarget = null;
    this.updateSupply();
    this.updateHud();
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;

    // 相机边界兜底：Phaser 4 RESIZE 下 setBounds 失效（cam.width=0），
    // 每帧把 scroll 夹回地图范围，任何移动相机的路径（拖动/跳转/方向键）都不会露黑边
    this.clampCamScroll();

    // 护盾再生（神族）
    for (const e of this.entities) {
      if (e.maxShield > 0 && e.shield < e.maxShield && e.alive) {
        e.shieldRegenAccumulator += dt;
        const interval = 0.7; // 每 0.7s 回 1 点
        while (e.shieldRegenAccumulator >= interval) {
          e.shieldRegenAccumulator -= interval;
          e.shield = Math.min(e.maxShield, e.shield + 1);
        }
      }
    }

    // 战斗推进（世界坐标）
    // 单个实体的内部异常（例如 stepMove 寻路失败、sprite 缺失等）不应让整个 update 中止，
    // 否则后续实体的渲染同步也会被跳过，表现就是“只能移动前几个实体”。
    for (const e of this.entities) {
      if (!e.alive) continue;
      try {
        e.updateCombat(dt);
        if (!e.def.isBuilding) {
          // 施工优先于采集：buildTarget 非空 = 正在建造
          if (e.buildTarget) this.updateBuild(e, dt);
          else this.updateGather(e, dt);
        }
      } catch (err) {
        // 静默兜底，避免抛错让 update 整体崩溃；
        // 把当前目标清掉，让该单位停下而不是反复崩溃。
        e.moveTargetX = null;
        e.moveTargetY = null;
        e.combatTarget = null;
        e.path = [];
        e.pathIndex = 0;
        // 下一帧会重新进入战斗循环
        if ((this as any)._errLog < 3) {
          console.warn("[entity update skipped]", e.def?.id, err);
          (this as any)._errLog = ((this as any)._errLog || 0) + 1;
        }
      }
    }

    // 渲染同步（投影到屏幕 + 深度排序）
    for (const e of this.entities) {
      if (!e.alive) continue;
      e.syncRender();
    }

    // 死亡清理
    const before = this.entities.length;
    this.entities = this.entities.filter((e) => {
      if (e.alive) return true;
      this.spawnDeathFx(e);
      // 销毁“单位容器”即连带销毁其下的 sprite/hpBar/selectionRing，
      // 并把容器从 entityLayer 移除，避免死亡实体在场景树里留空节点。
      e.container.destroy();
      if (e.gatherTarget) e.gatherTarget = null;
      return false;
    });
    if (this.entities.length !== before) this.updateSupply();

    this.updateHud();
    this.liquidUI?.minimap.refresh(this.entities);

    // 方向键平移相机（32×32 地图较大，便于巡视）
    const cam = this.cameras.main;
    const sp = (700 * dt) / cam.zoom;
    if (this.cursors) {
      if (this.cursors.left?.isDown) cam.scrollX -= sp;
      if (this.cursors.right?.isDown) cam.scrollX += sp;
      if (this.cursors.up?.isDown) cam.scrollY -= sp;
      if (this.cursors.down?.isDown) cam.scrollY += sp;
    }
  }

  updateGather(e: Entity, dt: number) {
    if (!e.gatherTarget) return;
    const res = e.gatherTarget;
    if (!res.alive) {
      e.gatherTarget = null;
      e.gatherState = "idle";
      return;
    }
    if (e.gatherState === "toResource") {
      const d = Phaser.Math.Distance.Between(e.x, e.y, res.x, res.y);
      // r 是像素半径（def.size/2），必须 /TILE_W 换算成格再比较——
      // 之前直接相加（矿 18 + 单位 8 = 26"格"≈ 屏幕 1600px），SCV 站在
      // 几格外就判"已到达"原地隔空采矿，看起来完全没反应。
      if (d <= res.r / TILE_W + e.r / TILE_W + 0.25) {
        e.gatherState = "mining";
        e.mineTimer = 1.5;
      } else {
        e.stepMove(dt, res.x, res.y);
      }
    } else if (e.gatherState === "mining") {
      e.mineTimer -= dt;
      e.animateTimer += dt;
      // 采集动画：工蜂身上闪烁
      if (e.animateTimer > 0.2) {
        e.animateTimer = 0;
      }
      if (e.mineTimer <= 0) {
        e.carrying = 8;
        e.gatherState = "returning";
        e.returnTarget = this.nearestBase(e);
      }
    } else if (e.gatherState === "returning") {
      let base = e.returnTarget;
      if (!base || !base.alive) {
        // 注意：不能用 base && (...) 短路——base 为 null 时会导致 returnTarget
        // 永远不被重新寻址，下一行 b.x 直接抛 TypeError，单位卡死
        base = this.nearestBase(e);
        e.returnTarget = base;
      }
      const b = base;
      if (!b) {
        // 找不到己方基地（异常情况）：清掉采集状态转待机，避免每帧抛错
        e.gatherTarget = null;
        e.gatherState = "idle";
        return;
      }
      const d = Phaser.Math.Distance.Between(e.x, e.y, b.x, b.y);
      // 到达基地阈值同上：r 像素 → 格换算
      if (d <= b.r / TILE_W + e.r / TILE_W + 0.3) {
        if (res.def.id === "mineral") this.minerals += e.carrying;
        else this.vespene += e.carrying;
        e.carrying = 0;
        this.updateHud(); // 入账后立即刷新 HUD——之前从不刷新，资源数字恒旧，看似"没反应"
        e.gatherState = "toResource";
      } else {
        e.stepMove(dt, b.x, b.y);
      }
    }
  }

  nearestBase(e: Entity): Entity | null {
    let best: Entity | null = null;
    let bestD = Infinity;
    for (const o of this.entities) {
      if (!o.alive || o.owner !== e.owner) continue;
      if (o.def.canProduceLarva || o.def.id === "cc" || o.def.id === "nexus") {
        const d = Phaser.Math.Distance.Between(e.x, e.y, o.x, o.y);
        if (d < bestD) {
          bestD = d;
          best = o;
        }
      }
    }
    return best;
  }

  updateSupply() {
    this.supplyProvided = 0;
    this.supplyUsed = 0;
    for (const e of this.entities) {
      if (e.owner !== "player") continue;
      // 未完工建筑不提供人口（完工时 finishBuilding 触发重算）
      if (e.def.supplyProvided && e.constructed && !e.def.upgradeOf) this.supplyProvided += e.def.supplyProvided;
      if (e.def.supplyCost) this.supplyUsed += e.def.supplyCost;
    }
  }

  drawShot(from: Entity, to: Entity) {
    const color = ownerColor(from.owner);
    const { sx: sx1, sy: sy1 } = worldToScreen(from.x, from.y);
    const { sx: sx2, sy: sy2 } = worldToScreen(to.x, to.y);
    const line = this.add.graphics().setDepth(3000);
    this.uiLayer.add(line);
    line.lineStyle(2, color, 0.9);
    line.beginPath();
    line.moveTo(sx1, sy1 - from.sprite.displayHeight * 0.4);
    line.lineTo(sx2, sy2 - to.sprite.displayHeight * 0.4);
    line.strokePath();
    this.tweens.add({
      targets: line,
      alpha: 0,
      duration: 140,
      onComplete: () => line.destroy(),
    });
    // 命中爆点
    const g = this.add.image(sx2, sy2 - to.sprite.displayHeight * 0.4, "glow_white").setDepth(3001);
    g.setTint(color);
    this.uiLayer.add(g);
    this.tweens.add({
      targets: g,
      alpha: 0,
      scale: 0.4,
      duration: 160,
      onComplete: () => g.destroy(),
    });
  }

  spawnDeathFx(e: Entity) {
    const { sx, sy } = worldToScreen(e.x, e.y);
    const g = this.add.image(sx, sy - e.sprite.displayHeight * 0.3, "glow_red").setDepth(3000);
    this.uiLayer.add(g);
    this.tweens.add({
      targets: g,
      alpha: 0,
      scale: 1.6,
      duration: 220,
      onComplete: () => g.destroy(),
    });
    // 对建筑/大单位加碎裂
    if (e.def.isBuilding) {
      for (let i = 0; i < 6; i++) {
        const p = this.add.image(sx, sy, "shot_red").setDepth(3001);
        this.uiLayer.add(p);
        const ang = Math.random() * Math.PI * 2;
        this.tweens.add({
          targets: p,
          x: sx + Math.cos(ang) * 24,
          y: sy + Math.sin(ang) * 12,
          alpha: 0,
          duration: 300,
          onComplete: () => p.destroy(),
        });
      }
    }
  }

  updateHud() {
    if (!this.liquidUI) return;
    const n = this.entities.filter((e) => e.owner === "player" && !e.def.isNeutral).length;
    this.liquidUI.setStats({
      minerals: this.minerals,
      vespene: this.vespene,
      supplyUsed: this.supplyUsed,
      supplyProvided: this.supplyProvided,
      unitCount: n,
      selCount: this.selection.length,
      hint: "左键框选 · 右键移动/攻击/采集 · 中键拖动地图 · A+左键 攻击移动 · ESC 取消",
    });
  }
}

// 让未使用的导入保持引用，避免编译告警
void TERRAN_UNITS;
void PROTOSS_UNITS;
void ZERG_UNITS;
void TERRAN_BUILDINGS;
void PROTOSS_BUILDINGS;
void ZERG_BUILDINGS;

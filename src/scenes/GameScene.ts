import * as Phaser from "phaser";
import { Entity, spriteScale } from "../entities";
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
  AI_TICK_INTERVAL,
  AI_WORKER_TARGET,
  AI_WORKER,
  AI_PRODUCTION_BUILDING,
  AI_SUPPLY_BUILDING,
  AI_COMBAT_UNITS,
  SIGHT_RANGE,
  LOCKDOWN_COST,
  LOCKDOWN_RANGE,
  LOCKDOWN_DURATION,
  NUKE_DAMAGE,
  NUKE_RADIUS,
  NUKE_GUIDE_MS,
  NUKE_COOLDOWN,
  NUKE_REQUIRES,
  CARRIER_START_INTERCEPTORS,
  INTERCEPTOR_REDOCK_DIST,
  INTERCEPTOR_LAUNCH_OFFSET,
  STIM_COST_HP,
  STIM_DURATION,
  FOG_UPDATE_INTERVAL,
  FOG_SIGHT_BUILDING,
  FOG_EXPLORED_ALPHA,
  VICTORY_CHECK_INTERVAL,
  SPIDER_MINE_DAMAGE,
  SPIDER_MINE_TRIGGER,
  SPIDER_MINE_SPLASH,
  SPIDER_MINE_ARM_MS,
  STORM_COST,
  STORM_RANGE,
  STORM_RADIUS,
  STORM_TICKS,
  STORM_TICK_INTERVAL,
  STORM_TICK_DAMAGE,
  MIND_CONTROL_COST,
  MIND_CONTROL_RANGE,
  ATTACH_RANGE,
  REPAIR_RATE,
  UPGRADE_KINDS,
} from "../config";
import { generateAll } from "../Textures";
import {
  TILE_W,
  TILE_H,
  ELEV,
  HALF_W,
  HALF_H,
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
import { setDynamicBlocked } from "../pathfinding";
import { buildTerrainTilemap } from "../tilemap";
import { getLostTemple, buildBases } from "../maps/lostTemple";
import { initLiquidUI, pinLiquidUI, HUD_H, type LiquidUI } from "../ui/liquidHud";
import { LiquidButton, LiquidLabel } from "liquidphaser/liquid";
import { MouseEvent as LiquidMouseEvent, TextFormat } from "liquidphaser/fl";
import { ANIM_DEFS } from "../animDefs";
import type { Def } from "../config";

/** 训练/变异/研究面板按钮项（三类共板；onPanelPick 按 kind 分发） */
type PanelItem =
  | { kind: "train"; id: string }
  | { kind: "morph"; id: string }
  | { kind: "research"; id: string };

export class GameScene extends Phaser.Scene {
  entities: Entity[] = [];
  selection: Entity[] = [];
  selecting = false;
  /** 框选起点：世界屏幕坐标（相机空间像素）。等距下不能用格坐标矩形判定，见 onPointerUp */
  selStartPx = new Phaser.Math.Vector2();
  selRect!: Phaser.GameObjects.Graphics;
  attackMoveMode = false;
  /** 大和炮瞄准态：非空 = 下一次左键点击即发射目标（Y 键进入，右键/点空地取消） */
  yamatoCaster: Entity | null = null;
  /** 锁定瞄准态：非空 = 下一次左键点击即锁定目标（L 键进入，右键/点空地取消） */
  lockdownCaster: Entity | null = null;
  /** 核弹瞄准/引导态：非空 = 瞄准中的 ghost（N 键进入）或引导中的 ghost（发射后）；
   * nukeTimer>0 表示已发射进入引导倒计时 */
  nukeGhost: Entity | null = null;
  nukeTimer = 0;
  /** 核弹落点（格坐标）与引导起点（ghost 位移检测用，位移即打断引导） */
  nukeX = 0;
  nukeY = 0;
  nukeLaunchX = 0;
  nukeLaunchY = 0;
  /** 核弹全局装填冷却（ms，发射即开始倒数） */
  nukeCooldown = 0;
  /** 核弹落点标记（红色准星圈 + 倒计时文字） */
  nukeMarker: Phaser.GameObjects.Graphics | null = null;
  nukeText: Phaser.GameObjects.Text | null = null;
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
  /** 战争迷雾覆盖层（世界坐标黑色菱形，depth 4000） */
  fogGfx!: Phaser.GameObjects.Graphics;
  /** 迷雾网格：0 未探索 / 1 已探索 / 2 可见（仅玩家视角；AI 无迷雾） */
  fog = new Uint8Array(MAP_COLS * MAP_ROWS);
  private fogTimer = 0;

  // —— 胜负判定 ——
  /** 非空 = 游戏已结束（胜利/失败横幅常驻，AI 决策停摆，玩家仍可浏览操作） */
  gameOver: null | "victory" | "defeat" = null;
  /** create 时快照的出场 AI 阵营（resBy 桶在死亡后仍在，不能用作存活判定） */
  private aiOwners: string[] = [];
  private victoryTimer = 0;

  // —— 编队（Ctrl+1~9 保存选区快照 / 1~9 选中 / 双击居中）——
  controlGroups: Record<number, Entity[]> = {};
  private lastGroupKey = 0;
  private lastGroupTime = 0;

  // —— 布雷 / 法术 ——
  /** 风暴瞄准态：非空 = 下一次左键点击即施放落点（S 键进入，右键/ESC 取消） */
  stormCaster: Entity | null = null;
  /** 精神控制瞄准态：非空 = 下一次左键点击即策反目标（C 键进入，右键/ESC 取消） */
  mindCtlCaster: Entity | null = null;
  /** 进行中的风暴（多波 AoE）：落点 + 剩余波数 + 波计时 + 闪电特效层 */
  storms: { x: number; y: number; ticksLeft: number; timer: number; gfx: Phaser.GameObjects.Graphics }[] = [];
  /** 蜘蛛雷（轻量对象，非 Entity）：埋地陷阱，敌触即爆；玩家雷可见/敌方雷隐形 */
  spiderMines: { x: number; y: number; owner: string; armMs: number }[] = [];
  mineGfx!: Phaser.GameObjects.Graphics;

  /** 按 owner 分桶的资源池（AI 经济前置；训练/建造/采集按所属阵营入出账）。
   * 玩家桶经下方 getter 兼容 this.minerals 等旧引用——HUD/玩家面板语义不变 */
  resBy: Record<string, { minerals: number; vespene: number }> = {
    player: { minerals: 50, vespene: 0 },
  };
  /** 按 owner 分桶的人口统计（updateSupply 分阵营全量重算） */
  supplyBy: Record<string, { provided: number; used: number }> = {};

  /** 某阵营的科技升级等级表（惰性建桶；kind→level） */
  upgradesOf(owner: string): Record<string, number> {
    if (!this.upgradesBy[owner]) this.upgradesBy[owner] = {};
    return this.upgradesBy[owner];
  }

  /** 取（或惰性创建）某阵营资源桶 */
  resOf(owner: string) {
    return (this.resBy[owner] ??= { minerals: 0, vespene: 0 });
  }
  /** 取（或惰性创建）某阵营人口桶 */
  supplyOf(owner: string) {
    return (this.supplyBy[owner] ??= { provided: 0, used: 0 });
  }
  // —— 旧引用兼容层：恒指玩家桶（玩家 = HUD/面板唯一视角）——
  get minerals() {
    return this.resBy.player.minerals;
  }
  set minerals(v: number) {
    this.resBy.player.minerals = v;
  }
  get vespene() {
    return this.resBy.player.vespene;
  }
  set vespene(v: number) {
    this.resBy.player.vespene = v;
  }
  get supplyProvided() {
    return this.supplyOf("player").provided;
  }
  set supplyProvided(v: number) {
    this.supplyOf("player").provided = v;
  }
  get supplyUsed() {
    return this.supplyOf("player").used;
  }
  set supplyUsed(v: number) {
    this.supplyOf("player").used = v;
  }

  creepLayer!: Phaser.GameObjects.Graphics;
  resourceLayer!: Phaser.GameObjects.Container;
  larvaTimers: { ent: Entity; t: number }[] = [];
  /** AI 经济：各阵营决策计时（updateAI 驱动，随机初相位错峰） */
  aiTimers: Record<string, number> = {};
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
  /** 悬停实体名签（建筑同族轮廓难分辨 → 指针悬停头顶显示名称；仅我方+中立，防迷雾泄密） */
  private hoverEnt: Entity | null = null;
  private hoverName: Phaser.GameObjects.Text | null = null;

  /** 训练/变异/研究共板（选中可操作建筑自动出现）：LiquidButton 挂 Liquid stage */
  trainPanel: {
    buttons: { btn: any; item: PanelItem }[];
    buildingId: number;
    /** 面板标题（建筑名 + 造兵入口提示） */
    title: any;
    rect: { x: number; y: number; w: number; h: number };
  } | null = null;
  /** 科技升级等级（按阵营分桶：kind→level；Entity.attackBonus/armorLevel 消费） */
  upgradesBy: Record<string, Record<string, number>> = {};
  /** 选中签名（实体 id 串）：变化时同步训练面板开关 */
  private selSig = "";

  /** 本局敌人数量（MenuScene 选择 1~3）：决定出场 AI 阵营（ai1~aiN）
   * 与四角落出生区随机分配；胜负判定随出场阵营天然适配 */
  enemyCount = 2;
  /** 玩家本局出生角落（屏幕方位名），用于让小地图避让该角 */
  playerCorner = "右下";

  constructor() {
    super("game");
  }

  /** 场景启动参数（MenuScene 经 scene.start 传入 { enemies }）；
   * 缺省 2 兼容调试直开（浏览器地址直达无菜单时仍有对局可玩） */
  init(data: { enemies?: number }) {
    // 场景实例跨局复用（菜单↔游戏可反复进出）：先清空上一局全部对局期状态，
    // 再记录本局敌人数量——否则 resBy/aiOwners/entities 等残留会让胜负判定
    // 把上一局阵营也计入（空阵营恒全灭 → 开局误判胜利）。
    this.resetGameState();
    this.enemyCount = Math.min(3, Math.max(1, Math.trunc(data?.enemies ?? 2)));
  }

  /** 重置全部对局期实例状态（init 调用；显示对象由场景 shutdown 销毁、create 重建） */
  private resetGameState() {
    this.entities = [];
    this.selection = [];
    this.selecting = false;
    this.selStartPx = new Phaser.Math.Vector2();
    this.attackMoveMode = false;
    this.yamatoCaster = null;
    this.lockdownCaster = null;
    this.nukeGhost = null;
    this.nukeTimer = 0;
    this.nukeX = 0;
    this.nukeY = 0;
    this.nukeLaunchX = 0;
    this.nukeLaunchY = 0;
    this.nukeCooldown = 0;
    this.cameraDragging = false;
    this.dragStartPx = new Phaser.Math.Vector2();
    this.dragCamScroll = new Phaser.Math.Vector2();
    this.fog = new Uint8Array(MAP_COLS * MAP_ROWS);
    this.fogTimer = 0;
    this.gameOver = null;
    this.aiOwners = [];
    this.victoryTimer = 0;
    this.controlGroups = {};
    this.lastGroupKey = 0;
    this.lastGroupTime = 0;
    this.stormCaster = null;
    this.mindCtlCaster = null;
    this.storms = [];
    this.spiderMines = [];
    this.resBy = { player: { minerals: 50, vespene: 0 } };
    this.supplyBy = {};
    this.upgradesBy = {};
    this.larvaTimers = [];
    this.aiTimers = {};
    this.mapDragging = false;
    this.buildPanel = null;
    this.placing = null;
    this.selSig = "";
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

    // 种族实体贴图：gen-ase.mjs 导出的横条序列帧 spritesheet（与 art-src/libresprite
    // 的 .ase 工程同源帧数据；动作帧区间元数据在 src/animDefs.json）。
    // 每个实体一张横条，帧按 8 列行优先排布（单位帧 80×60 / 建筑帧 272×272）。
    for (const d of [
      ...TERRAN_BUILDINGS,
      ...TERRAN_UNITS,
      ...PROTOSS_BUILDINGS,
      ...PROTOSS_UNITS,
      ...ZERG_BUILDINGS,
      ...ZERG_UNITS,
    ]) {
      const ad = ANIM_DEFS[d.tex];
      if (!ad) continue;
      this.load.spritesheet(d.tex, `textures/${d.race}/${d.tex}.png`, {
        frameWidth: ad.frameWidth,
        frameHeight: ad.frameHeight,
      });
    }
  }

  create() {
    try {
      // 分层容器：地图层(底) / 单位层(中) / UI 层(顶)。必须在其它对象创建前建立。
      this.mapLayer = this.add.container(0, 0).setDepth(-1000);
      this.entityLayer = this.add.container(0, 0).setDepth(0);
      this.uiLayer = this.add.container(0, 0).setDepth(1000);

      // 战争迷雾覆盖层（世界坐标黑色菱形）：depth 高于实体/特效、低于小地图
      // (5000) 与屏幕面板。此时尚未出兵，create 末尾出兵完毕后再重算可见集。
      this.fogGfx = this.add.graphics().setDepth(4000);

      // 蜘蛛雷标记层（fx 层级：己方雷画标记，敌方雷隐形）
      this.mineGfx = this.add.graphics().setDepth(3000);
      this.uiLayer.add(this.mineGfx);

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
      this.registerAnims();

      // 加载 Lost Temple 风格地图（地形 + 四角矿区资源；出生点由 buildBases 随机分配）
      const map = getLostTemple();
      // 用 Phaser Tilemap + Tiled 渲染地形（maps/lost-temple.tmj），
      // 并由瓦片 gid 反推地形网格供寻路/出生点使用
      buildTerrainTilemap(this, this.mapLayer);

      // 资源节点
      map.resources.forEach((r) => this.spawnResource(r.kind, r.gx, r.gy));

      // 出生点（基地 + 附属单位）：本局阵营（玩家 + 前 N 个 AI）随机洗到四角落
      const bases = buildBases(this.enemyCount);
      // 记录玩家出生角，小地图稍后（LiquidUI 就绪时）避让该角，避免挡住自家基地
      this.playerCorner = bases.find((b) => b.owner === "player")?.corner ?? "右下";
      for (const b of bases) {
        // 每阵营起手资源：50 矿 0 气（星际惯例；中立资源节点不发桶）
        if (b.owner !== "neutral" && !this.resBy[b.owner]) {
          this.resBy[b.owner] = { minerals: 50, vespene: 0 };
        }
        this.spawnFromDef(b.gx, b.gy, b.defId, b.owner, true);
        if (b.units) {
          for (const u of b.units) {
            this.spawnFromDef(b.gx + u.dx, b.gy + u.dy, u.defId, b.owner);
          }
        }
      }

      this.updateSupply();

      // 胜负判定：出场 AI 阵营快照（此后只减不增；resBy 桶死亡后仍在，不作存活依据）
      this.aiOwners = Object.keys(this.resBy).filter(ownerIsAI);

      // 战争迷雾：按出生点重算一次可见集（开局基地周边点亮，其余全黑；
      // 敌方基地/单位随迷雾隐藏），并首次重绘覆盖层
      this.recomputeFog();
      this.redrawFogOverlay();

      // 相机：初始放大并对准玩家出生点，让开局单位清晰分离、可逐个点选。
      // 之前整张 32×32 地图被缩到一屏（zoom≈0.59），玩家基地被挤到屏幕顶端一条
      // ~76×28px 的窄带里，多个单位完全重叠成一团，导致“只能选中露在外面的 1~2 个”。
      const cam = this.cameras.main;
      // 星际式固定视距：不可缩放，恒 1:1（窗口宽于地图 2048×2080 时按
      // minZoom 自动放大撑满，仍不露黑边——见 iso.ts 与下方 resize 监听）。
      const gw = this.scale.gameSize.width;
      const gh = this.scale.gameSize.height;
      const playerBase = bases.find((b) => b.owner === "player");
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
      // （minZoom>1）时自动放大撑满，并夹紧视野，任何窗口都无黑边。
      // scale 事件是全局的，挂到实例方法上并在 shutdown 解绑——
      // 场景重开（菜单↔游戏往返）不会重复注册。
      this.scale.on("resize", this.onGameResize, this);
      this.events.once("shutdown", () => this.scale.off("resize", this.onGameResize, this));

      // Liquid UI（底部指挥条 + 右上角小地图，Phaser 屏幕层渲染，替代 DOM HUD）。
      // 皮肤 png 异步加载：就绪前 updateHud/setStats 调用走空，就绪后立即补一次。
      void initLiquidUI(this).then((ui) => {
        this.liquidUI = ui;
        // 小地图避让玩家出生角：相机以玩家基地为中心，对角放小地图永不遮挡
        this.liquidUI.minimap.setAvoidCorner(this.playerCorner);
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
      // E：攻城模式切换（选中的 tank 展开成攻城态/收起，原地待命）
      this.input.keyboard?.on("keydown-E", () => {
        let n = 0;
        let siegedNow = false;
        for (const e of this.selection) {
          if (e.def.siegeDamage) {
            siegedNow = e.toggleSiege();
            n++;
          }
        }
        if (n > 0) this.showHint(siegedNow ? "坦克展开攻城模式" : "坦克收起攻城模式");
      });
      // Y：大和炮瞄准态（选中的 battlecruiser，能量足够时进入指定目标模式）
      this.input.keyboard?.on("keydown-Y", () => {
        const bc = this.selection.find((e) => e.alive && e.owner === "player" && e.def.yamatoDamage);
        if (!bc) return;
        const cost = bc.def.yamatoCost ?? 150;
        if (bc.energy < cost) {
          this.showHint(`能量不足（需 ${cost}，当前 ${Math.floor(bc.energy)}）`);
          return;
        }
        this.yamatoCaster = bc;
        this.showHint("大和炮：左键指定敌方目标（右键取消）");
      });
      // U：卸载（选中的运输机/碉堡原地放下全部乘客）
      this.input.keyboard?.on("keydown-U", () => {
        let n = 0;
        for (const e of this.selection) {
          if (e.alive && e.owner === "player" && e.def.cargoCapacity && e.cargo.length) {
            n += e.unloadAll();
          }
        }
        if (n > 0) this.showHint(`已卸载 ${n} 名乘客`);
      });
      // T：兴奋剂（选中的 marine/firebat，自伤 10 HP 换攻速/移速 +50% 持续 15s）
      this.input.keyboard?.on("keydown-T", () => {
        let n = 0;
        let denied = 0;
        for (const e of this.selection) {
          if (!e.alive || e.owner !== "player" || !e.def.stim) continue;
          if (e.stimTimer > 0) continue; // 增益期不重复施放
          if (e.hp <= STIM_COST_HP) {
            denied++;
            continue;
          }
          e.hp -= STIM_COST_HP; // 自伤直扣，不走 takeDamage 反击链
          e.stimTimer = STIM_DURATION;
          n++;
        }
        if (n > 0) this.showHint("兴奋剂：攻速/移速提升 50%");
        else if (denied > 0) this.showHint("生命值不足，无法施放兴奋剂");
      });
      // L：锁定（选中的 ghost，能量足够时进入指定目标模式）
      this.input.keyboard?.on("keydown-L", () => {
        const g = this.selection.find((e) => e.alive && e.owner === "player" && e.def.id === "ghost");
        if (!g) return;
        if (g.energy < LOCKDOWN_COST) {
          this.showHint(`能量不足（需 ${LOCKDOWN_COST}，当前 ${Math.floor(g.energy)}）`);
          return;
        }
        this.lockdownCaster = g;
        this.showHint("锁定：左键指定敌方机械单位（右键取消）");
      });
      // N：核弹（选中的 ghost + 科学站建成 + 装填完毕 → 指定打击地点）
      this.input.keyboard?.on("keydown-N", () => {
        const g = this.selection.find((e) => e.alive && e.owner === "player" && e.def.id === "ghost");
        if (!g) return;
        if (!this.hasConstructed("player", NUKE_REQUIRES)) {
          this.showHint(`需要${ALL_DEFS[NUKE_REQUIRES]?.name ?? NUKE_REQUIRES}（核弹科技）`);
          return;
        }
        if (this.nukeGhost) {
          this.showHint("核弹已在引导中");
          return;
        }
        if (this.nukeCooldown > 0) {
          this.showHint(`核弹装填中（剩余 ${Math.ceil(this.nukeCooldown / 1000)}s）`);
          return;
        }
        this.nukeGhost = g;
        this.showHint("核弹：左键指定打击地点（右键取消）");
      });
      // M：布雷（选中的 vulture 脚下埋蜘蛛雷，携雷用完为止，不自动补充）
      this.input.keyboard?.on("keydown-M", () => {
        let n = 0;
        for (const e of this.selection) {
          if (!e.alive || e.owner !== "player" || !e.def.mines || e.minesLeft <= 0) continue;
          e.minesLeft--;
          // 微随机偏移防多颗完全重叠（纯视觉）
          const ang = Math.random() * Math.PI * 2;
          this.spiderMines.push({
            x: e.x + Math.cos(ang) * 0.08,
            y: e.y + Math.sin(ang) * 0.08,
            owner: e.owner,
            armMs: SPIDER_MINE_ARM_MS,
          });
          n++;
        }
        if (n > 0) this.showHint("蜘蛛雷已埋设");
      });
      // S：灵能风暴瞄准态（选中的 ht，能量足够时进入落点指定模式）
      this.input.keyboard?.on("keydown-S", () => {
        const ht = this.selection.find((e) => e.alive && e.owner === "player" && e.def.storm);
        if (!ht) return;
        if (ht.energy < STORM_COST) {
          this.showHint(`能量不足（需 ${STORM_COST}，当前 ${Math.floor(ht.energy)}）`);
          return;
        }
        this.stormCaster = ht;
        this.showHint("风暴：左键指定落点（右键取消）");
      });
      // C：精神控制瞄准态（选中的 darkarchon，能量足够时进入目标指定模式）
      this.input.keyboard?.on("keydown-C", () => {
        const da = this.selection.find((e) => e.alive && e.owner === "player" && e.def.mindControl);
        if (!da) return;
        if (da.energy < MIND_CONTROL_COST) {
          this.showHint(`能量不足（需 ${MIND_CONTROL_COST}，当前 ${Math.floor(da.energy)}）`);
          return;
        }
        this.mindCtlCaster = da;
        this.showHint("精神控制：左键指定敌方单位（右键取消）");
      });
      // 编队：Ctrl+1~9 保存玩家选区快照 / 1~9 选中编队 / 双击同键相机居中编队
      const GROUP_KEY_NAMES = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"];
      GROUP_KEY_NAMES.forEach((name, i) => {
        this.input.keyboard?.on(`keydown-${name}`, (ev: KeyboardEvent) => {
          // Ctrl+数字是浏览器切标签页快捷键，必须 preventDefault 才能拦进游戏
          if (ev.ctrlKey) ev.preventDefault();
          this.handleGroupKey(i + 1, ev.ctrlKey);
        });
      });
      this.input.keyboard?.on("keydown-ESC", () => {
        this.attackMoveMode = false;
        this.yamatoCaster = null;
        this.lockdownCaster = null;
        this.stormCaster = null;
        this.mindCtlCaster = null;
        // 核弹仅在瞄准态可取消；已发射进入引导后不可中断（星际式）
        if (this.nukeGhost && this.nukeTimer <= 0) {
          this.nukeGhost = null;
          this.showHint("已取消核弹");
        }
        this.clearSelection();
        this.closeTrainPanel();
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

  /** 窗口 resize（全局 scale 事件，create 注册 / shutdown 解绑） */
  private onGameResize(gameSize: Phaser.Structs.Size) {
    const w = gameSize.width;
    const h = gameSize.height;
    this.cameras.main.setZoom(Math.max(1, minZoom(w, h)));
    this.cameras.main.setSize(w, h);
    this.clampCamScroll();
    this.liquidUI?.layout(w, h);
    // 面板坐标基于旧窗口尺寸，直接关闭（下次选中/按 B 重建）
    this.closeBuildPanel();
    this.closeTrainPanel();
  }

  /** 按 animDefs 注册动作动画（key = "<tex>:<动作名>"；Entity.playAnim 消费）。
   * idle/walk/build 循环，attack/death 播一次（repeat 语义在 animDefs.json）。 */
  registerAnims() {
    for (const [tex, ad] of Object.entries(ANIM_DEFS)) {
      if (!this.textures.exists(tex)) continue;
      for (const [name, a] of Object.entries(ad.actions)) {
        const key = `${tex}:${name}`;
        if (this.anims.exists(key)) continue;
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(tex, { start: a.from, end: a.to }),
          frameRate: a.fps,
          repeat: a.repeat,
        });
      }
    }
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
      // 建筑与单位统一等距画家算法 depth（1000+x+y+高度*100）：
      // 建筑北面的单位会被建筑正确遮挡、南面的单位画在建筑之前。
      // 旧方案建筑恒 200+x+y 垫底，贴图放大后“单位浮在建筑顶上”穿帮，故统一公式。
      e.container.setDepth(1000 + x + y + heightAt(x, y) * 100);
    }

    // 迷雾内出生的敌方实体立即隐藏（否则要等下一个迷雾 tick 才隐藏，出现闪烁）
    if (ownerIsAI(owner)) {
      e.container.visible = this.fogStateAt(x, y) >= 2;
    }

    if (def.isNeutral) {
      // 资源节点无所属
    } else if (ownerIsAI(owner)) {
      // AI 阵营按各自颜色染色
      e.setFaction(owner, ownerColor(owner));
      // 好斗（主动索敌/移动）受全局调试开关控制，便于单独调试玩家单位。
      // 农民（有 builds 清单）除外：否则会放弃采集/施工去追杀敌人。
      if (
        AI_AGGRESSIVE &&
        (def.groundDamage || def.airDamage) &&
        !def.isBuilding &&
        !def.builds?.length
      ) {
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
      this.supplyOf(owner).provided += def.supplyProvided;
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
    const spots = this.larvaSpots(building);
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

    // 训练面板区域：同建造面板，拦截世界输入避免误框选/误指令
    if (this.trainPanel && this.hitTrainPanel(p.x, p.y)) return;

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

    // 大和炮瞄准态：左键点敌方单位/建筑发射，右键或点空地取消
    if (this.yamatoCaster) {
      const caster = this.yamatoCaster;
      if (p.rightButtonDown()) {
        this.yamatoCaster = null;
        this.showHint("已取消大和炮");
        return;
      }
      if (p.leftButtonDown()) {
        const w = screenToWorld(p.worldX, p.worldY);
        let target: Entity | null = null;
        let bestD = 1.5;
        for (const o of this.entities) {
          if (!o.alive || o.host || o.owner === "player" || o.def.isNeutral || this.fogStateAt(o.x, o.y) < 2) continue;
          const d = Phaser.Math.Distance.Between(w.wx, w.wy, o.x, o.y);
          if (d < bestD) {
            bestD = d;
            target = o;
          }
        }
        this.yamatoCaster = null;
        if (!target) {
          this.showHint("已取消大和炮");
          return;
        }
        this.fireYamato(caster, target);
        return;
      }
    }

    // 锁定瞄准态：左键点敌方机械单位施放，右键或点空地取消
    if (this.lockdownCaster) {
      const caster = this.lockdownCaster;
      if (p.rightButtonDown()) {
        this.lockdownCaster = null;
        this.showHint("已取消锁定");
        return;
      }
      if (p.leftButtonDown()) {
        const w = screenToWorld(p.worldX, p.worldY);
        let target: Entity | null = null;
        let bestD = 1.5;
        for (const o of this.entities) {
          if (!o.alive || o.host || o.owner === "player" || o.def.isNeutral || this.fogStateAt(o.x, o.y) < 2) continue;
          const d = Phaser.Math.Distance.Between(w.wx, w.wy, o.x, o.y);
          if (d < bestD) {
            bestD = d;
            target = o;
          }
        }
        this.lockdownCaster = null;
        if (!target) {
          this.showHint("已取消锁定");
          return;
        }
        this.fireLockdown(caster, target);
        return;
      }
    }

    // 核弹瞄准态：左键指定落点发射，右键取消
    if (this.nukeGhost) {
      const ghost = this.nukeGhost;
      if (p.rightButtonDown()) {
        this.nukeGhost = null;
        this.showHint("已取消核弹");
        return;
      }
      if (p.leftButtonDown()) {
        const w = screenToWorld(p.worldX, p.worldY);
        this.nukeGhost = null;
        this.launchNuke(ghost, w.wx, w.wy);
        return;
      }
    }

    // 风暴瞄准态：左键指定落点（施法距离内），右键/点超程取消
    if (this.stormCaster) {
      const caster = this.stormCaster;
      if (p.rightButtonDown()) {
        this.stormCaster = null;
        this.showHint("已取消风暴");
        return;
      }
      if (p.leftButtonDown()) {
        const w = screenToWorld(p.worldX, p.worldY);
        if (Phaser.Math.Distance.Between(caster.x, caster.y, w.wx, w.wy) > STORM_RANGE) {
          this.showHint("超出施法距离（风暴）");
          return; // 保持瞄准态，让玩家点近处（星际式：单位走近再放此处简化）
        }
        this.stormCaster = null;
        this.castStorm(caster, w.wx, w.wy);
        return;
      }
    }

    // 精神控制瞄准态：左键点敌方单位策反，右键或点空地取消
    if (this.mindCtlCaster) {
      const caster = this.mindCtlCaster;
      if (p.rightButtonDown()) {
        this.mindCtlCaster = null;
        this.showHint("已取消精神控制");
        return;
      }
      if (p.leftButtonDown()) {
        const w = screenToWorld(p.worldX, p.worldY);
        let target: Entity | null = null;
        let bestD = MIND_CONTROL_RANGE;
        for (const o of this.entities) {
          if (!o.alive || o.host || o.owner === caster.owner || o.def.isNeutral || this.fogStateAt(o.x, o.y) < 2) continue;
          const d = Phaser.Math.Distance.Between(w.wx, w.wy, o.x, o.y);
          if (d < bestD) {
            bestD = d;
            target = o;
          }
        }
        if (!target) {
          this.showHint("已取消精神控制");
          return;
        }
        this.mindCtlCaster = null;
        this.fireMindControl(caster, target);
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
    // 悬停名签：指针下实体头顶显示名称（建筑同族轮廓的快速辨认入口）
    this.updateHover(p);
  }

  /** 悬停拾取：屏幕空间最近实体（仅我方+中立——敌方名字不越过战争迷雾） */
  private updateHover(p: Phaser.Input.Pointer) {
    if (this.placing || this.liquidUI?.hitUI(p.x, p.y)) {
      this.hoverEnt = null;
    } else {
      let best: Entity | null = null;
      let bestD = Infinity;
      for (const e of this.entities) {
        if (!e.alive || e.host || e.dock) continue;
        // 敌方不显示名签（雾下信息不泄露）；我方与中立（矿/气泉）都显示
        if (e.owner !== "player" && !e.def.isNeutral) continue;
        const es = worldToScreen(e.x, e.y, heightAt(e.x, e.y));
        const d = Phaser.Math.Distance.Between(p.worldX, p.worldY, es.sx, es.sy);
        const rr = e.sprite.displayWidth / 2 + 8;
        if (d < rr && d < bestD) {
          bestD = d;
          best = e;
        }
      }
      this.hoverEnt = best;
    }
    this.syncHoverName();
  }

  /** 名签创建+跟随：每帧校正（实体移动/相机滚动不脱锚），无目标即隐藏。
   * 惰性建 Text：保证 syncHoverName 单独可驱动（update 兜底/调试直调）。 */
  private syncHoverName() {
    if (!this.hoverName) {
      this.hoverName = this.add
        .text(0, 0, "", {
          fontFamily: "Consolas, 'Courier New', monospace",
          fontSize: "12px",
          color: "#d8ffe6",
          backgroundColor: "rgba(13,18,24,0.78)",
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5, 1)
        .setDepth(6000);
      this.uiLayer.add(this.hoverName);
    }
    const t = this.hoverName;
    const e = this.hoverEnt;
    if (!e || !e.alive) {
      if (t.visible) t.setVisible(false);
      this.hoverEnt = null;
      return;
    }
    const es = worldToScreen(e.x, e.y, heightAt(e.x, e.y));
    t.setText(e.def.name + (e.constructed ? "" : "（建造中）"));
    t.setPosition(es.sx, es.sy - e.sprite.displayHeight / 2 - 10);
    if (!t.visible) t.setVisible(true);
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
        if (!e.alive || e.host || e.dock || e.owner !== "player" || e.def.isNeutral) continue;
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
        if (!e.alive || e.host || e.dock || e.owner !== "player" || e.def.isNeutral || e.def.isBuilding) continue;
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

      // 碉堡进驻：右键己方碉堡（步兵 bunkerUnit 前往进驻；满员红字反馈）
      if (e.def.bunkerUnit) {
        let bk: Entity | null = null;
        let kD = 1.2;
        for (const o of this.entities) {
          if (!o.alive || o.owner !== e.owner || !o.def.isBuilding || !o.def.cargoCapacity)
            continue;
          const d = Phaser.Math.Distance.Between(wx, wy, o.x, o.y);
          if (d < kD) {
            kD = d;
            bk = o;
          }
        }
        if (bk) {
          if (bk.cargoSpaceLeft >= (e.def.cargoSize ?? 1)) {
            e.orderGarrison(bk);
            e.buildTarget = null;
          } else {
            this.showHint("碉堡已满（4）");
          }
          continue;
        }
      }

      // SCV 修理：右键 1.2 格内己方受伤机械单位/建筑（人族农民专属——虫族不修理）
      if (e.def.builds?.length && e.def.race === "terran") {
        let rep: Entity | null = null;
        let rD = 1.2;
        for (const o of this.entities) {
          if (!o.alive || o.owner !== e.owner || o.def.isNeutral || o.host) continue;
          if (o.hp >= o.maxHp) continue;
          if (!o.def.mechanical && !o.def.isBuilding) continue;
          const d = Phaser.Math.Distance.Between(wx, wy, o.x, o.y);
          if (d < rD) {
            rD = d;
            rep = o;
          }
        }
        if (rep) {
          e.repairTarget = rep;
          e.gatherTarget = null;
          e.gatherState = "idle";
          e.combatTarget = null;
          e.buildTarget = null;
          // 新指令覆盖旧移动（否则残留 moveTargetX 会被 updateRepair 当作
          // "修理中出现手动指令" 立刻放弃修理）
          e.moveTargetX = null;
          e.moveTargetY = null;
          e.attackMove = false;
          continue;
        }
      }

      // 运输机装载：右键己方地面单位（容量够即前往装载）
      if (e.def.cargoCapacity) {
        let board: Entity | null = null;
        let bD = 1.2;
        for (const o of this.entities) {
          if (o === e || !o.alive || o.owner !== e.owner || o.host || o.def.isBuilding || o.isAir || o.def.isNeutral)
            continue;
          const d = Phaser.Math.Distance.Between(wx, wy, o.x, o.y);
          if (d < bD) {
            bD = d;
            board = o;
          }
        }
        if (board && e.cargoSpaceLeft >= (board.def.cargoSize ?? 1)) {
          e.orderLoad(board);
          e.gatherTarget = null;
          e.buildTarget = null;
          e.combatTarget = null;
          continue;
        }
      }

      // 攻击敌人？（迷雾外的敌人不可手动指定——看不见即打不了）
      let target: Entity | null = null;
      let bestD = 1.2;
      for (const o of this.entities) {
        if (!o.alive || o.owner === "player" || o.def.isNeutral || this.fogStateAt(o.x, o.y) < 2) continue;
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
    this.closeTrainPanel(); // 面板互斥：建造面板与训练面板不同时开
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
        pinLiquidUI(btn); // 命中修复：Liquid 子件 sf=1 会在相机滚动后点击落空（见 liquidHud.pinLiquidUI）
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
    // 幽灵用序列帧第 0 帧（idle 起始帧），缩放与实体一致（否则建筑幽灵巨大）
    const ghost = this.add
      .image(-100, -100, def.tex)
      .setOrigin(0.5, 0.72)
      .setScale(spriteScale(def.isBuilding) * (def.visualScale ?? 1))
      .setAlpha(0.55)
      .setDepth(5080);
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

  /** 放置合法性：地图范围 / 地形（仅 low/high/bridge）/ 占地高差 ≤0.6 / 实体重叠 / 精炼厂绑气泉 / 附属绑主建筑 */
  canPlaceAt(gx: number, gy: number, def: Def): boolean {
    const fp = this.footprintOf(def);
    // 附属建筑专属校验：地形 + 高差 + 必须建在 attachOf 主建筑（存活已建成）ATTACH_RANGE 内，
    // 且该主建筑旁无同类附属；跳过通用重叠检查（贴主建筑放置必然与其碰撞圈相交，星际式贴建）
    if (def.attachment) {
      if (gx < 0 || gy < 0 || gx + fp > MAP_COLS || gy + fp > MAP_ROWS) return false;
      let hMinA = Infinity;
      let hMaxA = -Infinity;
      for (let x = gx; x < gx + fp; x++) {
        for (let y = gy; y < gy + fp; y++) {
          const t = typeAt(x, y);
          if (t !== "low" && t !== "high" && t !== "bridge") return false;
          const h = heightAt(x, y);
          if (h < hMinA) hMinA = h;
          if (h > hMaxA) hMaxA = h;
        }
      }
      if (hMaxA - hMinA > 0.6) return false;
      const cx = gx + fp / 2;
      const cy = gy + fp / 2;
      const host = this.entities.find(
        (e) =>
          e.alive &&
          e.constructed &&
          e.def.id === def.attachOf &&
          e.owner === "player" &&
          Phaser.Math.Distance.Between(cx, cy, e.x, e.y) <= ATTACH_RANGE
      );
      if (!host) return false;
      // 每主建筑同类附属限一座（host 2.2 格内已有同类即占用）
      return !this.entities.some(
        (e) =>
          e.alive &&
          e.def.attachment &&
          e.def.id === def.id &&
          Phaser.Math.Distance.Between(e.x, e.y, host.x, host.y) <= ATTACH_RANGE
      );
    }
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

  /** 左键落子：合法性已由幽灵保证；扣费（按工人所属阵营）→ 建筑入场 → 指派最近工人施工 */
  placeBuilding(defId: string, gx: number, gy: number, owner: Owner = "player") {
    const def = ALL_DEFS[defId];
    if (!def) return;
    const res = this.resOf(owner);
    if (res.minerals < def.minerals || res.vespene < def.vespene) return;
    // 指派建造者：优先当前选中的，否则最近的可用工人
    const builders = this.entities.filter(
      (e) => e.alive && !e.def.isBuilding && e.owner === owner && e.def.builds?.includes(defId)
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
    res.minerals -= def.minerals;
    res.vespene -= def.vespene;
    const fp = this.footprintOf(def);
    // 建筑中心落占地中心；constructed=false 进入施工态（半透明 + 10% HP + 不计人口）
    const b = this.spawnFromDef(gx + fp / 2, gy + fp / 2, defId, owner, false);
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
    // 完工瞬间占地格变为障碍，把恰好站在占地内的地面单位赶到最近可通行格
    // （否则防穿逻辑虽放行"格内者走出"，但空闲单位会一直留在建筑上）
    const fp = this.footprintOf(b.def);
    const x0 = Math.round(b.x - fp / 2);
    const y0 = Math.round(b.y - fp / 2);
    for (const e of this.entities) {
      if (!e.alive || e.isAir || e.def.isBuilding) continue;
      const ex = Math.floor(e.x);
      const ey = Math.floor(e.y);
      if (ex < x0 || ex >= x0 + fp || ey < y0 || ey >= y0 + fp) continue;
      // 螺旋外扩找最近可通行格（非障碍 + 地形可走）
      let placed = false;
      for (let r = 1; r <= 4 && !placed; r++) {
        for (let dx = -r; dx <= r && !placed; dx++) {
          for (let dy = -r; dy <= r && !placed; dy++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            const nx = ex + dx;
            const ny = ey + dy;
            if (typeAt(nx, ny) === "water" || typeAt(nx, ny) === "void") continue;
            if (this.entities.some(
              (o) => o.alive && o !== e && !o.def.isBuilding && !o.isAir &&
                Math.floor(o.x) === nx && Math.floor(o.y) === ny
            )) continue;
            e.x = nx + 0.5;
            e.y = ny + 0.5;
            e.path = [];
            e.moveTargetX = null;
            e.moveTargetY = null;
            placed = true;
          }
        }
      }
    }
    this.updateSupply();
    this.updateHud();
  }

  /* ============ 生产系统（建筑训练单位 / 虫族幼虫变异） ============ */

  /** 建筑可训练列表：虫族孵化场系 = 全部虫族单位（幼虫变异，科技前置 def.requires）；
   * 其它建筑 = produces 中的单位项（techlab/comsat 等建筑形态项不进面板）；
   * 航母（单位，interceptorBay）例外开放训练面板 = 机库拦截机免费补造。 */
  trainableListOf(b: Entity): string[] {
    if (!b.alive || !b.constructed) return [];
    if (!b.def.isBuilding && !b.def.interceptorBay) return [];
    if (b.def.larvaMorph) {
      return Object.values(ALL_DEFS)
        .filter((d) => d.kind === "unit" && d.race === "zerg" && d.id !== "larva" && !d.isNeutral)
        .map((d) => d.id);
    }
    return (b.def.produces ?? []).filter((id) => ALL_DEFS[id]?.kind === "unit");
  }

  /** 面板项：训练（单位）+ 变异（produces 中 upgradeOf 指回本建筑的形态）+ 研究（def.researches）。
   * 变异项独立于 trainableListOf：训练列表供 AI 复用，变异目标混入会被 AI 当单位产出。 */
  panelItemsOf(b: Entity): PanelItem[] {
    const items: PanelItem[] = [];
    if (!b.alive || !b.constructed) return items;
    for (const id of this.trainableListOf(b)) items.push({ kind: "train", id });
    for (const id of b.def.produces ?? []) {
      const d = ALL_DEFS[id];
      if (d?.upgradeOf === b.def.id) items.push({ kind: "morph", id });
    }
    for (const k of b.def.researches ?? []) items.push({ kind: "research", id: k });
    return items;
  }

  /** 面板按钮文案：训练=名字+价格（免费单位不显价）/ 变异=目标名+价格 / 研究=种类+下一级价格 */
  panelItemLabel(b: Entity, item: PanelItem): string {
    if (item.kind === "train") {
      const def = ALL_DEFS[item.id];
      if (!def) return item.id;
      return def.minerals || def.vespene
        ? `${def.name} ${def.minerals}${def.vespene ? "/" + def.vespene : ""}`
        : def.name;
    }
    if (item.kind === "morph") {
      const def = ALL_DEFS[item.id];
      return def
        ? `${def.name} ${def.minerals}${def.vespene ? "/" + def.vespene : ""}`
        : item.id;
    }
    const k = UPGRADE_KINDS[item.id];
    if (!k) return item.id;
    const lvl = this.upgradesOf(b.owner)[item.id] ?? 0;
    if (lvl >= k.maxLevel) return `${k.name} MAX`;
    return `${k.name} Lv${lvl + 1} ${k.minerals[lvl]}${k.vespene[lvl] ? "/" + k.vespene[lvl] : ""}`;
  }

  /** 需求方是否已建成前置建筑（训练/变异科技门槛） */
  hasConstructed(owner: Owner, defId: string): boolean {
    return this.entities.some(
      (e) => e.alive && e.owner === owner && e.def.id === defId && e.constructed
    );
  }

  /** 主建筑旁是否附着指定附属（存活已建成、ATTACH_RANGE 内；reactor 双倍产兵消费） */
  hasAttachment(b: Entity, attachId: string): boolean {
    return this.entities.some(
      (e) =>
        e.alive &&
        e.constructed &&
        e.def.attachment &&
        e.def.id === attachId &&
        Phaser.Math.Distance.Between(e.x, e.y, b.x, b.y) <= ATTACH_RANGE
    );
  }

  /** 附着在孵化场系建筑上的存活幼虫（_larvae 由 attachLarvae/幼虫再生维护） */
  aliveLarvae(b: Entity): Entity[] {
    return ((b as any)._larvae ?? []).filter((l: Entity) => l.alive);
  }

  /** 幼虫附着点（孵化场系三点位，初始附着与再生共用） */
  larvaSpots(b: Entity): [number, number][] {
    return [
      [b.x - 0.6, b.y + 0.6],
      [b.x + 0.6, b.y + 0.6],
      [b.x, b.y + 1.0],
    ];
  }

  /** 选中变化时同步训练面板：选中的可操作建筑（训练/变异/研究）变化 → 重建面板；无 → 关闭 */
  syncTrainPanel() {
    const b = this.selection.find(
      (e) => e.alive && e.owner === "player" && e.constructed && this.panelItemsOf(e).length > 0
    );
    if (!b) {
      this.closeTrainPanel();
      return;
    }
    if (this.trainPanel?.buildingId === b.id) return;
    this.closeTrainPanel();
    if (!this.liquidUI) return;
    const stage = this.liquidUI.stage;
    const gh = this.scale.gameSize.height;
    const items = this.panelItemsOf(b);
    const cols = 6;
    const bw = 96;
    const bh = 24;
    const gapX = 8;
    const gapY = 6;
    const rows = Math.ceil(items.length / cols);
    const x0 = 16;
    // 面板在指挥条上方（与建造面板同款式）
    const y0 = gh - HUD_H - rows * (bh + gapY) - 8;
    const buttons: { btn: any; item: PanelItem }[] = [];
    try {
      items.forEach((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const btn = new LiquidButton();
        btn.label = this.panelItemLabel(b, item);
        btn.setStyle("textFormat", new TextFormat("Consolas, 'Courier New', monospace", 12, 0xd8ffe6));
        btn.setSize(bw, bh);
        btn.position.set(x0 + col * (bw + gapX), y0 + row * (bh + gapY));
        btn.addEventListener(LiquidMouseEvent.CLICK, () => this.onPanelPick(b.id, item));
        stage.addChild(btn);
        pinLiquidUI(btn); // 命中修复：同建造面板
        buttons.push({ btn, item });
      });
    } catch (err) {
      console.warn("[trainPanel] 创建失败", err);
      return;
    }
    // 面板标题：建筑名 + 造兵入口提示（可发现性——让"点建筑造兵"一眼可见）
    let title: any = null;
    try {
      title = new LiquidLabel();
      title.text = `【${b.def.name}】点按钮下单 · 训练/变异/研究`;
      title.setStyle("textFormat", new TextFormat("Consolas, 'Courier New', monospace", 13, 0xffe9a8));
      title.setSize(cols * (bw + gapX), 20);
      title.position.set(x0, y0 - 24);
      stage.addChild(title);
      pinLiquidUI(title);
    } catch {
      title = null; // 标题创建失败不阻断面板
    }
    this.trainPanel = {
      buttons,
      buildingId: b.id,
      title,
      rect: { x: x0 - 4, y: y0 - 4, w: cols * (bw + gapX), h: rows * (bh + gapY) + 8 },
    };
    // 面板互斥：训练面板与建造面板不同时开
    this.closeBuildPanel();
  }

  /** 关训练面板：从 stage 移除并销毁按钮与标题 */
  closeTrainPanel() {
    const panel = this.trainPanel;
    if (!panel) return;
    const stage = this.liquidUI?.stage;
    try {
      stage?.removeChild(panel.title);
      panel.title?.destroy?.();
    } catch {
      /* 组件可能已被销毁 */
    }
    for (const b of panel.buttons) {
      try {
        stage?.removeChild(b.btn);
        b.btn.destroy?.();
      } catch {
        /* 组件可能已被销毁 */
      }
    }
    this.trainPanel = null;
  }

  /** 屏幕坐标是否落在训练面板矩形内（onPointerDown 拦截世界输入用） */
  hitTrainPanel(px: number, py: number): boolean {
    const r = this.trainPanel?.rect;
    if (!r) return false;
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }

  /** 余额/人口/科技变化时刷新按钮可用态（不可用加 × 置灰，同建造面板约定） */
  refreshTrainPanel() {
    const panel = this.trainPanel;
    if (!panel) return;
    const b = this.entities.find((e) => e.id === panel.buildingId);
    if (!b || !b.alive || !b.constructed) {
      this.closeTrainPanel();
      return;
    }
    const res = this.resOf(b.owner);
    const sup = this.supplyOf(b.owner);
    for (const { btn, item } of panel.buttons) {
      let ok = false;
      const label = this.panelItemLabel(b, item);
      if (item.kind === "train") {
        const def = ALL_DEFS[item.id];
        if (!def) continue;
        const bayFull =
          item.id === "interceptor" &&
          !!b.def.interceptorBay &&
          b.bay.length >= b.def.interceptorBay;
        ok =
          !bayFull &&
          !b.morphTo &&
          res.minerals >= def.minerals &&
          res.vespene >= def.vespene &&
          sup.used + (def.supplyCost ?? 0) <= sup.provided &&
          (!def.requires || this.hasConstructed(b.owner, def.requires));
      } else if (item.kind === "morph") {
        const def = ALL_DEFS[item.id];
        if (!def) continue;
        ok =
          !b.morphTo &&
          b.trainQueue.length === 0 &&
          res.minerals >= def.minerals &&
          res.vespene >= def.vespene &&
          (!def.requires || this.hasConstructed(b.owner, def.requires));
      } else {
        const k = UPGRADE_KINDS[item.id];
        if (!k) continue;
        const lvl = this.upgradesOf(b.owner)[item.id] ?? 0;
        ok =
          lvl < k.maxLevel &&
          !b.researchKind &&
          res.minerals >= k.minerals[lvl] &&
          res.vespene >= k.vespene[lvl];
      }
      // 不可用追加 × 置灰（MAX 除外——面板文案已表明不可再升）
      // 注意：解构出的 btn 即 LiquidButton 本体（trainPanel.buttons 元素是 { btn, item }），
      // 误写 btn.btn 会拿到 undefined → 训练面板开启期间每帧 TypeError → 游戏主循环死亡
      btn.label = ok || label.endsWith("MAX") ? label : `${label} ×`;
      btn.setStyle("textFormat", new TextFormat("Consolas, 'Courier New', monospace", 12, ok ? 0xd8ffe6 : 0x66766d));
    }
  }

  /** 训练校验+扣费+入队（玩家训练面板与 AI 经济共用）。返回错误文案；null = 成功 */
  tryTrain(b: Entity, defId: string): string | null {
    const def = ALL_DEFS[defId];
    if (!b || !b.alive || !def) return "建筑无效";
    if (!b.constructed) return "建筑未完工，不能训练";
    if (b.morphTo) return "变异中，不能训练";
    if (b.trainQueue.length >= 5) return "训练队列已满（5）";
    // 航母机库：拦截机满员拒训（免费但受 bay 容量约束）
    if (
      defId === "interceptor" &&
      b.def.interceptorBay &&
      b.bay.length >= b.def.interceptorBay
    ) {
      return `机库已满（${b.def.interceptorBay}）`;
    }
    if (def.requires && !this.hasConstructed(b.owner, def.requires)) {
      const need = ALL_DEFS[def.requires];
      return `需要 ${need ? need.name : def.requires}`;
    }
    const res = this.resOf(b.owner);
    if (res.minerals < def.minerals || res.vespene < def.vespene) {
      return res.minerals < def.minerals
        ? `矿物不足：需要 ${def.minerals}（现有 ${res.minerals}）`
        : `瓦斯不足：需要 ${def.vespene}（现有 ${res.vespene}）`;
    }
    this.updateSupply();
    const sup = this.supplyOf(b.owner);
    if (sup.used + (def.supplyCost ?? 0) > sup.provided) {
      return `人口不足：需要 ${def.supplyCost}（${sup.used}/${sup.provided}）`;
    }
    // 虫族孵化场系：训练 = 消耗一只附着幼虫（变异）；放在全部校验通过之后
    if (b.def.larvaMorph) {
      const larvae = this.aliveLarvae(b);
      if (larvae.length === 0) return "没有幼虫：等待孵化场再生";
      larvae[0].alive = false;
      (b as any)._larvae = this.aliveLarvae(b);
    }
    res.minerals -= def.minerals;
    res.vespene -= def.vespene;
    b.trainQueue.push({ defId, progress: 0, need: def.buildTime || 1000 });
    this.updateSupply();
    this.updateHud();
    return null;
  }

  /** 面板点击：按项类型分发（训练/变异/研究），拒绝必须给可见反馈 */
  onPanelPick(buildingId: number, item: PanelItem) {
    const b = this.entities.find((e) => e.id === buildingId);
    if (!b) return;
    const err =
      item.kind === "train"
        ? this.tryTrain(b, item.id)
        : item.kind === "morph"
          ? this.tryMorph(b, item.id)
          : this.startResearch(b, item.id);
    if (err) this.showHint(err);
  }

  /** 每帧：推进各建筑训练队列首项（一次一个）+ 虫族幼虫再生（≤3 只，每 12s 一只） */
  updateTraining(dt: number) {
    for (let i = 0; i < this.entities.length; i++) {
      const b = this.entities[i];
      if (!b.alive || !b.def.isBuilding || !b.constructed) continue;
      const q = b.trainQueue;
      if (q.length > 0) {
        const job = q[0];
        // 反应堆（reactor 附属）：训练速度 ×2（简化星际双倍产兵）
        job.progress += dt * 1000 * (this.hasAttachment(b, "reactor") ? 2 : 1);
        if (job.progress >= job.need) {
          q.shift();
          this.spawnTrained(b, job.defId);
        }
      }
      if (b.def.canProduceLarva) {
        const spots = this.larvaSpots(b);
        if (this.aliveLarvae(b).length < spots.length) {
          b.larvaRegenTimer += dt * 1000;
          if (b.larvaRegenTimer >= 12000) {
            b.larvaRegenTimer = 0;
            const larvae = this.aliveLarvae(b);
            const spot = spots.find(
              (s) =>
                !larvae.some((l) => Math.abs(l.x - s[0]) < 0.4 && Math.abs(l.y - s[1]) < 0.4)
            );
            if (spot) {
              const l = this.spawnFromDef(spot[0], spot[1], "larva", b.owner);
              if (l) (b as any)._larvae = this.aliveLarvae(b).concat(l);
            }
          }
        } else {
          b.larvaRegenTimer = 0;
        }
      }
    }
  }

  /** 训练完成：单位从建筑下缘出场；拦截机例外 = 直接停泊进母舰机库；
   * 航母完工 = 自带若干拦截机（星际式，免费停泊） */
  spawnTrained(b: Entity, defId: string) {
    const def = ALL_DEFS[defId];
    if (!def) return;
    if (defId === "interceptor" && b.def.interceptorBay) {
      const it = this.spawnFromDef(b.x, b.y, defId, b.owner, true);
      if (it) it.dockIn(b);
    } else {
      // 出兵点 = 建筑占地格下缘之外半格（b.r 是贴图半径，对大建筑会落在占地格内，
      // 导致新兵出生即"站在建筑上"且被障碍格困住）——按 footprintOf 精确算下缘
      const fp = this.footprintOf(b.def);
      const u = this.spawnFromDef(b.x, b.y + fp / 2 + 0.45, defId, b.owner, true);
      if (u && defId === "carrier") {
        for (let i = 0; i < CARRIER_START_INTERCEPTORS; i++) {
          const it = this.spawnFromDef(u.x, u.y, "interceptor", u.owner, true);
          if (it) it.dockIn(u);
        }
      }
    }
    this.updateSupply();
    this.updateHud();
  }

  /* ============ 科技升级（research）与建筑形态变异（morph） ============ */

  /** 变异校验+扣费+启动（produces 中 upgradeOf 指回本建筑的形态：
   * hatchery→lair→hive / creepColony→sunken·spore / spire→greaterSpire）。null = 成功 */
  tryMorph(b: Entity, targetId: string): string | null {
    const def = ALL_DEFS[targetId];
    if (!b || !b.alive || !def) return "建筑无效";
    if (!b.constructed) return "建筑未完工，不能变异";
    if (def.upgradeOf !== b.def.id) return "非法变异目标";
    if (b.morphTo) return "变异进行中";
    if (b.trainQueue.length > 0) return "训练队列非空，不能变异";
    if (def.requires && !this.hasConstructed(b.owner, def.requires)) {
      const need = ALL_DEFS[def.requires];
      return `需要 ${need ? need.name : def.requires}`;
    }
    const res = this.resOf(b.owner);
    if (res.minerals < def.minerals || res.vespene < def.vespene) {
      return res.minerals < def.minerals
        ? `矿物不足：需要 ${def.minerals}（现有 ${res.minerals}）`
        : `瓦斯不足：需要 ${def.vespene}（现有 ${res.vespene}）`;
    }
    res.minerals -= def.minerals;
    res.vespene -= def.vespene;
    b.morphTo = targetId;
    b.morphProgress = 0;
    b.morphNeed = def.buildTime || 1000;
    this.updateHud();
    return null;
  }

  /** 每帧：推进建筑形态变异，完成即 applyDef 整体替换（保留当前 HP，变异期播 build 动画） */
  updateMorph(dt: number) {
    for (const b of this.entities) {
      if (!b.alive || !b.morphTo) continue;
      b.morphProgress += dt * 1000;
      if (b.morphProgress >= b.morphNeed) {
        const def = ALL_DEFS[b.morphTo];
        b.morphTo = null;
        b.morphProgress = 0;
        if (def) {
          b.applyDef(def);
          if (b.owner === "player") this.showHint(`${def.name} 变异完成`);
          this.updateSupply(); // supplyProvided 可能随形态变化
          this.updateHud();
        }
      }
    }
  }

  /** 研究校验+扣费+启动（academy/ebay/armory/forge/evolutionChamber；等级按阵营全局生效） */
  startResearch(b: Entity, kindId: string): string | null {
    const k = UPGRADE_KINDS[kindId];
    if (!b || !b.alive || !b.constructed || !k) return "建筑无效";
    if (b.researchKind) return "已有研究进行中";
    const lvl = this.upgradesOf(b.owner)[kindId] ?? 0;
    if (lvl >= k.maxLevel) return `${k.name}已满级（Lv${k.maxLevel}）`;
    const res = this.resOf(b.owner);
    if (res.minerals < k.minerals[lvl] || res.vespene < k.vespene[lvl]) {
      return res.minerals < k.minerals[lvl]
        ? `矿物不足：需要 ${k.minerals[lvl]}（现有 ${res.minerals}）`
        : `瓦斯不足：需要 ${k.vespene[lvl]}（现有 ${res.vespene}）`;
    }
    res.minerals -= k.minerals[lvl];
    res.vespene -= k.vespene[lvl];
    b.researchKind = kindId;
    b.researchProgress = 0;
    b.researchNeed = k.time[lvl];
    this.updateHud();
    return null;
  }

  /** 每帧：推进科技研究，完成即对应阵营等级 +1（attackDamage/takeDamage 统一入口生效） */
  updateResearch(dt: number) {
    for (const b of this.entities) {
      if (!b.alive || !b.researchKind) continue;
      b.researchProgress += dt * 1000;
      if (b.researchProgress >= b.researchNeed) {
        const kindId = b.researchKind;
        const k = UPGRADE_KINDS[kindId];
        const bucket = this.upgradesOf(b.owner);
        const next = Math.min((bucket[kindId] ?? 0) + 1, k ? k.maxLevel : (bucket[kindId] ?? 0) + 1);
        bucket[kindId] = next;
        b.researchKind = null;
        b.researchProgress = 0;
        if (b.owner === "player") {
          this.showHint(`${k?.name ?? kindId} 完成 Lv${next}`);
          this.updateHud();
        }
      }
    }
  }

  /* ============ AI 经济（分阵营决策：采集/补农/补给/建造/出兵） ============ */

  /** 主基地（造农/选址圆心；虫族孵化场系/人族 cc/神族 nexus）。无则阵营经济停摆 */
  aiBaseOf(owner: Owner): Entity | null {
    return (
      this.entities.find(
        (e) =>
          e.alive &&
          e.owner === owner &&
          e.constructed &&
          (e.def.canProduceLarva || e.def.id === "cc" || e.def.id === "nexus")
      ) ?? null
    );
  }

  /** 最近中立矿（AI 农民采集指派；本轮简化只采矿不采气） */
  nearestMineral(e: Entity): Entity | null {
    let best: Entity | null = null;
    let bestD = Infinity;
    for (const o of this.entities) {
      if (!o.alive || !o.def.isNeutral || o.def.id !== "mineral") continue;
      const d = Phaser.Math.Distance.Between(e.x, e.y, o.x, o.y);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }

  /** AI 建造选址：以主基地为心环形外扩（半径 2~10），返回首个 canPlaceAt 合法格 */
  findBuildSpot(owner: Owner, defId: string): { gx: number; gy: number } | null {
    const def = ALL_DEFS[defId];
    const base = this.aiBaseOf(owner);
    if (!def || !base) return null;
    const bx = Math.floor(base.x);
    const by = Math.floor(base.y);
    for (let ring = 2; ring <= 10; ring++) {
      for (let dx = -ring; dx <= ring; dx++) {
        for (let dy = -ring; dy <= ring; dy++) {
          // 仅扫描环边（正方形环，与占地判定矩形一致）
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
          const gx = bx + dx;
          const gy = by + dy;
          if (this.canPlaceAt(gx, gy, def)) return { gx, gy };
        }
      }
    }
    return null;
  }

  /** 每帧：资源桶里的 AI 阵营按 AI_TICK_INTERVAL 错峰决策；异常单阵营隔离不扩散 */
  updateAI(dt: number) {
    if (this.gameOver) return; // 终局后 AI 停摆（横幅常驻，玩家仍可浏览操作）
    for (const owner of Object.keys(this.resBy)) {
      if (!ownerIsAI(owner)) continue;
      this.aiTimers[owner] = (this.aiTimers[owner] ?? Math.random() * AI_TICK_INTERVAL) + dt;
      if (this.aiTimers[owner] < AI_TICK_INTERVAL) continue;
      this.aiTimers[owner] = 0;
      try {
        this.aiTick(owner as Owner);
      } catch (err) {
        if ((this as any)._aiErrLog < 3) {
          console.warn(`[ai ${owner}] tick 异常`, err);
          (this as any)._aiErrLog = ((this as any)._aiErrLog || 0) + 1;
        }
      }
    }
  }

  /** 单阵营一 tick。优先级：采集指派 > 补给 > 造农 > 产能建筑 > 出兵（ affordable 校验都在共用层做） */
  aiTick(owner: Owner) {
    const base = this.aiBaseOf(owner);
    if (!base) return;
    const race = base.def.race;
    const res = this.resOf(owner);
    this.updateSupply();
    const sup = this.supplyOf(owner);

    const workers = this.entities.filter(
      (e) =>
        e.alive &&
        e.owner === owner &&
        !e.def.isBuilding &&
        e.def.builds?.length &&
        e.def.id !== "larva"
    );

    // 1) 空闲农民 → 最近矿（采集循环由 updateGather 每帧接管）
    for (const w of workers) {
      if (w.gatherState !== "idle" || w.buildTarget || w.gatherTarget) continue;
      const m = this.nearestMineral(w);
      if (m) {
        w.gatherTarget = m;
        w.gatherState = "toResource";
        w.combatTarget = null;
      }
    }

    // 2) 补给：富余 ≤2 时优先补（虫族训领主；人族/神族建造，同一时刻只允许一个在建）
    if (sup.provided - sup.used <= 2 && sup.provided < 60) {
      if (race === "zerg") {
        const hatch = this.entities.find(
          (e) =>
            e.alive &&
            e.owner === owner &&
            e.constructed &&
            e.def.larvaMorph &&
            e.trainQueue.length < 2
        );
        if (hatch && this.tryTrain(hatch, "overlord") === null) return;
      } else {
        const sid = AI_SUPPLY_BUILDING[race];
        if (sid && res.minerals >= ALL_DEFS[sid].minerals) {
          const building = this.entities.some(
            (e) => e.alive && e.owner === owner && e.def.id === sid && !e.constructed
          );
          if (!building) {
            const spot = this.findBuildSpot(owner, sid);
            if (spot) {
              this.placeBuilding(sid, spot.gx, spot.gy, owner);
              return;
            }
          }
        }
      }
    }

    // 3) 造农：低于目标且主基地队列空闲（资源/人口/幼虫校验交给 tryTrain）
    const workerId = AI_WORKER[race];
    if (
      workers.length < AI_WORKER_TARGET &&
      base.trainQueue.length === 0 &&
      this.trainableListOf(base).includes(workerId)
    ) {
      this.tryTrain(base, workerId);
    }

    // 4) 产能建筑：一个都没有（含在建）就建一个
    const prodId = AI_PRODUCTION_BUILDING[race];
    if (
      prodId &&
      res.minerals >= ALL_DEFS[prodId].minerals &&
      !this.entities.some((e) => e.alive && e.owner === owner && e.def.id === prodId)
    ) {
      const spot = this.findBuildSpot(owner, prodId);
      if (spot) {
        this.placeBuilding(prodId, spot.gx, spot.gy, owner);
        return;
      }
    }

    // 5) 出兵：产能建筑按队列长短取最闲的一个，偏好列表里首个可负担项
    const prefs = AI_COMBAT_UNITS[race] ?? [];
    if (prefs.length === 0) return;
    const producers = this.entities
      .filter(
        (e) =>
          e.alive &&
          e.owner === owner &&
          e.constructed &&
          e.trainQueue.length < 2 &&
          this.trainableListOf(e).some((id) => prefs.includes(id))
      )
      .sort((a, b) => a.trainQueue.length - b.trainQueue.length);
    if (producers.length === 0) return;
    const pb = producers[0];
    const resNow = this.resOf(owner);
    for (const id of this.trainableListOf(pb).filter((x) => prefs.includes(x))) {
      const d = ALL_DEFS[id];
      if (resNow.minerals >= d.minerals && resNow.vespene >= d.vespene) {
        this.tryTrain(pb, id);
        break;
      }
    }
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;

    // 相机边界兜底：Phaser 4 RESIZE 下 setBounds 失效（cam.width=0），
    // 每帧把 scroll 夹回地图范围，任何移动相机的路径（拖动/跳转/方向键）都不会露黑边
    this.clampCamScroll();

    // 每帧重建动态障碍集（完工建筑占地格 + 资源格）供 A* 与直线移动共用：
    // 未完工建筑放行（工人要进格施工）；实体量级 <200，重建开销可忽略
    const blocked = new Set<number>();
    for (const e of this.entities) {
      if (!e.alive) continue;
      if (e.def.isBuilding) {
        if (!e.constructed) continue;
        const fp = this.footprintOf(e.def);
        const x0 = Math.round(e.x - fp / 2);
        const y0 = Math.round(e.y - fp / 2);
        for (let x = x0; x < x0 + fp; x++)
          for (let y = y0; y < y0 + fp; y++) blocked.add(y * MAP_COLS + x);
      } else if (e.def.isNeutral) {
        blocked.add(Math.floor(e.y) * MAP_COLS + Math.floor(e.x));
      }
    }
    setDynamicBlocked(blocked);

    // 悬停名签跟随（实体移动/相机滚动时位置每帧校正）
    this.syncHoverName();

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
      // 被装载的乘客完全冻结：不更新、不索敌（容器已隐藏，生死由运输机代管）
      if (e.host) continue;
      try {
        e.updateCombat(dt);
        // 锁定冻结：跳过装载/施工/采集/治疗等一切行为分支（战斗/移动已在 updateCombat 拦截）
        if (!e.def.isBuilding && e.lockedTimer <= 0) {
          // 运输机前往装载 > 施工 > 采集 > SCV 修理 > medic 自动治疗 > 采集兜底
          if (e.loadTarget) this.updateTransport(e, dt);
          else if (e.buildTarget) this.updateBuild(e, dt);
          else if (e.gatherTarget || e.gatherState !== "idle") this.updateGather(e, dt);
          else if (e.repairTarget) this.updateRepair(e, dt);
          else if (e.def.healAmount) this.updateHeal(e, dt);
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

    // 生产推进：训练队列 + 虫族幼虫再生（放在渲染同步前，新出场的单位当帧即投影）
    this.updateTraining(dt);

    // 建筑形态变异 + 科技研究推进（与训练同层的建筑计时管线）
    this.updateMorph(dt);
    this.updateResearch(dt);

    // AI 经济决策：分阵营错峰 tick（采集/补农/补给/建造/出兵）
    this.updateAI(dt);

    // 胜负判定：存活实体扫描（VICTORY_CHECK_INTERVAL 节流），终局后横幅常驻、AI 停摆
    this.updateVictory(dt);

    // 核弹引导推进（装填冷却 / ghost 死亡·位移打断 / 倒计时 / 引爆）
    this.updateNuke(dt);

    // 航母拦截机出击/回收推进（弹出停泊机 / 无目标机飞回母舰）
    this.updateInterceptors(dt);

    // 碉堡进驻走位推进（步兵走向碉堡，1.2 格内装载复用乘客状态机）
    this.updateGarrison(dt);

    // 战争迷雾推进（FOG_UPDATE_INTERVAL 节流）：可见集重算 + 覆盖层/小地图重绘
    this.updateFog(dt);

    // 蜘蛛雷推进（布雷激活延时 + 敌触引爆 + 标记重绘）
    this.updateMines(dt);

    // 灵能风暴推进（多波 AoE 计时 + 闪电特效重绘）
    this.updateStorms(dt);

    // 渲染同步（投影到屏幕 + 深度排序）
    for (const e of this.entities) {
      if (!e.alive) continue;
      e.syncRender();
    }

    // 死亡清理：先播 death 序列帧动画（约 0.7s），播完才销毁实体；
    // 无序列帧的实体（中立资源等）立即走原清理路径。
    const before = this.entities.length;
    this.entities = this.entities.filter((e) => {
      if (e.alive) return true;
      if (e.deathTimer < 0) e.startDeath(); // 首次发现死亡：开启动画并暂留
      if (e.deathTimer > 0) return true; // 动画播放中，暂不销毁
      this.spawnDeathFx(e);
      // 销毁“单位容器”即连带销毁其下的 sprite/hpBar/selectionRing，
      // 并把容器从 entityLayer 移除，避免死亡实体在场景树里留空节点。
      e.container.destroy();
      if (e.gatherTarget) e.gatherTarget = null;
      return false;
    });
    // 死亡动画计时（放在 filter 后：本帧新启动的动画下一帧才开始倒数）。
    // 必须钳制在 0：负值是"未开始"哨兵（-1），倒计时冲过 0 变负会被 filter
    // 误判为未开始而反复 startDeath 重置，导致尸体永不销毁。
    for (const e of this.entities) {
      if (!e.alive && e.deathTimer > 0) e.deathTimer = Math.max(0, e.deathTimer - dt * 1000);
    }
    if (this.entities.length !== before) this.updateSupply();

    // 选中变化 → 同步训练面板；面板建筑死亡/取消选中/未完工 → 关闭
    const sig = this.selection.map((e) => e.id).join(",");
    if (sig !== this.selSig) {
      this.selSig = sig;
      this.syncTrainPanel();
    } else if (this.trainPanel) {
      const pb = this.entities.find((e) => e.id === this.trainPanel!.buildingId);
      if (!pb || !pb.alive || !pb.selected || !pb.constructed) this.closeTrainPanel();
    }

    this.updateHud();
    this.liquidUI?.minimap.refresh(this.entities, {
      data: this.fog,
      cols: MAP_COLS,
      rows: MAP_ROWS,
    });

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

  /** medic 自动治疗：空闲（无手动指令）时找 SIGHT_RANGE 格内受伤友军，
   * 走近后按 attackInterval 每跳回复 healAmount（绿色治疗光束）。
   * 手动指令优先：moveTarget/gatherTarget/buildTarget 非空时暂停走近与治疗
   * 但不丢目标，停下后自动恢复；目标死亡/满血自动换人，无人可治回待命。 */
  updateHeal(e: Entity, dt: number) {
    // 目标失效（死亡/已满血）→ 清引用重新找
    if (e.healTarget && (!e.healTarget.alive || e.healTarget.hp >= e.healTarget.maxHp)) {
      e.healTarget = null;
    }
    // 无目标：视野内找最近的受伤友军（不含建筑、不含自己）
    if (!e.healTarget) {
      let best: Entity | null = null;
      let bestD = Infinity;
      for (const o of this.entities) {
        if (o === e || !o.alive || o.def.isBuilding || o.owner !== e.owner) continue;
        if (o.hp >= o.maxHp) continue;
        const d = Phaser.Math.Distance.Between(e.x, e.y, o.x, o.y);
        if (d > SIGHT_RANGE || d >= bestD) continue;
        bestD = d;
        best = o;
      }
      e.healTarget = best;
    }
    const t = e.healTarget;
    if (!t) return;
    // 手动指令优先：暂停走近与治疗，但不丢目标
    if (e.moveTargetX !== null || e.gatherTarget || e.buildTarget) return;
    const d = Phaser.Math.Distance.Between(e.x, e.y, t.x, t.y);
    const reach = (e.def.range ?? 0) / TILE_W + e.r / TILE_W + t.r / TILE_W;
    if (d > reach) {
      e.stepMove(dt, t.x, t.y);
      return;
    }
    if (e.healCooldown > 0) e.healCooldown -= dt * 1000;
    if (e.healCooldown <= 0) {
      e.healCooldown = e.def.attackInterval ?? 1000;
      t.hp = Math.min(t.maxHp, t.hp + (e.def.healAmount ?? 6));
      this.drawShot(e, t, 0x33ff66); // 绿色治疗光束
    }
  }

  /** SCV 修理推进：走位贴身后按 REPAIR_RATE 持续回血；目标失效/满血/出现新指令即放弃
   * （修理目标由 commandRightClick 右键指定，starcraft 式人族农民专属） */
  updateRepair(e: Entity, dt: number) {
    const t = e.repairTarget;
    if (!t || !t.alive || t.owner !== e.owner || t.hp >= t.maxHp) {
      e.repairTarget = null;
      return;
    }
    // 手动指令优先：出现移动/采集/建造指令即放弃修理
    if (e.moveTargetX !== null || e.gatherTarget || e.buildTarget) {
      e.repairTarget = null;
      return;
    }
    const d = Phaser.Math.Distance.Between(e.x, e.y, t.x, t.y);
    // reach 含贴边兜底 0.85：目标建筑格是寻路障碍，SCV 只能站邻格修理
    const reach = Math.max(
      e.r / TILE_W + t.r / TILE_W + 0.35,
      (e.r + t.r) / TILE_W + 0.85
    );
    if (d > reach) {
      e.stepMove(dt, t.x, t.y);
      return;
    }
    t.hp = Math.min(t.maxHp, t.hp + REPAIR_RATE * dt);
  }

  /** 运输机装载推进：走位到目标身边即装入；目标失效/装不下即放弃 */
  updateTransport(e: Entity, dt: number) {
    const t = e.loadTarget;
    if (!t) return;
    if (
      !t.alive ||
      t.host ||
      t.isAir ||
      t.def.isBuilding ||
      t.owner !== e.owner ||
      e.cargoSpaceLeft < (t.def.cargoSize ?? 1)
    ) {
      e.loadTarget = null;
      return;
    }
    const d = Phaser.Math.Distance.Between(e.x, e.y, t.x, t.y);
    const reach = e.r / TILE_W + t.r / TILE_W + 0.35;
    if (d > reach) {
      e.stepMove(dt, t.x, t.y);
      return;
    }
    e.loadUnit(t);
    e.loadTarget = null;
    // 乘客若在选区中（装载前被选中），装载后移出选区
    if (this.selection.includes(t)) {
      t.selected = false;
      this.selection = this.selection.filter((s) => s !== t);
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
      if (d <= res.r / TILE_W + e.r / TILE_W + 0.85) {
        // 余量 0.85：资源格是寻路障碍，单位最远停在邻格（对角 1.41 格），
        // 阈值必须覆盖八邻格，否则采集死循环走位
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
      // 到达基地阈值按格换算（r 像素 → 格换算）；基地格是寻路障碍，
      // 余量 0.8 覆盖贴边停靠（正邻/对角邻格），否则返程死循环走位
      if (d <= b.r / TILE_W + e.r / TILE_W + 0.8) {
        const bucket = this.resOf(e.owner);
        if (res.def.id === "mineral") bucket.minerals += e.carrying;
        else bucket.vespene += e.carrying;
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
    // 按 owner 分桶全量重算（AI 经济前置）；玩家桶经 getter 供 HUD/面板使用
    for (const k of Object.keys(this.supplyBy)) {
      this.supplyBy[k].provided = 0;
      this.supplyBy[k].used = 0;
    }
    for (const e of this.entities) {
      if (e.owner === "neutral" || !e.alive) continue; // 尸体（死亡动画暂留期）不占/不提供人口
      const sup = this.supplyOf(e.owner);
      // 未完工建筑不提供人口（完工时 finishBuilding 触发重算）
      if (e.def.supplyProvided && e.constructed && !e.def.upgradeOf) sup.provided += e.def.supplyProvided;
      if (e.def.supplyCost) sup.used += e.def.supplyCost;
      // 训练队列中的单位即时占用人口（排队即锁定，与星际一致）
      for (const j of e.trainQueue) sup.used += ALL_DEFS[j.defId]?.supplyCost ?? 0;
    }
  }

  /** 大和炮：校验（能量/隐形锁定）→ 扣能 → 穿盾伤害 → 专属特效 */
  fireYamato(caster: Entity, target: Entity) {
    const cost = caster.def.yamatoCost ?? 150;
    if (!caster.def.yamatoDamage) return;
    if (caster.energy < cost) {
      this.showHint(`能量不足（需 ${cost}）`);
      return;
    }
    if (target.isCloakedNow && !caster.canSeeCloaked(target)) {
      this.showHint("无法锁定目标");
      return;
    }
    caster.energy -= cost;
    this.spawnYamatoFx(caster, target);
    // 星际式穿盾：大和炮伤害无视护盾直接扣血
    target.takeDamage(caster.def.yamatoDamage, caster, true);
  }

  /** 锁定（ghost Lockdown）：目标须为敌方机械单位、未处于锁定、施放距离内。
   * 被锁定目标清空指令原地冻结（移动/攻击/采集/装载全停），蓝色 tint，持续 LOCKDOWN_DURATION。 */
  fireLockdown(caster: Entity, target: Entity) {
    if (target.def.isBuilding) {
      this.showHint("锁定只能作用于机械单位");
      return;
    }
    if (!target.def.mechanical) {
      this.showHint("锁定目标必须是机械单位");
      return;
    }
    if (target.lockedTimer > 0) {
      this.showHint("目标已被锁定");
      return;
    }
    if (Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y) > LOCKDOWN_RANGE) {
      this.showHint("目标超出锁定距离");
      return;
    }
    if (caster.energy < LOCKDOWN_COST) {
      this.showHint(`能量不足（需 ${LOCKDOWN_COST}）`);
      return;
    }
    caster.energy -= LOCKDOWN_COST;
    target.lockedTimer = LOCKDOWN_DURATION;
    target.stop(); // 打断当前行动意图（星际式：被锁定的单位立即停摆）
    // 蓝色锁定闪光
    const { sx, sy } = worldToScreen(target.x, target.y);
    const g = this.add.image(sx, sy - target.sprite.displayHeight * 0.3, "glow_white").setDepth(3001);
    g.setTint(0x4477ff);
    g.setScale(1.5);
    this.uiLayer.add(g);
    this.tweens.add({
      targets: g,
      alpha: 0,
      scale: 2.5,
      duration: 400,
      onComplete: () => g.destroy(),
    });
    this.showHint(`已锁定 ${target.def.name}`);
  }

  /** 核弹：ghost 指定落点 → 原地显形引导 NUKE_GUIDE_MS → 半径 NUKE_RADIUS 格溅射。
   * 前置科学站 + 全局装填冷却（发射即开始倒数，引导期含在内）。 */
  launchNuke(ghost: Entity, wx: number, wy: number) {
    if (!ghost.alive) return;
    this.nukeGhost = ghost;
    this.nukeX = wx;
    this.nukeY = wy;
    this.nukeTimer = NUKE_GUIDE_MS;
    this.nukeLaunchX = ghost.x;
    this.nukeLaunchY = ghost.y;
    this.nukeCooldown = NUKE_COOLDOWN;
    // 引导期全程显形（星际式：ghost 必须原地引导，暴露可被击杀打断）
    if (ghost.def.cloakRevealsOnAttack) ghost.revealTimer = NUKE_GUIDE_MS;
    // 落点标记：红色半径圈（等距 2:1 压扁）+ 十字准星 + 倒计时文字
    const { sx, sy } = worldToScreen(wx, wy);
    const rx = NUKE_RADIUS * TILE_W * 0.71; // 格半径 → 屏幕半长轴（iso 投影 √2/2 系数）
    const mk = this.add.graphics().setDepth(2999);
    mk.lineStyle(2, 0xff3333, 0.9);
    mk.strokeEllipse(sx, sy, rx * 2, rx);
    mk.lineStyle(2, 0xff3333, 0.7);
    mk.beginPath();
    mk.moveTo(sx - rx, sy);
    mk.lineTo(sx + rx, sy);
    mk.moveTo(sx, sy - rx / 2);
    mk.lineTo(sx, sy + rx / 2);
    mk.strokePath();
    this.uiLayer.add(mk);
    this.nukeMarker = mk;
    const txt = this.add
      .text(sx, sy - rx / 2 - 16, "", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#ff5555",
      })
      .setOrigin(0.5)
      .setDepth(3002);
    this.uiLayer.add(txt);
    this.nukeText = txt;
    this.showHint(`核弹引导中（${NUKE_GUIDE_MS / 1000}s 后命中）`);
  }

  /** 核弹引导推进：ghost 死亡/离开引导点即打断；倒计时归零引爆 */
  updateNuke(dt: number) {
    if (this.nukeCooldown > 0) {
      this.nukeCooldown = Math.max(0, this.nukeCooldown - dt * 1000);
    }
    if (!this.nukeGhost) return;
    // 瞄准态（未发射）：仅等待左键落点/右键取消，无引导逻辑
    if (this.nukeTimer <= 0) return;
    const g = this.nukeGhost;
    if (
      !g.alive ||
      Phaser.Math.Distance.Between(g.x, g.y, this.nukeLaunchX, this.nukeLaunchY) > 0.1
    ) {
      this.cancelNuke(g.alive ? "核弹引导被打断" : "引导 ghost 阵亡，核弹取消");
      return;
    }
    this.nukeTimer -= dt * 1000;
    if (this.nukeText) {
      this.nukeText.setText(`${Math.max(0, Math.ceil(this.nukeTimer / 1000))}`);
    }
    if (this.nukeTimer <= 0) this.explodeNuke();
  }

  /** 取消核弹引导：清落点标记与引导态（装填冷却不退——核弹已打出） */
  cancelNuke(msg: string) {
    this.nukeGhost = null;
    this.nukeTimer = 0;
    this.nukeMarker?.destroy();
    this.nukeText?.destroy();
    this.nukeMarker = null;
    this.nukeText = null;
    this.showHint(msg);
  }

  /** 核弹引爆：大爆闪 + 半径内全部实体溅射（敌我通吃含建筑，中立资源豁免，非穿盾） */
  explodeNuke() {
    const gh = this.nukeGhost;
    const { sx, sy } = worldToScreen(this.nukeX, this.nukeY);
    const boom = this.add.image(sx, sy, "glow_white").setDepth(3001);
    boom.setTint(0xffaa44);
    boom.setScale(2);
    this.uiLayer.add(boom);
    this.tweens.add({
      targets: boom,
      alpha: 0,
      scale: 14,
      duration: 700,
      onComplete: () => boom.destroy(),
    });
    const flash = this.add.image(sx, sy, "glow_white").setDepth(3002);
    flash.setScale(1);
    this.uiLayer.add(flash);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 8,
      duration: 450,
      onComplete: () => flash.destroy(),
    });
    for (const e of this.entities) {
      if (!e.alive || e.host || e.def.isNeutral) continue;
      if (Phaser.Math.Distance.Between(this.nukeX, this.nukeY, e.x, e.y) <= NUKE_RADIUS) {
        e.takeDamage(NUKE_DAMAGE, gh ?? undefined);
      }
    }
    this.cancelNuke("核弹命中");
  }

  /* ============ 航母拦截机（出击/回收状态机） ============ */

  /** 每帧：航母锁定目标 → 机库全部停泊拦截机弹出出击；无目标的出击拦截机
   * 飞回母舰（INTERCEPTOR_REDOCK_DIST 内停泊隐藏）。拦截机自主索敌已被
   * dock 排除（只打母舰指派目标 + 受击反击），开火走常规 updateCombat。 */
  updateInterceptors(dt: number) {
    for (const c of this.entities) {
      if (!c.alive || !c.def.interceptorBay) continue;
      // 出击：航母有有效目标 → 全部停泊机沿随机方向弹出
      const t = c.combatTarget;
      if (t && t.alive) {
        for (const it of c.bay) {
          if (!it.alive || !it.host) continue; // host 非空 = 停泊中才弹出；空 = 已出击
          it.host = null;
          it.container.setVisible(true);
          const ang = Math.random() * Math.PI * 2;
          it.x = c.x + Math.cos(ang) * INTERCEPTOR_LAUNCH_OFFSET;
          it.y = c.y + Math.sin(ang) * INTERCEPTOR_LAUNCH_OFFSET;
          it.orderAttack(t); // 拦截机 dmg>0 且目标已过航母 canAttackTarget，同标准可锁定
        }
      }
      // 回收：无目标的出击拦截机飞回母舰
      for (const it of c.bay) {
        if (!it.alive || it.host || !it.dock || it.combatTarget) continue;
        const d = Phaser.Math.Distance.Between(it.x, it.y, c.x, c.y);
        if (d <= INTERCEPTOR_REDOCK_DIST) it.dockIn(c);
        else it.stepMove(dt, c.x, c.y);
      }
    }
  }

  /* ============ 碉堡进驻（步兵走向碉堡装载） ============ */

  /** 每帧：garrisonTarget 非空的步兵走向碉堡，1.2 格内 loadUnit 装载
   * （复用乘客状态机：隐藏/host 代管/不可锁定；碉堡死亡或满员即放弃） */
  updateGarrison(dt: number) {
    for (const e of this.entities) {
      if (!e.alive || !e.garrisonTarget || e.host) continue;
      const b = e.garrisonTarget;
      if (!b.alive || !b.def.isBuilding || !b.def.cargoCapacity) {
        e.garrisonTarget = null;
        continue;
      }
      const d = Phaser.Math.Distance.Between(e.x, e.y, b.x, b.y);
      if (d <= 1.2) {
        if (b.cargoSpaceLeft >= (e.def.cargoSize ?? 1)) b.loadUnit(e);
        e.garrisonTarget = null;
      } else {
        e.stepMove(dt, b.x, b.y);
      }
    }
  }

  /* ============ 布雷 / 法术（蜘蛛雷 / 灵能风暴 / 精神控制） ============ */

  /** 每帧：雷激活延时倒数 → 敌方地面单位触发即 AoE 引爆 → 标记重绘。
   * 雷 = 轻量对象（非 Entity）：不可被攻击、敌方隐形（仅己方画标记），
   * 布雷车死亡不影响已布雷；AI 雷车不布雷（aiTick 无此决策）。 */
  updateMines(dt: number) {
    let dirty = false;
    for (let i = this.spiderMines.length - 1; i >= 0; i--) {
      const m = this.spiderMines[i];
      if (m.armMs > 0) {
        m.armMs = Math.max(0, m.armMs - dt * 1000);
        continue; // 激活延时内不触发
      }
      // 触发：敌方地面单位（建筑/中立/空军/乘客不触发）进入触发半径
      let victim: Entity | null = null;
      for (const e of this.entities) {
        if (!e.alive || e.host || e.def.isNeutral || e.def.isBuilding || e.isAir) continue;
        if (e.owner === m.owner) continue;
        if (Phaser.Math.Distance.Between(m.x, m.y, e.x, e.y) <= SPIDER_MINE_TRIGGER) {
          victim = e;
          break;
        }
      }
      if (!victim) continue;
      // 引爆：溅射半径内敌方地面单位受伤（from 缺省 → 不触发受击反击指向雷）
      for (const e of this.entities) {
        if (!e.alive || e.host || e.def.isNeutral || e.def.isBuilding || e.isAir) continue;
        if (e.owner === m.owner) continue;
        if (Phaser.Math.Distance.Between(m.x, m.y, e.x, e.y) <= SPIDER_MINE_SPLASH) {
          e.takeDamage(SPIDER_MINE_DAMAGE);
        }
      }
      // 爆炸特效（橙黄小爆闪）
      const { sx, sy } = worldToScreen(m.x, m.y);
      const boom = this.add.image(sx, sy, "glow_white").setDepth(3001);
      boom.setTint(0xffaa33);
      this.uiLayer.add(boom);
      this.tweens.add({
        targets: boom,
        alpha: 0,
        scale: 5,
        duration: 350,
        onComplete: () => boom.destroy(),
      });
      this.spiderMines.splice(i, 1);
      dirty = true;
    }
    // 标记重绘：仅己方（玩家视角）雷显示；激活中亮红、潜伏淡黄
    const g = this.mineGfx;
    g.clear();
    for (const m of this.spiderMines) {
      if (ownerIsAI(m.owner)) continue; // 敌方雷对玩家隐形（简化：无侦测显示）
      const { sx, sy } = worldToScreen(m.x, m.y);
      const armed = m.armMs <= 0;
      g.fillStyle(armed ? 0xff5533 : 0xffd24a, armed ? 0.9 : 0.45);
      g.fillPoints(
        [
          new Phaser.Math.Vector2(sx, sy - 5),
          new Phaser.Math.Vector2(sx + 5, sy),
          new Phaser.Math.Vector2(sx, sy + 5),
          new Phaser.Math.Vector2(sx - 5, sy),
        ],
        true
      );
    }
    if (dirty) this.updateHud(); // 布雷不耗资源，仅为一致性刷新（可省，保持惯例）
  }

  /** 灵能风暴：ht 指定落点 → STORM_TICKS 波（间隔 STORM_TICK_INTERVAL），
   * 每波对半径内实体敌我通吃（不含建筑/中立/乘客，星际式风暴不伤建筑）。 */
  castStorm(caster: Entity, wx: number, wy: number) {
    if (!caster.alive) return;
    if (caster.energy < STORM_COST) {
      this.showHint(`能量不足（需 ${STORM_COST}）`);
      return;
    }
    caster.energy -= STORM_COST;
    const gfx = this.add.graphics().setDepth(3001);
    this.uiLayer.add(gfx);
    this.storms.push({ x: wx, y: wy, ticksLeft: STORM_TICKS, timer: 0, gfx });
  }

  /** 每帧：风暴波计时（首波立即）→ 半径内实体受伤（敌我通吃）→ 闪电重绘。 */
  updateStorms(dt: number) {
    for (let i = this.storms.length - 1; i >= 0; i--) {
      const st = this.storms[i];
      st.timer -= dt * 1000;
      if (st.timer <= 0 && st.ticksLeft > 0) {
        st.ticksLeft--;
        st.timer = STORM_TICK_INTERVAL;
        for (const e of this.entities) {
          if (!e.alive || e.host || e.def.isNeutral || e.def.isBuilding) continue;
          if (Phaser.Math.Distance.Between(st.x, st.y, e.x, e.y) <= STORM_RADIUS) {
            e.takeDamage(STORM_TICK_DAMAGE, this.stormCaster ?? undefined);
          }
        }
      }
      // 闪电特效：半径圈 + 随机短亮线（每帧重画产生闪烁）
      const g = st.gfx;
      g.clear();
      const { sx, sy } = worldToScreen(st.x, st.y);
      const rx = STORM_RADIUS * TILE_W * 0.71;
      g.lineStyle(1.5, 0x66aaff, 0.8);
      g.strokeEllipse(sx, sy, rx * 2, rx);
      g.lineStyle(2, 0x99ccff, 0.9);
      for (let k = 0; k < 10; k++) {
        const ang = Math.random() * Math.PI * 2;
        const r = Math.random() * rx;
        const x1 = sx + Math.cos(ang) * r;
        const y1 = sy + Math.sin(ang) * r * 0.5;
        const x2 = x1 + (Math.random() - 0.5) * 18;
        const y2 = y1 + (Math.random() - 0.5) * 9;
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.strokePath();
      }
      if (st.ticksLeft <= 0 && st.timer <= STORM_TICK_INTERVAL - 150) {
        // 末波后再留 150ms 闪电余韵
        g.destroy();
        this.storms.splice(i, 1);
      }
    }
  }

  /** 精神控制：darkarchon 永久策反敌方单位（非建筑）。所有权切换 + 指令清空 +
   * 容器可见性修正（迷雾外 AI 实体可能是隐藏态）+ 人口重算（owner 变更不改实体数）。 */
  fireMindControl(caster: Entity, target: Entity) {
    if (target.def.isBuilding) {
      this.showHint("无法控制建筑");
      return;
    }
    if (Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y) > MIND_CONTROL_RANGE) {
      this.showHint("目标超出施法距离");
      return;
    }
    if (caster.energy < MIND_CONTROL_COST) {
      this.showHint(`能量不足（需 ${MIND_CONTROL_COST}）`);
      return;
    }
    caster.energy -= MIND_CONTROL_COST;
    const oldOwner = target.owner;
    target.owner = caster.owner as Owner;
    target.stop(); // 清战斗/移动/采集/建造等全部指令
    // 迷雾容器可见性：被控单位变为玩家阵营后恒显示（recomputeFog 不再碰它）
    target.container.setVisible(true);
    this.updateSupply(); // owner 变更不改实体数，死亡清理钩子不会触发重算
    // 紫色策反闪光
    const { sx, sy } = worldToScreen(target.x, target.y);
    const g = this.add.image(sx, sy - target.sprite.displayHeight * 0.3, "glow_white").setDepth(3001);
    g.setTint(0xaa44ff);
    g.setScale(1.6);
    this.uiLayer.add(g);
    this.tweens.add({
      targets: g,
      alpha: 0,
      scale: 2.8,
      duration: 500,
      onComplete: () => g.destroy(),
    });
    console.log(`[mind control] ${target.def.name}: ${oldOwner} -> ${target.owner}`);
    this.showHint(`已控制 ${target.def.name}`);
  }

  /** 大和炮特效：粗蓝光柱 + 大范围闪光爆点 */
  spawnYamatoFx(from: Entity, to: Entity) {
    const { sx: sx1, sy: sy1 } = worldToScreen(from.x, from.y);
    const { sx: sx2, sy: sy2 } = worldToScreen(to.x, to.y);
    const line = this.add.graphics().setDepth(3000);
    this.uiLayer.add(line);
    line.lineStyle(5, 0x88ccff, 1);
    line.beginPath();
    line.moveTo(sx1, sy1 - from.sprite.displayHeight * 0.4);
    line.lineTo(sx2, sy2 - to.sprite.displayHeight * 0.4);
    line.strokePath();
    this.tweens.add({
      targets: line,
      alpha: 0,
      duration: 320,
      onComplete: () => line.destroy(),
    });
    const g = this.add.image(sx2, sy2 - to.sprite.displayHeight * 0.4, "glow_white").setDepth(3001);
    g.setTint(0x99ddff);
    g.setScale(3);
    this.uiLayer.add(g);
    this.tweens.add({
      targets: g,
      alpha: 0,
      scale: 7,
      duration: 380,
      onComplete: () => g.destroy(),
    });
  }

  drawShot(from: Entity, to: Entity, tint?: number) {
    // 迷雾外敌方开火不画弹道/爆点（从"看不见的地方"射来的线会暴露位置）
    if (ownerIsAI(from.owner) && this.fogStateAt(from.x, from.y) < 2) return;
    const color = tint ?? ownerColor(from.owner);
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
    // 迷雾外敌方死亡不画特效（尸体/碎裂在迷雾外不可见）
    if (ownerIsAI(e.owner) && this.fogStateAt(e.x, e.y) < 2) return;
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
    // 重算人口（含训练队列占用）并刷新面板按钮可用态——余额变化时置灰跟随
    this.updateSupply();
    this.refreshBuildPanel();
    this.refreshTrainPanel();
    const n = this.entities.filter((e) => e.owner === "player" && !e.def.isNeutral).length;
    this.liquidUI.setStats({
      minerals: this.minerals,
      vespene: this.vespene,
      supplyUsed: this.supplyUsed,
      supplyProvided: this.supplyProvided,
      unitCount: n,
      selCount: this.selection.length,
      hint: "左键点建筑 → 底部面板点按钮造兵 · 右键移动/攻击/采集 · 中键拖地图 · A+左键 攻击移动 · ESC 取消",
    });
  }

  /* —— 战争迷雾（玩家视角三态；纯表现层，不影响任何战斗/索敌判定）—— */

  /** 格坐标 → 迷雾态（带外=未探索） */
  fogStateAt(x: number, y: number): number {
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    if (gx < 0 || gy < 0 || gx >= MAP_COLS || gy >= MAP_ROWS) return 0;
    return this.fog[gy * MAP_COLS + gx];
  }

  /** 迷雾节拍（FOG_UPDATE_INTERVAL 节流）：重算可见集 → 重绘覆盖层/小地图迷雾 */
  private updateFog(dt: number) {
    this.fogTimer -= dt;
    if (this.fogTimer > 0) return;
    this.fogTimer = FOG_UPDATE_INTERVAL / 1000;
    this.recomputeFog();
    this.redrawFogOverlay();
    this.liquidUI?.minimap.updateFog({
      data: this.fog,
      cols: MAP_COLS,
      rows: MAP_ROWS,
    });
  }

  /** 可见集重算：可见(2)整体退化为已探索(1)，再按玩家实体视野半径盖章圆形
   * （单位 SIGHT_RANGE / 建筑 FOG_SIGHT_BUILDING）；随后同步敌方实体容器
   * 可见性——迷雾外的敌人不渲染（资源/我方恒显示）。 */
  private recomputeFog() {
    const f = this.fog;
    for (let i = 0; i < f.length; i++) if (f[i] === 2) f[i] = 1;
    for (const e of this.entities) {
      if (!e.alive || e.owner !== "player") continue;
      const r = e.def.isBuilding ? FOG_SIGHT_BUILDING : SIGHT_RANGE;
      const r2 = r * r;
      const x0 = Math.max(0, Math.floor(e.x - r));
      const x1 = Math.min(MAP_COLS - 1, Math.ceil(e.x + r));
      const y0 = Math.max(0, Math.floor(e.y - r));
      const y1 = Math.min(MAP_ROWS - 1, Math.ceil(e.y + r));
      for (let gy = y0; gy <= y1; gy++) {
        for (let gx = x0; gx <= x1; gx++) {
          const dx = gx + 0.5 - e.x;
          const dy = gy + 0.5 - e.y;
          if (dx * dx + dy * dy <= r2) f[gy * MAP_COLS + gx] = 2;
        }
      }
    }
    for (const e of this.entities) {
      if (e.def.isNeutral || e.owner === "player") continue;
      const vis = this.fogStateAt(e.x, e.y) >= 2;
      if (e.container.visible !== vis) e.container.visible = vis;
    }
  }

  /** 覆盖层重绘：逐格菱形贴各自地形高度（未探索不透明黑 / 已探索暗化），
   * 并向下补侧壁裙边——tilemap 高地侧壁像素不被顶面菱形覆盖；未探索恒补
   * （黑上叠黑无痕），已探索仅在高差处补（同 alpha 菱形叠画会出现双重暗带）。 */
  private redrawFogOverlay() {
    const g = this.fogGfx;
    g.clear();
    for (let gy = 0; gy < MAP_ROWS; gy++) {
      for (let gx = 0; gx < MAP_COLS; gx++) {
        const st = this.fog[gy * MAP_COLS + gx];
        if (st === 2) continue;
        const h = heightAt(gx + 0.5, gy + 0.5);
        const { sx, sy } = worldToScreen(gx + 0.5, gy + 0.5, h);
        g.fillStyle(0x000000, st === 0 ? 1 : FOG_EXPLORED_ALPHA);
        g.fillPoints(
          [
            new Phaser.Math.Vector2(sx, sy - HALF_H),
            new Phaser.Math.Vector2(sx + HALF_W, sy),
            new Phaser.Math.Vector2(sx, sy + HALF_H),
            new Phaser.Math.Vector2(sx - HALF_W, sy),
          ],
          true
        );
        const skirt =
          st === 0
            ? ELEV
            : Math.max(
              0,
              h - Math.max(heightAt(gx + 1.5, gy + 0.5), heightAt(gx + 0.5, gy + 1.5))
            ) * ELEV;
        if (skirt > 0) {
          // 左/右两块平行四边形，贴住菱形下缘侧壁（与菱形无缝、互不叠画）
          g.fillPoints(
            [
              new Phaser.Math.Vector2(sx - HALF_W, sy),
              new Phaser.Math.Vector2(sx, sy + HALF_H),
              new Phaser.Math.Vector2(sx, sy + HALF_H + skirt),
              new Phaser.Math.Vector2(sx - HALF_W, sy + skirt),
            ],
            true
          );
          g.fillPoints(
            [
              new Phaser.Math.Vector2(sx, sy + HALF_H),
              new Phaser.Math.Vector2(sx + HALF_W, sy),
              new Phaser.Math.Vector2(sx + HALF_W, sy + skirt),
              new Phaser.Math.Vector2(sx, sy + HALF_H + skirt),
            ],
            true
          );
        }
      }
    }
  }

  // —— 胜负判定 ——

  /** 存活实体扫描（VICTORY_CHECK_INTERVAL 节流）：玩家全灭=失败 /
   * create 快照的全部 AI 阵营全灭=胜利。中立资源不计入任何阵营。 */
  private updateVictory(dt: number) {
    if (this.gameOver) return;
    this.victoryTimer += dt;
    if (this.victoryTimer < VICTORY_CHECK_INTERVAL) return;
    this.victoryTimer = 0;
    if (!this.entities.some((e) => e.alive && e.owner === "player")) {
      this.endGame("defeat");
      return;
    }
    if (this.aiOwners.length > 0) {
      let allDead = true;
      for (const owner of this.aiOwners) {
        if (this.entities.some((e) => e.alive && e.owner === owner)) {
          allDead = false;
          break;
        }
      }
      if (allDead) this.endGame("victory");
    }
  }

  /** 终局：中央横幅常驻（金色胜利 / 红色失败）+ AI 停摆；死亡动画/渲染照常 */
  private endGame(result: "victory" | "defeat") {
    this.gameOver = result;
    const win = result === "victory";
    console.log(`[game over] ${result}`);
    this.showHint(win ? "所有敌对势力已覆灭" : "我方部队全灭");
    const gw = this.scale.gameSize.width;
    const gh = this.scale.gameSize.height;
    const t = this.add
      .text(gw / 2, gh / 2, win ? "胜  利" : "失  败", {
        fontFamily: "Consolas, 'Courier New', monospace",
        fontSize: "56px",
        color: win ? "#ffd24a" : "#ff5252",
        stroke: "#000000",
        strokeThickness: 8,
        backgroundColor: "#00000099",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(6500)
      .setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 600 });
  }

  // —— 编队（Ctrl+1~9）——

  /** 编队热键：ctrl=保存当前玩家选区快照；无 ctrl=选中编队（过滤死亡），
   * 双击同键（400ms 内）相机居中编队中心。 */
  private handleGroupKey(n: number, ctrl: boolean) {
    if (ctrl) {
      const members = this.selection.filter((e) => e.alive && e.owner === "player");
      if (!members.length) {
        this.showHint(`编队 ${n}：当前选区没有可编入的单位`);
        return;
      }
      this.controlGroups[n] = members;
      this.showHint(`编队 ${n} 已保存（${members.length} 个单位）`);
      return;
    }
    const group = (this.controlGroups[n] ?? []).filter((e) => e.alive);
    if (!group.length) return;
    const now = performance.now();
    const doubleTap = n === this.lastGroupKey && now - this.lastGroupTime < 400;
    this.lastGroupKey = n;
    this.lastGroupTime = now;
    this.clearSelection();
    for (const e of group) e.selected = true;
    this.selection = group;
    if (doubleTap) {
      const cx = group.reduce((s, e) => s + e.x, 0) / group.length;
      const cy = group.reduce((s, e) => s + e.y, 0) / group.length;
      const p = worldToScreen(cx, cy, heightAt(cx, cy));
      this.cameras.main.centerOn(p.sx, p.sy);
      this.clampCamScroll();
    }
  }
}

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
  MAP_W,
  MAP_H,
  MAP_LEFT,
  MAP_TOP,
  minZoom,
} from "../iso";
import { buildTerrainTilemap } from "../tilemap";
import { getLostTemple } from "../maps/lostTemple";
import { Minimap } from "../minimap";

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

  /** HUD DOM 节点（跟相机/画布解耦，钉在浏览器视口底部一长条） */
  hudEl: HTMLElement | null = null;

  /** 右上角小地图（点击/拖动跳转相机） */
  minimap?: Minimap;

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
      });

      // 右上角小地图：点击 / 按住拖动 → 相机跳转到对应位置
      this.minimap = new Minimap(cam, (sx, sy) => this.centerCamOn(sx, sy));


      this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onPointerDown(p));
      this.input.on("pointerup", (p: Phaser.Input.Pointer) => this.onPointerUp(p));
      this.input.on("pointermove", (p: Phaser.Input.Pointer) => this.onPointerMove(p));
      this.input.keyboard?.on("keydown-A", () => {
        this.attackMoveMode = true;
      });
      this.input.keyboard?.on("keydown-ESC", () => {
        this.attackMoveMode = false;
        this.clearSelection();
      });

      // HUD：DOM 渲染，跟相机/画布解耦，永远钉在浏览器视口左上角
      this.hudEl = document.getElementById("hud");
      this.updateHud();
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

    // 供给（升级建筑不重复计数）
    if (def.supplyProvided && owner !== "neutral" && !def.upgradeOf) {
      this.supplyProvided += def.supplyProvided;
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
    // 中键拖动中：按位移差反向平移相机（除以 zoom 把画布像素换算回世界像素）
    if (this.cameraDragging) {
      const cam = this.cameras.main;
      cam.scrollX = this.dragCamScroll.x - (p.x - this.dragStartPx.x) / cam.zoom;
      cam.scrollY = this.dragCamScroll.y - (p.y - this.dragStartPx.y) / cam.zoom;
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
      // 点选：在游戏世界坐标下按半径判定（高地单位同样精准）
      let best: Entity | null = null;
      let bestD = Infinity;
      for (const e of this.entities) {
        if (!e.alive || e.owner !== "player" || e.def.isNeutral) continue;
        const d = Phaser.Math.Distance.Between(w.wx, w.wy, e.x, e.y);
        const rr = (e.r ?? 0.5) + 0.9; // 世界单位（格）半径
        if (d < rr && d < bestD) {
          bestD = d;
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
        if (!e.def.isBuilding) this.updateGather(e, dt);
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
    this.minimap?.refresh(this.entities);

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
      if (d <= res.r + e.r + 0.2) {
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
      const base = e.returnTarget;
      if (!base || !base.alive) {
        base && (e.returnTarget = this.nearestBase(e));
      }
      const b = e.returnTarget!;
      const d = Phaser.Math.Distance.Between(e.x, e.y, b.x, b.y);
      if (d <= b.r + e.r + 0.3) {
        if (res.def.id === "mineral") this.minerals += e.carrying;
        else this.vespene += e.carrying;
        e.carrying = 0;
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
      if (o.def.canProduceLarva || o.def.id === "commandCenter" || o.def.id === "nexus") {
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
      if (e.def.supplyProvided && !e.def.upgradeOf) this.supplyProvided += e.def.supplyProvided;
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
    if (!this.hudEl) return;
    const n = this.entities.filter((e) => e.owner === "player" && !e.def.isNeutral).length;
    // 底部一长条：资源/人口/选中信息横排，操作提示靠右
    this.hudEl.innerHTML =
      `<span>矿物 <b>${this.minerals}</b></span>` +
      `<span>瓦斯 <b>${this.vespene}</b></span>` +
      `<span>人口 <b>${this.supplyUsed}/${this.supplyProvided}</b></span>` +
      `<span>我方单位 <b>${n}</b></span>` +
      `<span>选中 <b>${this.selection.length}</b></span>` +
      `<span class="dim">左键框选 · 右键移动/攻击/采集 · 中键拖动地图 · A+左键 攻击移动 · ESC 取消</span>`;
  }
}

// 让未使用的导入保持引用，避免编译告警
void TERRAN_UNITS;
void PROTOSS_UNITS;
void ZERG_UNITS;
void TERRAN_BUILDINGS;
void PROTOSS_BUILDINGS;
void ZERG_BUILDINGS;

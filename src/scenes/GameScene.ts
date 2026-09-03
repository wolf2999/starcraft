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
  FACTION_COLORS,
  GAME_WIDTH,
  GAME_HEIGHT,
} from "../config";
import { generateAll } from "../Textures";
import type { Faction } from "../config";
import {
  TILE_W,
  TILE_H,
  MAP_COLS,
  MAP_ROWS,
  worldToScreen,
  screenToWorld,
  screenRectContainsWorld,
} from "../iso";

export class GameScene extends Phaser.Scene {
  entities: Entity[] = [];
  selection: Entity[] = [];
  selecting = false;
  selStart = new Phaser.Math.Vector2();
  selRect!: Phaser.GameObjects.Graphics;
  attackMoveMode = false;
  attackMoveCursor!: Phaser.GameObjects.Graphics;

  supplyProvided = 0;
  supplyUsed = 0;
  minerals = 50;
  vespene = 0;

  creepLayer!: Phaser.GameObjects.Graphics;
  resourceLayer!: Phaser.GameObjects.Container;
  larvaTimers: { ent: Entity; t: number }[] = [];

  constructor() {
    super("game");
  }

  create() {
    try {
    this.selRect = this.add.graphics().setDepth(6000);
    this.attackMoveCursor = this.add.graphics().setDepth(6000);

    this.cameras.main.setBackgroundColor("#10221a");
    this.creepLayer = this.add.graphics();
    this.creepLayer.setDepth(5);

    generateAll(this);
    this.drawGround();

    // 资源节点（世界格坐标）
    const minerals = [
      [4, 4],
      [5, 4],
      [4, 5],
      [15, 15],
      [14, 15],
      [15, 14],
    ];
    minerals.forEach(([gx, gy]) => this.spawnResource("mineral", gx, gy));
    this.spawnResource("vespene", 7, 6);
    this.spawnResource("vespene", 13, 14);

    // 玩家基地（虫族孵化场）
    this.spawnFromDef(10, 10, "hatchery", "player", true);
    this.spawnFromDef(9, 9, "drone", "player");
    this.spawnFromDef(11, 9, "drone", "player");
    this.spawnFromDef(10, 12, "larva", "player");
    this.spawnFromDef(9.4, 11.4, "larva", "player");
    this.spawnFromDef(10.6, 11.4, "larva", "player");

    // 敌方基地（人族指挥中心和神族基地）
    this.spawnFromDef(15, 15, "cc", "enemy", true);
    this.spawnFromDef(17, 14, "sd", "enemy", true);
    this.spawnFromDef(14, 17, "barracks", "enemy", true);
    this.spawnFromDef(13, 16, "marine", "enemy");
    this.spawnFromDef(16, 13, "marine", "enemy");
    this.spawnFromDef(14, 14, "scv", "enemy");

    this.spawnFromDef(11, 15, "nexus", "enemy", true);
    this.spawnFromDef(10, 15, "pylon", "enemy", true);
    this.spawnFromDef(12, 14, "gateway", "enemy", true);
    this.spawnFromDef(10, 16, "zealot", "enemy");
    this.spawnFromDef(12, 16, "dragoon", "enemy");

    this.updateSupply();

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

    this.add
      .text(12, 12, "", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#cfe",
        backgroundColor: "#00000088",
      })
      .setDepth(5000)
      .setName("hud");
    this.updateHud();
    } catch (e: any) {
      this.add
        .text(12, 80, "ERROR: " + (e?.message || String(e)), {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#ff6666",
          backgroundColor: "#000000cc",
        })
        .setDepth(10000);
      console.error(e);
    }
  }

  drawGround() {
    // 菱形 tile 平铺：按 (gx, gy) 网格循环，投影后铺满整张地图
    for (let gx = 0; gx < MAP_COLS; gx++) {
      for (let gy = 0; gy < MAP_ROWS; gy++) {
        const { sx, sy } = worldToScreen(gx + 0.5, gy + 0.5);
        const img = this.add.image(sx, sy, "tile_ground").setOrigin(0.5, 0.5);
        img.setDepth(gx + gy); // 等距下 gx+gy 越小越靠后
      }
    }
    // 给相机一个合适边界
    this.cameras.main.setBounds(-200, -200, GAME_WIDTH + 400, GAME_HEIGHT + 400);
  }

  spawnResource(id: string, gx: number, gy: number) {
    const def = RESOURCE_DEFS[id];
    const e = new Entity(this, def, gx, gy, "neutral");
    e.hideHpBar = true;
    e.sprite.setDepth(1000 + gx + gy);
    this.entities.push(e);
  }

  spawnFromDef(
    x: number,
    y: number,
    defId: string,
    owner: Faction,
    constructed = true
  ): Entity {
    const def = ALL_DEFS[defId];
    if (!def) return null as any;
    const e = new Entity(this, def, x, y, owner);
    e.constructed = constructed;

    if (def.isBuilding) {
      e.sprite.setDepth(200 + x + y);
    }

    if (def.isNeutral) {
      // 资源节点无所属
    } else if (owner === "enemy") {
      e.setFaction("enemy", FACTION_COLORS.enemy);
    }

    // 神族护盾战斗单位默认护盾满
    if (def.shield) {
      e.maxShield = def.shield;
      e.shield = def.shield;
    }

    // 敌方战斗单位默认好斗
    if (owner === "enemy" && (def.groundDamage || def.airDamage) && !def.isBuilding) {
      e.aggressive = true;
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
    building.larvaeContainer = this.add.container(0, 0);
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

    // 左键开始框选
    this.selecting = true;
    this.selStart.set(p.worldX, p.worldY);
  }

  onPointerMove(p: Phaser.Input.Pointer) {
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
      const x = Math.min(this.selStart.x, p.worldX);
      const y = Math.min(this.selStart.y, p.worldY);
      const w = Math.abs(p.worldX - this.selStart.x);
      const h = Math.abs(p.worldY - this.selStart.y);
      this.selRect.fillRect(x, y, w, h);
      this.selRect.strokeRect(x, y, w, h);
    }
  }

  onPointerUp(p: Phaser.Input.Pointer) {
    if (!this.selecting) return;
    this.selecting = false;
    this.selRect.clear();
    const x = Math.min(this.selStart.x, p.worldX);
    const y = Math.min(this.selStart.y, p.worldY);
    const w = Math.abs(p.worldX - this.selStart.x);
    const h = Math.abs(p.worldY - this.selStart.y);

    if (w < 6 && h < 6) {
      // 点选：反投影找最近单位
      const wp = screenToWorld(p.worldX, p.worldY);
      let best: Entity | null = null;
      let bestD = Infinity;
      for (const e of this.entities) {
        if (!e.alive || e.owner !== "player" || e.def.isNeutral) continue;
        const d = Phaser.Math.Distance.Between(wp.wx, wp.wy, e.x, e.y);
        const rr = (e.def.size ?? 20) / 128 + 1.2;
        if (d < rr && d < bestD) {
          bestD = d;
          best = e;
        }
      }
      this.clearSelection();
      if (best) {
        best.selected = true;
        this.selection.push(best);
      }
    } else {
      // 框选：用屏幕矩形反投影成世界 AABB 判定
      this.clearSelection();
      for (const e of this.entities) {
        if (!e.alive || e.owner !== "player" || e.def.isNeutral) continue;
        if (screenRectContainsWorld(x, y, w, h, e.x, e.y)) {
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
    for (const e of this.entities) {
      if (!e.alive) continue;
      e.updateCombat(dt);
      if (e.def.isBuilding) continue;
      this.updateGather(e, dt);
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
      e.sprite.destroy();
      e.hpBar.destroy();
      e.selectionRing.destroy();
      if (e.gatherTarget) e.gatherTarget = null;
      return false;
    });
    if (this.entities.length !== before) this.updateSupply();

    this.updateHud();
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
        e.moveToward(res.x, res.y, dt);
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
        e.moveToward(b.x, b.y, dt);
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
    const colorFor = (o: Faction) =>
      o === "enemy" ? 0xff6655 : o === "player" ? 0x66ff88 : 0xffffff;
    const color = colorFor(from.owner);
    const { sx: sx1, sy: sy1 } = worldToScreen(from.x, from.y);
    const { sx: sx2, sy: sy2 } = worldToScreen(to.x, to.y);
    const line = this.add.graphics().setDepth(3000);
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
    const hud = this.children.getByName("hud") as Phaser.GameObjects.Text;
    if (!hud) return;
    const n = this.entities.filter((e) => e.owner === "player" && !e.def.isNeutral).length;
    hud.setText(
      `矿物 ${this.minerals}  气 ${this.vespene}  人口 ${this.supplyUsed}/${this.supplyProvided}\n` +
        `选中 ${this.selection.length}  我方单位 ${n}\n` +
        `左键框选 / 右键移动·攻击·采集  A+左键 攻击移动  ESC 取消`
    );
  }
}

// 让未使用的导入保持引用，避免编译告警
void TERRAN_UNITS;
void PROTOSS_UNITS;
void ZERG_UNITS;
void TERRAN_BUILDINGS;
void PROTOSS_BUILDINGS;
void ZERG_BUILDINGS;

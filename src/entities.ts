import * as Phaser from "phaser";
import type { Def } from "./config";
import { ALL_DEFS, RESOURCE_DEFS } from "./config";
import type { Owner } from "./config";
import { ownerIsAI } from "./config";
import { worldToScreen, TILE_W } from "./iso";
import { heightAt } from "./terrain";
import { findPath, PathCell } from "./pathfinding";
import { ANIM_DEFS } from "./animDefs";

let _id = 0;

/** 实体贴图统一缩放：序列帧画布含 PAD 余量（单位 80×60 / 建筑 272×272），
 * 缩放到旧占位图视觉尺度（单位 ≈26px、建筑 ≈1 格屋顶 64px），点选半径
 * 公式（displayWidth/2 + 8px）与游戏手感保持不变。幽灵建筑共用此值。 */
export function spriteScale(isBuilding: boolean | undefined): number {
  return isBuilding ? 0.25 : 0.4;
}

export class Entity {
  id: number;
  def: Def;
  owner: Owner;
  scene: Phaser.Scene;
  sprite: Phaser.GameObjects.Sprite;
  hpBar: Phaser.GameObjects.Graphics;
  selectionRing: Phaser.GameObjects.Graphics;
  // 每个 Entity 自己的容器：entityLayer → [Container(单位) → sprite/hpBar/ring]。
  // 容器的 depth = 1000 + x + y（等距画家算法）负责单位之间的遮挡关系；
  // 容器内子对象固定在 (0,0)、scale=1，用世界屏幕坐标直接定位，渲染结果不变。
  container: Phaser.GameObjects.Container;

  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  shieldRegenAccumulator = 0;

  x: number; // 世界格坐标（浮点，单位：格）
  y: number;
  isAir: boolean;
  selected = false;
  factionTint: number;
  aggressive = false;
  alive = true;
  constructed = true;
  hideHpBar = false;

  // 动作动画（序列帧，key = "<tex>:<动作名>"，注册见 GameScene.registerAnims）
  private curAnim: string | null = null;
  /** 死亡动画剩余时长（ms）：-1 未开始；0 = 无动画（立即可清理）；>0 播放中 */
  deathTimer = -1;

  // 移动指令
  moveTargetX: number | null = null;
  moveTargetY: number | null = null;
  attackMove = false;

  // 寻路：A* 计算出的格子路点（绕开水面/高地）
  path: PathCell[] = [];
  pathIndex = 0;
  private pathGoalX = NaN;
  private pathGoalY = NaN;
  private repathCooldown = 0;

  // 战斗
  combatTarget: Entity | null = null;
  attackCooldown = 0;
  onAttack?: (from: Entity, to: Entity) => void;

  // 采集
  gatherTarget: Entity | null = null;
  carrying = 0;
  gatherState: "idle" | "toResource" | "mining" | "returning" = "idle";
  returnTarget: Entity | null = null;
  mineTimer = 0;
  animateTimer = 0;

  // 建造（人族 SCV）：buildTarget 非空 = 正在前往/施工该建筑；
  // 建筑侧：constructed=false 期间 buildProgress/buildNeed 推进施工
  buildTarget: Entity | null = null;
  buildProgress = 0;
  buildNeed = 0;

  constructor(
    scene: Phaser.Scene,
    def: Def,
    x: number,
    y: number,
    owner: Owner,
    // 可选：单位层的父容器（entityLayer）。Entity 会创建“自己的 Container”加进去，
    // 让 DevTools inspector 能看到 entityLayer → Container(单位) → sprite/hpBar/ring 的真实树；
    // 容器固定在 (0,0)、scale=1，子对象用世界屏幕坐标直接定位，渲染结果不变。
    parent?: Phaser.GameObjects.Container
  ) {
    this.id = _id++;
    this.def = def;
    this.scene = scene;
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.shield = def.shield ?? 0;
    this.maxShield = def.shield ?? 0;
    this.isAir = def.isAir ?? false;
    this.factionTint = 0xffffff;

    const { sx, sy } = worldToScreen(x, y);
    // 纹理 key 应当用 def.tex（资源的“美术键”），之前误用 def.id 导致
    // “No texture found matching key: scv/marine/b_cc/...” 控制台刷屏
    // （参考之前 stepMove 异常的次根因：纹理缺失触发 sprite 渲染异常）。
    // 纹理来自 GameScene.preload 加载的横条序列帧 spritesheet（Sprite 支持动作动画）。
    this.sprite = scene.add.sprite(sx, sy, def.tex ?? def.id).setOrigin(0.5, 0.72);
    // 序列帧画布比旧占位图大（含 PAD 余量），统一缩放到旧视觉尺度
    this.sprite.setScale(spriteScale(def.isBuilding));
    this.selectionRing = scene.add.graphics();
    this.hpBar = scene.add.graphics();

    // 每个单位一个 Container：把 sprite/selectionRing/hpBar 收进去。
    // 容器本身在 (0,0)、scale=1，所以子对象仍按世界屏幕坐标定位，渲染与之前一致。
    this.container = scene.add.container(0, 0);
    this.container.add(this.sprite);
    this.container.add(this.selectionRing);
    this.container.add(this.hpBar);
    // 容器内子对象排序：sprite 在最底，selectionRing 次之，hpBar 最上
    // （setDepth 会触发容器的 sortChildrenFlag，渲染时按此顺序绘制）。
    this.sprite.setDepth(0);
    this.selectionRing.setDepth(1);
    this.hpBar.setDepth(2);

    // 把“单位容器”加入传入的单位层（entityLayer），形成 entityLayer → [Container(单位)] 的树。
    if (parent) parent.add(this.container);

    // 初始 depth：非建筑按等距排序公式（1000 + x + y）；
    // 建筑在 spawnFromDef 里另设 200+x+y（低于单位，避免被单位盖住）。
    if (!def.isBuilding) this.container.setDepth(1000 + x + y);

    // 寻路缓存与冷却，构造时必须初始化为安全默认值：
    // stepMove 里 this.path.length 的访问依赖此字段为数组，
    // 之前在移动分支中曾触发 "Cannot read property 'length' of undefined" 崩溃
    // （参考 stepMove → entities.ts:199 异常根因）。
    this.path = [] as Array<{ x: number; y: number }>;
    this.pathIndex = 0;
    this.pathGoalX = NaN;
    this.pathGoalY = NaN;
    this.repathCooldown = 0;
  }

  /** 设置阵营染色（仅 AI 阵营染色，玩家保持本色） */
  setFaction(owner: Owner, tint: number) {
    this.factionTint = tint;
    if (ownerIsAI(owner)) {
      this.sprite.setTint(tint);
    }
    return this;
  }

  get r(): number {
    return (this.def.size ?? 14) / 2;
  }

  /* ============ 战斗 API ============ */

  attackDamage(air: boolean): number {
    return air ? this.def.airDamage ?? 0 : this.def.groundDamage ?? 0;
  }

  canAttackTarget(target: Entity): boolean {
    if (!target.alive || target === this) return false;
    if (target.owner === this.owner) return false;
    const dmg = this.attackDamage(target.isAir);
    if (dmg <= 0) return false;
    return true;
  }

  orderAttack(target: Entity) {
    if (!this.canAttackTarget(target)) return;
    this.combatTarget = target;
    this.aggressive = true;
    this.attackMove = false;
    this.moveTargetX = null;
    this.moveTargetY = null;
    this.gatherTarget = null;
    this.buildTarget = null;
  }

  attackMoveTo(x: number, y: number) {
    this.attackMove = true;
    this.aggressive = true;
    this.moveTargetX = x;
    this.moveTargetY = y;
    this.combatTarget = null;
    this.gatherTarget = null;
    this.buildTarget = null;
  }

  stop() {
    this.combatTarget = null;
    this.moveTargetX = null;
    this.moveTargetY = null;
    this.attackMove = false;
    this.aggressive = false;
    this.path = [];
    this.pathIndex = 0;
    this.buildTarget = null;
  }

  /** 攻击/索敌/移动每帧推进（工作在“世界格坐标”下，无需等距） */
  updateCombat(dt: number) {
    // 建筑完全不动：直接 return，避免下面的移动/索敌分支引用陈旧的 moveTarget/combatTarget
    // 触发 stepMove 导致异常（参考之前 stepMove → entities.ts:199 崩溃的根因）。
    if (this.def.isBuilding) {
      return;
    }
    if (this.attackCooldown > 0) this.attackCooldown -= dt * 1000;

    // 找目标（只有处于好斗/攻击移动状态才主动索敌；普通移动不主动惹事）
    if (this.aggressive && (this.def.groundDamage || this.def.airDamage)) {
      if (!this.combatTarget || !this.combatTarget.alive) {
        this.combatTarget = this.acquireTarget();
      }
    }

    if (this.combatTarget) {
      const t = this.combatTarget as Entity;
      const d = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);
      // reach 统一换算到“格”量纲：range 与半径 r 都是 px，需除以 TILE_W
      const reach =
        (this.def.range ?? 0) / TILE_W + this.r / TILE_W + t.r / TILE_W;
      if (d <= reach) {
        // 在射程内：停下开火
        this.moveTargetX = null;
        this.moveTargetY = null;
        this.path = [];
        if (this.attackCooldown <= 0) {
          this.fire(t);
          this.attackCooldown = this.def.attackInterval ?? 1000;
        }
      } else {
        // 接近目标（沿地形路径，绕开水面/高地）
        this.stepMove(dt, t.x, t.y);
      }
      return;
    }

    // 攻击移动：到达后恢复待命
    if (this.attackMove && this.moveTargetX !== null && this.moveTargetY !== null) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.moveTargetX, this.moveTargetY);
      if (d < 0.5) {
        this.moveTargetX = null;
        this.moveTargetY = null;
        this.path = [];
      } else {
        this.stepMove(dt, this.moveTargetX, this.moveTargetY);
      }
    }

    // 普通移动
    if (!this.attackMove && this.moveTargetX !== null && this.moveTargetY !== null) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.moveTargetX, this.moveTargetY);
      if (d < 0.5) {
        this.moveTargetX = null;
        this.moveTargetY = null;
        this.path = [];
      } else {
        this.stepMove(dt, this.moveTargetX, this.moveTargetY);
      }
    }
  }

  acquireTarget(): Entity | null {
    let best: Entity | null = null;
    let bestD = Infinity;
    const ents = (this.scene as any).entities as Entity[];
    for (const e of ents) {
      if (e === this || !e.alive) continue;
      if (!this.canAttackTarget(e)) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  moveToward(tx: number, ty: number, dt: number) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    // def.speed 量纲为 px/秒（StarCraft 原始值，如 90），世界坐标以“格”为单位，
    // 1 格 = TILE_W 像素，故需除以 TILE_W 换算成 格/秒，否则会瞬间瞬移。
    const speed = (this.def.speed ?? 90) / TILE_W; // grid/秒
    const step = Math.min(speed * dt, dist - 0.01);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
  }

  /**
   * 沿地形代价路径朝目标移动（真正绕开水面/高地）。
   * - 空军直接直线飞（无视地形）。
   * - 地面单位：A* 计算出绕开悬崖/水面的路点，逐格逼近；
   *   无路可走时退回直线移动，保证不卡死。
   * 返回是否已抵达最终目标点。
   */
  stepMove(dt: number, tx: number, ty: number): boolean {
    // 防御：极端情况下 path 未初始化（构造时已默认 []，此处再做一次兜底）
    if (!this.path) this.path = [];
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) {
      // 非法目标坐标：直接放弃，不抛错
      return false;
    }

    if (this.isAir) {
      this.moveToward(tx, ty, dt);
      return Phaser.Math.Distance.Between(this.x, this.y, tx, ty) < 0.5;
    }

    this.repathCooldown -= dt;
    const goalMoved =
      Math.abs(tx - this.pathGoalX) > 0.4 || Math.abs(ty - this.pathGoalY) > 0.4;
    // 首次 / 目标移动明显 / 冷却到期 → 重新寻路
    if (
      isNaN(this.pathGoalX) ||
      goalMoved ||
      this.repathCooldown <= 0
    ) {
      this.recomputePath(tx, ty);
    }

    // 无路可走：兜底直线移动
    if (!this.path || this.path.length === 0) {
      this.moveToward(tx, ty, dt);
      return false;
    }

    // 朝当前路点移动，抵达后切换到下一个路点
    let wp = this.path[this.pathIndex];
    // 防御：pathIndex 越界则回到首格
    if (!wp) {
      this.pathIndex = 0;
      wp = this.path[0];
      if (!wp) {
        this.moveToward(tx, ty, dt);
        return false;
      }
    }
    const d = Phaser.Math.Distance.Between(this.x, this.y, wp.x + 0.5, wp.y + 0.5);
    if (d < 0.35) {
      this.pathIndex++;
      if (this.pathIndex >= this.path.length) {
        // 最后一段：直奔精确目标点
        this.moveToward(tx, ty, dt);
        return Phaser.Math.Distance.Between(this.x, this.y, tx, ty) < 0.6;
      }
    }
    const tgt = this.path[this.pathIndex];
    this.moveToward(tgt.x + 0.5, tgt.y + 0.5, dt);
    return false;
  }

  /** 用 A* 重算从当前位置到目标的路径 */
  private recomputePath(tx: number, ty: number) {
    const p = findPath(this.x, this.y, tx, ty);
    this.path = p && p.length > 0 ? p : [];
    this.pathIndex = 0;
    this.pathGoalX = tx;
    this.pathGoalY = ty;
    this.repathCooldown = 0.5; // 0.5s 内不重复寻路
  }

  fire(target: Entity) {
    this.playAnim("attack", true); // 每次出手重播攻击动作（与攻击间隔同步）
    target.takeDamage(this.attackDamage(target.isAir), this);
    this.onAttack?.(this, target);
  }

  /* ============ 动作动画（序列帧） ============ */

  /** 当前应有动作名。优先级：死亡 > 建筑(施工/待机) > 单位(攻击/采矿/建造/移动/待机) */
  private desiredAnim(): string {
    if (!this.alive) return "death";
    if (this.def.isBuilding) return this.constructed ? "idle" : "build";
    if (this.combatTarget && this.combatTarget.alive) {
      const t = this.combatTarget;
      const d = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);
      const reach = (this.def.range ?? 0) / TILE_W + this.r / TILE_W + t.r / TILE_W;
      if (d <= reach) return "attack";
    }
    if (this.gatherState === "mining") return "attack"; // 采矿挥动
    if (
      this.moveTargetX !== null ||
      this.gatherState === "toResource" ||
      this.gatherState === "returning"
    ) {
      return "walk";
    }
    if (this.buildTarget) {
      // 建造者：走向工地 = walk，贴身施工 = attack（锤击摆动）
      const d = Phaser.Math.Distance.Between(
        this.x,
        this.y,
        this.buildTarget.x,
        this.buildTarget.y
      );
      const reach = this.buildTarget.r / TILE_W + this.r / TILE_W + 0.35;
      return d > reach ? "walk" : "attack";
    }
    return "idle";
  }

  /** 切换动作动画（同动作不重播；force=true 用于攻击出手等需要重播的场景） */
  playAnim(name: string, force = false) {
    const key = `${this.def.tex}:${name}`;
    if (!force && this.curAnim === key) return;
    if (!this.scene.anims.exists(key)) return; // 中立资源等无序列帧
    this.curAnim = key;
    this.sprite.play(key);
  }

  /** 死亡动画开场（GameScene 死亡清理时首次调用）：返回是否播了动画 */
  startDeath(): boolean {
    const d = ANIM_DEFS[this.def.tex]?.actions["death"];
    if (!d) {
      this.deathTimer = 0; // 无序列帧（中立资源等）：立即可清理
      return false;
    }
    this.deathTimer = ((d.to - d.from + 1) / d.fps) * 1000;
    this.selectionRing.clear();
    this.hpBar.clear();
    this.playAnim("death", true);
    return true;
  }

  takeDamage(amount: number, _from: Entity) {
    if (!this.alive) return;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, amount);
      this.shield -= absorbed;
      amount -= absorbed;
    }
    if (amount > 0) this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }

  /* ============ 渲染同步（每帧把世界坐标投影到屏幕） ============ */

  syncRender() {
    const h = heightAt(this.x, this.y);
    const { sx, sy } = worldToScreen(this.x, this.y, h);
    this.sprite.setPosition(sx, sy);
    // 动作动画按状态切换（idle/walk/attack/build；同动作不重播）
    this.playAnim(this.desiredAnim());
    // 非建筑：每帧把“单位容器”的 depth 设成等距排序值（x+y 越大越靠前/靠下）。
    // 注意此处改的是 container 的 depth，不再是 sprite 的——sprite 的 depth 只在容器内排序用。
    if (!this.def.isBuilding)
      this.container.setDepth(1000 + this.x + this.y + h * 100);
    this.drawHpBar();
    this.drawSelectionRing();
  }

  drawHpBar() {
    const g = this.hpBar;
    g.clear();
    if (this.hideHpBar && !this.selected) return;
    if (this.def.isBuilding && this.hp >= this.maxHp && this.shield >= this.maxShield && !this.selected)
      return;

    const barW = Math.max(20, this.def.size ?? 24);
    const { sx, sy } = worldToScreen(this.x, this.y, heightAt(this.x, this.y));
    const topY = sy - this.sprite.displayHeight * 0.78 - 8;

    if (this.maxShield > 0) {
      g.fillStyle(0x000000, 0.5);
      g.fillRect(sx - barW / 2 - 1, topY - 1, barW + 2, 5);
      g.fillStyle(0x33aaff, 1);
      g.fillRect(sx - barW / 2, topY, barW * (this.shield / this.maxShield), 3);
    }

    g.fillStyle(0x000000, 0.5);
    g.fillRect(sx - barW / 2 - 1, topY + (this.maxShield > 0 ? 4 : 0) - 1, barW + 2, 5);
    g.fillStyle(0x33dd44, 1);
    g.fillRect(
      sx - barW / 2,
      topY + (this.maxShield > 0 ? 4 : 0),
      barW * (this.hp / this.maxHp),
      3
    );
  }

  drawSelectionRing() {
    const g = this.selectionRing;
    g.clear();
    if (!this.selected) return;
    const { sx, sy } = worldToScreen(this.x, this.y, heightAt(this.x, this.y));
    const ry = this.def.isAir ? this.sprite.displayHeight * 0.45 : 6;
    g.lineStyle(2, 0x00ff66, 0.9);
    g.strokeEllipse(sx, sy, this.def.size ?? 24, ry);
  }
}

export function getEntityDef(id: string): Def | undefined {
  return ALL_DEFS[id] ?? RESOURCE_DEFS[id];
}

export { ALL_DEFS };

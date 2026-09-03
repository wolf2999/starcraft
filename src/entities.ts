import * as Phaser from "phaser";
import type { Def } from "./config";
import { ALL_DEFS, RESOURCE_DEFS } from "./config";
import type { Faction } from "./config";
import { worldToScreen } from "./iso";

let _id = 0;

export class Entity {
  id: number;
  def: Def;
  owner: Faction;
  scene: Phaser.Scene;
  sprite: Phaser.GameObjects.Image;
  hpBar: Phaser.GameObjects.Graphics;
  selectionRing: Phaser.GameObjects.Graphics;
  larvaeContainer?: Phaser.GameObjects.Container;

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

  // 移动指令
  moveTargetX: number | null = null;
  moveTargetY: number | null = null;
  attackMove = false;

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

  constructor(scene: Phaser.Scene, def: Def, x: number, y: number, owner: Faction) {
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
    this.sprite = scene.add.image(sx, sy, def.id).setOrigin(0.5, 0.72);
    if (!def.isBuilding) this.sprite.setDepth(1000 + x + y);

    this.selectionRing = scene.add.graphics();
    this.hpBar = scene.add.graphics();
    this.hpBar.setDepth(2000);
    this.selectionRing.setDepth(1999);
  }

  /** 设置阵营染色（用于敌方阵营） */
  setFaction(faction: Faction, tint: number) {
    this.factionTint = tint;
    if (faction === "enemy") {
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
  }

  attackMoveTo(x: number, y: number) {
    this.attackMove = true;
    this.aggressive = true;
    this.moveTargetX = x;
    this.moveTargetY = y;
    this.combatTarget = null;
    this.gatherTarget = null;
  }

  stop() {
    this.combatTarget = null;
    this.moveTargetX = null;
    this.moveTargetY = null;
    this.attackMove = false;
    this.aggressive = false;
  }

  /** 攻击/索敌/移动每帧推进（工作在“世界格坐标”下，无需等距） */
  updateCombat(dt: number) {
    if (this.def.isBuilding || this.isAir) {
      // 建筑不主动移动；空军可空中索敌但仍不移动（demo 简化）
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
      const reach = (this.def.range ?? 0) + this.r + t.r;
      if (d <= reach) {
        // 在射程内：停下开火
        this.moveTargetX = null;
        this.moveTargetY = null;
        if (this.attackCooldown <= 0) {
          this.fire(t);
          this.attackCooldown = this.def.attackInterval ?? 1000;
        }
      } else {
        // 接近目标（攻击移动时也接受被攻击反击）
        this.moveToward(t.x, t.y, dt);
      }
      return;
    }

    // 攻击移动：到达后恢复待命
    if (this.attackMove && this.moveTargetX !== null && this.moveTargetY !== null) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.moveTargetX, this.moveTargetY);
      if (d < 0.5) {
        this.moveTargetX = null;
        this.moveTargetY = null;
      } else {
        this.moveToward(this.moveTargetX, this.moveTargetY, dt);
      }
    }

    // 普通移动
    if (!this.attackMove && this.moveTargetX !== null && this.moveTargetY !== null) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.moveTargetX, this.moveTargetY);
      if (d < 0.5) {
        this.moveTargetX = null;
        this.moveTargetY = null;
      } else {
        this.moveToward(this.moveTargetX, this.moveTargetY, dt);
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
    const speed = this.def.speed ?? 1.5; // 格/秒
    const step = Math.min(speed * dt, dist - 0.01);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
  }

  fire(target: Entity) {
    target.takeDamage(this.attackDamage(target.isAir), this);
    this.onAttack?.(this, target);
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
    const { sx, sy } = worldToScreen(this.x, this.y);
    this.sprite.setPosition(sx, sy);
    if (!this.def.isBuilding) this.sprite.setDepth(1000 + this.x + this.y);
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
    const { sx, sy } = worldToScreen(this.x, this.y);
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
    const { sx, sy } = worldToScreen(this.x, this.y);
    const ry = this.def.isAir ? this.sprite.displayHeight * 0.45 : 6;
    g.lineStyle(2, 0x00ff66, 0.9);
    g.strokeEllipse(sx, sy, this.def.size ?? 24, ry);
  }
}

export function getEntityDef(id: string): Def | undefined {
  return ALL_DEFS[id] ?? RESOURCE_DEFS[id];
}

export { ALL_DEFS };

import * as Phaser from "phaser";
import type { Def } from "./config";
import { ALL_DEFS, RESOURCE_DEFS, SIGHT_RANGE, DETECT_RANGE, CLOAK_ALPHA, ATTACK_REVEAL_MS, ENERGY_REGEN, STIM_RATE, ATTACK_UPGRADE_BONUS, ARMOR_UPGRADE_BONUS } from "./config";
import type { Owner } from "./config";
import { ownerIsAI } from "./config";
import { worldToScreen, TILE_W } from "./iso";
import { heightAt } from "./terrain";
import { findPath, PathCell, isBlocked } from "./pathfinding";
import { ANIM_DEFS } from "./animDefs";

let _id = 0;

/** 实体贴图统一缩放：序列帧画布含 PAD 余量（单位 80×60 / 建筑 272×272），
 * 缩放到目标视觉尺度（单位内容 ≈26px、建筑 ≈1.3 格屋顶），点选半径
 * 公式（displayWidth/2 + 8px）随缩放自动适配。幽灵建筑共用此值。 */
export function spriteScale(isBuilding: boolean | undefined): number {
  return isBuilding ? 0.33 : 0.6;
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
  /** 能量（法术/技能资源，def.energy 上限，ENERGY_REGEN 每秒回复） */
  energy = 0;
  /** 剩余蜘蛛雷数（def.mines 出厂携带；M 键布雷消耗，不自动补充） */
  minesLeft = 0;

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

  // 隐形体系：天生隐形（def.cloaked）单位运行时仅有"攻击显形"一个可变状态，
  // 当前是否隐形用 isCloakedNow 派生（无独立 cloaked 字段，避免双源不一致）。
  /** 攻击显形剩余时长（ms）：>0 期间暴露，可被任何敌人锁定/反击 */
  revealTimer = 0;

  // 特殊机制运行时状态
  /** 治疗目标（medic，GameScene.updateHeal 驱动：空闲自动找伤员，手动指令优先） */
  healTarget: Entity | null = null;
  /** 治疗间隔计时（ms） */
  healCooldown = 0;
  /** 攻城模式（tank）：展开后用 siegeDamage/siegeRange 且不能移动（E 键切换） */
  sieged = false;
  /** 锁定（ghost Lockdown）剩余时长（ms）：>0 冻结一切行为（移动/攻击/采集/装载），
   * GameScene.update 行为分支同步跳过；锁定时指令已清空，解锁后原地待命 */
  lockedTimer = 0;

  // 航母拦截机（carrier bay）：dock = 拦截机的母舰（停泊态 host=dock 复用乘客冻结
  // 语义：隐藏/不可锁定/不更新；出击态 host=null 而 dock 保留——无目标后飞回母舰）；
  // bay = 母舰名下全部拦截机（停泊 + 出击，母舰被击毁时级联陪葬）。两字段共用 Entity，
  // 按角色取用：航母用 bay，拦截机用 dock。
  dock: Entity | null = null;
  bay: Entity[] = [];

  // 碉堡进驻（bunker）：garrisonTarget = 步兵正在前往进驻的碉堡
  // （GameScene.updateGarrison 推进走位，1.2 格内 loadUnit 复用乘客状态机）
  garrisonTarget: Entity | null = null;

  // SCV 修理（terran 农民）：repairTarget 非空 = 正在前往/修理该目标
  // （GameScene.updateRepair 推进：走位贴身后按 REPAIR_RATE 持续回血）
  repairTarget: Entity | null = null;

  // 兴奋剂（stimpack，marine/firebat）：>0 期间攻速/移速 ×stimRate（T 键施放）
  stimTimer = 0;

  // 建筑形态变异（zerg 主基地链/殖民地防御塔/飞龙塔升级）：morphTo 非空 = 变异中
  // （GameScene.tryMorph 扣费启动 → updateMorph 推进计时 → 完成 applyDef 整体替换；
  // 变异中不能训练/二次变异，播 build 动画，橙黄进度条可视化）
  morphTo: string | null = null;
  morphProgress = 0;
  morphNeed = 0;

  // 科技研究（academy/ebay/armory/forge/evolutionChamber）：一次一项
  // （GameScene.startResearch 校验扣费启动 → updateResearch 推进，完成按阵营等级 +1）
  researchKind: string | null = null;
  researchProgress = 0;
  researchNeed = 0;

  // 运输装载（dropship/shuttle/overlord）：cargo 为乘客列表；host 非空 = 已被
  // 装载（容器隐藏、不可被锁定/攻击、不更新，由运输机代管生死）；loadTarget
  // 为运输机正在前往装载的目标（GameScene.updateTransport 推进）
  host: Entity | null = null;
  cargo: Entity[] = [];
  loadTarget: Entity | null = null;

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

  // —— 网络镜像（非主机端）：快照目标位置，渲染时向目标插值（见 GameScene.updateNetMirror）——
  netX?: number;
  netY?: number;

  // 生产（建筑）：训练队列，首项为当前训练项（GameScene.updateTraining 推进，
  // 完成后 spawnTrained 出兵）。队列中的单位即时占用人口（updateSupply 统计）。
  trainQueue: { defId: string; progress: number; need: number }[] = [];
  // 虫族孵化场系：幼虫再生计时（ms，GameScene.updateTraining 驱动，≤3 只）
  larvaRegenTimer = 0;

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
    this.energy = def.energy ?? 0; // 出厂满能量（简化；星际为 50 起步）
    this.minesLeft = def.mines ?? 0; // 携带蜘蛛雷数（vulture；M 键布雷）
    this.isAir = def.isAir ?? false;
    this.factionTint = 0xffffff;

    const { sx, sy } = worldToScreen(x, y);
    // 纹理 key 应当用 def.tex（资源的“美术键”），之前误用 def.id 导致
    // “No texture found matching key: scv/marine/b_cc/...” 控制台刷屏
    // （参考之前 stepMove 异常的次根因：纹理缺失触发 sprite 渲染异常）。
    // 纹理来自 GameScene.preload 加载的横条序列帧 spritesheet（Sprite 支持动作动画）。
    this.sprite = scene.add.sprite(sx, sy, def.tex ?? def.id).setOrigin(0.5, 0.72);
    // 序列帧画布比旧占位图大（含 PAD 余量），统一缩放到目标视觉尺度
    // 资源（mineral/vespene）画布 = 显示尺寸×2；def.visualScale 为个别实体视觉微调倍率
    this.sprite.setScale((def.isNeutral ? 0.65 : spriteScale(def.isBuilding)) * (def.visualScale ?? 1));
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

    // 初始 depth：统一等距排序公式（1000 + x + y + 高度*100），建筑与单位同式；
    // 建筑不动只在 spawnFromDef 设一次初值，单位每帧在 syncRender 里刷新。

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

  get maxEnergy(): number {
    return this.def.energy ?? 0;
  }

  /** 已装载占用位（死亡乘客不计） */
  get cargoUsed(): number {
    let n = 0;
    for (const p of this.cargo) if (p.alive) n += p.def.cargoSize ?? 1;
    return n;
  }

  get cargoSpaceLeft(): number {
    return (this.def.cargoCapacity ?? 0) - this.cargoUsed;
  }

  /** 当前是否对敌隐形：天生隐形且不在攻击显形期（侦测判定见 canSeeCloaked） */
  get isCloakedNow(): boolean {
    return !!this.def.cloaked && this.revealTimer <= 0;
  }

  /** 兴奋剂倍率：增益期攻速/移速 ×STIM_RATE，平时 1 */
  get stimRate(): number {
    return this.stimTimer > 0 ? STIM_RATE : 1;
  }

  /** 己方攻击升级加成（research；等级按阵营记在 GameScene.upgradesBy） */
  get attackBonus(): number {
    const up = (this.scene as any).upgradesOf?.(this.owner);
    return (up?.attack ?? 0) * ATTACK_UPGRADE_BONUS;
  }

  /** 己方防御升级等级（takeDamage 每级减伤 ARMOR_UPGRADE_BONUS） */
  get armorLevel(): number {
    const up = (this.scene as any).upgradesOf?.(this.owner);
    return up?.armor ?? 0;
  }

  /** 碉堡是否处于"驻守武装"态：cargoCapacity 建筑（碉堡）内有活着的可开火步兵
   * （聚合火力的来源；空碉堡不可攻击）。 */
  get garrisonArmed(): boolean {
    if (!this.def.cargoCapacity || !this.def.isBuilding) return false;
    return this.cargo.some((p) => p.alive && (p.def.groundDamage || p.def.airDamage));
  }

  /** 己方侦测网：自身 detects 或 DETECT_RANGE 格内有己方 detects 实体
   * （防御塔/科学球/领主/观察者等）。星际式：侦测器半径内敌方隐形单位暴露。 */
  canSeeCloaked(t: Entity): boolean {
    const ents = (this.scene as any).entities as Entity[];
    for (const e of ents) {
      if (!e.alive || e.owner !== this.owner || !e.def.detects) continue;
      if (Phaser.Math.Distance.Between(e.x, e.y, t.x, t.y) <= DETECT_RANGE) return true;
    }
    return false;
  }

  /* ============ 战斗 API ============ */

  attackDamage(air: boolean): number {
    // 攻城态（tank sieged）对地用 siegeDamage 替换
    const base =
      this.sieged && !air && this.def.siegeDamage
        ? this.def.siegeDamage
        : air
          ? this.def.airDamage ?? 0
          : this.def.groundDamage ?? 0;
    // 科技升级（research）：全兵种统一加成（简化，等级按阵营）
    return base + this.attackBonus;
  }

  /** 当前射程（px）：攻城态用 siegeRange（坦克 384px≈12格） */
  get rangePx(): number {
    return this.sieged && this.def.siegeRange ? this.def.siegeRange : this.def.range ?? 0;
  }

  /** 攻城模式切换（tank）：瞬时展开/收起（简化无变形计时），切换即清指令原地待命。
   * 返回切换后是否处于攻城态；非攻城单位（无 siegeDamage）返回 false 不动作。 */
  toggleSiege(): boolean {
    if (!this.def.siegeDamage) return false;
    this.sieged = !this.sieged;
    this.stop();
    return this.sieged;
  }

  /* ============ 建筑形态变异（zerg hatchery→lair→hive 等） ============ */

  /** 变异完成：整体替换定义（贴图/HP/护盾同步，保留当前 HP 并钳到新上限） */
  applyDef(def: Def) {
    this.def = def;
    this.maxHp = def.hp;
    this.hp = Math.min(this.hp, def.hp);
    this.maxShield = def.shield ?? 0;
    this.shield = Math.min(this.shield, this.maxShield);
    this.sprite.setTexture(def.tex ?? def.id);
    this.curAnim = null; // 动画 key 含贴图名，置空强制重播新贴图的动作
  }

  /* ============ 运输装载（dropship/shuttle/overlord） ============ */

  /** 运输机：前往装载目标（GameScene.updateTransport 推进走位与装载判定） */
  orderLoad(target: Entity) {
    this.loadTarget = target;
    this.combatTarget = null;
    this.moveTargetX = null;
    this.moveTargetY = null;
    this.attackMove = false;
  }

  /** 装入乘客：清其指令、隐藏其容器，由本运输机代管；容量不足即拒载 */
  loadUnit(p: Entity) {
    if (p.host || !p.alive) return;
    if (this.cargoSpaceLeft < (p.def.cargoSize ?? 1)) return;
    p.stop();
    p.gatherTarget = null;
    p.gatherState = "idle";
    p.garrisonTarget = null; // 进驻走位途中被装载（理论不发生，防残留）
    p.host = this;
    p.container.setVisible(false);
    this.cargo.push(p);
  }

  /** 原地卸载全部乘客（U 键）：环形落位（0.9 格起每圈 8 个），恢复可见。
   * 落位不做地形碰撞校验（简化，星际会找空位）。返回卸载数 */
  unloadAll(): number {
    const list = this.cargo;
    this.cargo = [];
    let n = 0;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (!p.alive) continue;
      const ang = (i % 8) * ((Math.PI * 2) / 8);
      const rad = 0.9 + Math.floor(i / 8) * 0.8;
      p.x = this.x + Math.cos(ang) * rad;
      p.y = this.y + Math.sin(ang) * rad;
      p.host = null;
      p.container.setVisible(true);
      n++;
    }
    return n;
  }

  /* ============ 航母拦截机（carrier bay） ============ */

  /** 拦截机停泊进母舰机库：清指令、隐藏、冻结（host=dock 复用乘客语义：
   * 不可被锁定/不更新/由母舰代管生死）。bay 由母舰侧持有，此处仅登记防重。 */
  dockIn(carrier: Entity) {
    this.stop();
    this.gatherTarget = null;
    this.gatherState = "idle";
    this.host = carrier;
    this.dock = carrier;
    this.container.setVisible(false);
    if (!carrier.bay.includes(this)) carrier.bay.push(this);
  }

  /* ============ 碉堡进驻（bunker garrison） ============ */

  /** 步兵前往进驻碉堡（GameScene.updateGarrison 推进走位，靠近即 loadUnit 装载） */
  orderGarrison(bunker: Entity) {
    this.garrisonTarget = bunker;
    this.combatTarget = null;
    this.moveTargetX = null;
    this.moveTargetY = null;
    this.attackMove = false;
    this.gatherTarget = null;
    this.gatherState = "idle";
  }

  canAttackTarget(target: Entity): boolean {
    if (!target.alive || target === this) return false;
    if (target.owner === this.owner) return false;
    // 被装载的乘客不可锁定/攻击（在运输机肚子里）
    if (target.host) return false;
    const dmg = this.attackDamage(target.isAir);
    // 航母（interceptorBay）本体 0 伤不开火，但可"锁定"目标供拦截机出击；
    // 碉堡（garrisonArmed）0 伤但聚合进驻步兵火力，同样放行锁定
    if (dmg <= 0 && !this.def.interceptorBay && !this.garrisonArmed) return false;
    // 隐形体系：敌方隐形单位需在己方侦测网内才可锁定；攻击显形期不算隐形
    if (target.isCloakedNow && !this.canSeeCloaked(target)) return false;
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
    this.healTarget = null;
    this.repairTarget = null;
  }

  /** 攻击/索敌/移动每帧推进（工作在“世界格坐标”下，无需等距） */
  updateCombat(dt: number) {
    // 被装载的乘客完全冻结（渲染已隐藏，生死由运输机代管）
    if (this.host) return;
    // 锁定冻结（ghost Lockdown）：不索敌/不移动/不开火/不回能，只倒数解锁计时；
    // GameScene.update 同步跳过装载/施工/采集/治疗行为分支
    if (this.lockedTimer > 0) {
      this.lockedTimer = Math.max(0, this.lockedTimer - dt * 1000);
      return;
    }
    // 能量回复（法术/技能资源，星际式每秒回 1 点）
    if (this.maxEnergy > 0 && this.energy < this.maxEnergy) {
      this.energy = Math.min(this.maxEnergy, this.energy + ENERGY_REGEN * dt);
    }
    // 兴奋剂倒计时（增益期攻速/移速 ×stimRate，由 fire 冷却/stepMove 消费）
    if (this.stimTimer > 0) {
      this.stimTimer = Math.max(0, this.stimTimer - dt * 1000);
    }
    if (this.def.isBuilding) {
      // 建筑不动：仅防御塔（有攻击力的建筑）原地索敌开火，不进入下方任何
      // 移动分支（历史上建筑引用 stepMove 曾触发崩溃，移动逻辑对建筑保持禁用）。
      this.updateBuildingCombat(dt);
      return;
    }
    if (this.attackCooldown > 0) this.attackCooldown -= dt * 1000;

    // 攻城态：清一切移动意图（攻城坦克不能移动，接到的移动指令下帧即被清除），
    // 索敌/开火照常——原地等目标进 siegeRange
    if (this.sieged) {
      this.moveTargetX = null;
      this.moveTargetY = null;
      this.path = [];
      this.pathIndex = 0;
    }

    // 攻击显形倒计时：显形期结束恢复天生隐形（isCloakedNow 自动翻回 true）
    if (this.revealTimer > 0) {
      this.revealTimer = Math.max(0, this.revealTimer - dt * 1000);
    }

    // 目标失效（死亡/隐形单位显形期结束脱离侦测网）→ 清引用：
    // aggressive 单位在下方索敌分支立即换目标，非主动单位回待命
    if (this.combatTarget && !this.canAttackTarget(this.combatTarget)) {
      this.combatTarget = null;
    }

    // 找目标（只有处于好斗/攻击移动状态才主动索敌；普通移动不主动惹事）。
    // 拦截机（dock 非空）不自主索敌：只打母舰指派的目标 + 受击反击，打完回港
    if (this.aggressive && (this.def.groundDamage || this.def.airDamage || this.def.interceptorBay) && !this.dock) {
      if (!this.combatTarget || !this.combatTarget.alive) {
        this.combatTarget = this.acquireTarget();
      }
    } else if (
      // 待命自动索敌（星际式驻守迎击）：完全空闲、非农民、有攻击力的单位，
      // 自动攻击进入视野（SIGHT_RANGE 格）内的敌人。只设 combatTarget 不置
      // aggressive：目标死亡后回到待命，不会像 aggressive 单位那样跨图漫游；
      // 普通移动中不索敌（moveTarget 非空排除），手动指令优先。
      // 航母（interceptorBay，0 伤）同样待命索敌——锁定目标让拦截机出击；
      // 拦截机排除（由母舰统一指挥）。
      !this.aggressive && !this.combatTarget && this.moveTargetX === null &&
      !this.gatherTarget && !this.buildTarget && !this.def.builds?.length && !this.dock &&
      (this.def.groundDamage || this.def.airDamage || this.def.interceptorBay)
    ) {
      this.combatTarget = this.acquireTarget(
        // 攻城态索敌半径跟随 siegeRange（12 格），普通待命索敌为视野 6 格
        this.sieged ? this.rangePx / TILE_W : SIGHT_RANGE
      );
    }

    if (this.combatTarget) {
      const t = this.combatTarget as Entity;
      const d = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);
      // reach 统一换算到“格”量纲：range 与半径 r 都是 px，需除以 TILE_W。
      // 贴边兜底：目标（建筑/资源）所在格是寻路障碍，近战单位只能站到邻格，
      // 用 max(reach, 半径和+0.85) 保证正邻/对角邻格都能攻击，不会隔障碍卡死。
      const reach = Math.max(
        this.rangePx / TILE_W + this.r / TILE_W + t.r / TILE_W,
        (this.r + t.r) / TILE_W + 0.85
      );
      if (d <= reach) {
        // 在射程内：停下开火
        this.moveTargetX = null;
        this.moveTargetY = null;
        this.path = [];
        // 航母（interceptorBay）本体不开火：拦截机出击/回收由 GameScene.updateInterceptors 驱动，
        // 停在射程内维持目标锁定即可
        if (this.def.interceptorBay) return;
        // 自爆（scourge）：撞击即引爆——对目标结算全额 airDamage 后自身死亡，
        // 走死亡清理流程（startDeath/spawnDeathFx），无普通开火
        if (this.def.suicide) {
          t.takeDamage(this.attackDamage(t.isAir), this);
          this.hp = 0;
          this.alive = false;
          this.combatTarget = null;
          return;
        }
        if (this.attackCooldown <= 0) {
          this.fire(t);
          this.attackCooldown = (this.def.attackInterval ?? 1000) / this.stimRate;
        }
      } else {
        // 接近目标（沿地形路径，绕开水面/高地）；攻城态原地不动等目标进射程
        if (!this.sieged) this.stepMove(dt, t.x, t.y);
      }
      return;
    }

    // 攻击移动：到达后恢复待命
    if (this.attackMove && this.moveTargetX !== null && this.moveTargetY !== null) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.moveTargetX, this.moveTargetY);
      // 目标落在障碍格（建筑/资源）上时按贴边到达（A* 已把目标吸附到邻格）
      const arriveR = isBlocked(Math.floor(this.moveTargetX), Math.floor(this.moveTargetY)) ? 1.6 : 0.5;
      if (d < arriveR) {
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
      const arriveR = isBlocked(Math.floor(this.moveTargetX), Math.floor(this.moveTargetY)) ? 1.6 : 0.5;
      if (d < arriveR) {
        this.moveTargetX = null;
        this.moveTargetY = null;
        this.path = [];
      } else {
        this.stepMove(dt, this.moveTargetX, this.moveTargetY);
      }
    }
  }

  /** 防御建筑战斗分支（2026-10-09 补上——此前建筑从不索敌开火，
   * 文档"防御塔可攻击"与代码不符；隐形体系的反制核心即防御塔侦测+开火）。
   * 不移动、原地索敌，与单位共用 canAttackTarget（含隐形侦测过滤）/fire。 */
  private updateBuildingCombat(dt: number) {
    if (!this.constructed) return;
    // 碉堡（cargoCapacity 建筑）：本体无武器，火力 = 进驻步兵聚合（伤害求和、
    // 攻速取最快者、射程取最远者 + 32px 碉堡加成）；空碉堡/无步兵 = 不参战
    if (this.def.cargoCapacity) {
      const garrison = this.cargo.filter((p) => p.alive && (p.def.groundDamage || p.def.airDamage));
      if (!garrison.length) return;
      if (this.attackCooldown > 0) this.attackCooldown -= dt * 1000;
      const t = this.combatTarget;
      const d = t ? Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y) : Infinity;
      if (!t || !t.alive || !this.canAttackTarget(t) || d > SIGHT_RANGE) {
        this.combatTarget = this.acquireTarget(SIGHT_RANGE);
      }
      const cur = this.combatTarget;
      if (!cur) return;
      let interval = Infinity;
      let range = 0;
      for (const p of garrison) {
        interval = Math.min(interval, (p.def.attackInterval ?? 1000) / p.stimRate);
        range = Math.max(range, p.def.range ?? 0);
      }
      const reach = range / TILE_W + 32 / TILE_W + this.r / TILE_W + cur.r / TILE_W;
      const cd = Phaser.Math.Distance.Between(this.x, this.y, cur.x, cur.y);
      if (cd <= reach && this.attackCooldown <= 0) {
        let dmg = 0;
        for (const p of garrison) dmg += p.attackDamage(cur.isAir);
        if (dmg > 0) {
          this.fire(cur, dmg); // 聚合伤害经碉堡本体一次性结算
          this.attackCooldown = interval;
        }
      }
      return;
    }
    if (!(this.def.groundDamage || this.def.airDamage)) return;
    if (this.attackCooldown > 0) this.attackCooldown -= dt * 1000;
    // 目标失效（死亡/脱离侦测网/超出索敌半径）→ 原地重新索敌（视野 SIGHT_RANGE 格）
    const t = this.combatTarget;
    const d = t ? Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y) : Infinity;
    if (!t || !t.alive || !this.canAttackTarget(t) || d > SIGHT_RANGE) {
      this.combatTarget = this.acquireTarget(SIGHT_RANGE);
    }
    const cur = this.combatTarget;
    if (!cur) return;
    const cd = Phaser.Math.Distance.Between(this.x, this.y, cur.x, cur.y);
    const reach = (this.def.range ?? 0) / TILE_W + this.r / TILE_W + cur.r / TILE_W;
    if (cd <= reach && this.attackCooldown <= 0) {
      this.fire(cur);
      this.attackCooldown = this.def.attackInterval ?? 1000;
    }
  }

  /** 索敌：最近的可攻击敌方实体。maxDist 限格距（默认全图——aggressive
   * 单位跨图追猎的语义；待命索敌传 SIGHT_RANGE 只迎击视野内敌人） */
  acquireTarget(maxDist = Infinity): Entity | null {
    let best: Entity | null = null;
    let bestD = Infinity;
    const ents = (this.scene as any).entities as Entity[];
    for (const e of ents) {
      if (e === this || !e.alive) continue;
      // 中立资源（矿/气泉）不是索敌目标：否则打开主动索敌后单位会去砍矿
      if (e.def.isNeutral) continue;
      if (!this.canAttackTarget(e)) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      if (d > maxDist || d >= bestD) continue;
      bestD = d;
      best = e;
    }
    return best;
  }

  moveToward(tx: number, ty: number, dt: number) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    // def.speed 量纲为 px/秒（StarCraft 原始值，如 90），世界坐标以“格”为单位，
    // 1 格 = TILE_W 像素，故需除以 TILE_W 换算成 格/秒，否则会瞬间瞬移。
    // 兴奋剂增益期移速 ×stimRate（星际式 +50%）。
    const speed = ((this.def.speed ?? 90) / TILE_W) * this.stimRate; // grid/秒
    const step = Math.min(speed * dt, dist - 0.01);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    // 防穿：下一位置进入障碍格（完工建筑/资源格）且当前不在该格 → 原地停（贴边）。
    // 空军豁免（可飞越）；当前已在障碍格内（历史残留，如建筑完工瞬间的工人）放行走出。
    if (
      !this.isAir &&
      isBlocked(Math.floor(nx), Math.floor(ny)) &&
      !(Math.floor(nx) === Math.floor(this.x) && Math.floor(ny) === Math.floor(this.y))
    )
      return;
    this.x = nx;
    this.y = ny;
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

  /** 开火：播攻击动画 + 结算伤害（碉堡聚合火力传 dmgOverride 覆盖本值） */
  fire(target: Entity, dmgOverride?: number) {
    this.playAnim("attack", true); // 每次出手重播攻击动作（与攻击间隔同步）
    // 隐形单位攻击显形（星际式）：ghost/wraith 出手即暴露 ATTACK_REVEAL_MS，
    // 先置显形再结算伤害，目标的受击反击（takeDamage→canAttackTarget）才能锁住攻击者
    if (this.def.cloakRevealsOnAttack) this.revealTimer = ATTACK_REVEAL_MS;
    target.takeDamage(dmgOverride ?? this.attackDamage(target.isAir), this);
    this.onAttack?.(this, target);
  }

  /* ============ 动作动画（序列帧） ============ */

  /** 当前应有动作名。优先级：死亡 > 建筑(施工/待机) > 单位(攻击/采矿/建造/移动/待机) */
  private desiredAnim(): string {
    if (!this.alive) return "death";
    // 锁定冻结：原地僵直（保持 idle，不播攻击/移动动作）
    if (this.lockedTimer > 0) return "idle";
    // 变异中播 build 动作（施工感），完工恢复 idle
    if (this.def.isBuilding) return this.constructed && !this.morphTo ? "idle" : "build";
    if (this.combatTarget && this.combatTarget.alive) {
      const t = this.combatTarget;
      const d = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);
      const reach = this.rangePx / TILE_W + this.r / TILE_W + t.r / TILE_W;
      if (d <= reach) return "attack";
    }
    // medic 治疗挥动（GameScene.updateHeal 射程内治疗时）
    if (this.healTarget && this.healTarget.alive && this.healTarget.hp < this.healTarget.maxHp) {
      const t = this.healTarget;
      const d = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);
      const reach = this.rangePx / TILE_W + this.r / TILE_W + t.r / TILE_W;
      if (d <= reach) return "attack";
    }
    if (this.gatherState === "mining") return "attack"; // 采矿挥动
    if (
      this.moveTargetX !== null ||
      this.garrisonTarget || // 碉堡进驻走位（stepMove 直线，无 moveTarget）
      this.dock || // 出击中的拦截机（含飞回母舰，持续 walk 表现）
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
    if (this.repairTarget && this.repairTarget.alive) {
      // SCV 修理：走向目标 = walk，贴身修理 = attack（同施工锤击摆动）
      const d = Phaser.Math.Distance.Between(
        this.x,
        this.y,
        this.repairTarget.x,
        this.repairTarget.y
      );
      const reach = this.repairTarget.r / TILE_W + this.r / TILE_W + 0.35;
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
    // 建筑死亡：训练队列全额退款（虫族亦然——幼虫已耗但训练费退回，简化一致）
    if (this.def.isBuilding && this.trainQueue.length > 0) {
      const res = (this.scene as any).resOf?.(this.owner);
      if (res) {
        for (const job of this.trainQueue) {
          const d = ALL_DEFS[job.defId];
          if (d) {
            res.minerals += d.minerals;
            res.vespene += d.vespene;
          }
        }
        this.trainQueue = [];
        (this.scene as any).updateHud?.();
      }
    }
    // 运输机被击落：乘客全体陪葬（星际式）
    for (const p of this.cargo) {
      if (p.alive) {
        p.hp = 0;
        p.alive = false;
      }
    }
    // 航母被击毁：机库拦截机（停泊 + 出击中）全体陪葬（星际式）
    for (const it of this.bay) {
      if (it.alive) {
        it.hp = 0;
        it.alive = false;
      }
    }
    const d = ANIM_DEFS[this.def.tex]?.actions["death"];
    if (!d) {
      this.deathTimer = 0; // 无序列帧（中立资源等）：立即可清理
      return false;
    }
    this.deathTimer = ((d.to - d.from + 1) / d.fps) * 1000;
    this.selectionRing.clear();
    this.hpBar.clear();
    // 死亡清空了两个 Graphics → 重置脏标记，防止后续重绘被签名命中跳过
    this.barSig = "";
    this.ringSig = "";
    this.playAnim("death", true);
    return true;
  }

  takeDamage(amount: number, from?: Entity, pierceShield = false) {
    if (!this.alive) return;
    // 防御升级（research）：每级减伤 ARMOR_UPGRADE_BONUS（最低 0）
    const armor = this.armorLevel;
    if (armor > 0) amount = Math.max(0, amount - armor * ARMOR_UPGRADE_BONUS);
    // 大和炮穿透护盾（星际式）：直接扣血
    if (this.shield > 0 && !pierceShield) {
      const absorbed = Math.min(this.shield, amount);
      this.shield -= absorbed;
      amount -= absorbed;
    }
    if (amount > 0) this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return;
    }
    // 受击自动反击（星际式）：非农民、当前无目标 → 锁定攻击方。
    // 不置 aggressive：打完这波即回待命（原地索敌接管），不跨图追猎；
    // 农民（有 builds）除外，避免打断采集/建造作业（AI 经济依赖）。
    if (from && !this.combatTarget && !this.def.builds?.length && this.canAttackTarget(from)) {
      this.combatTarget = from;
    }
  }

  /* ============ 渲染同步（每帧把世界坐标投影到屏幕） ============ */

  syncRender() {
    const h = heightAt(this.x, this.y);
    const { sx, sy } = worldToScreen(this.x, this.y, h);
    this.sprite.setPosition(sx, sy);
    // 隐形单位对己方半透明（星际式"看得到自己人"）。单玩家视角下隐形只作用于
    // 索敌判定层；AI 阵营不出产隐形单位，敌方隐形渲染无需处理。
    this.sprite.setAlpha(this.owner === "player" && this.isCloakedNow ? CLOAK_ALPHA : 1);
    // 锁定蓝染（ghost Lockdown）：覆盖阵营色，解锁自动恢复（每帧按状态重刷）
    if (this.lockedTimer > 0) this.sprite.setTint(0x4477ff);
    else if (this.stimTimer > 0 && !ownerIsAI(this.owner)) this.sprite.setTint(0xff8888); // 兴奋剂淡红
    else if (ownerIsAI(this.owner)) this.sprite.setTint(this.factionTint);
    else this.sprite.clearTint();
    // 动作动画按状态切换（idle/walk/attack/build；同动作不重播）
    this.playAnim(this.desiredAnim());
    // 非建筑：每帧把“单位容器”的 depth 设成等距排序值（x+y 越大越靠前/靠下）。
    // 注意此处改的是 container 的 depth，不再是 sprite 的——sprite 的 depth 只在容器内排序用。
    if (!this.def.isBuilding)
      this.container.setDepth(1000 + this.x + this.y + h * 100);
    this.drawHpBar();
    this.drawSelectionRing();
  }

  /** 血条脏检查签名：屏幕坐标/各进度条/能量/盾血/选中态均未变则跳过重绘
   * （原地静止单位占多数；移动单位坐标每帧在变、训练/变异/研究进度每帧推进 → 正常重绘） */
  private barSig = "";
  /** 选中圈脏检查签名：仅位置取整/选中态变化时重绘 */
  private ringSig = "";

  drawHpBar() {
    const g = this.hpBar;
    const { sx, sy } = worldToScreen(this.x, this.y, heightAt(this.x, this.y));
    const job = this.trainQueue[0];
    const sig = [
      Math.round(sx), Math.round(sy),
      job ? Math.round(job.progress) : -1,
      this.morphTo ? Math.round(this.morphProgress) : -1,
      this.researchKind ? Math.round(this.researchProgress) : -1,
      this.maxEnergy > 0 ? Math.round(this.energy) : -1,
      this.selected ? 1 : 0,
      this.hideHpBar ? 1 : 0,
      Math.round(this.hp * 4), Math.round(this.shield * 4),
    ].join("|");
    if (sig === this.barSig) return;
    this.barSig = sig;
    g.clear();
    const barW = Math.max(20, this.def.size ?? 24);
    const topY = sy - this.sprite.displayHeight * 0.78;
    // 训练进度条：队列非空就画（放在最上方，不受满血隐藏/选中影响）
    if (job) {
      const ty = topY - 14;
      g.fillStyle(0x000000, 0.5);
      g.fillRect(sx - barW / 2 - 1, ty - 1, barW + 2, 4);
      g.fillStyle(0xffdd55, 1);
      g.fillRect(sx - barW / 2, ty, barW * Math.min(1, job.progress / Math.max(1, job.need)), 2.5);
    }
    // 变异进度条（橙）：建筑形态变异中（与训练条同款，堆叠其上）
    if (this.morphTo) {
      const ty = topY - 20;
      g.fillStyle(0x000000, 0.5);
      g.fillRect(sx - barW / 2 - 1, ty - 1, barW + 2, 4);
      g.fillStyle(0xff8833, 1);
      g.fillRect(
        sx - barW / 2,
        ty,
        barW * Math.min(1, this.morphProgress / Math.max(1, this.morphNeed)),
        2.5
      );
    }
    // 研究进度条（青）：科技研究中（与训练/变异条同款，堆叠其上）
    if (this.researchKind) {
      const ty = topY - (this.morphTo ? 26 : 20);
      g.fillStyle(0x000000, 0.5);
      g.fillRect(sx - barW / 2 - 1, ty - 1, barW + 2, 4);
      g.fillStyle(0x55ddff, 1);
      g.fillRect(
        sx - barW / 2,
        ty,
        barW * Math.min(1, this.researchProgress / Math.max(1, this.researchNeed)),
        2.5
      );
    }
    // 能量条（蓝）：有能量上限的单位恒显（法术/技能资源可视化）
    if (this.maxEnergy > 0) {
      const ey = topY - 8 - (this.maxShield > 0 ? 10 : 5);
      g.fillStyle(0x000000, 0.5);
      g.fillRect(sx - barW / 2 - 1, ey - 1, barW + 2, 4);
      g.fillStyle(0x88aaff, 1);
      g.fillRect(sx - barW / 2, ey, barW * (this.energy / this.maxEnergy), 2.5);
    }
    if (this.hideHpBar && !this.selected) return;
    if (this.def.isBuilding && this.hp >= this.maxHp && this.shield >= this.maxShield && !this.selected)
      return;

    const hpTop = topY - 8;

    if (this.maxShield > 0) {
      g.fillStyle(0x000000, 0.5);
      g.fillRect(sx - barW / 2 - 1, hpTop - 1, barW + 2, 5);
      g.fillStyle(0x33aaff, 1);
      g.fillRect(sx - barW / 2, hpTop, barW * (this.shield / this.maxShield), 3);
    }

    g.fillStyle(0x000000, 0.5);
    g.fillRect(sx - barW / 2 - 1, hpTop + (this.maxShield > 0 ? 4 : 0) - 1, barW + 2, 5);
    g.fillStyle(0x33dd44, 1);
    g.fillRect(
      sx - barW / 2,
      hpTop + (this.maxShield > 0 ? 4 : 0),
      barW * (this.hp / this.maxHp),
      3
    );
  }

  drawSelectionRing() {
    const g = this.selectionRing;
    if (!this.selected) {
      if (this.ringSig) {
        g.clear();
        this.ringSig = "";
      }
      return;
    }
    const { sx, sy } = worldToScreen(this.x, this.y, heightAt(this.x, this.y));
    const sig = `${Math.round(sx)},${Math.round(sy)}`;
    if (sig === this.ringSig) return;
    this.ringSig = sig;
    g.clear();
    const ry = this.def.isAir ? this.sprite.displayHeight * 0.45 : 6;
    g.lineStyle(2, 0x00ff66, 0.9);
    g.strokeEllipse(sx, sy, this.def.size ?? 24, ry);
  }
}

export function getEntityDef(id: string): Def | undefined {
  return ALL_DEFS[id] ?? RESOURCE_DEFS[id];
}

export { ALL_DEFS };

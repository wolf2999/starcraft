import E from "phaser";
let Xt = null, Zt = null, ui = 0;
function Ni(o, t) {
  Xt = o, Zt = t;
}
function Ti() {
  if (Xt === null)
    throw new Error("[liquidphaser] runtime 未初始化：请先在 scene.create 中调用 initRuntime(game, scene)");
  return Xt;
}
function rt() {
  if (Zt === null)
    throw new Error("[liquidphaser] runtime 未初始化：请先在 scene.create 中调用 initRuntime(game, scene)");
  return Zt;
}
function Ii() {
  return ui += 1, `lp${ui}`;
}
function ki(o) {
  const t = Ti().textures, i = `lpbmp_${Ii()}`, e = t.addCanvas(i, o);
  if (e === null)
    throw new Error(`[liquidphaser] canvas 纹理注册失败：${i}`);
  return e;
}
const F = class F {
  constructor() {
  }
};
F.ALL = "all", F.SIZE = "size", F.STYLES = "styles", F.STATE = "state", F.DATA = "data", F.SCROLL = "scroll", F.RENDERERS = "renderers", F.SELECTED_INDEX = "selectedIndex", F.SELECTED_INDICES = "selectedIndices";
let r = F;
class W {
  constructor(t = 0, i = 0, e = 0, s = 0) {
    this.x = t, this.y = i, this.width = e, this.height = s;
  }
  get left() {
    return this.x;
  }
  get right() {
    return this.x + this.width;
  }
  get top() {
    return this.y;
  }
  get bottom() {
    return this.y + this.height;
  }
  clone() {
    return new W(this.x, this.y, this.width, this.height);
  }
  isEmpty() {
    return this.width <= 0 || this.height <= 0;
  }
  toString() {
    return `(x=${this.x}, y=${this.y}, w=${this.width}, h=${this.height})`;
  }
}
const v = class v {
  constructor(t, i = !1, e = !1) {
    this.target = null, this.currentTarget = null, this.eventPhase = 0, this._stopped = !1, this._immediateStopped = !1, this._defaultPrevented = !1, this.type = t, this.bubbles = i, this.cancelable = e;
  }
  stopPropagation() {
    this._stopped = !0;
  }
  stopImmediatePropagation() {
    this._stopped = !0, this._immediateStopped = !0;
  }
  preventDefault() {
    this.cancelable && (this._defaultPrevented = !0);
  }
  isDefaultPrevented() {
    return this._defaultPrevented;
  }
  clone() {
    return new v(this.type, this.bubbles, this.cancelable);
  }
};
v.CAPTURING_PHASE = 1, v.AT_TARGET = 2, v.BUBBLING_PHASE = 3, v.CHANGE = "change", v.CLOSE = "close", v.COMPLETE = "complete", v.INIT = "init", v.OPEN = "open", v.REMOVED = "removed", v.RENDER = "render", v.RESIZE = "resize", v.SCROLL = "scroll";
let _ = v;
class J {
  constructor(t = null) {
    this._listeners = null, this.owner = null, this._getParent = t;
  }
  addEventListener(t, i, e = !1, s = 0) {
    this._listeners || (this._listeners = /* @__PURE__ */ new Map());
    let l = this._listeners.get(t);
    l || (l = [], this._listeners.set(t, l));
    for (const n of l)
      if (n.fn === i && n.useCapture === e)
        return;
    let h = 0;
    for (; h < l.length && l[h].priority >= s; )
      h++;
    l.splice(h, 0, { fn: i, useCapture: e, priority: s });
  }
  removeEventListener(t, i, e = !1) {
    var l;
    const s = (l = this._listeners) == null ? void 0 : l.get(t);
    if (s) {
      for (let h = 0; h < s.length; h++)
        if (s[h].fn === i && s[h].useCapture === e) {
          s.splice(h, 1);
          return;
        }
    }
  }
  hasEventListener(t) {
    var e;
    const i = (e = this._listeners) == null ? void 0 : e.get(t);
    return !!i && i.length > 0;
  }
  willTrigger(t) {
    let i = this;
    for (; i !== null; ) {
      if (i.hasEventListener(t))
        return !0;
      i = i._getParent ? i._getParent() : null;
    }
    return !1;
  }
  /**
   * 派发事件。返回 false 表示 preventDefault 被调用（同 AS3）。
   */
  dispatchEvent(t) {
    t.target === null && (t.target = this.owner ?? this);
    const i = [];
    let e = this._getParent ? this._getParent() : null;
    for (; e !== null; )
      i.push(e), e = e._getParent ? e._getParent() : null;
    i.reverse(), t.eventPhase = _.CAPTURING_PHASE;
    for (const s of i)
      if (t.currentTarget = s.owner ?? s, s._invoke(t, !0), t._stopped)
        return !t.isDefaultPrevented();
    if (t.eventPhase = _.AT_TARGET, t.currentTarget = this.owner ?? this, this._invoke(t, !0), t._immediateStopped || this._invoke(t, !1), t.bubbles && !t._stopped) {
      t.eventPhase = _.BUBBLING_PHASE;
      for (let s = i.length - 1; s >= 0 && (t.currentTarget = i[s].owner ?? i[s], i[s]._invoke(t, !1), !t._stopped); s--)
        ;
    }
    return !t.isDefaultPrevented();
  }
  _invoke(t, i) {
    var l;
    const e = (l = this._listeners) == null ? void 0 : l.get(t.type);
    if (!e || e.length === 0)
      return;
    const s = e.slice();
    for (const h of s) {
      if (t._immediateStopped)
        break;
      h.useCapture === i && e.includes(h) && h.fn.call(this, t);
    }
  }
}
const Ai = E.GameObjects.Container, T = class T extends Ai {
  constructor() {
    super(rt(), 0, 0), this._eventMode = "passive", this._hitArea = null, this._cursor = "default", delete this.position, this._ed = new J(() => {
      let t = this.parentContainer;
      for (; t != null; ) {
        if (t instanceof T)
          return t._ed;
        t = t.parentContainer;
      }
      return null;
    }), this._ed.owner = this;
  }
  // —— AS3 风格事件 API：与 Phaser 的 EventEmitter 是两套并行机制。
  // 参数放宽为 unknown 以通过基类签名兼容检查；运行时仅支持 fl 风格监听器（(e: Event) => void）。
  addEventListener(t, i, e, s) {
    this._ed.addEventListener(t, i, !!e, s ?? 0);
  }
  removeEventListener(t, i, e) {
    this._ed.removeEventListener(t, i, !!e);
  }
  dispatchEvent(t) {
    return this._ed.dispatchEvent(t);
  }
  hasEventListener(t) {
    return this._ed.hasEventListener(t);
  }
  willTrigger(t) {
    return this._ed.willTrigger(t);
  }
  // —— 显示列表 API（pixi 命名 → Phaser Container） ——
  // 参数含原生 Phaser GameObject：SkinBox/LiquidIcon 等渲染件直接挂 Phaser
  // Image/NineSlice/TileSprite（非 shim 类），与 pixi 版「子级可为任意 DisplayObject」对齐。
  // 引擎调用点以 asGameObject 断言：类型桥 Omit 掉撞名成员后，shim 类型对 GameObject
  // 是结构性子类型（运行时 100% 是真 GameObject），此处仅弥合类型面。
  /** pixi addChild（支持多参，返回 this） */
  addChild(...t) {
    for (const i of t)
      this.add(i);
    return this;
  }
  addChildAt(t, i) {
    return this.addAt(t, i), this;
  }
  removeChild(t) {
    return this.remove(t), this;
  }
  removeChildAt(t) {
    return this.removeAt(t);
  }
  /** pixi removeChildren：移除全部子级（不销毁），返回被移除列表 */
  removeChildren() {
    const t = this.list.slice();
    return this.removeAll(!1), t;
  }
  getChildAt(t) {
    return this.getAt(t);
  }
  getChildIndex(t) {
    return this.getIndex(t);
  }
  /** Phaser Container 无 setIndex：先摘后插（exclusive 模式下 remove/addAt 语义等价） */
  setChildIndex(t, i) {
    this.remove(t) && this.addAt(t, i);
  }
  /** pixi parent 语义 → Phaser parentContainer */
  get parent() {
    return this.parentContainer;
  }
  /** pixi position 点对象门面（基类数值游标已在构造器中删除） */
  get position() {
    return yi(this);
  }
  set position(t) {
    this.setPosition(t.x, t.y);
  }
  /** pixi scale 点对象门面 → Phaser scaleX/scaleY */
  get scale() {
    return Li(this);
  }
  // —— eventMode / hitArea / cursor（pixi 交互模型 → Phaser input 桥） ——
  /** pixi v8 默认 'passive'：自身不参与命中，祖先 interactive 仍可达 */
  get eventMode() {
    return this._eventMode;
  }
  set eventMode(t) {
    this._eventMode = t, this._syncInput();
  }
  /** 组件局部坐标命中区（与 pixi 同语义；UIComponent.setSize 就地改 width/height，
   * 同一对象引用会透传给 Phaser input.hitArea，命中测试每帧现值生效） */
  get hitArea() {
    return this._hitArea;
  }
  set hitArea(t) {
    this._hitArea = t, this.input !== null && t !== null && (this.input.hitArea = t), this._syncInput();
  }
  /** pixi cursor 语义：'pointer' 时 Phaser 会在悬停时设置画布光标 */
  get cursor() {
    return this._cursor;
  }
  set cursor(t) {
    this._cursor = t, this.input !== null && (this.input.cursor = t === "pointer" ? "pointer" : "");
  }
  /** eventMode/hitArea → Phaser setInteractive 同步（构造期懒激活：hitArea 未就绪先记账） */
  _syncInput() {
    if (this._eventMode === "static") {
      if (this._hitArea === null)
        return;
      this.input === null && (this.setInteractive(this._hitArea, E.Geom.Rectangle.Contains), this._cursor === "pointer" && (this.input.cursor = "pointer"));
    } else
      this.input !== null && (this.input.enabled = !1);
  }
  toLocal(t) {
    T._matA === null && (T._matA = new E.GameObjects.Components.TransformMatrix(), T._matB = new E.GameObjects.Components.TransformMatrix());
    const i = T._matA, e = T._matB;
    this.getWorldTransformMatrix(i, e);
    const s = i.applyInverse(t.x, t.y);
    return { x: s.x, y: s.y };
  }
  toGlobal(t) {
    T._matA === null && (T._matA = new E.GameObjects.Components.TransformMatrix(), T._matB = new E.GameObjects.Components.TransformMatrix());
    const i = T._matA, e = T._matB;
    return this.getWorldTransformMatrix(i, e), { x: i.getX(t.x, t.y), y: i.getY(t.x, t.y) };
  }
  // —— Phaser Container 命中测试的原点污染矫正（见文件头注释） ——
  get originX() {
    return 0;
  }
  get originY() {
    return 0;
  }
  get displayOriginX() {
    return 0;
  }
  get displayOriginY() {
    return 0;
  }
  /** AS3 stage 语义：沿显示列表上行找 Stage shim（未挂到 Stage 下时为 null，同 Flash）。
   * 不用 instanceof Stage（会形成循环导入，见文件顶部注释），改用 Stage 标记字段判断 */
  get stage() {
    let t = this;
    for (; t !== null; ) {
      if (t.isStage === !0)
        return t;
      t = t.parentContainer;
    }
    return null;
  }
  /** fl DisplayObjectContainer.contains：child 为自身或后代（沿 parent 链判定） */
  contains(t) {
    let i = t;
    for (; i !== null; ) {
      if (i === this)
        return !0;
      i = i.parentContainer;
    }
    return !1;
  }
};
T._matA = null, T._matB = null;
let It = T;
const _i = /* @__PURE__ */ new WeakMap();
function yi(o) {
  let t = _i.get(o);
  return t === void 0 && (t = {
    get x() {
      return o.x;
    },
    set x(i) {
      o.x = i;
    },
    get y() {
      return o.y;
    },
    set y(i) {
      o.y = i;
    },
    set(i, e) {
      o.setPosition(i, e);
    }
  }, _i.set(o, t)), t;
}
const gi = /* @__PURE__ */ new WeakMap();
function Li(o) {
  let t = gi.get(o);
  return t === void 0 && (t = {
    get x() {
      return o.scaleX;
    },
    set x(i) {
      o.scaleX = i;
    },
    get y() {
      return o.scaleY;
    },
    set y(i) {
      o.scaleY = i;
    },
    set(i, e) {
      o.setScale(i, e ?? i);
    }
  }, gi.set(o, t)), t;
}
class ti extends It {
  /** buttonMode 便捷映射到 pixi cursor */
  get buttonMode() {
    return this.cursor === "pointer";
  }
  set buttonMode(t) {
    this.cursor = t ? "pointer" : "default";
  }
}
const Ot = /* @__PURE__ */ new Set();
let Si = !1;
function Ci(o) {
  Ot.add(o);
}
function Pi() {
  if (Ot.size === 0)
    return;
  const o = Array.from(Ot);
  Ot.clear();
  for (const t of o)
    try {
      t.validateNow();
    } catch (i) {
      console.error("[LiquidInvalidation] draw failed:", i);
    }
}
function Wi() {
  Si || (Si = !0, Ti().events.on(E.Core.Events.POST_STEP, Pi));
}
const ei = class ei extends ti {
  constructor() {
    super(), this._width = 0, this._height = 0, this._enabled = !0, this.focusEnabled = !0, this.focusManager = null, this.isLivePreview = !1, this._invalid = /* @__PURE__ */ new Set(), this._styles = {}, this._initialized = !1, this.destroy = (t) => {
      const i = this, e = i.data;
      e != null && typeof e.destroy != "function" && (i.data = null), super.destroy(t);
    }, this.eventMode = "static", this.hitArea = new W(0, 0, 0, 0);
  }
  /** fl setSize：记录组件尺寸并失效 SIZE（基类 Phaser Container 的 setSize 已在
   * 类型桥中 Omit，无签名冲突） */
  setSize(t, i) {
    return this._width === t && this._height === i ? this : (this._width = t, this._height = i, this.hitArea.width = t, this.hitArea.height = i, this.invalidate(r.SIZE), this);
  }
  get width() {
    return this._width;
  }
  set width(t) {
    this.setSize(t, this._height);
  }
  get height() {
    return this._height;
  }
  set height(t) {
    this.setSize(this._width, t);
  }
  /** fl UIComponent.move(x, y)：设置位置（省略 MoveEvent 派发——本移植无 MoveEvent shim） */
  move(t, i) {
    this.position.set(t, i);
  }
  /** fl UIComponent.setFocus：空占位，需接 DOM 焦点的组件覆写（TextInput/TextArea → InputAdapter.focus） */
  setFocus() {
  }
  /** fl UIComponent.drawFocus：委托 FocusManager 显示/隐藏共享焦点框 */
  drawFocus(t) {
    var i;
    (i = this.focusManager) == null || i.drawFocusFor(this, t);
  }
  /** fl UIComponent.copyStylesToChild：把本组件样式拷给子组件。
   * styleMap 键=子组件样式名，值=本组件样式名（fl 文档语义）。 */
  copyStylesToChild(t, i) {
    for (const e of Object.keys(i))
      t.setStyle(e, this.getStyleValue(i[e]));
  }
  get enabled() {
    return this._enabled;
  }
  set enabled(t) {
    this._enabled !== t && (this._enabled = t, this.invalidate(r.STATE));
  }
  /** fl 生命周期（幂等）：首次 invalidate/validate 前执行 configUI */
  initialize() {
    this._initialized || (this._initialized = !0, this.configUI());
  }
  configUI() {
  }
  invalidate(...t) {
    this.initialize();
    for (const i of t)
      this._invalid.add(i);
    Ci(this);
  }
  isInvalid(...t) {
    for (const i of t)
      if (this._invalid.has(i))
        return !0;
    return !1;
  }
  validateNow() {
    this.isDestroyed || (this.initialize(), this.draw());
  }
  drawNow() {
    this.isDestroyed || (this.initialize(), this.draw());
  }
  /** fl：UIComponent.draw 为空占位，子类按 invalidation 分类覆写 */
  draw() {
    this._invalid.size !== 0 && this._invalid.clear();
  }
  setStyle(t, i) {
    this._styles[t] !== i && (this._styles[t] = i, this.invalidate(r.STYLES));
  }
  clearStyle(t) {
    t in this._styles && (delete this._styles[t], this.invalidate(r.STYLES));
  }
  /** fl 语义（对照 fl 源码 getStyleValue）：实例样式为 null/undefined 时回退
   * sharedStyles —— TS 架构中以类链 static defaultStyles 充当 sharedStyles
   * （类级默认，由 StyleManager 语义填充）。注意不能按 hasOwnProperty 判定，
   * 否则显式写入的 null/undefined 会遮蔽类默认值 */
  getStyleValue(t) {
    const i = this._styles[t];
    if (i != null)
      return i;
    let e = Object.getPrototypeOf(this);
    for (; e !== null; ) {
      const s = e.constructor;
      if (s !== null && Object.prototype.hasOwnProperty.call(s, "defaultStyles")) {
        const l = s.defaultStyles;
        if (l && Object.prototype.hasOwnProperty.call(l, t))
          return l[t];
      }
      e = Object.getPrototypeOf(e);
    }
  }
};
ei.defaultStyles = {
  focusRectSkin: null,
  focusRectPadding: null,
  textFormat: null,
  disabledTextFormat: null
};
let Z = ei;
const Ut = class Ut extends _ {
  constructor(t, i = !1, e = !1, s = "", l = 0, h = 0) {
    super(t, i, e), this.direction = s, this.delta = l, this.position = h;
  }
  clone() {
    return new Ut(this.type, this.bubbles, this.cancelable, this.direction, this.delta, this.position);
  }
};
Ut.SCROLL = "scroll";
let j = Ut;
class kt {
  constructor(t = 0, i = 0) {
    this.x = t, this.y = i;
  }
  clone() {
    return new kt(this.x, this.y);
  }
  toString() {
    return `(x=${this.x}, y=${this.y})`;
  }
}
const y = class y extends _ {
  constructor(t, i = !1, e = !1, s = null, l = null, h = null, n = null) {
    super(t, i, e), this.localX = null, this.localY = null, this.stageX = null, this.stageY = null, this.delta = 0, this.deltaX = 0, this.localX = s, this.localY = l, this.stageX = h, this.stageY = n;
  }
  clone() {
    const t = new y(this.type, this.bubbles, this.cancelable, this.localX, this.localY, this.stageX, this.stageY);
    return t.delta = this.delta, t.deltaX = this.deltaX, t;
  }
};
y.CLICK = "click", y.DOUBLE_CLICK = "doubleClick", y.MOUSE_DOWN = "mouseDown", y.MOUSE_UP = "mouseUp", y.MOUSE_MOVE = "mouseMove", y.MOUSE_OVER = "mouseOver", y.MOUSE_OUT = "mouseOut", y.MOUSE_WHEEL = "mouseWheel", y.ROLL_OVER = "rollOver", y.ROLL_OUT = "rollOut";
let p = y;
const xt = /* @__PURE__ */ new Map(), $t = /* @__PURE__ */ new Map(), Rt = /* @__PURE__ */ new Set(), Dt = /* @__PURE__ */ new Set();
function Oi(o, t) {
  return o !== null && Rt.add(o), t !== null && Dt.add(t), () => {
    o !== null && Rt.delete(o), t !== null && Dt.delete(t);
  };
}
const pi = /* @__PURE__ */ new Set();
function Ui(o) {
  pi.has(o) || (pi.add(o), o.input.on(E.Input.Events.POINTER_DOWN, (t, i) => {
    const e = Pt(i);
    if ($t.set(t.id, e), e === null)
      return;
    const s = e.toLocal({ x: t.worldX, y: t.worldY });
    e.dispatchEvent(new p(p.MOUSE_DOWN, !0, !1, s.x, s.y, t.worldX, t.worldY));
  }), o.input.on(E.Input.Events.POINTER_UP, (t, i) => {
    fi(t, Pt(i));
  }), o.input.on(E.Input.Events.POINTER_UP_OUTSIDE, (t) => {
    fi(t, null);
  }), o.input.on(E.Input.Events.POINTER_MOVE, (t, i) => {
    if (Rt.size > 0)
      for (const l of Rt)
        l(t.worldX, t.worldY);
    const e = Pt(i), s = xt.get(t.id) ?? null;
    if (xt.set(t.id, e), s !== e) {
      if (s !== null) {
        const l = s.toLocal({ x: t.worldX, y: t.worldY });
        s.dispatchEvent(new p(p.MOUSE_OUT, !0, !1, l.x, l.y, t.worldX, t.worldY));
      }
      if (e !== null) {
        const l = e.toLocal({ x: t.worldX, y: t.worldY });
        e.dispatchEvent(new p(p.MOUSE_OVER, !0, !1, l.x, l.y, t.worldX, t.worldY));
      }
    }
  }), o.input.on(E.Input.Events.GAME_OUT, () => {
    xt.forEach((t) => {
      t !== null && t.dispatchEvent(new p(p.MOUSE_OUT, !0));
    }), xt.clear();
  }), o.input.on(
    E.Input.Events.POINTER_WHEEL,
    (t, i, e, s) => {
      const l = Pt(i);
      if (l === null)
        return;
      const h = l.toLocal({ x: t.worldX, y: t.worldY }), n = new p(p.MOUSE_WHEEL, !0, !1, h.x, h.y, t.worldX, t.worldY);
      n.delta = s < 0 ? 1 : s > 0 ? -1 : 0, n.deltaX = e, l.dispatchEvent(n);
    }
  ));
}
function fi(o, t) {
  if (Dt.size > 0)
    for (const e of Dt)
      e(o.worldX, o.worldY);
  const i = $t.get(o.id) ?? null;
  if ($t.delete(o.id), t !== null) {
    const e = t.toLocal({ x: o.worldX, y: o.worldY });
    t.dispatchEvent(new p(p.MOUSE_UP, !0, !1, e.x, e.y, o.worldX, o.worldY)), i !== null && (i === t || i.contains(t)) && t.dispatchEvent(new p(p.CLICK, !0, !1, e.x, e.y, o.worldX, o.worldY));
  } else if (i !== null) {
    const e = i.toLocal({ x: o.worldX, y: o.worldY });
    i.dispatchEvent(new p(p.MOUSE_UP, !1, !1, e.x, e.y, o.worldX, o.worldY));
  }
}
function Ri(o) {
  for (const t of xt.values())
    if (t !== null && (t === o || o.contains(t)))
      return !0;
  return !1;
}
function Pt(o) {
  for (const t of o)
    if (t instanceof It)
      return t;
  return null;
}
const z = class z extends _ {
  constructor(t, i = !1, e = !1) {
    super(t, i, e);
  }
  clone() {
    return new z(this.type, this.bubbles, this.cancelable);
  }
};
z.BUTTON_DOWN = "componentButtonDown", z.BUTTON_UP = "componentButtonUp", z.ENTER = "componentEnter", z.HIDE = "componentHide", z.LABEL_CHANGE = "componentLabelChange", z.MOVE = "componentMove", z.RESIZE = "componentResize", z.SHOW = "componentShow";
let N = z;
const Vt = class Vt {
  constructor() {
  }
};
Vt.HORIZONTAL = "horizontal", Vt.VERTICAL = "vertical";
let P = Vt;
const si = class si extends Z {
  constructor() {
    super(), this.background = null, this._selected = !1, this._toggle = !1, this._mouseState = "up", this._pressing = !1, this._autoRepeat = !1, this._repeatTimeoutId = null, this._repeatIntervalId = null, this._lastPressLocalX = 0, this._lastPressLocalY = 0, this.addEventListener(p.MOUSE_DOWN, (t) => {
      var i;
      this._pressing = !0, this._lastPressLocalX = t.localX ?? 0, this._lastPressLocalY = t.localY ?? 0, this.enabled && ((i = this.focusManager) == null || i.notifyFocus(this), this.mouseState = "down", this.dispatchEvent(new N(N.BUTTON_DOWN, !0)), this._autoRepeat && this._startRepeat());
    }), this.addEventListener(p.MOUSE_OVER, () => {
      this.mouseState = this._pressing ? "down" : "over";
    }), this.addEventListener(p.MOUSE_OUT, () => {
      this._pressing || (this.mouseState = "up");
    }), this.addEventListener(p.MOUSE_UP, () => {
      this._pressing = !1, this._stopRepeat(), this.enabled && (this.mouseState = Ri(this) ? "over" : "up");
    }), this.addEventListener(p.CLICK, () => {
      this.enabled && this.toggleSelected();
    });
  }
  /** fl autoRepeat：按住按钮重复派发 BUTTON_DOWN */
  get autoRepeat() {
    return this._autoRepeat;
  }
  set autoRepeat(t) {
    this._autoRepeat = t;
  }
  /** fl useHandCursor：映射到 pixi cursor（fl 默认 false） */
  get useHandCursor() {
    return this.cursor === "pointer";
  }
  set useHandCursor(t) {
    this.cursor = t ? "pointer" : "default";
  }
  /** 最近一次按下的组件局部 Y（TS 附加，供 ScrollBar 轨道翻页判定） */
  get lastPressLocalX() {
    return this._lastPressLocalX;
  }
  get lastPressLocalY() {
    return this._lastPressLocalY;
  }
  /** fl BaseButton autoRepeat 计时：首次 repeatDelay 后，每 repeatInterval 派发 BUTTON_DOWN */
  _startRepeat() {
    this._stopRepeat();
    const t = this.getStyleValue("repeatDelay") ?? 500, i = this.getStyleValue("repeatInterval") ?? 35, e = () => this.dispatchEvent(new N(N.BUTTON_DOWN, !0));
    this._repeatTimeoutId = window.setTimeout(() => {
      this._repeatIntervalId = window.setInterval(e, i);
    }, t);
  }
  _stopRepeat() {
    this._repeatTimeoutId !== null && (window.clearTimeout(this._repeatTimeoutId), this._repeatTimeoutId = null), this._repeatIntervalId !== null && (window.clearInterval(this._repeatIntervalId), this._repeatIntervalId = null);
  }
  get mouseState() {
    return this._mouseState;
  }
  set mouseState(t) {
    this._mouseState !== t && (this._mouseState = t, this.invalidate(r.STATE));
  }
  get toggle() {
    return this._toggle;
  }
  set toggle(t) {
    this._toggle !== t && (this._toggle = t, this.invalidate(r.STATE));
  }
  get selected() {
    return this._selected;
  }
  set selected(t) {
    this._selected === t || !this._toggle || (this._selected = t, this.invalidate(r.STATE));
  }
  /** fl LabelButton.toggleSelected：toggle 按钮点击翻转 selected 并派发 CHANGE */
  toggleSelected() {
    this.enabled && this.toggle && (this.selected = !this.selected, this.dispatchEvent(new _(_.CHANGE, !0)));
  }
  draw() {
    this.isInvalid(r.STYLES, r.STATE) && (this.drawBackground(), this.drawIcon(), this.drawTextFormat()), this.isInvalid(r.SIZE) && this.drawLayout(), super.draw();
  }
  /** 当前 mouseState/selected/enabled 对应的皮肤样式键 */
  get skinStyleName() {
    if (!this.enabled)
      return "disabledSkin";
    if (this.selected)
      switch (this.mouseState) {
        case "up":
          return "selectedUpSkin";
        case "over":
          return "selectedOverSkin";
        case "down":
          return "selectedDownSkin";
      }
    else
      switch (this.mouseState) {
        case "up":
          return "upSkin";
        case "over":
          return "overSkin";
        case "down":
          return "downSkin";
      }
    return "upSkin";
  }
  /** 当前 mouseState/selected/enabled 对应的图标样式键 */
  get iconStyleName() {
    if (!this.enabled)
      return "disabledIcon";
    if (this.selected)
      switch (this.mouseState) {
        case "up":
          return "selectedUpIcon";
        case "over":
          return "selectedOverIcon";
        case "down":
          return "selectedDownIcon";
      }
    else
      switch (this.mouseState) {
        case "up":
          return "upIcon";
        case "over":
          return "overIcon";
        case "down":
          return "downIcon";
      }
    return "upIcon";
  }
  drawBackground() {
    const t = this.getStyleValue(this.skinStyleName) ?? null;
    t !== this.background && (this.background !== null && this.removeChild(this.background), t !== null && this.addChildAt(t, 0), this.background = t);
  }
  /** fl BaseButton.drawIcon 为空占位（由 LabelButton 覆写） */
  drawIcon() {
  }
  /** fl BaseButton.drawTextFormat 为空占位（由 LabelButton 覆写） */
  drawTextFormat() {
  }
  drawLayout() {
    this.background !== null && (this.background.width = this._width, this.background.height = this._height);
  }
};
si.defaultStyles = {
  upSkin: null,
  overSkin: null,
  downSkin: null,
  disabledSkin: null,
  selectedUpSkin: null,
  selectedOverSkin: null,
  selectedDownSkin: null,
  selectedDisabledSkin: null,
  repeatDelay: 500,
  repeatInterval: 35
};
let ht = si;
class mt {
  constructor(t = null, i = null, e = null, s = null, l = null, h = null, n = null, d = null, a = null, u = null, g = null, S = null, w = null) {
    this.font = null, this.size = null, this.color = null, this.bold = null, this.italic = null, this.underline = null, this.url = null, this.target = null, this.align = null, this.leftMargin = null, this.rightMargin = null, this.indent = null, this.leading = null, this.letterSpacing = null, t !== null && (this.font = t), i !== null && (this.size = i), e !== null && (this.color = e), s !== null && (this.bold = s), l !== null && (this.italic = l), h !== null && (this.underline = h), n !== null && (this.url = n), d !== null && (this.target = d), a !== null && (this.align = a), u !== null && (this.leftMargin = u), g !== null && (this.rightMargin = g), S !== null && (this.indent = S), w !== null && (this.leading = w);
  }
}
const ot = class ot {
  constructor() {
  }
};
ot.NONE = "none", ot.LEFT = "left", ot.CENTER = "center", ot.RIGHT = "right";
let K = ot;
class Bt extends It {
  constructor() {
    super(), this._defaultTextFormat = new mt("_sans", 10, 0), this._text = "", this._autoSize = K.NONE, this._wordWrap = !1, this._w = 100, this._h = 100, this._scrollV = 1, this._scrollH = 0, this._probe = null, this._lineHeightCache = null, this._prevMaxV = 0, this._prevMaxH = 0, this.embedFonts = !1, this.eventMode = "none", this._inner = new E.GameObjects.Text(rt(), 2, 2, "", {}), this._inner.setOrigin(0, 0), this.addChild(this._inner), this._applyFormat();
  }
  get text() {
    return this._text;
  }
  set text(t) {
    this._text !== t && (this._text = t, this._inner.setText(t), this._syncScrollMetrics());
  }
  appendText(t) {
    this.text = this._text + t;
  }
  /** fl TextField.length：字符数 */
  get length() {
    return this._text.length;
  }
  /** 纯文本宽度（不含 gutter） */
  get textWidth() {
    return this._inner.width;
  }
  /** 纯文本高度（不含 gutter） */
  get textHeight() {
    return this._inner.height;
  }
  get autoSize() {
    return this._autoSize;
  }
  set autoSize(t) {
    this._autoSize !== t && (this._autoSize = t, this._syncTextMetrics());
  }
  get wordWrap() {
    return this._wordWrap;
  }
  set wordWrap(t) {
    this._wordWrap !== t && (this._wordWrap = t, this._applyFormat(), this._syncTextMetrics());
  }
  get defaultTextFormat() {
    return this._defaultTextFormat;
  }
  set defaultTextFormat(t) {
    this._defaultTextFormat = t, this._applyFormat();
  }
  /** fl setTextFormat：本 shim 无范围格式，等价 defaultTextFormat 赋值并立即重应用 */
  setTextFormat(t) {
    this.defaultTextFormat = t;
  }
  // —— 滚动语义（M3） ——
  /** 行号，1..maxScrollV（Flash 语义） */
  get scrollV() {
    return this._scrollV;
  }
  set scrollV(t) {
    const i = Math.max(1, Math.min(this.maxScrollV, Math.round(t)));
    i !== this._scrollV && (this._scrollV = i, this._applyScroll(), this.dispatchEvent(new _(_.SCROLL, !0)));
  }
  /** 水平像素偏移，0..maxScrollH */
  get scrollH() {
    return this._scrollH;
  }
  set scrollH(t) {
    const i = Math.max(0, Math.min(this.maxScrollH, Math.round(t)));
    i !== this._scrollH && (this._scrollH = i, this._applyScroll(), this.dispatchEvent(new _(_.SCROLL, !0)));
  }
  /** 总行数相对可见行数可滚动的最大行号（最小 1，同 Flash） */
  get maxScrollV() {
    const t = this._measureLineHeight();
    if (t <= 0 || this._text === "")
      return 1;
    const i = this._inner.height, e = Math.max(1, Math.ceil(i / t - 1e-6)), s = Math.max(1, Math.floor((this._h - 4) / t));
    return Math.max(1, e - s + 1);
  }
  /** 水平可滚动像素数（内容宽 - 视口宽，最小 0） */
  get maxScrollH() {
    return this._wordWrap ? 0 : Math.max(0, Math.ceil(this._inner.width - (this._w - 4)));
  }
  /** 用探针测行高：单行高度差（与实际排版一致），格式变化时失效重测 */
  _measureLineHeight() {
    if (this._lineHeightCache !== null)
      return this._lineHeightCache;
    this._probe === null && (this._probe = new E.GameObjects.Text(rt(), 0, 0, "", this._currentStyle()), this._probe.setVisible(!1)), this._probe.setText("M");
    const t = this._probe.height;
    this._probe.setText(`M
M`);
    const i = this._probe.height;
    return this._probe.setText(""), this._lineHeightCache = i - t, this._lineHeightCache;
  }
  /** 文本/尺寸/换行变化后重钳制滚动位置并应用视觉偏移；
   *  最大可滚动量或位置变化时派发 Event.SCROLL（Flash TextField 语义：
   *  文本回流改变滚动度量同样触发 scroll 事件，UIScrollBar 依赖它同步） */
  _syncScrollMetrics() {
    const t = this.maxScrollV, i = this.maxScrollH;
    let e = t !== this._prevMaxV || i !== this._prevMaxH;
    this._prevMaxV = t, this._prevMaxH = i, this._scrollV > t && (this._scrollV = t, e = !0), this._scrollH > i && (this._scrollH = i, e = !0), this._applyScroll(), e && this.dispatchEvent(new _(_.SCROLL, !1));
  }
  /** scrollV/scrollH → _inner 平移 */
  _applyScroll() {
    const t = this._measureLineHeight();
    this._inner.setPosition(2 - this._scrollH, 2 - (this._scrollV - 1) * t);
  }
  get width() {
    return this._autoSize !== K.NONE ? this._inner.width + 4 : this._w;
  }
  set width(t) {
    this._w = t, this._syncTextMetrics();
  }
  get height() {
    return this._autoSize !== K.NONE ? this._inner.height + 4 : this._h;
  }
  set height(t) {
    this._h = t, this._syncScrollMetrics();
  }
  _syncTextMetrics() {
    this._wordWrap && this._applyFormat(), this._syncScrollMetrics();
  }
  /** 当前 TextFormat → Phaser TextStyle 映射（_sans/_serif/_typewriter 映射为系统字体栈） */
  _currentStyle() {
    const t = this._defaultTextFormat, i = t.font ?? "_sans", e = i === "_sans" ? "Arial, Helvetica, sans-serif" : i === "_serif" ? '"Times New Roman", serif' : i === "_typewriter" ? '"Courier New", monospace' : i, s = t.color ?? 0, l = {
      fontFamily: e,
      fontSize: `${t.size ?? 10}px`,
      color: `#${(s & 16777215).toString(16).padStart(6, "0")}`
    };
    return (t.bold !== null || t.italic !== null) && (l.fontStyle = [
      t.bold === !0 ? "bold" : t.bold === !1 ? "normal" : "",
      t.italic === !0 ? "italic" : t.italic === !1 ? "normal" : ""
    ].filter((h) => h !== "").join(" ")), t.align !== null && (l.align = t.align), t.letterSpacing !== null && (l.letterSpacing = t.letterSpacing), this._wordWrap && (l.wordWrap = { width: Math.max(1, this._w - 4), useAdvancedWrap: !0 }), l;
  }
  _applyFormat() {
    this._inner.setStyle(this._currentStyle()), this._lineHeightCache = null, this._probe !== null && this._probe.setStyle(this._currentStyle()), this._syncScrollMetrics();
  }
}
const dt = class dt {
  constructor() {
  }
};
dt.TOP = "top", dt.LEFT = "left", dt.BOTTOM = "bottom", dt.RIGHT = "right";
let at = dt;
const li = class li extends ht {
  constructor() {
    super(...arguments), this.textField = null, this.icon = null, this._label = "", this._labelPlacement = at.RIGHT;
  }
  configUI() {
    super.configUI(), this.textField = new Bt(), this.textField.autoSize = K.NONE, this.addChild(this.textField);
  }
  /** AS3 label 语义（Phaser 无同名成员，独立声明） */
  get label() {
    return this._label;
  }
  set label(t) {
    this._label !== t && (this._label = t, this.textField !== null && (this.textField.text = t), this.dispatchEvent(new N(N.LABEL_CHANGE, !0)), this.invalidate(r.DATA));
  }
  get labelPlacement() {
    return this._labelPlacement;
  }
  set labelPlacement(t) {
    this._labelPlacement !== t && (this._labelPlacement = t, this.invalidate(r.SIZE));
  }
  drawIcon() {
    const t = this.icon, e = this.getStyleValue(this.iconStyleName) ?? this.getStyleValue("icon") ?? null;
    e !== t && (this.icon = e, t !== null && this.removeChild(t), this.icon !== null && this.addChild(this.icon));
  }
  drawTextFormat() {
    if (this.textField === null)
      return;
    const t = !this.enabled && this.getStyleValue("disabledTextFormat") != null ? this.getStyleValue("disabledTextFormat") : this.getStyleValue("textFormat");
    this.textField.defaultTextFormat = t ?? new mt("_sans", 10, 0);
  }
  drawLayout() {
    if (super.drawLayout(), this.textField === null)
      return;
    const t = this.getStyleValue("textPadding") ?? 5, i = this.textField.textWidth, e = this.textField.textHeight + 4;
    this.textField.width = Math.max(1, i), this.textField.height = e;
    const s = this.icon !== null ? this.icon.width + (i > 0 ? t : 0) : 0, l = this._labelPlacement;
    let h, n;
    if (this.icon !== null) {
      const d = this.icon.height;
      switch (l) {
        case at.LEFT: {
          const a = i + s;
          h = Math.round((this._width - a) / 2), this.icon.position.set(h + i + t, Math.round((this._height - d) / 2)), n = Math.round((this._height - e) / 2);
          break;
        }
        case at.TOP: {
          const a = e + t + d;
          h = Math.round((this._width - i) / 2), n = Math.round((this._height - a) / 2), this.icon.position.set(Math.round((this._width - this.icon.width) / 2), n + e + t);
          break;
        }
        case at.BOTTOM: {
          const a = d + t + e;
          this.icon.position.set(Math.round((this._width - this.icon.width) / 2), Math.round((this._height - a) / 2)), n = this.icon.y + d + t, h = Math.round((this._width - i) / 2);
          break;
        }
        default: {
          const a = s + i;
          this.icon.position.set(Math.round((this._width - a) / 2), Math.round((this._height - d) / 2)), h = this.icon.x + this.icon.width + t, n = Math.round((this._height - e) / 2);
          break;
        }
      }
    } else
      h = Math.round((this._width - i) / 2), n = Math.round((this._height - e) / 2);
    this.textField.position.set(h, n);
  }
};
li.defaultStyles = {
  embedFonts: !1,
  textPadding: 5,
  textFormat: null,
  disabledTextFormat: null,
  icon: null,
  upIcon: null,
  overIcon: null,
  downIcon: null,
  disabledIcon: null,
  selectedUpIcon: null,
  selectedOverIcon: null,
  selectedDownIcon: null,
  selectedDisabledIcon: null
};
let ft = li;
const m = class m extends Z {
  constructor() {
    super(...arguments), this.upArrow = null, this.downArrow = null, this.track = null, this.thumb = null, this._pageSize = 10, this._pageScrollSize = 0, this._lineScrollSize = 1, this._minScrollPosition = 0, this._maxScrollPosition = 0, this._scrollPosition = 0, this._direction = P.VERTICAL, this._thumbScrollOffset = 0, this.inDrag = !1, this.scrollPressHandler = (t) => {
      const i = t.currentTarget;
      if (i === this.upArrow)
        this.setScrollPosition(this.scrollPosition - this._lineScrollSize, !0);
      else if (i === this.downArrow)
        this.setScrollPosition(this.scrollPosition + this._lineScrollSize, !0);
      else if (i === this.track) {
        const e = this.pageScrollSize, l = this._direction === P.VERTICAL ? this.track.lastPressLocalY < this.thumb.y - this.track.y : this.track.lastPressLocalX < this.thumb.x - this.track.x;
        this.setScrollPosition(this.scrollPosition + (l ? -e : e), !0);
      }
    }, this.thumbPressHandler = (t) => {
      this.inDrag = !0;
      const i = new kt(t.stageX ?? 0, t.stageY ?? 0), e = this.toLocal(i), s = this._direction === P.VERTICAL;
      this._thumbScrollOffset = s ? e.y - this.thumb.y : e.x - this.thumb.x, this._unbindGlobalPointer = Oi(this.thumbMoveHandler, this.thumbReleaseHandler);
    }, this._unbindGlobalPointer = null, this.thumbMoveHandler = (t, i) => {
      if (!this.inDrag)
        return;
      const e = this.toLocal({ x: t, y: i }), s = this._direction === P.VERTICAL, l = s ? e.y : e.x, h = s ? this.track.y : this.track.x, n = s ? this.track.height : this.track.width, d = s ? this.thumb.height : this.thumb.width, a = Math.max(n - d, 1), u = this._maxScrollPosition - this._minScrollPosition, g = Math.round((l - this._thumbScrollOffset - h) / a * (u || 1) + this._minScrollPosition);
      this.setScrollPosition(g, !0);
    }, this.thumbReleaseHandler = () => {
      var t;
      this.inDrag = !1, (t = this._unbindGlobalPointer) == null || t.call(this), this._unbindGlobalPointer = null;
    };
  }
  configUI() {
    super.configUI(), this.focusEnabled = !1, this.track = new ht(), this.track.autoRepeat = !0, this.track.focusEnabled = !1, this.addChild(this.track), this.upArrow = new ht(), this.upArrow.autoRepeat = !0, this.upArrow.focusEnabled = !1, this.addChild(this.upArrow), this.downArrow = new ht(), this.downArrow.autoRepeat = !0, this.downArrow.focusEnabled = !1, this.addChild(this.downArrow), this.thumb = new ft(), this.thumb.focusEnabled = !1, this.addChild(this.thumb), this.copyStylesToChild(this.upArrow, m.UP_ARROW_STYLES), this.copyStylesToChild(this.downArrow, m.DOWN_ARROW_STYLES), this.copyStylesToChild(this.track, m.TRACK_STYLES), this.copyStylesToChild(this.thumb, m.THUMB_STYLES), this.upArrow.addEventListener(N.BUTTON_DOWN, this.scrollPressHandler), this.downArrow.addEventListener(N.BUTTON_DOWN, this.scrollPressHandler), this.track.addEventListener(N.BUTTON_DOWN, this.scrollPressHandler), this.thumb.addEventListener(p.MOUSE_DOWN, this.thumbPressHandler), this.enabled = !1;
  }
  // —— 滚动属性 ——
  setScrollProperties(t, i, e, s = 0) {
    this.pageSize = t, this._minScrollPosition = i, this._maxScrollPosition = e, this._pageScrollSize = s >= 0 ? s : 0, this.invalidate(r.DATA);
  }
  get pageSize() {
    return this._pageSize;
  }
  set pageSize(t) {
    t <= 0 || (this._pageSize = t, this.invalidate(r.DATA));
  }
  /** 0 时回退 pageSize（fl 文档语义） */
  get pageScrollSize() {
    return this._pageScrollSize === 0 ? this._pageSize : this._pageScrollSize;
  }
  set pageScrollSize(t) {
    this._pageScrollSize = t >= 0 ? t : 0, this.invalidate(r.DATA);
  }
  get lineScrollSize() {
    return this._lineScrollSize;
  }
  set lineScrollSize(t) {
    t <= 0 || (this._lineScrollSize = t);
  }
  get minScrollPosition() {
    return this._minScrollPosition;
  }
  set minScrollPosition(t) {
    t !== this._minScrollPosition && (this._minScrollPosition = t, this.invalidate(r.DATA));
  }
  get maxScrollPosition() {
    return this._maxScrollPosition;
  }
  set maxScrollPosition(t) {
    t !== this._maxScrollPosition && (this._maxScrollPosition = t, this.invalidate(r.DATA));
  }
  get scrollPosition() {
    return this._scrollPosition;
  }
  set scrollPosition(t) {
    this.setScrollPosition(t, !0);
  }
  get direction() {
    return this._direction;
  }
  set direction(t) {
    this._direction !== t && (this._direction = t, this.invalidate(r.SIZE));
  }
  /** 位置变更统一入口：钳制 + DATA 失效 + 按需派发 ScrollEvent（fl 语义） */
  setScrollPosition(t, i) {
    const e = this._scrollPosition;
    this._scrollPosition = Math.max(this._minScrollPosition, Math.min(this._maxScrollPosition, t)), this._scrollPosition !== e && (this.invalidate(r.DATA), i && this.dispatchEvent(new j(j.SCROLL, !1, !1, this._direction, this._scrollPosition - e, this._scrollPosition)));
  }
  // —— 绘制 ——
  draw() {
    this.isInvalid(r.SIZE) && this.drawLayout(), this.isInvalid(r.STATE, r.SIZE, r.DATA) && this.updateThumb(), super.draw();
  }
  /** 垂直：上下箭头 + 中间轨道；水平：左右箭头 + 中间轨道 */
  drawLayout() {
    const t = this._direction === P.VERTICAL;
    this.upArrow.setSize(m.WIDTH, m.WIDTH), this.upArrow.move(0, 0), this.downArrow.setSize(m.WIDTH, m.WIDTH), t ? (this.downArrow.move(0, this._height - m.WIDTH), this.track.setSize(m.WIDTH, Math.max(0, this._height - m.WIDTH * 2)), this.track.move(0, m.WIDTH)) : (this.downArrow.move(this._width - m.WIDTH, 0), this.track.setSize(Math.max(0, this._width - m.WIDTH * 2), m.WIDTH), this.track.move(m.WIDTH, 0));
  }
  /** thumb 尺寸/位置/可见性 + 子部件 enabled（fl 行为级重建） */
  updateThumb() {
    const t = this._direction === P.VERTICAL, i = t ? this.track.height : this.track.width, e = this._maxScrollPosition - this._minScrollPosition, s = e + this._pageSize;
    if (i >= m.WIDTH && this._maxScrollPosition > this._minScrollPosition) {
      const h = Math.max(this._pageSize / s * i, m.WIDTH), n = (i - h) * ((this._scrollPosition - this._minScrollPosition) / (e || 1));
      t ? (this.thumb.setSize(m.WIDTH, h), this.thumb.move(this.track.x, this.track.y + n)) : (this.thumb.setSize(h, m.WIDTH), this.thumb.move(this.track.x + n, this.track.y)), this.thumb.visible = !0;
    } else
      this.thumb.visible = !1;
    const l = this._maxScrollPosition > this._minScrollPosition;
    this.upArrow.enabled = l, this.downArrow.enabled = l, this.track.enabled = l, this.thumb.enabled = l;
  }
};
m.WIDTH = 15, m.defaultStyles = {
  upArrowUpSkin: null,
  upArrowOverSkin: null,
  upArrowDownSkin: null,
  upArrowDisabledSkin: null,
  downArrowUpSkin: null,
  downArrowOverSkin: null,
  downArrowDownSkin: null,
  downArrowDisabledSkin: null,
  thumbUpSkin: null,
  thumbOverSkin: null,
  thumbDownSkin: null,
  thumbDisabledSkin: null,
  trackUpSkin: null,
  trackOverSkin: null,
  trackDownSkin: null,
  trackDisabledSkin: null,
  thumbTrackUpSkin: null,
  thumbTrackOverSkin: null,
  thumbTrackDownSkin: null,
  thumbTrackDisabledSkin: null,
  repeatDelay: 500,
  repeatInterval: 35
}, m.UP_ARROW_STYLES = {
  upSkin: "upArrowUpSkin",
  overSkin: "upArrowOverSkin",
  downSkin: "upArrowDownSkin",
  disabledSkin: "upArrowDisabledSkin",
  repeatDelay: "repeatDelay",
  repeatInterval: "repeatInterval"
}, m.DOWN_ARROW_STYLES = {
  upSkin: "downArrowUpSkin",
  overSkin: "downArrowOverSkin",
  downSkin: "downArrowDownSkin",
  disabledSkin: "downArrowDisabledSkin",
  repeatDelay: "repeatDelay",
  repeatInterval: "repeatInterval"
}, m.TRACK_STYLES = {
  upSkin: "trackUpSkin",
  overSkin: "trackOverSkin",
  downSkin: "trackDownSkin",
  disabledSkin: "trackDisabledSkin",
  repeatDelay: "repeatDelay",
  repeatInterval: "repeatInterval"
}, m.THUMB_STYLES = {
  upSkin: "thumbUpSkin",
  overSkin: "thumbOverSkin",
  downSkin: "thumbDownSkin",
  disabledSkin: "thumbDisabledSkin"
  // 原版 THUMB_STYLES 含 icon:"icon"，Liquid 初始化时 delete 阻止拷贝；
  // TS 侧样式拷贝仅作用于被替换前的 fl 默认子部件（Liquid 会整体重建），
  // 故此处直接不列 icon 键。
};
let b = m;
const ct = class ct extends Z {
  constructor() {
    super(...arguments), this.background = null, this._horizontalScrollBar = null, this._verticalScrollBar = null, this.content = null, this.contentScrollRect = new W(), this._contentMask = null, this._contentMaskFilter = null, this.defaultLineScrollSize = 4, this._verticalScrollPolicy = "auto", this._horizontalScrollPolicy = "auto", this._verticalScrollPosition = 0, this._horizontalScrollPosition = 0, this._scrollDrag = !1, this._useFixedHorizontalScrollPosition = !1, this._availableWidth = 0, this._availableHeight = 0, this.handleScroll = (t) => {
      t.direction === P.VERTICAL ? this.verticalScrollPosition = t.position : this.horizontalScrollPosition = t.position;
    };
  }
  configUI() {
    super.configUI(), this.focusEnabled = !1, this.content = new ti(), this.content.setScrollFactor(0, 0), this.addChild(this.content), this._contentMask = new E.GameObjects.Graphics(this.scene), this._contentMask.visible = !1, this.addChild(this._contentMask), this.content.enableFilters();
    const t = this.content.filters;
    this._contentMaskFilter = t !== null ? t.external.addMask(this._contentMask, !1) : null, this._contentMaskFilter, this._verticalScrollBar = new b(), this._verticalScrollBar.visible = !1, this._verticalScrollBar.lineScrollSize = this.defaultLineScrollSize, this._verticalScrollBar.addEventListener(j.SCROLL, this.handleScroll), this.addChild(this._verticalScrollBar), this.copyStylesToChild(this._verticalScrollBar, ct.SCROLL_BAR_STYLES), this._horizontalScrollBar = new b(), this._horizontalScrollBar.direction = P.HORIZONTAL, this._horizontalScrollBar.visible = !1, this._horizontalScrollBar.lineScrollSize = this.defaultLineScrollSize, this._horizontalScrollBar.addEventListener(j.SCROLL, this.handleScroll), this.addChild(this._horizontalScrollBar), this.copyStylesToChild(this._horizontalScrollBar, ct.SCROLL_BAR_STYLES);
  }
  // —— 滚动属性 ——
  get verticalScrollPosition() {
    return this._verticalScrollPosition;
  }
  set verticalScrollPosition(t) {
    const i = Math.max(0, Math.min(this.maxVerticalScrollPosition, t));
    i !== this._verticalScrollPosition && (this._verticalScrollPosition = i, this._verticalScrollBar.scrollPosition = i, this.invalidate(r.SCROLL));
  }
  get horizontalScrollPosition() {
    return this._horizontalScrollPosition;
  }
  set horizontalScrollPosition(t) {
    const i = Math.max(0, Math.min(this.maxHorizontalScrollPosition, t));
    i !== this._horizontalScrollPosition && (this._horizontalScrollPosition = i, this._horizontalScrollBar.scrollPosition = i, this.invalidate(r.SCROLL));
  }
  /** fl 未文档化公开访问器（LiquidComboBox 经 list.verticalScrollBar 监听 SCROLL） */
  get verticalScrollBar() {
    return this._verticalScrollBar;
  }
  get horizontalScrollBar() {
    return this._horizontalScrollBar;
  }
  get maxVerticalScrollPosition() {
    return this._verticalScrollBar.maxScrollPosition;
  }
  get maxHorizontalScrollPosition() {
    return this._horizontalScrollBar.maxScrollPosition;
  }
  get verticalScrollPolicy() {
    return this._verticalScrollPolicy;
  }
  set verticalScrollPolicy(t) {
    this._verticalScrollPolicy !== t && (this._verticalScrollPolicy = t, this.invalidate(r.SIZE));
  }
  get horizontalScrollPolicy() {
    return this._horizontalScrollPolicy;
  }
  set horizontalScrollPolicy(t) {
    this._horizontalScrollPolicy !== t && (this._horizontalScrollPolicy = t, this.invalidate(r.SIZE));
  }
  get scrollDrag() {
    return this._scrollDrag;
  }
  set scrollDrag(t) {
    this._scrollDrag = t;
  }
  get useFixedHorizontalScrollPosition() {
    return this._useFixedHorizontalScrollPosition;
  }
  set useFixedHorizontalScrollPosition(t) {
    this._useFixedHorizontalScrollPosition = t;
  }
  get contentPadding() {
    return this.getStyleValue("contentPadding") ?? 0;
  }
  set contentPadding(t) {
    this.setStyle("contentPadding", t);
  }
  // —— 绘制 ——
  draw() {
    this.isInvalid(r.SIZE, r.STYLES, r.STATE) && this.drawBackground(), this.isInvalid(r.SIZE, r.STYLES, r.STATE, r.DATA) && this.drawLayout(), this.isInvalid(r.SCROLL) && this.applyContentOffset(), this.drawScrollContent(), super.draw();
  }
  /** 内容绘制钩子（fl 中由 SelectableList.drawList/ScrollPane 内联；拆出保证布局先行） */
  drawScrollContent() {
  }
  drawBackground() {
    const t = this.getStyleValue(this.enabled ? "upSkin" : "disabledSkin") ?? null;
    t !== this.background && (this.background !== null && this.removeChild(this.background), t !== null && this.addChildAt(t, 0), this.background = t), this.background !== null && (this.background.width = this._width, this.background.height = this._height);
  }
  drawLayout() {
    const t = this.contentPadding;
    let i = Math.max(1, this._width - t * 2), e = Math.max(1, this._height - t * 2);
    const s = this._verticalScrollPolicy === "on" || this._verticalScrollPolicy === "auto" && this.contentHeight() > e;
    s && (i -= b.WIDTH);
    const l = this._horizontalScrollPolicy === "on" || this._horizontalScrollPolicy === "auto" && this.contentWidth() > i;
    l && (e -= b.WIDTH), this._availableWidth = i, this._availableHeight = e, this._verticalScrollBar.setSize(b.WIDTH, Math.max(0, this._height - (l ? b.WIDTH : 0))), this._verticalScrollBar.move(this._width - b.WIDTH, 0), this._horizontalScrollBar.setSize(Math.max(0, this._width - (s ? b.WIDTH : 0)), b.WIDTH), this._horizontalScrollBar.move(0, this._height - b.WIDTH), this.contentScrollRect = new W(0, 0, this._availableWidth, this._availableHeight), this._contentMask.clear().fillStyle(16777215, 1).fillRect(0, 0, this._availableWidth, this._availableHeight), this._contentMask.setPosition(t, t), this.applyContentOffset(), this.updateScrollProperties(), this._verticalScrollBar.visible = s, this._horizontalScrollBar.visible = l;
  }
  /** 滚动度量钩子（fl 在 drawLayout 内联设置；拆出供 SelectableList 覆写行单位语义） */
  updateScrollProperties() {
    const t = Math.max(0, this.contentHeight() - this._availableHeight), i = Math.max(0, this.contentWidth() - this._availableWidth);
    this._verticalScrollBar.setScrollProperties(this._availableHeight, 0, t), this._horizontalScrollBar.setScrollProperties(this._availableWidth, 0, i);
  }
  /** content 内容尺寸（未滚动时的包围盒） */
  contentWidth() {
    return this.content.width;
  }
  contentHeight() {
    return this.content.height;
  }
  /** fl scrollRect 偏移的等价物：content 平移 = (pad - hpos, pad - vpos) */
  applyContentOffset() {
    const t = this.contentPadding;
    this.content.position.set(t - this._horizontalScrollPosition, t - this._verticalScrollPosition);
  }
};
ct.defaultStyles = {
  upSkin: null,
  disabledSkin: null,
  contentPadding: 0,
  repeatDelay: 500,
  repeatInterval: 35
}, ct.SCROLL_BAR_STYLES = {
  upArrowUpSkin: "upArrowUpSkin",
  upArrowOverSkin: "upArrowOverSkin",
  upArrowDownSkin: "upArrowDownSkin",
  upArrowDisabledSkin: "upArrowDisabledSkin",
  downArrowUpSkin: "downArrowUpSkin",
  downArrowOverSkin: "downArrowOverSkin",
  downArrowDownSkin: "downArrowDownSkin",
  downArrowDisabledSkin: "downArrowDisabledSkin",
  thumbUpSkin: "thumbUpSkin",
  thumbOverSkin: "thumbOverSkin",
  thumbDownSkin: "thumbDownSkin",
  thumbDisabledSkin: "thumbDisabledSkin",
  trackUpSkin: "trackUpSkin",
  trackOverSkin: "trackOverSkin",
  trackDownSkin: "trackDownSkin",
  trackDisabledSkin: "trackDisabledSkin",
  thumbTrackUpSkin: "thumbTrackUpSkin",
  thumbTrackOverSkin: "thumbTrackOverSkin",
  thumbTrackDownSkin: "thumbTrackDownSkin",
  thumbTrackDisabledSkin: "thumbTrackDisabledSkin",
  repeatDelay: "repeatDelay",
  repeatInterval: "repeatInterval"
};
let Ft = ct;
class Vi extends Ft {
  constructor() {
    super(...arguments), this._source = null;
  }
  get source() {
    return this._source;
  }
  set source(t) {
    this._source !== t && (this._source !== null && this._source.parent === this.content && this.content.removeChild(this._source), this._source = t, this._source !== null && this.content.addChild(this._source), this.invalidate(r.SIZE, r.DATA));
  }
  /** fl refreshPane：重载源内容（TS 侧无异步加载，等价为重测尺寸 + 重绘） */
  refreshPane() {
    this.invalidate(r.SIZE, r.DATA);
  }
  /** fl update：立即重绘滚动度量 */
  update() {
    this.validateNow();
  }
  contentWidth() {
    return this._source !== null ? this._source.width : this.content.width;
  }
  contentHeight() {
    return this._source !== null ? this._source.height : this.content.height;
  }
}
const hi = class hi extends ft {
  constructor() {
    super(...arguments), this._emphasized = !1, this.emphasizedBorder = null;
  }
  get emphasized() {
    return this._emphasized;
  }
  set emphasized(t) {
    this._emphasized !== t && (this._emphasized = t, this.invalidate(r.STYLES));
  }
  draw() {
    this.isInvalid(r.STYLES, r.STATE) && (this.drawBackground(), this.drawIcon(), this.drawTextFormat(), this.drawEmphasized()), this.isInvalid(r.SIZE) && this.drawLayout(), super.draw();
  }
  drawEmphasized() {
    const t = this.getStyleValue("emphasizedSkin");
    t != null && this._emphasized && this.emphasizedBorder === null && (this.emphasizedBorder = t, this.addChildAt(this.emphasizedBorder, 0)), this.emphasizedBorder !== null && (this.emphasizedBorder.visible = this._emphasized);
  }
  drawLayout() {
    if (super.drawLayout(), this.emphasizedBorder !== null) {
      const t = this.getStyleValue("emphasizedPadding") ?? 2;
      this.emphasizedBorder.width = this._width + t * 2, this.emphasizedBorder.height = this._height + t * 2, this.emphasizedBorder.position.set(-t, -t);
    }
  }
};
hi.defaultStyles = {
  emphasizedSkin: null,
  emphasizedPadding: 2
};
let wi = hi;
class Di extends ft {
  configUI() {
    super.configUI(), this.toggle = !0;
  }
}
const bt = class bt extends _ {
  constructor(t, i = !1, e = !1, s = 0, l = 0, h = 0, n = !1, d = !1, a = !1) {
    super(t, i, e), this.charCode = s, this.keyCode = l, this.keyLocation = h, this.ctrlKey = n, this.altKey = d, this.shiftKey = a;
  }
  clone() {
    return new bt(this.type, this.bubbles, this.cancelable, this.charCode, this.keyCode, this.keyLocation, this.ctrlKey, this.altKey, this.shiftKey);
  }
};
bt.KEY_DOWN = "keyDown", bt.KEY_UP = "keyUp";
let wt = bt;
const it = class it extends _ {
  constructor(t, i = !1, e = !1, s = -1, l = -1, h = -1, n = null) {
    super(t, i, e), this.columnIndex = s, this.rowIndex = l, this.index = h, this.item = n;
  }
  clone() {
    return new it(this.type, this.bubbles, this.cancelable, this.columnIndex, this.rowIndex, this.index, this.item);
  }
};
it.ITEM_CLICK = "itemClick", it.ITEM_DOUBLE_CLICK = "itemDoubleClick", it.ITEM_ROLL_OUT = "itemRollOut", it.ITEM_ROLL_OVER = "itemRollOver";
let H = it;
const Et = class Et extends _ {
  constructor(t, i = !1, e = !1, s = "", l = 0, h = 0, n = null) {
    super(t, i, e), this.changeType = s, this.startIndex = l, this.endIndex = h, this.items = n ?? [];
  }
  clone() {
    return new Et(this.type, this.bubbles, this.cancelable, this.changeType, this.startIndex, this.endIndex, this.items);
  }
};
Et.DATA_CHANGE = "dataChange", Et.PRE_DATA_CHANGE = "preDataChange";
let V = Et;
const L = class L {
  constructor() {
  }
};
L.ENTER = 13, L.ESCAPE = 27, L.SPACE = 32, L.PAGE_UP = 33, L.PAGE_DOWN = 34, L.END = 35, L.HOME = 36, L.LEFT = 37, L.UP = 38, L.RIGHT = 39, L.DOWN = 40;
let A = L;
const et = class et extends _ {
  constructor(t, i = !1, e = !1, s = "none") {
    super(t, i, e), this.direction = s;
  }
  clone() {
    return new et(this.type, this.bubbles, this.cancelable, this.direction);
  }
};
et.FOCUS_IN = "focusIn", et.FOCUS_OUT = "focusOut", et.KEY_FOCUS_CHANGE = "keyFocusChange", et.MOUSE_FOCUS_CHANGE = "mouseFocusChange";
let B = et;
const ut = class ut {
  constructor() {
  }
};
ut.LEFT = "left", ut.CENTER = "center", ut.RIGHT = "right", ut.JUSTIFY = "justify";
let zt = ut;
const C = class C {
  constructor(t, i) {
    this._appliedFont = "", this.onInput = null, this.onFocus = null, this.onBlur = null, this.inputHandler = () => {
      var h;
      const s = this._el.value, l = this._el.type === "password" ? "•".repeat(s.length) : s;
      this._target.text = l, (h = this.onInput) == null || h.call(this, s);
    }, this._domLeft = 0, this._domTop = 0, this._target = t, this._el = i ? document.createElement("textarea") : document.createElement("input"), i || (this._el.type = "text");
    const e = this._el.style;
    e.position = "absolute", e.border = "none", e.padding = "0", e.margin = "0", e.outline = "none", e.background = "transparent", e.color = "transparent", e.caretColor = "#000000", e.overflow = "hidden", e.whiteSpace = "pre", e.pointerEvents = "none", e.resize = "none", e.zIndex = "9999", this._el.rows = 1, document.body.appendChild(this._el), this._el.addEventListener("input", this.inputHandler), this._el.addEventListener("focus", () => {
      var s;
      this.syncLayout(), (s = this.onFocus) == null || s.call(this);
    }), this._el.addEventListener("blur", () => {
      var s;
      (s = this.onBlur) == null || s.call(this);
    }), this._el.addEventListener("keydown", (s) => {
      s.key === "Tab" && s.preventDefault();
    });
  }
  /**
   * main.ts 在 Application 初始化后调用一次（坐标映射基准）。
   * @param canvas      游戏画布
   * @param logicalSize 游戏逻辑尺寸（如 1280×720）；省略则用 canvas 缓冲尺寸。
   *                    缩放模式（FIT 等）下 DOM 层需要据此换算 CSS 像素。
   */
  static setCanvas(t, i) {
    C._canvas = t, C._logicalW = (i == null ? void 0 : i.width) ?? 0, C._logicalH = (i == null ? void 0 : i.height) ?? 0;
  }
  /**
   * canvas 的 CSS 缩放系数（显示尺寸 / 逻辑尺寸）。
   * 逻辑坐标 ×系数 = CSS 像素；ScaleMode NONE 且 1:1 时为 (1,1)。
   */
  _cssScale(t) {
    const i = C._canvas, e = C._logicalW || i.width || 1, s = C._logicalH || i.height || 1;
    return {
      x: t.width > 0 ? t.width / e : 1,
      y: t.height > 0 ? t.height / s : 1
    };
  }
  focus() {
    this._el.focus();
  }
  blur() {
    this._el.blur();
  }
  get hasFocus() {
    return document.activeElement === this._el;
  }
  /** 程序设置文本时同步到 DOM（若与当前值相同则跳过，避免光标跳动） */
  syncFromTarget() {
    this._el.value !== this._target.text && (this._el.value = this._target.text);
  }
  /**
   * 程序设置「真实值」时同步到 DOM（TextInput.text setter / drawTextFormat 使用）。
   * 与 syncFromTarget 的区别：密码模式下 textField.text 是掩码圆点串（仅显示层），
   * 绝不能回灌 DOM——DOM value 必须始终持有真实文本，否则键入值被圆点污染、
   * 光标排版也基于错误字符。真实值由组件直接经本方法写入。
   */
  setValue(t) {
    this._el.value !== t && (this._el.value = t);
  }
  set editable(t) {
    this._el.readOnly = !t;
  }
  set displayAsPassword(t) {
    this._el.type = t ? "password" : "text";
  }
  set maxChars(t) {
    t > 0 ? this._el.maxLength = t : this._el.removeAttribute("maxlength");
  }
  set enabled(t) {
    this._el.disabled = !t;
  }
  /** 输入光标颜色（fl caret 跟随文字色；TextFormat.color 为 0xRRGGBB） */
  setCaretColor(t) {
    this._el.style.caretColor = "#" + t.toString(16).padStart(6, "0");
  }
  /**
   * 同步 DOM 层的字体/字号/内边距，使其与 canvas 视觉层（TextField → Phaser Text）**逐像素一致**。
   *
   * 为什么必须做：DOM input 只负责键盘/IME/编辑，但**光标与选区由浏览器按 DOM 自身的字体排版绘制**。
   * 若 DOM 用浏览器默认字体（如 16px 系统字体）而 canvas 用 TextFormat 的字体（如 Arial 14px），
   * 同一串字符在两层宽度不同 → 光标落在错误位置、视觉上"压住文字"。
   * 因此必须把 TextFormat 的 font/size/bold/italic 与 textPadding/垂直居中偏移一并搬到 DOM。
   *
   * @param format   canvas 侧生效的 TextFormat（含 font/size/bold/italic/align）
   * @param pad      TextInput.textPadding（仅用于文档/调试，元素位置已由 syncLayout 计入该内边距，此处不再叠加）
   * @param textH    textField 高度（作为 DOM 元素高度，保证光标垂直居中）
   */
  syncTextStyle(t, i, e) {
    const s = (t == null ? void 0 : t.font) ?? "_sans", l = s === "_sans" ? "Arial, Helvetica, sans-serif" : s === "_serif" ? '"Times New Roman", serif' : s === "_typewriter" ? '"Courier New", monospace' : s, h = (t == null ? void 0 : t.size) ?? 10, n = (t == null ? void 0 : t.bold) === !0 ? "bold" : "normal", d = (t == null ? void 0 : t.italic) === !0 ? "italic" : "normal", a = C._canvas, u = a !== null ? a.getBoundingClientRect() : null, g = u !== null ? this._cssScale(u) : { x: 1, y: 1 }, S = `${d} ${n} ${h * g.x}px ${l}`, w = `${S}|${e * g.y}|${g.x}`;
    if (this._appliedFont === w)
      return;
    this._appliedFont = w;
    const O = this._el.style;
    O.font = S, O.lineHeight = `${Math.max(1, e * g.y)}px`, O.paddingLeft = `${2 * g.x}px`, O.textIndent = "0px";
  }
  /** 把隐藏元素叠到 target（textField）的 stage 位置（drawLayout/获得焦点时调用） */
  syncLayout() {
    const t = C._canvas;
    if (t === null)
      return;
    const i = this._target.toGlobal({ x: 0, y: 0 }), e = t.getBoundingClientRect(), s = this._cssScale(e);
    this._domLeft = e.left + window.scrollX + i.x * s.x, this._domTop = e.top + window.scrollY + i.y * s.y;
    const l = this._el.style;
    l.left = `${this._domLeft}px`, l.top = `${this._domTop}px`, l.width = `${Math.max(1, this._target.width * s.x)}px`, l.height = `${Math.max(1, this._target.height * s.y)}px`;
  }
  destroy() {
    this._el.removeEventListener("input", this.inputHandler), this._el.remove();
  }
};
C._canvas = null, C._logicalW = 0, C._logicalH = 0;
let Mt = C;
const ri = class ri extends Z {
  constructor() {
    super(...arguments), this.background = null, this.textField = null, this._adapter = null, this._text = "", this._html = !1, this._savedHTML = "", this._editable = !0, this._displayAsPassword = !1, this._maxChars = 0, this._restrict = "";
  }
  configUI() {
    super.configUI(), this.textField = new Bt(), this.addChild(this.textField), this._adapter = new Mt(this.textField, !1), this._adapter.onInput = (t) => {
      this._text = t, this.refreshDisplay(), this.dispatchEvent(new _(_.CHANGE, !0));
    }, this._adapter.onFocus = () => {
      var t;
      this.dispatchEvent(new B(B.FOCUS_IN)), (t = this.focusManager) == null || t.notifyFocus(this);
    }, this._adapter.onBlur = () => {
      this.dispatchEvent(new B(B.FOCUS_OUT));
    }, this._adapter.editable = this._editable, this._adapter.displayAsPassword = this._displayAsPassword, this._adapter.maxChars = this._maxChars, this._adapter.setValue(this._text), this.addEventListener(p.CLICK, () => {
      var t;
      this.enabled && ((t = this._adapter) == null || t.focus());
    });
  }
  // —— 文本属性 ——
  /**
   * fl 语义：displayAsPassword 只影响显示，text 属性返回真实文本。
   * 此前返回 textField.text（显示层），密码框会把掩码圆点串当值回给业务层
   * （登录会把 "•••" 当 token 发给服务器）。真实值权威存在 _text。
   */
  get text() {
    return this._text;
  }
  set text(t) {
    var i;
    this._text = t, this._html = !1, this.textField !== null && (this.refreshDisplay(), (i = this._adapter) == null || i.setValue(t)), this.invalidate(r.DATA);
  }
  /**
   * 按 displayAsPassword 刷新 canvas 显示层（textField 只是视觉镜像）。
   * 【光标压字根因】DOM input type=password 由浏览器按掩码圆点 "•" 排版光标，
   * 而 canvas 此前在程序设值/重绘路径显示原文（掩码只在键入时发生）——
   * "•"(≈4px) 比 "x"(≈6px) 窄，光标便落在原文右半部上。两层显示一致（同为掩码）
   * 之后，DOM 光标位置才与 canvas 文字逐像素对齐。
   */
  refreshDisplay() {
    this.textField !== null && (this.textField.text = this._displayAsPassword ? "•".repeat(this._text.length) : this._text);
  }
  /** htmlText 行为级简化：去标签按纯文本渲染 */
  get htmlText() {
    return this._savedHTML;
  }
  set htmlText(t) {
    this._savedHTML = t, this._html = !0, this.text = t.replace(/<[^>]*>/g, "");
  }
  get length() {
    return this.textField !== null ? this.textField.length : this._text.length;
  }
  get editable() {
    return this._editable;
  }
  set editable(t) {
    this._editable = t, this._adapter !== null && (this._adapter.editable = t);
  }
  get displayAsPassword() {
    return this._displayAsPassword;
  }
  set displayAsPassword(t) {
    this._displayAsPassword = t, this._adapter !== null && (this._adapter.displayAsPassword = t), this.refreshDisplay();
  }
  get maxChars() {
    return this._maxChars;
  }
  set maxChars(t) {
    this._maxChars = t, this._adapter !== null && (this._adapter.maxChars = t);
  }
  /** fl restrict：字符过滤模式，M3 仅存值（DOM 侧不做过滤） */
  get restrict() {
    return this._restrict;
  }
  set restrict(t) {
    this._restrict = t;
  }
  /** 覆写 setter 必须同时提供 getter（JS set-only accessor 读取返回 undefined） */
  get enabled() {
    return super.enabled;
  }
  set enabled(t) {
    super.enabled = t, this._adapter !== null && (this._adapter.enabled = t);
  }
  // —— 绘制 ——
  /** fl TextInput.setFocus：让隐藏 DOM input 获得焦点（onFocus → notifyFocus 回流） */
  setFocus() {
    var t;
    (t = this._adapter) == null || t.focus();
  }
  draw() {
    this.isInvalid(r.STATE, r.STYLES) && (this.drawBackground(), this.drawTextFormat(), this.invalidate(r.SIZE)), this.isInvalid(r.SIZE) && this.drawLayout(), super.draw();
  }
  /** fl drawBackground 重建：enabled 切换 upSkin/disabledSkin */
  drawBackground() {
    const t = this.getStyleValue(this.enabled ? "upSkin" : "disabledSkin") ?? null;
    t !== this.background && (this.background !== null && this.removeChild(this.background), t !== null && this.addChildAt(t, 0), this.background = t);
  }
  drawTextFormat() {
    var e, s;
    if (this.textField === null)
      return;
    const i = (!this.enabled && this.getStyleValue("disabledTextFormat") != null ? this.getStyleValue("disabledTextFormat") : this.getStyleValue("textFormat")) ?? new mt("_sans", 12, 0, !1, !1, !1, "", "", zt.LEFT);
    this.textField.defaultTextFormat = i, (e = this._adapter) == null || e.setCaretColor(i.color ?? 0), this._html ? this.textField.text = this._savedHTML.replace(/<[^>]*>/g, "") : this.refreshDisplay(), (s = this._adapter) == null || s.setValue(this._text);
  }
  drawLayout() {
    var e, s;
    if (this.textField === null)
      return;
    this.background !== null && (this.background.width = this._width, this.background.height = this._height);
    const t = this.getStyleValue("textPadding") ?? 5;
    this.textField.width = Math.max(1, this._width - t * 2), this.textField.height = this.textField.textHeight + 4, this.textField.position.set(t, Math.round((this._height - this.textField.height) / 2));
    const i = this.getStyleValue("textFormat");
    (e = this._adapter) == null || e.syncTextStyle(i, t, this.textField.height), (s = this._adapter) == null || s.syncLayout();
  }
};
ri.defaultStyles = {
  upSkin: null,
  disabledSkin: null,
  textFormat: null,
  disabledTextFormat: null,
  textPadding: 5
};
let Kt = ri;
const U = class U {
  constructor() {
  }
};
U.ADD = "add", U.REMOVE = "remove", U.REMOVE_ALL = "removeAll", U.CHANGE = "change", U.INVALIDATE = "invalidate", U.INVALIDATE_ALL = "invalidateAll", U.SORT = "sort", U.FILTER = "filter";
let x = U;
const ni = class ni extends ft {
  constructor() {
    super(), this._listData = null, this._data = null, this.toggle = !0, this.focusEnabled = !1;
  }
  get listData() {
    return this._listData;
  }
  set listData(t) {
    this._listData = t, this.label = t !== null ? t.label : "", this.invalidate(r.DATA);
  }
  get data() {
    return this._data;
  }
  set data(t) {
    t === null && this._data === void 0 || (this._data = t, this.invalidate(r.DATA));
  }
  drawLayout() {
    if (this.background !== null && (this.background.width = this._width, this.background.height = this._height), this.textField === null)
      return;
    const t = this.getStyleValue("textPadding") ?? 5;
    this.textField.visible = this.label.length > 0, this.textField.width = Math.max(1, this._width - t * 2), this.textField.height = this.textField.textHeight + 4, this.textField.position.set(t, Math.round(this._height - this.textField.height >> 1));
  }
};
ni.defaultStyles = {
  upSkin: null,
  overSkin: null,
  downSkin: null,
  disabledSkin: null,
  selectedUpSkin: null,
  selectedOverSkin: null,
  selectedDownSkin: null,
  selectedDisabledSkin: null,
  textPadding: 5,
  textFormat: null,
  disabledTextFormat: null
};
let jt = ni;
class Gt {
  constructor(t = "", i = null, e = null, s = 0, l = 0, h = 0) {
    this.label = t, this.icon = i, this.owner = e, this.index = s, this.row = l, this.column = h;
  }
  clone() {
    return new Gt(this.label, this.icon, this.owner, this.index, this.row, this.column);
  }
}
const Fi = 16;
class pt {
  constructor(t = null) {
    this._ed = new J(), this._ed.owner = this, t instanceof pt ? this._data = t.toArray() : Array.isArray(t) ? this._data = t.slice() : this._data = [];
  }
  get length() {
    return this._data.length;
  }
  toArray() {
    return this._data.slice();
  }
  clone() {
    return new pt(this._data.slice());
  }
  getItemAt(t) {
    if (t < 0 || t >= this._data.length)
      throw new RangeError(`DataProvider index out of bounds: ${t}`);
    return this._data[t];
  }
  getItemIndex(t) {
    return this._data.indexOf(t);
  }
  addItem(t) {
    this.addItemAt(t, this._data.length);
  }
  addItemAt(t, i) {
    const e = Math.max(0, Math.min(this._data.length, Math.round(i)));
    this._dispatchPre(x.ADD, e, e, [t]), this._data.splice(e, 0, t), this._dispatch(x.ADD, e, e, [t]);
  }
  addItems(t, i = !0) {
    const e = t instanceof pt ? t.toArray() : Array.isArray(t) ? t.slice() : [];
    if (i)
      for (const s of e)
        this.addItem(s);
    else
      for (let s = e.length - 1; s >= 0; s--)
        this.addItemAt(e[s], 0);
  }
  removeItemAt(t) {
    if (t < 0 || t >= this._data.length)
      throw new RangeError(`DataProvider index out of bounds: ${t}`);
    const i = this._data[t];
    return this._dispatchPre(x.REMOVE, t, t, [i]), this._data.splice(t, 1), this._dispatch(x.REMOVE, t, t, [i]), i;
  }
  removeItem(t) {
    const i = this.getItemIndex(t);
    i !== -1 && this.removeItemAt(i);
  }
  removeAll() {
    const t = this._data.slice(), i = Math.max(0, t.length - 1);
    this._dispatchPre(x.REMOVE_ALL, 0, i, t), this._data = [], this._dispatch(x.REMOVE_ALL, 0, i, t);
  }
  replaceItem(t, i) {
    const e = this.getItemIndex(i);
    e !== -1 && this.replaceItemAt(t, e);
  }
  replaceItemAt(t, i) {
    if (i < 0 || i >= this._data.length)
      return;
    const e = this._data[i];
    this._dispatchPre(x.CHANGE, i, i, [e]), this._data[i] = t, this._dispatch(x.CHANGE, i, i, [t]);
  }
  invalidateItemAt(t) {
    t < 0 || t >= this._data.length || this._dispatch(x.INVALIDATE, t, t, [this._data[t]]);
  }
  invalidateItem(t) {
    this.invalidateItemAt(this.getItemIndex(t));
  }
  invalidateAll() {
    this._dispatch(x.INVALIDATE_ALL, 0, Math.max(0, this._data.length - 1), []);
  }
  contains(t) {
    return this.getItemIndex(t) !== -1;
  }
  sort(t) {
    this._dispatchPre(x.SORT, 0, Math.max(0, this._data.length - 1), []), this._data.sort(t), this._dispatch(x.SORT, 0, Math.max(0, this._data.length - 1), []);
  }
  sortOn(t, i = null) {
    const e = Array.isArray(t) ? t : [t], s = typeof i == "number" && (i & Fi) !== 0;
    this._dispatchPre(x.SORT, 0, Math.max(0, this._data.length - 1), []), this._data.sort((l, h) => {
      for (const n of e) {
        const d = l == null ? void 0 : l[n], a = h == null ? void 0 : h[n], u = Number(d), g = Number(a);
        if (s && !Number.isNaN(u) && !Number.isNaN(g)) {
          if (u !== g)
            return u - g;
        } else {
          const S = String(d ?? ""), w = String(a ?? "");
          if (S !== w)
            return S < w ? -1 : 1;
        }
      }
      return 0;
    }), this._dispatch(x.SORT, 0, Math.max(0, this._data.length - 1), []);
  }
  // —— 事件 API（AS3 中 DataProvider 即 EventDispatcher，此处组合） ——
  /** fl DataProvider 内部派发（PRE_DATA_CHANGE / DATA_CHANGE） */
  _dispatchPre(t, i, e, s) {
    this._ed.dispatchEvent(new V(V.PRE_DATA_CHANGE, !1, !1, t, i, e, s));
  }
  _dispatch(t, i, e, s) {
    this._ed.dispatchEvent(new V(V.DATA_CHANGE, !1, !1, t, i, e, s));
  }
  dispatchEvent(t) {
    return t.target = null, this._ed.dispatchEvent(t);
  }
  addEventListener(t, i, e = !1, s = 0) {
    this._ed.addEventListener(t, i, e, s);
  }
  removeEventListener(t, i, e = !1) {
    this._ed.removeEventListener(t, i, e);
  }
  hasEventListener(t) {
    return this._ed.hasEventListener(t);
  }
}
const ai = class ai extends Ft {
  constructor() {
    super(...arguments), this._dataProvider = null, this._selectedIndices = [], this._allowMultipleSelection = !1, this._rowCount = 0, this._maxCellWidth = 0, this.activeCellRenderers = [], this.availableCellRenderers = [], this.dataChangeHandler = (t) => {
      const i = t.changeType;
      if (i === x.INVALIDATE) {
        this.invalidateItem(t.items[0]);
        return;
      }
      if (i === x.INVALIDATE_ALL) {
        this.invalidateList();
        return;
      }
      if (i === x.ADD) {
        const e = t.endIndex - t.startIndex + 1;
        this._selectedIndices = this._selectedIndices.map((s) => s >= t.startIndex ? s + e : s);
      } else if (i === x.REMOVE) {
        const e = t.endIndex - t.startIndex + 1, s = [];
        for (const l of this._selectedIndices)
          l < t.startIndex ? s.push(l) : l > t.endIndex && s.push(l - e);
        this._selectedIndices = s;
      } else
        i === x.REMOVE_ALL && (this._selectedIndices = []);
      this._selectedIndices = this._selectedIndices.filter((e) => e >= 0 && e < this._dataProvider.length), this.invalidateList();
    }, this.cellRendererClickHandler = (t) => {
      const i = t.currentTarget;
      if (i.listData === null)
        return;
      const e = i.listData.index;
      if (this._allowMultipleSelection) {
        const l = this._selectedIndices.indexOf(e);
        l === -1 ? this._selectedIndices.push(e) : this._selectedIndices.splice(l, 1), this._selectedIndices.sort((h, n) => h - n), this.invalidate(r.SELECTED_INDEX);
      } else
        this.selectedIndex = e;
      const s = this._dataProvider.length > e ? this._dataProvider.getItemAt(e) : null;
      this.dispatchEvent(new H(H.ITEM_CLICK, !0, !1, 0, e, e, s)), this.dispatchEvent(new _(_.CHANGE, !0));
    }, this.cellRendererRollOverHandler = (t) => {
      const i = t.currentTarget;
      if (i.listData === null)
        return;
      const e = i.listData.index, s = this._dataProvider.length > e ? this._dataProvider.getItemAt(e) : null;
      this.dispatchEvent(new H(H.ITEM_ROLL_OVER, !0, !1, 0, e, e, s));
    }, this.cellRendererRollOutHandler = (t) => {
      const i = t.currentTarget;
      if (i.listData === null)
        return;
      const e = i.listData.index, s = this._dataProvider.length > e ? this._dataProvider.getItemAt(e) : null;
      this.dispatchEvent(new H(H.ITEM_ROLL_OUT, !0, !1, 0, e, e, s));
    }, this.keyDownListener = (t) => {
      t instanceof wt && this.keyDownHandler(t);
    }, this._highlightedRenderer = null, this.mouseWheelHandler = (t) => {
      if (this.maxVerticalScrollPosition <= 0)
        return;
      const i = -t.delta;
      this.verticalScrollPosition = Math.max(0, Math.min(this.maxVerticalScrollPosition, this._verticalScrollPosition + i)), t.preventDefault();
    };
  }
  configUI() {
    super.configUI(), this.focusEnabled = !0, this._dataProvider ?? (this._dataProvider = new pt()), this._dataProvider.addEventListener(V.DATA_CHANGE, this.dataChangeHandler), this.addEventListener(p.MOUSE_WHEEL, this.mouseWheelHandler), this.addEventListener(wt.KEY_DOWN, this.keyDownListener);
  }
  // —— 数据源 ——
  get dataProvider() {
    return this._dataProvider;
  }
  set dataProvider(t) {
    this._dataProvider !== null && this._dataProvider !== void 0 && this._dataProvider.removeEventListener(V.DATA_CHANGE, this.dataChangeHandler), this._dataProvider = t, this._dataProvider.addEventListener(V.DATA_CHANGE, this.dataChangeHandler), this._selectedIndices = [], this.invalidate(r.DATA, r.RENDERERS);
  }
  invalidateList() {
    this.invalidate(r.DATA, r.RENDERERS);
  }
  invalidateItem(t) {
    this.invalidateList();
  }
  invalidateItemAt(t) {
    this.invalidateList();
  }
  // —— 选中模型 ——
  get allowMultipleSelection() {
    return this._allowMultipleSelection;
  }
  set allowMultipleSelection(t) {
    this._allowMultipleSelection = t;
  }
  get selectedIndex() {
    return this._selectedIndices.length > 0 ? this._selectedIndices[0] : -1;
  }
  set selectedIndex(t) {
    const i = Math.max(-1, Math.min(this._dataProvider.length - 1, t));
    this._selectedIndices = i === -1 ? [] : [i], this.invalidate(r.SELECTED_INDEX);
  }
  get selectedIndices() {
    return this._selectedIndices.slice();
  }
  set selectedIndices(t) {
    this._selectedIndices = (t ?? []).filter((i) => i >= 0 && i < this._dataProvider.length), this.invalidate(r.SELECTED_INDEX);
  }
  get selectedItem() {
    const t = this.selectedIndex;
    return t >= 0 ? this._dataProvider.getItemAt(t) : null;
  }
  set selectedItem(t) {
    this.selectedIndex = this._dataProvider.getItemIndex(t);
  }
  get selectedItems() {
    return this._selectedIndices.map((t) => this._dataProvider.getItemAt(t));
  }
  set selectedItems(t) {
    this.selectedIndices = (t ?? []).map((i) => this._dataProvider.getItemIndex(i));
  }
  clearSelection() {
    this.selectedIndex = -1;
  }
  // —— 行几何 ——
  get rowCount() {
    return this._rowCount > 0 ? this._rowCount : Math.max(1, Math.ceil(this._availableHeight / this.rowHeight));
  }
  set rowCount(t) {
    this._rowCount = Math.max(0, Math.round(t)), this.invalidate(r.SIZE);
  }
  /** 行高：借用池内渲染器量高（见类注释；结果受 LiquidButton 皮肤 min 钳制） */
  get rowHeight() {
    const t = this.obtainRenderer(), i = this._availableWidth > 0 ? this._availableWidth : 100;
    t.setSize(i, 0), t.validateNow();
    const e = t.height;
    return this.recycleRenderer(t), Math.max(e, 20);
  }
  scrollToIndex(t) {
    const i = this.rowCount, e = this._verticalScrollPosition + i - 1;
    t < this._verticalScrollPosition ? this.verticalScrollPosition = t : t > e && (this.verticalScrollPosition = t - i + 1);
  }
  // —— 标签解析（List 覆写支持 labelField/labelFunction） ——
  itemToLabel(t) {
    if (t == null)
      return "";
    if (typeof t == "string")
      return t;
    const i = t.label;
    return i != null ? String(i) : String(t);
  }
  sortItems(t) {
    this._dataProvider.sort(t);
  }
  sortItemsOn(t, i = null) {
    this._dataProvider.sortOn(t, i);
  }
  // —— 渲染器池 ——
  createListData(t, i, e) {
    return new Gt(this.itemToLabel(t), this.getStyleValue("icon"), this, i, e, 0);
  }
  obtainRenderer() {
    const t = this.availableCellRenderers.pop();
    if (t !== void 0)
      return t;
    const i = this.getStyleValue("cellRenderer"), e = new i(), s = e;
    return s.setScrollFactor(0, 0, !0), s.addEventListener(p.CLICK, this.cellRendererClickHandler), s.addEventListener(p.ROLL_OVER, this.cellRendererRollOverHandler), s.addEventListener(p.ROLL_OUT, this.cellRendererRollOutHandler), e;
  }
  recycleRenderer(t) {
    const i = t;
    i.parent !== null && i.parent.removeChild(i), i.visible = !1, this.availableCellRenderers.push(t);
  }
  /** drawList：按滚动首行重建可见渲染器集合（LiquidList 覆写其前后挂钩渲染器皮肤） */
  drawList() {
    const t = this._dataProvider.length, i = this.rowHeight, e = this.rowCount, s = Math.max(0, Math.min(Math.round(this._verticalScrollPosition), Math.max(0, t - e))), l = [];
    for (const n of this.activeCellRenderers) {
      const d = n.listData;
      d !== null && d.index >= s && d.index < s + e && d.index < t ? l.push(n) : this.recycleRenderer(n);
    }
    this.activeCellRenderers = l;
    let h = 0;
    for (let n = 0; n < e; n++) {
      const d = s + n;
      if (d >= t)
        break;
      let a = this.activeCellRenderers.find((S) => S.listData !== null && S.listData.index === d);
      if (a === void 0) {
        a = this.obtainRenderer(), this.activeCellRenderers.push(a);
        const S = a;
        S.visible = !0, this.content.addChild(S);
      }
      const u = this._dataProvider.getItemAt(d);
      a.data = u, a.listData = this.createListData(u, d, n), a.selected = this._selectedIndices.includes(d);
      const g = a;
      g.setSize(this._availableWidth > 0 ? this._availableWidth : 100, i), g.move(0, n * i), g.validateNow(), h = Math.max(h, this.measureCellWidth(a));
    }
    this._maxCellWidth = h, this._verticalScrollPosition = s, this._verticalScrollBar.setScrollProperties(e, 0, Math.max(0, t - e)), this._verticalScrollBar.scrollPosition = s, this._verticalScrollBar.visible = this._verticalScrollPolicy === "on" || this._verticalScrollPolicy === "auto" && t > e, this._horizontalScrollBar.setScrollProperties(this._availableWidth, 0, Math.max(0, h - this._availableWidth)), this._horizontalScrollBar.visible = this._horizontalScrollPolicy === "on" || this._horizontalScrollPolicy === "auto" && h > this._availableWidth;
  }
  /** 单元格文本宽度（含内边距），供水平滚动度量；非文本渲染器记 0 */
  measureCellWidth(t) {
    const e = t.textField;
    if (e == null)
      return 0;
    const s = this.getStyleValue("textPadding") ?? 5;
    return e.textWidth + s * 2;
  }
  /** fl SelectableList.drawBackground：列表背景取 "skin" 样式（区别于 BaseScrollPane
   * 的 upSkin/disabledSkin），禁用时按 disabledAlpha 变暗（fl 公开样式语义） */
  drawBackground() {
    const t = this.getStyleValue("skin") ?? null;
    t !== this.background && (this.background !== null && this.removeChild(this.background), t !== null && this.addChildAt(t, 0), this.background = t), this.background !== null && (this.background.width = this._width, this.background.height = this._height, this.background.alpha = this.enabled ? 1 : this.getStyleValue("disabledAlpha") ?? 0.5);
  }
  drawScrollContent() {
    this.isInvalid(r.SIZE, r.STYLES, r.STATE, r.DATA, r.RENDERERS, r.SELECTED_INDEX, r.SCROLL) && this.drawList();
  }
  /** SelectableList 垂直滚动为行单位：content 不做 y 偏移（单元格按行重摆） */
  applyContentOffset() {
    const t = this.contentPadding;
    this.content.position.set(t - this._horizontalScrollPosition, t);
  }
  /** 高亮单元格：键盘导航的 over 态呈现（fl setMouseState 语义；ComboBox 调用） */
  highlightCell(t = -1) {
    if (this._highlightedRenderer !== null && (this._highlightedRenderer.mouseState = "up", this._highlightedRenderer = null), t < 0)
      return;
    const i = this.activeCellRenderers.find((e) => e.listData !== null && e.listData.index === t);
    i !== void 0 && (i.mouseState = "over", this._highlightedRenderer = i);
  }
  /** fl keyDownHandler（经 FocusManager KEY_DOWN 转发触发；行单位导航） */
  keyDownHandler(t) {
    const i = this._dataProvider.length;
    if (i === 0)
      return;
    const e = i - 1, s = this.selectedIndex;
    let l = s;
    switch (t.keyCode) {
      case A.UP:
        l = Math.max(0, s - 1);
        break;
      case A.DOWN:
        l = Math.min(e, s + 1);
        break;
      case A.HOME:
        l = 0;
        break;
      case A.END:
        l = e;
        break;
      case A.PAGE_UP:
        l = Math.max(0, s - this.rowCount);
        break;
      case A.PAGE_DOWN:
        l = Math.min(e, s + this.rowCount);
        break;
      default:
        return;
    }
    l !== s && (this.selectedIndex = l, this.dispatchEvent(new _(_.CHANGE, !0))), this.scrollToIndex(l);
  }
};
ai.defaultStyles = {
  skin: null,
  cellRenderer: jt,
  contentPadding: null,
  disabledAlpha: null
};
let Jt = ai;
class zi extends Jt {
  constructor() {
    super(...arguments), this.labelField = "label", this.labelFunction = null, this.iconField = "icon", this.iconFunction = null;
  }
  /** fl List.itemToLabel：labelFunction → item[labelField] → String(item) */
  itemToLabel(t) {
    if (t == null)
      return "";
    if (this.labelFunction !== null)
      return String(this.labelFunction(t));
    if (typeof t == "string")
      return t;
    const i = t[this.labelField];
    return i != null ? String(i) : String(t);
  }
  /** fl List 渲染器元数据：icon 按 iconField/iconFunction 解析 */
  createListData(t, i, e) {
    let s = null;
    return this.iconFunction !== null ? s = this.iconFunction(t) : t != null && (s = t[this.iconField] ?? null), s === void 0 && (s = null), new Gt(this.itemToLabel(t), s, this, i, e, 0);
  }
}
const st = class st extends Z {
  constructor() {
    super(...arguments), this.background = null, this.inputField = null, this._list = null, this._dataProvider = new pt(), this._isOpen = !1, this._editable = !1, this._prompt = null, this._rowCount = 5, this._dropdownWidth = NaN, this._highlightedIndex = -1, this._labelField = "label", this._labelFunction = null, this.keyDownListener = (t) => {
      t instanceof wt && this.keyDownHandler(t);
    }, this.onToggleListVisibility = (t) => {
      this._isOpen ? this.close() : this.open();
    }, this.onListChange = (t) => {
      this._list !== null && (this.selectedIndex = this._list.selectedIndex, this.dispatchEvent(new _(_.CHANGE, !0)), this.close());
    }, this.passEvent = (t) => {
      t.target = null, this.dispatchEvent(t);
    };
  }
  configUI() {
    super.configUI(), this.background = new ht(), this.background.focusEnabled = !1, this.copyStylesToChild(this.background, st.BACKGROUND_STYLES), this.background.addEventListener(p.MOUSE_DOWN, this.onToggleListVisibility), this.addChild(this.background), this._list = new zi(), this._list.focusEnabled = !1, this.copyStylesToChild(this._list, st.LIST_STYLES), this._list.dataProvider = this._dataProvider, this._list.addEventListener(_.CHANGE, this.onListChange), this._list.addEventListener(H.ITEM_CLICK, this.passEvent), this._list.addEventListener(H.ITEM_ROLL_OUT, this.passEvent), this._list.addEventListener(H.ITEM_ROLL_OVER, this.passEvent), this._list.addEventListener(V.DATA_CHANGE, this.passEvent), this.inputField = new Kt(), this.inputField.focusEnabled = !1, this.addChild(this.inputField), this.addEventListener(wt.KEY_DOWN, this.keyDownListener);
  }
  // —— 数据 ——
  get dataProvider() {
    return this._dataProvider;
  }
  set dataProvider(t) {
    this._dataProvider = t, this._list !== null && (this._list.dataProvider = t), this.invalidate(r.DATA, r.RENDERERS);
  }
  get labelField() {
    return this._labelField;
  }
  set labelField(t) {
    this._labelField = t, this._list !== null && (this._list.labelField = t), this.invalidate(r.DATA);
  }
  get labelFunction() {
    return this._labelFunction;
  }
  set labelFunction(t) {
    this._labelFunction = t, this._list !== null && (this._list.labelFunction = t), this.invalidate(r.DATA);
  }
  /** fl ComboBox.itemToLabel：labelFunction → item[labelField] */
  itemToLabel(t) {
    if (t == null)
      return "";
    if (this._labelFunction !== null)
      return String(this._labelFunction(t));
    const i = t[this._labelField];
    return i != null ? String(i) : String(t);
  }
  // —— 选中 ——
  get selectedIndex() {
    return this._list !== null ? this._list.selectedIndex : -1;
  }
  set selectedIndex(t) {
    this._list !== null && (this._list.selectedIndex = t), this.invalidate(r.SELECTED_INDEX, r.DATA);
  }
  get selectedItem() {
    return this._list !== null ? this._list.selectedItem : null;
  }
  set selectedItem(t) {
    this._list !== null && (this._list.selectedItem = t), this.invalidate(r.SELECTED_INDEX, r.DATA);
  }
  /** fl selectedLabel：无选中时回退 prompt */
  get selectedLabel() {
    return this.selectedIndex < 0 ? this._prompt ?? "" : this.itemToLabel(this.selectedItem);
  }
  // —— 属性 ——
  get dropdown() {
    return this._list;
  }
  get isOpen() {
    return this._isOpen;
  }
  /** fl L602-604：textField 是公开 getter，返回 inputField（TextInput）——fl 无独立
   * _textField 字段，选中文本在所有模式下都由 inputField 显示 */
  get textField() {
    return this.inputField;
  }
  get editable() {
    return this._editable;
  }
  set editable(t) {
    this._editable = t, this.invalidate(r.STYLES);
  }
  get prompt() {
    return this._prompt;
  }
  set prompt(t) {
    this._prompt = t, this.invalidate(r.DATA);
  }
  get rowCount() {
    return this._rowCount;
  }
  set rowCount(t) {
    this._rowCount = Math.max(1, Math.round(t)), this.invalidate(r.SIZE);
  }
  /** fl 真版 getter 返回 list.width（未设置 dropdownWidth 时反映实际下拉宽度） */
  get dropdownWidth() {
    return this._list !== null ? this._list.width : this._dropdownWidth;
  }
  set dropdownWidth(t) {
    this._dropdownWidth = t, this.invalidate(r.SIZE);
  }
  /** fl L417-419：text 委托 inputField.text */
  get text() {
    return this.inputField !== null ? this.inputField.text : "";
  }
  /** fl L133-138：非编辑模式 set text 是 no-op */
  set text(t) {
    this._editable && this.inputField !== null && (this.inputField.text = t);
  }
  // —— 开合 ——
  open() {
    if (this._list === null || this._isOpen)
      return;
    this._isOpen = !0, this.positionList(), this._list.visible = !0;
    const t = this.stage;
    t !== null && t.addChild(this._list), this.highlightCell(this._list.selectedIndex), this.dispatchEvent(new _(_.OPEN, !1));
  }
  close() {
    if (!this._isOpen)
      return;
    this._isOpen = !1;
    const t = this.stage;
    t !== null && t.contains(this._list) && t.removeChildSafe(this._list), this.highlightCell(), this.dispatchEvent(new _(_.CLOSE, !1));
  }
  /** 下拉位置（全局坐标，默认在按钮下方、越界时上翻；Liquid 覆写） */
  positionList() {
    if (this._list === null || this.stage === null)
      return;
    const t = this.toGlobal({ x: 0, y: 0 });
    this._list.x = Math.floor(t.x), t.y + this._height + this._list.height > this.stage.stageHeight ? this._list.y = Math.floor(t.y - this._list.height) : this._list.y = Math.floor(t.y + this._height);
  }
  /** 高亮单元格：键盘导航时在 _list 渲染器上呈现 over 态（fl 行为级重建） */
  highlightCell(t = -1) {
    this._list !== null && this._list.highlightCell(t), this._highlightedIndex = t;
  }
  get highlightedIndex() {
    return this._highlightedIndex;
  }
  // —— 绘制 ——
  draw() {
    this.isInvalid(r.STYLES, r.STATE) && this.drawTextFormat(), this.isInvalid(r.SIZE, r.STYLES, r.STATE, r.DATA) && this.drawLayout(), this.isInvalid(r.DATA, r.SELECTED_INDEX) && this.drawTextField(), super.draw();
  }
  /** fl drawTextFormat L613-621：inputField.textField 应用 textFormat/disabledTextFormat
   * （Liquid 覆写） */
  drawTextFormat() {
    if (this.inputField === null || this.inputField.textField === null)
      return;
    let t = this.getStyleValue(this._enabled ? "textFormat" : "disabledTextFormat");
    t === null && (t = new mt()), this.inputField.textField.defaultTextFormat = t, this.inputField.textField.setTextFormat(t);
  }
  /** fl drawLayout L577-588 逐项对照：inputField 在所有模式下可见（选中文本由它
   * 承载，fl 无 textField 显隐切换），几何为 x=y=textPadding、
   * setSize(width-buttonWidth-textPadding, height-textPadding) */
  drawLayout() {
    const t = this.getStyleValue("buttonWidth") ?? 24, i = this.getStyleValue("textPadding") ?? 3;
    this.background !== null && (this.background.setSize(this._width, this._height), this.background.enabled = this._enabled), this.inputField !== null && (this.inputField.position.set(i, i), this.inputField.setSize(Math.max(1, this._width - t - i), Math.max(1, this._height - i))), this._list !== null && (this._list.rowCount = this._rowCount, this._list.setSize(isNaN(this._dropdownWidth) ? this._width : this._dropdownWidth, this._rowCount * this._list.rowHeight));
  }
  /** fl 语义合并：draw() SELECTED 分支写 inputField.text（选中→itemToLabel；
   * 无选中→prompt 或空串）+ fl drawTextField L358-373 配置 inputField。
   * LiquidComboBox 覆写本方法接 updateIcon。
   * 注意：fl setStyle("upSkin","") 在 TS 侧置 null（"" 是真值会走 DisplayObject
   * 分支）；selectable 为 flash.text.TextField 属性，shim 无对应跳过 */
  drawTextField() {
    this.inputField !== null && (this.inputField.setStyle("upSkin", null), this.inputField.setStyle("disabledSkin", null), this.inputField.enabled = this._enabled, this.inputField.editable = this._editable, this.inputField.eventMode = this._enabled && this._editable ? "static" : "passive", this.inputField.focusEnabled = !1, this.inputField.text = this.selectedIndex >= 0 ? this.itemToLabel(this.selectedItem) : this._prompt ?? "");
  }
  // —— 键盘 ——
  keyDownHandler(t) {
    if (!this._enabled || this._list === null)
      return;
    const i = this._list.dataProvider.length;
    if (i !== 0)
      switch (t.keyCode) {
        case A.DOWN:
          this._isOpen ? (this.highlightCell(Math.min(i - 1, this._highlightedIndex + 1)), this.scrollToHighlighted()) : this.open();
          break;
        case A.UP:
          this._isOpen && (this.highlightCell(Math.max(0, this._highlightedIndex - 1)), this.scrollToHighlighted());
          break;
        case A.HOME:
          this._isOpen && (this.highlightCell(0), this.scrollToHighlighted());
          break;
        case A.END:
          this._isOpen && (this.highlightCell(i - 1), this.scrollToHighlighted());
          break;
        case A.ENTER:
          this._isOpen && this._highlightedIndex >= 0 && (this.selectedIndex = this._highlightedIndex, this.dispatchEvent(new _(_.CHANGE, !0)), this.close());
          break;
        case A.ESCAPE:
          this._isOpen && this.close();
          break;
      }
  }
  scrollToHighlighted() {
    var t;
    if (this._highlightedIndex >= 0) {
      (t = this._list) == null || t.scrollToIndex(this._highlightedIndex);
      const i = this._list !== null ? this._list.dataProvider.getItemAt(this._highlightedIndex) : null;
      this.inputField !== null && i !== null && i !== void 0 && (this.inputField.text = this.itemToLabel(i));
    }
  }
};
st.defaultStyles = {
  upSkin: null,
  downSkin: null,
  overSkin: null,
  disabledSkin: null,
  focusRectSkin: null,
  focusRectPadding: null,
  textFormat: null,
  disabledTextFormat: null,
  textPadding: 3,
  buttonWidth: 24,
  disabledAlpha: null,
  listSkin: null
}, st.BACKGROUND_STYLES = {
  overSkin: "overSkin",
  downSkin: "downSkin",
  upSkin: "upSkin",
  disabledSkin: "disabledSkin",
  repeatInterval: "repeatInterval"
}, st.LIST_STYLES = {
  upSkin: "comboListUpSkin",
  overSkin: "comboListOverSkin",
  downSkin: "comobListDownSkin",
  disabledSkin: "comboListDisabledSkin",
  downArrowDisabledSkin: "downArrowDisabledSkin",
  downArrowDownSkin: "downArrowDownSkin",
  downArrowOverSkin: "downArrowOverSkin",
  downArrowUpSkin: "downArrowUpSkin",
  upArrowDisabledSkin: "upArrowDisabledSkin",
  upArrowDownSkin: "upArrowDownSkin",
  upArrowOverSkin: "upArrowOverSkin",
  upArrowUpSkin: "upArrowUpSkin",
  thumbDisabledSkin: "thumbDisabledSkin",
  thumbDownSkin: "thumbDownSkin",
  thumbOverSkin: "thumbOverSkin",
  thumbUpSkin: "thumbUpSkin",
  thumbIcon: "thumbIcon",
  trackDisabledSkin: "trackDisabledSkin",
  trackDownSkin: "trackDownSkin",
  trackOverSkin: "trackOverSkin",
  trackUpSkin: "trackUpSkin",
  repeatDelay: "repeatDelay",
  repeatInterval: "repeatInterval",
  textFormat: "textFormat",
  disabledAlpha: "disabledAlpha",
  skin: "listSkin"
};
let mi = st;
const oi = class oi extends Z {
  constructor() {
    super(...arguments), this.textField = null, this.actualWidth = 0, this._text = "", this._autoSize = K.NONE, this._wordWrap = !1;
  }
  configUI() {
    super.configUI(), this.textField = new Bt(), this.textField.autoSize = this._autoSize, this.textField.wordWrap = this._wordWrap, this.textField.text = this._text, this.addChild(this.textField);
  }
  get text() {
    return this._text;
  }
  set text(t) {
    this._text !== t && (this._text = t, this.textField !== null && (this.textField.text = t), this.invalidate(r.DATA));
  }
  get autoSize() {
    return this._autoSize;
  }
  set autoSize(t) {
    this._autoSize !== t && (this._autoSize = t, this.textField !== null && (this.textField.autoSize = t), this.invalidate(r.SIZE));
  }
  get wordWrap() {
    return this._wordWrap;
  }
  set wordWrap(t) {
    this._wordWrap !== t && (this._wordWrap = t, this.textField !== null && (this.textField.wordWrap = t), this.invalidate(r.SIZE));
  }
  draw() {
    this.isInvalid(r.SIZE, r.STYLES, r.DATA) && this.drawTextFormat(), this.isInvalid(r.SIZE, r.STYLES, r.DATA) && this.drawLayout(), super.draw();
  }
  drawTextFormat() {
    if (this.textField === null)
      return;
    const t = !this.enabled && this.getStyleValue("disabledTextFormat") != null ? this.getStyleValue("disabledTextFormat") : this.getStyleValue("textFormat");
    this.textField.defaultTextFormat = t ?? new mt("_sans", 10, 0);
  }
  drawLayout() {
    this.textField !== null && (this._autoSize === K.NONE ? (this.textField.width = this._width, this.textField.height = this._height, this.actualWidth = this._width) : (this.setSize(this.textField.width, this.textField.height), this.actualWidth = this._width));
  }
};
oi.defaultStyles = {
  textFormat: null,
  disabledTextFormat: null,
  embedFonts: !1
};
let xi = oi;
const _t = class _t extends J {
  constructor(t) {
    super(), this._radios = [], this._selection = null, this._name = t;
  }
  static getGroup(t) {
    let i = _t.groups.get(t);
    return i || (i = new _t(t), _t.groups.set(t, i)), i;
  }
  get name() {
    return this._name;
  }
  get selection() {
    return this._selection;
  }
  set selection(t) {
    if (this._selection === t)
      return;
    const i = this._selection;
    this._selection = t, i !== null && i !== t && (i.selected = !1), t !== null && (t.selected = !0), this.dispatchEvent(new _(_.CHANGE, !0));
  }
  get selectedData() {
    return this._selection !== null ? this._selection.value : null;
  }
  get radioButtons() {
    return this._radios.slice();
  }
  addInstance(t) {
    this._radios.indexOf(t) === -1 && this._radios.push(t);
  }
  removeInstance(t) {
    const i = this._radios.indexOf(t);
    i !== -1 && this._radios.splice(i, 1), this._selection === t && (this._selection = null);
  }
};
_t.groups = /* @__PURE__ */ new Map();
let qt = _t;
class Bi extends Di {
  constructor() {
    super(...arguments), this._value = null, this._group = null;
  }
  configUI() {
    super.configUI(), this._group === null && (this.groupName = "RadioButtonGroup");
  }
  get groupName() {
    return this._group !== null ? this._group.name : "";
  }
  set groupName(t) {
    this._group !== null && (this._group.removeInstance(this), this._group.selection === this && (this._group.selection = null)), this._group = qt.getGroup(t), this._group.addInstance(this), this._selected && (this._group.selection = this);
  }
  get group() {
    return this._group;
  }
  set group(t) {
    this._group !== null && this._group.removeInstance(this), this._group = t, this._group.addInstance(this), this._selected && (this._group.selection = this);
  }
  get value() {
    return this._value;
  }
  set value(t) {
    this._value !== t && (this._value = t, this.invalidate(r.DATA));
  }
  get selected() {
    return this._selected;
  }
  set selected(t) {
    this._selected !== t && (this._selected = t, this.invalidate(r.STATE), t && this._group !== null ? this._group.selection = this : !t && this._group !== null && this._group.selection === this && (this._group.selection = null));
  }
  /** 单选钮点击不可取消选中 */
  toggleSelected() {
    this.enabled && (this.selected || (this.selected = !0));
  }
}
class bi extends b {
  constructor() {
    super(...arguments), this._scrollTarget = null, this.handleTargetScroll = (t) => {
      this.updateScrollTargetProperties();
    };
  }
  get scrollTarget() {
    return this._scrollTarget;
  }
  set scrollTarget(t) {
    this._scrollTarget !== null && this._scrollTarget.removeEventListener(_.SCROLL, this.handleTargetScroll), this._scrollTarget = t, this._scrollTarget !== null && (this._scrollTarget.addEventListener(_.SCROLL, this.handleTargetScroll), this.updateScrollTargetProperties());
  }
  /** 覆写访问器必须同时提供 getter：JS 子类 set-only accessor 读取会返回 undefined（不回落父类 getter） */
  get direction() {
    return super.direction;
  }
  set direction(t) {
    super.direction = t, this.updateScrollTargetProperties();
  }
  /** 同上：仅覆写 setter 时，本类实例读 scrollPosition 得 undefined → NaN → 同步死循环 */
  get scrollPosition() {
    return super.scrollPosition;
  }
  set scrollPosition(t) {
    super.scrollPosition = t, this.updateScrollTarget();
  }
  /** 内部位置变更（拖拽/箭头/轨道）同样要推给 target */
  setScrollPosition(t, i) {
    super.setScrollPosition(t, i), i && this.updateScrollTarget();
  }
  /** 把滚动条位置推给 target */
  updateScrollTarget() {
    this._scrollTarget !== null && (this._direction === P.VERTICAL ? this._scrollTarget.scrollV = this.scrollPosition : this._scrollTarget.scrollH = this.scrollPosition);
  }
  updateScrollTargetProperties() {
    const t = this._scrollTarget;
    if (t === null) {
      this.setScrollProperties(this.pageSize, 0, 0), this.scrollPosition = 0;
      return;
    }
    this._direction === P.HORIZONTAL ? (this.setScrollProperties(t.width, 0, t.maxScrollH), this.scrollPosition = t.scrollH) : (this.setScrollProperties(t.height, 1, t.maxScrollV), this.scrollPosition = t.scrollV);
  }
}
const gt = class gt extends Z {
  constructor() {
    super(...arguments), this.background = null, this.textField = null, this._verticalScrollBar = null, this._horizontalScrollBar = null, this._adapter = null, this._text = "", this._html = !1, this._savedHTML = "", this._editable = !0, this._displayAsPassword = !1, this._maxChars = 0, this._restrict = "", this._multiline = !0, this._wordWrap = !0, this.handleScroll = (t) => {
      this.invalidate(r.DATA);
    };
  }
  configUI() {
    super.configUI(), this.textField = new Bt(), this.textField.wordWrap = this._wordWrap, this.addChild(this.textField), this._verticalScrollBar = new bi(), this._verticalScrollBar.name = "V", this._verticalScrollBar.visible = !1, this._verticalScrollBar.focusEnabled = !1, this.copyStylesToChild(this._verticalScrollBar, gt.SCROLL_BAR_STYLES), this._verticalScrollBar.addEventListener(j.SCROLL, this.handleScroll), this.addChild(this._verticalScrollBar), this._horizontalScrollBar = new bi(), this._horizontalScrollBar.name = "H", this._horizontalScrollBar.visible = !1, this._horizontalScrollBar.focusEnabled = !1, this._horizontalScrollBar.direction = P.HORIZONTAL, this.copyStylesToChild(this._horizontalScrollBar, gt.SCROLL_BAR_STYLES), this._horizontalScrollBar.addEventListener(j.SCROLL, this.handleScroll), this.addChild(this._horizontalScrollBar), this._horizontalScrollBar.scrollTarget = this.textField, this._verticalScrollBar.scrollTarget = this.textField, this._adapter = new Mt(this.textField, !0), this._adapter.onInput = (t) => {
      this._text = t, this.dispatchEvent(new _(_.CHANGE, !0));
    }, this._adapter.onFocus = () => {
      var t;
      this.dispatchEvent(new B(B.FOCUS_IN)), (t = this.focusManager) == null || t.notifyFocus(this);
    }, this._adapter.onBlur = () => {
      this.dispatchEvent(new B(B.FOCUS_OUT));
    }, this._adapter.editable = this._editable, this._adapter.maxChars = this._maxChars, this._adapter.syncFromTarget(), this.addEventListener(p.CLICK, () => {
      var t;
      this.enabled && ((t = this._adapter) == null || t.focus());
    }), this.addEventListener(p.MOUSE_WHEEL, (t) => {
      !this.enabled || this.textField === null || (t.delta !== 0 && (this.textField.scrollV += t.delta > 0 ? -3 : 3), t.deltaX !== 0 && (this.textField.scrollH += t.deltaX));
    });
  }
  // —— 文本属性 ——
  get text() {
    return this.textField !== null ? this.textField.text : this._text;
  }
  set text(t) {
    var i;
    this._text = t, this._html = !1, this.textField !== null && (this.textField.text = t, (i = this._adapter) == null || i.syncFromTarget()), this.invalidate(r.DATA);
  }
  /** htmlText 行为级简化：去标签按纯文本渲染 */
  get htmlText() {
    return this._savedHTML;
  }
  set htmlText(t) {
    this._savedHTML = t, this._html = !0, this.text = t.replace(/<[^>]*>/g, "");
  }
  get length() {
    return this.textField !== null ? this.textField.length : this._text.length;
  }
  get multiline() {
    return this._multiline;
  }
  set multiline(t) {
    this._multiline = t;
  }
  get wordWrap() {
    return this._wordWrap;
  }
  set wordWrap(t) {
    this._wordWrap !== t && (this._wordWrap = t, this.textField !== null && (this.textField.wordWrap = t), this.invalidate(r.SIZE));
  }
  get editable() {
    return this._editable;
  }
  set editable(t) {
    this._editable = t, this._adapter !== null && (this._adapter.editable = t);
  }
  get displayAsPassword() {
    return this._displayAsPassword;
  }
  set displayAsPassword(t) {
    this._displayAsPassword = t;
  }
  get maxChars() {
    return this._maxChars;
  }
  set maxChars(t) {
    this._maxChars = t, this._adapter !== null && (this._adapter.maxChars = t);
  }
  /** fl restrict：字符过滤模式，M3 仅存值（DOM 侧不做过滤） */
  get restrict() {
    return this._restrict;
  }
  set restrict(t) {
    this._restrict = t;
  }
  // —— 滚动位置 ——
  get verticalScrollPosition() {
    return this.textField !== null ? this.textField.scrollV : 1;
  }
  set verticalScrollPosition(t) {
    this.textField !== null && (this.textField.scrollV = t);
  }
  get maxVerticalScrollPosition() {
    return this.textField !== null ? this.textField.maxScrollV : 1;
  }
  get horizontalScrollPosition() {
    return this.textField !== null ? this.textField.scrollH : 0;
  }
  set horizontalScrollPosition(t) {
    this.textField !== null && (this.textField.scrollH = t);
  }
  get maxHorizontalScrollPosition() {
    return this.textField !== null ? this.textField.maxScrollH : 0;
  }
  /** 覆写 setter 必须同时提供 getter（JS set-only accessor 读取返回 undefined） */
  get enabled() {
    return super.enabled;
  }
  set enabled(t) {
    super.enabled = t, this._adapter !== null && (this._adapter.enabled = t);
  }
  // —— 绘制 ——
  /** fl TextArea.setFocus：让隐藏 DOM textarea 获得焦点（onFocus → notifyFocus 回流） */
  setFocus() {
    var t;
    (t = this._adapter) == null || t.focus();
  }
  draw() {
    this.isInvalid(r.STATE, r.STYLES) && (this.drawBackground(), this.drawTextFormat(), this.invalidate(r.SIZE)), this.isInvalid(r.SIZE) && this.drawLayout(), super.draw();
  }
  /** fl drawBackground 重建：enabled 切换 upSkin/disabledSkin */
  drawBackground() {
    const t = this.getStyleValue(this.enabled ? "upSkin" : "disabledSkin") ?? null;
    t !== this.background && (this.background !== null && this.removeChild(this.background), t !== null && this.addChildAt(t, 0), this.background = t);
  }
  drawTextFormat() {
    var i;
    if (this.textField === null)
      return;
    const t = !this.enabled && this.getStyleValue("disabledTextFormat") != null ? this.getStyleValue("disabledTextFormat") : this.getStyleValue("textFormat");
    this.textField.defaultTextFormat = t ?? new mt("_sans", 12, 0, !1, !1, !1, "", "", zt.LEFT), this.textField.wordWrap = this._wordWrap, this._html ? this.textField.text = this._savedHTML.replace(/<[^>]*>/g, "") : this.textField.text = this._text, (i = this._adapter) == null || i.syncFromTarget();
  }
  /** 滚动条按内容自动显隐 + textField/滚动条布局（fl 行为级重建） */
  drawLayout() {
    if (this.textField === null)
      return;
    this.background !== null && (this.background.width = this._width, this.background.height = this._height);
    const t = this.getStyleValue("contentPadding") ?? 3, i = this.textField.maxScrollV > 1, e = !this.textField.wordWrap && this.textField.maxScrollH > 0;
    this._verticalScrollBar.visible = i, this._horizontalScrollBar.visible = e;
    let s = this._width - t * 2, l = this._height - t * 2;
    if (i && (s -= b.WIDTH), e && (l -= b.WIDTH), this.textField.width = Math.max(1, s), this.textField.height = Math.max(1, l), this.textField.position.set(t, t), i) {
      const h = Math.max(b.WIDTH, l + (e ? b.WIDTH : 0));
      this._verticalScrollBar.setSize(b.WIDTH, h), this._verticalScrollBar.move(t + s, t);
    }
    if (e) {
      const h = Math.max(b.WIDTH, s + (i ? b.WIDTH : 0));
      this._horizontalScrollBar.setSize(h, b.WIDTH), this._horizontalScrollBar.move(t, t + l);
    }
  }
};
gt.defaultStyles = {
  upSkin: null,
  disabledSkin: null,
  textFormat: null,
  disabledTextFormat: null,
  textPadding: 5,
  contentPadding: 3
}, gt.SCROLL_BAR_STYLES = {
  upArrowDisabledSkin: "upArrowDisabledSkin",
  upArrowDownSkin: "upArrowDownSkin",
  upArrowOverSkin: "upArrowOverSkin",
  upArrowUpSkin: "upArrowUpSkin",
  downArrowDisabledSkin: "downArrowDisabledSkin",
  downArrowDownSkin: "downArrowDownSkin",
  downArrowOverSkin: "downArrowOverSkin",
  downArrowUpSkin: "downArrowUpSkin",
  thumbDisabledSkin: "thumbDisabledSkin",
  thumbDownSkin: "thumbDownSkin",
  thumbOverSkin: "thumbOverSkin",
  thumbUpSkin: "thumbUpSkin",
  trackDisabledSkin: "trackDisabledSkin",
  trackDownSkin: "trackDownSkin",
  trackOverSkin: "trackOverSkin",
  trackUpSkin: "trackUpSkin",
  repeatDelay: "repeatDelay",
  repeatInterval: "repeatInterval"
};
let Ei = gt;
class At {
  constructor(t, i, e = !0, s = 4294967295) {
    this._data = null, this._source = null, this.width = Math.max(0, Math.floor(t)), this.height = Math.max(0, Math.floor(i)), this.rect = new W(0, 0, this.width, this.height), this._canvas = document.createElement("canvas"), this._canvas.width = this.width, this._canvas.height = this.height;
    const l = this._canvas.getContext("2d", { willReadFrequently: !0 });
    if (!l)
      throw new Error("BitmapData: 2d context unavailable");
    this._ctx = l;
    const h = s >>> 24 & 255;
    if (e) {
      if (h > 0) {
        const n = s >>> 16 & 255, d = s >>> 8 & 255, a = s & 255;
        this._ctx.fillStyle = `rgba(${n},${d},${a},${h / 255})`, this._ctx.fillRect(0, 0, this.width, this.height);
      }
    } else {
      const n = s >>> 16 & 255, d = s >>> 8 & 255, a = s & 255;
      this._ctx.fillStyle = `rgb(${n},${d},${a})`, this._ctx.fillRect(0, 0, this.width, this.height);
    }
  }
  /** 从 HTMLImageElement 构建（SkinLoader 用） */
  static fromImage(t) {
    const i = t.naturalWidth || t.width, e = t.naturalHeight || t.height, s = new At(i, e, !0, 0);
    return s._ctx.drawImage(t, 0, 0, i, e), s;
  }
  /** 共享 Phaser canvas 纹理（懒注册，零拷贝切片的基底） */
  get source() {
    return this._source || (this._source = ki(this._canvas)), this._source;
  }
  /**
   * ARGB uint32。
   * Flash 语义：内部预乘存储使全透明像素 RGB 恒为 0，getPixel32 返回 0x00000000
   * （原版代码依赖此行为，如 SkinAsset.getColors 以 getPixel32 != 0 终止色条扫描）。
   * Canvas 的非预乘 ImageData 会保留 PNG 里透明像素的 RGB，此处显式归零，不依赖浏览器巧合。
   */
  getPixel32(t, i) {
    if (t < 0 || i < 0 || t >= this.width || i >= this.height)
      return 0;
    const e = this._ensureData().data, s = (i * this.width + t) * 4;
    return e[s + 3] === 0 ? 0 : (e[s + 3] << 24 | e[s] << 16 | e[s + 1] << 8 | e[s + 2]) >>> 0;
  }
  /** RGB uint24（忽略 alpha） */
  getPixel(t, i) {
    return this.getPixel32(t, i) & 16777215;
  }
  /**
   * findColor=true 时找 (pixel & mask) === color 的包围盒；
   * findColor=false 时找 (pixel & mask) !== color 的包围盒（同 AS3）。
   * 无匹配返回 Rectangle(0,0,0,0)。
   */
  getColorBoundsRect(t, i, e = !0) {
    const s = this._ensureData().data;
    let l = Number.MAX_VALUE, h = Number.MAX_VALUE, n = -1, d = -1;
    for (let a = 0; a < this.height; a++)
      for (let u = 0; u < this.width; u++) {
        const g = (a * this.width + u) * 4, w = ((s[g + 3] === 0 ? 0 : (s[g + 3] << 24 | s[g] << 16 | s[g + 1] << 8 | s[g + 2]) >>> 0) & t) >>> 0;
        (e ? w === i : w !== i) && (u < l && (l = u), a < h && (h = a), u > n && (n = u), a > d && (d = a));
      }
    return n < 0 ? new W(0, 0, 0, 0) : new W(l, h, n - l + 1, d - h + 1);
  }
  /** 区域拷贝（SkinAsset 裁剪/解析用），拷贝后像素缓存失效 */
  copyPixels(t, i, e) {
    i.isEmpty() || (this._ctx.drawImage(
      t._canvas,
      i.x,
      i.y,
      i.width,
      i.height,
      e.x,
      e.y,
      i.width,
      i.height
    ), this._data = null);
  }
  dispose() {
    this._data = null, this._source = null;
  }
  _ensureData() {
    return this._data || (this._data = this._ctx.getImageData(0, 0, this.width, this.height)), this._data;
  }
}
const R = class R extends _ {
  constructor(t, i = !1, e = !1, s = 0) {
    super(t, i, e), this.ratio = s;
  }
  clone() {
    return new R(this.type, this.bubbles, this.cancelable, this.ratio);
  }
};
R.ROWTYPE_RATIO_CHANGE = "rowtypeRatioChange", R.ROWTYPE_FIXED_CHANGE = "rowtypeFixedChange", R.ROWTYPE_RESIZE = "rowtypeResize", R.ROWTYPE_MOVE = "rowtypeMove", R.ROW_RESIZE = "rowResize", R.CELL_MOVE = "cellMove", R.CELL_SIZE = "cellSize", R.GRID_MOVE = "gridMove", R.GRID_SIZE = "gridSize";
let c = R;
const St = class St extends J {
  constructor(t, i, e = null) {
    super(), this.drawModeX = St.DRAW_REPEAT, this.drawModeY = St.DRAW_REPEAT, this.rectBmp = null, this.__grid = null, this.__parentGrid = null, this.__listenable = !1, this.moveColHandler = (s) => {
      this.__grid !== null && (this.__grid.x = this.__col.pos), this.__listenable && (this.rect.x = this.__col.pos, this.rect.y = this.__row.pos, this.dispatchEvent(new c(c.CELL_MOVE)));
    }, this.moveRowHandler = (s) => {
      this.__grid !== null && (this.__grid.y = this.__row.pos), this.__listenable && (this.rect.x = this.__col.pos, this.rect.y = this.__row.pos, this.dispatchEvent(new c(c.CELL_MOVE)));
    }, this.resizeColHandler = (s) => {
      this.__grid !== null && (this.__grid.width = this.__col.size), this.__listenable && (this.rect.width = this.__col.size, this.rect.height = this.__row.size, this.dispatchEvent(new c(c.CELL_SIZE)));
    }, this.resizeRowHandler = (s) => {
      this.__grid !== null && (this.__grid.height = this.__row.size), this.__listenable && (this.rect.width = this.__col.size, this.rect.height = this.__row.size, this.dispatchEvent(new c(c.CELL_SIZE)));
    }, this.__row = i, this.__col = t, this.__parentGrid = e, this.rect = new W();
  }
  set listenable(t) {
    this.__listenable = t, this.__listenable && (this.__row.addEventListener(c.ROWTYPE_RESIZE, this.resizeRowHandler), this.__col.addEventListener(c.ROWTYPE_RESIZE, this.resizeColHandler), this.__row.addEventListener(c.ROWTYPE_MOVE, this.moveRowHandler), this.__col.addEventListener(c.ROWTYPE_MOVE, this.moveColHandler), this.__parentGrid !== null && this.__parentGrid.addListenableCell(this));
  }
  get listenable() {
    return this.__listenable;
  }
  setGrid(t) {
    this.__grid = t, this.__grid.width = this.__col.size, this.__grid.height = this.__row.size, this.__grid.x = this.__col.pos, this.__grid.y = this.__row.pos, this.__grid.parentGrid = this.__parentGrid, this.listenable = !0;
  }
  get grid() {
    return this.__grid;
  }
  updateRect() {
    this.rect.x = this.__col.pos, this.rect.y = this.__row.pos, this.rect.width = this.__col.size, this.rect.height = this.__row.size;
  }
  get parentGrid() {
    return this.__parentGrid;
  }
  changeParentGrid(t) {
    this.__parentGrid = t;
  }
  get globalX() {
    return this.getParentGridX(this.rect.x, this.__parentGrid);
  }
  get globalY() {
    return this.getParentGridY(this.rect.y, this.__parentGrid);
  }
  getParentGridX(t, i) {
    return i === null ? t : this.getParentGridX(t + i.x, i.parentGrid);
  }
  getParentGridY(t, i) {
    return i === null ? t : this.getParentGridY(t + i.y, i.parentGrid);
  }
};
St.DRAW_REPEAT = 0, St.DRAW_STRETCH = 1;
let Y = St;
class ii {
  static drawShape(t, i, e, s = 0, l = 0, h = 0, n = "") {
    (s < 0 || s > i.getNbLayers() - 1) && (s = 0);
    let d, a;
    const u = t.getCols(), g = t.getRows(), S = t.getCells();
    let w, O, $, Lt, Yt;
    for (let q = 0; q < u.cells.length; q++)
      for (let Q = 0; Q < g.cells.length; Q++)
        if (d = Math.round(u.cells[q].size), a = Math.round(g.cells[Q].size), Yt = "bmp_" + q + "_" + Q + "_" + n, S[q][Q].grid !== null)
          ii.drawShape(S[q][Q].grid, i, e, s, t.x + l, t.y + h, Yt);
        else if (d >= 0 && a >= 0) {
          w = Math.floor(u.cells[q].pos + t.x + l), O = Math.floor(g.cells[Q].pos + t.y + h), $ = Math.ceil(d), Lt = Math.ceil(a);
          const Ct = i.getBitmapCell(Yt);
          if (Ct === void 0)
            continue;
          const tt = Ct.bitmap[s];
          if (tt === void 0 || $ <= 0 || Lt <= 0)
            continue;
          const di = Ct.cell.drawModeX, ci = Ct.cell.drawModeY;
          if (di === Y.DRAW_STRETCH || ci === Y.DRAW_STRETCH) {
            const nt = new E.GameObjects.Image(rt(), w, O, tt.textureKey, tt.frameKey);
            nt.setOrigin(0, 0), nt.setScale(
              di === Y.DRAW_STRETCH ? $ / tt.width : 1,
              ci === Y.DRAW_STRETCH ? Lt / tt.height : 1
            ), e.add(nt);
          } else {
            const nt = new E.GameObjects.TileSprite(rt(), w, O, $, Lt, tt.textureKey, tt.frameKey);
            nt.setOrigin(0, 0), e.add(nt);
          }
        }
  }
}
const D = class D extends J {
  constructor(t, i = D.SIZE_FIXED, e = 0, s = Number.POSITIVE_INFINITY) {
    super(), this.__ratio = 0, this.__pos = 0, this.__row = null, this.__sizeMode = i, this.__minSize = e, this.__maxSize = s, this.__sizeMode === D.SIZE_RATIO ? (this.__ratio = t, this.__size = 0) : this.__size = this.__minSize = t;
  }
  clone() {
    const t = this.__sizeMode === D.SIZE_FIXED ? this.__size : this.__ratio;
    return new D(t, this.__sizeMode, this.__minSize, this.__maxSize);
  }
  toString() {
    return "LiquidSlice [" + (this.__sizeMode === D.SIZE_FIXED ? "FIXED" : "RATIO") + "]";
  }
  set row(t) {
    this.__row = t;
  }
  updateSize() {
    this.__sizeMode === D.SIZE_RATIO && (this.__row !== null && this.__row.ratioScale !== 0 ? this.__size = Math.min(
      Math.max(this.__minSize, this.__row.ratioSize * this.__ratio / this.__row.ratioScale),
      this.__maxSize
    ) : this.__size = this.__minSize), this.dispatchEvent(new c(c.ROWTYPE_RESIZE));
  }
  setSize(t) {
    if (this.__sizeMode !== D.SIZE_FIXED)
      throw new Error("CHANGE SIZE OF NON FIXED ROW");
    this.__size = this.__minSize = t, this.dispatchEvent(new c(c.ROWTYPE_FIXED_CHANGE)), this.dispatchEvent(new c(c.ROWTYPE_RESIZE));
  }
  getPreferedSize() {
    return this.__ratio * (this.__row !== null ? this.__row.ratioSize : 0);
  }
  get size() {
    return this.__size;
  }
  get ratio() {
    return this.__ratio;
  }
  get sizeMode() {
    return this.__sizeMode;
  }
  set ratio(t) {
    this.__ratio = t;
  }
  get minSize() {
    return this.__minSize;
  }
  get maxSize() {
    return this.__maxSize;
  }
  get pos() {
    return this.__pos;
  }
  set pos(t) {
    const i = this.__pos;
    this.__pos = t, i !== this.__pos && this.dispatchEvent(new c(c.ROWTYPE_MOVE));
  }
  changeRatio(t) {
    if (this.__sizeMode === D.SIZE_FIXED)
      throw new Error("CHANGE RATIO OF FIXED SIZE");
    const i = this.__ratio - t;
    this.__ratio = t, this.dispatchEvent(new c(c.ROWTYPE_RATIO_CHANGE, !1, !1, i));
  }
};
D.SIZE_FIXED = 0, D.SIZE_RATIO = 1;
let M = D;
class Ht extends J {
  constructor(t, ...i) {
    super(), this.__cells = [], this.fixedCells = [], this.ratioCells = [], this.__size = 0, this.__fixedSize = 0, this.__ratioSize = 0, this.__ratioScale = 0, this.__minSize = 0, this.forced = !1, this.ratioChangeHandler = (s) => {
      const l = s;
      if (this.ratioCells.length === 1)
        throw new Error("RATIO CHANGE IMPOSSIBLE ON 1 ROWTYPE");
      const h = l.target;
      let n = 1 - h.ratio;
      const d = 1 - (h.ratio + l.ratio);
      let a = null, u = 0;
      for (let g = 0; g < this.ratioCells.length; g++)
        if (this.ratioCells[g] !== h) {
          const S = l.ratio * this.ratioCells[g].ratio / d;
          this.ratioCells[g].ratio += S, a = this.ratioCells[g], u = this.ratioCells[g].ratio, n -= u;
        }
      n <= 0 && a !== null && (a.ratio = u + 1e-7), this.updateFixedCells(), this.updateRatioCells(), this.updatePos(), this.dispatchEvent(new c(c.ROW_RESIZE));
    }, this.fixedChangeHandler = (s) => {
      this.updateFixedCells(), this.updateRatioCells(), this.updatePos(), this.__size = Math.max(this.__size, this.__minSize), this.dispatchEvent(new c(c.ROW_RESIZE));
    };
    const e = [];
    t != null && e.push(t), i != null && e.push(...i), e.length > 0 && this.setRows(e);
  }
  clone() {
    const t = [];
    for (let e = 0; e < this.__cells.length; e++)
      t.push(this.__cells[e].clone());
    const i = new Ht();
    return i.setRows(t), i;
  }
  setRows(t) {
    this.__cells = t, this.ratioCells = [], this.fixedCells = [];
    for (let i = 0; i < this.__cells.length; i++)
      this.__cells[i].row = this, this.__cells[i].sizeMode === M.SIZE_FIXED ? this.fixedCells.push(this.__cells[i]) : this.ratioCells.push(this.__cells[i]), this.__cells[i].addEventListener(c.ROWTYPE_RATIO_CHANGE, this.ratioChangeHandler), this.__cells[i].addEventListener(c.ROWTYPE_FIXED_CHANGE, this.fixedChangeHandler);
    this.updateFixedCells(), this.updateRatioCells(), this.updatePos();
  }
  toString() {
    let t = "LiquidRow [";
    for (let i = 0; i < this.__cells.length; i++)
      t += this.__cells[i].toString() + `
`;
    return t += "]", t;
  }
  set size(t) {
    this.__size = this.clamp(t, this.__minSize, Number.POSITIVE_INFINITY), this.updateFixedCells(), this.updateRatioCells(), this.updatePos(), this.dispatchEvent(new c(c.ROW_RESIZE));
  }
  get size() {
    return this.__size;
  }
  get cells() {
    return this.__cells;
  }
  get fixedSize() {
    return this.__fixedSize;
  }
  get ratioSize() {
    return this.__ratioSize;
  }
  get ratioScale() {
    return this.__ratioScale;
  }
  getRatioCells() {
    return this.ratioCells;
  }
  get length() {
    return this.__cells.length;
  }
  get minSize() {
    return this.__minSize;
  }
  updateFixedCells() {
    let t = this.fixedCells.length;
    for (this.__fixedSize = 0, this.__minSize = 0, this.__ratioSize = this.__size; --t >= 0; )
      this.__fixedSize += this.fixedCells[t].size, this.__minSize += this.fixedCells[t].minSize, this.__ratioSize -= this.fixedCells[t].minSize, this.fixedCells[t].updateSize();
  }
  updatePos() {
    let t = 0;
    for (let i = 0; i < this.__cells.length; i++)
      this.__cells[i].pos = t, t += this.__cells[i].size;
  }
  updateRatioCells() {
    let t = this.ratioCells.length;
    for (this.forced = !1, this.__ratioScale = 1; --t >= 0; )
      this.__minSize += this.ratioCells[t].minSize, this.ratioCells[t].updateSize(), this.ratioCells[t].minSize === this.ratioCells[t].size ? (this.forced = !0, this.__ratioScale -= this.ratioCells[t].ratio, this.__ratioSize -= this.ratioCells[t].minSize) : this.ratioCells[t].maxSize === this.ratioCells[t].size && (this.forced = !0, this.__ratioScale -= this.ratioCells[t].ratio, this.__ratioSize -= this.ratioCells[t].maxSize);
    if (this.forced)
      for (t = this.ratioCells.length; --t >= 0; )
        this.ratioCells[t].updateSize();
  }
  clamp(t, i, e) {
    return t < i ? i : t > e ? e : t;
  }
}
class Nt extends J {
  constructor(t, i) {
    super(), this.__width = 1, this.__height = 1, this.__x = 0, this.__y = 0, this.__parentGrid = null, this.cells = [], this.listenableCells = [], this.colsResizeHandler = (e) => {
      this.__width = this.cols.size, this.updateListenableCells(), this.dispatchEvent(new c(c.GRID_SIZE));
    }, this.rowsResizeHandler = (e) => {
      this.__height = this.rows.size, this.updateListenableCells(), this.dispatchEvent(new c(c.GRID_SIZE));
    }, this.listenableCells = [], this.cols = t, this.rows = i, this.cols.addEventListener(c.ROW_RESIZE, this.colsResizeHandler), this.rows.addEventListener(c.ROW_RESIZE, this.rowsResizeHandler), this.cols.size = this.__width, this.rows.size = this.__height, this.buildCells();
  }
  clone() {
    const t = this.cols.clone(), i = this.rows.clone(), e = new Nt(t, i);
    for (let s = 0; s < t.length; s++)
      for (let l = 0; l < i.length; l++)
        this.cells[s][l].grid !== null && (e.getCell(s, l).setGrid(this.cells[s][l].grid.clone()), e.getCell(s, l).changeParentGrid(e)), e.getCell(s, l).drawModeX = this.cells[s][l].drawModeX, e.getCell(s, l).drawModeY = this.cells[s][l].drawModeY;
    return e.width = this.__width, e.height = this.__height, e;
  }
  getCell(t, i) {
    return this.cells[t][i];
  }
  getColAt(t) {
    return this.cols.cells[t];
  }
  getRowAt(t) {
    return this.rows.cells[t];
  }
  toString() {
    return "LiquidGrid[]";
  }
  set width(t) {
    this.cols.size = t, this.__width = this.cols.size, this.updateListenableCells(), this.dispatchEvent(new c(c.GRID_SIZE));
  }
  get width() {
    return this.__width;
  }
  set height(t) {
    this.rows.size = t, this.__height = this.rows.size, this.updateListenableCells(), this.dispatchEvent(new c(c.GRID_SIZE));
  }
  get height() {
    return this.__height;
  }
  set x(t) {
    this.__x = t, this.updateListenableCells(), this.dispatchEvent(new c(c.GRID_MOVE));
  }
  get x() {
    return this.__x;
  }
  set y(t) {
    this.__y = t, this.updateListenableCells(), this.dispatchEvent(new c(c.GRID_MOVE));
  }
  get y() {
    return this.__y;
  }
  getCols() {
    return this.cols;
  }
  getRows() {
    return this.rows;
  }
  getCells() {
    return this.cells;
  }
  get minWidth() {
    return this.cols.minSize;
  }
  get minHeight() {
    return this.rows.minSize;
  }
  debugDraw(t, i = 0, e = 0) {
    let s, l;
    t.fillStyle(15658734, 1), t.lineStyle(1, 6710886, 1);
    for (let h = 0; h < this.cols.cells.length; h++)
      for (let n = 0; n < this.rows.cells.length; n++)
        if (s = this.cols.cells[h].size, l = this.rows.cells[n].size, this.cells[h][n].grid !== null)
          this.cells[h][n].grid.debugDraw(t, this.__x + i, this.__y + e);
        else if (s >= 0 && l >= 0) {
          const d = this.cols.cells[h].pos + this.__x + i, a = this.rows.cells[n].pos + this.__y + e;
          t.fillRect(d, a, s, l), t.strokeRect(d, a, s, l);
        }
    t.fillStyle(4283281, 1), t.fillRect(this.__x + i + 2, this.__y + e + 2, 3, 3);
  }
  addListenableCell(t) {
    this.listenableCells.push(t);
  }
  set parentGrid(t) {
    this.__parentGrid = t;
  }
  get parentGrid() {
    return this.__parentGrid;
  }
  setSize(t, i) {
    this.cols.size = t, this.__width = this.cols.size, this.rows.size = i, this.__height = this.rows.size, this.updateListenableCells(), this.dispatchEvent(new c(c.GRID_SIZE));
  }
  buildCells() {
    this.cells = [], this.listenableCells = [];
    for (let t = 0; t < this.cols.length; t++) {
      this.cells.push([]);
      for (let i = 0; i < this.rows.length; i++)
        this.cells[t].push(new Y(this.cols.cells[t], this.rows.cells[i], this));
    }
  }
  updateListenableCells() {
    let t = this.listenableCells.length;
    for (; --t >= 0; )
      this.listenableCells[t].updateRect();
  }
  static scale9Grid(t, i, e, s, l, h) {
    const n = new Ht(
      new M(t),
      new M(1, M.SIZE_RATIO),
      new M(i)
    ), d = new Ht(
      new M(e),
      new M(1, M.SIZE_RATIO),
      new M(s)
    ), a = new Nt(n, d);
    return a.setSize(l, h), a;
  }
}
class Mi {
  constructor(t, i, e = 1) {
    this.bitmaps = {}, this._layerHandles = [], this.defaultGrid = t.clone(), this._width = t.width, this._height = t.height, this.texture = i, this.nbLayers = e, this.buildMap(this.defaultGrid);
  }
  getBitmapCell(t) {
    return this.bitmaps[t];
  }
  changeBitmap(t) {
    this._layerHandles = [], this.texture = t, this.bitmaps = {}, this.buildMap(this.defaultGrid);
  }
  getNbLayers() {
    return this.nbLayers;
  }
  get width() {
    return this._width;
  }
  get height() {
    return this._height;
  }
  /** 整层帧（frame 覆盖该层完整状态行），SkinBox NineSlice 快路径用。
   *  注意 this.texture 是 SkinAsset.getLiquidBitmap 裁剪后的层位图
   *  （参考行已被剔除，row0 即 layer0），故 frame.y = layer * height。 */
  getLayerTexture(t) {
    const i = this._layerHandles[t];
    if (i != null)
      return i;
    const e = this.addFrame(0, t * this._height, this._width, this._height);
    return this._layerHandles[t] = e, e;
  }
  /** 在底层 BitmapData 的 Phaser 纹理上注册一个帧（零拷贝切片） */
  addFrame(t, i, e, s) {
    const l = this.texture.source, h = `lpf_${Ii()}`;
    return l.add(h, 0, t, i, e, s), { textureKey: l.key, frameKey: h, width: e, height: s };
  }
  buildMap(t, i = 0, e = 0, s = "") {
    let l, h;
    const n = t.getCols(), d = t.getRows(), a = t.getCells(), u = { x: 0, y: 0, width: 0, height: 0 };
    let g;
    for (let S = 0; S < n.cells.length; S++)
      for (let w = 0; w < d.cells.length; w++)
        if (l = n.cells[S].size, h = d.cells[w].size, g = "bmp_" + S + "_" + w + "_" + s, a[S][w].grid !== null)
          this.buildMap(a[S][w].grid, t.x + i, t.y + e, g);
        else if (l >= 0 && h >= 0) {
          a[S][w].rectBmp === null ? (u.x = Math.floor(n.cells[S].pos + t.x + i), u.y = Math.floor(d.cells[w].pos + t.y + e), u.width = Math.floor(l), u.height = Math.floor(h)) : (u.x = a[S][w].rectBmp.x, u.y = a[S][w].rectBmp.y, u.width = a[S][w].rectBmp.width, u.height = a[S][w].rectBmp.height);
          const O = { bitmap: [], cell: a[S][w] };
          this.bitmaps[g] = O;
          for (let $ = 0; $ < this.nbLayers; $++)
            O.bitmap.push(
              this.addFrame(u.x, u.y + $ * t.height, u.width, u.height)
            );
        }
  }
}
const vt = class vt extends _ {
  constructor(t, i = !1, e = !1) {
    super(t, i, e);
  }
  clone() {
    return new vt(this.type, this.bubbles, this.cancelable);
  }
};
vt.SKIN_LOADED = "skinLoadedEvent", vt.STATE_CHANGED = "stateChangeddEvent";
let X = vt;
const I = class I extends Error {
  constructor(t = 0, i = "") {
    I.__init__ || I.init();
    let e = I.errors[t] ?? "";
    i !== "" && (e = e.split("#arg#").join(i)), super(e), this.name = "LiquidError";
  }
  static init() {
    I.errors[I.ERROR_DEFAULT] = "#ERROR 00 - Liquid default error.", I.errors[I.IO_ERROR] = "#ERROR 01 -  Unable to load the file : #arg#", I.__init__ = !0;
  }
};
I.ERROR_DEFAULT = 0, I.IO_ERROR = 1, I.__init__ = !1, I.errors = {};
let Wt = I;
const G = class G extends J {
  constructor() {
    super(...arguments), this._state = G.STATE_INIT, this._bmp = null, this._url = "", this._img = null;
  }
  load(t) {
    this._url = t;
    const i = new Image();
    this._img = i, i.onload = () => this.completeHandler(), i.onerror = () => this.errorHandler(), i.src = t;
  }
  getState() {
    return this._state;
  }
  getBitmap() {
    return this._bmp;
  }
  completeHandler() {
    this._img && (this._bmp = At.fromImage(this._img), this._state = G.STATE_LOADED, this.dispatchEvent(new X(X.SKIN_LOADED)));
  }
  errorHandler() {
    throw this._state = G.STATE_ERROR, new Wt(Wt.IO_ERROR, this._url);
  }
};
G.STATE_INIT = 0, G.STATE_LOADING = 1, G.STATE_LOADED = 2, G.STATE_ERROR = 3;
let yt = G;
const k = class k {
  constructor(t) {
    const i = k.cache.get(t);
    i ? (this.grid = i.grid, this.liquidBitmap = i.liquidBitmap, this.colors = i.colors) : (this.grid = k.getGrid(t), this.liquidBitmap = k.getLiquidBitmap(t, this.grid), this.colors = k.getColors(t, this.grid), k.cache.set(t, this));
  }
  /** 加载皮肤（同 url 去重），完成时派发 LiquidEvent.SKIN_LOADED */
  static loadSkin(t) {
    const i = k.loaders.get(t);
    if (i)
      return i;
    const e = new yt();
    return e.load(t), k.loaders.set(t, e), e;
  }
  /** 取已注册的位图（对应 AS3 ApplicationDomain.getDefinition） */
  static getBitmapData(t) {
    return k.bmps.get(t) ?? null;
  }
  static registerBitmapData(t, i) {
    k.bmps.set(t, i);
  }
  static getGrid(t) {
    const i = t.width;
    let e = 1;
    const s = t.getPixel32(1, e);
    for (; e < t.height - 1 && t.getPixel32(1, e) === s; )
      e++;
    const l = e + 1, h = new At(i - 2, l - 2, !0, 0);
    h.copyPixels(t, new W(1, 1, i - 2, l - 2), new kt(0, 0));
    const n = h.getColorBoundsRect(4294967295, 0, !1), d = Nt.scale9Grid(
      n.x + 1,
      i - n.right - 1,
      n.y + 1,
      l - n.bottom - 1,
      i,
      l
    );
    for (let a = 0; a < 3; a++)
      d.getCell(1, a).drawModeX = Y.DRAW_STRETCH, d.getCell(a, 1).drawModeY = Y.DRAW_STRETCH;
    return d;
  }
  static getLiquidBitmap(t, i) {
    const e = Math.max(0, Math.trunc((t.height - i.height) / i.height)), s = new At(i.width, e * i.height, !0, 16777215);
    return s.copyPixels(t, new W(0, i.height, i.width, i.height * e), new kt(0, 0)), new Mi(i, s, e);
  }
  static getColors(t, i) {
    const e = [];
    if (t.height % i.height === 1) {
      let s = 0;
      for (; s < t.width && t.getPixel32(s, t.height - 1) !== 0; )
        e.push(t.getPixel(s, t.height - 1)), s++;
    }
    return e;
  }
};
k.cache = /* @__PURE__ */ new Map(), k.bmps = /* @__PURE__ */ new Map(), k.loaders = /* @__PURE__ */ new Map();
let lt = k;
const Tt = class Tt extends ti {
  constructor(t, i) {
    super(), this._grid = null, this._skin = null, this._state = 0, this._skinReady = !1, this._colors = null, this._plane = null, this._fallback = null, this._useFallback = !1, this._width = t, this._height = i;
  }
  get isReady() {
    return this._skinReady;
  }
  get minWidth() {
    return this._grid !== null ? this._grid.minWidth : 0;
  }
  get minHeight() {
    return this._grid !== null ? this._grid.minHeight : 0;
  }
  setSize(t, i) {
    return this._width = t, this._height = i, this._skinReady && this._grid !== null && (this._grid.setSize(this._width, this._height), this.render()), this;
  }
  get width() {
    return this._width;
  }
  set width(t) {
    this.setSize(t, this._height);
  }
  get height() {
    return this._height;
  }
  set height(t) {
    this.setSize(this._width, t);
  }
  /** AS3 state 语义（Phaser GameObject.state 同名，TS 要求 override）。
   * 注意：Phaser GameObject 基类构造器会写 this.state=0（引擎初始值），发生在
   * super() 期间、TS 字段初始化器之前——stomp 时 _state 尚未初始化，此处直接忽略；
   * fl 初始值由字段初始化器提供（同为 0，无语义差异） */
  set state(t) {
    typeof this._state == "number" && this._state !== t && (this._state = t, this.dispatchEvent(new X(X.STATE_CHANGED, !0)), this.render());
  }
  get state() {
    return this._state;
  }
  nbLayers() {
    return this._skinReady && this._skin !== null ? this._skin.getNbLayers() : 0;
  }
  setSkin(t) {
    if (t !== null) {
      const i = new lt(t);
      this._grid = i.grid.clone(), this._skin = i.liquidBitmap, this._colors = i.colors, this._skinReady = !0, this._useFallback = Tt.FORCE_FALLBACK || this._skin.getNbLayers() === 0 || !Tt.isPlainScale9(this._grid), this.render();
    }
  }
  getColor() {
    return this._colors === null || this._colors.length === 0 ? 0 : this._state > this._colors.length - 1 ? this._colors[0] : this._colors[this._state];
  }
  drawNow() {
    this._skinReady && this._grid !== null && (this._grid.setSize(this._width, this._height), this.render());
  }
  resetSize() {
    this._skin !== null && this.setSize(this._skin.width, this._skin.height);
  }
  /** TS 附加：debug 透传（demo 叠加对照 cell 划分；P5 已接 Phaser Graphics） */
  debugDraw(t, i = 0, e = 0) {
    this._grid !== null && this._grid.debugDraw(t, i, e);
  }
  static isPlainScale9(t) {
    const i = t.getCells();
    if (i.length !== 3)
      return !1;
    for (const e of i) {
      if (e.length !== 3)
        return !1;
      for (const s of e)
        if (s.grid !== null)
          return !1;
    }
    return !0;
  }
  render() {
    if (!this._skinReady || this._grid === null || this._skin === null)
      return;
    this._plane !== null && this._plane.isDestroyed && (this._plane = null), this._fallback !== null && this._fallback.isDestroyed && (this._fallback = null);
    const t = Math.max(0, Math.min(this._state, this._skin.getNbLayers() - 1));
    if (this._useFallback)
      this._plane !== null && (this._plane.destroy(), this._plane = null), this._fallback === null && (this._fallback = new E.GameObjects.Container(rt(), 0, 0), this.addChild(this._fallback)), this._fallback.removeAll(!1), ii.drawShape(this._grid, this._skin, this._fallback, t);
    else {
      this._fallback !== null && (this._fallback.destroy(), this._fallback = null);
      const i = this._skin.getLayerTexture(t);
      this._plane === null ? (this._plane = new E.GameObjects.NineSlice(
        rt(),
        0,
        0,
        i.textureKey,
        i.frameKey,
        this._grid.width,
        this._grid.height,
        this._grid.getColAt(0).size,
        this._grid.getColAt(2).size,
        this._grid.getRowAt(0).size,
        this._grid.getRowAt(2).size
      ), this._plane.setOrigin(0, 0), this.addChild(this._plane)) : this._plane.setTexture(i.textureKey, i.frameKey), this._plane.setSlices(
        this._grid.width,
        this._grid.height,
        this._grid.getColAt(0).size,
        this._grid.getColAt(2).size,
        this._grid.getRowAt(0).size,
        this._grid.getRowAt(2).size
      );
    }
  }
};
Tt.FORCE_FALLBACK = !1;
let Qt = Tt;
const f = class f {
  /** 注册组件（首次触发 focusRect 初始化） */
  static register(t) {
    f.__focusRect || f.initFocusRect();
  }
  /** 设置共享位图皮肤（id: "focusRect"） */
  static setSharedSkin(t, i) {
    switch (t) {
      case "focusRect":
        i !== null && f.__skinFocus !== null && f.__skinFocus.setSkin(i);
        break;
    }
  }
  static getFocusSkinBox() {
    return f.__skinFocus;
  }
  /** 加载外部位图皮肤并共享（id: "focusRect"） */
  static loadSharedSkin(t, i) {
    switch (t) {
      case "focusRect":
        f.load_focusRect(i);
        break;
    }
  }
  /**
   * TS 附加：预载默认皮肤集（对应 AS3 嵌入符号），注册名 = 文件名去扩展名。
   * 完成后 focusRect 就绪，SkinAsset.getBitmapData(name) 可用。
   */
  static async init(t) {
    const i = (t == null ? void 0 : t.skinBase) ?? "./skin/", e = (t == null ? void 0 : t.names) ?? f.DEFAULT_SKINS;
    await Promise.all(
      e.map(
        (s) => new Promise((l) => {
          const h = lt.loadSkin(i + s + ".png"), n = () => {
            const d = h.getBitmap();
            d !== null && lt.registerBitmapData(s, d), l();
          };
          h.getState() === yt.STATE_LOADED ? n() : h.addEventListener(X.SKIN_LOADED, n);
        })
      )
    ), f.__focusRect || f.initFocusRect();
  }
  static initFocusRect() {
    f.__focusRect = !0, f.__skinFocus = new Qt(
      f.DEFAULT_FOCUS_WIDTH,
      f.DEFAULT_FOCUS_HEIGHT
    ), f.__skinFocus.setSkin(lt.getBitmapData(f.DEFAULT_FOCUS_SKIN));
  }
  static load_focusRect(t) {
    var i, e;
    if (t !== "") {
      const s = lt.loadSkin(t);
      s.getState() === yt.STATE_LOADED ? ((i = f.__skinFocus) == null || i.setSkin(s.getBitmap()), (e = f.__skinFocus) == null || e.drawNow()) : s.addEventListener(X.SKIN_LOADED, f.focusRectLoaded);
    }
  }
};
f.DEFAULT_FOCUS_WIDTH = 100, f.DEFAULT_FOCUS_HEIGHT = 22, f.DEFAULT_FOCUS_SKIN = "Liquid_focusRect", f.DEFAULT_SKINS = [
  "LiquidButton_back",
  "LiquidCheckBox_icon",
  "LiquidComboBox_back",
  "LiquidList_back",
  "LiquidList_cell",
  "LiquidRadioButton_icon",
  "LiquidScrollBar_arrow",
  "LiquidScrollBar_icons",
  "LiquidScrollBar_thumb",
  "LiquidScrollBar_track",
  "LiquidScrollPane_back",
  "LiquidTextInput_back",
  "Liquid_focusRect"
], f.__focusRect = !1, f.__skinFocus = null, f.focusRectLoaded = (t) => {
  var e, s;
  const i = t.target;
  i.removeEventListener(X.SKIN_LOADED, f.focusRectLoaded), (e = f.__skinFocus) == null || e.setSkin(i.getBitmap()), (s = f.__skinFocus) == null || s.drawNow();
};
let vi = f;
export {
  Ci as $,
  Fi as A,
  ht as B,
  jt as C,
  It as D,
  _ as E,
  B as F,
  mt as G,
  zt as H,
  Mt as I,
  Kt as J,
  wt as K,
  vi as L,
  p as M,
  bi as N,
  ki as O,
  kt as P,
  Oi as Q,
  Bi as R,
  ti as S,
  Ei as T,
  Z as U,
  Wi as V,
  Ui as W,
  Pi as X,
  Ti as Y,
  rt as Z,
  Ni as _,
  At as a,
  Ri as a0,
  Ii as a1,
  X as a2,
  lt as a3,
  yt as a4,
  Qt as a5,
  Ft as a6,
  Mi as a7,
  Y as a8,
  c as a9,
  Wt as aa,
  Nt as ab,
  ii as ac,
  Ht as ad,
  M as ae,
  wi as b,
  at as c,
  Di as d,
  mi as e,
  N as f,
  V as g,
  x as h,
  pt as i,
  J as j,
  r as k,
  A as l,
  xi as m,
  ft as n,
  zi as o,
  Gt as p,
  H as q,
  qt as r,
  W as s,
  b as t,
  P as u,
  j as v,
  Vi as w,
  Jt as x,
  Bt as y,
  K as z
};
//# sourceMappingURL=LiquidManager-DjPg-Ty-.js.map

import { S as c, K as n, L as o, U as h, D as d } from "./LiquidManager-DjPg-Ty-.js";
import { A as p, B as y, a as _, b as E, c as x, C as R, d as S, e as b, f as C, g as B, h as D, i as k, E as A, j as L, F as T, I as m, k as P, l as K, m as H, n as I, o as U, p as M, q as W, M as O, P as z, R as G, r as N, s as Y, t as j, u as q, v as V, w as J, x as Q, T as X, y as Z, z as $, G as tt, H as et, J as st, N as at, O as it, Q as nt, V as ot, W as rt, X as lt, Y as ut, Z as ct, _ as ht, $ as dt, a0 as ft, a1 as gt } from "./LiquidManager-DjPg-Ty-.js";
class g extends c {
  constructor(t = 0, e = 0) {
    super(), this.isStage = !0, this._stageWidth = t, this._stageHeight = e;
  }
  get stageWidth() {
    return this._stageWidth;
  }
  get stageHeight() {
    return this._stageHeight;
  }
  setStageSize(t, e) {
    this._stageWidth = t, this._stageHeight = e;
  }
  /** fl DisplayObjectContainer.contains：child 为自身或后代 */
  contains(t) {
    let e = t;
    for (; e !== null; ) {
      if (e === this)
        return !0;
      e = e.parent;
    }
    return !1;
  }
  /** fl removeChild：非直接子级时抛 ArgumentError；下拉动画收尾时序在 TS 下
   * 可能出现重复摘除，此处宽松化（不存在时静默返回）并注释差异。
   * 直接子级判定经 parentContainer（shim 的 parent 访问器即读它）——raw Phaser
   * GameObject（如下拉遮罩 Graphics）没有 shim parent 访问器，同样适用 */
  removeChildSafe(t) {
    t.parentContainer === this && this.removeChild(t);
  }
}
class v {
  constructor(t) {
    this._focused = null, this.keyDownHandler = (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const s = this.collectFocusables();
        if (s.length === 0)
          return;
        const i = this._focused !== null ? s.indexOf(this._focused) : -1, l = e.shiftKey ? -1 : 1, u = i === -1 ? 0 : (i + l + s.length) % s.length;
        this.setFocus(s[u]);
        return;
      }
      if (this._focused === null)
        return;
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown", "Escape", "Enter", " "].includes(e.key) && e.preventDefault(), this._focused.dispatchEvent(new n(n.KEY_DOWN, !0, !1, 0, e.keyCode, 0, e.ctrlKey, e.altKey, e.shiftKey));
    }, this._root = t, window.addEventListener("keydown", this.keyDownHandler), this.collectFocusables();
  }
  /** fl FocusManager.getFocus：当前焦点组件 */
  getFocus() {
    return this._focused;
  }
  /** fl FocusManager.setFocus：程序化设焦点；置空则摘除焦点框 */
  setFocus(t) {
    if (t === null) {
      this._focused = null, this.hideFocusRect();
      return;
    }
    this._focused = t, t.setFocus(), this.showFocusRect(t);
  }
  /** 组件自行获得焦点（点击输入框/按钮）时由组件回调：同步状态并显示焦点框 */
  notifyFocus(t) {
    t.focusEnabled && (this._focused = t, this.showFocusRect(t));
  }
  /** fl UIComponent.drawFocus 落点 */
  drawFocusFor(t, e) {
    e ? this.showFocusRect(t) : this._focused === t && this.hideFocusRect();
  }
  destroy() {
    window.removeEventListener("keydown", this.keyDownHandler), this.hideFocusRect(), this._focused = null;
  }
  /** DFS 收集 root 下可聚焦组件（顺带自动接线 focusManager） */
  collectFocusables() {
    const t = [], e = (a) => {
      for (const s of a.list)
        s.visible !== !1 && (s instanceof h && (s.focusManager = this, s.focusEnabled && s.enabled && t.push(s)), s instanceof d && e(s));
    };
    return e(this._root), t;
  }
  /** 把共享 focusRect SkinBox 移动到组件顶部（外扩 focusRectPadding 包围组件） */
  showFocusRect(t) {
    const e = o.getFocusSkinBox();
    if (e === null)
      return;
    e.parent !== null && e.parent.removeChild(e);
    const a = t.getStyleValue("focusRectPadding") ?? 2;
    e.setSize(t.width + a * 2, t.height + a * 2), e.position.set(-a, -a), t.addChild(e);
  }
  hideFocusRect() {
    const t = o.getFocusSkinBox();
    t !== null && t.parent !== null && t.parent.removeChild(t);
  }
}
export {
  p as ARRAY_NUMERIC,
  y as BaseButton,
  _ as BitmapData,
  E as Button,
  x as ButtonLabelPlacement,
  R as CellRenderer,
  S as CheckBox,
  b as ComboBox,
  C as ComponentEvent,
  B as DataChangeEvent,
  D as DataChangeType,
  k as DataProvider,
  d as DisplayObject,
  A as Event,
  L as EventDispatcher,
  T as FocusEvent,
  v as FocusManager,
  m as InputAdapter,
  P as InvalidationType,
  K as Keyboard,
  n as KeyboardEvent,
  H as Label,
  I as LabelButton,
  U as List,
  M as ListData,
  W as ListEvent,
  O as MouseEvent,
  z as Point,
  G as RadioButton,
  N as RadioButtonGroup,
  Y as Rectangle,
  j as ScrollBar,
  q as ScrollBarDirection,
  V as ScrollEvent,
  J as ScrollPane,
  Q as SelectableList,
  c as Sprite,
  g as Stage,
  X as TextArea,
  Z as TextField,
  $ as TextFieldAutoSize,
  tt as TextFormat,
  et as TextFormatAlign,
  st as TextInput,
  h as UIComponent,
  at as UIScrollBar,
  it as addCanvasTexture,
  nt as addGlobalPointerListener,
  ot as attachInvalidationTicker,
  rt as attachPointerBridge,
  lt as flushInvalidations,
  ut as getActiveGame,
  ct as getActiveScene,
  ht as initRuntime,
  dt as invalidateComponent,
  ft as isPointerOver,
  gt as nextUid
};
//# sourceMappingURL=fl.js.map

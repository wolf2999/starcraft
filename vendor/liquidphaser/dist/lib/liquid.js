import { U as ii, a2 as e, a3 as a, a4 as B, a1 as ti, Z as si, b as ai, L as r, a5 as b, k as _, t as T, f as m, M as P, w as ei, v, a6 as U, u as K, d as hi, o as ni, e as O, E as C, q as F, G as oi, m as ri, z, R as ci, N as li, T as x, J as di, p as _i } from "./LiquidManager-DjPg-Ty-.js";
import { a7 as Ii, a8 as bi, a9 as Bi, aa as Ai, ab as fi, ac as Di, ad as Ti, ae as Ei } from "./LiquidManager-DjPg-Ty-.js";
import A from "phaser";
class u extends ii {
  constructor() {
    super(), this._pIcon = "", this._pLoadIcon = "", this._bmp = null, this._iconWidth = 0, this._iconHeight = 0, this._state = 0, this._offset = 0, this._statesCount = 0, this._plane = null, this._frames = /* @__PURE__ */ new Map(), this.iconLoaded = (t) => {
      const i = t.target;
      i.removeEventListener(e.SKIN_LOADED, this.iconLoaded), this.setIcon(i.getBitmap()), this.dispatchEvent(new e(e.SKIN_LOADED));
    }, this.initSkin();
  }
  set statesCount(t) {
    this._statesCount = t, this.draw();
  }
  get statesCount() {
    return this._statesCount;
  }
  /** AS3 state 语义（Phaser GameObject.state 同名，TS 要求 override）。
   * 基类构造器会在 super() 期间 stomp this.state=0（此时字段初始化器未执行），
   * 忽略之——fl 初始值由字段初始化器提供（见 SkinBox.set state 同款注释） */
  set state(t) {
    typeof this._state == "number" && this._state !== t && (this._state = t, this.draw());
  }
  get state() {
    return this._state;
  }
  set offset(t) {
    this._offset !== t && (this._offset = t, this.draw());
  }
  get offset() {
    return this._offset;
  }
  setIcon(t) {
    this._pIcon = "", this._pLoadIcon = "", this._bmp = t, this._bmp !== null && (this.buildIcon(), this.draw());
  }
  loadIcon(t) {
    if (this._pIcon = "", this._pLoadIcon = "", t !== "") {
      const i = a.loadSkin(t);
      i.getState() === B.STATE_LOADED ? this.setIcon(i.getBitmap()) : i.addEventListener(e.SKIN_LOADED, this.iconLoaded);
    }
  }
  clone() {
    const t = new u();
    return t.setIcon(this._bmp), t.offset = this._offset, t.statesCount = this._statesCount, t.state = 0, t;
  }
  initSkin() {
    this._pIcon !== "" && this._pLoadIcon === "" && (this._bmp = a.getBitmapData(this._pIcon), this._bmp !== null && this.buildIcon()), this._pLoadIcon !== "" && this.loadIcon(this._pLoadIcon), this.draw();
  }
  buildIcon() {
    if (this._bmp === null)
      return;
    this._iconWidth = this._bmp.width;
    let t = 1;
    const i = this._bmp.getPixel32(1, t);
    for (; t < this._bmp.height - 1 && this._bmp.getPixel32(1, t) === i; )
      t++;
    this._iconHeight = t + 1, this._statesCount === 0 && (this._statesCount = Math.floor(this._bmp.height / this._iconHeight) - 1), this.setSize(this._iconHeight, this._iconHeight);
  }
  draw() {
    if (this._bmp !== null && this._iconHeight > 0) {
      const t = this._offset + (this._state >= this._statesCount ? 0 : this._state);
      let i = this._frames.get(t);
      if (i === void 0) {
        const s = this._bmp.source, E = `lpf_${ti()}`;
        s.add(E, 0, 0, t * this._iconHeight, this._iconWidth, this._iconHeight), i = { textureKey: s.key, frameKey: E, width: this._iconWidth, height: this._iconHeight }, this._frames.set(t, i);
      }
      this._plane === null ? (this._plane = new A.GameObjects.Image(si(), 0, 0, i.textureKey, i.frameKey), this._plane.setOrigin(0, 0), this.addChild(this._plane)) : this._plane.setTexture(i.textureKey, i.frameKey);
    }
    super.draw();
  }
}
const h = class h extends ai {
  constructor() {
    super(), this._pSkinBack = "LiquidButton_back", this._pLoadBack = "", this._pIcon = "", this._pLoadIcon = "", this._state = 0, this._icon = null, this.iconLoadedHandler = (t) => {
      t.target.removeEventListener(e.SKIN_LOADED, this.iconLoadedHandler), super.drawLayout();
    }, this.back_loaded = (t) => {
      const i = t.target;
      i.removeEventListener(e.SKIN_LOADED, this.back_loaded), this._skinBack.setSkin(i.getBitmap()), this._skinBack.setSize(this._width, this._height), this._skinBack.drawNow(), this._skinEmphasized.setSkin(i.getBitmap()), this._skinEmphasized.state = h.SKIN_EMPHASIZED, this._skinEmphasized.drawNow(), this.drawBackground(), this.dispatchEvent(new e(e.SKIN_LOADED));
    }, r.register(this), this.initializeLiquid(), h._instances.push(this), this.initSkin();
  }
  setSkin(t, i) {
    switch (t) {
      case "back":
        this._pLoadBack = "", this._pSkinBack = "", this.skin_back(i);
        break;
    }
  }
  loadSkin(t, i) {
    if (!this.isLivePreview)
      switch (t) {
        case "back":
          this._pLoadBack = "", this._pSkinBack = "", this.load_back(i);
          break;
      }
  }
  setIcon(t, i = 0, s = 0) {
    t !== null && (this._icon = new u(), this._icon.offset = i, this._icon.statesCount = s, this._icon.setIcon(t), this.setStyle("icon", this._icon));
  }
  loadIcon(t, i = 0, s = 0) {
    t !== "" && (this._icon = new u(), this._icon.loadIcon(t), this._icon.offset = i, this._icon.statesCount = s, this._icon.addEventListener(e.SKIN_LOADED, this.iconLoadedHandler), this.setStyle("icon", this._icon));
  }
  setSize(t, i) {
    return this._skinBack !== void 0 && this._skinBack.isReady && (i = Math.max(i, this._skinBack.minHeight), t = Math.max(t, this._skinBack.minWidth)), super.setSize(t, i), this;
  }
  getTextColor() {
    return this._skinBack.getColor();
  }
  drawBackground() {
    this.background === null && (this.background = this._skinBack, this.addChildAt(this.background, 0));
    const t = {
      up: h.SKIN_UP,
      over: h.SKIN_OVER,
      down: h.SKIN_DOWN
    };
    this._state = t[this.mouseState], this.enabled || (this._state = h.SKIN_DISABLED), this.selected && (this._state += h.SKIN_SELECTED_UP), this._skinBack.state = this._state;
    const i = this.getStyleValue("textFormat");
    i !== null && (i.color = this._skinBack.getColor()), this.drawTextFormat();
  }
  drawIcon() {
    super.drawIcon(), this.icon !== null && this.icon instanceof u && (this.icon.state = this._state);
  }
  initializeLiquid() {
    this._skinBack = new b(this._width, this._height), this._skinEmphasized = new b(this._width, this._height), this.setStyle("upSkin", this._skinBack), this.setStyle("overSkin", this._skinBack), this.setStyle("downSkin", this._skinBack), this.setStyle("selectedUpSkin", this._skinBack), this.setStyle("selectedOverSkin", this._skinBack), this.setStyle("selectedDownSkin", this._skinBack), this.setStyle("downSkin", this._skinBack), this.setStyle("disabledSkin", this._skinBack), this.setStyle("emphasizedSkin", this._skinEmphasized), this.setStyle("focusRectSkin", r.getFocusSkinBox());
  }
  initSkin() {
    if (!this._skinBack.isReady && this._pLoadBack === "" && (this._skinBack.setSkin(a.getBitmapData(this._pSkinBack)), this._skinBack.setSize(this._width, this._height), this._skinEmphasized.setSkin(a.getBitmapData(this._pSkinBack)), this._skinEmphasized.state = h.SKIN_EMPHASIZED), this._pLoadBack !== "" && this.loadSkin("back", this._pLoadBack), this._pIcon !== "" && this._pLoadIcon === "") {
      const t = a.getBitmapData(this._pIcon);
      t !== null && this.setIcon(t);
    }
    this._pLoadIcon !== "" && this.loadIcon(this._pLoadIcon), this.invalidate(_.ALL);
  }
  drawEmphasized() {
    super.drawEmphasized(), this.emphasizedBorder !== null && (this.emphasizedBorder.visible = this._skinEmphasized.nbLayers() - 1 === h.SKIN_EMPHASIZED);
  }
  skin_back(t) {
    t !== null && (this._skinBack.setSkin(t), this._skinEmphasized.setSkin(t), this._skinEmphasized.state = h.SKIN_EMPHASIZED, this._skinBack.drawNow());
  }
  load_back(t) {
    if (t !== "") {
      const i = a.loadSkin(t);
      i.getState() === B.STATE_LOADED ? (this._skinBack.setSkin(i.getBitmap()), this._skinBack.drawNow(), this._skinEmphasized.setSkin(i.getBitmap()), this._skinEmphasized.state = h.SKIN_EMPHASIZED, this._skinEmphasized.drawNow(), this.drawBackground()) : i.addEventListener(e.SKIN_LOADED, this.back_loaded);
    }
  }
  static setDefaultSkin(t, i) {
    let s = h._instances.length;
    for (; --s >= 0; )
      h._instances[s].setSkin(t, i);
  }
  static loadDefaultSkin(t, i) {
    let s = h._instances.length;
    for (; --s >= 0; )
      h._instances[s].loadSkin(t, i);
  }
};
h.SKIN_UP = 0, h.SKIN_OVER = 1, h.SKIN_DOWN = 2, h.SKIN_DISABLED = 3, h.SKIN_SELECTED_UP = 4, h.SKIN_SELECTED_OVER = 5, h.SKIN_SELECTED_DOWN = 6, h.SKIN_SELECTED_DISABLED = 7, h.SKIN_EMPHASIZED = 8, h._instances = [];
let w = h;
const c = class c extends T {
  constructor() {
    super(), this._pSkinUpArrow = "LiquidScrollBar_arrow", this._pSkinDownArrow = "LiquidScrollBar_arrow", this._pSkinThumb = "LiquidScrollBar_thumb", this._pSkinTrack = "LiquidScrollBar_track", this._pSkinIcons = "LiquidScrollBar_icons", this._pLoadUpArrow = "", this._pLoadDownArrow = "", this._pLoadThumb = "", this._pLoadIcons = "", this._pLoadTrack = "", r.register(this), this.initializeLiquid(), c._instances.push(this), this.isLivePreview && this.setScrollProperties(50, 0, 200), this.width = Math.floor(this.width), this.height = Math.floor(this.height), this.initSkin();
  }
  /**
   * Set a BitmapData skin for the LiquidScrollBar instance.
   * id: upArrow / downArrow / track / thumb / icons
   */
  setSkin(t, i) {
    switch (t) {
      case "upArrow":
        this._pLoadUpArrow = "", this._pSkinUpArrow = "", this.upArrow.setSkin("back", i);
        break;
      case "downArrow":
        this._pLoadDownArrow = "", this._pSkinDownArrow = "", this.downArrow.setSkin("back", i);
        break;
      case "track":
        this._pLoadTrack = "", this._pSkinTrack = "", this.track.setSkin("back", i);
        break;
      case "thumb":
        this._pLoadThumb = "", this._pSkinThumb = "", this.thumb.setSkin("back", i);
        break;
      case "icons":
        this._pLoadIcons = "", this._pSkinIcons = "", this.upArrow.setIcon(i, c.ICON_UP_ARROW_OFFSET), this.downArrow.setIcon(i, c.ICON_DOWN_ARROW_OFFSET), this.thumb.setIcon(i, c.ICON_THUMB_OFFSET);
        break;
    }
  }
  /**
   * Load an external bitmap skin file and apply it to the LiquidScrollBar instance.
   */
  loadSkin(t, i) {
    if (!this.isLivePreview)
      switch (t) {
        case "upArrow":
          this._pLoadUpArrow = "", this._pSkinUpArrow = "", this.upArrow.loadSkin("back", i);
          break;
        case "downArrow":
          this._pLoadDownArrow = "", this._pSkinDownArrow = "", this.downArrow.loadSkin("back", i);
          break;
        case "track":
          this._pLoadTrack = "", this._pSkinTrack = "", this.track.loadSkin("back", i);
          break;
        case "thumb":
          this._pLoadThumb = "", this._pSkinThumb = "", this.thumb.loadSkin("back", i);
          break;
        case "icons":
          this._pLoadIcons = "", this._pSkinIcons = "", this.upArrow.loadIcon(i, c.ICON_UP_ARROW_OFFSET, c.ICON_STATES_COUNT), this.downArrow.loadIcon(i, c.ICON_DOWN_ARROW_OFFSET, c.ICON_STATES_COUNT), this.thumb.loadIcon(i, c.ICON_THUMB_OFFSET, c.ICON_STATES_COUNT);
          break;
      }
  }
  /**
   * initialize the liquid component
   */
  initializeLiquid() {
    this.setStyle("focusRectSkin", r.getFocusSkinBox());
  }
  /**
   * init skin
   */
  initSkin() {
    this._pSkinUpArrow !== "" && this._pLoadUpArrow === "" && this.setSkin("upArrow", a.getBitmapData(this._pSkinUpArrow)), this._pLoadUpArrow !== "" && this.loadSkin("upArrow", this._pLoadUpArrow), this._pSkinDownArrow !== "" && this._pLoadDownArrow === "" && this.setSkin("downArrow", a.getBitmapData(this._pSkinDownArrow)), this._pLoadDownArrow !== "" && this.loadSkin("downArrow", this._pLoadDownArrow), this._pSkinThumb !== "" && this._pLoadThumb === "" && this.setSkin("thumb", a.getBitmapData(this._pSkinThumb)), this._pLoadThumb !== "" && this.loadSkin("thumb", this._pLoadThumb), this._pSkinTrack !== "" && this._pLoadTrack === "" && this.setSkin("track", a.getBitmapData(this._pSkinTrack)), this._pLoadTrack !== "" && this.loadSkin("track", this._pLoadTrack), this._pSkinIcons !== "" && this._pLoadIcons === "" && this.setSkin("icons", a.getBitmapData(this._pSkinIcons)), this._pLoadIcons !== "" && this.loadSkin("icons", this._pLoadIcons), this.drawNow();
  }
  /**
   * configUI：把 fl 默认四个子部件整体替换为 LiquidButton
   */
  configUI() {
    super.configUI(), this.removeChild(this.track), this.track = new w(), this.track.move(0, 15), this.track.label = "", this.track.useHandCursor = !1, this.track.autoRepeat = !0, this.track.focusEnabled = !1, this.addChild(this.track), this.removeChild(this.upArrow), this.upArrow = new w(), this.upArrow.setSize(T.WIDTH, 15), this.upArrow.label = "", this.upArrow.move(0, 0), this.upArrow.autoRepeat = !0, this.upArrow.focusEnabled = !1, this.addChild(this.upArrow), this.removeChild(this.downArrow), this.downArrow = new w(), this.downArrow.setSize(T.WIDTH, 15), this.downArrow.label = "", this.downArrow.autoRepeat = !0, this.downArrow.focusEnabled = !1, this.addChild(this.downArrow), this.removeChild(this.thumb), this.thumb = new w(), this.thumb.label = "", this.thumb.setSize(T.WIDTH, 15), this.thumb.move(0, 15), this.thumb.focusEnabled = !1, this.addChild(this.thumb), this.upArrow.addEventListener(m.BUTTON_DOWN, this.scrollPressHandler), this.downArrow.addEventListener(m.BUTTON_DOWN, this.scrollPressHandler), this.track.addEventListener(m.BUTTON_DOWN, this.scrollPressHandler), this.thumb.addEventListener(P.MOUSE_DOWN, this.thumbPressHandler), this.enabled = !1;
  }
  /**
   * update thumb
   */
  updateThumb() {
    super.updateThumb(), this.thumb.height = Math.round(this.thumb.height);
  }
};
c.ICON_THUMB_OFFSET = 0, c.ICON_UP_ARROW_OFFSET = 4, c.ICON_DOWN_ARROW_OFFSET = 8, c.ICON_STATES_COUNT = 8, c._instances = [];
let N = c;
const k = class k extends ei {
  constructor() {
    super(), this._pSkinBack = "LiquidScrollPane_back", this._pLoadBack = "", this._pSkinUpArrow = "LiquidScrollBar_arrow", this._pSkinDownArrow = "LiquidScrollBar_arrow", this._pSkinThumb = "LiquidScrollBar_thumb", this._pSkinTrack = "LiquidScrollBar_track", this._pSkinIcons = "LiquidScrollBar_icons", this._pLoadUpArrow = "", this._pLoadDownArrow = "", this._pLoadThumb = "", this._pLoadIcons = "", this._pLoadTrack = "", this.back_loaded = (t) => {
      const i = t.target;
      i.removeEventListener(e.SKIN_LOADED, this.back_loaded), this._skinBack.setSkin(i.getBitmap()), this._skinBack.drawNow(), this.drawNow();
    }, r.register(this), this.initializeLiquid(), k._instances.push(this), this.validateNow(), this.initSkin();
  }
  setSkin(t, i) {
    switch (t) {
      case "upArrow":
        this._pLoadUpArrow = "", this._pSkinUpArrow = "", this._horizontalScrollBar.setSkin("upArrow", i), this._verticalScrollBar.setSkin("upArrow", i);
        break;
      case "downArrow":
        this._pLoadDownArrow = "", this._pSkinDownArrow = "", this._horizontalScrollBar.setSkin("downArrow", i), this._verticalScrollBar.setSkin("downArrow", i);
        break;
      case "track":
        this._pLoadTrack = "", this._pSkinTrack = "", this._horizontalScrollBar.setSkin("track", i), this._verticalScrollBar.setSkin("track", i);
        break;
      case "thumb":
        this._pLoadThumb = "", this._pSkinThumb = "", this._horizontalScrollBar.setSkin("thumb", i), this._verticalScrollBar.setSkin("thumb", i);
        break;
      case "icons":
        this._pLoadIcons = "", this._pSkinIcons = "", this._horizontalScrollBar.setSkin("icons", i), this._verticalScrollBar.setSkin("icons", i);
        break;
      case "back":
        this._pLoadBack = "", this._pSkinBack = "", this._skinBack.setSkin(i);
        break;
    }
  }
  loadSkin(t, i) {
    if (!this.isLivePreview)
      switch (t) {
        case "upArrow":
          this._pLoadUpArrow = "", this._pSkinUpArrow = "", this._horizontalScrollBar.loadSkin("upArrow", i), this._verticalScrollBar.loadSkin("upArrow", i);
          break;
        case "downArrow":
          this._pLoadDownArrow = "", this._pSkinDownArrow = "", this._horizontalScrollBar.loadSkin("downArrow", i), this._verticalScrollBar.loadSkin("downArrow", i);
          break;
        case "track":
          this._pLoadTrack = "", this._pSkinTrack = "", this._horizontalScrollBar.loadSkin("track", i), this._verticalScrollBar.loadSkin("track", i);
          break;
        case "thumb":
          this._pLoadThumb = "", this._pSkinThumb = "", this._horizontalScrollBar.loadSkin("thumb", i), this._verticalScrollBar.loadSkin("thumb", i);
          break;
        case "icons":
          this._pLoadIcons = "", this._pSkinIcons = "", this._horizontalScrollBar.loadSkin("icons", i), this._verticalScrollBar.loadSkin("icons", i);
          break;
        case "back":
          this._pLoadBack = "", this._pSkinBack = "", this.load_back(i);
          break;
      }
  }
  /**
   * draw
   * @private
   */
  draw() {
    const t = this.enabled ? k.SKIN_UP : k.SKIN_DISABLED;
    this._skinBack.state = t, super.draw();
  }
  /**
   * initialize the liquid component
   * @private
   */
  initializeLiquid() {
    this._skinBack = new b(this._width, this._height), this.setStyle("upSkin", this._skinBack), this.setStyle("disabledSkin", this._skinBack), this.setStyle("focusRectSkin", r.getFocusSkinBox());
  }
  /**
   * init skin
   * @private
   */
  initSkin() {
    !this._skinBack.isReady && this._pLoadBack === "" && this.setSkin("back", a.getBitmapData(this._pSkinBack)), this._pLoadBack !== "" && this.loadSkin("back", this._pLoadBack), this._pSkinUpArrow !== "" && this._pLoadUpArrow === "" && this.setSkin("upArrow", a.getBitmapData(this._pSkinUpArrow)), this._pLoadUpArrow !== "" && this.loadSkin("upArrow", this._pLoadUpArrow), this._pSkinDownArrow !== "" && this._pLoadDownArrow === "" && this.setSkin("downArrow", a.getBitmapData(this._pSkinDownArrow)), this._pLoadDownArrow !== "" && this.loadSkin("downArrow", this._pLoadDownArrow), this._pSkinThumb !== "" && this._pLoadThumb === "" && this.setSkin("thumb", a.getBitmapData(this._pSkinThumb)), this._pLoadThumb !== "" && this.loadSkin("thumb", this._pLoadThumb), this._pSkinTrack !== "" && this._pLoadTrack === "" && this.setSkin("track", a.getBitmapData(this._pSkinTrack)), this._pLoadTrack !== "" && this.loadSkin("track", this._pLoadTrack), this._pSkinIcons !== "" && this._pLoadIcons === "" && this.setSkin("icons", a.getBitmapData(this._pSkinIcons)), this._pLoadIcons !== "" && this.loadSkin("icons", this._pLoadIcons), this.invalidate(_.SIZE), this.drawNow();
  }
  /**
   * config UI
   * @private
   */
  configUI() {
    super.configUI(), this.removeChild(this._verticalScrollBar), this._verticalScrollBar = new N(), this._verticalScrollBar.addEventListener(v.SCROLL, this.handleScroll), this._verticalScrollBar.visible = !1, this._verticalScrollBar.lineScrollSize = this.defaultLineScrollSize, this.addChild(this._verticalScrollBar), this.copyStylesToChild(this._verticalScrollBar, U.SCROLL_BAR_STYLES), this.removeChild(this._horizontalScrollBar), this._horizontalScrollBar = new N(), this._horizontalScrollBar.direction = K.HORIZONTAL, this._horizontalScrollBar.addEventListener(v.SCROLL, this.handleScroll), this._horizontalScrollBar.visible = !1, this._horizontalScrollBar.lineScrollSize = this.defaultLineScrollSize, this.addChild(this._horizontalScrollBar), this.copyStylesToChild(this._horizontalScrollBar, U.SCROLL_BAR_STYLES);
  }
  /**
   * load back
   */
  load_back(t) {
    if (t !== "") {
      const i = a.loadSkin(t);
      i.getState() === B.STATE_LOADED ? (this._skinBack.setSkin(i.getBitmap()), this._skinBack.drawNow(), this.drawNow()) : i.addEventListener(e.SKIN_LOADED, this.back_loaded);
    }
  }
  static setDefaultSkin(t, i) {
    let s = k._instances.length;
    for (; --s >= 0; )
      k._instances[s].setSkin(t, i);
  }
  static loadDefaultSkin(t, i) {
    let s = k._instances.length;
    for (; --s >= 0; )
      k._instances[s].loadSkin(t, i);
  }
};
k.SKIN_UP = 0, k.SKIN_DISABLED = 1, k._instances = [];
let H = k;
const n = class n extends hi {
  constructor() {
    super(), this._pSkinIcon = "LiquidCheckBox_icon", this._pLoadIcon = "", this.icon_loaded = (t) => {
      const i = t.target;
      i.removeEventListener(e.SKIN_LOADED, this.icon_loaded), this._skinIcon.setSkin(i.getBitmap()), this._skinIcon.resetSize(), this.draw(), this.drawLayout();
    }, r.register(this), this.initializeLiquid(), n._instances.push(this), this.initSkin();
  }
  setSkin(t, i) {
    switch (t) {
      case "icon":
        this._pLoadIcon = "", this._pSkinIcon = "", this.skin_icon(i);
        break;
    }
  }
  loadSkin(t, i) {
    if (!this.isLivePreview)
      switch (t) {
        case "icon":
          this._pLoadIcon = "", this._pSkinIcon = "", this.load_icon(i);
          break;
      }
  }
  initializeLiquid() {
    this._skinIcon = new b(n.DEFAULT_ICON_WIDTH, n.DEFAULT_ICON_HEIGHT), this.setStyle("upIcon", this._skinIcon), this.setStyle("overIcon", this._skinIcon), this.setStyle("downIcon", this._skinIcon), this.setStyle("disabledIcon", this._skinIcon), this.setStyle("selectedUpIcon", this._skinIcon), this.setStyle("selectedOverIcon", this._skinIcon), this.setStyle("selectedDownIcon", this._skinIcon), this.setStyle("selectedDisabledIcon", this._skinIcon), this.setStyle("focusRectSkin", r.getFocusSkinBox());
  }
  initSkin() {
    !this._skinIcon.isReady && this._pLoadIcon === "" && this._skinIcon.setSkin(a.getBitmapData(this._pSkinIcon)), this._pLoadIcon !== "" && this.loadSkin("icon", this._pLoadIcon), this.invalidate(_.SIZE), this.drawNow();
  }
  draw() {
    let i = {
      up: n.SKIN_UP,
      over: n.SKIN_OVER,
      down: n.SKIN_DOWN
    }[this.mouseState];
    this.enabled || (i = n.SKIN_DISABLED), this.selected && (i += n.SKIN_SELECTED_UP), this._skinIcon.state = i;
    const s = this.getStyleValue("textFormat");
    s !== null && (s.color = this._skinIcon.getColor()), this.drawTextFormat(), super.draw();
  }
  skin_icon(t) {
    t !== null && (this._skinIcon.setSkin(t), this._skinIcon.resetSize());
  }
  load_icon(t) {
    if (t !== "") {
      const i = a.loadSkin(t);
      i.getState() === B.STATE_LOADED ? (this._skinIcon.setSkin(i.getBitmap()), this._skinIcon.drawNow(), this._skinIcon.resetSize(), this.draw(), this.drawLayout()) : i.addEventListener(e.SKIN_LOADED, this.icon_loaded);
    }
  }
  static setDefaultSkin(t, i) {
    let s = n._instances.length;
    for (; --s >= 0; )
      n._instances[s].setSkin(t, i);
  }
  static loadDefaultSkin(t, i) {
    let s = n._instances.length;
    for (; --s >= 0; )
      n._instances[s].loadSkin(t, i);
  }
};
n.SKIN_UP = 0, n.SKIN_OVER = 1, n.SKIN_DOWN = 2, n.SKIN_DISABLED = 3, n.SKIN_SELECTED_UP = 4, n.SKIN_SELECTED_OVER = 5, n.SKIN_SELECTED_DOWN = 6, n.SKIN_SELECTED_DISABLED = 7, n.DEFAULT_ICON_WIDTH = 14, n.DEFAULT_ICON_HEIGHT = 14, n._instances = [];
let W = n;
class ki extends w {
  constructor() {
    super(), this._listData = null, this._data = null, this.iconLoadedHandler = (t) => {
      t.target.removeEventListener(e.SKIN_LOADED, this.iconLoadedHandler), this.drawLayout();
    }, this.toggle = !0, this.focusEnabled = !1;
  }
  get listData() {
    return this._listData;
  }
  set listData(t) {
    if (this._listData = t, t !== null && (this.label = t.label, this._data !== null && this._data.icon != null && (this.icon !== null && (this.removeChild(this.icon), this.icon = null), this.icon !== this._data.icon))) {
      const i = this._data.icon;
      this.icon = i, i.addEventListener(e.SKIN_LOADED, this.iconLoadedHandler);
    }
  }
  get data() {
    return this._data;
  }
  set data(t) {
    this._data = t;
  }
  /**
   * toggle selected
   * AS3 签名 toggleSelected(event:MouseEvent)：fl 的点击事件参数在 TS shim 中
   * 不传递（BaseButton.pointertap 内部调用）；原版覆写无 enabled 检查、不派发
   * CHANGE（选中流程由 List 的渲染器 click 处理负责），1:1 保留。
   */
  toggleSelected() {
    this.selected = !this.selected;
  }
  /**
   * draw layout
   */
  drawLayout() {
    const t = Number(this.getStyleValue("textPadding"));
    let i = 0;
    if (this.icon !== null && (this.icon.x = t, this.icon.y = Math.round(this.height - this.icon.height >> 1), i = this.icon.width + t), this.label.length > 0) {
      if (this.textField !== null) {
        this.textField.visible = !0;
        const s = Math.max(0, this.width - i - t * 2);
        this.textField.width = s, this.textField.height = this.textField.textHeight + 4, this.textField.x = i + t, this.textField.y = Math.round(this.height - this.textField.height >> 1);
      }
    } else
      this.textField !== null && (this.textField.visible = !1);
    this.background !== null && (this.background.width = this.width, this.background.height = this.height);
  }
}
const f = class f extends ni {
  constructor() {
    super(), this._pSkinBack = "LiquidList_back", this._pLoadBack = "", this._pSkinUpArrow = "LiquidScrollBar_arrow", this._pSkinDownArrow = "LiquidScrollBar_arrow", this._pSkinThumb = "LiquidScrollBar_thumb", this._pSkinTrack = "LiquidScrollBar_track", this._pSkinIcons = "LiquidScrollBar_icons", this._pSkinCell = "LiquidList_cell", this._pLoadUpArrow = "", this._pLoadDownArrow = "", this._pLoadThumb = "", this._pLoadIcons = "", this._pLoadTrack = "", this._pLoadCell = "", this._cellBitmap = null, this._cellUrl = "", this._invalidateLiquidRenderers = !0, this.back_loaded = (t) => {
      const i = t.target;
      i.removeEventListener(e.SKIN_LOADED, this.back_loaded), this._skinBack.setSkin(i.getBitmap()), this._skinBack.drawNow(), this.drawNow();
    }, r.register(this), this.initializeLiquid(), f._instances.push(this), this.validateNow(), this.initSkin();
  }
  setSkin(t, i) {
    switch (t) {
      case "upArrow":
        this._pLoadUpArrow = "", this._pSkinUpArrow = "", this._horizontalScrollBar.setSkin("upArrow", i), this._verticalScrollBar.setSkin("upArrow", i);
        break;
      case "downArrow":
        this._pLoadDownArrow = "", this._pSkinDownArrow = "", this._horizontalScrollBar.setSkin("downArrow", i), this._verticalScrollBar.setSkin("downArrow", i);
        break;
      case "track":
        this._pLoadTrack = "", this._pSkinTrack = "", this._horizontalScrollBar.setSkin("track", i), this._verticalScrollBar.setSkin("track", i);
        break;
      case "thumb":
        this._pLoadThumb = "", this._pSkinThumb = "", this._horizontalScrollBar.setSkin("thumb", i), this._verticalScrollBar.setSkin("thumb", i);
        break;
      case "icons":
        this._pLoadIcons = "", this._pSkinIcons = "", this._horizontalScrollBar.setSkin("icons", i), this._verticalScrollBar.setSkin("icons", i);
        break;
      case "back":
        this._pSkinBack = "", this._pLoadBack = "", this._skinBack.setSkin(i);
        break;
      case "cell":
        this._pSkinCell = "", this._pLoadCell = "", this._cellBitmap = i, this.invalidateLiquidRenderers();
        break;
    }
  }
  loadSkin(t, i) {
    if (!this.isLivePreview)
      switch (t) {
        case "upArrow":
          this._pLoadUpArrow = "", this._pSkinUpArrow = "", this._horizontalScrollBar.loadSkin("upArrow", i), this._verticalScrollBar.loadSkin("upArrow", i);
          break;
        case "downArrow":
          this._pLoadDownArrow = "", this._pSkinDownArrow = "", this._horizontalScrollBar.loadSkin("downArrow", i), this._verticalScrollBar.loadSkin("downArrow", i);
          break;
        case "track":
          this._pLoadTrack = "", this._pSkinTrack = "", this._horizontalScrollBar.loadSkin("track", i), this._verticalScrollBar.loadSkin("track", i);
          break;
        case "thumb":
          this._pLoadThumb = "", this._pSkinThumb = "", this._horizontalScrollBar.loadSkin("thumb", i), this._verticalScrollBar.loadSkin("thumb", i);
          break;
        case "icons":
          this._pLoadIcons = "", this._pSkinIcons = "", this._horizontalScrollBar.loadSkin("icons", i), this._verticalScrollBar.loadSkin("icons", i);
          break;
        case "back":
          this._pLoadBack = "", this._pSkinBack = "", this.load_back(i);
          break;
        case "cell":
          this._pLoadCell = "", this._pSkinCell = "", this._cellUrl = i, this._cellBitmap !== null && (this._cellBitmap.dispose(), this._cellBitmap = null), this.invalidate(_.ALL);
          break;
      }
  }
  /**
   * initialize the liquid component
   * @private
   */
  initializeLiquid() {
    this._skinBack = new b(this._width, this._height), this.setStyle("skin", this._skinBack), this.setStyle("cellRenderer", ki), this.setStyle("focusRectSkin", r.getFocusSkinBox()), this.setStyle("contentPadding", 1);
  }
  /**
   * config UI
   * @private
   */
  configUI() {
    super.configUI(), this.removeChild(this._verticalScrollBar), this._verticalScrollBar = new N(), this._verticalScrollBar.addEventListener(v.SCROLL, this.handleScroll), this._verticalScrollBar.visible = !1, this._verticalScrollBar.lineScrollSize = this.defaultLineScrollSize, this.addChild(this._verticalScrollBar), this.copyStylesToChild(this._verticalScrollBar, U.SCROLL_BAR_STYLES), this.removeChild(this._horizontalScrollBar), this._horizontalScrollBar = new N(), this._horizontalScrollBar.direction = K.HORIZONTAL, this._horizontalScrollBar.addEventListener(v.SCROLL, this.handleScroll), this._horizontalScrollBar.visible = !1, this._horizontalScrollBar.lineScrollSize = this.defaultLineScrollSize, this.addChild(this._horizontalScrollBar), this.copyStylesToChild(this._horizontalScrollBar, U.SCROLL_BAR_STYLES);
  }
  /**
   * init skin
   * @private
   */
  initSkin() {
    !this._skinBack.isReady && this._pLoadBack === "" && this.setSkin("back", a.getBitmapData(this._pSkinBack)), this._pLoadBack !== "" && this.loadSkin("back", this._pLoadBack), this._pSkinUpArrow !== "" && this._pLoadUpArrow === "" && this.setSkin("upArrow", a.getBitmapData(this._pSkinUpArrow)), this._pLoadUpArrow !== "" && this.loadSkin("upArrow", this._pLoadUpArrow), this._pSkinDownArrow !== "" && this._pLoadDownArrow === "" && this.setSkin("downArrow", a.getBitmapData(this._pSkinDownArrow)), this._pLoadDownArrow !== "" && this.loadSkin("downArrow", this._pLoadDownArrow), this._pSkinThumb !== "" && this._pLoadThumb === "" && this.setSkin("thumb", a.getBitmapData(this._pSkinThumb)), this._pLoadThumb !== "" && this.loadSkin("thumb", this._pLoadThumb), this._pSkinTrack !== "" && this._pLoadTrack === "" && this.setSkin("track", a.getBitmapData(this._pSkinTrack)), this._pLoadTrack !== "" && this.loadSkin("track", this._pLoadTrack), this._pSkinIcons !== "" && this._pLoadIcons === "" && this.setSkin("icons", a.getBitmapData(this._pSkinIcons)), this._pLoadIcons !== "" && this.loadSkin("icons", this._pLoadIcons), this._pSkinCell !== "" && this._pLoadCell === "" && this.setSkin("cell", a.getBitmapData(this._pSkinCell)), this._pLoadCell !== "" && this.loadSkin("cell", this._pLoadCell), this.invalidate(_.SIZE);
  }
  /**
   * drawList
   * @private
   */
  drawList() {
    const t = this.activeCellRenderers.length;
    super.drawList(), this.activeCellRenderers.length !== t && (this._invalidateLiquidRenderers = !0), this._invalidateLiquidRenderers && this._cellBitmap !== null && this.invalidateLiquidRenderers(), this.activeCellRenderers.length !== t && this._cellUrl !== "" && (this.loadCellRenderers(this._cellUrl), this._cellUrl = "");
  }
  /**
   * invalidate liquid renderers
   * @private
   */
  invalidateLiquidRenderers() {
    this._invalidateLiquidRenderers = !1;
    for (let t = 0; t < this.activeCellRenderers.length; t++)
      this.activeCellRenderers[t].setSkin("back", this._cellBitmap);
  }
  /**
   * load cell renderers
   * @private
   */
  loadCellRenderers(t) {
    for (let i = 0; i < this.activeCellRenderers.length; i++)
      this.activeCellRenderers[i].loadSkin("back", t);
  }
  /**
   * load back
   */
  load_back(t) {
    if (t !== "") {
      const i = a.loadSkin(t);
      i.getState() === B.STATE_LOADED ? (this._skinBack.setSkin(i.getBitmap()), this._skinBack.drawNow(), this.drawNow()) : i.addEventListener(e.SKIN_LOADED, this.back_loaded);
    }
  }
  static setDefaultSkin(t, i) {
    let s = f._instances.length;
    for (; --s >= 0; )
      f._instances[s].setSkin(t, i);
  }
  static loadDefaultSkin(t, i) {
    let s = f._instances.length;
    for (; --s >= 0; )
      f._instances[s].loadSkin(t, i);
  }
};
f._instances = [];
let R = f;
const d = class d extends O {
  constructor() {
    super(), this._icon = null, this._mask = null, this._maskFilter = null, this._positionList = 0, this._listPosition = 0, this._pSkinBack = "LiquidComboBox_back", this._pSkinListBack = "LiquidList_back", this._pSkinUpArrow = "LiquidScrollBar_arrow", this._pSkinDownArrow = "LiquidScrollBar_arrow", this._pSkinThumb = "LiquidScrollBar_thumb", this._pSkinTrack = "LiquidScrollBar_track", this._pSkinIcons = "LiquidScrollBar_icons", this._pSkinCell = "LiquidList_cell", this._pLoadBack = "", this._pLoadListBack = "", this._pLoadUpArrow = "", this._pLoadDownArrow = "", this._pLoadThumb = "", this._pLoadTrack = "", this._pLoadIcons = "", this._pLoadCell = "", this.listOpenHandler = () => {
      const t = this._list;
      if (t === null)
        return;
      const i = this._positionList - t.y;
      Math.abs(i) > d.EPSILON ? t.y += i / d.OPEN_SPEED : (t.y = this._positionList, this.scene.events.off(A.Scenes.Events.POST_UPDATE, this.listOpenHandler));
    }, this.listCloseHandler = () => {
      const t = this._list, i = this.stage;
      if (t === null || i === null)
        return;
      const s = (this._listPosition === d.LIST_UP ? this._positionList + t.height : this._positionList - t.height) - t.y;
      Math.abs(s) > d.EPSILON ? t.y += s / d.OPEN_SPEED : (i.removeChildSafe(this._mask), i.removeChildSafe(t), t.y = this._positionList - t.height, t.visible = !1, this.scene.events.off(A.Scenes.Events.POST_UPDATE, this.listCloseHandler));
    }, this.stateChangedHandler = (t) => {
      t.target.parent === this.background && this.drawTextFormat();
    }, this.skinLoadedHandler = (t) => {
      this.drawTextFormat();
    }, r.register(this), this.initializeLiquid(), d._instances.push(this), this.validateNow(), this.initSkin();
  }
  setSkin(t, i) {
    switch (t) {
      case "back":
        this._pLoadBack = "", this._pSkinBack = "", this.background.setSkin("back", i);
        break;
      case "listBack":
        this._pLoadListBack = "", this._pSkinListBack = "", this._list.setSkin("back", i);
        break;
      case "upArrow":
        this._pLoadUpArrow = "", this._pSkinUpArrow = "", this._list.setSkin("upArrow", i);
        break;
      case "downArrow":
        this._pLoadDownArrow = "", this._pSkinDownArrow = "", this._list.setSkin("downArrow", i);
        break;
      case "track":
        this._pLoadTrack = "", this._pSkinTrack = "", this._list.setSkin("track", i);
        break;
      case "thumb":
        this._pLoadThumb = "", this._pSkinThumb = "", this._list.setSkin("thumb", i);
        break;
      case "icons":
        this._pLoadIcons = "", this._pSkinIcons = "", this._list.setSkin("icons", i);
        break;
      case "cell":
        this._pLoadCell = "", this._pSkinCell = "", this._list.setSkin("cell", i);
        break;
    }
  }
  loadSkin(t, i) {
    if (!this.isLivePreview)
      switch (t) {
        case "back":
          this._pSkinBack = "", this._pLoadBack = "", this.background.loadSkin("back", i);
          break;
        case "upArrow":
          this._pLoadUpArrow = "", this._pSkinUpArrow = "", this._list.loadSkin("upArrow", i);
          break;
        case "downArrow":
          this._pLoadDownArrow = "", this._pSkinDownArrow = "", this._list.loadSkin("downArrow", i);
          break;
        case "track":
          this._pLoadTrack = "", this._pSkinTrack = "", this._list.loadSkin("track", i);
          break;
        case "thumb":
          this._pLoadThumb = "", this._pSkinThumb = "", this._list.loadSkin("thumb", i);
          break;
        case "icons":
          this._pLoadIcons = "", this._pSkinIcons = "", this._list.loadSkin("icons", i);
          break;
        case "cell":
          this._pLoadCell = "", this._pSkinCell = "", this._list.loadSkin("cell", i);
          break;
        case "listBack":
          this._pLoadListBack = "", this._pSkinListBack = "", this._list.loadSkin("listBack", i);
          break;
      }
  }
  /**
   * open
   * @private
   */
  open() {
    super.open();
    const t = this._list;
    t === null || this.stage === null || (this.drawMask(), this.stage.addChild(this._mask), t.visible = !0, this._positionList = t.y, t.y = this._listPosition === d.LIST_UP ? t.y + t.height : t.y - t.height, this.scene.events.off(A.Scenes.Events.POST_UPDATE, this.listCloseHandler), this.scene.events.on(A.Scenes.Events.POST_UPDATE, this.listOpenHandler));
  }
  /**
   * close
   * @private
   */
  close() {
    const t = this.stage, i = this._list !== null && t !== null && t.contains(this._list);
    super.close();
    const s = this._list;
    i && s !== null && t !== null && (t.addChild(s), this.scene.events.off(A.Scenes.Events.POST_UPDATE, this.listOpenHandler), this.scene.events.on(A.Scenes.Events.POST_UPDATE, this.listCloseHandler));
  }
  /**
   * configUI
   * @private
   */
  configUI() {
    delete O.LIST_STYLES.skin, delete O.LIST_STYLES.focusRectSkin, super.configUI(), this.removeChild(this.background), this.background = new w(), this.background.focusEnabled = !1, this.copyStylesToChild(this.background, O.BACKGROUND_STYLES), this.background.addEventListener(P.MOUSE_DOWN, this.onToggleListVisibility), this.background.addEventListener(e.STATE_CHANGED, this.stateChangedHandler), this.background.addEventListener(e.SKIN_LOADED, this.skinLoadedHandler), this.background.label = "", this.addChild(this.background), this._list = null, this._list = new R(), this._list.focusEnabled = !1, this._list.visible = !1, this.copyStylesToChild(this._list, O.LIST_STYLES), this._list.dataProvider = this._dataProvider, this._list.labelField = this._labelField, this._list.labelFunction = this._labelFunction, this._list.addEventListener(C.CHANGE, this.onListChange), this._list.addEventListener(F.ITEM_CLICK, this.onListChange), this._list.addEventListener(F.ITEM_ROLL_OUT, this.passEvent), this._list.addEventListener(F.ITEM_ROLL_OVER, this.passEvent), this._list.verticalScrollBar.addEventListener(C.SCROLL, this.passEvent), this._mask = new A.GameObjects.Graphics(this.scene), this._mask.visible = !1, this._list.enableFilters();
    const t = this._list.filters;
    this._maskFilter = t !== null ? t.external.addMask(this._mask, !1) : null, this._maskFilter, this._icon = new u(), this.inputField !== null && this.addChild(this.inputField), this.addChild(this._mask);
  }
  /**
   * position list
   * @private
   */
  positionList() {
    const t = this._list;
    if (t === null || this.stage === null)
      return;
    const i = this.toGlobal({ x: 0, y: 0 }), s = this._width - (isNaN(this._dropdownWidth) ? t.width : this._dropdownWidth);
    t.x = Math.floor(i.x + s / 2), i.y + this._height + t.height > this.stage.stageHeight ? (t.y = i.y - t.height, this._listPosition = d.LIST_UP) : (t.y = i.y + this._height, this._listPosition = d.LIST_DOWN);
  }
  /**
   * drawTextFormat
   * @private
   */
  drawTextFormat() {
    const t = this.background.getTextColor();
    let i = this.getStyleValue(this._enabled ? "textFormat" : "disabledTextFormat");
    i === null && (i = new oi()), i.color = t, this.inputField !== null && this.inputField.textField !== null && (this.inputField.textField.defaultTextFormat = i, this.inputField.textField.setTextFormat(i));
  }
  /**
   * draw Mask
   * @private
   */
  drawMask() {
    const t = this._list;
    t !== null && (this._mask.clear().fillStyle(16777215, 1).fillRect(0, 0, t.width, t.height), this._mask.setPosition(t.x, t.y));
  }
  /**
   * draw TextField
   * @private
   */
  drawTextField() {
    super.drawTextField(), this.updateIcon(this.selectedIndex);
  }
  /**
   * keyDownHandler（AS3 仅转发 super，直译保留）
   * @private
   */
  keyDownHandler(t) {
    super.keyDownHandler(t);
  }
  /**
   * update Icon
   * @private
   */
  updateIcon(t = -1) {
    if (this._icon !== null && t >= 0) {
      const i = this._dataProvider.getItemAt(t), s = this.getStyleValue("textPadding");
      i !== null && i.icon != null ? (this.contains(this._icon) && this.removeChild(this._icon), this._icon = i.icon.clone(), this._icon.x = s, this._icon.y = Math.floor(this._height / 2 - this._icon.height / 2), this.inputField !== null && (this.inputField.x = this._icon.width + s * 2), this.addChild(this._icon)) : (this.contains(this._icon) && this.removeChild(this._icon), this.inputField !== null && (this.inputField.x = s), this._icon = null);
    }
  }
  /**
   * highlight cell
   * @private
   */
  highlightCell(t = -1) {
    super.highlightCell(t), this.updateIcon(t);
  }
  /**
   * initialize the liquid component
   * @private
   */
  initializeLiquid() {
    this.setStyle("focusRectSkin", r.getFocusSkinBox()), this.setStyle("skin", a.getBitmapData("LiquidList_back"));
  }
  /**
   * init skin
   * @private
   */
  initSkin() {
    this._pSkinBack !== "" && this._pLoadBack === "" && this.setSkin("back", a.getBitmapData(this._pSkinBack)), this._pLoadBack !== "" && this.loadSkin("back", this._pLoadBack), this._pSkinListBack !== "" && this._pLoadListBack === "" && this.setSkin("listBack", a.getBitmapData(this._pSkinListBack)), this._pLoadListBack !== "" && this.loadSkin("listBack", this._pLoadListBack), this._pSkinUpArrow !== "" && this._pLoadUpArrow === "" && this.setSkin("upArrow", a.getBitmapData(this._pSkinUpArrow)), this._pLoadUpArrow !== "" && this.loadSkin("upArrow", this._pLoadUpArrow), this._pSkinDownArrow !== "" && this._pLoadDownArrow === "" && this.setSkin("downArrow", a.getBitmapData(this._pSkinDownArrow)), this._pLoadDownArrow !== "" && this.loadSkin("downArrow", this._pLoadDownArrow), this._pSkinThumb !== "" && this._pLoadThumb === "" && this.setSkin("thumb", a.getBitmapData(this._pSkinThumb)), this._pLoadThumb !== "" && this.loadSkin("thumb", this._pLoadThumb), this._pSkinTrack !== "" && this._pLoadTrack === "" && this.setSkin("track", a.getBitmapData(this._pSkinTrack)), this._pLoadTrack !== "" && this.loadSkin("track", this._pLoadTrack), this._pSkinIcons !== "" && this._pLoadIcons === "" && this.setSkin("icons", a.getBitmapData(this._pSkinIcons)), this._pLoadIcons !== "" && this.loadSkin("icons", this._pLoadIcons), this._pSkinCell !== "" && this._pLoadCell === "" && this.setSkin("cell", a.getBitmapData(this._pSkinCell)), this._pLoadCell !== "" && this.loadSkin("cell", this._pLoadCell);
  }
};
d.OPEN_SPEED = 2, d.EPSILON = 0.5, d.LIST_UP = 0, d.LIST_DOWN = 1, d._instances = [];
let M = d;
const S = class S extends ri {
  constructor() {
    super(), this._pSkinBack = "LiquidLabel_back", this._pLoadBack = "", this._pIcon = "", this._pLoadIcon = "", this.Valign = "top", this._icon = null, this.background = null, this.tf = null, this.spaceIcontoLabel = 2, this.iconLoadedHandler = (t) => {
      t.target.removeEventListener(e.SKIN_LOADED, this.iconLoadedHandler), this.drawLayout();
    }, this.back_loaded = (t) => {
      const i = t.target;
      i.removeEventListener(e.SKIN_LOADED, this.back_loaded), this._skinBack.setSkin(i.getBitmap()), this._skinBack.drawNow(), this.drawBackground();
    }, r.register(this), this.initializeLiquid(), S._instances.push(this), this.initSkin();
  }
  setSkin(t, i) {
    switch (t) {
      case "back":
        this._pLoadBack = "", this._pSkinBack = "", this.skin_back(i);
        break;
    }
  }
  loadSkin(t, i) {
    if (!this.isLivePreview)
      switch (t) {
        case "back":
          this._pLoadBack = "", this._pSkinBack = "", this.load_back(i);
          break;
      }
  }
  setIcon(t, i = 0, s = 0) {
    t !== null && (this._icon = new u(), this._icon.offset = i, this._icon.statesCount = s, this._icon.setIcon(t), this.setStyle("icon", this._icon));
  }
  loadIcon(t, i = 0, s = 0) {
    t !== "" && (this._icon = new u(), this._icon.loadIcon(t), this._icon.offset = i, this._icon.statesCount = s, this._icon.addEventListener(e.SKIN_LOADED, this.iconLoadedHandler), this.setStyle("icon", this._icon));
  }
  draw() {
    this.isInvalid(_.STYLES, _.STATE) && (this.drawBackground(), this.drawIcon()), super.draw();
  }
  drawBackground() {
    this.background === null && (this.background = this._skinBack, this.addChildAt(this.background, 0));
    const t = this.enabled ? S.SKIN_UP : S.SKIN_DISABLED;
    this._skinBack.state = t, this.tf = this.getStyleValue("textFormat"), this.tf !== null && this._skinBack.isReady && (this.tf.color = this._skinBack.getColor()), this.drawTextFormat();
  }
  drawIcon() {
    const t = this._icon;
    this._icon !== null && this.addChildAt(this._icon, 1), t !== null && t !== this._icon && this.removeChild(t);
  }
  drawLayout() {
    if (this.background !== null && (this.background.width = this._width, this.background.height = this._height), super.drawLayout(), this.textField !== null) {
      if (this.textField.height = this.textField.textHeight + 2, this._icon !== null && this.tf !== null)
        switch (this.tf.align) {
          case z.CENTER:
            this.textField.position.set(this.actualWidth / 2 - this.textField.width / 2, this.textField.y), this._icon.position.set((this._width - this.textField.textWidth) / 2 - this._icon.width - this.spaceIcontoLabel, this._icon.y);
            break;
          case z.LEFT:
            this.textField.width = this._width - this._icon.width, this.textField.position.set(0, this.textField.y), this._icon.position.set(this.textField.x, this._icon.y), this.textField.position.set(this._icon.width, this.textField.y);
            break;
          case z.RIGHT:
            this.textField.position.set(-(this.textField.width - this.actualWidth), this.textField.y), this._icon.position.set(this._width - this.textField.textWidth - this._icon.width - this.spaceIcontoLabel, this._icon.y);
            break;
        }
      if (this._icon !== null)
        switch (this.Valign) {
          case "top":
            this.textField.position.set(this.textField.x, 0), this._icon.position.set(this._icon.x, 0);
            break;
          case "center":
            this.textField.position.set(this.textField.x, this._height / 2 - this.textField.height / 2 - 2), this._icon.position.set(this._icon.x, this._height / 2 - this.textField.height / 2 - 2);
            break;
          case "bottom":
            this.textField.position.set(this.textField.x, -(this.textField.height - this._height) - 2), this._icon.position.set(this._icon.x, -(this.textField.height - this._height) - 2);
            break;
        }
    }
  }
  initializeLiquid() {
    this._skinBack = new b(this._width, this._height), this.setStyle("upSkin", this._skinBack), this.setStyle("disabledSkin", this._skinBack), this.setStyle("focusRectSkin", r.getFocusSkinBox());
  }
  initSkin() {
    if (!this._skinBack.isReady && this._pLoadBack === "" && this._skinBack.setSkin(a.getBitmapData(this._pSkinBack)), this._pLoadBack !== "" && this.loadSkin("back", this._pLoadBack), this._pIcon !== "" && this._pLoadIcon === "") {
      const t = a.getBitmapData(this._pIcon);
      t !== null && this.setIcon(t);
    }
    this._pLoadIcon !== "" && this.loadIcon(this._pLoadIcon), this.invalidate(_.SIZE), this.drawNow();
  }
  skin_back(t) {
    t !== null && this._skinBack.setSkin(t);
  }
  load_back(t) {
    if (t !== "") {
      const i = a.loadSkin(t);
      i.getState() === B.STATE_LOADED ? (this._skinBack.setSkin(i.getBitmap()), this._skinBack.drawNow(), this.drawBackground()) : i.addEventListener(e.SKIN_LOADED, this.back_loaded);
    }
  }
  static setDefaultSkin(t, i) {
    let s = S._instances.length;
    for (; --s >= 0; )
      S._instances[s].setSkin(t, i);
  }
  static loadDefaultSkin(t, i) {
    let s = S._instances.length;
    for (; --s >= 0; )
      S._instances[s].loadSkin(t, i);
  }
};
S.SKIN_UP = 0, S.SKIN_DISABLED = 1, S._instances = [];
let V = S;
const o = class o extends ci {
  constructor() {
    super(), this._pSkinIcon = "LiquidRadioButton_icon", this._pLoadIcon = "", this.icon_loaded = (t) => {
      const i = t.target;
      i.removeEventListener(e.SKIN_LOADED, this.icon_loaded), this._skinIcon.setSkin(i.getBitmap()), this._skinIcon.resetSize(), this.draw(), this.drawLayout();
    }, r.register(this), this.initializeLiquid(), o._instances.push(this), this.initSkin();
  }
  setSkin(t, i) {
    switch (t) {
      case "icon":
        this._pLoadIcon = "", this._pSkinIcon = "", this.skin_icon(i);
        break;
    }
  }
  loadSkin(t, i) {
    if (!this.isLivePreview)
      switch (t) {
        case "icon":
          this._pLoadIcon = "", this._pSkinIcon = "", this.load_icon(i);
          break;
      }
  }
  initializeLiquid() {
    this._skinIcon = new b(o.DEFAULT_ICON_WIDTH, o.DEFAULT_ICON_HEIGHT), this.setStyle("upIcon", this._skinIcon), this.setStyle("overIcon", this._skinIcon), this.setStyle("downIcon", this._skinIcon), this.setStyle("disabledIcon", this._skinIcon), this.setStyle("selectedUpIcon", this._skinIcon), this.setStyle("selectedOverIcon", this._skinIcon), this.setStyle("selectedDownIcon", this._skinIcon), this.setStyle("selectedDisabledIcon", this._skinIcon), this.setStyle("focusRectSkin", r.getFocusSkinBox());
  }
  initSkin() {
    !this._skinIcon.isReady && this._pLoadIcon === "" && this._skinIcon.setSkin(a.getBitmapData(this._pSkinIcon)), this._pLoadIcon !== "" && this.loadSkin("icon", this._pLoadIcon), this.invalidate(_.SIZE), this.drawNow();
  }
  draw() {
    let i = {
      up: o.SKIN_UP,
      over: o.SKIN_OVER,
      down: o.SKIN_DOWN
    }[this.mouseState];
    this.enabled || (i = o.SKIN_DISABLED), this.selected && (i += o.SKIN_SELECTED_UP), this._skinIcon.state = i;
    const s = this.getStyleValue("textFormat");
    s !== null && (s.color = this._skinIcon.getColor()), this.drawTextFormat(), super.draw();
  }
  skin_icon(t) {
    t !== null && (this._skinIcon.setSkin(t), this._skinIcon.resetSize());
  }
  load_icon(t) {
    if (t !== "") {
      const i = a.loadSkin(t);
      i.getState() === B.STATE_LOADED ? (this._skinIcon.setSkin(i.getBitmap()), this._skinIcon.drawNow(), this._skinIcon.resetSize(), this.draw(), this.drawLayout()) : i.addEventListener(e.SKIN_LOADED, this.icon_loaded);
    }
  }
  static setDefaultSkin(t, i) {
    let s = o._instances.length;
    for (; --s >= 0; )
      o._instances[s].setSkin(t, i);
  }
  static loadDefaultSkin(t, i) {
    let s = o._instances.length;
    for (; --s >= 0; )
      o._instances[s].loadSkin(t, i);
  }
};
o.SKIN_UP = 0, o.SKIN_OVER = 1, o.SKIN_DOWN = 2, o.SKIN_DISABLED = 3, o.SKIN_SELECTED_UP = 4, o.SKIN_SELECTED_OVER = 5, o.SKIN_SELECTED_DOWN = 6, o.SKIN_SELECTED_DISABLED = 7, o.DEFAULT_ICON_WIDTH = 14, o.DEFAULT_ICON_HEIGHT = 14, o._instances = [];
let q = o;
const l = class l extends li {
  constructor() {
    super(), this._pSkinUpArrow = "LiquidScrollBar_arrow", this._pSkinDownArrow = "LiquidScrollBar_arrow", this._pSkinThumb = "LiquidScrollBar_thumb", this._pSkinTrack = "LiquidScrollBar_track", this._pSkinIcons = "LiquidScrollBar_icons", this._pLoadUpArrow = "", this._pLoadDownArrow = "", this._pLoadThumb = "", this._pLoadIcons = "", this._pLoadTrack = "", r.register(this), this.initializeLiquid(), l._instances.push(this), this.isLivePreview && this.setScrollProperties(50, 0, 200), this.width = Math.floor(this.width), this.height = Math.floor(this.height), this.initSkin();
  }
  /**
   * Set a BitmapData skin for the LiquidUIScrollBar instance.
   * id: upArrow / downArrow / track / thumb / icons
   */
  setSkin(t, i) {
    switch (t) {
      case "upArrow":
        this._pLoadUpArrow = "", this._pSkinUpArrow = "", this.upArrow.setSkin("back", i);
        break;
      case "downArrow":
        this._pLoadDownArrow = "", this._pSkinDownArrow = "", this.downArrow.setSkin("back", i);
        break;
      case "track":
        this._pLoadTrack = "", this._pSkinTrack = "", this.track.setSkin("back", i);
        break;
      case "thumb":
        this._pLoadThumb = "", this._pSkinThumb = "", this.thumb.setSkin("back", i);
        break;
      case "icons":
        this._pLoadIcons = "", this._pSkinIcons = "", this.upArrow.setIcon(i, l.ICON_UP_ARROW_OFFSET), this.downArrow.setIcon(i, l.ICON_DOWN_ARROW_OFFSET), this.thumb.setIcon(i, l.ICON_THUMB_OFFSET);
        break;
    }
  }
  /**
   * Load an external bitmap skin file and apply it to the LiquidUIScrollBar instance.
   */
  loadSkin(t, i) {
    if (!this.isLivePreview)
      switch (t) {
        case "upArrow":
          this._pLoadUpArrow = "", this._pSkinUpArrow = "", this.upArrow.loadSkin("back", i);
          break;
        case "downArrow":
          this._pLoadDownArrow = "", this._pSkinDownArrow = "", this.downArrow.loadSkin("back", i);
          break;
        case "track":
          this._pLoadTrack = "", this._pSkinTrack = "", this.track.loadSkin("back", i);
          break;
        case "thumb":
          this._pLoadThumb = "", this._pSkinThumb = "", this.thumb.loadSkin("back", i);
          break;
        case "icons":
          this._pLoadIcons = "", this._pSkinIcons = "", this.upArrow.loadIcon(i, l.ICON_UP_ARROW_OFFSET, l.ICON_STATES_COUNT), this.downArrow.loadIcon(i, l.ICON_DOWN_ARROW_OFFSET, l.ICON_STATES_COUNT), this.thumb.loadIcon(i, l.ICON_THUMB_OFFSET, l.ICON_STATES_COUNT);
          break;
      }
  }
  /**
   * initialize the liquid component
   */
  initializeLiquid() {
    this.setStyle("focusRectSkin", r.getFocusSkinBox());
  }
  /**
   * init skin
   */
  initSkin() {
    this._pSkinUpArrow !== "" && this._pLoadUpArrow === "" && this.setSkin("upArrow", a.getBitmapData(this._pSkinUpArrow)), this._pLoadUpArrow !== "" && this.loadSkin("upArrow", this._pLoadUpArrow), this._pSkinDownArrow !== "" && this._pLoadDownArrow === "" && this.setSkin("downArrow", a.getBitmapData(this._pSkinDownArrow)), this._pLoadDownArrow !== "" && this.loadSkin("downArrow", this._pLoadDownArrow), this._pSkinThumb !== "" && this._pLoadThumb === "" && this.setSkin("thumb", a.getBitmapData(this._pSkinThumb)), this._pLoadThumb !== "" && this.loadSkin("thumb", this._pLoadThumb), this._pSkinTrack !== "" && this._pLoadTrack === "" && this.setSkin("track", a.getBitmapData(this._pSkinTrack)), this._pLoadTrack !== "" && this.loadSkin("track", this._pLoadTrack), this._pSkinIcons !== "" && this._pLoadIcons === "" && this.setSkin("icons", a.getBitmapData(this._pSkinIcons)), this._pLoadIcons !== "" && this.loadSkin("icons", this._pLoadIcons), this.drawNow();
  }
  /**
   * configUI：把 fl 默认四个子部件整体替换为 LiquidButton
   */
  configUI() {
    super.configUI(), this.removeChild(this.track), this.track = new w(), this.track.move(0, 15), this.track.label = "", this.track.useHandCursor = !1, this.track.autoRepeat = !0, this.track.focusEnabled = !1, this.addChild(this.track), this.removeChild(this.upArrow), this.upArrow = new w(), this.upArrow.setSize(T.WIDTH, 15), this.upArrow.label = "", this.upArrow.move(0, 0), this.upArrow.autoRepeat = !0, this.upArrow.focusEnabled = !1, this.addChild(this.upArrow), this.removeChild(this.downArrow), this.downArrow = new w(), this.downArrow.setSize(T.WIDTH, 15), this.downArrow.label = "", this.downArrow.autoRepeat = !0, this.downArrow.focusEnabled = !1, this.addChild(this.downArrow), this.removeChild(this.thumb), this.thumb = new w(), this.thumb.label = "", this.thumb.setSize(T.WIDTH, 15), this.thumb.move(0, 15), this.thumb.focusEnabled = !1, this.addChild(this.thumb), this.upArrow.addEventListener(m.BUTTON_DOWN, this.scrollPressHandler), this.downArrow.addEventListener(m.BUTTON_DOWN, this.scrollPressHandler), this.track.addEventListener(m.BUTTON_DOWN, this.scrollPressHandler), this.thumb.addEventListener(P.MOUSE_DOWN, this.thumbPressHandler), this.enabled = !1;
  }
  /**
   * update thumb
   */
  updateThumb() {
    super.updateThumb(), this.thumb.height = Math.round(this.thumb.height);
  }
};
l.ICON_THUMB_OFFSET = 0, l.ICON_UP_ARROW_OFFSET = 4, l.ICON_DOWN_ARROW_OFFSET = 8, l.ICON_STATES_COUNT = 8, l._instances = [];
let y = l;
const D = class D extends x {
  constructor() {
    super(), this._pSkinBack = "LiquidTextArea_back", this._pLoadBack = "", this._pSkinUpArrow = "LiquidScrollBar_arrow", this._pSkinDownArrow = "LiquidScrollBar_arrow", this._pSkinThumb = "LiquidScrollBar_thumb", this._pSkinTrack = "LiquidScrollBar_track", this._pSkinIcons = "LiquidScrollBar_icons", this._pLoadUpArrow = "", this._pLoadDownArrow = "", this._pLoadThumb = "", this._pLoadIcons = "", this._pLoadTrack = "", this.back_loaded = (t) => {
      const i = t.target;
      i.removeEventListener(e.SKIN_LOADED, this.back_loaded), this._skinBack.setSkin(i.getBitmap()), this._skinBack.drawNow(), this.drawNow();
    }, r.register(this), this.initializeLiquid(), D._instances.push(this), this.initSkin();
  }
  /**
   * Set a BitmapData skin for the LiquidTextArea instance.
   * id: upArrow / downArrow / track / thumb / icons / back
   */
  setSkin(t, i) {
    switch (t) {
      case "upArrow":
        this._pLoadUpArrow = "", this._pSkinUpArrow = "", this._horizontalScrollBar.setSkin("upArrow", i), this._verticalScrollBar.setSkin("upArrow", i);
        break;
      case "downArrow":
        this._pLoadDownArrow = "", this._pSkinDownArrow = "", this._horizontalScrollBar.setSkin("downArrow", i), this._verticalScrollBar.setSkin("downArrow", i);
        break;
      case "track":
        this._pLoadTrack = "", this._pSkinTrack = "", this._horizontalScrollBar.setSkin("track", i), this._verticalScrollBar.setSkin("track", i);
        break;
      case "thumb":
        this._pLoadThumb = "", this._pSkinThumb = "", this._horizontalScrollBar.setSkin("thumb", i), this._verticalScrollBar.setSkin("thumb", i);
        break;
      case "icons":
        this._pLoadIcons = "", this._pSkinIcons = "", this._horizontalScrollBar.setSkin("icons", i), this._verticalScrollBar.setSkin("icons", i);
        break;
      case "back":
        this._pSkinBack = "", this._pLoadBack = "", this._skinBack.setSkin(i);
        break;
    }
  }
  /**
   * Load an external bitmap skin file and apply it to the LiquidTextArea instance.
   */
  loadSkin(t, i) {
    if (!this.isLivePreview)
      switch (t) {
        case "upArrow":
          this._pLoadUpArrow = "", this._pSkinUpArrow = "", this._horizontalScrollBar.loadSkin("upArrow", i), this._verticalScrollBar.loadSkin("upArrow", i);
          break;
        case "downArrow":
          this._pLoadDownArrow = "", this._pSkinDownArrow = "", this._horizontalScrollBar.loadSkin("downArrow", i), this._verticalScrollBar.loadSkin("downArrow", i);
          break;
        case "track":
          this._pLoadTrack = "", this._pSkinTrack = "", this._horizontalScrollBar.loadSkin("track", i), this._verticalScrollBar.loadSkin("track", i);
          break;
        case "thumb":
          this._pLoadThumb = "", this._pSkinThumb = "", this._horizontalScrollBar.loadSkin("thumb", i), this._verticalScrollBar.loadSkin("thumb", i);
          break;
        case "icons":
          this._pLoadIcons = "", this._pSkinIcons = "", this._horizontalScrollBar.loadSkin("icons", i), this._verticalScrollBar.loadSkin("icons", i);
          break;
        case "back":
          this._pLoadBack = "", this._pSkinBack = "", this.load_back(i);
          break;
      }
  }
  /**
   * initialize the liquid component
   */
  initializeLiquid() {
    this._skinBack = new b(this._width, this._height), this.setStyle("skin", this._skinBack), this.setStyle("contentPadding", 1);
  }
  /**
   * config UI
   */
  configUI() {
    super.configUI(), this.removeChild(this._verticalScrollBar), this._verticalScrollBar = new y(), this._verticalScrollBar.name = "V", this._verticalScrollBar.visible = !1, this._verticalScrollBar.focusEnabled = !1, this.copyStylesToChild(this._verticalScrollBar, x.SCROLL_BAR_STYLES), this._verticalScrollBar.addEventListener(v.SCROLL, this.handleScroll), this.addChild(this._verticalScrollBar), this.removeChild(this._horizontalScrollBar), this._horizontalScrollBar = new y(), this._horizontalScrollBar.name = "H", this._horizontalScrollBar.visible = !1, this._horizontalScrollBar.focusEnabled = !1, this._horizontalScrollBar.direction = K.HORIZONTAL, this.copyStylesToChild(this._horizontalScrollBar, x.SCROLL_BAR_STYLES), this._horizontalScrollBar.addEventListener(v.SCROLL, this.handleScroll), this.addChild(this._horizontalScrollBar), this._horizontalScrollBar.scrollTarget = this.textField, this._verticalScrollBar.scrollTarget = this.textField;
  }
  /**
   * draw background
   */
  drawBackground() {
    this.background === null && (this.background = this._skinBack, this.addChildAt(this.background, 0));
    let t = D.SKIN_UP;
    this.enabled || (t = D.SKIN_DISABLED), this._skinBack.state = t;
  }
  /**
   * init skin
   */
  initSkin() {
    !this._skinBack.isReady && this._pLoadBack === "" && this.setSkin("back", a.getBitmapData(this._pSkinBack)), this._pLoadBack !== "" && this.loadSkin("back", this._pLoadBack), this._pSkinUpArrow !== "" && this._pLoadUpArrow === "" && this.setSkin("upArrow", a.getBitmapData(this._pSkinUpArrow)), this._pLoadUpArrow !== "" && this.loadSkin("upArrow", this._pLoadUpArrow), this._pSkinDownArrow !== "" && this._pLoadDownArrow === "" && this.setSkin("downArrow", a.getBitmapData(this._pSkinDownArrow)), this._pLoadDownArrow !== "" && this.loadSkin("downArrow", this._pLoadDownArrow), this._pSkinThumb !== "" && this._pLoadThumb === "" && this.setSkin("thumb", a.getBitmapData(this._pSkinThumb)), this._pLoadThumb !== "" && this.loadSkin("thumb", this._pLoadThumb), this._pSkinTrack !== "" && this._pLoadTrack === "" && this.setSkin("track", a.getBitmapData(this._pSkinTrack)), this._pLoadTrack !== "" && this.loadSkin("track", this._pLoadTrack), this._pSkinIcons !== "" && this._pLoadIcons === "" && this.setSkin("icons", a.getBitmapData(this._pSkinIcons)), this._pLoadIcons !== "" && this.loadSkin("icons", this._pLoadIcons), this.invalidate(_.SIZE);
  }
  // —— 私有方法 ——
  /**
   * load back
   */
  load_back(t) {
    if (t !== "") {
      const i = a.loadSkin(t);
      i.getState() === B.STATE_LOADED ? (this._skinBack.setSkin(i.getBitmap()), this._skinBack.drawNow(), this.drawNow()) : i.addEventListener(e.SKIN_LOADED, this.back_loaded);
    }
  }
};
D.SKIN_UP = 0, D.SKIN_DISABLED = 1, D._instances = [];
let G = D;
const p = class p extends di {
  constructor() {
    super(), this._pSkinBack = "LiquidTextInput_back", this._pLoadBack = "", this._pIcon = "", this._pLoadIcon = "", this._icon = null, this.iconLoadedHandler = (t) => {
      t.target.removeEventListener(e.SKIN_LOADED, this.iconLoadedHandler), this.drawLayout();
    }, this.back_loaded = (t) => {
      const i = t.target;
      i.removeEventListener(e.SKIN_LOADED, this.back_loaded), this._skinBack.setSkin(i.getBitmap()), this._skinBack.drawNow(), this.drawBackground();
    }, r.register(this), this.initializeLiquid(), p._instances.push(this), this.initSkin();
  }
  /**
   * Set a BitmapData skin for the LiquidTextInput instance.
   * id: back
   */
  setSkin(t, i) {
    switch (t) {
      case "back":
        this._pLoadBack = "", this._pSkinBack = "", this.skin_back(i);
        break;
    }
  }
  /**
   * Load an external bitmap skin file and apply it to the LiquidTextInput instance.
   */
  loadSkin(t, i) {
    if (!this.isLivePreview)
      switch (t) {
        case "back":
          this._pLoadBack = "", this._pSkinBack = "", this.load_back(i);
          break;
      }
  }
  /**
   * Create a LiquidIcon for the text input instance.
   */
  setIcon(t, i = 0, s = 0) {
    t !== null && (this._icon = new u(), this._icon.offset = i, this._icon.statesCount = s, this._icon.setIcon(t), this.setStyle("icon", this._icon));
  }
  /**
   * Load an external bitmap source file and create a LiquidIcon instance.
   */
  loadIcon(t, i = 0, s = 0) {
    t !== "" && (this._icon = new u(), this._icon.loadIcon(t), this._icon.offset = i, this._icon.statesCount = s, this._icon.addEventListener(e.SKIN_LOADED, this.iconLoadedHandler), this.setStyle("icon", this._icon));
  }
  /**
   * configUI
   */
  configUI() {
    super.configUI();
  }
  draw() {
    this.isInvalid(_.STYLES, _.STATE) && this.drawIcon(), super.draw();
  }
  /**
   * draw background
   */
  drawBackground() {
    this.background === null && (this.background = this._skinBack, this.addChildAt(this.background, 0));
    let t = p.SKIN_UP;
    this.enabled || (t = p.SKIN_DISABLED), this._skinBack.state = t;
    const i = this.getStyleValue("textFormat");
    i !== null && (i.color = this._skinBack.getColor()), this.drawTextFormat();
  }
  /**
   * draw icon（原版 oldIcon != _icon 恒 false，为死代码，原样保留）
   */
  drawIcon() {
    const t = this._icon;
    this._icon !== null && this.addChildAt(this._icon, 1), t !== null && t !== this._icon && this.removeChild(t);
  }
  /**
   * override drawLayout
   */
  drawLayout() {
    if (super.drawLayout(), this._icon !== null) {
      const t = this.getStyleValue("textPadding") ?? 5;
      this.textField !== null && (this.textField.width -= this._icon.width, this.textField.x += this._icon.width), this._icon.position.set(t, t);
    }
  }
  /**
   * initialize the liquid component
   */
  initializeLiquid() {
    this._skinBack = new b(this._width, this._height), this.setStyle("upSkin", this._skinBack), this.setStyle("disabledSkin", this._skinBack), this.setStyle("focusRectSkin", r.getFocusSkinBox());
  }
  /**
   * init skin
   */
  initSkin() {
    if (!this._skinBack.isReady && this._pLoadBack === "" && this._skinBack.setSkin(a.getBitmapData(this._pSkinBack)), this._pLoadBack !== "" && this.loadSkin("back", this._pLoadBack), this._pIcon !== "" && this._pLoadIcon === "") {
      const t = a.getBitmapData(this._pIcon);
      t !== null && this.setIcon(t);
    }
    this._pLoadIcon !== "" && this.loadIcon(this._pLoadIcon), this.invalidate(_.SIZE), this.drawNow();
  }
  // —— 私有方法 ——
  /**
   * skin back
   */
  skin_back(t) {
    t !== null && this._skinBack.setSkin(t);
  }
  /**
   * load back
   */
  load_back(t) {
    if (t !== "") {
      const i = a.loadSkin(t);
      i.getState() === B.STATE_LOADED ? (this._skinBack.setSkin(i.getBitmap()), this._skinBack.drawNow(), this.drawBackground()) : i.addEventListener(e.SKIN_LOADED, this.back_loaded);
    }
  }
  // —— 静态方法 ——
  /**
   * Set a BitmapData skin for all LiquidTextInput instances.
   */
  static setDefaultSkin(t, i) {
    let s = p._instances.length;
    for (; --s >= 0; )
      p._instances[s].setSkin(t, i);
  }
  /**
   * Load an external bitmap skin file and apply it to all LiquidTextInput instances.
   */
  static loadDefaultSkin(t, i) {
    let s = p._instances.length;
    for (; --s >= 0; )
      p._instances[s].loadSkin(t, i);
  }
};
p.SKIN_UP = 0, p.SKIN_DISABLED = 1, p._instances = [];
let Z = p;
const I = class I extends C {
  constructor(t, i = !1, s = !1) {
    super(t, i, s);
  }
  clone() {
    return new I(this.type, this.bubbles, this.cancelable);
  }
};
I.ROLL_OVER = "ButtonRollOverEvent", I.ROLL_OUT = "ButtonRollOutEvent", I.RELEASE = "ButtonReleaseEvent", I.CLICK = "ButtonClickEvent", I.RELEASE_OUTSIDE = "ButtonReleaseOutsideEvent", I.DOWN = "ButtonDownEvent";
let Y = I;
const g = class g extends C {
  constructor(t, i = !1, s = !1, E = null) {
    super(t, i, s), this.item = E;
  }
  clone() {
    return new g(this.type, this.bubbles, this.cancelable, this.item);
  }
};
g.DATA_CHANGE = "DataChangeEvent", g.ITEM_ADDED = "DataItemAddedEvent", g.ITEM_REMOVED = "DataItemRemovedEvent";
let j = g;
const L = class L extends C {
  constructor(t, i = !1, s = !1) {
    super(t, i, s);
  }
  clone() {
    return new L(this.type, this.bubbles, this.cancelable);
  }
};
L.SCROLL_START = "LiquidScrollStartEvent", L.SCROLL_STOP = "LiquidScrollStopEvent", L.SCROLL_CHANGE = "LiquidScrollChangeEvent", L.PAGE_UP = "LiquidScrollPageUpEvent", L.PAGE_DOWN = "LiquidScrollPageDownEvent", L.INVALID_RANGE = "LiquidInvalidRangeEvent", L.VALID_RANGE = "LiquidValidRangeEvent";
let J = L;
class wi extends _i {
  constructor(t, i, s, E, $, Q = 0) {
    super(t, i, s, E, $, Q);
  }
}
export {
  Y as ButtonEvent,
  j as DataEvent,
  Ii as LiquidBitmap,
  w as LiquidButton,
  bi as LiquidCell,
  Bi as LiquidCellEvent,
  W as LiquidCheckBox,
  M as LiquidComboBox,
  Ai as LiquidError,
  e as LiquidEvent,
  fi as LiquidGrid,
  u as LiquidIcon,
  V as LiquidLabel,
  R as LiquidList,
  ki as LiquidListCellRenderer,
  wi as LiquidListData,
  r as LiquidManager,
  Di as LiquidMapper,
  q as LiquidRadioButton,
  Ti as LiquidRow,
  Ei as LiquidRowType,
  N as LiquidScrollBar,
  H as LiquidScrollPane,
  G as LiquidTextArea,
  Z as LiquidTextInput,
  y as LiquidUIScrollBar,
  J as ScrollerEvent,
  a as SkinAsset,
  b as SkinBox,
  B as SkinLoader
};
//# sourceMappingURL=liquid.js.map

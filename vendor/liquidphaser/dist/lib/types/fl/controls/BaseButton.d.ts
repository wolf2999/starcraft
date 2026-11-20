/**
 * fl.controls.BaseButton shim（Phaser 4 适配版）。
 * fl 源码不在 pngas 内（Flash IDE 自带），此处按 fl 公开行为重建：
 * - fl MouseEvent（经 PointerBridge 三阶段派发）→ mouseState(up/over/down) 状态机
 *   + ComponentEvent.BUTTON_DOWN；移植差异：pixi 版直接挂 pixi 指针事件，Phaser 版
 *   走 AS3 语义的 MOUSE_DOWN/MOUSE_UP/MOUSE_OVER/MOUSE_OUT/CLICK（更贴 fl 原始路径）；
 * - 释放命中派发 MouseEvent.CLICK（bubbles=true，桥已含按下/释放同子树判定），
 *   toggle 时翻 selected 并派发 Event.CHANGE；
 * - draw() 按 invalidation 分类：STYLES|STATE → drawBackground/drawIcon/drawTextFormat；
 *   SIZE → drawLayout（background 铺满）。
 * 与 Flash 的差异（均已在注释标注）：按压拖出组件时保持 down 态（同 Flash）；
 * disabled 用事件处理里的 enabled 检查模拟 mouseEnabled=false。
 */
import { UIComponent } from '../core/UIComponent';
import { DisplayObject } from '../display/DisplayObject';
export declare class BaseButton extends UIComponent {
    protected static defaultStyles: Record<string, unknown>;
    protected background: DisplayObject | null;
    protected _selected: boolean;
    protected _toggle: boolean;
    protected _mouseState: string;
    /** 按压中标记（拖出组件时保持 down 态） */
    private _pressing;
    /** fl autoRepeat：按住时重复派发 BUTTON_DOWN（首次 repeatDelay，随后 repeatInterval） */
    protected _autoRepeat: boolean;
    private _repeatTimeoutId;
    private _repeatIntervalId;
    /** 最近一次按下的组件局部坐标（TS 附加；ScrollBar 轨道翻页方向判定用） */
    private _lastPressLocalX;
    private _lastPressLocalY;
    constructor();
    /** fl autoRepeat：按住按钮重复派发 BUTTON_DOWN */
    get autoRepeat(): boolean;
    set autoRepeat(value: boolean);
    /** fl useHandCursor：映射到 pixi cursor（fl 默认 false） */
    get useHandCursor(): boolean;
    set useHandCursor(value: boolean);
    /** 最近一次按下的组件局部 Y（TS 附加，供 ScrollBar 轨道翻页判定） */
    get lastPressLocalX(): number;
    get lastPressLocalY(): number;
    /** fl BaseButton autoRepeat 计时：首次 repeatDelay 后，每 repeatInterval 派发 BUTTON_DOWN */
    private _startRepeat;
    private _stopRepeat;
    get mouseState(): string;
    set mouseState(value: string);
    get toggle(): boolean;
    set toggle(value: boolean);
    get selected(): boolean;
    set selected(value: boolean);
    /** fl LabelButton.toggleSelected：toggle 按钮点击翻转 selected 并派发 CHANGE */
    protected toggleSelected(): void;
    protected draw(): void;
    /** 当前 mouseState/selected/enabled 对应的皮肤样式键 */
    protected get skinStyleName(): string;
    /** 当前 mouseState/selected/enabled 对应的图标样式键 */
    protected get iconStyleName(): string;
    protected drawBackground(): void;
    /** fl BaseButton.drawIcon 为空占位（由 LabelButton 覆写） */
    protected drawIcon(): void;
    /** fl BaseButton.drawTextFormat 为空占位（由 LabelButton 覆写） */
    protected drawTextFormat(): void;
    protected drawLayout(): void;
}

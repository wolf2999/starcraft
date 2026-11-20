import { UIComponent } from '../core/UIComponent';
import { ComponentEvent } from '../events/ComponentEvent';
import { MouseEvent } from '../events/MouseEvent';
import { BaseButton } from './BaseButton';
import { LabelButton } from './LabelButton';
export declare class ScrollBar extends UIComponent {
    static readonly WIDTH: number;
    protected static defaultStyles: Record<string, unknown>;
    /** 子部件样式映射：键=子组件样式名，值=ScrollBar 样式名（fl 语义） */
    protected static UP_ARROW_STYLES: Record<string, string>;
    protected static DOWN_ARROW_STYLES: Record<string, string>;
    protected static TRACK_STYLES: Record<string, string>;
    protected static THUMB_STYLES: Record<string, string>;
    protected upArrow: BaseButton;
    protected downArrow: BaseButton;
    protected track: BaseButton;
    protected thumb: LabelButton;
    protected _pageSize: number;
    protected _pageScrollSize: number;
    protected _lineScrollSize: number;
    protected _minScrollPosition: number;
    protected _maxScrollPosition: number;
    protected _scrollPosition: number;
    protected _direction: string;
    /** 拖拽时指针相对 thumb 顶边的偏移 */
    protected _thumbScrollOffset: number;
    protected inDrag: boolean;
    protected configUI(): void;
    setScrollProperties(pageSize: number, minScrollPosition: number, maxScrollPosition: number, pageScrollSize?: number): void;
    get pageSize(): number;
    set pageSize(value: number);
    /** 0 时回退 pageSize（fl 文档语义） */
    get pageScrollSize(): number;
    set pageScrollSize(value: number);
    get lineScrollSize(): number;
    set lineScrollSize(value: number);
    get minScrollPosition(): number;
    set minScrollPosition(value: number);
    get maxScrollPosition(): number;
    set maxScrollPosition(value: number);
    get scrollPosition(): number;
    set scrollPosition(value: number);
    get direction(): string;
    set direction(value: string);
    /** 位置变更统一入口：钳制 + DATA 失效 + 按需派发 ScrollEvent（fl 语义） */
    protected setScrollPosition(newScrollPosition: number, fireEvent: boolean): void;
    protected draw(): void;
    /** 垂直：上下箭头 + 中间轨道；水平：左右箭头 + 中间轨道 */
    protected drawLayout(): void;
    /** thumb 尺寸/位置/可见性 + 子部件 enabled（fl 行为级重建） */
    protected updateThumb(): void;
    /** arrows/track BUTTON_DOWN：箭头按 lineScrollSize，轨道按指针相对 thumb 翻页。
     * 箭头函数字段：AS3 方法闭包自动绑定实例，TS 直译必须显式绑定
     *（fl EventDispatcher 以 listener.call(dispatcher, event) 调用，原型方法的 this 会丢失） */
    protected scrollPressHandler: (e: ComponentEvent) => void;
    /** thumb 按下：记录 thumb 内偏移并开始全局拖拽 */
    protected thumbPressHandler: (e: MouseEvent) => void;
    private _unbindGlobalPointer;
    private thumbMoveHandler;
    private thumbReleaseHandler;
}

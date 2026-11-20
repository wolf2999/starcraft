import { DisplayObject } from '../display/DisplayObject';
import { ScrollEvent } from '../events/ScrollEvent';
import { TextField } from '../text/TextField';
import { InputAdapter } from '../text/InputAdapter';
import { UIComponent } from '../core/UIComponent';
import { UIScrollBar } from './UIScrollBar';
export declare class TextArea extends UIComponent {
    protected static defaultStyles: Record<string, unknown>;
    /** 拷给滚动条的样式映射（键=子组件样式名，值=TextArea 样式名，fl 语义） */
    protected static SCROLL_BAR_STYLES: Record<string, string>;
    protected background: DisplayObject | null;
    protected textField: TextField | null;
    protected _verticalScrollBar: UIScrollBar;
    protected _horizontalScrollBar: UIScrollBar;
    protected _adapter: InputAdapter | null;
    protected _text: string;
    protected _html: boolean;
    protected _savedHTML: string;
    protected _editable: boolean;
    protected _displayAsPassword: boolean;
    protected _maxChars: number;
    protected _restrict: string;
    protected _multiline: boolean;
    protected _wordWrap: boolean;
    protected configUI(): void;
    get text(): string;
    set text(value: string);
    /** htmlText 行为级简化：去标签按纯文本渲染 */
    get htmlText(): string;
    set htmlText(value: string);
    get length(): number;
    get multiline(): boolean;
    set multiline(value: boolean);
    get wordWrap(): boolean;
    set wordWrap(value: boolean);
    get editable(): boolean;
    set editable(value: boolean);
    get displayAsPassword(): boolean;
    set displayAsPassword(value: boolean);
    get maxChars(): number;
    set maxChars(value: number);
    /** fl restrict：字符过滤模式，M3 仅存值（DOM 侧不做过滤） */
    get restrict(): string;
    set restrict(value: string);
    get verticalScrollPosition(): number;
    set verticalScrollPosition(value: number);
    get maxVerticalScrollPosition(): number;
    get horizontalScrollPosition(): number;
    set horizontalScrollPosition(value: number);
    get maxHorizontalScrollPosition(): number;
    /** 覆写 setter 必须同时提供 getter（JS set-only accessor 读取返回 undefined） */
    get enabled(): boolean;
    set enabled(value: boolean);
    /** fl TextArea.setFocus：让隐藏 DOM textarea 获得焦点（onFocus → notifyFocus 回流） */
    setFocus(): void;
    protected draw(): void;
    /** fl drawBackground 重建：enabled 切换 upSkin/disabledSkin */
    protected drawBackground(): void;
    protected drawTextFormat(): void;
    /** 滚动条按内容自动显隐 + textField/滚动条布局（fl 行为级重建） */
    protected drawLayout(): void;
    /** 滚动条滚动 → 失效重排（滚动条与 textField 的值同步由 UIScrollBar 完成） */
    protected handleScroll: (_e: ScrollEvent) => void;
}

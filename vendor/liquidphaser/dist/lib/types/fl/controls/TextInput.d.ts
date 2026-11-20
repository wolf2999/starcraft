import { DisplayObject } from '../display/DisplayObject';
import { TextField } from '../text/TextField';
import { InputAdapter } from '../text/InputAdapter';
import { UIComponent } from '../core/UIComponent';
export declare class TextInput extends UIComponent {
    protected static defaultStyles: Record<string, unknown>;
    protected background: DisplayObject | null;
    /** fl TextInput.textField 为 public（LiquidComboBox drawTextFormat 直接访问） */
    textField: TextField | null;
    protected _adapter: InputAdapter | null;
    protected _text: string;
    protected _html: boolean;
    protected _savedHTML: string;
    protected _editable: boolean;
    protected _displayAsPassword: boolean;
    protected _maxChars: number;
    protected _restrict: string;
    protected configUI(): void;
    /**
     * fl 语义：displayAsPassword 只影响显示，text 属性返回真实文本。
     * 此前返回 textField.text（显示层），密码框会把掩码圆点串当值回给业务层
     * （登录会把 "•••" 当 token 发给服务器）。真实值权威存在 _text。
     */
    get text(): string;
    set text(value: string);
    /**
     * 按 displayAsPassword 刷新 canvas 显示层（textField 只是视觉镜像）。
     * 【光标压字根因】DOM input type=password 由浏览器按掩码圆点 "•" 排版光标，
     * 而 canvas 此前在程序设值/重绘路径显示原文（掩码只在键入时发生）——
     * "•"(≈4px) 比 "x"(≈6px) 窄，光标便落在原文右半部上。两层显示一致（同为掩码）
     * 之后，DOM 光标位置才与 canvas 文字逐像素对齐。
     */
    private refreshDisplay;
    /** htmlText 行为级简化：去标签按纯文本渲染 */
    get htmlText(): string;
    set htmlText(value: string);
    get length(): number;
    get editable(): boolean;
    set editable(value: boolean);
    get displayAsPassword(): boolean;
    set displayAsPassword(value: boolean);
    get maxChars(): number;
    set maxChars(value: number);
    /** fl restrict：字符过滤模式，M3 仅存值（DOM 侧不做过滤） */
    get restrict(): string;
    set restrict(value: string);
    /** 覆写 setter 必须同时提供 getter（JS set-only accessor 读取返回 undefined） */
    get enabled(): boolean;
    set enabled(value: boolean);
    /** fl TextInput.setFocus：让隐藏 DOM input 获得焦点（onFocus → notifyFocus 回流） */
    setFocus(): void;
    protected draw(): void;
    /** fl drawBackground 重建：enabled 切换 upSkin/disabledSkin */
    protected drawBackground(): void;
    protected drawTextFormat(): void;
    protected drawLayout(): void;
}

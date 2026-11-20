import { DisplayObject } from '../display/DisplayObject';
import { TextFormat } from './TextFormat';
export declare class TextField extends DisplayObject {
    private _inner;
    private _defaultTextFormat;
    private _text;
    private _autoSize;
    private _wordWrap;
    private _w;
    private _h;
    private _scrollV;
    private _scrollH;
    /** 行高探针（惰性创建，格式变化时失效） */
    private _probe;
    /** 行高缓存（仅依赖文本格式） */
    private _lineHeightCache;
    /** 上次派发 SCROLL 时的最大可滚动量（变化检测） */
    private _prevMaxV;
    private _prevMaxH;
    /** fl 保留字段：本移植不做嵌入字体，恒 false（API 兼容） */
    embedFonts: boolean;
    constructor();
    get text(): string;
    set text(value: string);
    appendText(newText: string): void;
    /** fl TextField.length：字符数 */
    get length(): number;
    /** 纯文本宽度（不含 gutter） */
    get textWidth(): number;
    /** 纯文本高度（不含 gutter） */
    get textHeight(): number;
    get autoSize(): string;
    set autoSize(value: string);
    get wordWrap(): boolean;
    set wordWrap(value: boolean);
    get defaultTextFormat(): TextFormat;
    set defaultTextFormat(value: TextFormat);
    /** fl setTextFormat：本 shim 无范围格式，等价 defaultTextFormat 赋值并立即重应用 */
    setTextFormat(format: TextFormat): void;
    /** 行号，1..maxScrollV（Flash 语义） */
    get scrollV(): number;
    set scrollV(value: number);
    /** 水平像素偏移，0..maxScrollH */
    get scrollH(): number;
    set scrollH(value: number);
    /** 总行数相对可见行数可滚动的最大行号（最小 1，同 Flash） */
    get maxScrollV(): number;
    /** 水平可滚动像素数（内容宽 - 视口宽，最小 0） */
    get maxScrollH(): number;
    /** 用探针测行高：单行高度差（与实际排版一致），格式变化时失效重测 */
    private _measureLineHeight;
    /** 文本/尺寸/换行变化后重钳制滚动位置并应用视觉偏移；
     *  最大可滚动量或位置变化时派发 Event.SCROLL（Flash TextField 语义：
     *  文本回流改变滚动度量同样触发 scroll 事件，UIScrollBar 依赖它同步） */
    private _syncScrollMetrics;
    /** scrollV/scrollH → _inner 平移 */
    private _applyScroll;
    get width(): number;
    set width(value: number);
    get height(): number;
    set height(value: number);
    private _syncTextMetrics;
    /** 当前 TextFormat → Phaser TextStyle 映射（_sans/_serif/_typewriter 映射为系统字体栈） */
    private _currentStyle;
    private _applyFormat;
}

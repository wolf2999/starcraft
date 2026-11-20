/**
 * InputAdapter —— TS 附加实现（Flash 无对应类）。
 * M3 计划决策 6：文本输入用隐藏 DOM input/textarea 方案——
 * - 隐藏 DOM 元素（文字透明、pointer-events:none、叠放在组件位置；光标/选区/
 *   组字下划线由本层绘制）负责键盘/IME/文本编辑全逻辑（composition 期间 value
 *   含临时串，直接镜像即得 Flash 式内联组字显示）；
 * - TextField shim（Phaser Text 视觉层）仅做视觉渲染（镜像 value，光标/选区不做）；
 * - 坐标映射：组件 toGlobal（DisplayObject.getWorldTransformMatrix，默认相机下
 *   world 即【逻辑】屏坐标）× canvas CSS 缩放系数 + canvas.getBoundingClientRect()
 *   → 页面坐标。缩放系数 = canvas 显示尺寸 / 逻辑尺寸：ScaleMode NONE 下为 1
 *   （历史行为不变），FIT/SHOW_ALL 等缩放模式下逻辑坐标必须乘系数才能落到正确的
 *   CSS 像素位置——否则 DOM 光标/选区会偏到画布别处（如创角页光标飞到左上角）；
 * - Tab 键 preventDefault（交给 FocusManager 全局处理），其余按键走 DOM 默认。
 */
import { TextField } from './TextField';
import { TextFormat } from './TextFormat';
export declare class InputAdapter {
    private static _canvas;
    /**
     * 逻辑尺寸（游戏设计分辨率）。缺省 0 时回退 canvas 缓冲尺寸——
     * 本项目 canvas.width/height 恰好等于逻辑尺寸，故不传也能算对缩放系数。
     */
    private static _logicalW;
    private static _logicalH;
    /**
     * 已应用的 DOM 文字样式缓存（避免每帧重设样式导致重排/光标闪烁）。
     * 键为序列化后的样式串。
     */
    private _appliedFont;
    /**
     * main.ts 在 Application 初始化后调用一次（坐标映射基准）。
     * @param canvas      游戏画布
     * @param logicalSize 游戏逻辑尺寸（如 1280×720）；省略则用 canvas 缓冲尺寸。
     *                    缩放模式（FIT 等）下 DOM 层需要据此换算 CSS 像素。
     */
    static setCanvas(canvas: HTMLCanvasElement, logicalSize?: {
        width: number;
        height: number;
    }): void;
    /**
     * canvas 的 CSS 缩放系数（显示尺寸 / 逻辑尺寸）。
     * 逻辑坐标 ×系数 = CSS 像素；ScaleMode NONE 且 1:1 时为 (1,1)。
     */
    private _cssScale;
    private _el;
    private _target;
    /** 用户输入（含 IME 过程文本）镜像回调 */
    onInput: ((value: string) => void) | null;
    onFocus: (() => void) | null;
    onBlur: (() => void) | null;
    constructor(target: TextField, multiline: boolean);
    private inputHandler;
    focus(): void;
    blur(): void;
    get hasFocus(): boolean;
    /** 程序设置文本时同步到 DOM（若与当前值相同则跳过，避免光标跳动） */
    syncFromTarget(): void;
    /**
     * 程序设置「真实值」时同步到 DOM（TextInput.text setter / drawTextFormat 使用）。
     * 与 syncFromTarget 的区别：密码模式下 textField.text 是掩码圆点串（仅显示层），
     * 绝不能回灌 DOM——DOM value 必须始终持有真实文本，否则键入值被圆点污染、
     * 光标排版也基于错误字符。真实值由组件直接经本方法写入。
     */
    setValue(value: string): void;
    set editable(value: boolean);
    set displayAsPassword(value: boolean);
    set maxChars(value: number);
    set enabled(value: boolean);
    /** 输入光标颜色（fl caret 跟随文字色；TextFormat.color 为 0xRRGGBB） */
    setCaretColor(color: number): void;
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
    syncTextStyle(format: TextFormat | null, pad: number, textH: number): void;
    /** 元素基准位置（textField 左上角的文档坐标），供 syncTextStyle 叠加偏移复用 */
    private _domLeft;
    private _domTop;
    /** 把隐藏元素叠到 target（textField）的 stage 位置（drawLayout/获得焦点时调用） */
    syncLayout(): void;
    destroy(): void;
}

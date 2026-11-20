import { Sprite } from '../display/Sprite';
import type { FocusManager } from '../managers/FocusManager';
export declare class UIComponent extends Sprite {
    protected static defaultStyles: Record<string, unknown>;
    protected _width: number;
    protected _height: number;
    protected _enabled: boolean;
    focusEnabled: boolean;
    /** fl FocusManager 引用（fl 经 stage 机制注入；TS 侧由 FocusManager DFS 自动赋值） */
    focusManager: FocusManager | null;
    /** fl 作者环境属性；浏览器移植恒 false（Liquid 的 loadSkin 以此跳过 LivePreview） */
    isLivePreview: boolean;
    private _invalid;
    private _styles;
    private _initialized;
    constructor();
    /** fl setSize：记录组件尺寸并失效 SIZE（基类 Phaser Container 的 setSize 已在
     * 类型桥中 Omit，无签名冲突） */
    setSize(w: number, h: number): this;
    get width(): number;
    set width(value: number);
    get height(): number;
    set height(value: number);
    /** fl UIComponent.move(x, y)：设置位置（省略 MoveEvent 派发——本移植无 MoveEvent shim） */
    move(x: number, y: number): void;
    /** fl UIComponent.setFocus：空占位，需接 DOM 焦点的组件覆写（TextInput/TextArea → InputAdapter.focus） */
    setFocus(): void;
    /** fl UIComponent.drawFocus：委托 FocusManager 显示/隐藏共享焦点框 */
    drawFocus(on: boolean): void;
    /** fl UIComponent.copyStylesToChild：把本组件样式拷给子组件。
     * styleMap 键=子组件样式名，值=本组件样式名（fl 文档语义）。 */
    copyStylesToChild(component: UIComponent, styleMap: Record<string, string>): void;
    get enabled(): boolean;
    set enabled(value: boolean);
    /** fl 生命周期（幂等）：首次 invalidate/validate 前执行 configUI */
    protected initialize(): void;
    protected configUI(): void;
    invalidate(...propertyNames: string[]): void;
    isInvalid(...propertyNames: string[]): boolean;
    validateNow(): void;
    drawNow(): void;
    /**
     * 【data 槽位冲突防御】Phaser GameObject.destroy 收尾段（phaser.esm.js
     * `if (this.data) this.data.destroy()`）约定 this.data 是 DataManager 或空。
     * 而 fl 组件可能被业务赋过普通 data——最典型的是 CellRenderer：其 data
     * 存取器承载 AS3 语义的行数据（SelectableList.setItem → r.data = item），
     * 是普通对象/原始值，没有 destroy 方法。切屏 clearScreen →
     * screen.destroy(true) 级联销毁列表单元格时必抛
     * "this.data.destroy is not a function"，且**中断销毁级联**（树死一半），
     * 连带引发下一帧 invalidation flush 在死 NineSlice 上 setTexture 的
     * "reading 'sys'" 崩溃（两个报错实为同一事故）。销毁前摘除非 DataManager
     * 语义的 data 即可让引擎检查落空。
     *
     * 【为何用属性箭头而非方法覆写】本库的类型基类是 DisplayObject 里的
     * `LooseContainer = Omit<Phaser.GameObjects.Container, ...>` —— 映射类型会把
     * 继承来的 destroy 呈现为「实例属性」而非方法，写成 `override destroy(): void`
     * 必报 TS2425（基类属性 vs 派生方法）；而属性箭头 + `as Sprite['destroy']`
     * 与基类类型面一致（super 在字段初始化器的箭头函数中合法，运行时同样调到
     * Phaser 的原型方法）。运行期差异：destroy 由原型方法变为实例自有属性，
     * 故后续若有 fl 子类想再覆写 destroy，必须同样用实例字段形式，否则会被
     * 本字段遮蔽（当前库内无此覆写）。
     */
    destroy: Sprite["destroy"];
    /** fl：UIComponent.draw 为空占位，子类按 invalidation 分类覆写 */
    protected draw(): void;
    setStyle(style: string, value: unknown): void;
    clearStyle(style: string): void;
    /** fl 语义（对照 fl 源码 getStyleValue）：实例样式为 null/undefined 时回退
     * sharedStyles —— TS 架构中以类链 static defaultStyles 充当 sharedStyles
     * （类级默认，由 StyleManager 语义填充）。注意不能按 hasOwnProperty 判定，
     * 否则显式写入的 null/undefined 会遮蔽类默认值 */
    getStyleValue(name: string): unknown;
}

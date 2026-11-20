/**
 * fl.controls.ComboBox shim（按 fl 公开行为重建；收尾阶段已对照 fl 真源码镜像
 * 逐项校准 defaultStyles/BACKGROUND_STYLES 键集与 configUI 的 BaseButton 部件）。
 * 下拉选择控件：background（BaseButton，Liquid 换为 LiquidButton）+ inputField
 * （TextInput——fl 无独立文本字段，选中项文本在所有模式下都由 inputField 显示，
 * 公开 getter textField 即返回 inputField）+ _list（下拉 List，
 * 打开时挂到 stage 顶层，避免被组件父级裁剪）。
 * 重建要点（fl 公开语义）：
 * - open/close：isOpen 守卫 + positionList（全局坐标）+ Event.OPEN/CLOSE；
 *   LiquidComboBox 覆写实现滑入/滑出动画；
 * - BACKGROUND_STYLES/LIST_STYLES 样式映射：LiquidComboBox 在 configUI 中
 *   delete LIST_STYLES.skin/focusRectSkin（这两键必须存在，delete 才有意义）；
 * - 选中委托 _list；list 的 CHANGE → onListChange（同步选中 + 派发 CHANGE + 关闭），
 *   ITEM_CLICK/ROLL_OVER/ROLL_OUT/DATA_CHANGE 经 passEvent 重派发；
 * - 键盘：FocusManager 转发 KEY_DOWN → 上/下展开或移动高亮，Enter 选中高亮项，
 *   Escape 关闭（行为级重建）；highlightCell 经 _list 渲染器 mouseState 呈现。
 * 与 Flash 的差异：restrict/maxLength 未移植；editable 模式为最小实现。
 */
import { UIComponent } from '../core/UIComponent';
import { Event } from '../events/Event';
import { KeyboardEvent } from '../events/KeyboardEvent';
import { MouseEvent } from '../events/MouseEvent';
import { TextInput } from './TextInput';
import { BaseButton } from './BaseButton';
import { List } from './List';
import { DataProvider } from '../data/DataProvider';
export declare class ComboBox extends UIComponent {
    /** fl 真版逐字对照（defaultStyles 全键集）。upSkin/downSkin/overSkin/disabledSkin
     * 在 fl 为库符号链接名（"ComboBox_upSkin" 等），TS 无运行时符号表不解析，
     * 按未解析(null)处理（Liquid 路径由 LiquidComboBox.initSkin 自管皮肤） */
    protected static defaultStyles: Record<string, unknown>;
    /** 子部件样式映射（fl 真版逐字对照：仅 5 键，键序同源码） */
    protected static BACKGROUND_STYLES: Record<string, string>;
    /** 下拉列表样式映射（fl 源码逐字对照，含原版 "comobListDownSkin" 拼写瑕疵）。
     * 注意：fl 原版不含 cellRenderer/rollOverColor/contentPadding —— 若加入，
     * copyStylesToChild 会用 combo 侧未定义的值覆写 LiquidList 自己的
     * cellRenderer 实例样式（initializeLiquid 设置），导致 obtainRenderer 崩溃 */
    protected static LIST_STYLES: Record<string, string>;
    protected background: BaseButton | null;
    protected inputField: TextInput | null;
    protected _list: List | null;
    protected _dataProvider: DataProvider;
    protected _isOpen: boolean;
    protected _editable: boolean;
    protected _prompt: string | null;
    protected _rowCount: number;
    /** fl 真版无初始化（Number 默认 NaN）：未设置时 drawLayout 用组件宽度（isNaN 回退） */
    protected _dropdownWidth: number;
    protected _highlightedIndex: number;
    protected _labelField: string;
    protected _labelFunction: ((item: unknown) => string) | null;
    protected configUI(): void;
    private keyDownListener;
    get dataProvider(): DataProvider;
    set dataProvider(value: DataProvider);
    get labelField(): string;
    set labelField(value: string);
    get labelFunction(): ((item: unknown) => string) | null;
    set labelFunction(value: ((item: unknown) => string) | null);
    /** fl ComboBox.itemToLabel：labelFunction → item[labelField] */
    itemToLabel(item: unknown): string;
    get selectedIndex(): number;
    set selectedIndex(value: number);
    get selectedItem(): unknown;
    set selectedItem(value: unknown);
    /** fl selectedLabel：无选中时回退 prompt */
    get selectedLabel(): string;
    get dropdown(): List;
    get isOpen(): boolean;
    /** fl L602-604：textField 是公开 getter，返回 inputField（TextInput）——fl 无独立
     * _textField 字段，选中文本在所有模式下都由 inputField 显示 */
    get textField(): TextInput;
    get editable(): boolean;
    set editable(value: boolean);
    get prompt(): string | null;
    set prompt(value: string | null);
    get rowCount(): number;
    set rowCount(value: number);
    /** fl 真版 getter 返回 list.width（未设置 dropdownWidth 时反映实际下拉宽度） */
    get dropdownWidth(): number;
    set dropdownWidth(value: number);
    /** fl L417-419：text 委托 inputField.text */
    get text(): string;
    /** fl L133-138：非编辑模式 set text 是 no-op */
    set text(value: string);
    open(): void;
    close(): void;
    /** 下拉位置（全局坐标，默认在按钮下方、越界时上翻；Liquid 覆写） */
    protected positionList(): void;
    protected onToggleListVisibility: (_e: MouseEvent) => void;
    /** fl onListChange：同步选中 + 派发 CHANGE + 关闭 */
    protected onListChange: (_e: Event) => void;
    /** fl passEvent：重派发（重置 target，语义同 AS3 dispatchEvent） */
    protected passEvent: (e: Event) => void;
    /** 高亮单元格：键盘导航时在 _list 渲染器上呈现 over 态（fl 行为级重建） */
    protected highlightCell(index?: number): void;
    get highlightedIndex(): number;
    protected draw(): void;
    /** fl drawTextFormat L613-621：inputField.textField 应用 textFormat/disabledTextFormat
     * （Liquid 覆写） */
    protected drawTextFormat(): void;
    /** fl drawLayout L577-588 逐项对照：inputField 在所有模式下可见（选中文本由它
     * 承载，fl 无 textField 显隐切换），几何为 x=y=textPadding、
     * setSize(width-buttonWidth-textPadding, height-textPadding) */
    protected drawLayout(): void;
    /** fl 语义合并：draw() SELECTED 分支写 inputField.text（选中→itemToLabel；
     * 无选中→prompt 或空串）+ fl drawTextField L358-373 配置 inputField。
     * LiquidComboBox 覆写本方法接 updateIcon。
     * 注意：fl setStyle("upSkin","") 在 TS 侧置 null（"" 是真值会走 DisplayObject
     * 分支）；selectable 为 flash.text.TextField 属性，shim 无对应跳过 */
    protected drawTextField(): void;
    protected keyDownHandler(e: KeyboardEvent): void;
    private scrollToHighlighted;
}

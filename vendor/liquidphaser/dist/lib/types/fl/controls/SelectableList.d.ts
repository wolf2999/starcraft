import { KeyboardEvent } from '../events/KeyboardEvent';
import { MouseEvent } from '../events/MouseEvent';
import { DataChangeEvent } from '../events/DataChangeEvent';
import { BaseScrollPane } from './BaseScrollPane';
import { ListData } from './listClasses/ListData';
import { DataProvider } from '../data/DataProvider';
import type { ICellRenderer } from './listClasses/ICellRenderer';
export declare class SelectableList extends BaseScrollPane {
    /** fl 真版逐字对照（skin 在 fl 为库符号链接名 "List_skin"，TS 无运行时符号表
     * 不解析，按未解析(null)处理；disabledAlpha 真版为 null，绘制侧按 0.5 回退） */
    protected static defaultStyles: Record<string, unknown>;
    protected _dataProvider: DataProvider;
    protected _selectedIndices: number[];
    protected _allowMultipleSelection: boolean;
    protected _rowCount: number;
    protected _maxCellWidth: number;
    activeCellRenderers: ICellRenderer[];
    availableCellRenderers: ICellRenderer[];
    protected configUI(): void;
    get dataProvider(): DataProvider;
    set dataProvider(value: DataProvider);
    /** fl SelectableList.dataChangeHandler（行为级重建） */
    protected dataChangeHandler: (e: DataChangeEvent) => void;
    invalidateList(): void;
    invalidateItem(item: unknown): void;
    invalidateItemAt(index: number): void;
    get allowMultipleSelection(): boolean;
    set allowMultipleSelection(value: boolean);
    get selectedIndex(): number;
    set selectedIndex(value: number);
    get selectedIndices(): number[];
    set selectedIndices(value: number[]);
    get selectedItem(): unknown;
    set selectedItem(value: unknown);
    get selectedItems(): unknown[];
    set selectedItems(value: unknown[]);
    clearSelection(): void;
    get rowCount(): number;
    set rowCount(value: number);
    /** 行高：借用池内渲染器量高（见类注释；结果受 LiquidButton 皮肤 min 钳制） */
    get rowHeight(): number;
    scrollToIndex(newScrollIndex: number): void;
    itemToLabel(item: unknown): string;
    sortItems(compare: (a: unknown, b: unknown) => number): void;
    sortItemsOn(field: string, options?: unknown): void;
    protected createListData(item: unknown, index: number, row: number): ListData;
    protected obtainRenderer(): ICellRenderer;
    protected recycleRenderer(r: ICellRenderer): void;
    /** drawList：按滚动首行重建可见渲染器集合（LiquidList 覆写其前后挂钩渲染器皮肤） */
    protected drawList(): void;
    /** 单元格文本宽度（含内边距），供水平滚动度量；非文本渲染器记 0 */
    private measureCellWidth;
    /** fl SelectableList.drawBackground：列表背景取 "skin" 样式（区别于 BaseScrollPane
     * 的 upSkin/disabledSkin），禁用时按 disabledAlpha 变暗（fl 公开样式语义） */
    protected drawBackground(): void;
    protected drawScrollContent(): void;
    /** SelectableList 垂直滚动为行单位：content 不做 y 偏移（单元格按行重摆） */
    protected applyContentOffset(): void;
    protected cellRendererClickHandler: (e: MouseEvent) => void;
    protected cellRendererRollOverHandler: (e: MouseEvent) => void;
    protected cellRendererRollOutHandler: (e: MouseEvent) => void;
    private keyDownListener;
    /** 高亮单元格：键盘导航的 over 态呈现（fl setMouseState 语义；ComboBox 调用） */
    highlightCell(index?: number): void;
    private _highlightedRenderer;
    /** fl keyDownHandler（经 FocusManager KEY_DOWN 转发触发；行单位导航） */
    protected keyDownHandler(e: KeyboardEvent): void;
    /** 滚轮：每档滚动 1 行（fl TextField 滚轮语义的列表等价，行为级重建）。
     * 桥 delta 向上滚为正 → 行号减小，故 d = -delta */
    private mouseWheelHandler;
}

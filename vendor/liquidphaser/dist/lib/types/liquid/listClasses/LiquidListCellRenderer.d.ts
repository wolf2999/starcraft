/**
 * com.liquid.listClasses.LiquidListCellRenderer（逐行直译自 AS3 源码）。
 * LiquidList 的单元格渲染器：LiquidButton 变体（toggle 按钮语义），data/listData
 * 注入（fl ICellRenderer），data.icon（LiquidIcon）作为单元格图标。
 */
import { LiquidButton } from '../controls/LiquidButton';
import { LiquidEvent } from '../events/LiquidEvent';
import type { ICellRenderer } from '../../fl/controls/listClasses/ICellRenderer';
import type { ListData } from '../../fl/controls/listClasses/ListData';
export declare class LiquidListCellRenderer extends LiquidButton implements ICellRenderer {
    private _listData;
    private _data;
    constructor();
    get listData(): ListData | null;
    set listData(newListData: ListData | null);
    get data(): unknown;
    set data(newData: unknown);
    /**
     * toggle selected
     * AS3 签名 toggleSelected(event:MouseEvent)：fl 的点击事件参数在 TS shim 中
     * 不传递（BaseButton.pointertap 内部调用）；原版覆写无 enabled 检查、不派发
     * CHANGE（选中流程由 List 的渲染器 click 处理负责），1:1 保留。
     */
    protected toggleSelected(): void;
    /**
     * draw layout
     */
    protected drawLayout(): void;
    /**
     * icon loaded
     * @private
     */
    protected iconLoadedHandler: (e: LiquidEvent) => void;
}

/**
 * fl.controls.listClasses.ICellRenderer shim（接口；AS3 中为接口，TS 直译）。
 * List/ComboBox 通过该接口与单元格渲染器交互（data/listData 注入）。
 */
import type { ListData } from './ListData';
export interface ICellRenderer {
    data: unknown;
    listData: ListData | null;
    /** fl 渲染器均为 toggle 按钮（CellRenderer/LiquidListCellRenderer），选中态经此同步 */
    selected: boolean;
}

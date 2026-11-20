/**
 * fl.controls.listClasses.ListData shim（按 fl 公开行为重建）。
 * 单元格渲染器的元数据：label/icon/owner/index/row/column（纯数据类）。
 */
import type { UIComponent } from '../../core/UIComponent';
export declare class ListData {
    label: string;
    icon: unknown;
    owner: UIComponent | null;
    index: number;
    row: number;
    column: number;
    constructor(label?: string, icon?: unknown, owner?: UIComponent | null, index?: number, row?: number, column?: number);
    clone(): ListData;
}

/**
 * fl.controls.List shim（按 fl 公开行为重建，fl 源码不在 pngas 内）。
 * 在 SelectableList 之上补 labelField/labelFunction/iconField/iconFunction
 * 的标签解析（itemToLabel 覆写）。渲染器创建/滚动/选中均在 SelectableList。
 */
import { SelectableList } from './SelectableList';
import { ListData } from './listClasses/ListData';
export declare class List extends SelectableList {
    labelField: string;
    labelFunction: ((item: unknown) => string) | null;
    iconField: string;
    iconFunction: ((item: unknown) => unknown) | null;
    /** fl List.itemToLabel：labelFunction → item[labelField] → String(item) */
    itemToLabel(item: unknown): string;
    /** fl List 渲染器元数据：icon 按 iconField/iconFunction 解析 */
    protected createListData(item: unknown, index: number, row: number): ListData;
}

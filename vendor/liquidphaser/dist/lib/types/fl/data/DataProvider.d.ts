/**
 * fl.data.DataProvider shim（按 fl 公开行为重建，fl 源码不在 pngas 内）。
 * - 列表数据源：增删改/排序/失效接口，每次变更派发 PRE_DATA_CHANGE + DATA_CHANGE；
 * - out-of-bounds getItemAt 抛 RangeError（同 AS3）。
 * 与 Flash 的差异：不支持 IReadOnlyVector 分支；sortOn 选项为简化实现（仅 NUMERIC 语义）。
 */
import { DataChangeEvent } from '../events/DataChangeEvent';
/** AS3 Array.NUMERIC = 16（fl sortOn 选项位掩码，本 shim 仅实现 NUMERIC 语义） */
export declare const ARRAY_NUMERIC: number;
export declare class DataProvider {
    private _data;
    private _ed;
    constructor(value?: unknown);
    get length(): number;
    toArray(): unknown[];
    clone(): DataProvider;
    getItemAt(index: number): unknown;
    getItemIndex(item: unknown): number;
    addItem(item: unknown): void;
    addItemAt(item: unknown, index: number): void;
    addItems(value: unknown, append?: boolean): void;
    removeItemAt(index: number): unknown;
    removeItem(item: unknown): void;
    removeAll(): void;
    replaceItem(newItem: unknown, oldItem: unknown): void;
    replaceItemAt(newItem: unknown, index: number): void;
    invalidateItemAt(index: number): void;
    invalidateItem(item: unknown): void;
    invalidateAll(): void;
    contains(item: unknown): boolean;
    sort(compare: (a: unknown, b: unknown) => number): void;
    sortOn(fieldName: string | string[], options?: unknown): void;
    /** fl DataProvider 内部派发（PRE_DATA_CHANGE / DATA_CHANGE） */
    private _dispatchPre;
    private _dispatch;
    dispatchEvent(event: DataChangeEvent): boolean;
    addEventListener(type: string, listener: unknown, useCapture?: boolean, priority?: number): void;
    removeEventListener(type: string, listener: unknown, useCapture?: boolean): void;
    hasEventListener(type: string): boolean;
}

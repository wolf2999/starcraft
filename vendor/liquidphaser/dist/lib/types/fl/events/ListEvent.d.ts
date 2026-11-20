/**
 * fl.events.ListEvent shim（按 fl 公开行为重建，fl 源码不在 pngas 内）。
 * 单元格交互事件：index/item/rowIndex/columnIndex 随事件携带。
 */
import { Event } from './Event';
export declare class ListEvent extends Event {
    static readonly ITEM_CLICK: string;
    static readonly ITEM_DOUBLE_CLICK: string;
    static readonly ITEM_ROLL_OUT: string;
    static readonly ITEM_ROLL_OVER: string;
    columnIndex: number;
    rowIndex: number;
    index: number;
    item: unknown;
    constructor(type: string, bubbles?: boolean, cancelable?: boolean, columnIndex?: number, rowIndex?: number, index?: number, item?: unknown);
    clone(): ListEvent;
}

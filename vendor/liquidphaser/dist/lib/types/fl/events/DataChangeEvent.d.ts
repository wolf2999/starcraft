/**
 * fl.events.DataChangeEvent shim（按 fl 公开行为重建）。
 * DataProvider 数据变更事件：changeType/startIndex/endIndex/items。
 */
import { Event } from './Event';
export declare class DataChangeEvent extends Event {
    static readonly DATA_CHANGE: string;
    static readonly PRE_DATA_CHANGE: string;
    changeType: string;
    startIndex: number;
    endIndex: number;
    items: unknown[];
    constructor(type: string, bubbles?: boolean, cancelable?: boolean, changeType?: string, startIndex?: number, endIndex?: number, items?: unknown[] | null);
    clone(): DataChangeEvent;
}

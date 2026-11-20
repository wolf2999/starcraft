/**
 * com.liquid.events.DataEvent（1:1 移植）。
 */
import { Event } from '../../fl/events/Event';
export declare class DataEvent extends Event {
    static readonly DATA_CHANGE: string;
    static readonly ITEM_ADDED: string;
    static readonly ITEM_REMOVED: string;
    item: unknown;
    constructor(type: string, bubbles?: boolean, cancelable?: boolean, pItem?: unknown);
    clone(): DataEvent;
}

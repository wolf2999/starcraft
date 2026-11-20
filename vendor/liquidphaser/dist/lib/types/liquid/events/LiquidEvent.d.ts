/**
 * com.liquid.events.LiquidEvent（1:1 移植，事件字符串含原版拼写，保持行为一致）。
 */
import { Event } from '../../fl/events/Event';
export declare class LiquidEvent extends Event {
    static readonly SKIN_LOADED: string;
    static readonly STATE_CHANGED: string;
    constructor(type: string, bubbles?: boolean, cancelable?: boolean);
    clone(): LiquidEvent;
}

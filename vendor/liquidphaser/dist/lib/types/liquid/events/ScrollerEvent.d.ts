/**
 * com.liquid.events.ScrollerEvent（1:1 移植）。
 */
import { Event } from '../../fl/events/Event';
export declare class ScrollerEvent extends Event {
    static readonly SCROLL_START: string;
    static readonly SCROLL_STOP: string;
    static readonly SCROLL_CHANGE: string;
    static readonly PAGE_UP: string;
    static readonly PAGE_DOWN: string;
    static readonly INVALID_RANGE: string;
    static readonly VALID_RANGE: string;
    constructor(type: string, bubbles?: boolean, cancelable?: boolean);
    clone(): ScrollerEvent;
}

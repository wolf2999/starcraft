/**
 * com.liquid.events.ButtonEvent（1:1 移植）。
 */
import { Event } from '../../fl/events/Event';
export declare class ButtonEvent extends Event {
    static readonly ROLL_OVER: string;
    static readonly ROLL_OUT: string;
    static readonly RELEASE: string;
    static readonly CLICK: string;
    static readonly RELEASE_OUTSIDE: string;
    static readonly DOWN: string;
    constructor(type: string, bubbles?: boolean, cancelable?: boolean);
    clone(): ButtonEvent;
}

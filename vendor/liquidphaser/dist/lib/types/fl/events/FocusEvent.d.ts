/**
 * flash.events.FocusEvent shim（Liquid/FocusManager 移植所需最小子集）。
 * FOCUS_IN/FOCUS_OUT 不冒泡、KEY_FOCUS_CHANGE 冒泡（同 Flash）。
 */
import { Event } from './Event';
export declare class FocusEvent extends Event {
    static readonly FOCUS_IN: string;
    static readonly FOCUS_OUT: string;
    static readonly KEY_FOCUS_CHANGE: string;
    static readonly MOUSE_FOCUS_CHANGE: string;
    /** KEY_FOCUS_CHANGE 方向（"tab"/"shiftTab"，Flash 语义） */
    direction: string;
    constructor(type: string, bubbles?: boolean, cancelable?: boolean, direction?: string);
    clone(): FocusEvent;
}

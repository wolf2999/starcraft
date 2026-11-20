/**
 * flash.events.ComponentEvent shim（常量与 AS3 一致）。
 * fl BaseButton 在指针按下/抬起时派发 BUTTON_DOWN/BUTTON_UP（bubbles=true），
 * Liquid 滚动条（M3）监听 BUTTON_DOWN。
 */
import { Event } from './Event';
export declare class ComponentEvent extends Event {
    static readonly BUTTON_DOWN: string;
    static readonly BUTTON_UP: string;
    static readonly ENTER: string;
    static readonly HIDE: string;
    static readonly LABEL_CHANGE: string;
    static readonly MOVE: string;
    static readonly RESIZE: string;
    static readonly SHOW: string;
    constructor(type: string, bubbles?: boolean, cancelable?: boolean);
    clone(): ComponentEvent;
}

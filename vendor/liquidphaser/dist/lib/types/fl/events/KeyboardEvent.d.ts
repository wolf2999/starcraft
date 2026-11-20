/**
 * flash.events.KeyboardEvent shim（最小子集）。
 * 键值经 window keydown 桥接到焦点组件（见 FocusManager），keyCode 与
 * DOM KeyboardEvent.keyCode 对齐（方向键/翻页键常量同 Flash）。
 */
import { Event } from './Event';
export declare class KeyboardEvent extends Event {
    static readonly KEY_DOWN: string;
    static readonly KEY_UP: string;
    charCode: number;
    keyCode: number;
    keyLocation: number;
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    constructor(type: string, bubbles?: boolean, cancelable?: boolean, charCode?: number, keyCode?: number, keyLocation?: number, ctrlKey?: boolean, altKey?: boolean, shiftKey?: boolean);
    clone(): KeyboardEvent;
}

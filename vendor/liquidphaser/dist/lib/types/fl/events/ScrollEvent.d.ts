/**
 * fl.events.ScrollEvent shim（常量与字段语义同 fl 文档）。
 * ScrollBar 位置变更时派发（direction/delta/position）；
 * fl TextArea/LiquidTextArea 监听 SCROLL 同步滚动条与文本。
 */
import { Event } from './Event';
export declare class ScrollEvent extends Event {
    static readonly SCROLL: string;
    direction: string;
    delta: number;
    position: number;
    constructor(type: string, bubbles?: boolean, cancelable?: boolean, direction?: string, delta?: number, position?: number);
    clone(): ScrollEvent;
}

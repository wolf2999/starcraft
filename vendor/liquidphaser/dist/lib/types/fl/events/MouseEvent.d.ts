/**
 * flash.events.MouseEvent shim（Liquid 移植所需最小子集）。
 * BaseButton 在指针释放命中时派发 CLICK（bubbles=true）。
 */
import { Event } from './Event';
export declare class MouseEvent extends Event {
    static readonly CLICK: string;
    static readonly DOUBLE_CLICK: string;
    static readonly MOUSE_DOWN: string;
    static readonly MOUSE_UP: string;
    static readonly MOUSE_MOVE: string;
    static readonly MOUSE_OVER: string;
    static readonly MOUSE_OUT: string;
    static readonly MOUSE_WHEEL: string;
    static readonly ROLL_OVER: string;
    static readonly ROLL_OUT: string;
    localX: number | null;
    localY: number | null;
    stageX: number | null;
    stageY: number | null;
    /** AS3 MouseEvent.delta：mouseWheel 的滚动行数，向上滚为正 */
    delta: number;
    /** 桥附加字段（AS3 无此成员）：横向滚轮像素值，TextArea 水平滚动用 */
    deltaX: number;
    constructor(type: string, bubbles?: boolean, cancelable?: boolean, localX?: number | null, localY?: number | null, stageX?: number | null, stageY?: number | null);
    clone(): MouseEvent;
}

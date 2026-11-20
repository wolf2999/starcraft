/**
 * flash.events.Event shim（AS3 语义，Liquid 移植用最小子集）。
 * 三阶段派发所需的内部标志也定义在此。
 */
export declare class Event {
    static readonly CAPTURING_PHASE: number;
    static readonly AT_TARGET: number;
    static readonly BUBBLING_PHASE: number;
    static readonly CHANGE: string;
    static readonly CLOSE: string;
    static readonly COMPLETE: string;
    static readonly INIT: string;
    static readonly OPEN: string;
    static readonly REMOVED: string;
    static readonly RENDER: string;
    static readonly RESIZE: string;
    static readonly SCROLL: string;
    type: string;
    bubbles: boolean;
    cancelable: boolean;
    target: unknown;
    currentTarget: unknown;
    eventPhase: number;
    /** @internal 停止后续节点（当前节点剩余监听器仍执行） */
    _stopped: boolean;
    /** @internal 立即停止（当前节点剩余监听器也不执行） */
    _immediateStopped: boolean;
    private _defaultPrevented;
    constructor(type: string, bubbles?: boolean, cancelable?: boolean);
    stopPropagation(): void;
    stopImmediatePropagation(): void;
    preventDefault(): void;
    isDefaultPrevented(): boolean;
    clone(): Event;
}

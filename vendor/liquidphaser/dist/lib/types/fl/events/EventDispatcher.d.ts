/**
 * flash.events.EventDispatcher shim。
 * 完整实现 AS3 三阶段语义（capture / at-target / bubble）：
 * - 捕获阶段在祖先链上必然执行（与 bubbles 无关，同 AS3）；
 * - at-target 阶段同时调用 capture 与非 capture 监听器（同 AS3，异于 DOM）；
 * - 冒泡阶段仅在 event.bubbles 为 true 时执行；
 * - priority 降序插入，同优先级保持注册顺序；
 * - 同一 (type, listener, useCapture) 重复注册会被忽略（同 AS3）。
 */
import { Event } from './Event';
export type EventListener = (event: Event) => void;
export declare class EventDispatcher {
    private _listeners;
    private _getParent;
    /** AS3 中 DisplayObject 即 EventDispatcher（单一对象）；TS 组合模式下指向持有本
     * _ed 的组件，Event.target/currentTarget 解析为 owner（fl 语义），null 时为自身 */
    owner: unknown;
    constructor(getParent?: (() => EventDispatcher | null) | null);
    addEventListener(type: string, fn: EventListener, useCapture?: boolean, priority?: number): void;
    removeEventListener(type: string, fn: EventListener, useCapture?: boolean): void;
    hasEventListener(type: string): boolean;
    willTrigger(type: string): boolean;
    /**
     * 派发事件。返回 false 表示 preventDefault 被调用（同 AS3）。
     */
    dispatchEvent(event: Event): boolean;
    private _invoke;
}

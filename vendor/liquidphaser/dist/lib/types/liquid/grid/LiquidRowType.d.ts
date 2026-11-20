/**
 * com.liquid.grid.LiquidRowType（逐行直译自 AS3 源码，保留原算法与事件流）。
 */
import { EventDispatcher } from '../../fl/events/EventDispatcher';
import type { LiquidRow } from './LiquidRow';
export declare class LiquidRowType extends EventDispatcher {
    static readonly SIZE_FIXED: number;
    static readonly SIZE_RATIO: number;
    private __sizeMode;
    private __ratio;
    private __size;
    private __minSize;
    private __maxSize;
    private __pos;
    private __row;
    constructor(s: number, sm?: number, ms?: number, xs?: number);
    clone(): LiquidRowType;
    toString(): string;
    set row(value: LiquidRow | null);
    updateSize(): void;
    setSize(value: number): void;
    getPreferedSize(): number;
    get size(): number;
    get ratio(): number;
    get sizeMode(): number;
    set ratio(value: number);
    get minSize(): number;
    get maxSize(): number;
    get pos(): number;
    set pos(value: number);
    changeRatio(value: number): void;
}

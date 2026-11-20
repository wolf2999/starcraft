/**
 * com.liquid.grid.LiquidRow（逐行直译自 AS3 源码，updateFixedCells/updateRatioCells/updatePos
 * 的调用顺序与 forced/ratioScale 回退语义保持原样——这是 minSize 正确性的来源）。
 */
import { EventDispatcher } from '../../fl/events/EventDispatcher';
import { LiquidRowType } from './LiquidRowType';
export declare class LiquidRow extends EventDispatcher {
    private __cells;
    private fixedCells;
    private ratioCells;
    private __size;
    private __fixedSize;
    private __ratioSize;
    private __ratioScale;
    private __minSize;
    forced: boolean;
    constructor(lrt?: LiquidRowType | null, ...rest: LiquidRowType[]);
    clone(): LiquidRow;
    setRows(rw: LiquidRowType[]): void;
    toString(): string;
    set size(value: number);
    get size(): number;
    get cells(): LiquidRowType[];
    get fixedSize(): number;
    get ratioSize(): number;
    get ratioScale(): number;
    getRatioCells(): LiquidRowType[];
    get length(): number;
    get minSize(): number;
    private updateFixedCells;
    private updatePos;
    private ratioChangeHandler;
    private fixedChangeHandler;
    private updateRatioCells;
    private clamp;
}

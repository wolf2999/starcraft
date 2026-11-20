/**
 * com.liquid.grid.LiquidCell（逐行直译自 AS3 源码）。
 * 注意：AS3 事件监听器方法在本移植中改为箭头函数字段，保证 this 绑定与可作监听器引用。
 */
import { EventDispatcher } from '../../fl/events/EventDispatcher';
import { Rectangle } from '../../fl/geom/Rectangle';
import type { LiquidGrid } from './LiquidGrid';
import type { LiquidRowType } from './LiquidRowType';
export declare class LiquidCell extends EventDispatcher {
    static readonly DRAW_REPEAT: number;
    static readonly DRAW_STRETCH: number;
    drawModeX: number;
    drawModeY: number;
    rectBmp: Rectangle | null;
    rect: Rectangle;
    private __grid;
    private __parentGrid;
    private __row;
    private __col;
    private __listenable;
    constructor(crt: LiquidRowType, rrt: LiquidRowType, pg?: LiquidGrid | null);
    set listenable(value: boolean);
    get listenable(): boolean;
    setGrid(value: LiquidGrid): void;
    get grid(): LiquidGrid | null;
    updateRect(): void;
    get parentGrid(): LiquidGrid | null;
    changeParentGrid(lg: LiquidGrid): void;
    get globalX(): number;
    get globalY(): number;
    private getParentGridX;
    private getParentGridY;
    private moveColHandler;
    private moveRowHandler;
    private resizeColHandler;
    private resizeRowHandler;
}

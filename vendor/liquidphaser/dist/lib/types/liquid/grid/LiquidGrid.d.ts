/**
 * com.liquid.grid.LiquidGrid（逐行直译自 AS3 源码）。
 * 纯逻辑类，不参与显示列表（同 AS3：仅 extends EventDispatcher）。
 * cells 索引约定：cells[x][y]，x 走 cols、y 走 rows。
 */
import type Phaser from 'phaser';
import { EventDispatcher } from '../../fl/events/EventDispatcher';
import { LiquidCell } from './LiquidCell';
import { LiquidRow } from './LiquidRow';
import { LiquidRowType } from './LiquidRowType';
export declare class LiquidGrid extends EventDispatcher {
    protected rows: LiquidRow;
    protected cols: LiquidRow;
    protected __width: number;
    protected __height: number;
    protected __x: number;
    protected __y: number;
    protected __parentGrid: LiquidGrid | null;
    protected cells: LiquidCell[][];
    protected listenableCells: LiquidCell[];
    constructor(pcols: LiquidRow, prows: LiquidRow);
    clone(): LiquidGrid;
    getCell(x: number, y: number): LiquidCell;
    getColAt(value: number): LiquidRowType;
    getRowAt(value: number): LiquidRowType;
    toString(): string;
    set width(value: number);
    get width(): number;
    set height(value: number);
    get height(): number;
    set x(value: number);
    get x(): number;
    set y(value: number);
    get y(): number;
    getCols(): LiquidRow;
    getRows(): LiquidRow;
    getCells(): LiquidCell[][];
    get minWidth(): number;
    get minHeight(): number;
    debugDraw(g: Phaser.GameObjects.Graphics, addx?: number, addy?: number): void;
    addListenableCell(value: LiquidCell): void;
    set parentGrid(value: LiquidGrid | null);
    get parentGrid(): LiquidGrid | null;
    setSize(pw: number, ph: number): void;
    private buildCells;
    private colsResizeHandler;
    private rowsResizeHandler;
    private updateListenableCells;
    static scale9Grid(hleft: number, hright: number, vtop: number, vbottom: number, dwidth: number, dheight: number): LiquidGrid;
}

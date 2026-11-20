/**
 * com.liquid.events.LiquidCellEvent（1:1 移植）。
 */
import { Event } from '../../fl/events/Event';
export declare class LiquidCellEvent extends Event {
    static readonly ROWTYPE_RATIO_CHANGE: string;
    static readonly ROWTYPE_FIXED_CHANGE: string;
    static readonly ROWTYPE_RESIZE: string;
    static readonly ROWTYPE_MOVE: string;
    static readonly ROW_RESIZE: string;
    static readonly CELL_MOVE: string;
    static readonly CELL_SIZE: string;
    static readonly GRID_MOVE: string;
    static readonly GRID_SIZE: string;
    ratio: number;
    constructor(type: string, bubbles?: boolean, cancelable?: boolean, pRatio?: number);
    clone(): LiquidCellEvent;
}

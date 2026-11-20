/**
 * com.liquid.errors.LiquidError（1:1 移植，消息含原版的双空格等瑕疵，保持一致）。
 */
export declare class LiquidError extends Error {
    static readonly ERROR_DEFAULT: number;
    static readonly IO_ERROR: number;
    private static __init__;
    private static errors;
    constructor(id?: number, arg?: string);
    private static init;
}

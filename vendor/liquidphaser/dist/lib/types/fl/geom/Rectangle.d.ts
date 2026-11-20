/**
 * flash.geom.Rectangle shim（Liquid 移植用最小子集）
 * 注意 right/bottom 语义与 AS3 一致：right = x + width。
 */
export declare class Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
    constructor(x?: number, y?: number, width?: number, height?: number);
    get left(): number;
    get right(): number;
    get top(): number;
    get bottom(): number;
    clone(): Rectangle;
    isEmpty(): boolean;
    toString(): string;
}

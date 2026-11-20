/**
 * flash.geom.Point shim（Liquid 移植用最小子集）
 */
export declare class Point {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    clone(): Point;
    toString(): string;
}

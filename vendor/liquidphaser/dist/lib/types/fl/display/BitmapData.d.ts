/**
 * flash.display.BitmapData shim（Phaser 4 适配版）。
 * - 像素读取基于 Canvas ImageData 缓存（RGBA），
 *   getPixel32 返回 AS3 语义的 ARGB（out-of-bounds 返回 0 而非抛 RangeError，防止解析死循环，行为偏差已在注释中说明）。
 * - source 属性暴露共享的 Phaser canvas 纹理（TextureManager 注册），供 LiquidBitmap
 *   以 frame 方式零拷贝切片。AS3 语义 → Phaser 等价物：pixi TextureSource →
 *   game.textures.addCanvas（key 唯一，同一 BitmapData 懒注册一次）。
 */
import type Phaser from 'phaser';
import { Rectangle } from '../geom/Rectangle';
import { Point } from '../geom/Point';
export declare class BitmapData {
    readonly width: number;
    readonly height: number;
    readonly rect: Rectangle;
    private _canvas;
    private _ctx;
    private _data;
    private _source;
    constructor(width: number, height: number, transparent?: boolean, fillColor?: number);
    /** 从 HTMLImageElement 构建（SkinLoader 用） */
    static fromImage(img: HTMLImageElement): BitmapData;
    /** 共享 Phaser canvas 纹理（懒注册，零拷贝切片的基底） */
    get source(): Phaser.Textures.Texture;
    /**
     * ARGB uint32。
     * Flash 语义：内部预乘存储使全透明像素 RGB 恒为 0，getPixel32 返回 0x00000000
     * （原版代码依赖此行为，如 SkinAsset.getColors 以 getPixel32 != 0 终止色条扫描）。
     * Canvas 的非预乘 ImageData 会保留 PNG 里透明像素的 RGB，此处显式归零，不依赖浏览器巧合。
     */
    getPixel32(x: number, y: number): number;
    /** RGB uint24（忽略 alpha） */
    getPixel(x: number, y: number): number;
    /**
     * findColor=true 时找 (pixel & mask) === color 的包围盒；
     * findColor=false 时找 (pixel & mask) !== color 的包围盒（同 AS3）。
     * 无匹配返回 Rectangle(0,0,0,0)。
     */
    getColorBoundsRect(mask: number, color: number, findColor?: boolean): Rectangle;
    /** 区域拷贝（SkinAsset 裁剪/解析用），拷贝后像素缓存失效 */
    copyPixels(src: BitmapData, rect: Rectangle, dest: Point): void;
    dispose(): void;
    private _ensureData;
}

/**
 * com.liquid.draw.LiquidMapper（逐行直译自 AS3 源码，Phaser 4 适配版）。
 * AS3 语义 → Phaser 等价物：
 * - AS3 往 Graphics 里 beginBitmapFill+drawRect；pixi 版放 Sprite（STRETCH 缩放）/
 *   TilingSprite（REPEAT 平铺）；Phaser 版放 GameObjects.Image（STRETCH，setOrigin(0,0)
 *   对齐 pixi 左上角锚）/ GameObjects.TileSprite（REPEAT，同样左上角锚），
 *   round/floor/ceil 规则与原版一致。
 */
import Phaser from 'phaser';
import { LiquidGrid } from '../grid/LiquidGrid';
import type { LiquidBitmap } from './LiquidBitmap';
export declare class LiquidMapper {
    static drawShape(grid: LiquidGrid, bmp: LiquidBitmap, dest: Phaser.GameObjects.Container, layer?: number, addx?: number, addy?: number, ads?: string): void;
}

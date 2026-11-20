import { BitmapData } from '../../fl/display/BitmapData';
import { LiquidGrid } from '../grid/LiquidGrid';
import { LiquidCell } from '../grid/LiquidCell';
/** 渲染侧纹理句柄：key 对（+源像素尺寸，STRETCH 缩放比计算用） */
export interface TexHandle {
    textureKey: string;
    frameKey: string;
    width: number;
    height: number;
}
export interface BitmapCell {
    bitmap: TexHandle[];
    cell: LiquidCell;
}
export declare class LiquidBitmap {
    private texture;
    private bitmaps;
    private defaultGrid;
    private nbLayers;
    private _width;
    private _height;
    private _layerHandles;
    constructor(g: LiquidGrid, bmp: BitmapData, nbl?: number);
    getBitmapCell(id: string): BitmapCell | undefined;
    changeBitmap(bmp: BitmapData): void;
    getNbLayers(): number;
    get width(): number;
    get height(): number;
    /** 整层帧（frame 覆盖该层完整状态行），SkinBox NineSlice 快路径用。
     *  注意 this.texture 是 SkinAsset.getLiquidBitmap 裁剪后的层位图
     *  （参考行已被剔除，row0 即 layer0），故 frame.y = layer * height。 */
    getLayerTexture(layer: number): TexHandle;
    /** 在底层 BitmapData 的 Phaser 纹理上注册一个帧（零拷贝切片） */
    private addFrame;
    private buildMap;
}

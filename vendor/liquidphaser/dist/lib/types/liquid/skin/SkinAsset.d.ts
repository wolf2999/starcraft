/**
 * com.liquid.skin.SkinAsset（逐行直译自 AS3 源码）。
 * TS 实现差异：AS3 从 ApplicationDomain 取"库符号"，本移植用 registerBitmapData 注册表
 * （LiquidManager.init 预载 public/skin/ 下的 PNG 后按文件名注册）。
 * 防御性偏差：getGrid 的 pheight 扫描加越界钳制（原版在异常位图上会死循环）。
 */
import { BitmapData } from '../../fl/display/BitmapData';
import { LiquidGrid } from '../grid/LiquidGrid';
import { LiquidBitmap } from '../draw/LiquidBitmap';
import { SkinLoader } from './SkinLoader';
export declare class SkinAsset {
    private static cache;
    private static bmps;
    private static loaders;
    grid: LiquidGrid;
    liquidBitmap: LiquidBitmap;
    colors: number[];
    constructor(pBmp: BitmapData);
    /** 加载皮肤（同 url 去重），完成时派发 LiquidEvent.SKIN_LOADED */
    static loadSkin(url: string): SkinLoader;
    /** 取已注册的位图（对应 AS3 ApplicationDomain.getDefinition） */
    static getBitmapData(name: string): BitmapData | null;
    static registerBitmapData(name: string, bmp: BitmapData): void;
    private static getGrid;
    private static getLiquidBitmap;
    private static getColors;
}

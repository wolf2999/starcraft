/**
 * com.liquid.controls.LiquidCheckBox（逐行直译自 AS3 源码）。
 * 实现差异：Flash 的 ADDED/ENTER_FRAME 延迟初始化在 TS 下不需要，构造即 initSkin()；
 * LoaderContext 参数省略；draw() 里 `tf.color = ...` 原版假定 textFormat 样式必存在，
 * TS 侧 null 时跳过赋色。
 */
import { BitmapData } from '../../fl/display/BitmapData';
import { CheckBox } from '../../fl/controls/CheckBox';
export declare class LiquidCheckBox extends CheckBox {
    _pSkinIcon: string;
    _pLoadIcon: string;
    private static readonly SKIN_UP;
    private static readonly SKIN_OVER;
    private static readonly SKIN_DOWN;
    private static readonly SKIN_DISABLED;
    private static readonly SKIN_SELECTED_UP;
    private static readonly SKIN_SELECTED_OVER;
    private static readonly SKIN_SELECTED_DOWN;
    private static readonly SKIN_SELECTED_DISABLED;
    private static readonly DEFAULT_ICON_WIDTH;
    private static readonly DEFAULT_ICON_HEIGHT;
    private _skinIcon;
    private static _instances;
    constructor();
    setSkin(id: string, bmp: BitmapData | null): void;
    loadSkin(id: string, url: string): void;
    protected initializeLiquid(): void;
    protected initSkin(): void;
    protected draw(): void;
    private skin_icon;
    private load_icon;
    private icon_loaded;
    static setDefaultSkin(id: string, bmp: BitmapData | null): void;
    static loadDefaultSkin(id: string, url: string): void;
}

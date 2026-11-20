/**
 * com.liquid.controls.LiquidUIScrollBar（逐行直译自 AS3 源码）。
 * 与 LiquidScrollBar 唯一差异是基类（fl UIScrollBar vs ScrollBar，带 scrollTarget 绑定）。
 * 实现差异同 LiquidScrollBar（ADDED/ENTER_FRAME 延迟初始化省略、LoaderContext 省略等）。
 */
import { BitmapData } from '../../fl/display/BitmapData';
import { UIScrollBar } from '../../fl/controls/UIScrollBar';
export declare class LiquidUIScrollBar extends UIScrollBar {
    _pSkinUpArrow: string;
    _pSkinDownArrow: string;
    _pSkinThumb: string;
    _pSkinTrack: string;
    _pSkinIcons: string;
    _pLoadUpArrow: string;
    _pLoadDownArrow: string;
    _pLoadThumb: string;
    _pLoadIcons: string;
    _pLoadTrack: string;
    private static readonly ICON_THUMB_OFFSET;
    private static readonly ICON_UP_ARROW_OFFSET;
    private static readonly ICON_DOWN_ARROW_OFFSET;
    private static readonly ICON_STATES_COUNT;
    private static _instances;
    constructor();
    /**
     * Set a BitmapData skin for the LiquidUIScrollBar instance.
     * id: upArrow / downArrow / track / thumb / icons
     */
    setSkin(id: string, bmp: BitmapData | null): void;
    /**
     * Load an external bitmap skin file and apply it to the LiquidUIScrollBar instance.
     */
    loadSkin(id: string, url: string): void;
    /**
     * initialize the liquid component
     */
    protected initializeLiquid(): void;
    /**
     * init skin
     */
    protected initSkin(): void;
    /**
     * configUI：把 fl 默认四个子部件整体替换为 LiquidButton
     */
    protected configUI(): void;
    /**
     * update thumb
     */
    protected updateThumb(): void;
}

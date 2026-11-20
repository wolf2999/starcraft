/**
 * com.liquid.controls.LiquidScrollBar（逐行直译自 AS3 源码）。
 * 实现差异：
 * - Flash 的 ADDED/ENTER_FRAME 延迟初始化（addedHandler/renderHandler）在 TS 下
 *   不需要，构造即 initSkin()；
 * - initSkin 末尾的 draw() 用 drawNow()（SIZE 失效在构造期挂起，drawNow 即刻布局）；
 * - delete THUMB_STYLES.icon 不需要（见 fl ScrollBar shim 的 THUMB_STYLES 注释）；
 * - LoaderContext（Flash 沙箱概念）参数省略。
 */
import { BitmapData } from '../../fl/display/BitmapData';
import { ScrollBar } from '../../fl/controls/ScrollBar';
export declare class LiquidScrollBar extends ScrollBar {
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
     * Set a BitmapData skin for the LiquidScrollBar instance.
     * id: upArrow / downArrow / track / thumb / icons
     */
    setSkin(id: string, bmp: BitmapData | null): void;
    /**
     * Load an external bitmap skin file and apply it to the LiquidScrollBar instance.
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

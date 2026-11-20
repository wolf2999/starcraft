/**
 * com.liquid.controls.LiquidTextArea（逐行直译自 AS3 源码）。
 * 实现差异：
 * - Flash 的 ADDED/ENTER_FRAME 延迟初始化（addedHandler/renderHandler）在 TS 下
 *   不需要，构造即 initSkin()；
 * - load_back/back_loaded 里调 draw()（fl protected）→ TS 用 drawNow() 等价；
 * - LoaderContext（Flash 沙箱概念）参数省略。
 * 与 LiquidTextInput 的关键差异：皮肤样式键是 "skin"（非 upSkin/disabledSkin）、
 * contentPadding=1、无静态 setDefaultSkin、滚动条走 LiquidUIScrollBar。
 */
import { BitmapData } from '../../fl/display/BitmapData';
import { TextArea } from '../../fl/controls/TextArea';
import { SkinBox } from '../core/SkinBox';
export declare class LiquidTextArea extends TextArea {
    _pSkinBack: string;
    _pLoadBack: string;
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
    private static readonly SKIN_UP;
    private static readonly SKIN_DISABLED;
    protected _skinBack: SkinBox;
    private static _instances;
    constructor();
    /**
     * Set a BitmapData skin for the LiquidTextArea instance.
     * id: upArrow / downArrow / track / thumb / icons / back
     */
    setSkin(id: string, bmp: BitmapData | null): void;
    /**
     * Load an external bitmap skin file and apply it to the LiquidTextArea instance.
     */
    loadSkin(id: string, url: string): void;
    /**
     * initialize the liquid component
     */
    protected initializeLiquid(): void;
    /**
     * config UI
     */
    protected configUI(): void;
    /**
     * draw background
     */
    protected drawBackground(): void;
    /**
     * init skin
     */
    protected initSkin(): void;
    /**
     * load back
     */
    private load_back;
    /**
     * back loaded
     */
    private back_loaded;
}

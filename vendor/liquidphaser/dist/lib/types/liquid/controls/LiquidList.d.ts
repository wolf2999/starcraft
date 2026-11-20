/**
 * com.liquid.controls.LiquidList（逐行直译自 AS3 源码）。
 * 实现差异：
 * - Flash 的 ADDED/ENTER_FRAME 延迟初始化（addedHandler/renderHandler）在 TS 下
 *   不需要，构造即 initSkin()；initSkin 依赖 configUI 替换的 LiquidScrollBar，
 *   故构造序为 initializeLiquid() → validateNow()（触发 configUI + 0×0 首绘）
 *   → initSkin()；
 * - LoaderContext（Flash 沙箱概念）参数省略；
 * - loadSkin("cell") 里 AS3 的无参 invalidate()（全量失效）→ TS invalidate(ALL)；
 * - load_back/back_loaded 里调 draw()（fl protected）→ TS 用 drawNow() 等价。
 */
import { BitmapData } from '../../fl/display/BitmapData';
import { List } from '../../fl/controls/List';
export declare class LiquidList extends List {
    _pSkinBack: string;
    _pLoadBack: string;
    _pSkinUpArrow: string;
    _pSkinDownArrow: string;
    _pSkinThumb: string;
    _pSkinTrack: string;
    _pSkinIcons: string;
    _pSkinCell: string;
    _pLoadUpArrow: string;
    _pLoadDownArrow: string;
    _pLoadThumb: string;
    _pLoadIcons: string;
    _pLoadTrack: string;
    _pLoadCell: string;
    private _skinBack;
    private static _instances;
    private _cellBitmap;
    private _cellUrl;
    private _invalidateLiquidRenderers;
    constructor();
    setSkin(id: string, bmp: BitmapData | null): void;
    loadSkin(id: string, url: string): void;
    /**
     * initialize the liquid component
     * @private
     */
    protected initializeLiquid(): void;
    /**
     * config UI
     * @private
     */
    protected configUI(): void;
    /**
     * init skin
     * @private
     */
    protected initSkin(): void;
    /**
     * drawList
     * @private
     */
    protected drawList(): void;
    /**
     * invalidate liquid renderers
     * @private
     */
    protected invalidateLiquidRenderers(): void;
    /**
     * load cell renderers
     * @private
     */
    protected loadCellRenderers(url: string): void;
    /**
     * load back
     */
    private load_back;
    /**
     * back loaded
     */
    private back_loaded;
    static setDefaultSkin(id: string, bmp: BitmapData | null): void;
    static loadDefaultSkin(id: string, url: string): void;
}

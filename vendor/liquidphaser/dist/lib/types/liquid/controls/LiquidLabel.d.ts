/**
 * com.liquid.controls.LiquidLabel（逐行直译自 AS3 源码）。
 * 实现差异：
 * - Flash 的 ADDED/ENTER_FRAME 延迟初始化在 TS 下不需要，构造即 initSkin()；
 * - LoaderContext 参数省略；isLivePreview 语义保留（恒 false）；
 * - drawBackground 里 `tf.color = ...` 原版假定 textFormat 样式必存在，TS 侧
 *   null 时跳过赋色；drawLayout 对 tf/textField 的空值加了防御（原版裸引用）。
 */
import { DisplayObject } from '../../fl/display/DisplayObject';
import { BitmapData } from '../../fl/display/BitmapData';
import { TextFormat } from '../../fl/text/TextFormat';
import { Label } from '../../fl/controls/Label';
export declare class LiquidLabel extends Label {
    _pSkinBack: string;
    _pLoadBack: string;
    _pIcon: string;
    _pLoadIcon: string;
    Valign: string;
    private static readonly SKIN_UP;
    private static readonly SKIN_DISABLED;
    private _skinBack;
    private _icon;
    /** AS3 原版字段（LiquidLabel 自有，非 BaseButton.background） */
    protected background: DisplayObject | null;
    private static _instances;
    tf: TextFormat | null;
    private spaceIcontoLabel;
    constructor();
    setSkin(id: string, bmp: BitmapData | null): void;
    loadSkin(id: string, url: string): void;
    setIcon(bmp: BitmapData | null, offset?: number, states?: number): void;
    loadIcon(url: string, offset?: number, states?: number): void;
    private iconLoadedHandler;
    protected draw(): void;
    protected drawBackground(): void;
    protected drawIcon(): void;
    protected drawLayout(): void;
    protected initializeLiquid(): void;
    protected initSkin(): void;
    private skin_back;
    private load_back;
    private back_loaded;
    static setDefaultSkin(id: string, bmp: BitmapData | null): void;
    static loadDefaultSkin(id: string, url: string): void;
}

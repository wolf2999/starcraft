/**
 * com.liquid.controls.LiquidTextInput（逐行直译自 AS3 源码）。
 * 实现差异：
 * - Flash 的 ADDED/ENTER_FRAME 延迟初始化（addedHandler/renderHandler）在 TS 下
 *   不需要，构造即 initSkin()；
 * - drawBackground 里 `tf.color = ...` 原版假定 textFormat 样式必存在，TS 侧
 *   null 时跳过赋色（行为差异仅在未设置样式的误用场景）；
 * - drawIcon 中 `oldIcon != _icon` 恒为 false（原版即死代码），原样保留；
 * - LoaderContext（Flash 沙箱概念）参数省略。
 */
import { BitmapData } from '../../fl/display/BitmapData';
import { TextInput } from '../../fl/controls/TextInput';
import { SkinBox } from '../core/SkinBox';
import { LiquidEvent } from '../events/LiquidEvent';
export declare class LiquidTextInput extends TextInput {
    _pSkinBack: string;
    _pLoadBack: string;
    _pIcon: string;
    _pLoadIcon: string;
    private static readonly SKIN_UP;
    private static readonly SKIN_DISABLED;
    protected _skinBack: SkinBox;
    private _icon;
    private static _instances;
    constructor();
    /**
     * Set a BitmapData skin for the LiquidTextInput instance.
     * id: back
     */
    setSkin(id: string, bmp: BitmapData | null): void;
    /**
     * Load an external bitmap skin file and apply it to the LiquidTextInput instance.
     */
    loadSkin(id: string, url: string): void;
    /**
     * Create a LiquidIcon for the text input instance.
     */
    setIcon(bmp: BitmapData | null, offset?: number, states?: number): void;
    /**
     * Load an external bitmap source file and create a LiquidIcon instance.
     */
    loadIcon(url: string, offset?: number, states?: number): void;
    /**
     * icon loaded
     */
    protected iconLoadedHandler: (e: LiquidEvent) => void;
    /**
     * configUI
     */
    protected configUI(): void;
    protected draw(): void;
    /**
     * draw background
     */
    protected drawBackground(): void;
    /**
     * draw icon（原版 oldIcon != _icon 恒 false，为死代码，原样保留）
     */
    protected drawIcon(): void;
    /**
     * override drawLayout
     */
    protected drawLayout(): void;
    /**
     * initialize the liquid component
     */
    protected initializeLiquid(): void;
    /**
     * init skin
     */
    protected initSkin(): void;
    /**
     * skin back
     */
    private skin_back;
    /**
     * load back
     */
    private load_back;
    /**
     * back loaded
     */
    private back_loaded;
    /**
     * Set a BitmapData skin for all LiquidTextInput instances.
     */
    static setDefaultSkin(id: string, bmp: BitmapData | null): void;
    /**
     * Load an external bitmap skin file and apply it to all LiquidTextInput instances.
     */
    static loadDefaultSkin(id: string, url: string): void;
}

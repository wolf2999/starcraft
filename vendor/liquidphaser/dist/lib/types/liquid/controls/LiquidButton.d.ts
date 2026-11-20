/**
 * com.liquid.controls.LiquidButton（逐行直译自 AS3 源码）。
 * 实现差异：
 * - Flash 的 ADDED/ENTER_FRAME 延迟初始化（addedHandler/renderHandler）在 TS 下
 *   不需要，构造即 initSkin()；
 * - LoaderContext（Flash 沙箱概念）参数省略；
 * - drawBackground 里 `tf.color = ...` 原版假定 textFormat 样式必存在，TS 侧
 *   null 时跳过赋色（行为差异仅在未设置样式的误用场景）。
 */
import { BitmapData } from '../../fl/display/BitmapData';
import { Button } from '../../fl/controls/Button';
import { SkinBox } from '../core/SkinBox';
import { LiquidEvent } from '../events/LiquidEvent';
export declare class LiquidButton extends Button {
    _pSkinBack: string;
    _pLoadBack: string;
    _pIcon: string;
    _pLoadIcon: string;
    private static readonly SKIN_UP;
    private static readonly SKIN_OVER;
    private static readonly SKIN_DOWN;
    private static readonly SKIN_DISABLED;
    private static readonly SKIN_SELECTED_UP;
    private static readonly SKIN_SELECTED_OVER;
    private static readonly SKIN_SELECTED_DOWN;
    private static readonly SKIN_SELECTED_DISABLED;
    private static readonly SKIN_EMPHASIZED;
    protected _skinBack: SkinBox;
    private _skinEmphasized;
    private _state;
    private _icon;
    private static _instances;
    constructor();
    setSkin(id: string, bmp: BitmapData | null): void;
    loadSkin(id: string, url: string): void;
    setIcon(bmp: BitmapData | null, offset?: number, states?: number): void;
    loadIcon(url: string, offset?: number, states?: number): void;
    setSize(width: number, height: number): this;
    getTextColor(): number;
    protected drawBackground(): void;
    protected drawIcon(): void;
    protected initializeLiquid(): void;
    protected initSkin(): void;
    protected drawEmphasized(): void;
    protected iconLoadedHandler: (e: LiquidEvent) => void;
    private skin_back;
    private load_back;
    private back_loaded;
    static setDefaultSkin(id: string, bmp: BitmapData | null): void;
    static loadDefaultSkin(id: string, url: string): void;
}

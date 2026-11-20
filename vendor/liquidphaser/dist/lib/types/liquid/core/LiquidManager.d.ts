/**
 * com.liquid.core.LiquidManager（逐行直译自 AS3 源码）。
 * TS 附加：init() 预载 public/skin/ 下默认皮肤并注册（对应 AS3 的库符号嵌入机制），
 * demo/应用在创建任何控件前 await 一次。
 */
import { UIComponent } from '../../fl/core/UIComponent';
import { BitmapData } from '../../fl/display/BitmapData';
import { SkinBox } from './SkinBox';
export declare class LiquidManager {
    private static readonly DEFAULT_FOCUS_WIDTH;
    private static readonly DEFAULT_FOCUS_HEIGHT;
    private static readonly DEFAULT_FOCUS_SKIN;
    /** 默认皮肤清单（public/skin/ 下文件名，注册名 = 文件名去扩展名） */
    static readonly DEFAULT_SKINS: readonly string[];
    private static __focusRect;
    private static __skinFocus;
    /** 注册组件（首次触发 focusRect 初始化） */
    static register(_cp: UIComponent): void;
    /** 设置共享位图皮肤（id: "focusRect"） */
    static setSharedSkin(id: string, bmp: BitmapData | null): void;
    static getFocusSkinBox(): SkinBox | null;
    /** 加载外部位图皮肤并共享（id: "focusRect"） */
    static loadSharedSkin(id: string, url: string): void;
    /**
     * TS 附加：预载默认皮肤集（对应 AS3 嵌入符号），注册名 = 文件名去扩展名。
     * 完成后 focusRect 就绪，SkinAsset.getBitmapData(name) 可用。
     */
    static init(opts?: {
        skinBase?: string;
        names?: readonly string[];
    }): Promise<void>;
    private static initFocusRect;
    private static load_focusRect;
    private static focusRectLoaded;
}

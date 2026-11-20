import { ComboBox } from '../../fl/controls/ComboBox';
import { BitmapData } from '../../fl/display/BitmapData';
import { KeyboardEvent } from '../../fl/events/KeyboardEvent';
import { LiquidEvent } from '../events/LiquidEvent';
export declare class LiquidComboBox extends ComboBox {
    private static readonly OPEN_SPEED;
    private static readonly EPSILON;
    private static readonly LIST_UP;
    private static readonly LIST_DOWN;
    private static _instances;
    private _icon;
    /** AS3 _mask 为 flash Sprite（graphics 画矩形）；TS 用 Phaser Graphics 承载。
     * visible=false：正常渲染经 willRender 跳过，FilterList capture 不查 visible 直渲 */
    private _mask;
    /** 掩码控制器（仅用于后续 teardown；本库无销毁路径） */
    private _maskFilter;
    private _positionList;
    private _listPosition;
    _pSkinBack: string;
    _pSkinListBack: string;
    _pSkinUpArrow: string;
    _pSkinDownArrow: string;
    _pSkinThumb: string;
    _pSkinTrack: string;
    _pSkinIcons: string;
    _pSkinCell: string;
    _pLoadBack: string;
    _pLoadListBack: string;
    _pLoadUpArrow: string;
    _pLoadDownArrow: string;
    _pLoadThumb: string;
    _pLoadTrack: string;
    _pLoadIcons: string;
    _pLoadCell: string;
    constructor();
    setSkin(id: string, bmp: BitmapData | null): void;
    loadSkin(id: string, url: string): void;
    /**
     * open
     * @private
     */
    open(): void;
    /**
     * close
     * @private
     */
    close(): void;
    /**
     * configUI
     * @private
     */
    protected configUI(): void;
    /**
     * position list
     * @private
     */
    protected positionList(): void;
    /**
     * list open handler（AS3 ENTER_FRAME → TS 场景 POST_UPDATE）
     * @private
     */
    private listOpenHandler;
    /**
     * list close handler（AS3 ENTER_FRAME → TS 场景 POST_UPDATE）
     * @private
     */
    private listCloseHandler;
    /**
     * drawTextFormat
     * @private
     */
    protected drawTextFormat(): void;
    /**
     * draw Mask
     * @private
     */
    protected drawMask(): void;
    /**
     * draw TextField
     * @private
     */
    protected drawTextField(): void;
    /**
     * keyDownHandler（AS3 仅转发 super，直译保留）
     * @private
     */
    protected keyDownHandler(event: KeyboardEvent): void;
    /**
     * update Icon
     * @private
     */
    protected updateIcon(index?: number): void;
    /**
     * highlight cell
     * @private
     */
    protected highlightCell(index?: number): void;
    /**
     * initialize the liquid component
     * @private
     */
    protected initializeLiquid(): void;
    /**
     * init skin
     * @private
     */
    protected initSkin(): void;
    /**
     * stateChangedHandler
     * @private
     */
    protected stateChangedHandler: (e: LiquidEvent) => void;
    /**
     * skin loaded
     * @private
     */
    protected skinLoadedHandler: (e: LiquidEvent) => void;
}

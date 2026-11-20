import { UIComponent } from '../../fl/core/UIComponent';
import { BitmapData } from '../../fl/display/BitmapData';
export declare class LiquidIcon extends UIComponent {
    _pIcon: string;
    _pLoadIcon: string;
    private _bmp;
    private _iconWidth;
    private _iconHeight;
    private _state;
    private _offset;
    private _statesCount;
    /** 状态层渲染载体（draw() 重建/换帧） */
    private _plane;
    /** 已注册帧缓存（按显示层索引；层数有限，无需回收） */
    private _frames;
    constructor();
    set statesCount(pCount: number);
    get statesCount(): number;
    /** AS3 state 语义（Phaser GameObject.state 同名，TS 要求 override）。
     * 基类构造器会在 super() 期间 stomp this.state=0（此时字段初始化器未执行），
     * 忽略之——fl 初始值由字段初始化器提供（见 SkinBox.set state 同款注释） */
    set state(pState: number);
    get state(): number;
    set offset(pOffset: number);
    get offset(): number;
    setIcon(bmp: BitmapData | null): void;
    loadIcon(url: string): void;
    clone(): LiquidIcon;
    protected initSkin(): void;
    protected buildIcon(): void;
    protected draw(): void;
    private iconLoaded;
}
